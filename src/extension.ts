// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as tls from "tls";
import * as vscode from "vscode";
import { ConfigNotSetError } from "./common/ConfigNotSetError";
import { Constants } from "./common/constants";
import { ErrorData } from "./common/ErrorData";
import { Executor } from "./common/executor";
import { LearnMoreError } from "./common/LearnMoreError";
import { ModuleInfo } from "./common/moduleInfo";
import { NSAT } from "./common/nsat";
import { Platform } from "./common/platform";
import { TelemetryClient } from "./common/telemetryClient";
import { UserCancelledError } from "./common/UserCancelledError";
import { Utility } from "./common/utility";
import { ContainerManager } from "./container/containerManager";
import { EdgeManager } from "./edge/edgeManager";
import { Simulator } from "./edge/simulator";
import { Gallery } from "./gallery/gallery";
import { ASAModuleUpdateCodeLensProvider } from "./intelliSense/ASAModuleUpdateCodeLensProvider";
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
    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(Constants.edgeDisplayName);
    const edgeManager = new EdgeManager(context);
    const gallery = new Gallery(context);
    const simulator = new Simulator(context);
    simulator.validateSimulatorUpdated(outputChannel);
    const containerManager = new ContainerManager(simulator);
    Utility.checkDockerState(outputChannel);

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
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider([{ scheme: "file", language: "json" }, { scheme: "file", language: "jsonc" }],
            new ConfigCompletionItemProvider(), "\"", ".", ":"));
    context.subscriptions.push(
        vscode.languages.registerHoverProvider([{ scheme: "file", language: "json" }, { scheme: "file", language: "jsonc" }],
            new ConfigHoverProvider()));
    // Calling registerDefinitionProvider will add "Go to definition" and "Peek definition" context menus to documents matched with the filter.
    // Use the strict { pattern: "**/deployment.template.json" } instead of { language: "json" }, { language: "jsonc" } to avoid polluting the context menu of non-config JSON files.
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider([{ scheme: "file", pattern: Constants.deploymentTemplatePattern }, { scheme: "file", pattern: Constants.debugDeploymentTemplatePattern }],
            new ConfigDefinitionProvider()));

    const diagCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(Constants.edgeDisplayName);
    const configDiagnosticProvider: ConfigDiagnosticProvider = new ConfigDiagnosticProvider();
    if (vscode.window.activeTextEditor) {
        configDiagnosticProvider.updateDiagnostics(vscode.window.activeTextEditor.document, diagCollection);
    }
    context.subscriptions.push(diagCollection);
    // For files that are over 5MB in size, an undefined event will be created
    // https://github.com/Microsoft/vscode/issues/27100
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((event) => { if (event) { configDiagnosticProvider.updateDiagnostics(event.document, diagCollection); } }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => configDiagnosticProvider.updateDiagnostics(document, diagCollection)));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => diagCollection.delete(document.uri)));
    context.subscriptions.push(outputChannel);

    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("edge-coreclr", {resolveDebugConfiguration}));
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("edge-node", {resolveDebugConfiguration}));
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("edge-python", {resolveDebugConfiguration}));

    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ pattern: `**/{deployment.*.template.json,deployment.template.json}` }, new ASAModuleUpdateCodeLensProvider()));

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
            return containerManager.buildSolution(outputChannel, templateUri, false, false);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.buildAndPushSolution",
        (templateUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildSolution(outputChannel, templateUri, true, false);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.buildAndRunSolution",
        (templateUri?: vscode.Uri): Promise<void> => {
            return containerManager.buildSolution(outputChannel, templateUri, false, true);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.runSolution",
        (deployFileUri?: vscode.Uri): Promise<void> => {
            return simulator.runSolution(outputChannel, deployFileUri);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.stopSolution",
        (): Promise<void> => {
            return simulator.stopSolution(outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.generateDeployment",
        (templateUri?: vscode.Uri): Promise<void> => {
            return containerManager.generateDeployment(outputChannel, templateUri);
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
            return simulator.setupIotedgehubdev(deviceItem, outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.startEdgeHubSingle",
        (): Promise<void> => {
            return simulator.startEdgeHubSingleModule(outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.setModuleCred",
        (): Promise<void> => {
            return simulator.setModuleCred(outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.setDefaultPlatform",
        async (): Promise<void> => {
            await edgeManager.selectDefaultPlatform(outputChannel);
            const document = vscode.window && vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
            return configDiagnosticProvider.updateDiagnostics(document, diagCollection);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.setDefaultEdgeRuntimeVersion",
        async (): Promise<void> => {
            await edgeManager.selectDefaultEdgeRuntimeVersion(outputChannel);
            const document = vscode.window && vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
            return configDiagnosticProvider.updateDiagnostics(document, diagCollection);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.showGallery",
        async (): Promise<void> => {
          return gallery.loadWebView();
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.addDevContainer",
        async (): Promise<void> => {
            return edgeManager.addDevContainerDefinition();
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.initializeSample",
        async (name: string, url: string, platform: string): Promise<void> => {
            return gallery.initializeSample(name, url, platform, outputChannel);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.internal.addModule",
        async (templateFile: string, isNewSolution: boolean, moduleInfo: ModuleInfo, template: string): Promise<void> => {
            return edgeManager.addModuleInfo(templateFile, outputChannel, isNewSolution, template, moduleInfo);
        });

    initCommandAsync(context, outputChannel,
        "azure-iot-edge.internal.checkUpdateForASAModule",
        async (templateFile: string, moduleName: string): Promise<void> => {
            return edgeManager.checkAndUpdateASAJob(templateFile, moduleName);
        });

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));

    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        folders.forEach((value) => edgeManager.checkRegistryEnv(value));
    }
}

function resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined,
                                   debugConfiguration: vscode.DebugConfiguration,
                                   token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
    // Use static debug initialize configuration in package.json
    // https://github.com/Microsoft/vscode/issues/68129 and https://github.com/Microsoft/vscode/issues/33794
    return null;
}

function formatStatusBarText(platform?: string): string {
    return platform ? `$(circuit-board) ${platform}` : `$(circuit-board) amd64`;
}

function initCommand(context: vscode.ExtensionContext,
                     outputChannel: vscode.OutputChannel,
                     commandId: string, callback: (...args: any[]) => any): void {
    initCommandAsync(context, outputChannel, commandId, async (...args) => callback(...args));
}

async function showLearnMoreError(error: LearnMoreError): Promise<void> {
    const learnMore: vscode.MessageItem = { title: Constants.learnMore };
    const items: vscode.MessageItem[] = [ learnMore ];
    if (await vscode.window.showErrorMessage(error.message, ...items) === learnMore) {
        await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(error.url));
    }
}

async function guideUserToSetupIotedgehubdev(outputChannel: vscode.OutputChannel) {
    const setup: vscode.MessageItem = { title: Constants.Setup };
    const cancel: vscode.MessageItem = { title: Constants.Cancel };
    const items: vscode.MessageItem[] = [setup, cancel];
    const input = await vscode.window.showWarningMessage(Constants.needSetupSimulatorMsg, ...items);
    const telemetryName = "guideUserSetupConnectionString";

    if (input === setup) {
        TelemetryClient.sendEvent(`${telemetryName}.${Constants.Setup.toLocaleLowerCase()}`);
        await vscode.commands.executeCommand("azure-iot-edge.setupIotedgehubdev", undefined);
    } else {
        TelemetryClient.sendEvent(`${telemetryName}.${Constants.Cancel.toLocaleLowerCase()}`);
    }
}

function initCommandAsync(context: vscode.ExtensionContext,
                          outputChannel: vscode.OutputChannel,
                          commandId: string, callback: (...args: any[]) => Promise<any>): void {
    context.subscriptions.push(vscode.commands.registerCommand(commandId, async (...args: any[]) => {
        const start: number = Date.now();
        let errorData: ErrorData | undefined;
        const properties: { [key: string]: string; } = {};
        properties.result = "Succeeded";
        properties.fromCommandPalette = (!args || !args[0]).toString();

        TelemetryClient.sendEvent(`${commandId}.start`);
        outputChannel.appendLine(`${commandId}: `);
        try {
            return await callback(...args);
        } catch (error) {
            if (error instanceof UserCancelledError) {
                properties.result = "Cancelled";
                outputChannel.appendLine(Constants.userCancelled);
            } else {
                properties.result = "Failed";
                errorData = new ErrorData(error);
                outputChannel.appendLine(`Error: ${errorData.message}`);
                if (error instanceof LearnMoreError) {
                    showLearnMoreError(error);
                } else if (error instanceof ConfigNotSetError) {
                    guideUserToSetupIotedgehubdev(outputChannel);
                } else {
                    vscode.window.showErrorMessage(errorData.message);
                }
            }
        } finally {
            const end: number = Date.now();
            properties.duration = ((end - start) / 1000).toString();
            if (errorData) {
                properties[Constants.errorProperties.error] = errorData.errorType;
                properties[Constants.errorProperties.errorMessage] = errorData.message;
                TelemetryClient.sendErrorEvent(`${commandId}.end`, properties);
            } else {
                TelemetryClient.sendEvent(`${commandId}.end`, properties);
            }
            NSAT.takeSurvey(context);
        }
    }));
}

export function deactivate() {
}
