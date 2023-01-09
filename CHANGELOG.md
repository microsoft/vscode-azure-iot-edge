# Change Log
## 1.25.11 - 2022-12-12
### Changed
* Update default Edge runtime version to 1.4 LTS

## 1.25.10 - 2022-11-03
### Changed
* Snap to the latest simulator version 0.14.18

## 1.25.9 - 2022-04-04
### Changed
* Snap to the latest simulator version 0.14.14

## 1.25.8 - 2022-03-08
### Changed
* Snap to the latest simulator version 0.14.12

## 1.25.7 - 2022-02-04
### Changed
* Fixed dev container load errors when dependency list include VSCode Remote Containers extension.

## 1.25.6 - 2022-01-28
### Changed
* Fixed issue with Dev Container generation for External module sources
* Updated extension dependency list to include VSCode Remote Containers extension

## 1.25.5 - 2022-01-20
### Changed
* Added dependent extensions to Dev Container definitions.

## 1.25.4 - 2021-12-15
### Changed
* Replaced deprecated 'Request' with axios for http requests.

## 1.25.3 - 2021-11-30
### Changed
* Added creation of CSharp Dev Container for new Solutions with a CSharp Function.

## 1.25.2 - 2021-11-30
### Changed
* Update npm package dependencies

## 1.25.1- 2021-10-26
### Changed
* Fixed issue with processing of modules lacking the image URI

## 1.25.0- 2021-10-05
### Changed
* Added Dev Container definitions for all supported languages
* Incorporate Dev Container definition with every new EdgeSolution
* Added a new command to add Dev Container definition to existing solutions

## 1.24.4 - 2021-10-01
### Changed
* Maximum version number for edgeHub/properties.desired.schemaVersion is capped to 1.1

## 1.24.3 - 2021-7-27
### Changed
* Allow user to select Edge Runtime version between 1.2

## 1.24.2 - 2021-7-15
### Changed
* Enumerate vsce version in release pipeline

## 1.24.1 - 2021-6-4
### Changed
* Allow user to specify the version of iotedgehubdev through IOTEDGEHUBDEV_VERSION environment variable

## 1.24.0 - 2021-3-26
### Changed
* Allow user to select Edge Runtime version between 1.0 and 1.1

## 1.23.0 - 2020-9-23
### Fixed
* Guide user to setup device connection string when missing during 'Set module credentials' operation

## 1.22.0 - 2020-5-27
### Changed
* Allow user to select deployment template when add module
* Adopt VS Code's 'asWebviewUri' API

## 1.21.0 - 2020-4-07
### Added
* Add check when input repository URL
* Add retry logic when download standalone simulator
* Add single module debug support for Python
* Add arm64v8 platform support

### Changed
* Use pip package URL instead of GitHub API to avoid rate limitation

### Fixed
* Fixed image placeholder and docker path verification issue: [#159](https://github.com/microsoft/vscode-azure-iot-edge/issues/159)

## 1.20.0 - 2019-12-31
### Changed
* Update scroll bar css to compatible with dark theme for Sample Gallery 
* Update subtitle in the description

## 1.19.0 - 2019-11-15
### Added
* Add docker status detection
* Support adding Azure Event Grid module

### Changed
* Use standalone simulator (iotedgehubdev)

## 1.18.0 - 2019-10-30
### Added
* Support multiple plans for marketplace

### Changed
* Optimize ASA retry logic

## 1.17.0 - 2019-08-29
### Added
* Add CodeLens to help user update ASA job information

### Fixed
* Fix broken link in README.md

## 1.16.0 - 2019-08-13
### Added
* Guide user to setup connection string from UI when failed to start simulator

## 1.15.0 - 2019-07-19
### Changed
* ASA error message improvement
* Rename 'tempSensor' to 'SimulatedTemperatureSensor'
* Read connection string from API of Azure IoT Hub Toolkit

## 1.14.0 - 2019-06-25
### Added
* Support create an Azure IoT Edge Solution without any module.

### Changed
* Only add tempSensor module when adding custom module.
* Fixed the issue command broken on VSCode 1.35.0+ [#459](https://github.com/microsoft/vscode-azure-iot-edge/issues/459).

## 1.13.0 - 2019-05-28
### Added
* Support relative path schema for the reference of external custom module. The schema is like ${MODULEDIR\<RelativePathToModuleFolder\>}

## 1.12.0 - 2019-04-26
### Added
* Integrate the new setup option from [iotedgehubdev v0.8.0](https://github.com/Azure/iotedgehubdev/releases/tag/v0.8.0) to setup Azure IoT Hub connection string. So now module twin will be updated automatically when running deployment in simulator.

### Changed
* Only one sample gallery page will be opened in VS Code [#414](https://github.com/Microsoft/vscode-azure-iot-edge/issues/414)

## 1.11.1 - 2019-03-30
### Changed
* Marketplace integration hotfix

## 1.11.0 - 2019-03-22
### Added
* Add IoT Edge Marketplace page. User can view and create IoT Edge modules from Azure Marketplace.
* Add json schema validation for deployment.*.template.json file.

## 1.10.0 - 2019-02-19
### Added
* Add sample gallery page. User can view and create Azure IoT Edge solution based on samples.
* Add issue template

## 1.9.0 - 2019-01-30
### Added
* Add configuration "azure-iot-edge.executor.env" which can be configured to inject environment variables into terminals created by VS Code Azure IoT Edge extension.

### Changed
* Change the extension activation condition. It will not be activated by a debug session.

## 1.8.0 - 2019-01-07
### Added
* Autodetect/install/update iotedgehubdev
* Install Azure IoT Edge Node.js Module Generator automatically before new Node.js module

### Changed
* Use Webpack to improve extension performance ⚡
* Use git download instead of cookiecutter to add Python module

## 1.7.0 - 2018-12-06
### Added
* Support adding Azure Machine Learning modules.
* Support setting the template versions to be used by "New IoT Edge Solution" or "Add IoT Edge Module" commands.
    * [Released CSharp module template versions](https://github.com/Azure/dotnet-template-azure-iot-edge-module/blob/master/CHANGELOG.md)
    * [Released CSharp function module template versions](https://github.com/Azure/dotnet-template-azure-iot-edge-function/blob/master/CHANGELOG.md)
    * [Released Java module template versions](https://github.com/microsoft/azure-maven-archetypes/tree/develop/azure-iot-edge-archetype)
    * [Released Python module template versions](https://github.com/Azure/cookiecutter-azure-iot-edge-module/releases)
    * [Released C module template versions](https://github.com/Azure/azure-iot-edge-c-module/releases)

## 1.6.0 - 2018-11-23
### Added
* Add **deployment.debug.template.json** when creating new solution. The template refer to the debug flavour image of the modules and has debug createOptions populated automatically.
* Enable switch between different platforms for Azure IoT Edge Solution. User could switch the platform through status bar. By default, we provide "arm32v7", "amd64" and "windows-amd64" as the platform set since these are Azure IoT Edge supporting platforms today. Besides, user could customize new platform via user settings (azure-iot-edge.platforms). Now the image reference parameter in deployment template could be platform neutral. And the platform configured will be used when build the solution. For example, to reference the module "SampleModule" in deployment template, the parameter could be **"${MODULES.SampleModule}"** which does not have the platfrom suffix like ".amd64".
* Add third party module template support. User can define custom module scaffolding command in the user setting. And when add new module, the command could be triggered in the workflow.

### Changed
* Change default type of "createOptions" in deloyment.template.json/deployment.debug.template.json to json object.
* Support build/generate/run template files which has **.template.json** suffix through command palette

## 1.5.1 - 2018-11-02
### Changed
* Support createOptions in deployment.template.json configuration up to 4K
* Fix some bugs

## 1.5.0 - 2018-10-15
### Added
* Support Java module with Windows container

## 1.4.0 - 2018-09-20
### Changed
* Update CSharp module debug configuration to support netcoreapp2.1 target framework
* Update Python module debug configuration to support released python debugger
* Fix some bugs

## 1.3.0 - 2018-08-30
### Added
* Support Java module type in add module
* Support debug Python module (amd64)

## 1.2.0 - 2018-08-09
### Changed
* `Azure IoT Edge: Build IoT Edge Solution` does not push images anymore

### Added
* Integerate with [iotedgehubdev](https://pypi.org/project/iotedgehubdev/) tool
* Azure IoT Edge: Build and Push IoT Edge Solution
* Azure IoT Edge: Setup IoT Edge Simulator
* Azure IoT Edge: Build and Run IoT Edge Solution in Simulator
* Azure IoT Edge: Run IoT Edge Solution in Simulator
* Azure IoT Edge: Start IoT Edge Hub Simulator for Single Module
* Azure IoT Edge: Stop IoT Edge Simulator
* Azure IoT Edge: Set Module Credentials to User Settings
* Support ASA module type in add module
* Debugging configuration for "Launch IoT Edge Module (Node.js)"
* Debugging configuration for "Launch IoT Edge Module (.Net Core)"

### Known Issues
* Cannot run C and Python module in IoT Edge Simulator
* IoT Edge Simulator does not work on Windows Container
* [ASA module may fail sending message](https://github.com/Microsoft/vscode-azure-iot-edge/issues/213)

## 1.1.1 - 2018-08-01
### Changed
* Update vscode-extension-telemetry npm to latest version (0.0.18)

## 1.1.0 - 2018-07-30
### Added
* Add support for C module

## 1.0.0 - 2018-06-27
### Added
* Add "Add IoT Edge Module" item to the context menu of "modules" folder
* Add support for Node.js module

### Changed
* Default route is added into deployment.template.json when adding module
* Docker registry credential is now managed in deployment.template.json

### Removed
* Azure IoT Edge: Setup Edge
* Azure IoT Edge: Start Edge
* Azure IoT Edge: Setup Edge using configuration file
* Azure IoT Edge: Generate Edge setup configuration file
* Azure IoT Edge: Stop Edge
* Azure IoT Edge: Restart Edge
* Azure IoT Edge: Uninstall IoT Edge
* Azure IoT Edge: Log in to container registry
* Azure IoT Edge: Convert to IoT Edge Module

## 0.4.0 - 2018-05-24
### Added
* Import existing modules from Azure Container Registry when adding new modules to the solution
* Respect .env file in the root of the solution folder
* Automatically start local registry when it is used by a module

### Changed
* Update files generated by the "Azure IoT Edge: Convert to IoT Edge Module" command to align with Azure IoT Edge .NET templates' recent releases

### Known Issues
* [#161](https://github.com/Microsoft/vscode-azure-iot-edge/issues/161) You may encounter "Entry not found in cache" error when importing ACR modules randomly, especially after idling VS Code for several hours. To work around this issue, please open command palette and run "Reload Window" or restart VS Code. We are investigating the issue and will post an update once the issue is resolved.

## 0.3.0 - 2018-05-02
### Added
* Import existing module from container registry when adding new module to solution
* Support adding extra Docker build options in the `buildOptions` array of module.json
* New IntelliSense features (watch the screencasts [here](https://github.com/Microsoft/vscode-azure-iot-edge/issues/115))
  * Dockerfile path validation in module.json
  * Image placeholder validation in deployment.template.json
  * Dockerfile content hover preview in deployment.template.json
  * Go-to-Dockerfile in deployment.template.json
* "Azure" branding to command palette category

### Changed
* Always check out the `master` branch of [Cookiecutter template](https://github.com/Azure/cookiecutter-azure-iot-edge-module/) when adding Python module

## 0.2.0 - 2018-03-27
### Added
* Introduce IoT Edge Solution which includes multiple modules and a deployment manifest template (deployment.template.json)
* Command "New IoT Edge Solution".
* Command "Build IoT Edge Module Image".
* Command "Build and Push IoT Edge Module Image".
* Command "Build IoT Edge Solution".
* Command "Generate IoT Edge Deployment Manifest".
* Command "Add IoT Edge Module".
* Command "Convert to IoT Edge Module". The command helps the migration from legacy modules. Please refer to the [migration steps](MIGRATION_STEPS.md) for detail.
* Add IntelliSense support in deployment.template.json file of IoT Edge Solution.
* Support of the Python IoT Edge Module.

### Removed
* Command "Build IoT Edge module" has been removed. Use command "Build IoT Edge Module Image" to build the module image in this new version.
* Command "Build IoT Edge module Docker image" has been removed. Use command "Build IoT Edge Module Image" to build the module image in this new version.
* Command "Push IoT Edge module Docker image" has been removed. Use command "Build and Push IoT Edge Module Image" to build and push the module image in this new version.

### Changed
* IoT Edge Module folder structure has been changed.
  * module.json file is added to the project root to manage the version and platform.
  * Dockerfiles for different platforms are moved to the project root.
  * For C# IoT Edge module, the build binary steps are now put into Dockerfile. So module could be built without building C# project first.

## 0.1.3 - 2017-12-25
### Added
* Add support for F#

## 0.1.2 - 2017-12-06
### Added
* Add Command Palette integration for build module command
* Cache last used image name

## 0.1.1 - 2017-11-17
### Changed
* Show 'Build IoT Edge module' command only on csproj file

## 0.1.0 - 2017-11-13
### Added
* Support for developing and debugging C# module and C# Function.
* Context menu for `*.csproj` and `Dockerfile` for C# module and Function development.
* Support for creating Edge deployment with Azure IoT Hub for single Edge device.
* Integration of the basic functionalities of `azure-iot-edge-runtime-ctl`.
* Context menu in Device List to manage IoT Edge runtime and IoT Edge devices.
* Telemetry to understand which commands developers find useful. This will help us refine which commands we add in the future.
> Please note, you can turn off telemetry reporting for VS Code and all extensions through the ["telemetry.enableTelemetry": false setting](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).
