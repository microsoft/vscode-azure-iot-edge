"use strict";
import * as iothub from "azure-iothub";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { TelemetryClient } from "../common/telemetryClient";
import { Utility } from "../common/utility";

export class EdgeManager {

    constructor(private context: vscode.ExtensionContext) {
    }

    public generateDeploymentJsonForVerification() {
        this.generateFile(Constants.deploymentFile);
    }

    public generateRoutesJsonForVerification() {
        this.generateFile(Constants.routesFile);
    }

    public async verifyModule() {
        const devices = await Utility.getDevices();
        const deviceIds = devices.map((device) => device.deviceId);
        vscode.window.showQuickPick(deviceIds, { placeHolder: "Select device" }).then((deviceId) => {
            if (deviceId !== undefined) {
                const deploymentFile = path.join(vscode.workspace.rootPath, ".vscode", Constants.deploymentFile);
                const routesFile = path.join(vscode.workspace.rootPath, ".vscode", Constants.routesFile);
                this.createDeployment(deviceId, deploymentFile);
                this.launchEdgeRuntime(deviceId, devices, routesFile);
            }
        });
    }

    public viewModuleInput() {
        TelemetryClient.sendEvent("viewModuleInput");
        Executor.runInTerminal(`docker logs input-simulator --tail 50 -f`, "Module Input");
    }

    public viewModuleOutput() {
        Executor.runInTerminal(`docker logs output-simulator --tail 50 -f`, "Module Output");
    }

    public async login() {
        const config = Utility.getConfiguration();
        let iotHubConnectionString = config.get<string>(Constants.IotHubConnectionStringKey);
        if (!iotHubConnectionString) {
            iotHubConnectionString = await vscode.window.showInputBox({
                prompt: "IoT Hub Connection String",
                placeHolder: "Enter IoT Hub Connection String",
            }).then((connectionString: string) => {
                if (connectionString !== undefined) {
                    config.update(Constants.IotHubConnectionStringKey, connectionString, true);
                    return connectionString;
                }
            });
        }
        if (iotHubConnectionString) {
            Executor.runInTerminal(`edge-explorer login "${iotHubConnectionString}"`);
        }
    }

    public async deploy() {
        const deviceIds = (await Utility.getDevices()).map((device) => device.deviceId);
        vscode.window.showQuickPick(deviceIds, { placeHolder: "Select device to create deployment" }).then((deviceId) => {
            if (deviceId !== undefined) {
                this.createDeployment(deviceId, path.join(vscode.workspace.rootPath, Constants.deploymentFile));
            }
        });
    }

    public async launch() {
        const devices = await Utility.getDevices();
        const deviceIds = devices.map((device) => device.deviceId);
        vscode.window.showQuickPick(deviceIds, { placeHolder: "Select device to launch Egde runtime" }).then((deviceId) => {
            if (deviceId !== undefined) {
                this.launchEdgeRuntime(deviceId, devices, path.join(vscode.workspace.rootPath, Constants.routesFile));
            }
        });
    }

    private generateFile(fileName: string) {
        if (Utility.checkWorkspace()) {
            const fullFileName = path.join(vscode.workspace.rootPath, ".vscode", fileName);
            if (fs.existsSync(fullFileName)) {
                vscode.window.showWarningMessage(`${fileName} already exists in '.vscode' folder.`);
            } else {
                const folder = path.join(vscode.workspace.rootPath, ".vscode");
                if (!fs.existsSync(folder)) {
                    fs.mkdirSync(folder);
                }
                fse.copySync(this.context.asAbsolutePath(path.join("assets", fileName)), fullFileName);
            }
            Utility.showfile(fullFileName);
        }
    }

    private createDeployment(deviceId: string, deploymentFile: string) {
        Executor.runInTerminal(`edge-explorer edge deployment create -m "${deploymentFile}" -d ${deviceId}`);
    }

    private launchEdgeRuntime(deviceId: string, devices: iothub.Device[], routesFile: string) {
        const primaryKey = devices.find((device) => device.deviceId === deviceId).authentication.symmetricKey.primaryKey;
        const config = Utility.getConfiguration();
        const iotHubConnectionString = config.get<string>(Constants.IotHubConnectionStringKey);
        const hostName = Utility.getHostNameFromConnectionString(iotHubConnectionString);
        const deviceConnectionString = `HostName=${hostName};DeviceId=${deviceId};SharedAccessKey=${primaryKey}`;
        Executor.runInTerminal(`launch-edge-runtime -c "${deviceConnectionString}" --config "${routesFile}"`);
    }
}
