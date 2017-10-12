"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { Utility } from "../common/utility";

export class ContainerManager {
    public async buildAndPushDockerImage() {
        const imageName: string = await this.buildDockerImage();
        if (imageName) {
            this.pushDockerImage(imageName);
        }
    }

    public async buildDockerImage(): Promise<string> {
        const dockerfileList: vscode.Uri[] = await this.getDockerfileList();
        if (!dockerfileList || dockerfileList.length === 0) {
            vscode.window.showErrorMessage("No Dockerfile can be found under this workspace.");
            return;
        }

        const dockerfileItemList: vscode.QuickPickItem[] = this.getDockerfileItemList(dockerfileList);
        const dockerfileItem: vscode.QuickPickItem = await vscode.window.showQuickPick(dockerfileItemList, {placeHolder: "Select Dockerfile"});
        if (dockerfileItem) {
            const buildArguments: string = await vscode.window.showInputBox({placeHolder: "Add build arguments", ignoreFocusOut: true});
            const imageName: string = await vscode.window.showInputBox({placeHolder: "Enter image name", ignoreFocusOut: true});

            Executor.runInTerminal(`docker build -f ${dockerfileItem.detail} --build-arg ${buildArguments} -t ${imageName}`);

            return imageName;
        }

        return null;
    }

    public async pushDockerImage(imageName: string) {
        Executor.runInTerminal(`docker push ${imageName}`);
    }

    private async getDockerfileList(): Promise<vscode.Uri[]> {
        if (Utility.checkWorkspace()) {
            return await vscode.workspace.findFiles(Constants.dockerfileNamePattern, null, 1000, null);
        }
    }

    private getDockerfileItemList(dockerfileList: vscode.Uri[]): vscode.QuickPickItem[] {
        return dockerfileList.map((d) => this.getDockerfileItem(d));
    }

    private getDockerfileItem(dockerfile: vscode.Uri): vscode.QuickPickItem {
        const dockerfileItem: vscode.QuickPickItem = {
            label: path.join(".", dockerfile.fsPath.substr(vscode.workspace.rootPath.length)),
            description: dockerfile.fsPath,
            detail: dockerfile.fsPath,  // use the `detail` property to save dockerfile's full path, which will be used during docker build
        };

        return dockerfileItem;
    }
}
