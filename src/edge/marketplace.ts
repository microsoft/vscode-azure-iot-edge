// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export class Marketplace {
    private panel: vscode.WebviewPanel;

    constructor(private context: vscode.ExtensionContext) {
    }

    public async show() {
        if (!this.panel) {
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
            html = html.replace(/{{root}}/g, vscode.Uri.file(this.context.asAbsolutePath(".")).with({ scheme: "vscode-resource" }).toString());
            this.panel.webview.html = html;
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });

            this.panel.webview.onDidReceiveMessage((message) => {
                this.panel.webview.postMessage(message);
            }, undefined, this.context.subscriptions);
        } else {
            this.panel.reveal(vscode.ViewColumn.One);
        }
    }
}
