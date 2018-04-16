// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as stripJsonComments from "strip-json-comments";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { TelemetryClient } from "../common/telemetryClient";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";

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
        const template = await this.selectModuleTemplate();

        const moduleName: string = Utility.getValidModuleName(await this.inputModuleName());
        const { repositoryName, imageName } = await this.inputImage(moduleName, template);
        const slnPath: string = path.join(parentPath, slnName);
        await fse.mkdirs(slnPath);

        const sourceSolutionPath = this.context.asAbsolutePath(path.join(Constants.assetsFolder, Constants.solutionFolder));
        const sourceDeploymentTemplate = path.join(sourceSolutionPath, Constants.deploymentTemplate);
        const sourceGitIgnore = path.join(sourceSolutionPath, Constants.gitIgnore);
        const targetModulePath = path.join(slnPath, Constants.moduleFolder);
        const targetGitIgnore = path.join(slnPath, Constants.gitIgnore);
        const targetDeployment = path.join(slnPath, Constants.deploymentTemplate);

        await fse.copy(sourceGitIgnore, targetGitIgnore);
        await fse.mkdirs(targetModulePath);

        await this.addModule(targetModulePath, moduleName, repositoryName, template, outputChannel);

        const data: string = await fse.readFile(sourceDeploymentTemplate, "utf8");
        const mapObj: Map<string, string> = new Map<string, string>();
        mapObj.set(Constants.moduleNamePlaceholder, moduleName);
        mapObj.set(Constants.moduleImagePlaceholder, imageName);
        mapObj.set(Constants.moduleFolderPlaceholder, moduleName);
        const deploymentGenerated: string = Utility.replaceAll(data, mapObj);
        await fse.writeFile(targetDeployment, deploymentGenerated, {encoding: "utf8"});

        const debugGenerated: string = await this.generateDebugSetting(sourceSolutionPath, template, mapObj);
        if (debugGenerated) {
            const targetVscodeFolder: string = path.join(slnPath, Constants.vscodeFolder);
            await fse.ensureDir(targetVscodeFolder);
            const targetLaunchJson: string = path.join(targetVscodeFolder, Constants.launchFile);
            await fse.writeFile(targetLaunchJson, debugGenerated, {encoding: "utf8"});
        }
        // open new created solution. Will also investigate how to open the module in the same workspace
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(slnPath), false);
    }

    public async addModuleForSolution(outputChannel: vscode.OutputChannel, templateUri?: vscode.Uri): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.addModuleEvent}.selectTemplate`);
        if (!templateFile) {
            vscode.window.showInformationMessage(Constants.noSolutionFileMessage);
            return;
        }

        const templateJson = await fse.readJson(templateFile);
        const slnPath: string = path.dirname(templateFile);
        const sourceSolutionPath = this.context.asAbsolutePath(path.join(Constants.assetsFolder, Constants.solutionFolder));
        const targetModulePath = path.join(slnPath, Constants.moduleFolder);

        const template = await this.selectModuleTemplate();
        const modules = templateJson.moduleContent.$edgeAgent["properties.desired"].modules;
        const moduleName: string = Utility.getValidModuleName(await this.inputModuleName(targetModulePath, Object.keys(modules)));
        const { repositoryName, imageName } = await this.inputImage(moduleName, template);
        await this.addModule(targetModulePath, moduleName, repositoryName, template, outputChannel);

        const newModuleSection = `{
            "version": "1.0",
            "type": "docker",
            "status": "running",
            "restartPolicy": "always",
            "settings": {
              "image": "${imageName}",
              "createOptions": ""
            }
          }`;
        modules[moduleName] = JSON.parse(newModuleSection);
        await fse.writeFile(templateFile, JSON.stringify(templateJson, null, 2), { encoding: "utf8" });

        const mapObj: Map<string, string> = new Map<string, string>();
        mapObj.set(Constants.moduleNamePlaceholder, moduleName);
        mapObj.set(Constants.moduleFolderPlaceholder, moduleName);
        const debugGenerated: string = await this.generateDebugSetting(sourceSolutionPath, template, mapObj);
        if (debugGenerated) {
            const targetVscodeFolder: string = path.join(slnPath, Constants.vscodeFolder);
            await fse.ensureDir(targetVscodeFolder);
            const targetLaunchJson: string = path.join(targetVscodeFolder, Constants.launchFile);
            if (await fse.pathExists(targetLaunchJson)) {
                const text = await fse.readFile(targetLaunchJson, "utf8");
                const launchJson = JSON.parse(stripJsonComments(text));
                launchJson.configurations.push(...JSON.parse(debugGenerated).configurations);
                await fse.writeFile(targetLaunchJson, JSON.stringify(launchJson, null, 2), { encoding: "utf8" });
            } else {
                await fse.writeFile(targetLaunchJson, debugGenerated, { encoding: "utf8" });
            }
        }

        const launchUpdated: string = debugGenerated ? "and 'launch.json' are updated." : "is updated.";
        const moduleCreationMessage = template === Constants.EXISTING_MODULE ? "" : `Module '${moduleName}' is created. `;
        vscode.window.showInformationMessage(`${moduleCreationMessage}'deployment.template.json' ${launchUpdated}`);
    }

    // TODO: The command is temperory for migration stage, will be removed later.
    public async convertModule(fileUri?: vscode.Uri): Promise<void> {
        const filePath = fileUri ? fileUri.fsPath : undefined;
        if (filePath) {
            const dockerFile = "Dockerfile";
            const dockerDebugFile = "Dockerfile.amd64.debug";
            const csharpFolder = "csharp";
            const csharpFunction = "csharpfunction";

            const fileName = path.basename(filePath);
            const extName = path.extname(filePath);
            const isFunction = fileName === "host.json";
            const isCSharp = extName === ".csproj";

            const targetPath = path.dirname(filePath);
            const moduleExist = await fse.pathExists(path.join(targetPath, Constants.moduleManifest));
            if (moduleExist) {
                throw new Error("module.json exists already");
            }
            if (isFunction || isCSharp) {
                const moduleName: string = isCSharp ? path.basename(fileName, extName)
                    : Utility.getValidModuleName(path.basename(targetPath));
                const repositoryName: string = await this.inputRepository(moduleName);
                const srcPath = this.context.asAbsolutePath(path.join(Constants.assetsFolder, Constants.moduleFolder));
                const srcModuleFile = path.join(srcPath, Constants.moduleManifest);
                const srcDockerFolder = path.join(srcPath, isFunction ? csharpFunction : csharpFolder);
                const srcDockerFile = path.join(srcDockerFolder, dockerFile);
                const srcDockerDebugFile = path.join(srcDockerFolder, dockerDebugFile);

                const moduleData: string = await fse.readFile(srcModuleFile, "utf8");
                const mapObj: Map<string, string> = new Map<string, string>();
                mapObj.set(Constants.repositoryPlaceholder, repositoryName);
                const moduleGenerated: string = Utility.replaceAll(moduleData, mapObj);
                const targetModule: string = path.join(targetPath, Constants.moduleManifest);
                await fse.writeFile(targetModule, moduleGenerated, {encoding: "utf8"});

                const targetDockerFile = path.join(targetPath, dockerFile);
                const targetDockerDebugFile = path.join(targetPath, dockerDebugFile);
                if (isFunction) {
                    await fse.copy(srcDockerFile, targetDockerFile);
                    await fse.copy(srcDockerDebugFile, targetDockerDebugFile);
                } else {
                    const dockerMapObj: Map<string, string> = new Map<string, string>();
                    dockerMapObj.set(Constants.dllPlaceholder, moduleName);
                    const dockerFileData: string = await fse.readFile(srcDockerFile, "utf8");
                    const dockerFileGenerated: string = Utility.replaceAll(dockerFileData, dockerMapObj);
                    await fse.writeFile(targetDockerFile, dockerFileGenerated, {encoding: "utf8"});

                    const dockerDebugFileData: string = await fse.readFile(srcDockerDebugFile, "utf8");
                    const dockerDebugFileGenerated: string = Utility.replaceAll(dockerDebugFileData, dockerMapObj);
                    await fse.writeFile(targetDockerDebugFile, dockerDebugFileGenerated, {encoding: "utf8"});
                }
                vscode.window.showInformationMessage("Converted successfully. module.json and Dockerfiles have been added.");
            } else {
                throw new Error("File type is wrong");
            }
        } else {
            throw new Error("No file is selected");
        }
    }

    private async generateDebugSetting(srcSlnPath: string,
                                       language: string,
                                       mapObj: Map<string, string>): Promise<string> {
        // copy launch.json
        let launchFile: string;
        switch (language) {
            case Constants.LANGUAGE_CSHARP:
            case Constants.CSHARP_FUNCTION:
                launchFile = Constants.launchCSharp;
                mapObj.set(Constants.appFolder, "/app");
                break;
            default:
                break;
        }

        if (launchFile) {
            const srcLaunchJson = path.join(srcSlnPath, launchFile);
            const debugData: string = await fse.readFile(srcLaunchJson, "utf8");
            return Utility.replaceAll(debugData, mapObj);
        } else {
            return "";
        }
    }

    private async addModule(parent: string, name: string,
                            repositoryName: string, template: string,
                            outputChannel: vscode.OutputChannel): Promise<void> {
        // TODO command to create module;
        switch (template) {
            case Constants.LANGUAGE_CSHARP:
                await Executor.executeCMD(outputChannel, "dotnet", {shell: true}, "new -i Microsoft.Azure.IoT.Edge.Module");
                await Executor.executeCMD(outputChannel, "dotnet", {cwd: `${parent}`, shell: true}, `new aziotedgemodule -n "${name}" -r ${repositoryName}`);
                break;
            case Constants.CSHARP_FUNCTION:
                await Executor.executeCMD(outputChannel, "dotnet", {shell: true}, "new -i Microsoft.Azure.IoT.Edge.Function");
                await Executor.executeCMD(outputChannel, "dotnet", {cwd: `${parent}`, shell: true}, `new aziotedgefunction -n "${name}" -r ${repositoryName}`);
                break;
            case Constants.LANGUAGE_PYTHON:
                const gitHubSource = "https://github.com/Azure/cookiecutter-azure-iot-edge-module";
                await Executor.executeCMD(outputChannel,
                    "cookiecutter",
                    {cwd: `${parent}`, shell: true},
                    `--no-input ${gitHubSource} module_name=${name} image_repository=${repositoryName}`);
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

    private async inputRepository(module: string): Promise<string> {
        const dftValue: string = `localhost:5000/${module.toLowerCase()}`;
        return await Utility.showInputBox(Constants.repositoryPattern,
                                          Constants.repositoryPrompt,
                                          null, dftValue);
    }

    private async inputImage(module: string, template: string): Promise<{repositoryName: string, imageName: string}> {
        let repositoryName: string = "";
        let imageName: string = "";
        if (template === Constants.EXISTING_MODULE) {
            imageName = await Utility.showInputBox(Constants.imagePattern, Constants.imagePrompt);
        } else {
            repositoryName = await this.inputRepository(module);
            imageName = `\${${Utility.getModuleKey(module, "amd64")}}`;
        }
        return { repositoryName, imageName };
    }

    private async selectModuleTemplate(label?: string): Promise<string> {
        const templatePicks: vscode.QuickPickItem[] = [
            {
                label: Constants.LANGUAGE_CSHARP,
                description: Constants.LANGUAGE_CSHARP_DESCRIPTION,
            },
            {
                label: Constants.CSHARP_FUNCTION,
                description: Constants.CSHARP_FUNCTION_DESCRIPTION,
            },
            {
                label: Constants.LANGUAGE_PYTHON,
                description: Constants.LANGUAGE_PYTHON_DESCRIPTION,
            },
            {
                label: Constants.EXISTING_MODULE,
                description: Constants.EXISTING_MODULE_DESCRIPTION,
            },
        ];
        if (label === undefined) {
            label = Constants.selectTemplate;
        }
        const templatePick = await vscode.window.showQuickPick(templatePicks, {placeHolder: label, ignoreFocusOut: true});
        if (!templatePick) {
            throw new UserCancelledError();
        }
        return templatePick ? templatePick.label : undefined;
    }
}
