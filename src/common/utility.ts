// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { Executor } from "./executor";
import { TelemetryClient } from "./telemetryClient";
import { UserCancelledError } from "./UserCancelledError";

export class Utility {
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("azure-iot-edge");
    }

    public static checkWorkspace(): boolean {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage("This extension only works when folders are opened.");
            return false;
        }

        return true;
    }

    public static adjustFilePath(filePath: string): string {
        if (os.platform() === "win32") {
            const windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
            const terminalRoot = Utility.getConfiguration().get<string>("terminalRoot");
            if (windowsShell && terminalRoot) {
                filePath = filePath
                    .replace(/^([A-Za-z]):/, (match, p1) => `${terminalRoot}${p1.toLowerCase()}`)
                    .replace(/\\/g, "/");
            } else if (windowsShell && windowsShell.toLowerCase().indexOf("bash") > -1 && windowsShell.toLowerCase().indexOf("git") > -1) {
                // Git Bash
                filePath = filePath
                    .replace(/^([A-Za-z]):/, (match, p1) => `/${p1.toLowerCase()}`)
                    .replace(/\\/g, "/");
            } else if (windowsShell && windowsShell.toLowerCase().indexOf("bash") > -1 && windowsShell.toLowerCase().indexOf("windows") > -1) {
                // Bash on Ubuntu on Windows
                filePath = filePath
                    .replace(/^([A-Za-z]):/, (match, p1) => `/mnt/${p1.toLowerCase()}`)
                    .replace(/\\/g, "/");
            }
        }
        return filePath;
    }

    public static combineCommands(commands: string[]): string {
        let isPowerShell = false;
        if (os.platform() === "win32") {
            const windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
            if (windowsShell && windowsShell.toLowerCase().indexOf("powershell") > -1) {
                isPowerShell = true;
            }
        }
        if (isPowerShell) {
            let command: string = "";
            for (let i = 0; i < commands.length; i++) {
                switch (i) {
                    case 0:
                        command = commands[0];
                        break;
                    case 1:
                        command = `${command} ; if ($?) { ${commands[1]}`;
                        break;
                    default:
                        command = `${command} } if ($?) { ${commands[i]}`;
                }
            }
            if (commands.length > 1) {
                command += " }";
            }
            return command;
        } else {
            return commands.join(" && ");
        }
    }

    public static registerDebugTelemetryListener() {
        vscode.debug.onDidStartDebugSession((session) => {
            if (session.name.startsWith(Constants.EdgeDebugSessionPrefix)) {
                TelemetryClient.sendEvent("startDebugSession");
            }
        });
    }

    public static async getInputFilePath(inputFileFromContextMenu: vscode.Uri, filePattern: string, fileDescription: string, eventName: string): Promise<string> {
        if (!Utility.checkWorkspace()) {
            return null;
        }

        if (inputFileFromContextMenu) {
            TelemetryClient.sendEvent(eventName, { entry: "contextMenu" });
            return inputFileFromContextMenu.fsPath;
        } else {
            TelemetryClient.sendEvent(eventName, { entry: "commandPalette" });
            const fileList: vscode.Uri[] = await vscode.workspace.findFiles(filePattern);
            if (!fileList || fileList.length === 0) {
                vscode.window.showErrorMessage(`No ${fileDescription} can be found under this workspace.`);
                return null;
            }

            const fileItemList: vscode.QuickPickItem[] = Utility.getQuickPickItemsFromUris(fileList);
            const fileItem: vscode.QuickPickItem = await vscode.window.showQuickPick(fileItemList, { placeHolder: `Select ${fileDescription}` });
            if (fileItem) {
                return fileItem.detail;
            } else {
                return null;
            }
        }
    }

    public static getQuickPickItemsFromUris(uriList: vscode.Uri[]): vscode.QuickPickItem[] {
        return uriList.map((u) => Utility.getQuickPickItem(u));
    }

    public static getQuickPickItem(uri: vscode.Uri): vscode.QuickPickItem {
        const quickPickItem: vscode.QuickPickItem = {
            label: path.join(".", uri.fsPath.substr(vscode.workspace.getWorkspaceFolder(uri).uri.fsPath.length)),
            description: null,
            detail: uri.fsPath,  // use the `detail` property to save URI's full path, which will be used later
        };

        return quickPickItem;
    }

    public static getRelativePath(folder: vscode.Uri, rootFolder: vscode.Uri): string {
        if (folder.fsPath.startsWith(rootFolder.fsPath)) {
            const relativePath: string = "." + folder.fsPath.substr(rootFolder.fsPath.length);

            return relativePath.replace(/\\/g, "/");
        }

        return null;
    }

    public static replaceAll(str: string, mapObj: Map<string, string>, caseInSensitive: boolean = false): string {
        let modifier = "g";
        if (caseInSensitive) {
            modifier = "ig";
        }

        const keys = Array.from(mapObj.keys());
        const pattern: RegExp = new RegExp(keys.join("|"), modifier);
        return str.replace(pattern, (matched) => {
            return mapObj.get(matched);
        });
    }

    public static expandEnv(input: string, ...exceptKeys: string[]): string {
        const pattern: RegExp = new RegExp(/\$([a-zA-Z0-9_]+)|\${([a-zA-Z0-9_]+)}/g);
        const exceptSet: Set<string> = new Set(exceptKeys);
        return input.replace(pattern, (matched) => {
            if (exceptKeys && exceptSet.has(matched)) {
                return matched;
            }
            const key: string = matched.replace(/\$|{|}/g, "");
            return process.env[key] || matched;
        });
    }

    public static async readJsonAndExpandEnv(filePath: string, ...exceptKeys: string[]): Promise<any> {
        const content: string = await fse.readFile(filePath, "utf8");
        const expandedContent = Utility.expandEnv(content, ...exceptKeys);
        return JSON.parse(expandedContent);
    }

    public static expandModules(input: string, moduleMap: Map<string, string>): string {
        return input.replace(Constants.imagePlaceholderPattern, (matched) => {
            const key: string = matched.replace(/\$|{|}/g, "");
            if (moduleMap.has(key)) {
                const value: string = moduleMap.get(key);
                return value;
            } else {
                return matched;
            }
        });
    }

    public static async getSubDirectories(parentPath: string): Promise<string[]> {
        const filesAndDirs = await fse.readdir(parentPath);
        const directories = [];
        await Promise.all(
            filesAndDirs.map(async (name) => {
                const subPath = path.join(parentPath, name);
                const stat: fse.Stats = await fse.stat(subPath);
                if (stat.isDirectory()) {
                    directories.push(subPath);
                }
            }),
        );
        return directories;
    }

    public static getValidModuleName(moduleFolderName: string): string {
        const pattern: RegExp = new RegExp(/( +|-)/g);
        return moduleFolderName.replace(pattern, "_");
    }

    public static getModuleKey(name: string, platform: string): string {
        return `MODULES.${name}.${platform}`;
    }

    public static getImage(repo: string, version: string, platform: string): string {
        return `${repo}:${version}-${platform}`;
    }

    public static async showInputBox(plcHolder: string,
                                     prmpt: string,
                                     validate?: (s: string) => Promise<string> | undefined | null,
                                     defaultValue?: string,
                                     ignFocusOut: boolean = true): Promise<string> {
        const options: vscode.InputBoxOptions = {
            placeHolder: plcHolder,
            prompt: prmpt,
            validateInput: validate,
            ignoreFocusOut: ignFocusOut,
            value: defaultValue,
        };

        const result: string | undefined = await vscode.window.showInputBox(options);
        if (!result) {
            throw new UserCancelledError();
        } else {
            return result;
        }
    }

    public static async setSlnModulesMap(slnPath: string,
                                         moduleToImageMap: Map<string, string>,
                                         imageToDockerfileMap: Map<string, string>,
                                         imageToBuildOptions?: Map<string, string[]>): Promise<void> {
        const modulesPath: string = path.join(slnPath, Constants.moduleFolder);
        const stat: fse.Stats = await fse.lstat(modulesPath);
        if (!stat.isDirectory()) {
            throw new Error("no modules folder");
        }

        const moduleDirs: string[] = await Utility.getSubDirectories(modulesPath);
        await Promise.all(
            moduleDirs.map(async (module) => {
                await this.setModuleMap(module, moduleToImageMap, imageToDockerfileMap, imageToBuildOptions);
            }),
        );
    }

    public static async setModuleMap(modulePath: string,
                                     moduleToImageMap: Map<string, string>,
                                     imageToDockerfileMap: Map<string, string>,
                                     imageToBuildOptions?: Map<string, string[]>): Promise<void> {
        const moduleFile = path.join(modulePath, Constants.moduleManifest);
        const name: string = path.basename(modulePath);
        if (await fse.pathExists(moduleFile)) {
            const module = await Utility.readJsonAndExpandEnv(moduleFile);
            const platformKeys: string[] = Object.keys(module.image.tag.platforms);
            const repo: string = module.image.repository;
            const version: string = module.image.tag.version;
            platformKeys.map((platform) => {
                const moduleKey: string = Utility.getModuleKey(name, platform);
                const image: string = Utility.getImage(repo, version, platform);
                moduleToImageMap.set(moduleKey, image);
                imageToDockerfileMap.set(image, path.join(modulePath, module.image.tag.platforms[platform]));
                if (imageToBuildOptions !== undefined) {
                    const options = module.image.buildOptions;
                    if (options !== undefined && options instanceof Array) {
                        imageToBuildOptions.set(image, options);
                    }
                }
            });
        }
    }

    // Remove the wrapping "${" and "}" of a image placeholder
    public static unwrapImagePlaceholder(imagePlaceholder: string): string {
        if (imagePlaceholder.search(Constants.imagePlaceholderPattern) === 0 && imagePlaceholder.endsWith("}")) {
            return imagePlaceholder.slice(2, -1);
        }

        return undefined;
    }
}
