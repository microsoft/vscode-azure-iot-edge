// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

export class Constants {
    public static ExtensionId = "vsciot-vscode.azure-iot-edge";
    public static deploymentFile = "deployment.json";
    public static launchFile = "launch.json";
    public static dockerfileNamePattern = "**/[dD]ocker[fF]ile*";
    public static dotNetProjectFileNamePattern = "**/*.{csproj,fsproj}";
    public static moduleConfigFileNamePattern = "**/module.json";
    public static moduleConfigFile = "Module Config file";
    public static deploymentTemplatePattern = "**/deployment.template.json";
    public static debugDeploymentTemplatePattern = "**/deployment.debug.template.json";
    public static tsonPattern = "**/*.template.json";
    public static tson = ".template.json";
    public static deploymentTemplateDesc = "Deployment Template file";
    public static deploymentFilePattern = "**/deployment.json";
    public static deploymentFileDesc = "Deployment Manifest file";
    public static EdgeDebugSessionPrefix = "Debug IoT Edge";
    public static moduleNamePlaceholder = "%MODULE%";
    public static moduleImagePlaceholder = "%MODULE_IMAGE%";
    public static moduleFolderPlaceholder = "%MODULE_FOLDER%";
    public static appFolder = "%APP_FOLDER%";
    public static groupIDPlaceholder = "%GROUP_ID%";
    public static repositoryPlaceholder = "%REPOSITORY%";
    public static dllPlaceholder = "%DLLNAME%";
    public static imagePlaceholderPattern: RegExp = new RegExp(/\${MODULES\..+}/g);
    public static assetsFolder = "assets";
    public static solutionFolder = "solution";
    public static LANGUAGE_CSHARP = "C# Module";
    public static LANGUAGE_NODE = "Node.js Module";
    public static LANGUAGE_PYTHON = "Python Module";
    public static LANGUAGE_C = "C Module";
    public static LANGUAGE_JAVA = "Java Module";
    public static CSHARP_FUNCTION = "Azure Functions - C#";
    public static MACHINE_LEARNING = "Azure Machine Learning";
    public static STREAM_ANALYTICS = "Azure Stream Analytics";
    public static ACR_MODULE = "Existing Module (Import from ACR)";
    public static EXISTING_MODULE = "Existing Module (Enter Full Image URL)";
    public static LANGUAGE_CSHARP_DESCRIPTION = "Use Azure IoT C# SDK to build a module";
    public static LANGUAGE_NODE_DESCRIPTION = "Use Azure IoT Node.js SDK to build a module";
    public static LANGUAGE_PYTHON_DESCRIPTION = "Use Azure IoT Python SDK to build a module";
    public static LANGUAGE_C_DESCRIPTION = "Use Azure IoT C SDK to build a module";
    public static LANGUAGE_JAVA_DESCRIPTION = "Use Azure IoT Java SDK to build a module";
    public static CSHARP_FUNCTION_DESCRIPTION = "Create an Azure Function and deploy to IoT Edge";
    public static MACHINE_LEARNING_DESCRIPTION = "Deploy Azure Machine Learning images to Azure IoT Edge";
    public static STREAM_ANALYTICS_DESCRIPTION = "Deploy Azure Stream Analytics to Azure IoT Edge";
    public static ACR_MODULE_DESCRIPTION = "Import an existing module image from your Azure Container Registry";
    public static EXISTING_MODULE_DESCRIPTION = "Import an existing module image from any container registry";
    public static moduleFolder = "modules";
    public static gitIgnore = ".gitignore";
    public static deploymentTemplate = "deployment.template.json";
    public static deploymentDebugTemplate = "deployment.debug.template.json";
    public static userCancelled = "Cancelled by user";
    public static edgeDisplayName = "Azure IoT Edge";
    public static solutionName = "Solution Name";
    public static solutionNamePrompt = "Provide a Solution Name";
    public static solutionNameDft = "EdgeSolution";
    public static moduleName = "Module Name";
    public static moduleNamePrompt = "Provide a Module Name";
    public static moduleNameDft = "SampleModule";
    public static registryPlaceholder = "<registry>";
    public static repoNamePlaceholder = "<repo-name>";
    public static tagPlaceholder = "<tag>";
    public static repositoryPattern = `${Constants.registryPlaceholder}/${Constants.repoNamePlaceholder}`;
    public static repositoryPrompt = "Provide Docker Image Repository for the Module";
    public static imagePattern = `${Constants.registryPlaceholder}/${Constants.repoNamePlaceholder}:${Constants.tagPlaceholder}`;
    public static imagePrompt = "Provide Docker Image for the Module";
    public static selectTemplate = "Select Module Template";
    public static parentFolderLabel = "Select Folder";
    public static moduleManifest = "module.json";
    public static outputConfig = "config";
    public static vscodeFolder = ".vscode";
    public static buildModuleImageEvent = "buildModuleImage";
    public static buildAndPushModuleImageEvent = "buildAndPushModuleImage";
    public static buildSolutionEvent = "buildSolution";
    public static runSolutionEvent = "runSolution";
    public static generateDeploymentEvent = "generateDeployment";
    public static addModuleEvent = "addModule";
    public static launchCSharp = "launch_csharp.json";
    public static launchNode = "launch_node.json";
    public static launchC = "launch_c.json";
    public static launchJava = "launch_java.json";
    public static launchPython = "launch_python.json";
    public static noSolutionFileWithModulesFolder = "No solution file for the selected modules folder can be found in workspace.";
    public static selectPlatform = "Select Platform";
    // the last item is the module name enterred by the user which cannot be determined yet and will be skipped for checking
    public static moduleDeploymentManifestJsonPath = ["modulesContent", "$edgeAgent", "properties.desired", "modules", "*"];
    public static moduleNameDeploymentManifestJsonPathIndex = 4;
    // the 4th item is the module name enterred by the user which cannot be determined yet and will be skipped for checking
    public static imgDeploymentManifestJsonPath = ["modulesContent", "$edgeAgent", "properties.desired", "modules", "*", "settings", "image"];
    // the last item is the route name enterred by the user which cannot be determined yet and will be skipped for checking
    public static routeDeploymentManifestJsonPath = ["modulesContent", "$edgeHub", "properties.desired", "routes", "*"];
    public static moduleTypes = ["docker"];
    public static moduleStatuses = ["running", "stopped"];
    public static moduleRestartPolicies = ["always", "never", "on-failed", "on-unhealthy"];
    public static moduleSnippetLabel = "edgeModule";
    public static moduleSnippetDetail = "Module for edgeAgent to start";
    public static routeSnippetLabel = "edgeRoute";
    public static routeSnippetDetail = "Route for the Edge Hub. Route name is used as the key for the route. To delete a route, set the route name as null";
    public static platformModuleManifestJsonPath = ["image", "tag", "platforms", "*"];
    public static setRegistryEnvNotification = "Please set container registry credentials to .env file";
    public static acrEnvSet = "ACR credentials have been set in .env file";
    public static envFile = ".env";
    public static inputNamePrompt = "Provide the input names of the module to handle message";
    public static inputNamePattern = "input1,input2,input3";
    public static moduleSchemaVersion = "$schema-version";
    public static groupId = "groupId";
    public static defPlatformConfig = "defaultPlatform";
    public static platformsConfig = "platforms";
    public static thirdPartyModuleTemplatesConfig = "3rdPartyModuleTemplates";
    public static platformKey = "platform";
    public static aliasKey = "alias";
    public static TwinValueMaxSize = 512;
    public static TwinValueMaxChunks = 8;
    public static SchemaTemplate = "$schema-template";
    public static platformStatusBarTooltip = "Default Platform of IoT Edge Solution";
    public static moduleNameSubstitution = "${moduleName}";
    public static repositoryNameSubstitution = "${repositoryName}";
    public static acrRegistryDesc = "Azure Container Registry";
    public static amlWorkspaceDesc = "Azure Machine Learning Workspace";
    public static asaJobDesc = "Azure Stream Analytics Job";
    public static amlApiVersion: string = "2018-03-01-preview";
}

export enum ContainerState {
    Running,
    NotRunning,
    NotFound,
}
