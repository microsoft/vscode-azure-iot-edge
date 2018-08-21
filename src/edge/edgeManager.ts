// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

import * as dotenv from "dotenv";
import * as download from "download-git-repo";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as stripJsonComments from "strip-json-comments";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { AcrManager } from "../container/acrManager";
import { StreamAnalyticsManager } from "../container/streamAnalyticsManager";
import { IDeviceItem } from "../typings/IDeviceItem";

export class EdgeManager {

    constructor(private context: vscode.ExtensionContext) {
    }

    public async createEdgeSolution(outputChannel: vscode.OutputChannel,
                                    parentUri?: vscode.Uri): Promise<void> {
        // get the target path
        const parentPath: string = parentUri ? parentUri.fsPath : await this.getSolutionParentFolder();
        if (parentPath === undefined) {
            throw new UserCancelledError();
        }

        await fse.ensureDir(parentPath);
        const slnName: string = await this.inputSolutionName(parentPath);
        const slnPath: string = path.join(parentPath, slnName);
        const sourceSolutionPath = this.context.asAbsolutePath(path.join(Constants.assetsFolder, Constants.solutionFolder));
        const sourceGitIgnore = path.join(sourceSolutionPath, Constants.gitIgnore);
        const targetModulePath = path.join(slnPath, Constants.moduleFolder);
        const targetGitIgnore = path.join(slnPath, Constants.gitIgnore);

        await fse.mkdirs(slnPath);
        await fse.copy(sourceGitIgnore, targetGitIgnore);
        await fse.mkdirs(targetModulePath);
        const templateFile = path.join(slnPath, Constants.deploymentTemplate);
        await fse.copy(path.join(sourceSolutionPath, Constants.deploymentTemplate), templateFile);

        await this.addModule(templateFile, outputChannel, true);
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(slnPath), false);
    }

    public async addModuleForSolution(outputChannel: vscode.OutputChannel, templateUri?: vscode.Uri): Promise<void> {
        let templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.addModuleEvent}.selectTemplate`);
        if (!templateFile) {
            return;
        }

        if (path.basename(templateFile) === Constants.moduleFolder) {
            templateFile = path.join(path.dirname(templateFile), Constants.deploymentTemplate);
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(templateFile));
            if (!workspaceFolder || !await fse.exists(templateFile)) {
                vscode.window.showInformationMessage(Constants.noSolutionFileWithModulesFolder);
                return;
            }
        }

        await this.addModule(templateFile, outputChannel, false);
    }

    public async checkRegistryEnv(folder: vscode.WorkspaceFolder): Promise<void> {
        if (!folder) {
            return;
        }

        try {
            const folderPath = folder.uri.fsPath;
            if (folder) {
                const deploymentTemplate = path.join(folderPath, Constants.deploymentTemplate);
                const envFile = path.join(folderPath, Constants.envFile);
                if (await fse.exists(deploymentTemplate)) {
                    const templateJson = Utility.updateSchema(await fse.readJson(deploymentTemplate));
                    const runtimeSettings = templateJson.modulesContent.$edgeAgent["properties.desired"].runtime.settings;
                    const registries = runtimeSettings.registryCredentials;
                    if (registries) {
                        await Utility.loadEnv(envFile);
                        const expanded = Utility.expandEnv(JSON.stringify(registries, null, 2));
                        const pattern: RegExp = new RegExp(/\$([a-zA-Z0-9_]+)|\${([a-zA-Z0-9_]+)}/g);
                        const matchArr = expanded.match(pattern);
                        if (matchArr && matchArr.length > 0) {
                            await this.askEditEnv(envFile);
                        }
                    }
                }
            }
        } catch (err) { }
    }

    public async startEdgeHubSingleModule(outputChannel: vscode.OutputChannel): Promise<void> {
        const inputs = await this.inputInputNames();
        await this.setModuleCred(outputChannel);
        await Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgehubdev start -i "${inputs}"`));
    }

    public async setModuleCred(outputChannel: vscode.OutputChannel): Promise<void> {
        let storagePath = this.context.storagePath;
        if (!storagePath) {
            storagePath = path.resolve(os.tmpdir(), "vscodeedge");
        }
        await fse.ensureDir(storagePath);
        const outputFile = path.join(storagePath, "module.env");
        await Executor.executeCMD(outputChannel, "iotedgehubdev", { shell: true }, `modulecred -l -o "${outputFile}"`);

        const moduleConfig = dotenv.parse(await fse.readFile(outputFile));
        await Utility.setGlobalConfigurationProperty("EdgeHubConnectionString", moduleConfig.EdgeHubConnectionString);
        await Utility.setGlobalConfigurationProperty("EdgeModuleCACertificateFile", moduleConfig.EdgeModuleCACertificateFile);
    }

    // TODO: The command is temperory for migration stage, will be removed later.
    public async convertModule(fileUri?: vscode.Uri): Promise<void> {
        const filePath = fileUri ? fileUri.fsPath : undefined;
        if (filePath) {
            const targetPath = path.dirname(filePath);
            const moduleExist = await fse.pathExists(path.join(targetPath, Constants.moduleManifest));
            if (moduleExist) {
                throw new Error("module.json exists already");
            }

            const csharpFolder = "csharp";
            const csharpFunction = "csharpfunction";

            const fileName = path.basename(filePath);
            const extName = path.extname(filePath);
            const isFunction = fileName === "host.json";
            const isCSharp = extName === ".csproj";
            if (isFunction || isCSharp) {
                const moduleName: string = isCSharp ? path.basename(fileName, extName) : Utility.getValidModuleName(path.basename(targetPath));
                const repositoryName: string = await this.inputRepository(moduleName);
                const srcPath: string = this.context.asAbsolutePath(path.join(Constants.assetsFolder, Constants.moduleFolder, isFunction ? csharpFunction : csharpFolder));
                const srcFiles: string[] = await fse.readdir(srcPath);

                const dockerFileMapObj: Map<string, string> = new Map<string, string>();
                dockerFileMapObj.set(Constants.dllPlaceholder, moduleName);
                const moduleJsonMapObj: Map<string, string> = new Map<string, string>();
                moduleJsonMapObj.set(Constants.repositoryPlaceholder, repositoryName);

                const copyPromises: Array<Promise<void>> = [];
                srcFiles.forEach((srcFile) => {
                    if (srcFile === Constants.moduleManifest) {
                        copyPromises.push(Utility.copyTemplateFile(srcPath, srcFile, targetPath, moduleJsonMapObj));
                    } else if (srcFile.startsWith("Dockerfile")) {
                        copyPromises.push(Utility.copyTemplateFile(srcPath, srcFile, targetPath, dockerFileMapObj));
                    }
                });

                await Promise.all(copyPromises);

                vscode.window.showInformationMessage("Converted successfully. module.json and Dockerfiles have been added.");
            } else {
                throw new Error("File type is wrong");
            }
        } else {
            throw new Error("No file is selected");
        }
    }

    public async setupIotedgehubdev(deviceItem: IDeviceItem, outputChannel: vscode.OutputChannel) {
        deviceItem = await Utility.getInputDevice(deviceItem, outputChannel);

        Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgehubdev setup -c "${deviceItem.connectionString}"`));
    }

    private async generateDebugSetting(srcSlnPath: string,
                                       language: string,
                                       moduleName: string,
                                       extraProps: Map<string, string>): Promise<any> {

        const mapObj: Map<string, string> = new Map<string, string>();
        mapObj.set(Constants.moduleNamePlaceholder, moduleName);
        mapObj.set(Constants.moduleFolderPlaceholder, moduleName);
        // copy launch.json
        let launchFile: string;
        let isFunction: boolean = false;
        switch (language) {
            case Constants.LANGUAGE_CSHARP:
                launchFile = Constants.launchCSharp;
                mapObj.set(Constants.appFolder, "/app");
                break;
            case Constants.CSHARP_FUNCTION:
                launchFile = Constants.launchCSharp;
                mapObj.set(Constants.appFolder, "/app");
                isFunction = true;
                break;
            case Constants.LANGUAGE_NODE:
                launchFile = Constants.launchNode;
                break;
            case Constants.LANGUAGE_C:
                launchFile = Constants.launchC;
                mapObj.set(Constants.appFolder, "/app");
                break;
            case Constants.LANGUAGE_JAVA:
                launchFile = Constants.launchJava;
                mapObj.set(Constants.groupIDPlaceholder, extraProps.get(Constants.groupId));
                break;
            case Constants.LANGUAGE_PYTHON:
                launchFile = Constants.launchPython;
                mapObj.set(Constants.appFolder, "/app");
                break;
            default:
                break;
        }

        if (launchFile) {
            const srcLaunchJson = path.join(srcSlnPath, launchFile);
            const debugData: string = await fse.readFile(srcLaunchJson, "utf8");
            const debugConfig = JSON.parse(Utility.replaceAll(debugData, mapObj));
            if (isFunction && debugConfig && debugConfig.configurations) {
                debugConfig.configurations = debugConfig.configurations.filter((config) => config.request !== "launch");
            }
            return debugConfig;
        } else {
            return undefined;
        }
    }

    private async addModule(templateFile: string,
                            outputChannel: vscode.OutputChannel,
                            isNewSolution: boolean): Promise<void> {
        const templateJson = Utility.updateSchema(await fse.readJson(templateFile));
        const slnPath: string = path.dirname(templateFile);
        const sourceSolutionPath = this.context.asAbsolutePath(path.join(Constants.assetsFolder, Constants.solutionFolder));
        const targetModulePath = path.join(slnPath, Constants.moduleFolder);
        const envFilePath = path.join(slnPath, Constants.envFile);

        const template = await this.selectModuleTemplate();
        const extraProps: Map<string, string> = new Map<string, string>();
        if (template === Constants.LANGUAGE_JAVA) {
            const grpId = await this.inputJavaModuleGrpId();
            extraProps.set(Constants.groupId, grpId);
        }

        const modules = templateJson.modulesContent.$edgeAgent["properties.desired"].modules;
        const routes = templateJson.modulesContent.$edgeHub["properties.desired"].routes;
        const runtimeSettings = templateJson.modulesContent.$edgeAgent["properties.desired"].runtime.settings;
        const moduleName: string = Utility.getValidModuleName(await this.inputModuleName(targetModulePath, Object.keys(modules)));
        const { repositoryName, imageName, moduleTwin, createOptions } = await this.inputImage(moduleName, template);

        if (template === Constants.STREAM_ANALYTICS && moduleTwin) {
            templateJson.modulesContent[moduleName] = moduleTwin;
        }

        const address = await Utility.getRegistryAddress(repositoryName);
        let registries = runtimeSettings.registryCredentials;
        if (registries === undefined) {
            registries = {};
            runtimeSettings.registryCredentials = registries;
        }

        let result = {registries: {}, usernameEnv: undefined, passwordEnv: undefined};
        if (template !== Constants.STREAM_ANALYTICS) {
            result = await this.updateRegistrySettings(address, registries, envFilePath);
        }

        await this.addModuleProj(targetModulePath, moduleName, repositoryName, template, outputChannel, extraProps);

        const newModuleSection = `{
            "version": "1.0",
            "type": "docker",
            "status": "running",
            "restartPolicy": "always",
            "settings": {
              "image": "${imageName}",
              "createOptions": "${createOptions.replace(/"/g, '\\"')}"
            }
          }`;
        modules[moduleName] = JSON.parse(newModuleSection);
        const newModuleToUpstream = `${moduleName}ToIoTHub`;
        routes[newModuleToUpstream] = `FROM /messages/modules/${moduleName}/outputs/* INTO $upstream`;
        if (isNewSolution) {
            const tempSensorToModule = `sensorTo${moduleName}`;
            routes[tempSensorToModule] =
                `FROM /messages/modules/tempSensor/outputs/temperatureOutput INTO BrokeredEndpoint(\"/modules/${moduleName}/inputs/input1\")`;
        }
        await fse.writeFile(templateFile, JSON.stringify(templateJson, null, 2), { encoding: "utf8" });

        const debugGenerated: any = await this.generateDebugSetting(sourceSolutionPath, template, moduleName, extraProps);
        if (debugGenerated) {
            const targetVscodeFolder: string = path.join(slnPath, Constants.vscodeFolder);
            await fse.ensureDir(targetVscodeFolder);
            const targetLaunchJson: string = path.join(targetVscodeFolder, Constants.launchFile);
            if (await fse.pathExists(targetLaunchJson)) {
                const text = await fse.readFile(targetLaunchJson, "utf8");
                const launchJson = JSON.parse(stripJsonComments(text));
                launchJson.configurations.push(...debugGenerated.configurations);
                await fse.writeFile(targetLaunchJson, JSON.stringify(launchJson, null, 2), { encoding: "utf8" });
            } else {
                await fse.writeFile(targetLaunchJson, JSON.stringify(debugGenerated, null, 2), { encoding: "utf8" });
            }
        }

        if (!isNewSolution) {
            const launchUpdated: string = debugGenerated ? "and 'launch.json' are updated." : "is updated.";
            const moduleCreationMessage = template === Constants.EXISTING_MODULE ? "" : `Module '${moduleName}' has been created. `;
            vscode.window.showInformationMessage(`${moduleCreationMessage}'deployment.template.json' ${launchUpdated}`);
        }
        await this.writeRegistryCredEnv(address, envFilePath, result.usernameEnv, result.passwordEnv);
    }

    private async addModuleProj(parent: string, name: string,
                                repositoryName: string, template: string,
                                outputChannel: vscode.OutputChannel,
                                extraProps?: Map<string, string>): Promise<void> {
        // TODO command to create module;
        switch (template) {
            case Constants.LANGUAGE_CSHARP:
                await Executor.executeCMD(outputChannel, "dotnet", { shell: true }, "new -i Microsoft.Azure.IoT.Edge.Module");
                await Executor.executeCMD(outputChannel, "dotnet", { cwd: `${parent}`, shell: true }, `new aziotedgemodule -n "${name}" -r ${repositoryName}`);
                break;
            case Constants.CSHARP_FUNCTION:
                await Executor.executeCMD(outputChannel, "dotnet", { shell: true }, "new -i Microsoft.Azure.IoT.Edge.Function");
                await Executor.executeCMD(outputChannel, "dotnet", { cwd: `${parent}`, shell: true }, `new aziotedgefunction -n "${name}" -r ${repositoryName}`);
                break;
            case Constants.LANGUAGE_PYTHON:
                const gitHubSource = "https://github.com/Azure/cookiecutter-azure-iot-edge-module";
                const branch = "develop"; // TODO: Change back to master before release
                await Executor.executeCMD(outputChannel,
                    "cookiecutter",
                    { cwd: `${parent}`, shell: true },
                    `--no-input ${gitHubSource} module_name=${name} image_repository=${repositoryName} --checkout ${branch}`);
                break;
            case Constants.LANGUAGE_NODE:
                await Executor.executeCMD(outputChannel, "yo", { cwd: `${parent}`, shell: true }, `azure-iot-edge-module -n "${name}" -r ${repositoryName}`);
                break;
            case Constants.LANGUAGE_C:
                await new Promise((resolve, reject) => {
                    download("github:Azure/azure-iot-edge-c-module#master", path.join(parent, name), (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
                const moduleFile = path.join(parent, name, Constants.moduleManifest);
                const moduleJson = await fse.readJson(moduleFile);
                moduleJson.image.repository = repositoryName;
                await fse.writeFile(moduleFile, JSON.stringify(moduleJson, null, 2), { encoding: "utf8" });
                break;
            case Constants.LANGUAGE_JAVA:
                const groupId = extraProps.get(Constants.groupId);
                const packageName = groupId;
                await Executor.executeCMD(outputChannel,
                    "mvn",
                    { cwd: `${parent}`, shell: true},
                    "archetype:generate",
                    '-DarchetypeGroupId="com.microsoft.azure"',
                    '-DarchetypeArtifactId="azure-iot-edge-archetype"',
                    `-DarchetypeVersion=1.0.0`,
                    `-DgroupId="${groupId}"`,
                    `-DartifactId="${name}"`,
                    `-Dversion="1.0.0-SNAPSHOT"`,
                    `-Dpackage="${packageName}"`,
                    `-Drepository="${repositoryName}"`,
                    "-B");
                break;
            default:
                break;
        }
    }

    private async validateInputName(name: string, parentPath?: string): Promise<string | undefined> {
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

    private validateModuleExistence(name: string, modules?: string[]): string | undefined {
        if (modules && modules.indexOf(name) >= 0) {
            return `${name} already exists in ${Constants.deploymentTemplate}`;
        }
        return undefined;
    }

    private async getSolutionParentFolder(): Promise<string | undefined> {
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

    private async inputInputNames(): Promise<string> {
        return await Utility.showInputBox(
            Constants.inputNamePattern,
            Constants.inputNamePrompt, null, "input1,input2");
    }

    private async inputSolutionName(parentPath: string): Promise<string> {
        const validateFunc = async (name: string): Promise<string> => {
            return await this.validateInputName(name, parentPath);
        };
        return await Utility.showInputBox(Constants.solutionName,
            Constants.solutionNamePrompt,
            validateFunc, Constants.solutionNameDft);
    }

    private async inputModuleName(parentPath?: string, modules?: string[]): Promise<string> {
        const validateFunc = async (name: string): Promise<string> => {
            return await this.validateInputName(name, parentPath) || this.validateModuleExistence(name, modules);
        };
        return await Utility.showInputBox(Constants.moduleName,
            Constants.moduleNamePrompt,
            validateFunc, Constants.moduleNameDft);
    }

    private async validateGroupId(input: string): Promise<string | undefined> {
        if (!input) {
            return "The input cannot be empty.";
        }

        const mavenCheckRegex: RegExp = /^[a-zA-Z\d_\-\.]+$/;
        if (!mavenCheckRegex.test(input)) {
            return "Only allow letters, digits, '_', '-' and '.'";
        }

        return undefined;
    }

    private async inputJavaModuleGrpId(): Promise<string> {
        const dftValue = "com.edgemodule";
        return await Utility.showInputBox("Group ID",
                "Provide value for groupId", this.validateGroupId, dftValue);
    }

    private async inputRepository(module: string): Promise<string> {
        const dftValue: string = `localhost:5000/${module.toLowerCase()}`;
        return await Utility.showInputBox(Constants.repositoryPattern,
            Constants.repositoryPrompt,
            null, dftValue);
    }

    private async inputImage(module: string, template: string): Promise<{ repositoryName: string, imageName: string, moduleTwin: object, createOptions }> {
        let repositoryName: string = "";
        let imageName: string = "";
        let moduleTwin: object;
        let createOptions: string = "";
        if (template === Constants.ACR_MODULE) {
            const acrManager = new AcrManager();
            imageName = await acrManager.selectAcrImage();
            repositoryName = Utility.getRepositoryNameFromImageName(imageName);
        } else if (template === Constants.EXISTING_MODULE) {
            imageName = await Utility.showInputBox(Constants.imagePattern, Constants.imagePrompt);
            repositoryName = Utility.getRepositoryNameFromImageName(imageName);
        } else if (template === Constants.STREAM_ANALYTICS) {
            const saManager = new StreamAnalyticsManager();
            const job = await saManager.selectStreamingJob();
            const JobInfo: any = await saManager.getJobInfo(job);
            imageName = JobInfo.settings.image;
            moduleTwin = JobInfo.twin.content;
            createOptions = JobInfo.settings.createOptions ? JSON.stringify(JobInfo.settings.createOptions) : "";
        } else {
            repositoryName = await this.inputRepository(module);
            imageName = `\${${Utility.getModuleKey(module, "amd64")}}`;
        }
        return { repositoryName, imageName, moduleTwin, createOptions };
    }

    private async updateRegistrySettings(address: string, registries: any, envFile: string): Promise<{ registries: string, usernameEnv: string, passwordEnv: string }> {
        let usernameEnv;
        let passwordEnv;
        const lowerCase = address.toLowerCase();
        if (lowerCase === "localhost" || lowerCase.startsWith("localhost:")) {
            return { registries, usernameEnv, passwordEnv };
        }
        await Utility.loadEnv(envFile);
        const { exists, keySet } = this.checkAddressExist(address, registries);

        if (!exists) {
            const addressKey = Utility.getAddressKey(address, keySet);
            usernameEnv = `CONTAINER_REGISTRY_USERNAME_${addressKey}`;
            passwordEnv = `CONTAINER_REGISTRY_PASSWORD_${addressKey}`;
            const newRegistry = `{
                "username": "$${usernameEnv}",
                "password": "$${passwordEnv}",
                "address": "${address}"
            }`;
            if (!registries) {
                registries = {};
            }
            registries[addressKey] = JSON.parse(newRegistry);
        }
        return { registries, usernameEnv, passwordEnv };
    }

    private async writeRegistryCredEnv(address: string, envFile: string, usernameEnv: string, passwordEnv: string): Promise<void> {
        if (!usernameEnv) {
            return;
        }

        if (address.endsWith(".azurecr.io")) {
            await this.populateACRCredential(address, envFile, usernameEnv, passwordEnv);
        } else {
            await this.populateStaticEnv(envFile, usernameEnv, passwordEnv);
        }
    }

    private async populateStaticEnv(envFile: string, usernameEnv: string, passwordEnv: string): Promise<void> {
        const envContent = `${usernameEnv}=\n${passwordEnv}=\n`;
        await fse.ensureFile(envFile);
        await fse.appendFile(envFile, envContent, { encoding: "utf8" });
        this.askEditEnv(envFile);
    }

    private async populateACRCredential(address: string, envFile: string, usernameEnv: string, passwordEnv: string): Promise<void> {
        const acrManager = new AcrManager();
        let cred;
        try {
            cred = await acrManager.getAcrRegistryCredential(address);
        } catch (err) {
            // tslint:disable-next-line:no-console
            console.error(err);
        }
        if (cred && cred.username !== undefined) {
            const envContent = `${usernameEnv}=${cred.username}\n${passwordEnv}=${cred.password}\n`;
            await fse.ensureFile(envFile);
            await fse.appendFile(envFile, envContent, { encoding: "utf8" });
            vscode.window.showInformationMessage(Constants.acrEnvSet);
        } else {
            await this.populateStaticEnv(envFile, usernameEnv, passwordEnv);
        }
    }

    private async askEditEnv(envFile: string): Promise<void> {
        const yesOption = "Yes";
        const option = await vscode.window.showInformationMessage(Constants.setRegistryEnvNotification, yesOption);
        if (option === yesOption) {
            await fse.ensureFile(envFile);
            await vscode.window.showTextDocument(vscode.Uri.file(envFile));
        }
    }

    private checkAddressExist(address: string, registriesObj: any): { exists: boolean, keySet: Set<string> } {
        const keySet = new Set();
        let exists = false;
        if (registriesObj === undefined) {
            return { exists, keySet };
        }

        const expandedContent = Utility.expandEnv(JSON.stringify(registriesObj));
        const registriesExpanded = JSON.parse(expandedContent);

        for (const key in registriesExpanded) {
            if (registriesExpanded.hasOwnProperty(key)) {
                keySet.add(key);
                if (registriesExpanded[key].address === address) {
                    exists = true;
                }
            }
        }
        return { exists, keySet };
    }

    private async selectModuleTemplate(label?: string): Promise<string> {
        const templatePicks: vscode.QuickPickItem[] = [
            {
                label: Constants.LANGUAGE_CSHARP,
                description: Constants.LANGUAGE_CSHARP_DESCRIPTION,
            },
            {
                label: Constants.LANGUAGE_NODE,
                description: Constants.LANGUAGE_NODE_DESCRIPTION,
            },
            {
                label: Constants.LANGUAGE_PYTHON,
                description: Constants.LANGUAGE_PYTHON_DESCRIPTION,
            },
            {
                label: Constants.LANGUAGE_C,
                description: Constants.LANGUAGE_C_DESCRIPTION,
            },
            {
                label: Constants.CSHARP_FUNCTION,
                description: Constants.CSHARP_FUNCTION_DESCRIPTION,
            },
            {
                label: Constants.LANGUAGE_JAVA,
                description: Constants.LANGUAGE_JAVA_DESCRIPTION,
            },
            {
                label: Constants.STREAM_ANALYTICS,
                description: Constants.STREAM_ANALYTICS_DESCRIPTION,
            },
            {
                label: Constants.ACR_MODULE,
                description: Constants.ACR_MODULE_DESCRIPTION,
            },
            {
                label: Constants.EXISTING_MODULE,
                description: Constants.EXISTING_MODULE_DESCRIPTION,
            },
        ];
        if (label === undefined) {
            label = Constants.selectTemplate;
        }
        const templatePick = await vscode.window.showQuickPick(templatePicks, { placeHolder: label, ignoreFocusOut: true });
        if (!templatePick) {
            throw new UserCancelledError();
        }
        return templatePick.label;
    }
}
