"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../../common/constants";
import { Executor } from "../../common/executor";
import { TelemetryClient } from "../../common/telemetryClient";
import { Utility } from "../../common/utility";

export class DotnetUtility {
    public async dotnetPublish(fileUri?: vscode.Uri) {
        const projectFilePath: string = await this.getProjectFilePath(fileUri);

        if (projectFilePath) {
            Executor.runInTerminal(`dotnet publish \"${Utility.adjustFilePath(projectFilePath)}\"`);
            TelemetryClient.sendEvent("dotnetPublish.end");
        }
    }

    private async getProjectFilePath(fileUri?: vscode.Uri): Promise<string> {
        if (fileUri) {
            TelemetryClient.sendEvent("dotnetPublish.start", { entry: "contextMenu" });
            return fileUri.fsPath;
        } else {
            TelemetryClient.sendEvent("dotnetPublish.start", { entry: "commandPalette" });
            const projectFileList: vscode.Uri[] = await this.getProjectFileList();
            if (!projectFileList || projectFileList.length === 0) {
                vscode.window.showErrorMessage("No .NET project file can be found under this workspace.");
                return null;
            }

            const projectFileItemList: vscode.QuickPickItem[] = Utility.getQuickPickItemsFromUris(projectFileList);
            const projectFileItem: vscode.QuickPickItem = await vscode.window.showQuickPick(projectFileItemList, { placeHolder: "Select project file" });

            if (projectFileItem) {
                return projectFileItem.detail;
            } else {
                return null;
            }
        }
    }

    private async getProjectFileList(): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(Constants.dotNetProjectFileNamePattern, null, 1000, null);
    }
}
