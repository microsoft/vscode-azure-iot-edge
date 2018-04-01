// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { ConfigIntelliSenseProvider } from "./common/configIntelliSenseProvider";
import { Constants } from "./common/constants";
import { ErrorData } from "./common/ErrorData";
import { Executor } from "./common/executor";
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

    const configIntelliSenseProvider = new ConfigIntelliSenseProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider([{ language: "json" }, { language: "jsonc" }], configIntelliSenseProvider, "\"", ".", ":"));
    context.subscriptions.push(vscode.languages.registerHoverProvider([{ language: "json" }, { language: "jsonc" }], configIntelliSenseProvider));
    // Calling registerDefinitionProvider will add "Go to definition" and "Peek definition" context menus to documents matched with the filter.
    // Use the strict { pattern: "**/deployment.template.json" } instead of { language: "json" }, { language: "jsonc" } to avoid polluting the context menu of non-config JSON files.
    context.subscriptions.push(vscode.languages.registerDefinitionProvider([{ pattern: "**/deployment.template.json" }], configIntelliSenseProvider));

    const diagCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(Constants.edgeDisplayName);
    if (vscode.window.activeTextEditor) {
        configIntelliSenseProvider.updateDiagnostics(vscode.window.activeTextEditor.document, diagCollection);
    }
    context.subscriptions.push(diagCollection);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((event) => configIntelliSenseProvider.updateDiagnostics(event.document, diagCollection)));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => configIntelliSenseProvider.updateDiagnostics(document, diagCollection)));

    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.edgeDisplayName);
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
