// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { TokenCredentials } from "@azure/ms-rest-js";
import * as dotenv from "dotenv";
import * as fse from "fs-extra";
import * as isPortReachable from "is-port-reachable";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { AzureAccount, AzureSession } from "../typings/azure-account.api";
import { IDeviceItem } from "../typings/IDeviceItem";
import { BuildSettings } from "./buildSettings";
import { Configuration } from "./configuration";
import { Constants, ContainerState, DockerState } from "./constants";
import { Executor } from "./executor";
import { Platform } from "./platform";
import { TelemetryClient } from "./telemetryClient";
import { UserCancelledError } from "./UserCancelledError";

export class Utility {
    public static checkWorkspace(message: string = Constants.noWorkspaceMsg): boolean {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage(message);
            return false;
        }

        return true;
    }

    public static adjustFilePath(filePath: string): string {
        if (os.platform() === "win32") {
            const windowsShell = Utility.getWindowsShell();
            const terminalRoot = Configuration.getConfiguration().get<string>("terminalRoot");
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

    public static isUsingPowershell(): boolean {
        let isPowerShell: boolean = false;
        if (os.platform() === "win32") {
            const windowsShell = Utility.getWindowsShell();
            if (windowsShell && windowsShell.toLowerCase().indexOf("powershell") > -1) {
                isPowerShell = true;
            }
        }
        return isPowerShell;
    }

    public static combineCommands(commands: string[]): string {
        const isPowerShell: boolean = this.isUsingPowershell();
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

    public static expandEnv(input: string, overrideKVs: {[name: string]: string} = {}, ...exceptKeys: string[]): string {
        const pattern: RegExp = new RegExp(/\$(\w+)|\${(\w+)}/g);
        const exceptSet: Set<string> = new Set(exceptKeys);
        if (!overrideKVs) {
            overrideKVs = {};
        }
        return input.replace(pattern, (matched) => {
            if (exceptKeys && exceptSet.has(matched)) {
                return matched;
            }
            const key: string = matched.replace(/\$|{|}/g, "");
            return overrideKVs[key] || process.env[key] || matched;
        });
    }

    public static async readJsonAndExpandEnv(filePath: string, overrideKVs: {[name: string]: string} = {}, ...exceptKeys: string[]): Promise<any> {
        const content: string = await fse.readFile(filePath, "utf8");
        const expandedContent = Utility.expandEnv(content, overrideKVs, ...exceptKeys);
        return JSON.parse(expandedContent);
    }

    public static expandModules(inputJSON: any, moduleMap: Map<string, string>): string {
        const input = JSON.stringify(inputJSON, null, 2);
        return Utility.expandPlacesHolders(Constants.imagePlaceholderPattern, input, moduleMap);
    }

    public static expandVersions(input: string, versionMap: Map<string, string>): string {
        return Utility.expandPlacesHolders(Constants.versionPlaceholderPattern, input, versionMap);
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

    public static getDefaultModuleKey(keyPrefix: string, isDebug: boolean) {
        return isDebug ? `${keyPrefix}.debug` : keyPrefix;
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

    public static async setSlnModulesMap(templateFilePath: string,
                                         moduleToImageMap: Map<string, string>,
                                         imageToBuildSettings?: Map<string, BuildSettings>): Promise<void> {
        const slnPath: string = path.dirname(templateFilePath);
        const moduleDirs: string[] = await Utility.getSubModules(slnPath);
        await Promise.all(
            moduleDirs.map(async (modulePath) => {
                const keyPrefix = Constants.subModuleKeyPrefixTemplate(path.basename(modulePath));
                await Utility.setModuleMap(modulePath, keyPrefix, moduleToImageMap, imageToBuildSettings);
            }),
        );
        const externalModuleDirs: string[] = await Utility.getExternalModules(templateFilePath);
        await Promise.all(
            externalModuleDirs.map(async (module) => {
                if (module) {
                    const moduleFullPath = path.resolve(slnPath, module);
                    const keyPrefix = Constants.extModuleKeyPrefixTemplate(module);
                    await Utility.setModuleMap(moduleFullPath, keyPrefix, moduleToImageMap, imageToBuildSettings);
                }
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

    public static async setModuleMap(moduleFullPath: string,
                                     moduleKeyPrefix: string,
                                     moduleToImageMap: Map<string, string>,
                                     imageToBuildSettings?: Map<string, BuildSettings>): Promise<void> {
        const moduleFile = path.join(moduleFullPath, Constants.moduleManifest);
        if (await fse.pathExists(moduleFile)) {
            const overrideEnvs = await Utility.parseEnv(path.join(moduleFullPath, Constants.envFile));
            const module = await Utility.readJsonAndExpandEnv(moduleFile, overrideEnvs, Constants.moduleSchemaVersion);
            const platformKeys: string[] = Object.keys(module.image.tag.platforms);
            const repo: string = module.image.repository;
            const version: string = module.image.tag.version;
            platformKeys.map((platform) => {
                const image: string = Utility.getImage(repo, version, platform);
                const imageKeys: string[] = Utility.getModuleKeyFromPlatform(moduleKeyPrefix, platform);
                imageKeys.map((key) => {
                    moduleToImageMap.set(key, image);
                });
                if (imageToBuildSettings !== undefined) {
                    const dockerFilePath = path.resolve(moduleFullPath, module.image.tag.platforms[platform]);
                    imageToBuildSettings.set(
                        image,
                        Utility.getBuildSettings(moduleFullPath,
                            dockerFilePath, module.image.buildOptions, module.image.contextPath));
                }
            });
        }
    }

    // Escape JSON string and remove the wrapping "${" and "}" of a image placeholder
    public static unwrapImagePlaceholder(imagePlaceholder: string): string {
        imagePlaceholder = JSON.stringify(imagePlaceholder).slice(1, -1);
        if (imagePlaceholder.search(Constants.imagePlaceholderPattern) === 0 && imagePlaceholder.endsWith("}")) {
            return imagePlaceholder.slice(2, -1);
        }

        return undefined;
    }

    public static async loadEnv(envFilePath: string) {
        const envConfig = await Utility.parseEnv(envFilePath);
        for (const k of Object.keys(envConfig)) {
            process.env[k] = envConfig[k];
        }
    }

    public static async parseEnv(envFilePath: string): Promise<{[name: string]: string}> {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(envFilePath));
            if (!workspaceFolder || !(await fse.pathExists(envFilePath))) {
                return {};
            }

            TelemetryClient.sendEvent("envFileDetected");
            const envConfig = dotenv.parse(await fse.readFile(envFilePath));
            return envConfig;
        } catch (error) {
            return {};
        }
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

        const toolkit = Utility.getToolkit();

        // TODO: only get Edge devices when Toolkit API supports this parameter
        deviceItem = await toolkit.exports.azureIoTExplorer.getDevice(undefined, undefined, outputChannel);
        return deviceItem;
    }

    public static getToolkit(): vscode.Extension<any> {
        const toolkit = vscode.extensions.getExtension("vsciot-vscode.azure-iot-toolkit");
        if (toolkit === undefined) {
            throw new Error("Error loading Azure IoT Toolkit extension");
        }
        return toolkit;
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

    public static async aquireTokenCredentials(session: AzureSession): Promise<TokenCredentials> {
        return new TokenCredentials((await Utility.acquireAadToken(session)).aadAccessToken, "Bearer");
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

    public static getVscodeSettingKey(name: string) {
        return `${Constants.ExtensionId.substring(Constants.ExtensionId.indexOf(".") + 1)}.${name}`;
    }

    public static async getUserSettingJsonFromSolutionPath(solutionPath: string) {
        await fse.mkdirp(path.join(solutionPath, Constants.vscodeFolder));
        const vscodeSettingPath = Utility.getVscodeSolutionSettingPath(solutionPath);
        let vscodeSettingJson = {};
        const vscodeSettingExists = await fse.pathExists(vscodeSettingPath);
        if (!vscodeSettingExists) {
            return undefined;
        }
        vscodeSettingJson = await fse.readJson(vscodeSettingPath);
        return vscodeSettingJson;
    }

    public static getVscodeSolutionSettingPath(solutionPath: string) {
        return path.join(solutionPath, Constants.vscodeFolder, Constants.vscodeSettingsFile);
    }

    public static async validateRepositoryUrl(repositoryUrl: string): Promise<string | undefined> {
        if (!repositoryUrl) {
            return "Repository url could not be empty";
        }

        const match: RegExpMatchArray = repositoryUrl.match(/^(?:([^\/]+)\/)?([^:]+)(?::(.+))?$/);
        if (!match) {
            return "Repository url is not valid";
        }

        let hostName: string = match[1];
        let repositoryName: string = match[2];
        const tag: string = match[3];

        // if host name do not contain ":.", then it would be treated as repository name
        if (hostName && !/[:.]/.test(hostName)) {
            repositoryName = hostName  + "/" + repositoryName;
            hostName = null;
        }

        if (hostName) {
            const hostNameWithoutEnv = hostName.replace(/\$\w+|\${\w+}/g, "");
            if (/[^\w.-:]/.test(hostNameWithoutEnv)) {
                return "Repository host name can only contain alphanumeric characters or .-:, and ${} are also supported for environment variables";
            }
        }

        const repositoryNameWithoutEnv = repositoryName.replace(/\$\w+|\${\w+}/g, "");
        if (/[^a-z0-9._\-\/]+/.test(repositoryNameWithoutEnv)) {
            return "Repository name can only contain lowercase letters, digits or ._-/, and ${} are also supported for environment variables";
        }

        if (tag) {
            const tagWithoutEnv = tag.replace(/\$\w+|\${\w+}/g, "");
            if (tagWithoutEnv.length > 128) {
                return "The maximum length of tag is 128";
            }

            if (/[^\w.-]+/.test(tagWithoutEnv)) {
                return "Tag can only contain alphanumeric characters or ._-, and ${} are also supported for environment variables";
            }
        }

        return undefined;
    }

    public static async validateInputName(name: string, parentPath?: string): Promise<string | undefined> {
        if (!name) {
            return "The name could not be empty";
        }
        if (name.startsWith("_") || name.endsWith("_")) {
            return "The name must not start or end with the symbol _";
        }
        if (name.match(/[^a-zA-Z0-9\_]/)) {
            return "The name must contain only alphanumeric characters or the symbol _";
        }
        if (parentPath) {
            const folderPath = path.join(parentPath, name);
            if (await fse.pathExists(folderPath)) {
                return `${name} already exists under ${parentPath}`;
            }
        }
        return undefined;
    }

    public static validateModuleExistence(name: string, modules?: string[]): string | undefined {
        if (modules && modules.indexOf(name) >= 0) {
            return `${name} already exists in ${Constants.deploymentTemplate}`;
        }
        return undefined;
    }

    public static async getSolutionParentFolder(): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const defaultFolder: vscode.Uri | undefined = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri : undefined;
        const selectedUri: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
            defaultUri: defaultFolder,
            openLabel: Constants.parentFolderLabel,
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
        });

        if (!selectedUri || selectedUri.length === 0) {
            return undefined;
        }

        return selectedUri[0].fsPath;
    }

    public static async inputSolutionName(parentPath: string, defaultName: string): Promise<string> {
        const validateFunc = async (name: string): Promise<string> => {
            return await Utility.validateSolutionName(name, parentPath);
        };
        return await Utility.showInputBox(Constants.solutionName,
            Constants.solutionNamePrompt,
            validateFunc, defaultName);
    }

    public static async inputModuleName(parentPath?: string, modules?: string[]): Promise<string> {
        const validateFunc = async (name: string): Promise<string> => {
            return await Utility.validateInputName(name, parentPath) || Utility.validateModuleExistence(name, modules);
        };
        return await Utility.showInputBox(Constants.moduleName,
            Constants.moduleNamePrompt,
            validateFunc, Constants.moduleNameDft);
    }

    public static async checkDockerState(outputChannel: vscode.OutputChannel) {
        let state: DockerState;
        let errorMsg: any;
        try {
            await Executor.executeCMD(outputChannel, "docker", { shell: true }, "version");
            state = DockerState.Running;
        } catch (error) {
            errorMsg = error;
            const platform: string = os.platform();
            if (platform === "win32") {
                if (error.message.indexOf(Constants.commandNotFoundErrorMsgPatternOnWindows) > -1) {
                    state = DockerState.NotInstalled;
                } else if (error.message.indexOf(Constants.dockerNotRunningErrorMsgPatternOnWindows) > -1) {
                    state = DockerState.NotRunning;
                } else {
                    state = DockerState.Unknown;
                }
            } else if (platform === "linux" || platform === "darwin") {
                if (error.errorCode === 127 || error.message.indexOf(Constants.commandNotFoundErrorMsgPatternOnLinux) > -1 || error.message.match(/Command '.*?' not found/)) {
                    state = DockerState.NotInstalled;
                } else if (error.message.indexOf(Constants.dockerNotRunningErrorMsgPatternOnLinux) > -1) {
                    state = DockerState.NotRunning;
                } else if (Constants.permissionDeniedErrorMsgPatternOnLinux) {
                    state = DockerState.PermissionDenied;
                } else {
                    state = DockerState.Unknown;
                }
            } else {
                state = DockerState.Unknown;
            }
        }

        if (errorMsg) {
            const install: vscode.MessageItem = { title: Constants.InstallDocker };
            const troubleshooting: vscode.MessageItem = { title: Constants.TroubleShooting };
            const cancel: vscode.MessageItem = { title: Constants.Cancel };
            let input: vscode.MessageItem;
            let helpUrl: string;
            let items: vscode.MessageItem[];
            switch (state) {
                case DockerState.NotInstalled:
                    items = [install, cancel];
                    input = await vscode.window.showWarningMessage(Constants.dockerNotInstalledErrorMsg, ...items);
                    if (input === install) {
                        helpUrl = Constants.installDockerUrl;
                    }
                    break;
                case DockerState.NotRunning:
                case DockerState.Unknown:
                    items = [troubleshooting, cancel];
                    input = await vscode.window.showWarningMessage(Constants.dockerNotRunningErrorMsg, ...items);
                    if (input === troubleshooting) {
                        helpUrl = Constants.troubleShootingDockerUrl;
                    }
                    break;
            }

            if (input === troubleshooting || input === install) {
                await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(helpUrl));
            }
        }
    }

    /*
    The following code is based on VS Code from https://github.com/microsoft/vscode/blob/5c65d9bfa4c56538150d7f3066318e0db2c6151f/src/vs/workbench/contrib/terminal/node/terminal.ts#L12-L55
    This is only a fall back to identify the default shell used by VSC.
    On Windows, determine the default shell.
    */
   private static _TERMINAL_DEFAULT_SHELL_WINDOWS: string | null = null;
   private static getDefaultWindowsShell(): string {
        if (!Utility._TERMINAL_DEFAULT_SHELL_WINDOWS) {
           const isAtLeastWindows10 = os.platform() === "win32" && parseFloat(os.release()) >= 10;
           const is32ProcessOn64Windows = process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432");
           const powerShellPath = `${process.env.windir}\\${is32ProcessOn64Windows ? "Sysnative" : "System32"}\\WindowsPowerShell\\v1.0\\powershell.exe`;
           Utility._TERMINAL_DEFAULT_SHELL_WINDOWS = isAtLeastWindows10 ? powerShellPath : Utility.getDefaultOldVerWindowsShell();
        }
        return Utility._TERMINAL_DEFAULT_SHELL_WINDOWS;
    }

    private static getDefaultOldVerWindowsShell(): string {
        return process.env.comspec || "cmd.exe";
    }

    private static getWindowsShell(): string {
        let windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
        if (!windowsShell) {
            windowsShell = Utility.getDefaultWindowsShell();
        }
        return windowsShell;
    }

    private static async getSubModules(slnPath: string): Promise<string[]> {
        const modulesPath: string = path.join(slnPath, Constants.moduleFolder);
        if (!await fse.pathExists(modulesPath)) {
            return [];
        }
        const stat: fse.Stats = await fse.lstat(modulesPath);
        if (!stat.isDirectory()) {
            return [];
        }
        return await Utility.getSubDirectories(modulesPath);
    }

    private static async getExternalModules(templateFilePath: string): Promise<string[]> {
        const modules = [];
        if (!templateFilePath || !await fse.pathExists(templateFilePath)) {
            return modules;
        }

        const input: string = JSON.stringify(await fse.readJson(templateFilePath), null, 2);
        const externalModules: string[] = input.match(Constants.externalModulePlaceholderPattern);

        if (externalModules) {
            externalModules.map((placeholder) => {
                if (placeholder) {
                    const start = "${MODULEDIR<".length;
                    const end = placeholder.lastIndexOf(">");
                    placeholder.substring(start, end);
                    modules.push(placeholder.substring(start, end).trim());
                }
            });
        }
        return modules;
    }

    private static getModuleKeyFromPlatform(keyPrefix: string, platform: string): string[] {
        const keys: string[] = [`${keyPrefix}.${platform}`];
        const defaultPlatform: Platform = Platform.getDefaultPlatform();
        if (platform !== defaultPlatform.platform && platform !== `${defaultPlatform.platform}.debug`) {
            return keys;
        }

        const isDebug: boolean = (platform === `${defaultPlatform.platform}.debug`);
        keys.push(isDebug ? `${keyPrefix}.debug` : keyPrefix);
        return keys;
    }

    private static async validateSolutionName(name: string, parentPath?: string): Promise<string | undefined> {
        if (!name || name.trim() === "") {
            return "The name could not be empty";
        }
        if (name.match(/[/\\:*?\"<>|]/)) {
            return "Solution name can't contain characters: /\:*?<>|";
        }
        if (parentPath) {
            const folderPath = path.join(parentPath, name);
            if (await fse.pathExists(folderPath)) {
                return `${name} already exists under ${parentPath}`;
            }
        }
        return undefined;
    }

    private static expandPlacesHolders(pattern: RegExp, input: string, valMap: Map<string, string>): string {
        return input.replace(pattern, (matched) => {
            const key: string = matched.replace(/\$|{|}/g, "");
            if (valMap.has(key)) {
                const value: string = valMap.get(key);
                return value;
            } else {
                return matched;
            }
        });
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
