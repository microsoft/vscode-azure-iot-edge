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
        const dockerfileList: string[] = (await this.getDockerfileList()).map((d) => path.join(".", d.fsPath.substr(vscode.workspace.rootPath.length)));

        if (!dockerfileList || dockerfileList.length === 0) {
            vscode.window.showErrorMessage("No Dockerfile can be found under this workspace.");
            return;
        }

        const dockerfile: string = await vscode.window.showQuickPick(dockerfileList, {placeHolder: "Select Dockerfile"});
        if (dockerfile) {
            const buildArguments: string = await vscode.window.showInputBox({placeHolder: "Add build arguments", ignoreFocusOut: true});
            const imageName: string = await vscode.window.showInputBox({placeHolder: "Enter image name", ignoreFocusOut: true});

            Executor.runInTerminal(`docker build -f ${dockerfile} --build-arg ${buildArguments} -t ${imageName}`);

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
}
