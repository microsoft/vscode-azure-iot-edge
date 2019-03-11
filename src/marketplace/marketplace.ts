// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { ModuleInfo } from "../common/moduleInfo";
import { Utility } from "../common/utility";
import { EdgeManager } from "../edge/edgeManager";
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
    private edgeManager: EdgeManager;
    private templateFile: string;
    private outputChannel: vscode.OutputChannel;
    private isNewSolution: boolean;
    private modules: string[];

    private constructor(private context: vscode.ExtensionContext) {
        this.localServer = new LocalServer(context);
    }

    public async openMarketplacePage(edgeManager: EdgeManager, templateFile: string, outputChannel: vscode.OutputChannel, isNewSolution: boolean, modules: string[]): Promise<any> {
        this.setStatus(edgeManager, templateFile, outputChannel, isNewSolution, modules);
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
                .replace(/{{root}}/g, vscode.Uri.file(this.context.asAbsolutePath(".")).with({ scheme: "vscode-resource" }).toString())
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
            this.panel.dispose();
            const repositoryName = Utility.getRepositoryNameFromImageName(message.imageName);
            const moduleInfo = new ModuleInfo(message.moduleName, repositoryName, message.imageName, message.twins, message.createOptions,
                message.imageName, message.createOptions, message.routes, message.environmentVariables);
            await this.edgeManager.addModule(this.templateFile, this.outputChannel, this.isNewSolution, moduleInfo, Constants.MARKETPLACE_MODULE);
        }, undefined, this.context.subscriptions);
    }

    private setStatus(edgeManager: EdgeManager, templateFile: string, outputChannel: vscode.OutputChannel, isNewSolution: boolean, modules: string[]) {
        this.localServer.modules = modules;
        this.edgeManager = edgeManager;
        this.templateFile = templateFile;
        this.outputChannel = outputChannel;
        this.isNewSolution = isNewSolution;
        this.modules = modules;
    }
}
