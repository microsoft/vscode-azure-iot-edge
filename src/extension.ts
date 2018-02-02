"use strict";
import * as vscode from "vscode";
import { Constants } from "./common/constants";
import { Executor } from "./common/executor";
import { TelemetryClient } from "./common/telemetryClient";
import { Utility } from "./common/utility";
import { ContainerManager } from "./container/containerManager";
import { EdgeManager } from "./edge/edgeManager";
import { DotnetUtility } from "./languages/dotnet/dotnetUtility";
import { InputModuleManager } from "./module/inputModuleManager";

export function activate(context: vscode.ExtensionContext) {
    TelemetryClient.sendEvent("extensionActivated");

    const inputModuleManager = new InputModuleManager();
    const edgeManager = new EdgeManager(context);
    const containerManager = new ContainerManager(context);
    const dotnetUtility = new DotnetUtility();
    Utility.registerDebugTelemetryListener();
    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.edgeChannel);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.editTemplate", () => {
        inputModuleManager.editTemplate();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.deployTemplate", () => {
        inputModuleManager.deployTemplate();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.updateInterval", () => {
        inputModuleManager.updateInterval();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.generateDeploymentJsonForVerification", () => {
        edgeManager.generateDeploymentJsonForVerification();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.generateRoutesJsonForVerification", () => {
        edgeManager.generateRoutesJsonForVerification();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.verifyModule", () => {
        edgeManager.verifyModule();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.viewModuleInput", () => {
        edgeManager.viewModuleInput();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.viewModuleOutput", () => {
        edgeManager.viewModuleOutput();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.login", () => {
        edgeManager.login();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.deploy", () => {
        edgeManager.deploy();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.launch", () => {
        edgeManager.launch();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.buildDockerImage", (dockerfileFromContextMenu: vscode.Uri) => {
        containerManager.buildDockerImage(dockerfileFromContextMenu);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.pushDockerImage", () => {
        containerManager.pushDockerImage();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.dotnetPublish", (fileUri: vscode.Uri) => {
        dotnetUtility.dotnetPublish(fileUri);
    }));

    // tslint:disable-next-line:array-type
    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.newSolution", async (...args: {}[]) => {
        try {
            if (args.length === 0) {
                await edgeManager.createEdgeSolution(outputChannel);
            } else {
                await edgeManager.createEdgeSolution(outputChannel, args[0] as vscode.Uri);
            }
        } catch (error) {
            outputChannel.appendLine(error.toString());
        }
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
}
