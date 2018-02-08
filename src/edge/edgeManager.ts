"use strict";
import * as iothub from "azure-iothub";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { TelemetryClient } from "../common/telemetryClient";
import { Utility } from "../common/utility";

export class EdgeManager {

    constructor(private context: vscode.ExtensionContext) {
    }

    public generateDeploymentJsonForVerification() {
        this.generateFile(Constants.deploymentFile);
    }

    public generateRoutesJsonForVerification() {
        this.generateFile(Constants.routesFile);
    }

    public async verifyModule() {
        const devices = await Utility.getDevices();
        const deviceIds = devices.map((device) => device.deviceId);
        vscode.window.showQuickPick(deviceIds, { placeHolder: "Select device" }).then((deviceId) => {
            if (deviceId !== undefined) {
                const deploymentFile = path.join(vscode.workspace.rootPath, ".vscode", Constants.deploymentFile);
                const routesFile = path.join(vscode.workspace.rootPath, ".vscode", Constants.routesFile);
                this.createDeployment(deviceId, deploymentFile);
                this.launchEdgeRuntime(deviceId, devices, routesFile);
            }
        });
    }

    public viewModuleInput() {
        // TelemetryClient.sendEvent("viewModuleInput");
        Executor.runInTerminal(`docker logs input-simulator --tail 50 -f`, "Module Input");
    }

    public viewModuleOutput() {
        Executor.runInTerminal(`docker logs output-simulator --tail 50 -f`, "Module Output");
    }

    public async login() {
        const config = Utility.getConfiguration();
        let iotHubConnectionString = config.get<string>(Constants.IotHubConnectionStringKey);
        if (!iotHubConnectionString) {
            iotHubConnectionString = await vscode.window.showInputBox({
                prompt: "IoT Hub Connection String",
                placeHolder: "Enter IoT Hub Connection String",
            }).then((connectionString: string) => {
                if (connectionString !== undefined) {
                    config.update(Constants.IotHubConnectionStringKey, connectionString, true);
                    return connectionString;
                }
            });
        }
        if (iotHubConnectionString) {
            Executor.runInTerminal(`edge-explorer login "${iotHubConnectionString}"`);
        }
    }

    public async deploy() {
        const deviceIds = (await Utility.getDevices()).map((device) => device.deviceId);
        vscode.window.showQuickPick(deviceIds, { placeHolder: "Select device to create deployment" }).then((deviceId) => {
            if (deviceId !== undefined) {
                this.createDeployment(deviceId, path.join(vscode.workspace.rootPath, Constants.deploymentFile));
            }
        });
    }

    public async launch() {
        const devices = await Utility.getDevices();
        const deviceIds = devices.map((device) => device.deviceId);
        vscode.window.showQuickPick(deviceIds, { placeHolder: "Select device to launch Egde runtime" }).then((deviceId) => {
            if (deviceId !== undefined) {
                this.launchEdgeRuntime(deviceId, devices, path.join(vscode.workspace.rootPath, Constants.routesFile));
            }
        });
    }

    public async createEdgeSolution(outputChannel: vscode.OutputChannel,
                                    parentUri?: vscode.Uri): Promise<void> {
        // get the target path
        const parentPath: string = parentUri ? parentUri.fsPath : await this.getSolutionParentFolder();
        if (parentPath === undefined) {
            vscode.window.showInformationMessage(Constants.userCancelled);
            return;
        }

        await fse.ensureDir(parentPath);
        const slnName: string = await this.inputSolutionName(parentPath);
        const language = await this.selectModuleTemplate();

        const moduleName: string = await this.inputModuleName();
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
        mapObj.set(Constants.moduleNamePlaceholder, moduleName.toLowerCase());
        mapObj.set(Constants.moduleImagePlaceholder, `\${MODULES.${moduleName}.amd64}`);
        mapObj.set(Constants.moduleFolderPlaceholder, moduleName);
        const deploymentGenerated: string = Utility.replaceAll(data, mapObj);
        await fse.writeFile(targetDeployment, deploymentGenerated, {encoding: "utf8"});

        // copy launch.json
        const srcLaunchJson = path.join(sourceSolutionPath, Constants.launchFile);
        const debugData: string = await fse.readFile(srcLaunchJson, "utf8");
        const debugGenerated: string = Utility.replaceAll(debugData, mapObj);
        const targetVscodeFolder: string = path.join(slnPath, Constants.vscodeFolder);
        await fse.ensureDir(targetVscodeFolder);
        const targetLaunchJson: string = path.join(targetVscodeFolder, Constants.launchFile);
        await fse.writeFile(targetLaunchJson, debugGenerated, {encoding: "utf8"});

        // open new created solution. Will also investigate how to open the module in the same workspace
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(slnPath), false);
    }

    public async buildSolution(outputChannel: vscode.OutputChannel,
                               templateUri?: vscode.Uri): Promise<void> {
        if (!templateUri || !templateUri.fsPath) {
            vscode.window.showInformationMessage("no solution file");
            return;
        }
        const templateFile: string = templateUri.fsPath;
        const imageNameMap: Map<string, string> = new Map();
        const dockerFileMap: Map<string, string> = new Map();
        const slnPath: string = path.dirname(templateFile);

        const configPath = path.join(slnPath, Constants.outputConfig);
        const deployFile = path.join(configPath, Constants.deploymentFile);
        await fse.remove(deployFile);

        await this.setSlnModulesMap(slnPath, imageNameMap, dockerFileMap);
        const data: string = await fse.readFile(templateFile, "utf8");
        const buildSet: Set<string> = new Set();
        const moduleExpanded: string = Utility.expandModules(data, imageNameMap, buildSet);
        const exceptStr: Set<string> = new Set<string>();
        exceptStr.add("$edgeHub");
        exceptStr.add("$edgeAgent");
        exceptStr.add("$upstream");
        const generated: string = Utility.expandEnv(moduleExpanded, exceptStr);
        // build docker images
        for (const image of buildSet) {
            const dockerFile: string = dockerFileMap.get(image);
            const context = path.dirname(dockerFile);
            await Utility.dockerBuildImage(dockerFile, context, image, outputChannel);
            await Utility.dockerPushImage(image, outputChannel);
        }

        // generate config file
        await fse.ensureDir(configPath);
        await fse.writeFile(deployFile, generated, "utf8");
    }

    private async setSlnModulesMap(slnPath: string,
                                   imageNameMap: Map<string, string>,
                                   dockerFileMap: Map<string, string>): Promise<void> {
        const modulesPath: string  = path.join(slnPath, Constants.moduleFolder);
        const stat: fs.Stats = await fse.lstat(modulesPath);
        if (!stat.isDirectory()) {
            throw new Error("no modules folder");
        }

        const moduleDirs: string[] = await Utility.getSubDirectories(modulesPath);
        await Promise.all(
            moduleDirs.map(async (module) => {
                await this.setModuleMap(module, imageNameMap, dockerFileMap);
            }),
        );
    }

    private async setModuleMap(modulePath: string,
                               imageNameMap: Map<string, string>,
                               dockerFileMap: Map<string, string>): Promise<void> {
        const moduleFile = path.join(modulePath, Constants.moduleManifest);
        const name: string = path.basename(modulePath);
        if (await fse.exists(moduleFile)) {
            const module = await fse.readJson(moduleFile);
            const platformKeys: string[] = Object.keys(module.image.tag.platforms);
            const repo: string = module.image.repository;
            const version: string = module.image.tag.version;
            platformKeys.map((platform) => {
                const moduleKey: string  = this.getModuleKey(name, platform);
                const image: string = this.getImage(repo, version, platform);
                imageNameMap.set(moduleKey, image);
                dockerFileMap.set(image, path.join(modulePath, module.image.tag.platforms[platform]));
            });
        }
    }

    private getModuleKey(name: string, platform: string): string {
        return `MODULES.${name}.${platform}`;
    }

    private getImage(repo: string, version: string, platform: string): string {
        return `${repo}:${version}-${platform}`;
    }

    private async addModule(parent: string, name: string,
                            repositoryName: string, template: string,
                            outputChannel: vscode.OutputChannel): Promise<void> {
        // TODO command to create module;
        switch (template) {
            case Constants.LANGUAGE_CSHARP:
                // TODO: Add following install command back when the template is released
                // await Executor.executeCMD(outputChannel, "dotnet", {shell: true}, "new -i Microsoft.Azure.IoT.Edge.Module");
                await Executor.executeCMD(outputChannel, "dotnet", {cwd: `${parent}`, shell: true}, `new aziotedgemodule -n ${name} -r ${repositoryName}`);
                break;
            default:
                break;
        }
    }

    private async validateProjectPath(parentPath: string, projectName: string): Promise<string | undefined> {
        const projectPath = path.join(parentPath, projectName);
        if (projectName && await fse.pathExists(projectPath)) {
            return `${projectName} already exists under ${parentPath}`;
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
            return await this.validateProjectPath(parentPath, name);
        };
        return await Utility.showInputBox(Constants.solutionName,
                                          Constants.solutionNamePrompt,
                                          validateFunc, Constants.solutionNameDft);
    }

    private async inputModuleName(): Promise<string> {
        return await Utility.showInputBox(Constants.moduleName,
                                          Constants.moduleNamePrompt,
                                          null, Constants.moduleNameDft);
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
            Constants.LANGUAGE_PYTHON,
        ];
        if (label === undefined) {
            label = Constants.selectTemplate;
        }
        return await vscode.window.showQuickPick(languagePicks, {placeHolder: label});
    }

    private generateFile(fileName: string) {
        if (Utility.checkWorkspace()) {
            const fullFileName = path.join(vscode.workspace.rootPath, ".vscode", fileName);
            if (fs.existsSync(fullFileName)) {
                vscode.window.showWarningMessage(`${fileName} already exists in '.vscode' folder.`);
            } else {
                const folder = path.join(vscode.workspace.rootPath, ".vscode");
                if (!fs.existsSync(folder)) {
                    fs.mkdirSync(folder);
                }
                fse.copySync(this.context.asAbsolutePath(path.join("assets", fileName)), fullFileName);
            }
            Utility.showfile(fullFileName);
        }
    }

    private createDeployment(deviceId: string, deploymentFile: string) {
        Executor.runInTerminal(`edge-explorer edge deployment create -m "${deploymentFile}" -d ${deviceId}`);
    }

    private launchEdgeRuntime(deviceId: string, devices: iothub.Device[], routesFile: string) {
        const primaryKey = devices.find((device) => device.deviceId === deviceId).authentication.symmetricKey.primaryKey;
        const config = Utility.getConfiguration();
        const iotHubConnectionString = config.get<string>(Constants.IotHubConnectionStringKey);
        const hostName = Utility.getHostNameFromConnectionString(iotHubConnectionString);
        const deviceConnectionString = `HostName=${hostName};DeviceId=${deviceId};SharedAccessKey=${primaryKey}`;
        Executor.runInTerminal(`launch-edge-runtime -c "${deviceConnectionString}" --config "${routesFile}"`);
    }
}
