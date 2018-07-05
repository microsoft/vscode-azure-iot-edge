// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { Utility } from "../common/utility";

export class ContainerManager {
    public async buildModuleImage(fileUri?: vscode.Uri, pushImage: boolean = false) {
        const event = pushImage ? Constants.buildAndPushModuleImageEvent : Constants.buildModuleImageEvent;
        const moduleConfigFilePath: string = await Utility.getInputFilePath(fileUri, Constants.moduleConfigFileNamePattern, Constants.moduleConfigFile, `${event}.selectModuleConfigFile`);

        if (moduleConfigFilePath) {
            const directory = path.dirname(moduleConfigFilePath);
            await Utility.loadEnv(path.join(directory, "..", "..", Constants.envFile));
            const moduleConfig = await Utility.readJsonAndExpandEnv(moduleConfigFilePath, "$schema");
            const platforms = moduleConfig.image.tag.platforms;
            const platform = await vscode.window.showQuickPick(Object.keys(platforms), { placeHolder: Constants.selectPlatform, ignoreFocusOut: true });
            if (platform) {
                const dockerfilePath = path.join(directory, platforms[platform]);
                const imageName = Utility.getImage(moduleConfig.image.repository, moduleConfig.image.tag.version, platform);
                const options = moduleConfig.image.buildOptions;
                const optionArray: string[] = options && options instanceof Array ? options : undefined;
                const buildCommand = this.constructBuildCmd(dockerfilePath, imageName, directory, optionArray);
                if (pushImage) {
                    await Utility.initLocalRegistry([imageName]);
                    const pushCommand = this.constructPushCmd(imageName);
                    Executor.runInTerminal(Utility.combineCommands([buildCommand, pushCommand]));
                } else {
                    Executor.runInTerminal(buildCommand);
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
            vscode.window.showInformationMessage(Constants.noSolutionFileMessage);
            return;
        }
        await this.createDeploymentFile(templateFile, true);
        vscode.window.showInformationMessage(Constants.manifestGeneratedWithBuild);
    }

    public async runSolution(templateUri?: vscode.Uri): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.runSolutionEvent}.selectTemplate`);
        if (!templateFile) {
            vscode.window.showInformationMessage(Constants.noSolutionFileMessage);
            return;
        }
        await this.createDeploymentFile(templateFile, false);
        vscode.window.showInformationMessage(Constants.manifestGenerated);

        const slnPath: string = path.dirname(templateFile);
        const deployFile: string = path.join(slnPath, Constants.outputConfig, Constants.deploymentFile);

        Executor.runInTerminal(`iotedgehubdev start -d ${deployFile}`);
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
        const imageToBuildOptions: Map<string, string[]> = new Map();
        const slnPath: string = path.dirname(templateFile);
        await Utility.loadEnv(path.join(slnPath, Constants.envFile));
        await Utility.setSlnModulesMap(slnPath, moduleToImageMap, imageToDockerfileMap, imageToBuildOptions);
        const deployFile: string = path.join(slnPath, Constants.outputConfig, Constants.deploymentFile);
        const generatedDeployment: string = await this.generateDeploymentString(templateFile, deployFile, moduleToImageMap);

        if (!build) {
            return;
        }

        // build docker images
        const buildMap: Map<string, any> = this.getBuildMapFromDeployment(generatedDeployment, imageToDockerfileMap, imageToBuildOptions);
        const commands: string[] = [];
        await Utility.initLocalRegistry([...buildMap.keys()]);
        buildMap.forEach((buildSetting, image) => {
            const context = path.dirname(buildSetting.dockerFile);
            commands.push(this.constructBuildCmd(buildSetting.dockerFile, image, context, buildSetting.buildOption));
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

    private getBuildMapFromDeployment(dpManifestStr: string,
                                      imageToDockerfileMap: Map<string, string>,
                                      imageToBuildOptions: Map<string, string[]>): Map<string, any> {
        try {
            const buildMap: Map<string, any> = new Map<string, any>();
            const manifestObj = JSON.parse(dpManifestStr);
            const modules = manifestObj.moduleContent.$edgeAgent["properties.desired"].modules;
            for (const m in modules) {
                if (modules.hasOwnProperty(m)) {
                    let image: string;
                    try {
                        image = modules[m].settings.image;
                    } catch (e) { }
                    if (image && imageToDockerfileMap.get(image) !== undefined) {
                        const buildSetting = {
                            dockerFile: imageToDockerfileMap.get(image),
                            buildOption: imageToBuildOptions.get(image),
                        };
                        buildMap.set(image, buildSetting);
                    }
                }
            }
            return buildMap;
        } catch (err) {
            throw new Error("Cannot parse deployment manifest");
        }
    }

    private constructBuildCmd(dockerfilePath: string, imageName: string, contextDir: string, extraOptions?: string[]): string {
        let optionString: string = "";
        if (extraOptions !== undefined) {
            const filteredOption = extraOptions.filter((value, index) => {
                const trimmed = value.trim();
                const parsedOption: string[] = trimmed.split(/\s+/g);
                return parsedOption.length > 0 && ["--rm", "--tag", "-t", "--file", "-f"].indexOf(parsedOption[0]) < 0;
            });
            optionString = filteredOption.join(" ");
        }
        return `docker build ${optionString} --rm -f \"${Utility.adjustFilePath(dockerfilePath)}\" -t ${imageName} \"${Utility.adjustFilePath(contextDir)}\"`;
    }

    private constructPushCmd(imageName: string) {
        return `docker push ${imageName}`;
    }
}
