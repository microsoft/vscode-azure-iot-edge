"use strict";
import * as vscode from "vscode";
import { Constants } from "./common/constants";
import { ErrorData } from "./common/ErrorData";
import { Executor } from "./common/executor";
import { TelemetryClient } from "./common/telemetryClient";
import { UserCancelledError } from "./common/UserCancelledError";
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

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.buildModuleImage", (fileUri: vscode.Uri) => {
        containerManager.buildModuleImage(fileUri, false);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.buildAndPushModuleImage", (fileUri: vscode.Uri) => {
        containerManager.buildModuleImage(fileUri, true);
    }));

    initCommmandAsync(context, outputChannel,
                      "azure-iot-edge.newSolution",
                      (parentUri?: vscode.Uri): Promise<void> => {
                          return edgeManager.createEdgeSolution(outputChannel, parentUri);
                      });

    initCommmandAsync(context, outputChannel,
                      "azure-iot-edge.buildSolution",
                      (templateUri?: vscode.Uri): Promise<void> => {
                          return containerManager.buildSolution(templateUri);
                      });

    initCommmandAsync(context, outputChannel,
                      "azure-iot-edge.generateDeployment",
                      (templateUri?: vscode.Uri): Promise<void> => {
                          return containerManager.generateDeployment(templateUri);
                      });

    initCommmandAsync(context, outputChannel,
        "azure-iot-edge.addModulde",
        (templateUri?: vscode.Uri): Promise<void> => {
            return edgeManager.addModuleForSolution(outputChannel, templateUri);
        });

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));
}

function initCommand(context: vscode.ExtensionContext,
                     outputChannel: vscode.OutputChannel,
                     commandId: string, callback: (...args: any[]) => any): void {
    initCommmandAsync(context, outputChannel, commandId, async (...args) => callback(...args));
}

function initCommmandAsync(context: vscode.ExtensionContext,
                           outputChannel: vscode.OutputChannel,
                           commandId: string, callback: (...args: any[]) => Promise<any>): void {
    context.subscriptions.push(vscode.commands.registerCommand(commandId, async (...args: any[]) => {
        const start: number = Date.now();
        let errorData: ErrorData | undefined;
        const properties: { [key: string]: string; } = {};
        properties.result = "Succeeded";
        TelemetryClient.sendEvent(`${commandId}.start`);
        try {
            return await callback(...args);
        } catch (error) {
            if (error instanceof UserCancelledError) {
                properties.result = "Cancelled";
            } else {
                properties.result = "Failed";
                errorData = new ErrorData(error);
                outputChannel.appendLine(`Error: ${errorData.message}`);
                vscode.window.showErrorMessage(errorData.message);
            }
        } finally {
            const end: number = Date.now();
            properties.duration = ((end - start) / 1000).toString();
            if (errorData) {
                properties.error = errorData.errorType;
                properties.errorMessage = errorData.message;
            }
            TelemetryClient.sendEvent(`${commandId}.end`, properties);
        }
    }));
}

export function deactivate() {
}
