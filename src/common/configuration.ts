"use strict";
import * as vscode from "vscode";

export class Configuration {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-edge");
    }

    public static getConfigurationProperty(id: string): any {
        return Configuration.getConfiguration().get(id);
    }

    public static async setGlobalConfigurationProperty(id: string, value: any): Promise<void> {
        await Configuration.getConfiguration().update(id, value, true);
    }

    public static async setWorkspaceConfigurationProperty(id: string, value: any): Promise<void> {
        await Configuration.getConfiguration().update(id, value, false);
    }
}
