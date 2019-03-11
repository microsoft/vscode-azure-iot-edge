// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { ModuleInfo } from "../common/moduleInfo";
import { Utility } from "../common/utility";
import { LocalServer } from "./localserver";

export class Marketplace implements vscode.Disposable {
    public static getInstance(context: vscode.ExtensionContext, modules?: string[]) {
        if (!Marketplace.instance) {
            Marketplace.instance = new Marketplace(context, modules);
        }
        return Marketplace.instance;
    }

    private static instance: Marketplace;
    private panel: vscode.WebviewPanel;
    private localServer: LocalServer;

    private constructor(private context: vscode.ExtensionContext, private modules?: string[]) {
        this.localServer = new LocalServer(context, modules);
    }

    public async importModule(): Promise<any> {
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

        return new Promise((resolve, reject) => {
            this.panel.webview.onDidReceiveMessage((message) => {
                this.panel.dispose();
                const repositoryName = Utility.getRepositoryNameFromImageName(message.imageName);
                resolve(new ModuleInfo(message.moduleName, repositoryName, message.imageName, message.twins, message.createOptions,
                    message.imageName, message.createOptions, message.routes, message.environmentVariables));
            }, undefined, this.context.subscriptions);
        });
    }

    public dispose() {
        this.panel.dispose();
    }
}
