"use strict";
import * as iothub from "azure-iothub";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { Executor } from "./executor";
import { TelemetryClient } from "./telemetryClient";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-edge");
    }

    public static getDeviceIdFromConnectionString(deviceConnectionString: string): string {
        const result = /DeviceId=([^=;]+);/.exec(deviceConnectionString);
        return result ? result[1] : "";
    }

    public static getHostNameFromConnectionString(iotHubConnectionString: string): string {
        const result = /^HostName=([^=]+);/.exec(iotHubConnectionString);
        return result ? result[1] : "";
    }

    public static showfile(fileName: string) {
        vscode.workspace.openTextDocument(fileName).then((document: vscode.TextDocument) => {
            vscode.window.showTextDocument(document);
        });
    }

    public static getDevices(): Promise<iothub.Device[]> {
        const config = Utility.getConfiguration();
        const iotHubConnectionString = config.get<string>(Constants.IotHubConnectionStringKey);
        if (!iotHubConnectionString) {
            vscode.window.showWarningMessage("Please login first.");
            return;
        }
        const registry = iothub.Registry.fromConnectionString(iotHubConnectionString);

        return new Promise<iothub.Device[]>((resolve, reject) => {
            registry.list((err, deviceList) => {
                if (err) {
                    reject(`[Failed to get IoT Hub devices] ${err.message}`);
                } else {
                    resolve(deviceList);
                }
            });
        });
    }

    public static checkWorkspace(): boolean {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage("This extension only works when folders are opened.");
            return false;
        }

        return true;
    }

    public static adjustFilePath(filePath: string): string {
        if (os.platform() === "win32") {
            const windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
            const terminalRoot = Utility.getConfiguration().get<string>("terminalRoot");
            if (windowsShell && terminalRoot) {
                filePath = filePath
                    .replace(/^([A-Za-z]):/, (match, p1) => `${terminalRoot}${p1.toLowerCase()}`)
                    .replace(/\\/g, "/");
            } else if (windowsShell && windowsShell.toLowerCase().indexOf("bash") > -1 && windowsShell.toLowerCase().indexOf("git") > -1) {
                // Git Bash
                filePath = filePath
                    .replace(/^([A-Za-z]):/, (match, p1) => `/${p1.toLowerCase()}`)
                    .replace(/\\/g, "/");
            } else if (windowsShell && windowsShell.toLowerCase().indexOf("bash") > -1 && windowsShell.toLowerCase().indexOf("windows") > -1) {
                // Bash on Ubuntu on Windows
                filePath = filePath
                    .replace(/^([A-Za-z]):/, (match, p1) => `/mnt/${p1.toLowerCase()}`)
                    .replace(/\\/g, "/");
            }
        }
        return filePath;
    }

    public static registerDebugTelemetryListener() {
        vscode.debug.onDidStartDebugSession((session) => {
            if (Constants.EdgeDebugSessions.indexOf(session.name) > -1) {
                TelemetryClient.sendEvent("startDebugSession", { sessionName: session.name });
            }
        });
    }

    public static async getInputFilePath(inputFileFromContextMenu: vscode.Uri, filePattern: string, fileDescription: string, eventName: string): Promise<string> {
        if (!Utility.checkWorkspace()) {
            return null;
        }

        if (inputFileFromContextMenu) {
            TelemetryClient.sendEvent(eventName, { entry: "contextMenu" });
            return inputFileFromContextMenu.fsPath;
        } else {
            TelemetryClient.sendEvent(eventName, { entry: "commandPalette" });
            const fileList: vscode.Uri[] = await vscode.workspace.findFiles(filePattern);
            if (!fileList || fileList.length === 0) {
                vscode.window.showErrorMessage(`No ${fileDescription} can be found under this workspace.`);
                return null;
            }

            const fileItemList: vscode.QuickPickItem[] = Utility.getQuickPickItemsFromUris(fileList);
            const fileItem: vscode.QuickPickItem = await vscode.window.showQuickPick(fileItemList, { placeHolder: `Select ${fileDescription}`});
            if (fileItem) {
                return fileItem.detail;
            } else {
                return null;
            }
        }
    }

    public static getQuickPickItemsFromUris(uriList: vscode.Uri[]): vscode.QuickPickItem[] {
        return uriList.map((u) => Utility.getQuickPickItem(u));
    }

    public static getQuickPickItem(uri: vscode.Uri): vscode.QuickPickItem {
        const quickPickItem: vscode.QuickPickItem = {
            label: path.join(".", uri.fsPath.substr(vscode.workspace.getWorkspaceFolder(uri).uri.fsPath.length)),
            description: null,
            detail: uri.fsPath,  // use the `detail` property to save URI's full path, which will be used later
        };

        return quickPickItem;
    }

    public static getRelativePath(folder: vscode.Uri, rootFolder: vscode.Uri): string {
        if (folder.fsPath.startsWith(rootFolder.fsPath)) {
            const relativePath: string = "." + folder.fsPath.substr(rootFolder.fsPath.length);

            return relativePath.replace(/\\/g, "/");
        }

        return null;
    }

    public static replaceAll(str: string, mapObj: Map<string, string>, caseInSensitive: boolean = false): string {
        let modifier = "g";
        if (caseInSensitive) {
            modifier = "ig";
        }

        const keys = Array.from(mapObj.keys());
        const pattern: RegExp = new RegExp(keys.join("|"), modifier);
        return str.replace(pattern, (matched) => {
            return mapObj.get(matched);
        });
    }

    public static expandEnv(input: string, exceptKeys?: Set<string>): string {
        const pattern: RegExp = new RegExp(/\$([a-zA-Z0-9_]+)|\${([a-zA-Z0-9_]+)}/g);
        return input.replace(pattern, (matched) => {
            if (exceptKeys && exceptKeys.has(matched)) {
                return matched;
            }
            const key: string = matched.replace(/\$|{|}/g, "");
            return process.env[key] || matched;
        });
    }

    public static expandModules(input: string, moduleMap: Map<string, string>, buildSet: Set<string>): string {
        const pattern: RegExp = new RegExp(/\${MODULES..+}/g);
        return input.replace(pattern, (matched) => {
            const key: string = matched.replace(/\$|{|}/g, "");
            if (moduleMap.has(key)) {
                const value: string = moduleMap.get(key);
                buildSet.add(value);
                return value;
            } else {
                return matched;
            }
        });
    }

    public static async getSubDirectories(parentPath: string): Promise<string[]> {
        const filesAndDirs = await fse.readdir(parentPath);
        const directories = [];
        await Promise.all(
            filesAndDirs.map(async (name) => {
                const subPath = path.join(parentPath, name);
                const stat: fse.Stats = await fse.stat(subPath);
                if (stat.isDirectory()) {
                    directories.push(subPath);
                }
            }),
        );
        return directories;
    }

    public static async dockerBuildImage(dockerFile: string, context: string, image: string,
                                         outputChannel: vscode.OutputChannel) {
        await Executor.executeCMD(outputChannel, "docker", {shell: true}, `build -f ${dockerFile} -t ${image} ${context}`);
    }

    public static async dockerPushImage(image: string, outputChannel: vscode.OutputChannel) {
        await Executor.executeCMD(outputChannel, "docker", {shell: true}, `push ${image}`);
    }

    public static async showInputBox(plcHolder: string,
                                     prmpt: string,
                                     validate?: (s: string) => Promise<string> | undefined | null,
                                     defaultValue?: string,
                                     ignFocusOut: boolean = true): Promise<string> {
        const options: vscode.InputBoxOptions = {
            placeHolder: plcHolder,
            prompt: prmpt,
            validateInput: validate,
            ignoreFocusOut: ignFocusOut,
            value: defaultValue,
        };

        const result: string | undefined = await vscode.window.showInputBox(options);
        if (!result) {
            throw Constants.userCancelled;
        } else {
            return result;
        }
    }
}
