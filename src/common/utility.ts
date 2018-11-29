// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as dotenv from "dotenv";
import * as fse from "fs-extra";
import * as isPortReachable from "is-port-reachable";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { AzureAccount, AzureSession } from "../typings/azure-account.api";
import { IDeviceItem } from "../typings/IDeviceItem";
import { BuildSettings } from "./buildSettings";
import { Constants, ContainerState } from "./constants";
import { Executor } from "./executor";
import { Platform } from "./platform";
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

    public static adjustTerminalCommand(command: string): string {
        return (os.platform() === "linux" || os.platform() === "darwin") ? `sudo ${command}` : command;
    }

    public static getConfigurationProperty(id: string): any {
        return Utility.getConfiguration().get(id);
    }

    public static async setGlobalConfigurationProperty(id: string, value: any): Promise<void> {
        await Utility.getConfiguration().update(id, value, true);
    }

    public static async setWorkspaceConfigurationProperty(id: string, value: any): Promise<void> {
        await Utility.getConfiguration().update(id, value, false);
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

    public static async getInputFilePath(inputFileFromContextMenu: vscode.Uri, filePattern: string, fileDescription: string, eventName: string, excludeFilePattern?: string | null): Promise<string> {
        if (!Utility.checkWorkspace()) {
            return null;
        }

        if (inputFileFromContextMenu) {
            TelemetryClient.sendEvent(eventName, { entry: "contextMenu" });
            return inputFileFromContextMenu.fsPath;
        } else {
            TelemetryClient.sendEvent(eventName, { entry: "commandPalette" });
            const fileList: vscode.Uri[] = await vscode.workspace.findFiles(filePattern, excludeFilePattern);
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

    public static async copyTemplateFile(srcPath: string, fileName: string, targetPath: string, mapObj: Map<string, string>) {
        const srcFile: string = path.join(srcPath, fileName);
        const srcFileContent: string = await fse.readFile(srcFile, "utf8");
        const fileContentGenerated: string = Utility.replaceAll(srcFileContent, mapObj);
        const jsonFormat = JSON.parse(fileContentGenerated);
        const targetFile: string = path.join(targetPath, fileName);
        await fse.writeFile(targetFile, JSON.stringify(jsonFormat, null, 2), { encoding: "utf8" });
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

    public static getModuleKeyNoPlatform(name: string, isDebug: boolean): string {
        return isDebug ? `MODULES.${name}.debug` : `MODULES.${name}`;
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
                                         imageToBuildSettings?: Map<string, BuildSettings>): Promise<void> {
        const modulesPath: string = path.join(slnPath, Constants.moduleFolder);
        const stat: fse.Stats = await fse.lstat(modulesPath);
        if (!stat.isDirectory()) {
            throw new Error("no modules folder");
        }

        const moduleDirs: string[] = await Utility.getSubDirectories(modulesPath);
        await Promise.all(
            moduleDirs.map(async (module) => {
                await this.setModuleMap(module, moduleToImageMap, imageToBuildSettings);
            }),
        );
    }

    public static getBuildSettings(
        modulePath: string,
        dockerFilePath: string,
        buildOptions?: string[],
        contextPath?: string): BuildSettings {
        const optionArray = (buildOptions && buildOptions instanceof Array) ? buildOptions : undefined;
        const context = contextPath ? path.resolve(modulePath, contextPath) : path.dirname(dockerFilePath);
        return new BuildSettings(dockerFilePath, context, optionArray);
    }

    public static async setModuleMap(modulePath: string,
                                     moduleToImageMap: Map<string, string>,
                                     imageToBuildSettings?: Map<string, BuildSettings>): Promise<void> {
        const moduleFile = path.join(modulePath, Constants.moduleManifest);
        const name: string = path.basename(modulePath);
        if (await fse.pathExists(moduleFile)) {
            const module = await Utility.readJsonAndExpandEnv(moduleFile, Constants.moduleSchemaVersion);
            const platformKeys: string[] = Object.keys(module.image.tag.platforms);
            const repo: string = module.image.repository;
            const version: string = module.image.tag.version;
            platformKeys.map((platform) => {
                const moduleKey: string = Utility.getModuleKey(name, platform);
                const image: string = Utility.getImage(repo, version, platform);
                moduleToImageMap.set(moduleKey, image);
                if (imageToBuildSettings !== undefined) {
                    const dockerFilePath = path.resolve(modulePath, module.image.tag.platforms[platform]);
                    imageToBuildSettings.set(
                        image,
                        Utility.getBuildSettings(modulePath,
                            dockerFilePath, module.image.buildOptions, module.image.contextPath));
                }

                const defaultPlatform: Platform = Platform.getDefaultPlatform();
                if (platform === defaultPlatform.platform) {
                    moduleToImageMap.set(Utility.getModuleKeyNoPlatform(name, false), image);
                } else if (platform === `${defaultPlatform.platform}.debug`) {
                    moduleToImageMap.set(Utility.getModuleKeyNoPlatform(name, true), image);
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

    public static async loadEnv(envFilePath: string) {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(envFilePath));
            if (!workspaceFolder) {
                return;
            }
            const directory = path.dirname(envFilePath);
            // Check whether .env file is in the root folder of solution
            if (await fse.pathExists(path.join(directory, Constants.deploymentTemplate)) && await fse.pathExists(envFilePath)) {
                TelemetryClient.sendEvent("envFileDetected");
                const envConfig = dotenv.parse(await fse.readFile(envFilePath));
                for (const k of Object.keys(envConfig)) {
                    process.env[k] = envConfig[k];
                }
            }
        } catch (error) { }
    }

    public static async initLocalRegistry(images: string[]) {
        try {
            let port;
            for (const image of images) {
                const matches = /^localhost:(\d+)\/.+$/.exec(image);
                if (matches) {
                    port = matches[1];
                    break;
                }
            }
            if (port) {
                TelemetryClient.sendEvent("localRegistryDetected");
                if (await isPortReachable(port)) {
                    return;
                }
                switch (Utility.getLocalRegistryState()) {
                    case ContainerState.NotFound:
                        TelemetryClient.sendEvent("createLocalRegistry");
                        Executor.runInTerminal(`docker run -d -p ${port}:5000 --restart always --name registry registry:2`);
                        break;
                    case ContainerState.NotRunning:
                        TelemetryClient.sendEvent("startLocalRegistry");
                        Executor.runInTerminal(`docker start registry`);
                        break;
                }
            }
        } catch (error) { }
    }

    public static getAddressKey(address: string, keySet: Set<string>): string {
        let key = address;
        let index = address.indexOf(".");
        if (index === -1) {
            index = address.indexOf(":");
        }
        if (index !== -1) {
            key = address.substring(0, index);
        }

        let suffix = 1;
        const keyPrefix: string = key;
        while (keySet.has(key)) {
            key = `${keyPrefix}_${suffix}`;
            suffix += 1;
        }

        return key;
    }

    public static getRegistryAddress(repositoryName: string) {
        const defaultHostname = "docker.io";
        const legacyDefaultHostname = "index.docker.io";
        const index = repositoryName.indexOf("/");

        let name: string;
        let hostname: string;
        if (index !== -1) {
            name = (repositoryName.substring(0, index)).toLocaleLowerCase();
        }
        if (name === undefined
            || (name !== "localhost" && (!(name.includes(".") || name.includes(":"))))
        ) {
            hostname = defaultHostname;
        } else {
            hostname = name;
        }

        if (hostname === legacyDefaultHostname) {
            hostname = defaultHostname;
        }

        return hostname;
    }

    public static getRepositoryNameFromImageName(imageName: string): string {
        const index = imageName.lastIndexOf(":");
        if (index === -1) {
            return imageName;
        } else {
            return imageName.substring(0, index);
        }
    }

    public static async getInputDevice(deviceItem: IDeviceItem, outputChannel: vscode.OutputChannel, onlyEdgeDevice: boolean = true): Promise<IDeviceItem> {
        if (deviceItem !== undefined) {
            return deviceItem;
        }

        const toolkit = vscode.extensions.getExtension("vsciot-vscode.azure-iot-toolkit");
        if (toolkit === undefined) {
            throw new Error("Error loading Azure IoT Toolkit extension");
        }

        // TODO: only get Edge devices when Toolkit API supports this parameter
        deviceItem = await toolkit.exports.azureIoTExplorer.getDevice(undefined, undefined, outputChannel);
        return deviceItem;
    }

    public static async waitForAzLogin(azureAccount: AzureAccount): Promise<void> {
        if (!(await azureAccount.waitForLogin())) {
            await vscode.commands.executeCommand("azure-account.askForLogin");
            // If the promise returned the by above command execution is fulfilled and the user is still not logged in, it means the user cancels.
            if (!(await azureAccount.waitForLogin())) {
                throw new UserCancelledError();
            }
        }
    }

    public static async acquireAadToken(session: AzureSession): Promise<{ aadAccessToken: string, aadRefreshToken: string }> {
        return new Promise<{ aadAccessToken: string, aadRefreshToken: string }>((resolve, reject) => {
            const credentials: any = session.credentials;
            const environment: any = session.environment;
            credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, (err: any, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        aadAccessToken: result.accessToken,
                        aadRefreshToken: result.refreshToken,
                    });
                }
            });
        });
    }

    public static getResourceGroupFromId(id: string): string | undefined {
        if (id === undefined || id === "") {
            return undefined;
        }

        const res: string[] = id.match(/\/resourceGroups\/([^\/]+)(\/)?/i);
        if (res.length < 2) {
            return undefined;
        } else {
            return res[1];
        }
    }

    public static convertCreateOptions(deployment: any): any {
        if (deployment) {
            const moduleProperties = deployment.modulesContent.$edgeAgent["properties.desired"];
            const systemModules = moduleProperties.systemModules;
            if (systemModules) {
                moduleProperties.systemModules = Utility.serializeCreateOptionsForEachModule(systemModules);
            }
            const modules = moduleProperties.modules;
            if (modules) {
                moduleProperties.modules = Utility.serializeCreateOptionsForEachModule(modules);
            }
        }

        return deployment;
    }

    // Temp utility to solve the compatible issue because of the schema change in IoT Hub Service.
    // moduleContent -> modulesContent
    public static updateSchema(deployment: any): any {
        if (deployment && deployment.moduleContent) {
            deployment.modulesContent = deployment.moduleContent;
            delete deployment.moduleContent;
        }
        return deployment;
    }

    public static serializeCreateOptions(settings: any, createOptions: any): any {
        let optionStr: string;
        if (typeof createOptions === "string") {
            optionStr = createOptions;
        } else {
            optionStr = JSON.stringify(createOptions);
        }
        const re = new RegExp(`(.|[\r\n]){1,${Constants.TwinValueMaxSize}}`, "g");
        const options = optionStr.match(re);
        if (options.length > Constants.TwinValueMaxChunks) {
            throw new Error(`Size of createOptions of ${settings.image} is too big. The maximum size of createOptions is 4K`);
        }
        options.map((value, index) => {
            if (index === 0) {
                settings.createOptions = value;
            } else {
                const formattedNumber = (`0${index}`).slice(-2);
                settings[`createOptions${formattedNumber}`] = value;
            }
        });

        return settings;
    }

    // The Azure API of listing resources is paginated. This method will follow the links and return all resources
    public static async listAzureResources<T>(first: Promise<IAzureResourceListResult<T>>,
                                              listNext: (nextPageLink: string, options?: { customHeaders?: { [headerName: string]: string; } }) => Promise<IAzureResourceListResult<T>>): Promise<T[]> {
        const all: T[] = [];
        for (let list = await first; list !== undefined; list = list.nextLink ? await listNext(list.nextLink) : undefined) {
            all.push(...list);
        }

        return all;
    }

    public static async awaitPromiseArray<T extends vscode.QuickPickItem>(promises: Array<Promise<T[]>>, description: string): Promise<T[]> {
        const items: T[] = ([] as T[]).concat(...(await Promise.all(promises)));
        items.sort((a, b) => a.label.localeCompare(b.label));

        if (items.length === 0) {
            throw new Error(`No ${description} can be found in all selected subscriptions.`);
        }

        return items;
    }

    private static serializeCreateOptionsForEachModule(modules: any): any {
        for (const key in modules) {
            if (modules.hasOwnProperty(key)) {
                const moduleVar = modules[key];
                if (moduleVar.settings && moduleVar.settings.createOptions) {
                    moduleVar.settings = Utility.serializeCreateOptions(moduleVar.settings, moduleVar.settings.createOptions);
                }
            }
        }
        return modules;
    }

    private static getLocalRegistryState(): ContainerState {
        try {
            const isRunning = Executor.execSync("docker inspect registry --format='{{.State.Running}}'");
            return isRunning.includes("true") ? ContainerState.Running : ContainerState.NotRunning;
        } catch (error) {
            return ContainerState.NotFound;
        }
    }
}

interface IAzureResourceListResult<T> extends Array<T> {
    nextLink?: string;
}
