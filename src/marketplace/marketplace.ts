// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { ModuleInfo } from "../common/moduleInfo";
import { TelemetryClient } from "../common/telemetryClient";
import { Utility } from "../common/utility";
import { LocalServer } from "./localserver";

export class Marketplace {
    public static getInstance(context: vscode.ExtensionContext) {
        if (!Marketplace.instance) {
            Marketplace.instance = new Marketplace(context);
        }
        return Marketplace.instance;
    }

    private static instance: Marketplace;
    private panel: vscode.WebviewPanel;
    private localServer: LocalServer;
    private templateFile: string;
    private isNewSolution: boolean;

    private constructor(private context: vscode.ExtensionContext) {
        this.localServer = new LocalServer(context);
    }

    public async openMarketplacePage(templateFile: string, isNewSolution: boolean, modules: string[]): Promise<any> {
        this.setStatus(templateFile, isNewSolution, modules);
        if (!this.panel) {
            this.localServer.startServer();
            this.panel = vscode.window.createWebviewPanel(
                Constants.marketplacePanelViewType,
                Constants.marketplacePanelViewTitle,
                vscode.ViewColumn.One,
                {
                    enableCommandUris: true,
                    enableScripts: true,
                    retainContextWhenHidden: true,
                },
            );

            let html = fs.readFileSync(this.context.asAbsolutePath(path.join("assets", "marketplace", "index.html")), "utf8");
            html = html
                .replace(/{{root}}/g, this.panel.webview.asWebviewUri(vscode.Uri.file(this.context.asAbsolutePath("."))).toString())
                .replace(/{{endpoint}}/g, this.localServer.getServerUri());
            this.panel.webview.html = html;

            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.localServer.stopServer();
            });
        } else {
            this.panel.reveal();
        }

        this.panel.webview.onDidReceiveMessage(async (message) => {
            TelemetryClient.sendEvent("addMarketplaceModule", { moduleId: message.id });
            this.panel.dispose();
            const repositoryName = Utility.getRepositoryNameFromImageName(message.imageName);
            const moduleInfo = new ModuleInfo(message.moduleName, repositoryName, message.imageName, message.twins, message.createOptions,
                message.imageName, message.createOptions, message.routes, message.environmentVariables, true);
            await vscode.commands.executeCommand("azure-iot-edge.internal.addModule", this.templateFile, this.isNewSolution, moduleInfo, Constants.MARKETPLACE_MODULE);
        }, undefined, this.context.subscriptions);
    }

    private setStatus(templateFile: string, isNewSolution: boolean, modules: string[]) {
        this.localServer.modules = modules;
        this.templateFile = templateFile;
        this.isNewSolution = isNewSolution;
    }
}
