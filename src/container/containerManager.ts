// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import {BuildSettings} from "../common/buildSettings";
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
            const moduleConfig = await Utility.readJsonAndExpandEnv(moduleConfigFilePath, Constants.moduleSchemaVersion);
            const platforms = moduleConfig.image.tag.platforms;
            const platform = await vscode.window.showQuickPick(Object.keys(platforms), { placeHolder: Constants.selectPlatform, ignoreFocusOut: true });
            if (platform) {
                const dockerfilePath = path.join(directory, platforms[platform]);
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

    public async buildSolution(templateUri?: vscode.Uri, push: boolean = true, run: boolean = false): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.buildSolutionEvent}.selectTemplate`);
        if (!templateFile) {
            return;
        }
        await this.createDeploymentFile(templateFile, true, push, run);
        vscode.window.showInformationMessage(Constants.manifestGeneratedWithBuild);
    }

    public async runSolution(deployFileUri?: vscode.Uri, commands: string[] = []): Promise<void> {
        const deployFile: string = await Utility.getInputFilePath(deployFileUri,
            Constants.deploymentFilePattern,
            Constants.deploymentFileDesc,
            `${Constants.runSolutionEvent}.selectDeploymentFile`);
        if (!deployFile) {
            return;
        }

        commands.push(this.constructRunCmd(deployFile));
        Executor.runInTerminal(Utility.combineCommands(commands), this.getRunCmdTerminalTitle());
    }

    public async stopSolution(): Promise<void> {
        Executor.runInTerminal(Utility.adjustTerminalCommand(`iotedgehubdev stop`));
    }

    public async generateDeployment(templateUri?: vscode.Uri): Promise<void> {
        const templateFile: string = await Utility.getInputFilePath(templateUri,
            Constants.deploymentTemplatePattern,
            Constants.deploymentTemplateDesc,
            `${Constants.generateDeploymentEvent}.selectTemplate`);
        if (!templateFile) {
            return;
        }
        await this.createDeploymentFile(templateFile, false);
        vscode.window.showInformationMessage(Constants.manifestGenerated);
    }

    private async createDeploymentFile(templateFile: string, build: boolean = true, push: boolean = true, run: boolean = false) {
        const moduleToImageMap: Map<string, string> = new Map();
        const imageToBuildSettings: Map<string, BuildSettings> = new Map();
        const slnPath: string = path.dirname(templateFile);
        await Utility.loadEnv(path.join(slnPath, Constants.envFile));
        await Utility.setSlnModulesMap(slnPath, moduleToImageMap, imageToBuildSettings);
        const deployFile: string = path.join(slnPath, Constants.outputConfig, Constants.deploymentFile);
        const dpManifest: any = await this.generateDeploymentString(templateFile, deployFile, moduleToImageMap);

        if (!build) {
            return;
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
            return this.runSolution(vscode.Uri.file(deployFile), commands);
        }

        Executor.runInTerminal(Utility.combineCommands(commands));
    }

    private async generateDeploymentString(templateFile: string,
                                           deployFile: string,
                                           moduleToImageMap: Map<string, string>): Promise<any> {
        const configPath = path.dirname(deployFile);
        await fse.remove(deployFile);

        const data: string = await fse.readFile(templateFile, "utf8");
        const moduleExpanded: string = Utility.expandModules(data, moduleToImageMap);
        const exceptStr = ["$edgeHub", "$edgeAgent", "$upstream"];
        const generatedDeployFile: string = Utility.expandEnv(moduleExpanded, ...exceptStr);
        const dpManifest = Utility.updateSchema(JSON.parse(generatedDeployFile));
        // generate config file
        await fse.ensureDir(configPath);
        await fse.writeFile(deployFile, JSON.stringify(dpManifest, null, 2), { encoding: "utf8" });
        return dpManifest;
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

    private constructRunCmd(deployFile: string): string {
        return Utility.adjustTerminalCommand(`iotedgehubdev start -d "${deployFile}" -v`);
    }

    // A temporary hack to keep the command running in a dedicated terminal
    private getRunCmdTerminalTitle(): string {
        return Constants.edgeDisplayName + " Solution Status";
    }
}
