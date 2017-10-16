"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { TelemetryClient } from "../common/telemetryClient";
import { Utility } from "../common/utility";

export class ContainerManager {
    public async buildAndPushDockerImage(dockerfileFromContext?: vscode.Uri) {
        TelemetryClient.sendEvent("start-build-and-push-docker-image");
        if (Utility.checkWorkspace()) {
            const imageName: string = await this.buildDockerImage(dockerfileFromContext);
            if (imageName) {
                this.pushDockerImage(imageName);
            }
        }
    }

    public async buildDockerImage(dockerfileFromContext?: vscode.Uri): Promise<string> {
        let dockerfileItem: vscode.QuickPickItem;
        if (dockerfileFromContext) {
            dockerfileItem = this.getDockerfileItem(dockerfileFromContext);
        } else {
            const dockerfileList: vscode.Uri[] = await this.getDockerfileList();
            if (!dockerfileList || dockerfileList.length === 0) {
                vscode.window.showErrorMessage("No Dockerfile can be found under this workspace.");
                return;
            }

            const dockerfileItemList: vscode.QuickPickItem[] = this.getDockerfileItemList(dockerfileList);
            dockerfileItem = await vscode.window.showQuickPick(dockerfileItemList, { placeHolder: "Select Dockerfile" });
        }
        if (dockerfileItem) {
            const buildArguments: string = await vscode.window.showInputBox({ prompt: "Add build arguments", placeHolder: "e.g., EXE_DIR=./bin/Release/netcoreapp2.0/publish", ignoreFocusOut: true });
            if (buildArguments !== undefined) { // continue if users don't press esc, but accept empty strings
                const imageName: string = await vscode.window.showInputBox({ prompt: "Enter image name", placeHolder: "e.g., myregistry.azurecr.io/myedgemodule:latest", ignoreFocusOut: true });
                if (imageName !== undefined) {  // continue if users don't press esc, but accept empty strings
                    Executor.runInTerminal(`docker build -f ${dockerfileItem.detail} --build-arg ${buildArguments} -t ${imageName} ${vscode.workspace.rootPath}`);
                    TelemetryClient.sendEvent("end-build-docker-image");

                    // debug only
                    // Executor.runInTerminal("docker build -f ./Docker/linux-x64/Dockerfile --build-arg EXE_DIR=./bin/Debug/netcoreapp2.0/publish -t localhost:5000/filtermodule:latest .");

                    return imageName;
                }
            }
        }

        return null;
    }

    public async pushDockerImage(imageName: string) {
        Executor.runInTerminal(`docker push ${imageName}`);
        TelemetryClient.sendEvent("end-push-docker-image");
    }

    private async getDockerfileList(): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(Constants.dockerfileNamePattern, null, 1000, null);
    }

    private getDockerfileItemList(dockerfileList: vscode.Uri[]): vscode.QuickPickItem[] {
        return dockerfileList.map((d) => this.getDockerfileItem(d));
    }

    private getDockerfileItem(dockerfile: vscode.Uri): vscode.QuickPickItem {
        const dockerfileItem: vscode.QuickPickItem = {
            label: path.join(".", dockerfile.fsPath.substr(vscode.workspace.rootPath.length)),
            description: null,
            detail: dockerfile.fsPath,  // use the `detail` property to save dockerfile's full path, which will be used during docker build
        };

        return dockerfileItem;
    }
}
