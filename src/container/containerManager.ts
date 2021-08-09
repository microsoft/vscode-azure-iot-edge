// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { BuildSettings } from "../common/buildSettings";
import { Constants } from "../common/constants";
import { Executor } from "../common/executor";
import { Platform } from "../common/platform";
import { Utility } from "../common/utility";
import { Simulator } from "../edge/simulator";

export class ContainerManager {
    constructor(private simulator: Simulator) {}

    public async buildModuleImage(fileUri?: vscode.Uri, pushImage: boolean = false) {
        const event = pushImage ? Constants.buildAndPushModuleImageEvent : Constants.buildModuleImageEvent;
        const moduleConfigFilePath: string = await Utility.getInputFilePath(fileUri, Constants.moduleConfigFileNamePattern, Constants.moduleConfigFile, `${event}.selectModuleConfigFile`);

        if (moduleConfigFilePath) {
            const directory = path.dirname(moduleConfigFilePath);
            await Utility.loadEnv(path.join(directory, "..", "..", Constants.envFile));
            const overrideEnvs = await Utility.parseEnv(path.join(directory, Constants.envFile));
            const moduleConfig = await Utility.readJsonAndExpandEnv(moduleConfigFilePath, overrideEnvs, Constants.moduleSchemaVersion);
            const platforms = moduleConfig.image.tag.platforms;
            const platform = await vscode.window.showQuickPick(Object.keys(platforms), { placeHolder: Constants.selectPlatform, ignoreFocusOut: true });
            if (platform) {
                const dockerfilePath = path.resolve(directory, platforms[platform]);
                const imageName = Utility.getImage(moduleConfig.image.repository, moduleConfig.image.tag.version, platform);
                const buildSettings = Utility.getBuildSettings(directory, dockerfilePath, moduleConfig.image.buildOptions, moduleConfig.image.contextPath);
                const buildCommand = this.constructBuildCmd(imageName, buildSettings);
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

    public async buildSolution(outputChannel: vscode.OutputChannel, templateUri?: vscode.Uri, push: boolean = true, run: boolean = false): Promise<void> {
        const pattern = `{${Constants.deploymentJsonPattern}}`;
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            pattern,
            Constants.deploymentTemplateDesc,
            `${Constants.buildSolutionEvent}.selectTemplate`);
        if (!templateFile) {
            return;
        }
        const deployFile = await this.createDeploymentFile(outputChannel, templateFile, true, push, run);
        vscode.window.showInformationMessage(`Deployment manifest generated at ${deployFile}. Module images are being built`);
    }

    public async generateDeployment(outputChannel: vscode.OutputChannel, templateUri?: vscode.Uri): Promise<void> {
        const pattern = `{${Constants.deploymentJsonPattern}}`;
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            pattern,
            Constants.deploymentTemplateDesc,
            `${Constants.generateDeploymentEvent}.selectTemplate`);
        if (!templateFile) {
            return;
        }
        const deployFile = await this.createDeploymentFile(outputChannel, templateFile, false);
        vscode.window.showInformationMessage(`Deployment manifest generated at ${deployFile}.`);
    }

    private async createDeploymentFile(outputChannel: vscode.OutputChannel, templateFile: string, build: boolean = true, push: boolean = true, run: boolean = false): Promise<string> {
        const moduleToImageMap: Map<string, string> = new Map();
        const imageToBuildSettings: Map<string, BuildSettings> = new Map();
        const slnPath: string = path.dirname(templateFile);
        await Utility.loadEnv(path.join(slnPath, Constants.envFile));
        await Utility.setSlnModulesMap(templateFile, moduleToImageMap, imageToBuildSettings);
        const configPath: string = path.join(slnPath, Constants.outputConfig);
        const deployment: any = await this.generateDeploymentInfo(templateFile, configPath, moduleToImageMap);
        const dpManifest: any = deployment.manifestObj;
        const deployFile: string = deployment.manifestFile;

        if (!build) {
            return deployFile;
        }

        // build docker images
        const buildMap: Map<string, any> = this.getBuildMapFromDeployment(dpManifest, imageToBuildSettings);
        const commands: string[] = [];
        await Utility.initLocalRegistry([...buildMap.keys()]);
        buildMap.forEach((buildSettings, image) => {
            commands.push(this.constructBuildCmd(image, buildSettings));
            if (push) {
                commands.push(this.constructPushCmd(image));
            }
        });

        if (run) {
            await this.simulator.runSolution(outputChannel, vscode.Uri.file(deployFile), commands);
            return deployFile;
        }

        Executor.runInTerminal(Utility.combineCommands(commands));
        return deployFile;
    }

    private async generateDeploymentInfo(templateFile: string,
                                         configPath: string,
                                         moduleToImageMap: Map<string, string>): Promise<any> {
        const data: any = await fse.readJson(templateFile);
        const moduleExpanded: string = Utility.expandModules(data, moduleToImageMap);
        const exceptStr = ["$edgeHub", "$edgeAgent", "$upstream", Constants.SchemaTemplate];
        const generatedDeployFile: string = Utility.expandEnv(moduleExpanded, {}, ...exceptStr);
        const dpManifest = Utility.convertCreateOptions(Utility.updateSchema(JSON.parse(generatedDeployFile)));
        const templateSchemaVersion = dpManifest[Constants.SchemaTemplate];
        delete dpManifest[Constants.SchemaTemplate];
        // generate config file
        await fse.ensureDir(configPath);
        const templateFileName = path.basename(templateFile);
        const deploymentFileName = this.getDeployFileName(templateFileName, templateSchemaVersion);
        const deployFile = path.join(configPath, deploymentFileName);
        await fse.remove(deployFile);
        await fse.writeFile(deployFile, JSON.stringify(dpManifest, null, 2), { encoding: "utf8" });
        return {
            manifestObj: dpManifest,
            manifestFile: deployFile,
        };
    }

    private getDeployFileName(templateFileName: string, templateSchemaVersion: string): string {
        const platform = templateSchemaVersion > "0.0.1" ? `.${Platform.getDefaultPlatform().platform}` : "";
        let name: string = templateFileName;
        const tempLength = templateFileName.length;
        if (templateFileName.endsWith(Constants.tson)) {
            name = templateFileName.substr(0, tempLength - Constants.tson.length);
        } else if (templateFileName.endsWith(".json")) {
            name = templateFileName.substr(0, tempLength - ".json".length);
        }
        return `${name}${platform}.json`;
    }

    private getBuildMapFromDeployment(manifestObj: any,
                                      imageToBuildSettings: Map<string, BuildSettings>): Map<string, BuildSettings> {
        try {
            const buildMap: Map<string, any> = new Map<string, any>();
            const modules = manifestObj.modulesContent.$edgeAgent["properties.desired"].modules;
            for (const m in modules) {
                if (modules.hasOwnProperty(m)) {
                    let image: string;
                    try {
                        image = modules[m].settings.image;
                    } catch (e) { }
                    if (image && imageToBuildSettings.get(image) !== undefined) {
                        buildMap.set(image, imageToBuildSettings.get(image));
                    }
                }
            }
            return buildMap;
        } catch (err) {
            throw new Error("Cannot parse deployment manifest");
        }
    }

    private constructBuildCmd(imageName: string, buildSettings: BuildSettings): string {
        let optionString: string = "";
        if (buildSettings.options !== undefined) {
            const filteredOption = buildSettings.options.filter((value, index) => {
                const trimmed = value.trim();
                const parsedOption: string[] = trimmed.split(/\s+/g);
                return parsedOption.length > 0 && ["--rm", "--tag", "-t", "--file", "-f"].indexOf(parsedOption[0]) < 0;
            });
            optionString = filteredOption.join(" ");
        }
        return `docker build ${optionString} --rm -f \"${Utility.adjustFilePath(buildSettings.dockerFile)}\" -t ${imageName} \"${Utility.adjustFilePath(buildSettings.contextPath)}\"`;
    }

    private constructPushCmd(imageName: string): string {
        return `docker push ${imageName}`;
    }
}
