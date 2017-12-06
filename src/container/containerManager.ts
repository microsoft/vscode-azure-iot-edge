"use strict";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { TelemetryClient } from "../common/telemetryClient";
import { Utility } from "../common/utility";

export class ContainerManager {
    private workspaceState: vscode.Memento;

    constructor(context: vscode.ExtensionContext) {
        this.workspaceState = context.workspaceState;
    }

    public async buildDockerImage(dockerfileFromContextMenu?: vscode.Uri) {
        const dockerfilePath: string = await Utility.getInputFilePath(dockerfileFromContextMenu, Constants.dockerfileNamePattern, "Dockerfile", "buildDockerImage.start");

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
                const relativePath: string = Utility.getRelativePath(exeDirArgument, workspaceFolder);
                if (relativePath) {
                    const imageName: string = await this.promptForImageName();
                    if (imageName) {
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
        const imageName: string = await this.promptForImageName();
        if (imageName) {
            Executor.runInTerminal(`docker push ${imageName}`);
            TelemetryClient.sendEvent("pushDockerImage.end");
        }
    }

    private async promptForImageName(): Promise<string> {
        const imageNameCache: string = this.workspaceState.get<string>(Constants.lastUsedImageNameCacheKey);

        let imageName: string = await vscode.window.showInputBox({
            prompt: "Enter image name",
            value: imageNameCache,
            placeHolder: "E.g., myregistry.azurecr.io/myedgemodule:latest",
            ignoreFocusOut: true,
        });

        if (imageName !== undefined) {
            imageName = imageName.trim();
            if (imageName === "") {
                vscode.window.showErrorMessage("Image name cannot be empty");
            } else if (imageName) {
                this.workspaceState.update(Constants.lastUsedImageNameCacheKey, imageName);
            }
        }

        return imageName;
    }
}
