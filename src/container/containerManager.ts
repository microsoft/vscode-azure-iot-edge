"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { TelemetryClient } from "../common/telemetryClient";
import { Utility } from "../common/utility";

export class ContainerManager {
    public async buildDockerImage(context: vscode.ExtensionContext, dockerfileFromContextMenu?: vscode.Uri) {
        const dockerfilePath: string = await this.getDockerfilePath(dockerfileFromContextMenu);

        if (dockerfilePath) {
            const workspaceFolder: vscode.Uri = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(dockerfilePath)).uri;
            const exeDirArguments: vscode.Uri[] = await vscode.window.showOpenDialog({
                defaultUri: workspaceFolder,
                openLabel: "Select folder as EXE_DIR",
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
            });
            const exeDirArgument: vscode.Uri = exeDirArguments[0];
            if (exeDirArgument) {
                const relativePath: string = this.getRelativePath(exeDirArgument, workspaceFolder);
                if (relativePath) {
                    const imageName: string = await vscode.window.showInputBox({ prompt: "Enter image name", placeHolder: "E.g., myregistry.azurecr.io/myedgemodule:latest", ignoreFocusOut: true });
                    if (imageName === "") {
                        vscode.window.showErrorMessage("Image name cannot be empty");
                    } else if (imageName) {
                        Executor.runInTerminal(`docker build -f \"${Utility.adjustFilePath(dockerfilePath)}\" --build-arg EXE_DIR=\"${relativePath}\" -t \"${imageName}\" ` +
                            `\"${Utility.adjustFilePath(workspaceFolder.fsPath)}\"`);
                        TelemetryClient.sendEvent("buildDockerImage.end");
                    }
                } else {
                    vscode.window.showErrorMessage("The folder must be contained within the Dockerfile's root workspace folder");
                }
            }
        }
    }

    public async pushDockerImage() {
        TelemetryClient.sendEvent("pushDockerImage.start");
        const imageName: string = await vscode.window.showInputBox({ prompt: "Enter image name", placeHolder: "E.g., myregistry.azurecr.io/myedgemodule:latest", ignoreFocusOut: true });
        if (imageName === "") {
            vscode.window.showErrorMessage("Image name cannot be empty");
        } else if (imageName) {
            Executor.runInTerminal(`docker push ${imageName}`);
            TelemetryClient.sendEvent("pushDockerImage.end");
        }
    }

    private async getDockerfilePath(dockerfileFromContextMenu?: vscode.Uri): Promise<string> {
        if (dockerfileFromContextMenu) {
            TelemetryClient.sendEvent("buildDockerImage.start", {entry: "contextMenu"});
            return dockerfileFromContextMenu.fsPath;
        } else {
            TelemetryClient.sendEvent("buildDockerImage.start", {entry: "commandPalette"});
            const dockerfileList: vscode.Uri[] = await this.getDockerfileList();
            if (!dockerfileList || dockerfileList.length === 0) {
                vscode.window.showErrorMessage("No Dockerfile can be found under this workspace.");
                return;
            }

            const dockerfileItemList: vscode.QuickPickItem[] = this.getDockerfileItemList(dockerfileList);
            const dockerfileItem: vscode.QuickPickItem = await vscode.window.showQuickPick(dockerfileItemList, { placeHolder: "Select Dockerfile" });

            if (dockerfileItem) {
                return dockerfileItem.detail;
            } else {
                return null;
            }
        }
    }

    private async getDockerfileList(): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(Constants.dockerfileNamePattern, null, 1000, null);
    }

    private getDockerfileItemList(dockerfileList: vscode.Uri[]): vscode.QuickPickItem[] {
        return dockerfileList.map((d) => this.getDockerfileItem(d));
    }

    private getDockerfileItem(dockerfile: vscode.Uri): vscode.QuickPickItem {
        const dockerfileItem: vscode.QuickPickItem = {
            label: path.join(".", dockerfile.fsPath.substr(vscode.workspace.getWorkspaceFolder(dockerfile).uri.fsPath.length)),
            description: null,
            detail: dockerfile.fsPath,  // use the `detail` property to save dockerfile's full path, which will be used during docker build
        };

        return dockerfileItem;
    }

    private getRelativePath(folder: vscode.Uri, rootFolder: vscode.Uri): string {
        if (folder.fsPath.startsWith(rootFolder.fsPath)) {
            const relativePath: string = "." + folder.fsPath.substr(rootFolder.fsPath.length);

            return relativePath.replace(/\\/g, "/");
        }

        return null;
    }
}
