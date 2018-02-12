"use strict";

export class Constants {
    public static ExtensionId = "vsciot-vscode.azure-iot-edge";
    public static AIKey = "fed7fc65-5b4a-4e66-9d46-c5f016d4e2b4";
    public static IotHubConnectionStringKey = "iotHubConnectionString";
    public static deploymentFile = "deployment.json";
    public static routesFile = "routes.json";
    public static launchFile = "launch.json";
    public static dockerfileNamePattern = "**/[dD]ocker[fF]ile*";
    public static dotNetProjectFileNamePattern = "**/*.{csproj,fsproj}";
    public static moduleConfigFileNamePattern = "**/module.json";
    public static deploymentTemplatePattern = "**/deployment.template.json";
    public static EdgeDebugSessions = ["Debug IoT Edge Module (.NET Core)", "Debug IoT Edge Function (.NET Core)"];
    public static lastUsedImageNameCacheKey = "azureIotEdge.lastUsedImageName";
    public static moduleNamePlaceholder = "%MODULE%";
    public static moduleImagePlaceholder = "%MODULE_IMAGE%";
    public static moduleFolderPlaceholder = "%MODULE_FOLDER%";
    public static appFolder = "%APP_FOLDER%";
    public static assetsFolder = "assets";
    public static solutionFolder = "solution";
    public static LANGUAGE_CSHARP = "csharp";
    public static CSHARP_FUNCTION = "csharp function";
    public static LANGUAGE_PYTHON = "python";
    public static moduleFolder = "modules";
    public static gitIgnore = ".gitignore";
    public static deploymentTemplate = "deployment.template.json";
    public static userCancelled = "Cancelled by user";
    public static edgeChannel = "Azure IoT Edge";
    public static solutionName = "Solution Name";
    public static solutionNamePrompt = "Provide a Solution Name";
    public static solutionNameDft = "EdgeSolution";
    public static moduleName = "Module Name";
    public static moduleNamePrompt = "Provide a Module Name";
    public static moduleNameDft = "SampleModule";
    public static repositoryPattern = "<registry>/<repo-name>";
    public static repositoryPrompt = "Provide Module Repository";
    public static selectTemplate = "Select module template";
    public static parentFolderLabel = "Create Under";
    public static moduleManifest = "module.json";
    public static outputConfig = ".config";
    public static vscodeFolder = ".vscode";
    public static moduleConfigFile = "Module Config file";
    public static deploymentTemplateDesc = "Deployment Template file";
    public static buildModuleImageEvent = "buildModuleImage";
    public static buildAndPushModuleImageEvent = "buildAndPushModuleImage";
    public static buildSolutionEvent = "buildSolution";
    public static launchCSharp = "launch_csharp.json";
}
