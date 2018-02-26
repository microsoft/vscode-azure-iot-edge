"use strict";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
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
        const language = await this.selectModuleTemplate();

        const moduleName: string = Utility.getValidModuleName(await this.inputModuleName());
        const repositoryName: string = await this.inputRepository(moduleName);
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

        await this.addModule(targetModulePath, moduleName, repositoryName, language, outputChannel);

        const data: string = await fse.readFile(sourceDeploymentTemplate, "utf8");
        const mapObj: Map<string, string> = new Map<string, string>();
        mapObj.set(Constants.moduleNamePlaceholder, moduleName);
        mapObj.set(Constants.moduleImagePlaceholder, `\${${Utility.getModuleKey(moduleName, "amd64")}}`);
        mapObj.set(Constants.moduleFolderPlaceholder, moduleName);
        const deploymentGenerated: string = Utility.replaceAll(data, mapObj);
        await fse.writeFile(targetDeployment, deploymentGenerated, {encoding: "utf8"});

        const debugGenerated: string = await this.generateDebugSetting(sourceSolutionPath, language, mapObj);
        const targetVscodeFolder: string = path.join(slnPath, Constants.vscodeFolder);
        await fse.ensureDir(targetVscodeFolder);
        const targetLaunchJson: string = path.join(targetVscodeFolder, Constants.launchFile);
        await fse.writeFile(targetLaunchJson, debugGenerated, {encoding: "utf8"});

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

        const language = await this.selectModuleTemplate();
        const moduleName: string = Utility.getValidModuleName(await this.inputModuleName(targetModulePath));
        const repositoryName: string = await this.inputRepository(moduleName);

        const newModuleSection = `{
            "version": "1.0",
            "type": "docker",
            "status": "running",
            "restartPolicy": "always",
            "settings": {
              "image": "\${${Utility.getModuleKey(moduleName, "amd64")}}",
              "createOptions": ""
            }
          }`;
        templateJson.moduleContent.$edgeAgent["properties.desired"].modules[moduleName] = JSON.parse(newModuleSection);
        await fse.writeFile(templateFile, JSON.stringify(templateJson, null, 2), { encoding: "utf8" });

        const mapObj: Map<string, string> = new Map<string, string>();
        mapObj.set(Constants.moduleNamePlaceholder, moduleName);
        mapObj.set(Constants.moduleFolderPlaceholder, moduleName);
        const debugGenerated: string = await this.generateDebugSetting(sourceSolutionPath, language, mapObj);
        const targetVscodeFolder: string = path.join(slnPath, Constants.vscodeFolder);
        await fse.ensureDir(targetVscodeFolder);
        const targetLaunchJson: string = path.join(targetVscodeFolder, Constants.launchFile);
        if (await fse.exists(targetLaunchJson)) {
            const launchJson = await fse.readJson(targetLaunchJson);
            launchJson.configurations.push(...JSON.parse(debugGenerated).configurations);
            await fse.writeFile(targetLaunchJson, JSON.stringify(launchJson, null, 2), { encoding: "utf8" });
        } else {
            await fse.writeFile(targetLaunchJson, debugGenerated, { encoding: "utf8" });
        }

        await this.addModule(targetModulePath, moduleName, repositoryName, language, outputChannel);

        vscode.window.showInformationMessage(`Module '${moduleName}' is created. 'deployment.template.json' and 'launch.json' are updated.`);
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
            const moduleExist = await fse.exists(path.join(targetPath, Constants.moduleManifest));
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
                vscode.window.showInformationMessage("Converted successfully. module.json and docker files have been added.");
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

            const srcLaunchJson = path.join(srcSlnPath, launchFile);
            const debugData: string = await fse.readFile(srcLaunchJson, "utf8");
            return Utility.replaceAll(debugData, mapObj);
    }

    private async addModule(parent: string, name: string,
                            repositoryName: string, template: string,
                            outputChannel: vscode.OutputChannel): Promise<void> {
        // TODO command to create module;
        switch (template) {
            case Constants.LANGUAGE_CSHARP:
                // TODO: Add following install command back when the template is released
                // await Executor.executeCMD(outputChannel, "dotnet", {shell: true}, "new -i Microsoft.Azure.IoT.Edge.Module");
                await Executor.executeCMD(outputChannel, "dotnet", {cwd: `${parent}`, shell: true}, `new aziotedgemodule -n "${name}" -r ${repositoryName}`);
                break;
            case Constants.CSHARP_FUNCTION:
                // TODO: Add following install command back when the template is released
                // await Executor.executeCMD(outputChannel, "dotnet", {shell: true}, "new -i Microsoft.Azure.IoT.Edge.Function");
                await Executor.executeCMD(outputChannel, "dotnet", {cwd: `${parent}`, shell: true}, `new aziotedgefunction -n "${name}" -r ${repositoryName}`);
                break;
            default:
                break;
        }
    }

    private async validateFolderPath(parentPath: string, folderName: string): Promise<string | undefined> {
        const folderPath = path.join(parentPath, folderName);
        if (folderName && await fse.pathExists(folderPath)) {
            return `${folderName} already exists under ${parentPath}`;
        } else {
            return undefined;
        }
    }

    private async validateModuleName(existingModules: string[], moduleName: string): Promise<string | undefined> {
        if (existingModules.indexOf(moduleName) > -1) {
            return `Module '${moduleName}' already exists`;
        } else {
            return undefined;
        }
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
            return await this.validateFolderPath(parentPath, name);
        };
        return await Utility.showInputBox(Constants.solutionName,
                                          Constants.solutionNamePrompt,
                                          validateFunc, Constants.solutionNameDft);
    }

    private async inputModuleName(parentPath?: string): Promise<string> {
        const validateFunc = parentPath ? async (name: string): Promise<string> => {
            return await this.validateFolderPath(parentPath, name);
        } : null;
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

    private async selectModuleTemplate(label?: string): Promise<string> {
        const languagePicks: string[] = [
            Constants.LANGUAGE_CSHARP,
            Constants.CSHARP_FUNCTION,
        ];
        if (label === undefined) {
            label = Constants.selectTemplate;
        }
        return await vscode.window.showQuickPick(languagePicks, {placeHolder: label, ignoreFocusOut: true});
    }
}
