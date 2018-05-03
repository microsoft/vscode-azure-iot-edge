# Change Log
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
