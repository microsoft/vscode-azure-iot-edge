// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as tls from "tls";
import * as vscode from "vscode";
import { Constants } from "./common/constants";
import { ErrorData } from "./common/ErrorData";
import { Executor } from "./common/executor";
import { NSAT } from "./common/nsat";
import { Platform } from "./common/platform";
import { TelemetryClient } from "./common/telemetryClient";
import { UserCancelledError } from "./common/UserCancelledError";
import { Utility } from "./common/utility";
import { ContainerManager } from "./container/containerManager";
import { EdgeManager } from "./edge/edgeManager";
import { ConfigCompletionItemProvider } from "./intelliSense/configCompletionItemProvider";
import { ConfigDefinitionProvider } from "./intelliSense/configDefinitionProvider";
import { ConfigDiagnosticProvider } from "./intelliSense/configDiagnosticProvider";
import { ConfigHoverProvider } from "./intelliSense/configHoverProvider";
import { IDeviceItem } from "./typings/IDeviceItem";

// Work around TLS issue in Node.js >= 8.6.0
// https://github.com/nodejs/node/issues/16196
(tls as any).DEFAULT_ECDH_CURVE = "auto";

export function activate(context: vscode.ExtensionContext) {
    TelemetryClient.sendEvent("extensionActivated");

    const edgeManager = new EdgeManager(context);
    const containerManager = new ContainerManager();

    Utility.registerDebugTelemetryListener();

    const statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10000);
    statusBar.command = "azure-iot-edge.setDefaultPlatform";
    statusBar.text = formatStatusBarText(Platform.getDefaultPlatformStr());
    statusBar.tooltip = Constants.platformStatusBarTooltip;
    statusBar.show();

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (e.affectsConfiguration("azure-iot-edge.defaultPlatform")) {
            statusBar.text = formatStatusBarText(Platform.getDefaultPlatformStr());
        }
    }));

    context.subscriptions.push(statusBar);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider([{ language: "json" }, { language: "jsonc" }], new ConfigCompletionItemProvider(), "\"", ".", ":"));
    context.subscriptions.push(vscode.languages.registerHoverProvider([{ language: "json" }, { language: "jsonc" }], new ConfigHoverProvider()));
    // Calling registerDefinitionProvider will add "Go to definition" and "Peek definition" context menus to documents matched with the filter.
    // Use the strict { pattern: "**/deployment.template.json" } instead of { language: "json" }, { language: "jsonc" } to avoid polluting the context menu of non-config JSON files.
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(
        [{ pattern: Constants.deploymentTemplatePattern }, { pattern: Constants.debugDeploymentTemplatePattern }], new ConfigDefinitionProvider()));

    const diagCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(Constants.edgeDisplayName);
    const configDiagnosticProvider: ConfigDiagnosticProvider = new ConfigDiagnosticProvider();
    if (vscode.window.activeTextEditor) {
        configDiagnosticProvider.updateDiagnostics(vscode.window.activeTextEditor.document, diagCollection);
    }
    context.subscriptions.push(diagCollection);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((event) => configDiagnosticProvider.updateDiagnostics(event.document, diagCollection)));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => configDiagnosticProvider.updateDiagnostics(document, diagCollection)));

    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.edgeDisplayName);
    context.subscriptions.push(outputChannel);

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.buildModuleImage",
        (fileUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildModuleImage(fileUri, false);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.buildAndPushModuleImage",
        (fileUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildModuleImage(fileUri, true);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.newSolution",
        (parentUri?: vscode.Uri): Promise<void> => {
            return edgeManager.createEdgeSolution(outputChannel, parentUri);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.buildSolution",
        (templateUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildSolution(templateUri, false, false);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.buildAndPushSolution",
        (templateUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildSolution(templateUri, true, false);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.buildAndRunSolution",
        (templateUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildSolution(templateUri, false, true);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.runSolution",
        (deployFileUri?: vscode.Uri): Promise<void> => {
            return containerManager.runSolution(deployFileUri);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.stopSolution",
        (): Promise<void> => {
            return containerManager.stopSolution();
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.generateDeployment",
        (templateUri?: vscode.Uri): Promise<void> => {
            return containerManager.generateDeployment(templateUri);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.addModule",
        (templateUri?: vscode.Uri): Promise<void> => {
            return edgeManager.addModuleForSolution(outputChannel, templateUri);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.convertModule",
        (fileUri?: vscode.Uri): Promise<void> => {
            return edgeManager.convertModule(fileUri);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.setupIotedgehubdev",
        (deviceItem?: IDeviceItem): Promise<void> => {
            return edgeManager.setupIotedgehubdev(deviceItem, outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.startEdgeHubSingle",
        (): Promise<void> => {
            return edgeManager.startEdgeHubSingleModule(outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.setModuleCred",
        (): Promise<void> => {
            return edgeManager.setModuleCred(outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.setDefaultPlatform",
        async (): Promise<void> => {
            await edgeManager.selectDefaultPlatform(outputChannel);
            return configDiagnosticProvider.updateDiagnostics(vscode.window.activeTextEditor.document, diagCollection);
        });

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));

    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        folders.forEach((value) => edgeManager.checkRegistryEnv(value));
    }
}

function formatStatusBarText(platform?: string): string {
    return platform ? `$(circuit-board) ${platform}` : `$(circuit-board) amd64`;
}

function initCommand(context: vscode.ExtensionContext,
                     outputChannel: vscode.OutputChannel,
                     commandId: string, callback: (...args: any[]) => any): void {
    initCommandAsync(context, outputChannel, commandId, async (...args) => callback(...args));
}

function initCommandAsync(context: vscode.ExtensionContext,
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
            NSAT.takeSurvey(context);
        }
    }));
}

export function deactivate() {
}
