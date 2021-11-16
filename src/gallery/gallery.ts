// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as download from "download-git-repo";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { TelemetryClient } from "../common/telemetryClient";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";

export class Gallery {
    private panel: vscode.WebviewPanel;

    public constructor(private context: vscode.ExtensionContext) {
    }

    public async loadWebView() {
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(Constants.galleryPanelViewType, Constants.galleryPanelViewTitle, vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
            });

            const srcPath: string = this.context.asAbsolutePath(path.join(Constants.assetsFolder, Constants.galleryAssetsFolder, Constants.galleryIndexHtmlName));
            this.panel.webview.html = await this.getWebViewContent(srcPath);

            // Handle messages from the webview
            this.panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case "openSample":
                        if (message.name && message.url) {
                            await vscode.commands.executeCommand("azure-iot-edge.initializeSample", message.name, message.url, message.platform);
                        }
                        break;
                    case "openLink":
                        if (message.url) {
                            TelemetryClient.sendEvent(Constants.openSampleUrlEvent, { Url: message.url });
                            await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(message.url));
                        }
                        break;
                }
            }, undefined, this.context.subscriptions);

            this.panel.onDidDispose(() => {
                this.panel = null;
            });
        } else {
            this.panel.reveal();
        }
    }

    public async initializeSample(name: string, url: string, platform: string, channel: vscode.OutputChannel) {
        try {
            const parentPath = await Utility.getSolutionParentFolder();

            if (parentPath === undefined) {
                throw new UserCancelledError();
            }

            await fse.ensureDir(parentPath);
            const sampleName: string = await Utility.inputSolutionName(parentPath, name);
            const samplePath: string = path.join(parentPath, sampleName);

            channel.show();
            channel.appendLine(`Downloading sample project to ${samplePath}...`);
            await this.downloadSamplePackage(url, samplePath);

            const defaultPlatformKey = Utility.getVscodeSettingKey(Constants.defPlatformConfig);
            let vscodeSettingJson = await Utility.getUserSettingJsonFromSolutionPath(samplePath);

            if (vscodeSettingJson === undefined) {
                vscodeSettingJson = {};
            }

            if (!vscodeSettingJson[defaultPlatformKey]) {
                vscodeSettingJson[defaultPlatformKey] = {
                    platform,
                    alias: null,
                };
            } else {
                if (!vscodeSettingJson[defaultPlatformKey].platform) {
                    vscodeSettingJson[defaultPlatformKey].platform = platform;
                }
                if (!vscodeSettingJson[defaultPlatformKey].alias) {
                    vscodeSettingJson[defaultPlatformKey].alias = null;
                }
            }

            channel.appendLine(`Setting default platform to ${vscodeSettingJson[defaultPlatformKey].platform}...`);

            await fse.outputJson(Utility.getVscodeSolutionSettingPath(samplePath), vscodeSettingJson, { spaces: 2 });

            channel.appendLine(`Sample project downloaded successfully and will be opened now.`);
            TelemetryClient.sendEvent(Constants.openSampleEvent, { Result: "Success" });
            await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(samplePath), false);
        } catch (error) {
            if (error instanceof UserCancelledError) {
                throw new UserCancelledError();
            } else {
                throw new Error(`Unable to load sample. ${error.message}`);
            }
        }
    }

    public async getWebViewContent(templatePath: string): Promise<string> {
        const dirPath = path.dirname(templatePath);
        let html = await fse.readFile(templatePath, "utf-8");

        const extensionVersion = vscode.extensions.getExtension(Constants.ExtensionId).packageJSON.version;
        html = html.replace("{{version}}", extensionVersion);

        html = html.replace(/(<link.*?\shref="|<script.*?\ssrc="|<img.*?\ssrc=")(.+?)"/g, (m, $1, $2) => {
            return $1 + vscode.Uri.file(path.join(dirPath, $2)).with({ scheme: "vscode-resource" }).toString(true) + "\"";
        });
        return html;
    }

    private async downloadSamplePackage(url: string, fsPath: string): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            download(url, fsPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
