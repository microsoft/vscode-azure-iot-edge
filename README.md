# Azure IoT Edge for Visual Studio Code
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-blue.svg)](https://gitter.im/Microsoft/vscode-azure-iot-edge)

## Overview
[Azure IoT Edge extension](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-edge) makes it easy to code, build, deploy, and debug your [IoT Edge](https://docs.microsoft.com/azure/iot-edge/how-iot-edge-works) solutions in Visual Studio Code, by providing a rich set of functionalities:

- Create new IoT Edge solution
- Add new IoT Edge module to Edge solution
- Build and publish IoT Edge modules
- Debug IoT Edge modules locally and remotely
- IntelliSense and code snippets for the deployment manifest
- Manage IoT Edge devices and modules in IoT Hub (with [Azure IoT Toolkit](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-toolkit))
- Deploy IoT solutions to IoT Edge devices

## What's New (v1.5.1)
* Support createOptions in deployment.template.json configuration up to 4K
* Fix some bugs
  
## Known Issues
* Cannot run C and Python module in IoT Edge Simulator
* IoT Edge Simulator does not work on Windows Container
* [ASA module may fail sending message](https://github.com/Microsoft/vscode-azure-iot-edge/issues/213)

## Prerequisites

- [Docker](https://www.docker.com/)
- [iotedgehubdev](https://pypi.org/project/iotedgehubdev/)
    ```
    pip install --upgrade iotedgehubdev
    ```
- It's also recommended to install [Docker Support for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=PeterJausovec.vscode-docker) to manage your IoT Edge Docker images, containers and registries. 

## Quickstart
Click the links below to learn how to develop, debug and deploy IoT Edge modules.

- [C# module](https://docs.microsoft.com/azure/iot-edge/tutorial-csharp-module)
- [C# Functions on IoT Edge](https://docs.microsoft.com/azure/iot-edge/tutorial-deploy-function)
- [Python module](https://docs.microsoft.com/azure/iot-edge/tutorial-python-module)
- [Node.js module](https://docs.microsoft.com/azure/iot-edge/tutorial-node-module)
- [Java module](https://docs.microsoft.com/azure/iot-edge/tutorial-java-module)
- [C module](https://docs.microsoft.com/azure/iot-edge/tutorial-c-module)

## FAQ

> **Q:** All too often, I forget to save a config file, and when I build the docker image. Can we auto-save files before build?
>
> **A:** By default, VS Code requires an explicit action to save your changes to disk, `Ctrl+S`. However, it's easy to turn on [Auto Save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save)


> **Q:** How to work with Python virtual environment?
>
> **A:** The Python extension manages your virtual environments in the workspace folder. Please refer to [Environments](https://code.visualstudio.com/docs/languages/python#_environments) and [Automatic Activation of Environments in the Terminal](https://blogs.msdn.microsoft.com/pythonengineering/2018/10/09/python-in-visual-studio-code-september-2018-release/) for details.


> **Q:** Help me understand IoT Edge deployment manifest.
>
> **A:** [Learn how to use deployment manifests to deploy modules and establish routes](https://docs.microsoft.com/azure/iot-edge/module-composition)

## Commands

Press `F1` or `Ctrl + Shift + P` to open command palette, type `Azure IoT Edge:` to see all the commands:
- **Azure IoT Edge: New IoT Edge Solution**: Create an IoT Edge solution.
- **Azure IoT Edge: Add IoT Edge Module**: Add a new IoT Edge module to the IoT Edge solution.
- **Azure IoT Edge: Build IoT Edge Module Image**: Containerize IoT Edge module from source code. 
- **Azure IoT Edge: Build and Push IoT Edge Module Image**: Containerize and push IoT Edge module image to a Docker registry.
- **Azure IoT Edge: Build IoT Edge Solution**: Build all the IoT Edge module image in the solution and expand deployment manifest. 
- **Azure IoT Edge: Build and Push IoT Edge Solution**: Build and push all the IoT Edge module image in the solution and expand deployment manifest.
- **Azure IoT Edge: Setup IoT Edge Simulator**: Setup IoT Edge Simulator with an edge device connection string.
- **Azure IoT Edge: Build and Run IoT Edge Solution in Simulator**: Build all the IoT Edge module image in the solution and expand deployment manifest. Then run the solution in IoT Edge Simulator.
- **Azure IoT Edge: Run IoT Edge Solution in Simulator**: Run the solution of the given deployment manifest in IoT Edge Simulator.
- **Azure IoT Edge: Start IoT Edge Hub Simulator for Single Module**: Start the IoT Edge Simulator for testing single module. It will ask for the input names of the module.
- **Azure IoT Edge: Stop IoT Edge Simulator**: Stop IoT Edge Simulator.
- **Azure IoT Edge: Set Module Credentials to User Settings**: Set the module credential into "azure-iot-edge.EdgeHubConnectionString" and "azure-iot-edge.EdgeModuleCACertificateFile" in user settings. The credentials could be used to connect IoT Edge Simulator.
- **Azure IoT Edge: Create deployment for Edge device**: Create and submit the deployment to your IoT Edge device with specified deployment manifest. 

You can also trigger following frequently-used commands in context menu.
- **Azure IoT Edge: Add IoT Edge Module**: The context menu of `deployment.template.json` file or `modules` folder in VS Code file explorer. A new module will be added to the `modules` folder.
- **Azure IoT Edge: Build IoT Edge Solution**: The context menu of `deployment.template.json` file in VS Code file explorer.
- **Azure IoT Edge: Build and Push IoT Edge Solution**: The context menu of `deployment.template.json` file in VS Code file explorer.
- **Azure IoT Edge: Build and Run IoT Edge Solution in Simulator**: The context menu of `deployment.template.json` file in VS Code file explorer.
- **Azure IoT Edge: Generate IoT Edge Deployment Manifest**: The context menu of `deployment.template.json` file in VS Code file explorer. The deployment manifest (deployment.json) will be expanded from deployment.template.json.
- **Azure IoT Edge: Build IoT Edge Module Image**: The context menu of the `module.json` file in VS Code file explorer. With the input platform from user, it will build the image with the target Dockerfile.
- **Azure IoT Edge: Build and Push IoT Edge Module Image**: The context menu of the `module.json` file in VS Code file explorer. With the input platform from user, it will build and push image with the target Dockerfile.
- **Azure IoT Edge: Create deployment for Edge device**: The context menu of an IoT Edge device in device list. Create a deployment for target IoT Edge device with deployment manifest file you select.
- **Azure IoT Edge: Edit module twin**: The context menu of a deployed module in device list. Fetch target module twin and then update it in edit view. 

## Code Snippets

| Trigger | Content |
| ---- | ---- |
| edgeModule | Add IoT Edge module in IoT Edge deployment manifest |
| edgeRoute | Add IoT Edge route in IoT Edge deployment manifest |

## Resources
- [Video tutorial - Azure IoT Edge extension for Visual Studio Code](https://channel9.msdn.com/Shows/Internet-of-Things-Show/Azure-IoT-Edge-extension-for-Visual-Studio-Code)
- [Develop and deploy a C# module](https://docs.microsoft.com/azure/iot-edge/tutorial-csharp-module)
- [Develop and deploy a Python module](https://docs.microsoft.com/azure/iot-edge/tutorial-python-module)
- [Develop and deploy a Node.js module](https://docs.microsoft.com/azure/iot-edge/tutorial-node-module)
- [Develop and deploy a C module](https://docs.microsoft.com/azure/iot-edge/tutorial-c-module)
- [Register a new Azure IoT Edge device](https://docs.microsoft.com/en-us/azure/iot-edge/how-to-register-device-vscode)
- [Deploy Azure IoT Edge modules](https://docs.microsoft.com/azure/iot-edge/how-to-deploy-modules-vscode)
- [Debug C# module](https://docs.microsoft.com/azure/iot-edge/how-to-develop-csharp-module)
- [Debug Node.js module](https://docs.microsoft.com/azure/iot-edge/how-to-develop-node-module)
- [Debug Java module](https://docs.microsoft.com/azure/iot-edge/how-to-develop-java-module)
- [Debug Python module](https://docs.microsoft.com/azure/iot-edge/how-to-develop-python-module)
- [Debug C# Functions module](https://docs.microsoft.com/azure/iot-edge/how-to-develop-csharp-function)
- [CI/CD in VSTS](https://docs.microsoft.com/azure/iot-edge/how-to-ci-cd)

## Supported Operating Systems
Currently this extension supports the following operating systems:
- Windows 7 and later (32-bit and 64-bit)
- macOS 10.10 and later
- Ubuntu 16.04

The extension might work on other Linux distros as some users have reported, but be aware that Microsoft provides no guarantee or support for such installations.
You can find Azure IoT Edge support [here](https://docs.microsoft.com/azure/iot-edge/support).

## TypeEdge (Experimental)
The Azure IoT TypeEdge introduces a **strongly-typed** flavor of the inherently loosely coupled vanilla Azure IoT Edge. We would like to invite you to try TypeEdge out and give us any feedback or recommendations you might have here. TypeEdge is still an experimental project that we don’t recommend to use it in production IoT Edge project.

To get started, please visit the [project repo](https://aka.ms/typeedge) and give us feedback via [Github Issues](https://github.com/Azure/TypeEdge/issues).

## Data/Telemetry
This project collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](http://go.microsoft.com/fwlink/?LinkId=521839) to learn more. 
If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Support and Contact Us
You can join in our [Gitter](https://gitter.im/Microsoft/vscode-azure-iot-edge) to ask for help, report issues and talk to the product team directly.
