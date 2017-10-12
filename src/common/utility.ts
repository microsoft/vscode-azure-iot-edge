"use strict";
import * as iothub from "azure-iothub";
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
        if (!vscode.workspace.rootPath) {
            vscode.window.showErrorMessage("This extension only works on a workspace folder.");
            return false;
        }

        return true;
    }
}
