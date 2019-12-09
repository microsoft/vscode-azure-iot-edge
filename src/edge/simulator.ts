// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as dotenv from "dotenv";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as request from "request-promise";
import * as semver from "semver";
import * as unzipper from "unzipper";
import * as vscode from "vscode";
import { ConfigNotSetError } from "../common/ConfigNotSetError";
import { Configuration } from "../common/configuration";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { InstallResult, InstallReturn } from "../common/InstallResult";
import { LearnMoreError } from "../common/LearnMoreError";
import { TelemetryClient } from "../common/telemetryClient";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { IDeviceItem } from "../typings/IDeviceItem";

enum SimulatorType {
    Pip = 0,
    Standalone = 1,
    NotInstalled = 2,
}

export class Simulator {
    private static iotedgehubdevVersionUrl: string = "https://pypi.org/pypi/iotedgehubdev/json";
    private static learnMoreUrl: string = "https://aka.ms/AA3nuw8";
    private static latestReleaseInfoUrl: string = "https://aka.ms/iotedgehubdev-latest-release";
    private static simulatorVersionKey: string = "SimulatorVersion";
    private static simulatorExecutableName = "iotedgehubdev";

    private static currentPlatform = os.platform();
    private static WindowsStandaloneSimulatorFolder = path.join(vscode.extensions.getExtension(Constants.ExtensionId).extensionPath, Simulator.simulatorExecutableName);

    private static extractVersion(output: string): string | null {
        if (!output) {
            return null;
        }
        const pattern: RegExp = new RegExp(/version\s+([^\s]+)/g);
        const matchRes = output.match(pattern);
        if (matchRes !== null) {
            return matchRes[0].replace(/version\s+/g, "");
        }
        return null;
    }

    private static async checkCmdExist(cmd: string): Promise<boolean> {
        try {
            if (cmd) {
                await Executor.executeCMD(null, cmd, { shell: true }, "--version");
                return true;
            }
        } catch (error) { }
        return false;
    }

    private static adjustTerminalCommand(command: string): string {
        return (Simulator.currentPlatform === "linux" || Simulator.currentPlatform === "darwin") ? `sudo ${command}` : command;
    }

    private isInstalling: boolean = false;
    private latestStandaloneSimulatorInfoJson: any;
    private simulatorExecutablePath: string;

    constructor(private context: vscode.ExtensionContext) {
        if (Simulator.currentPlatform === "win32") {
            const installedVersion: string = this.context.globalState.get(Simulator.simulatorVersionKey);
            if (installedVersion) {
                this.simulatorExecutablePath = path.join(Simulator.WindowsStandaloneSimulatorFolder, installedVersion , Simulator.simulatorExecutableName);
            }
        } else {
            this.simulatorExecutablePath = Simulator.simulatorExecutableName;
        }
    }

    public async validateSimulatorUpdated(outputChannel: vscode.OutputChannel = null): Promise<void> {
        let message: string;
        let type: string = "";
        const telemetryName = "simulatorUpdated";
        try {
            const simulatorType = await this.simulatorInstalled();
            if (simulatorType === SimulatorType.NotInstalled) {
                message =  Constants.needSimulatorInstalledMsg;
                type = "install";
            } else {
                const version: string | null = await this.getCurrentSimulatorVersion();
                if (version && semver.valid(version)) {
                    const latestVersion: string | undefined = await this.getLatestSimulatorVersion();
                    if (latestVersion && semver.gt(latestVersion, version)) {
                        message = `${Constants.updateSimulatorMsg} (${version} to ${latestVersion})`;
                    } else {
                        return;
                    }
                } else {
                    message = Constants.updateSimulatorMsg;
                }

                if (simulatorType === SimulatorType.Pip) {
                    type = "upgradePipPackage";
                } else {
                    type = "upgradeStandalone";
                }
            }

            this.sendTelemetry(`${telemetryName}.${type}`);

            const installResult = await this.autoInstallSimulator(outputChannel);
            this.sendTelemetry(`${telemetryName}.${type}.${InstallReturn[installResult.resultType]}`, installResult.errMsg);
            if (InstallReturn.NotSupported === installResult.resultType) {
                const learnMore: vscode.MessageItem = { title: Constants.learnMore };
                if (await vscode.window.showWarningMessage(message, ...[learnMore]) === learnMore) {
                    await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(Simulator.learnMoreUrl));
                }
            } else if (InstallReturn.Failed === installResult.resultType) {
                await vscode.window.showErrorMessage(Constants.installStandaloneSimulatorFailedMsg);
            }
        } catch (err) {
            type = "unexpectedError";
            this.sendTelemetry(`${telemetryName}.${type}`);
            outputChannel.appendLine(Constants.unexpectedErrorWhenValidateSimulatorUpdate + err.message);
        }
    }

    public async setupIotedgehubdev(deviceItem: IDeviceItem, outputChannel: vscode.OutputChannel) {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            deviceItem = await Utility.getInputDevice(deviceItem, outputChannel);
            if (deviceItem) {
                let commandStr = this.getAdjustedSimulatorExecutorPath() + ` setup -c "${deviceItem.connectionString}"`;
                if (await this.isModuleTwinSupported()) {
                    const iotHubConnectionStr = await Configuration.getIotHubConnectionString();
                    if (iotHubConnectionStr) {
                        commandStr = `${commandStr} -i "${iotHubConnectionStr}"`;
                    }
                }
                Executor.runInTerminal(Simulator.adjustTerminalCommand(commandStr));
            }
        });
    }

    public async startEdgeHubSingleModule(outputChannel: vscode.OutputChannel): Promise<void> {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            await this.checkIoTedgehubdevConnectionString(outputChannel);
            const inputs = await this.inputInputNames();
            await this.setModuleCred(outputChannel);
            await Executor.runInTerminal(Simulator.adjustTerminalCommand(this.getAdjustedSimulatorExecutorPath() + ` start -i "${inputs}"`));
        });
    }

    public async setModuleCred(outputChannel: vscode.OutputChannel): Promise<void> {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            let storagePath = this.context.storagePath;
            if (!storagePath) {
                storagePath = path.resolve(os.tmpdir(), "vscodeedge");
            }
            await fse.ensureDir(storagePath);
            const outputFile = path.join(storagePath, "module.env");
            await Executor.executeCMD(outputChannel, this.getAdjustedSimulatorExecutorPath(true), { shell: true }, `modulecred -l -o "${outputFile}"`);

            const moduleConfig = dotenv.parse(await fse.readFile(outputFile));
            await Configuration.setGlobalConfigurationProperty("EdgeHubConnectionString", moduleConfig.EdgeHubConnectionString);
            await Configuration.setGlobalConfigurationProperty("EdgeModuleCACertificateFile", moduleConfig.EdgeModuleCACertificateFile);
        });
    }

    public async stopSolution(outputChannel: vscode.OutputChannel): Promise<void> {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            Executor.runInTerminal(Simulator.adjustTerminalCommand(this.getAdjustedSimulatorExecutorPath() + ` stop`));
            return;
        });
    }

    public async runSolution(outputChannel: vscode.OutputChannel, deployFileUri?: vscode.Uri, commands: string[] = []): Promise<void> {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            await this.checkIoTedgehubdevConnectionString(outputChannel);
            const pattern = "{**/deployment.*.json,**/deployment.json,**/deployment.*.debug.json,**/config/*.json}";
            const excludePattern = `{${Constants.tsonPattern}}`;
            const deployFile: string = await Utility.getInputFilePath(deployFileUri,
                pattern,
                Constants.deploymentFileDesc,
                `${Constants.runSolutionEvent}.selectDeploymentFile`,
                excludePattern);
            if (!deployFile) {
                return;
            }

            commands.push(this.constructRunCmd(deployFile));
            Executor.runInTerminal(Utility.combineCommands(commands), this.getRunCmdTerminalTitle());
            return;
        });
    }

    private sendTelemetry(eventName: string, errMsg: string = null) {
        if (errMsg) {
            TelemetryClient.sendEvent(eventName, {error: errMsg});
        } else {
            TelemetryClient.sendEvent(eventName);
        }
    }

    private async getLastestStandaloneSimulatorInfo() {
        if (!this.latestStandaloneSimulatorInfoJson) {
            const infoString = await request.get(Simulator.latestReleaseInfoUrl, {
                headers: {
                    "User-Agent": "vscode-azure-iot-edge",
                },
            });
            const infoJson = JSON.parse(infoString);
            this.latestStandaloneSimulatorInfoJson = infoJson;
            return infoJson;
        } else {
            return this.latestStandaloneSimulatorInfoJson;
        }
    }

    private async getLatestSimulatorVersion(): Promise<string | undefined> {
        try {
            let version: string;
            if (Simulator.currentPlatform === "win32") {
                const releaseInfoJson: any = await this.getLastestStandaloneSimulatorInfo();
                version = releaseInfoJson.tag_name;
            } else {
                const pipResponse: string = await request.get(Simulator.iotedgehubdevVersionUrl);
                version = JSON.parse(pipResponse).info.version;
            }
            return version;
        } catch (error) {
            return undefined;
        }
    }

    private async getCurrentSimulatorVersion(): Promise<string | undefined> {
        const output: string = await Executor.executeCMD(undefined, this.getAdjustedSimulatorExecutorPath(true), { shell: true }, "--version");
        const version: string | null = Simulator.extractVersion(output);
        return version;
    }

    private async simulatorInstalled(): Promise<SimulatorType> {
        const exist = await Simulator.checkCmdExist(this.getAdjustedSimulatorExecutorPath(true));
        if (exist) {
            return Simulator.currentPlatform === "win32" ? SimulatorType.Standalone : SimulatorType.Pip;
        }

        return SimulatorType.NotInstalled;
    }

    private getAdjustedSimulatorExecutorPath(forceUseCmd: boolean = false): string {
        let executorPath: string;

        if (!forceUseCmd) {
            executorPath = `"${Utility.adjustFilePath(this.simulatorExecutablePath)}"`;
            if (Utility.isUsingPowershell()) {
                executorPath = `& ${executorPath}`;
            }
        } else {
            executorPath = `"${this.simulatorExecutablePath}"`;
        }

        return executorPath;
    }

    private async downloadStandaloneSimulatorWithProgress() {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: Constants.downloadingAndInstallingStandaloneSimulatorMsg,
        }, async () => {
            await this.downloadStandaloneSimulator();
        });
    }

    private async downloadStandaloneSimulator() {
        const infoJson = await this.getLastestStandaloneSimulatorInfo();
        const binariesZipUrl: string = infoJson.assets[0].browser_download_url;
        const version: string = infoJson.tag_name;

        await new Promise((resolve, reject) => {
            const req = request(binariesZipUrl);
            req.on("response",  (res) => {
                if (res.statusCode === 200) {
                    req.pipe(unzipper.Extract({ path: Simulator.WindowsStandaloneSimulatorFolder }))
                    .on("close", () => resolve()).on("error", (e) => reject(new Error("Cannot extract simulator binaries from zip file: " + e.message)));
                } else {
                    reject(new Error("Cannot download simulator with status code: " + res.statusCode));
                }
            });
        });

        try {
            if (this.simulatorExecutablePath) {
                await fse.remove(path.dirname(this.simulatorExecutablePath));
            }
        } catch (err) {
            // ignore
        }

        await fse.move(path.join(Simulator.WindowsStandaloneSimulatorFolder, Simulator.simulatorExecutableName), path.join(Simulator.WindowsStandaloneSimulatorFolder, version));
        this.context.globalState.update(Simulator.simulatorVersionKey, version);
        this.simulatorExecutablePath = path.join(Simulator.WindowsStandaloneSimulatorFolder, version , Simulator.simulatorExecutableName);
    }

    private async autoInstallSimulator(outputChannel: vscode.OutputChannel = null): Promise<InstallResult> {
        // auto install only supported on windows. For linux/macOS ask user install manually.
        if (Simulator.currentPlatform !== "win32") {
            return new InstallResult(InstallReturn.NotSupported);
        }

        if (!this.isInstalling) {
            this.isInstalling = true;
            let ret: InstallReturn = InstallReturn.Success;
            let errMsg = null;
            try {
                await this.downloadStandaloneSimulatorWithProgress();
            } catch (error) {
                if (outputChannel) {
                    outputChannel.appendLine(`${Constants.failedInstallSimulator} ${error.message}`);
                }
                ret =  InstallReturn.Failed;
                errMsg = error.message;
            }

            this.isInstalling = false;
            return new InstallResult(ret, errMsg);
        } else {
            return new InstallResult(InstallReturn.IsInstalling);
        }
    }

    private async checkIoTedgehubdevConnectionString(outputChannel: vscode.OutputChannel) {
        if (await this.isValidateConfigSupported()) {
            try {
                await Executor.executeCMD(null, this.getAdjustedSimulatorExecutorPath(true), { shell: true }, "validateconfig");
            } catch (error) {
                let errorMsg = error.message;
                if (error.errorCode === 2 && Simulator.currentPlatform === "win32") {
                    errorMsg = Constants.connectionStringNotSetErrorMsgOnWindows;
                }
                throw new ConfigNotSetError(errorMsg);
            }
        }
    }

    private async isModuleTwinSupported(): Promise<boolean> {
        return this.isSupported("0.8.0");
    }

    private async isValidateConfigSupported(): Promise<boolean> {
        return this.isSupported("0.10.0");
    }

    private async isSupported(supportedVersion: string): Promise<boolean> {
        let isSupported = false;
        try {
            const output = await Executor.executeCMD(undefined, this.getAdjustedSimulatorExecutorPath(true), { shell: true }, "--version");
            const version: string | null = Simulator.extractVersion(output);
            if (version && semver.valid(version)) {
                isSupported = semver.gte(version, supportedVersion);
            }
        } catch (err) {}
        return isSupported;
    }

    private constructRunCmd(deployFile: string): string {
        return Simulator.adjustTerminalCommand(this.getAdjustedSimulatorExecutorPath() + ` start -d "${deployFile}" -v`);
    }

    private getRunCmdTerminalTitle(): string {
        return Constants.edgeDisplayName + " Solution Status";
    }

    private async inputInputNames(): Promise<string> {
        return await Utility.showInputBox(
            Constants.inputNamePattern,
            Constants.inputNamePrompt, null, "input1,input2");
    }

    private async validateSimulatorInstalled(outputChannel: vscode.OutputChannel = null): Promise<InstallReturn> {
        const telemetryName = "simulatorInstalled";
        if (await this.simulatorInstalled() === SimulatorType.NotInstalled) {
            this.sendTelemetry(`${telemetryName}.install`);
            const installResult = await this.autoInstallSimulator(outputChannel);
            this.sendTelemetry(`${telemetryName}.install.${InstallReturn[installResult.resultType]}`, installResult.errMsg);
            return installResult.resultType;
        } else {
            return InstallReturn.Success;
        }
    }

    private async callWithInstallationCheck(outputChannel: vscode.OutputChannel, callback: () => Promise<any>): Promise<any> {
        const installReturn = await this.validateSimulatorInstalled(outputChannel);

        switch (installReturn) {
            case InstallReturn.Success:
                return await callback();
            case InstallReturn.Failed:
                await vscode.window.showErrorMessage(Constants.installStandaloneSimulatorFailedMsg);
            case InstallReturn.NotSupported:
                outputChannel.appendLine(Constants.outputNoSimulatorMsg);
                throw new LearnMoreError(Constants.installManuallyMsg, Simulator.learnMoreUrl);
            case InstallReturn.IsInstalling:
                outputChannel.appendLine(Constants.outputSimulatorIsInstallingMsg);
            default:
                throw new UserCancelledError();
        }
    }
}
