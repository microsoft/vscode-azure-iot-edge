// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

import axios from "axios";
import * as dotenv from "dotenv";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as semver from "semver";
import * as unzipper from "unzipper";
import * as vscode from "vscode";
import { ConfigNotSetError } from "../common/ConfigNotSetError";
import { Configuration } from "../common/configuration";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { LearnMoreError } from "../common/LearnMoreError";
import { RetryPolicy } from "../common/retryPolicy";
import { SimulatorInfo } from "../common/SimulatorInfo";
import { TelemetryClient } from "../common/telemetryClient";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { Versions } from "../common/version";
import { IDeviceItem } from "../typings/IDeviceItem";
import { InstallResult, InstallReturn } from "./InstallResult";

enum SimulatorType {
    Pip = 0,
    Standalone = 1,
    NotInstalled = 2,
}

export class Simulator {
    private static iotedgehubdevVersionUrl: string = "https://pypi.org/pypi/iotedgehubdev/json";
    private static iotedgehubdevLockVersionKey = "IOTEDGEHUBDEV_VERSION";
    private static iotedgehubdevDefaultVersion = "0.14.18";
    private static learnMoreUrl: string = "https://aka.ms/AA3nuw8";
    private static simulatorVersionKey: string = "SimulatorVersion";
    private static simulatorExecutableName = "iotedgehubdev";

    private static currentPlatform = os.platform();
    private static WindowsStandaloneSimulatorFolder = path.join(vscode.extensions.getExtension(Constants.ExtensionId).extensionPath, Simulator.simulatorExecutableName);

    private static maxRetryTimes: number = 3;
    private static retryInterval: number = 5000;

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
    private desiredSimulatorInfo: SimulatorInfo;
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
                    const desiredVersion: string | undefined = await this.getDesiredSimulatorVersion(outputChannel);
                    if (desiredVersion && semver.neq(desiredVersion, version)) {
                        message = `${Constants.updateSimulatorMsg} (${version} to ${desiredVersion})`;
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

            TelemetryClient.sendEvent(`${telemetryName}.${type}`);

            const installResult = await this.autoInstallSimulator(outputChannel);

            if (installResult.errMsg) {
                TelemetryClient.sendErrorEvent(`${telemetryName}.${type}.${InstallReturn[installResult.resultType]}`, { [Constants.errorProperties.error]: installResult.errMsg });
            } else {
                TelemetryClient.sendEvent(`${telemetryName}.${type}.${InstallReturn[installResult.resultType]}`);
            }

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
            TelemetryClient.sendEvent(`${telemetryName}.${type}`);
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
            const imgVersion = Versions.edgeHubVersion();
            await this.setModuleCred(outputChannel);
            await Executor.runInTerminal(Simulator.adjustTerminalCommand(this.getAdjustedSimulatorExecutorPath() + ` start -er "${imgVersion}" -i "${inputs}"`));
        });
    }

    public async setModuleCred(outputChannel: vscode.OutputChannel): Promise<void> {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            await this.checkIoTedgehubdevConnectionString(outputChannel);
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

    private async getDesiredSimulatorInfo(outputChannel: vscode.OutputChannel) {
        if (!this.desiredSimulatorInfo) {
            await RetryPolicy.retry(Simulator.maxRetryTimes, Simulator.retryInterval, outputChannel, async () => {
                let version = Simulator.iotedgehubdevDefaultVersion;
                const pipResponse = await axios.get(Simulator.iotedgehubdevVersionUrl);
                const releases = pipResponse.data.releases;
                const lockVersion = process.env[Simulator.iotedgehubdevLockVersionKey];
                if (lockVersion !== undefined && lockVersion.trim() !== "") {
                    // Make sure the custom version is an existing release
                    if (releases.hasOwnProperty(lockVersion)) {
                        version = lockVersion;
                    } else {
                        outputChannel.appendLine(`The specified iotedgehubdev version ${version} is not a valid release`);
                    }
                  }
                outputChannel.appendLine(`The specified iotedgehubdev version is: ${version}`);
                const standaloneDownloadUrl = `https://github.com/Azure/iotedgehubdev/releases/download/v${version}/iotedgehubdev-v${version}-win32-ia32.zip`;
                this.desiredSimulatorInfo = new SimulatorInfo(version, standaloneDownloadUrl);
            });

            return this.desiredSimulatorInfo;
        } else {
            return this.desiredSimulatorInfo;
        }
    }

    private async getDesiredSimulatorVersion(outputChannel: vscode.OutputChannel): Promise<string | undefined> {
        try {
            const info: SimulatorInfo = await this.getDesiredSimulatorInfo(outputChannel);
            return info.version;
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

    private async downloadStandaloneSimulatorWithProgress(outputChannel: vscode.OutputChannel) {
        const info: SimulatorInfo = await this.getDesiredSimulatorInfo(outputChannel);
        const version: string = info.version;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: Constants.downloadingAndInstallingStandaloneSimulatorMsg + version,
        }, async () => {
            await this.downloadStandaloneSimulator(outputChannel);
        });
    }

    private async downloadStandaloneSimulator(outputChannel: vscode.OutputChannel) {
        const info: SimulatorInfo = await this.getDesiredSimulatorInfo(outputChannel);
        const binariesZipUrl: string = info.standaloneDownloadUrl;
        const version: string = info.version;

        await RetryPolicy.retry(Simulator.maxRetryTimes, Simulator.retryInterval, outputChannel, async () => {
            const res = await axios.get(binariesZipUrl, {responseType: "stream"});
            await new Promise<void>((resolve, reject) => {
                if (res.status === 200) {
                    res.data.pipe(unzipper.Extract({ path: Simulator.WindowsStandaloneSimulatorFolder }))
                    .on("close", () => resolve()).on("error", (e) => reject(new Error("Cannot extract simulator binaries from zip file: " + e.message)));
                } else {
                    reject(new Error("Cannot download simulator with status code: " + res.status));
                }
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
        });
    }

    private async autoInstallSimulator(outputChannel: vscode.OutputChannel = null): Promise<InstallResult> {
        // auto install only supported on windows. For linux/macOS ask user install manually.
        if (Simulator.currentPlatform !== "win32") {
            return new InstallResult(InstallReturn.NotSupported);
        }

        if (!this.isInstalling) {
            this.isInstalling = true;
            let ret: InstallReturn = InstallReturn.Success;
            let errMsg: string;
            try {
                await this.downloadStandaloneSimulatorWithProgress(outputChannel);
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
            TelemetryClient.sendEvent(`${telemetryName}.install`);
            const installResult = await this.autoInstallSimulator(outputChannel);

            if (installResult.errMsg) {
                TelemetryClient.sendErrorEvent(`${telemetryName}.install.${InstallReturn[installResult.resultType]}`, { [Constants.errorProperties.error]: installResult.errMsg });
            } else {
                TelemetryClient.sendEvent(`${telemetryName}.install.${InstallReturn[installResult.resultType]}`);
            }

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
