# Azure IoT Edge for Visual Studio Code
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-blue.svg)](https://gitter.im/Microsoft/vscode-azure-iot-edge)

## Overview
[Azure IoT Edge extension](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-edge) <sup>Preview</sup> makes it easy to code, build, deploy, and debug your [IoT Edge](https://docs.microsoft.com/azure/iot-edge/how-iot-edge-works) solutions in Visual Studio Code, by providing a rich set of functionalities:

- Create new IoT Edge solution
- Add new IoT Edge module to Edge solution
- Build and publish IoT Edge modules
- Debug IoT Edge modules locally
- IntelliSense and code snippets for the deployment manifest
- Manage IoT Edge devices and modules in IoT Hub (with [Azure IoT Toolkit](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-toolkit))
- Deploy IoT solutions to IoT Edge devices
- Manage IoT Edge runtime.

### Note
From 0.2.0, we added a new Azure IoT Edge solution scaffolding. The Azure IoT Edge module structure has also been changed. For the legacy Azure IoT Edge modules (C# module/C# Function) created in previous versions, a command "Azure IoT Edge: Convert to IoT Edge Module" is provided to support the migration. For detail information, please refer to the [migration steps](MIGRATION_STEPS.md).

## Prerequisites

- [Docker](https://www.docker.com/)
- [Azure IoT Edge Runtime Control](https://pypi.python.org/pypi/azure-iot-edge-runtime-ctl).
  ```
  pip install -U azure-iot-edge-runtime-ctl
  ```
- It's also recommended to install [Docker Support for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=PeterJausovec.vscode-docker) to manage your IoT Edge Docker images, containers and registries. 

For C# developers, you can develop, debug and deploy [C# modules](https://docs.microsoft.com/azure/iot-edge/tutorial-csharp-module) and [C# Functions on IoT Edge](https://docs.microsoft.com/azure/iot-edge/tutorial-deploy-function)
- [.Net Core 2.0 SDK](https://www.microsoft.com/net/download/core)
- [C# for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp)

For Python developers, you can develop and deploy [Python module](https://docs.microsoft.com/azure/iot-edge/tutorial-python-module)
- [Python for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-python.python)

We will soon support other languages and more services on Azure IoT Edge.

## Commands

Press `F1` or `Ctrl + Shift + P` to open command palette, type `Azure IoT Edge:` to see all the commands:
- **Azure IoT Edge: Setup Edge**: Setup the IoT Edge runtime.
- **Azure IoT Edge: Start Edge**: Start IoT Edge runtime in your local machine.
- **Azure IoT Edge: New IoT Edge Solution**: Create an IoT Edge solution.
- **Azure IoT Edge: Add IoT Edge Module**: Add a new IoT Edge module to the IoT Edge solution.
- **Azure IoT Edge: Build IoT Edge Module Image**: Containerize IoT Edge module from source code. 
- **Azure IoT Edge: Build and Push IoT Edge Module Image**: Containerize and push IoT Edge module image to a Docker registry.
- **Azure IoT Edge: Build IoT Edge Solution**: Build and push all the IoT Edge module image in the solution and expand deployment manifest. 
- **Azure IoT Edge: Generate IoT Edge Deployment Manifest**: Generate the deployment manifest file for IoT Edge deployment from deployment template.
- **Azure IoT Edge: Create deployment for Edge device**: Create and submit the deployment to your IoT Edge device with specified deployment manifest. 
- **Azure IoT Edge: Setup Edge using configuration file**: Take a configuration file for IoT Edge setup.
- **Azure IoT Edge: Generate Edge setup configuration file**: Generate the JSON file for Azure IoT Edge: Setup IoT Edge using configuration file. Open the JSON file to see further description.
- **Azure IoT Edge: Stop Edge**: Stop IoT Edge runtime.
- **Azure IoT Edge: Restart Edge**: Restart the IoT Edge runtime.
- **Azure IoT Edge: Uninstall**: Remove all modules and generated files.
- **Azure IoT Edge: Log in to container registry**: Add registry credentials to IoT Edge runtime.

You can also trigger following frequently-used commands in context menu.
- **Azure IoT Edge: Add IoT Edge Module**: The context menu of deployment.template.json file in VS Code file explorer. A new module will be added to the **modules** folder.
- **Azure IoT Edge: Build IoT Edge Solution**: The context menu of deployment.template.json file in VS Code file explorer.
- **Azure IoT Edge: Generate IoT Edge Deployment Manifest**: The context menu of deployment.template.json file in VS Code file explorer. The deployment manifest (deployment.json) will be expanded from deployment.template.json.
- **Azure IoT Edge: Build IoT Edge Module Image**: The context menu of the module.json file in VS Code file explorer. With the input platform from user, it will build the image with the target Dockerfile.
- **Azure IoT Edge: Build and Push IoT Edge Module Image**: The context menu of the module.json file in VS Code file explorer. With the input platform from user, it will build and push image with the target Dockerfile.
- **Azure IoT Edge: Create deployment for Edge device**: The context menu of an IoT Edge device in device list. Create a deployment for target IoT Edge device with deployment manifest file you select.
- **Azure IoT Edge: Setup Edge**: The context menu of an IoT Edge device in device list. Setup IoT Edge runtime with target device connection string.
- **Azure IoT Edge: Generate Edge setup configuration file**: The context menu of an IoT Edge device in device list. Device connection string will be passed to the IoT Edge setup configuration file.
- **Azure IoT Edge: Get module twin**: The context menu of a deployed module. Fetch target module twin. 
- **Azure IoT Edge: Convert to IoT Edge Module**: The context menu of .csproj file of C# module or host.json of C# IoT Edge function module in VSCode file explorer. Convert the legacy IoT Edge module (C# module and C# function module) to the new structure.

## Code Snippets

| Trigger | Content |
| ---- | ---- |
| edgeModule | Add IoT Edge module in IoT Edge deployment manifest |
| edgeRoute | Add IoT Edge route in IoT Edge deployment manifest |

## Resources
- [Develop and deploy C# module](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-develop-csharp-module)
- [Debug C# module](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-debug-csharp-module)
- [Develop and deploy C# module](https://docs.microsoft.com/azure/iot-edge/tutorial-python-module)
- [Develop and deploy Azure Functions](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-develop-azure-function)
- [Debug Azure Functions](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-debug-azure-function)
- [Work with multiple modules in VS Code](https://docs.microsoft.com/azure/iot-edge/tutorial-multiple-modules-in-vscode)
- [IoT Edge continuous integration and continuous deployment](https://docs.microsoft.com/azure/iot-edge/how-to-ci-cd)
- [Azure IoT Edge for Visual Studio Team Service](https://marketplace.visualstudio.com/items?itemName=vsc-iot.iot-edge-build-deploy)


## Supported Operating Systems
Currently this extension supports the following operating systems:
- Windows 7 and later (32-bit and 64-bit)
- macOS 10.10 and later
- Ubuntu 16.04

The extension might work on other Linux distros as some users have reported, but be aware that Microsoft provides no guarantee or support for such installations


## Data/Telemetry
This project collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](http://go.microsoft.com/fwlink/?LinkId=521839) to learn more. 
If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Support and Contact Us
You can join in our [Gitter](https://gitter.im/Microsoft/vscode-azure-iot-edge) to ask for help, report issues and talk to the product team directly.
