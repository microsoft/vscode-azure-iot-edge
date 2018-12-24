// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as dotenv from "dotenv";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as request from "request-promise";
import * as semver from "semver";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { LearnMoreError } from "../common/LearnMoreError";
import { TelemetryClient } from "../common/telemetryClient";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { IDeviceItem } from "../typings/IDeviceItem";

enum InstallReturn {
    Success = 0,
    Failed,
    Canceled,
    NoPip,
    NotSupported,
}

export class Simulator {
    public static async validateSimulatorUpdated(outputChannel: vscode.OutputChannel = null): Promise<void> {
        let message: string;
        let type: string;
        const telemetryName = "simulatorUpdated";
        try {
            const output = await Executor.executeCMD(undefined, "iotedgehubdev", { shell: true }, "--version");
            const version: string | null = Simulator.extractVersion(output);
            if (version) {
                const latestVersion: string | undefined = await Simulator.getLatestSimulatorVersion();
                if (latestVersion && semver.gt(latestVersion, version)) {
                    message = `${Constants.updateSimulatorMsg} (${version} to ${latestVersion})`;
                }
            } else {
                message = Constants.updateSimulatorMsg;
            }
            type = "upgrade";
        } catch (error) {
            message =  Constants.needSimulatorInstalledMsg;
            type = "install";
        }

        if (message) {
            TelemetryClient.sendEvent(`${telemetryName}.${type}`);
            try {
                const installRes = await Simulator.installSimulatorWithPip(false, message, outputChannel);
                if (InstallReturn.NotSupported === installRes) {
                    vscode.window.showWarningMessage(message);
                }
                TelemetryClient.sendEvent(`${telemetryName}.${type}.${InstallReturn[installRes]}`);
            } catch (err) {}
        }
    }

    private static iotedgehubdevVersionUrl = "https://pypi.org/pypi/iotedgehubdev/json";
    private static learnMoreUrl = "https://aka.ms/AA3nuw8";

    private static async validateSimulatorInstalled(outputChannel: vscode.OutputChannel = null): Promise<InstallReturn> {
        const telemetryName = "simulatorInstalled";
        if (await Simulator.simulatorInstalled()) {
            return InstallReturn.Success;
        } else {
            TelemetryClient.sendEvent(`${telemetryName}.install`);
            const installRes = await Simulator.installSimulatorWithPip(true, Constants.needSimulatorInstalledMsg, outputChannel);
            TelemetryClient.sendEvent(`${telemetryName}.${InstallReturn[installRes]}`);
            return installRes;
        }
    }

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

    private static async getLatestSimulatorVersion(): Promise<string | undefined> {
        try {
            const pipResponse = await request.get(Simulator.iotedgehubdevVersionUrl);
            return JSON.parse(pipResponse).info.version;
        } catch (error) {
            return undefined;
        }
    }

    private static async installSimulatorWithPip(force: boolean, message: string, outputChannel: vscode.OutputChannel = null): Promise<InstallReturn> {
        // auto install only supported on windows. For linux/macOS ask user install manually.
        if (os.platform() !== "win32") {
            return InstallReturn.NotSupported;
        }
        let ret: InstallReturn = InstallReturn.Success;
        if (await this.checkPipInstalled()) {
            const install: vscode.MessageItem = { title: Constants.install };
            const items: vscode.MessageItem[] = [ install ];
            if (!force) {
                items.push({ title: Constants.skipForNow });
            }

            let input: vscode.MessageItem | undefined;
            if (force) {
                input = await vscode.window.showWarningMessage(message, { modal: true }, ...items);
            } else {
                input = await vscode.window.showWarningMessage(message, ...items);
            }

            if (input === install) {
                try {
                    await Executor.executeCMD(outputChannel, "pip", {shell: true}, "install --upgrade iotedgehubdev");
                } catch (error) {
                    if (outputChannel) {
                        outputChannel.appendLine(`${Constants.failedInstallSimulator} ${error.message}`);
                    }
                    ret =  InstallReturn.Failed;
                }
            } else {
                ret = InstallReturn.Canceled;
            }
        } else {
            ret = InstallReturn.NoPip;
        }
        return ret;
    }

    private static async simulatorInstalled(): Promise<boolean> {
        return await Simulator.checkCmdExist("iotedgehubdev");
    }

    private static async checkPipInstalled(): Promise<boolean> {
        return await Simulator.checkCmdExist("pip");
    }

    private static async checkCmdExist(cmd: string): Promise<boolean> {
        try {
            await Executor.executeCMD(null, cmd, { shell: true }, "--version");
            return true;
        } catch (error) {
            return false;
        }
    }

    constructor(private context: vscode.ExtensionContext) {
    }

    public async setupIotedgehubdev(deviceItem: IDeviceItem, outputChannel: vscode.OutputChannel) {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            deviceItem = await Utility.getInputDevice(deviceItem, outputChannel);
            if (deviceItem) {
                Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgehubdev setup -c "${deviceItem.connectionString}"`));
            }
        });
    }

    public async startEdgeHubSingleModule(outputChannel: vscode.OutputChannel): Promise<void> {
        return await this.callWithInstallationCheck(outputChannel, async () => {
            const inputs = await this.inputInputNames();
            await this.setModuleCred(outputChannel);
            await Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgehubdev start -i "${inputs}"`));
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
            await Executor.executeCMD(outputChannel, "iotedgehubdev", { shell: true }, `modulecred -l -o "${outputFile}"`);

            const moduleConfig = dotenv.parse(await fse.readFile(outputFile));
            await Utility.setGlobalConfigurationProperty("EdgeHubConnectionString", moduleConfig.EdgeHubConnectionString);
            await Utility.setGlobalConfigurationProperty("EdgeModuleCACertificateFile", moduleConfig.EdgeModuleCACertificateFile);
        });
    }

    private async inputInputNames(): Promise<string> {
        return await Utility.showInputBox(
            Constants.inputNamePattern,
            Constants.inputNamePrompt, null, "input1,input2");
    }

    private async callWithInstallationCheck(outputChannel: vscode.OutputChannel, callback: () => Promise<any>): Promise<any> {
        const installReturn = await Simulator.validateSimulatorInstalled(outputChannel);

        switch (installReturn) {
            case InstallReturn.Success:
                return await callback();
            case InstallReturn.NoPip:
                outputChannel.appendLine(Constants.outputNoSimulatorMsg);
                throw new LearnMoreError(Constants.pipNotFoundMsg, Simulator.learnMoreUrl);
            case InstallReturn.Failed:
                outputChannel.appendLine(Constants.outputNoSimulatorMsg);
                throw new LearnMoreError(Constants.installFailedMsg, Simulator.learnMoreUrl);
            case InstallReturn.NotSupported:
                outputChannel.appendLine(Constants.outputNoSimulatorMsg);
                throw new LearnMoreError(Constants.installManuallyMsg, Simulator.learnMoreUrl);
            case InstallReturn.Canceled:
            default:
                throw new UserCancelledError();
        }
    }
}
