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
    public static deploymentJsonPattern = "**/deployment.*.template.json,**/deployment.template.json";
    public static tson = ".template.json";
    public static deploymentTemplateDesc = "Deployment Template file";
    public static deploymentFilePattern = "**/deployment.json";
    public static deploymentFileDesc = "Deployment Manifest file";
    public static moduleNamePlaceholder = "%MODULE%";
    public static moduleImagePlaceholder = "%MODULE_IMAGE%";
    public static moduleFolderPlaceholder = "%MODULE_FOLDER%";
    public static csharpModuleTargetFrameworkPlaceHolder = "%TARGET_FRAMEWORK%";
    public static csharpProjectFlieExtensionName = ".csproj";
    public static appFolder = "%APP_FOLDER%";
    public static groupIDPlaceholder = "%GROUP_ID%";
    public static repositoryPlaceholder = "%REPOSITORY%";
    public static dllPlaceholder = "%DLLNAME%";
    public static externalModulePlaceholderPattern: RegExp = new RegExp(/\${MODULEDIR<(.+)>(\..+)?}/g);
    public static imagePlaceholderPattern: RegExp = new RegExp(/\${MODULES\..+}|\${MODULEDIR<(.+)>(\..+)?}/g);
    public static versionPlaceholderPattern: RegExp = new RegExp(/\${VERSION\..+}/g);
    public static assetsFolder = "assets";
    public static solutionFolder = "solution";
    public static containersFolder = "containers";
    public static libraryScriptsFolder = "library-scripts";
    public static dotDevContainer = ".devcontainer";
    public static CONTAINER_C = "Cpp";
    public static CONTAINER_CSHARP = "CSharp";
    public static CONTAINER_JAVA = "Java";
    public static CONTAINER_NODE = "Node";
    public static CONTAINER_PYTHON = "Python";
    public static CONTAINER_C_DESCRIPTION = "Use C/C++ Dev Container";
    public static CONTAINER_CSHARP_DESCRIPTION = "Use C# .Net Dev Container";
    public static CONTAINER_JAVA_DESCRIPTION = "Use Java Dev Container";
    public static CONTAINER_NODE_DESCRIPTION = "Use Node.js Dev Container";
    public static CONTAINER_PYTHON_DESCRIPTION = "Use Python Dev Container";
    public static CHOICE_REPLACE = "Replace";
    public static CHOICE_REPLACE_DECRIPTION = "Replace existing Dev Container definitions";
    public static CHOICE_KEEP = "Keep";
    public static CHOICE_KEEP_DECRIPTION = "Keep existing Dev Container definitions";
    public static CHOICE_YES = "Yes";
    public static CHOICE_NO = "No";
    public static LANGUAGE_CSHARP = "C# Module";
    public static LANGUAGE_NODE = "Node.js Module";
    public static LANGUAGE_PYTHON = "Python Module";
    public static LANGUAGE_C = "C Module";
    public static LANGUAGE_JAVA = "Java Module";
    public static CSHARP_FUNCTION = "Azure Functions - C#";
    public static MACHINE_LEARNING = "Azure Machine Learning";
    public static STREAM_ANALYTICS = "Azure Stream Analytics";
    public static EVENT_GRID = "Azure Event Grid";
    public static ACR_MODULE = "Existing Module (Import from ACR)";
    public static EXISTING_MODULE = "Existing Module (Enter Full Image URL)";
    public static MARKETPLACE_MODULE = "Module from Azure Marketplace";
    public static EMPTY_SOLUTION = "Empty Solution";
    public static EMPTY_SLN_DESCRIPTION = "Create an empty Azure IoT Edge Solution without adding any module";
    public static LANGUAGE_CSHARP_DESCRIPTION = "Use Azure IoT C# SDK to build a module";
    public static LANGUAGE_NODE_DESCRIPTION = "Use Azure IoT Node.js SDK to build a module";
    public static LANGUAGE_PYTHON_DESCRIPTION = "Use Azure IoT Python SDK to build a module";
    public static LANGUAGE_C_DESCRIPTION = "Use Azure IoT C SDK to build a module";
    public static LANGUAGE_JAVA_DESCRIPTION = "Use Azure IoT Java SDK to build a module";
    public static CSHARP_FUNCTION_DESCRIPTION = "Create an Azure Function and deploy to IoT Edge";
    public static MACHINE_LEARNING_DESCRIPTION = "Deploy Azure Machine Learning images to Azure IoT Edge";
    public static STREAM_ANALYTICS_DESCRIPTION = "Deploy Azure Stream Analytics to Azure IoT Edge";
    public static EVENT_GRID_DESCRIPTION = "Deploy Azure Event Grid to Azure IoT Edge";
    public static ACR_MODULE_DESCRIPTION = "Import an existing module image from your Azure Container Registry";
    public static EXISTING_MODULE_DESCRIPTION = "Import an existing module image from any container registry";
    public static MARKETPLACE_MODULE_DESCRIPTION = "Import an existing module image from Azure Marketplace";
    public static EVENT_GRID_IMAGE = "mcr.microsoft.com/azure-event-grid/iotedge:latest";
    public static EVENT_GRID_CREATE_OPTIONS = {
        Env: [
            "inbound:clientAuth:clientCert:enabled=false",
            "inbound:serverAuth:tlsPolicy=enabled",
            "outbound:webhook:httpsOnly=false",
        ],
        HostConfig: {
            PortBindings: {
                "4438/tcp": [
                    {
                        HostPort: "4438",
                    },
                ],
            },
        },
    };
    public static SCAFFOLDING_PREREQUISITES = "Please make sure the prerequisites are installed";
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
    public static edgeRuntimeVersionPrompt = "Select Azure IoT Edge Runtime (Edge Hub and Edge Agent images) version";
    public static registryPlaceholder = "<registry>";
    public static repoNamePlaceholder = "<repo-name>";
    public static tagPlaceholder = "<tag>";
    public static repositoryPattern = `${Constants.registryPlaceholder}/${Constants.repoNamePlaceholder}`;
    public static repositoryPrompt = "Provide Docker Image Repository for the Module";
    public static imagePattern = `${Constants.registryPlaceholder}/${Constants.repoNamePlaceholder}:${Constants.tagPlaceholder}`;
    public static imagePrompt = "Provide Docker Image for the Module";
    public static selectTemplate = "Select Module Template";
    public static selectDevContainer = "Select Dev Container Type";
    public static parentFolderLabel = "Select Folder";
    public static moduleManifest = "module.json";
    public static outputConfig = "config";
    public static vscodeFolder = ".vscode";
    public static vscodeSettingsFile = "settings.json";
    public static buildModuleImageEvent = "buildModuleImage";
    public static buildAndPushModuleImageEvent = "buildAndPushModuleImage";
    public static buildSolutionEvent = "buildSolution";
    public static runSolutionEvent = "runSolution";
    public static generateDeploymentEvent = "generateDeployment";
    public static addModuleEvent = "addModule";
    public static selectEdgeRuntimeVerEvent = "selectEdgeVer";
    public static selectDevContainerEvent = "selectDevContainer";
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
    public static moduleRestartPolicies = ["always", "never", "on-failure", "on-unhealthy"];
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
    public static selectDefaultPlatform = "Select Azure IoT Edge Solution Default Platform";
    public static sampleName = "Solution Name";
    public static galleryPanelViewType = "IoTEdgeSamples";
    public static galleryPanelViewTitle = "Azure IoT Edge Samples";
    public static galleryAssetsFolder = "views";
    public static galleryIndexHtmlName = "gallery.html";
    public static marketplacePanelViewType = "IoT Edge Marketplace";
    public static marketplacePanelViewTitle = "IoT Edge Marketplace";

    public static versionEdgeAgent = "version.edgeAgent";
    public static versionEdgeHub = "version.edgeHub";
    public static versionEdgeRuntime = "version.supported.edgeRuntime";
    public static versionDefaultEdgeRuntime = "version.default.edgeRuntime";
    public static versionTempSensor = "version.tempSensor";
    public static versionCModule = "version.cmodule";
    public static versionPythonModule = "version.pythonmodule";
    public static versionCSharpModule = "version.csharpmodule";
    public static versionFunctionModule = "version.csfunctionmodule";
    public static versionJavaModule = "version.javamodule";
    public static versionNodeModule = "version.nodemodule";

    public static installCSharpModule = "templateInstall.csharpmodule";
    public static installCSFunctionModule = "templateInstall.csfunctionmodule";
    public static installNodeModule = "templateInstall.nodemodule";

    public static edgeAgentVerPlaceHolder = "VERSION.edgeAgent";
    public static edgeHubVerPlaceHolder = "VERSION.edgeHub";
    public static edgeAgentSchemaVerPlaceHolder = "SCHEMAVERSION.edgeAgent";
    public static edgeHubSchemaVerPlaceHolder = "SCHEMAVERSION.edgeHub";
    public static acrRegistryDesc = "Azure Container Registry";
    public static amlWorkspaceDesc = "Azure Machine Learning Workspace";
    public static asaJobDesc = "Azure Stream Analytics Job";
    public static amlApiVersion: string = "2018-03-01-preview";

    public static needSimulatorInstalledMsg = "You must have the 'iotedgehubdev' tool installed for IoT Edge Simulator.";
    public static updateSimulatorMsg = "Update your 'iotedgehubdev' tool to the latest for the best experience for IoT Edge Simulator.";
    public static failedInstallSimulator = "Failed to install 'iotedgehubdev' tool because of error:";
    public static outputNoSimulatorMsg = "Cannot execute command since 'iotedgehubdev' is not installed. Please install it first for IoT Edge Simulator.";
    public static outputSimulatorIsInstallingMsg = "'iotedgehubdev' is being installed now, and please wait for the installation.";
    public static downloadingAndInstallingStandaloneSimulatorMsg = "Downloading and installing Azure IoT EdgeHub Dev Tool (iotedgehubdev) version ";
    public static installStandaloneSimulatorFailedMsg = "Failed to install 'iotedgehubdev' tool, please check the output channel (Azure IoT Edge) for detailed error message.";
    public static unexpectedErrorWhenValidateSimulatorUpdate = "Unexpected errors occur when install / update 'iotedgehubdev': ";
    public static installManuallyMsg = "Please install 'iotedgehubdev' tool first for IoT Edge Simulator.";
    public static queryASAJobInfoFailedMsg = "The maximum retry count has been exceeded with empty response from the Stream Analytics.";
    public static needSetupSimulatorMsg = "Please setup iotedgehubdev first before starting simulator.";
    public static dockerNotInstalledErrorMsg = "Failed to connect to Docker. Is Docker installed?";
    public static dockerNotRunningErrorMsg = "Failed to connect to Docker. Is Docker running?";
    public static installDockerUrl = "https://docs.docker.com/install/";
    public static troubleShootingDockerUrl = "https://docs.docker.com/config/daemon/";
    public static commandNotFoundErrorMsgPatternOnWindows = "not recognized as an internal or external command";
    public static commandNotFoundErrorMsgPatternOnLinux = "command not found";
    public static dockerNotRunningErrorMsgPatternOnWindows = "This error may also indicate that the docker daemon is not running";
    public static dockerNotRunningErrorMsgPatternOnLinux = "Is the docker daemon running";
    public static permissionDeniedErrorMsgPatternOnLinux = "permission denied";
    public static connectionStringNotSetErrorMsgOnWindows = "Cannot find config file. You can press Ctrl + Shift + P to open command palette and run `Azure IoT Edge: Setup IoT Edge Simulator` to setup IoT Edge simulator first.\r\n";
    public static skipForNow = "Skip for Now";
    public static learnMore = "Learn More";
    public static install = "Install";
    public static Setup = "Setup";
    public static Cancel = "Cancel";
    public static TroubleShooting = "Troubleshooting";
    public static InstallDocker = "Install Docker";
    public static errorProperties = {
        error: "error",
        errorMessage: "errorMessage",
    };

    public static noWorkspaceSetDefaultPlatformMsg = "No workspace is opened for setting default platform. Please open a workspace and try again.";
    public static noWorkspaceMsg = "This extension only works when folders are opened.";

    public static canOnlyUseWithEdgeSolution = "This option is only available when an Azure IoT EdgeSolution is open.";
    public static containerDefinitionIsPresent = "This solution currently uses a Dev Container";
    public static reloadInDevContainer = "Reload Workspace in Dev Container";

    public static openSampleEvent = "openSample";
    public static openSampleUrlEvent = "openSampleUrl";

    public static isInternalPropertyName = "isInternal";

    public static subModuleKeyPrefixTemplate(name: string): string {
        return `MODULES.${name}`;
    }

    public static extModuleKeyPrefixTemplate(dir: string): string {
        return `MODULEDIR<${dir}>`;
    }

    public static newASAJobAvailableMsg(asaModuleName: string): string {
        return `Configurations of Stream Analytics Job "${asaModuleName}" have been changed, do you want to update them now?`;
    }

    public static noNewASAJobFoundMsg(asaModuleName: string): string {
        return `No configuration changes have been found for Stream Analytics Job: "${asaModuleName}".`;
    }
}

export enum ContainerState {
    Running,
    NotRunning,
    NotFound,
}

export enum DockerState {
    NotInstalled,
    NotRunning,
    PermissionDenied,
    Running,
    Unknown,
}
