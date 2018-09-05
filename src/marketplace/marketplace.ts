// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { LocalServer } from "./localserver";

export class Marketplace {
    private panel: vscode.WebviewPanel;
    private localServer: LocalServer;

    constructor(private context: vscode.ExtensionContext) {
        this.localServer = new LocalServer(context);
    }

    public async show() {
        if (!this.panel) {
            this.localServer.startServer();
            this.panel = vscode.window.createWebviewPanel(
                "IoT Edge Marketplace",
                "IoT Edge Marketplace",
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

            this.panel.webview.onDidReceiveMessage((message) => {
                this.panel.webview.postMessage(message);
            }, undefined, this.context.subscriptions);
        } else {
            this.panel.reveal(vscode.ViewColumn.One);
        }
    }
}
