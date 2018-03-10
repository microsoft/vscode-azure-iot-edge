"use strict";
import * as vscode from "vscode";
import { Constants } from "./common/constants";
import { ErrorData } from "./common/ErrorData";
import { Executor } from "./common/executor";
import { JsonCompletionItemProvider } from "./common/jsonCompletionItemProvider";
import { TelemetryClient } from "./common/telemetryClient";
import { UserCancelledError } from "./common/UserCancelledError";
import { Utility } from "./common/utility";
import { ContainerManager } from "./container/containerManager";
import { EdgeManager } from "./edge/edgeManager";

export function activate(context: vscode.ExtensionContext) {
    TelemetryClient.sendEvent("extensionActivated");

    const edgeManager = new EdgeManager(context);
    const containerManager = new ContainerManager(context);

    Utility.registerDebugTelemetryListener();

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider([{ language: "json" }, { language: "jsonc" }], new JsonCompletionItemProvider(), "\"", ".", ":"));

    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.edgeChannel);
    context.subscriptions.push(outputChannel);

    initCommmandAsync(context, outputChannel,
        "azure-iot-edge.buildModuleImage",
        (fileUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildModuleImage(fileUri, false);
        });

    initCommmandAsync(context, outputChannel,
        "azure-iot-edge.buildAndPushModuleImage",
        (fileUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildModuleImage(fileUri, true);
        });

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

    initCommmandAsync(context, outputChannel,
        "azure-iot-edge.convertModule",
        (fileUri?: vscode.Uri): Promise<void> => {
            return edgeManager.convertModule(fileUri);
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
