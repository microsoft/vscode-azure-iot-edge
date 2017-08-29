"use strict";
import * as vscode from "vscode";
import { Executor } from "./common/executor";
import { InputModuleManager } from "./inputModule/inputModuleManager";

export function activate(context: vscode.ExtensionContext) {
    const inputModuleManager = new InputModuleManager();

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.editTemplate", () => {
        inputModuleManager.editTemplate();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.deployTemplate", () => {
        inputModuleManager.deployTemplate();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("azure-iot-edge.updateInterval", () => {
        inputModuleManager.updateInterval();
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
}
