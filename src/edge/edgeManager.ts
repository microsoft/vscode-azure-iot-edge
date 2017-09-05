"use strict";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Executor } from "../common/executor";
import { Utility } from "../common/utility";

export class EdgeManager {

    constructor(private context: vscode.ExtensionContext) {
    }

    public generateDeploymentJsonForVerification() {
        this.generateFile("deployment.json");
    }

    public generateRoutesJsonForVerification() {
        this.generateFile("routes.json");
    }

    public verifyModule() {
        vscode.window.showInputBox({
            prompt: "Device Connection String",
            placeHolder: "Enter Device Connection String",
        }).then((deviceConnectionString: string) => {
            if (deviceConnectionString !== undefined) {
                const deviceId = Utility.getDeviceId(deviceConnectionString);
                if (deviceId) {
                    const deploymentFile = path.join(vscode.workspace.rootPath, ".vscode", "deployment.json");
                    const routesFile = path.join(vscode.workspace.rootPath, ".vscode", "routes.json");
                    this.createDeployment(deviceId, deploymentFile);
                    this.launchEdgeRuntime(deviceConnectionString, routesFile);
                } else {
                    vscode.window.showWarningMessage("Please enter a valid Device Connection String");
                }
            }
        });
    }

    public viewModuleInput() {
        Executor.runInTerminal(`docker logs input-simulator --tail 50 -f`, "Module Input");
    }

    public viewModuleOutput() {
        Executor.runInTerminal(`docker logs output-simulator --tail 50 -f`, "Module Output");
    }

    private generateFile(fileName: string) {
        if (vscode.workspace.rootPath) {
            const fullFileName = path.join(vscode.workspace.rootPath, ".vscode", fileName);
            if (fs.existsSync(fullFileName)) {
                vscode.window.showWarningMessage(`${fileName} already exists in '.vscode' folder.`);
            } else {
                const folder = path.join(vscode.workspace.rootPath, ".vscode");
                if (!fs.existsSync(folder)) {
                    fs.mkdirSync(folder);
                }
                fse.copySync(this.context.asAbsolutePath(path.join("assets", fileName)), fullFileName);
                vscode.window.showInformationMessage(`${fileName} is generated in '.vscode' folder.`);
            }
        } else {
            vscode.window.showWarningMessage("No folder is opened.");
        }
    }

    private createDeployment(deviceId: string, deploymentFile: string) {
        Executor.runInTerminal(`edge-explorer edge deployment create -m "${deploymentFile}" -d ${deviceId}`);
    }

    private launchEdgeRuntime(deviceConnectionString: string, routesFile: string) {
        Executor.runInTerminal(`launch-edge-runtime -c "${deviceConnectionString}" --config "${routesFile}"`);
    }
}
