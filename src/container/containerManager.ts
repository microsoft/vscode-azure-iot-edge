"use strict";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { TelemetryClient } from "../common/telemetryClient";
import { Utility } from "../common/utility";

export class ContainerManager {
    private workspaceState: vscode.Memento;

    constructor(context: vscode.ExtensionContext) {
        this.workspaceState = context.workspaceState;
    }

    public async buildModuleImage(fileUri?: vscode.Uri, pushImage: boolean = false) {
        const event = pushImage ? Constants.buildAndPushModuleImageEvent : Constants.buildModuleImageEvent;
        const moduleConfigFilePath: string = await Utility.getInputFilePath(fileUri, Constants.moduleConfigFileNamePattern, Constants.moduleConfigFile, `${event}.start`);

        if (moduleConfigFilePath) {
            const moduleConfig = await fse.readJson(moduleConfigFilePath);
            const platforms = moduleConfig.image.tag.platforms;
            const platform = await vscode.window.showQuickPick(Object.keys(platforms), { ignoreFocusOut: true });
            if (platform) {
                const directory = path.dirname(moduleConfigFilePath);
                const dockerfilePath = path.join(directory, platforms[platform]);
                const imageName = Utility.getImage(moduleConfig.image.repository, moduleConfig.image.tag.version, platform);
                const buildCommand = this.constructBuildCmd(dockerfilePath, imageName, directory);
                if (pushImage) {
                    const pushCommand = this.constructPushCmd(imageName);
                    Executor.runInTerminal(Utility.combineCommands([buildCommand, pushCommand]));
                } else {
                    Executor.runInTerminal(buildCommand);
                }
                TelemetryClient.sendEvent(`${event}.end`);
            }
        }
    }

    public async buildDockerImage(dockerfileFromContextMenu?: vscode.Uri) {
        const dockerfilePath: string = await Utility.getInputFilePath(dockerfileFromContextMenu, Constants.dockerfileNamePattern, "Dockerfile", "buildDockerImage.start");

        if (dockerfilePath) {
            const workspaceFolder: vscode.Uri = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(dockerfilePath)).uri;
            const exeDirArguments: vscode.Uri[] = await vscode.window.showOpenDialog({
                defaultUri: workspaceFolder,
                openLabel: "Select folder as EXE_DIR",
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
            });
            const exeDirArgument: vscode.Uri = exeDirArguments[0];
            if (exeDirArgument) {
                const relativePath: string = Utility.getRelativePath(exeDirArgument, workspaceFolder);
                if (relativePath) {
                    const imageName: string = await this.promptForImageName();
                    if (imageName) {
                        Executor.runInTerminal(`docker build -f \"${Utility.adjustFilePath(dockerfilePath)}\" --build-arg EXE_DIR=\"${relativePath}\" -t \"${imageName}\" ` +
                            `\"${Utility.adjustFilePath(workspaceFolder.fsPath)}\"`);
                        TelemetryClient.sendEvent("buildDockerImage.end");
                    }
                } else {
                    vscode.window.showErrorMessage("The folder must be contained within the Dockerfile's root workspace folder");
                }
            }
        }
    }

    public async buildSolution(templateUri?: vscode.Uri): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
                                                                    Constants.deploymentTemplatePattern,
                                                                    Constants.deploymentTemplateDesc,
                                                                    `${Constants.buildSolutionEvent}.selectTemplate`);
        if (!templateFile) {
            vscode.window.showInformationMessage("no solution file");
            return;
        }
        const moduleToImageMap: Map<string, string> = new Map();
        const imageToDockerfileMap: Map<string, string> = new Map();
        const buildSet: Set<string> = await this.generateDeploymentAndBuildSet(templateFile,
                                                                               moduleToImageMap,
                                                                               imageToDockerfileMap);

        // build docker images
        const commands: string[] = [];
        for (const image of buildSet) {
            const dockerFile: string = imageToDockerfileMap.get(image);
            const context = path.dirname(dockerFile);
            commands.push(this.constructBuildCmd(dockerFile, image, context));
            commands.push(this.constructPushCmd(image));
        }
        Executor.runInTerminal(Utility.combineCommands(commands));
    }

    public async generateDeployment(templateUri?: vscode.Uri): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.buildSolutionEvent}.selectTemplate`);
        if (!templateFile) {
            vscode.window.showInformationMessage("no solution file");
            return;
        }
        const moduleToImageMap: Map<string, string> = new Map();
        const imageToDockerfileMap: Map<string, string> = new Map();
        await this.generateDeploymentAndBuildSet(templateFile, moduleToImageMap, imageToDockerfileMap);
    }

    public async pushDockerImage() {
        TelemetryClient.sendEvent("pushDockerImage.start");
        const imageName: string = await this.promptForImageName();
        if (imageName) {
            Executor.runInTerminal(`docker push ${imageName}`);
            TelemetryClient.sendEvent("pushDockerImage.end");
        }
    }

    private async generateDeploymentAndBuildSet(templateFile: string,
                                                moduleToImageMap: Map<string, string>,
                                                imageToDockerfileMap: Map<string, string>): Promise<Set<string>> {
        const slnPath: string = path.dirname(templateFile);
        const configPath = path.join(slnPath, Constants.outputConfig);
        const deployFile = path.join(configPath, Constants.deploymentFile);
        await fse.remove(deployFile);

        await this.setSlnModulesMap(slnPath, moduleToImageMap, imageToDockerfileMap);
        const data: string = await fse.readFile(templateFile, "utf8");
        const buildSet: Set<string> = new Set();
        const moduleExpanded: string = Utility.expandModules(data, moduleToImageMap, buildSet);
        const exceptStr: Set<string> = new Set<string>();
        exceptStr.add("$edgeHub");
        exceptStr.add("$edgeAgent");
        exceptStr.add("$upstream");
        const generatedDeployFile: string = Utility.expandEnv(moduleExpanded, exceptStr);
        // generate config file
        await fse.ensureDir(configPath);
        await fse.writeFile(deployFile, generatedDeployFile, "utf8");
        return buildSet;
    }

    private constructBuildCmd(dockerfilePath: string, imageName: string, contextDir: string): string {
        return `docker build --rm -f \"${Utility.adjustFilePath(dockerfilePath)}\" -t ${imageName} \"${Utility.adjustFilePath(contextDir)}\"`;
    }

    private constructPushCmd(imageName: string) {
        return `docker push ${imageName}`;
    }

    private async setSlnModulesMap(slnPath: string,
                                   moduleToImageMap: Map<string, string>,
                                   imageToDockerfileMap: Map<string, string>): Promise<void> {
        const modulesPath: string  = path.join(slnPath, Constants.moduleFolder);
        const stat: fse.Stats = await fse.lstat(modulesPath);
        if (!stat.isDirectory()) {
            throw new Error("no modules folder");
        }

        const moduleDirs: string[] = await Utility.getSubDirectories(modulesPath);
        await Promise.all(
            moduleDirs.map(async (module) => {
                await this.setModuleMap(module, moduleToImageMap, imageToDockerfileMap);
            }),
        );
    }

    private async setModuleMap(modulePath: string,
                               moduleToImageMap: Map<string, string>,
                               imageToDockerfileMap: Map<string, string>): Promise<void> {
        const moduleFile = path.join(modulePath, Constants.moduleManifest);
        const name: string = path.basename(modulePath);
        if (await fse.exists(moduleFile)) {
            const module = await fse.readJson(moduleFile);
            const platformKeys: string[] = Object.keys(module.image.tag.platforms);
            const repo: string = module.image.repository;
            const version: string = module.image.tag.version;
            platformKeys.map((platform) => {
                const moduleKey: string  = Utility.getModuleKey(name, platform);
                const image: string = Utility.getImage(repo, version, platform);
                moduleToImageMap.set(moduleKey, image);
                imageToDockerfileMap.set(image, path.join(modulePath, module.image.tag.platforms[platform]));
            });
        }
    }

    private async promptForImageName(): Promise<string> {
        const imageNameCache: string = this.workspaceState.get<string>(Constants.lastUsedImageNameCacheKey);

        let imageName: string = await vscode.window.showInputBox({
            prompt: "Enter image name",
            value: imageNameCache,
            placeHolder: "E.g., myregistry.azurecr.io/myedgemodule:latest",
            ignoreFocusOut: true,
        });

        if (imageName !== undefined) {
            imageName = imageName.trim();
            if (imageName === "") {
                vscode.window.showErrorMessage("Image name cannot be empty");
            } else if (imageName) {
                this.workspaceState.update(Constants.lastUsedImageNameCacheKey, imageName);
            }
        }

        return imageName;
    }
}
