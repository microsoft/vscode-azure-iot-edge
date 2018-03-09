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
            const moduleConfig = await Utility.readJsonAndExpandEnv(moduleConfigFilePath, "$schema");
            const platforms = moduleConfig.image.tag.platforms;
            const platform = await vscode.window.showQuickPick(Object.keys(platforms), { placeHolder: Constants.selectPlatform, ignoreFocusOut: true });
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

    public async buildSolution(templateUri?: vscode.Uri): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.buildSolutionEvent}.selectTemplate`);
        if (!templateFile) {
            vscode.window.showInformationMessage(Constants.noSolutionFileMessage);
            return;
        }
        await this.createDeploymentFile(templateFile, true);
        vscode.window.showInformationMessage(Constants.manifestGeneratedWithBuild);
    }

    public async generateDeployment(templateUri?: vscode.Uri): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.generateDeploymentEvent}.selectTemplate`);
        if (!templateFile) {
            vscode.window.showInformationMessage(Constants.noSolutionFileMessage);
            return;
        }
        await this.createDeploymentFile(templateFile, false);
        vscode.window.showInformationMessage(Constants.manifestGenerated);
    }

    private async createDeploymentFile(templateFile: string, build: boolean = true) {
        const moduleToImageMap: Map<string, string> = new Map();
        const imageToDockerfileMap: Map<string, string> = new Map();
        const slnPath: string = path.dirname(templateFile);
        await this.setSlnModulesMap(slnPath, moduleToImageMap, imageToDockerfileMap);
        const deployFile: string = path.join(slnPath, Constants.outputConfig, Constants.deploymentFile);
        const generatedDeployment: string = await this.generateDeploymentString(templateFile, deployFile, moduleToImageMap);

        if (!build) {
            return;
        }

        // build docker images
        const buildMap: Map<string, string> = this.getBuildMapFromDeployment(generatedDeployment, imageToDockerfileMap);
        const commands: string[] = [];
        buildMap.forEach((dockerFile, image) => {
            const context = path.dirname(dockerFile);
            commands.push(this.constructBuildCmd(dockerFile, image, context));
            commands.push(this.constructPushCmd(image));
        });
        Executor.runInTerminal(Utility.combineCommands(commands));
    }

    private async generateDeploymentString(templateFile: string,
                                           deployFile: string,
                                           moduleToImageMap: Map<string, string>): Promise<string> {
        const configPath = path.dirname(deployFile);
        await fse.remove(deployFile);

        const data: string = await fse.readFile(templateFile, "utf8");
        const buildSet: Set<string> = new Set();
        const moduleExpanded: string = Utility.expandModules(data, moduleToImageMap);
        const exceptStr = ["$edgeHub", "$edgeAgent", "$upstream"];
        const generatedDeployFile: string = Utility.expandEnv(moduleExpanded, ...exceptStr);
        // generate config file
        await fse.ensureDir(configPath);
        await fse.writeFile(deployFile, generatedDeployFile, "utf8");
        return generatedDeployFile;
    }

    private getBuildMapFromDeployment(dpManifestStr: string, imageToDockerfileMap: Map<string, string>): Map<string, string> {
        try {
            const buildMap: Map<string, string> = new Map<string, string>();
            const manifestObj = JSON.parse(dpManifestStr);
            const modules = manifestObj.moduleContent.$edgeAgent["properties.desired"].modules;
            for (const m in modules) {
                if (modules.hasOwnProperty(m)) {
                    let image: string;
                    try {
                        image = modules[m].settings.image;
                    } catch (e) {}
                    if (image && imageToDockerfileMap.get(image) !== undefined) {
                        buildMap.set(image, imageToDockerfileMap.get(image));
                    }
                }
            }
            return buildMap;
        } catch (err) {
            throw new Error("Cannot parse deployment manifest");
        }
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
            const module = await Utility.readJsonAndExpandEnv(moduleFile);
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
}
