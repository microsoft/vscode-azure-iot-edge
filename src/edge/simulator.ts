import * as dotenv from "dotenv";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as request from "request-promise";
import * as semver from "semver";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { Utility } from "../common/utility";
import { IDeviceItem } from "../typings/IDeviceItem";

export class Simulator {
    public static async validateSimulatorInstalled(force: boolean = false, outputChannel: vscode.OutputChannel = null): Promise<boolean> {
        if (await Simulator.simulatorInstalled()) {
            return true;
        } else {
            return await Simulator.installSimulatorWithPip(force, "You must have the iotedgehubdev tool installed for simulation.", outputChannel);
        }
    }

    public static async validateSimulatorUpdated(outputChannel: vscode.OutputChannel = null): Promise<void> {
        try {
            const output = await Executor.executeCMD(undefined, "iotedgehubdev", { shell: true }, "--version");
            const version: string | null = Simulator.extractVersion(output);

            if (!version) {
                return;
            }
            const latestVersion: string | undefined = await Simulator.getLatestSimulatorVersion();
            if (latestVersion && semver.gt(latestVersion, version)) {
                await Simulator.installSimulatorWithPip(false, `Update your iotedgehubdev tool (${version}) to the latest (${latestVersion}) for the best experience.`, outputChannel);
            }
        } catch (error) {
            await Simulator.installSimulatorWithPip(false, "You must have the iotedgehubdev tool installed for simulation.", outputChannel);
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
            const pipResponse = await request.get("https://pypi.org/pypi/iotedgehubdev/json");
            return JSON.parse(pipResponse).info.version;
        } catch (error) {
            return undefined;
        }
    }

    private static async installSimulatorWithPip(force: boolean, message: string, outputChannel: vscode.OutputChannel = null): Promise<boolean> {
        let ret: boolean = false;
        if (await this.checkPipInstalled()) {
            const install: vscode.MessageItem = { title: "Install" };
            const items: vscode.MessageItem[] = [ install ];
            if (!force) {
                items.push({ title: "Skip for now" });
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
                    ret =  true;
                } catch (error) {
                    if (outputChannel) {
                        outputChannel.appendLine(`Failed to install iotedgehubdev because of error: ${error.message}`);
                    }
                    ret =  false;
                }
            }
        }
        return ret;
    }

    private static async simulatorInstalled(): Promise<boolean> {
        try {
            await Executor.executeCMD(undefined, "iotedgehubdev", { shell: true }, "--version");
            return true;
        } catch (error) {
            return false;
        }
    }

    private static async checkPipInstalled(): Promise<boolean> {
        try {
            await Executor.executeCMD(undefined, "pip", { shell: true }, "--version");
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
        if (await Simulator.validateSimulatorInstalled(true, outputChannel)) {
            return await callback();
        } else {
            // TODO: show wiki page
            outputChannel.appendLine("Cannot execute command since there is no iotedgehubdev please install it first");
        }
    }

}
