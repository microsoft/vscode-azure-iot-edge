"use strict";
import * as iothub from "azure-iothub";
import * as os from "os";
import * as vscode from "vscode";
import { Constants } from "./constants";

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
}
