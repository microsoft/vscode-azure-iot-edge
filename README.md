# Azure IoT Edge for Visual Studio Code
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-blue.svg)](https://gitter.im/Microsoft/vscode-azure-iot-edge)

## Overview
Azure IoT Edge extension <sup>Preview</sup> makes it easy to code, build, deploy, and debug your [IoT Edge](https://docs.microsoft.com/azure/iot-edge/how-iot-edge-works) solutions in Visual Studio Code, by providing a rich set of functionalities:

- Create new IoT Edge projects
- Build and publish IoT Edge modules
- Debug IoT Edge modules locally
- Intellisense and code snippets for the deployment manifest
- Manage IoT Edge devices and modules in IoT Hub (with [Azure IoT Toolkit](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-toolkit))
- Deploy IoT solutions to IoT Edge devices
- Manage IoT Edge runtime.

## Prerequisites

- [Docker](https://www.docker.com/)
- [Azure IoT Edge Runtime Control](https://pypi.python.org/pypi/azure-iot-edge-runtime-ctl).
  ```
  pip install -U azure-iot-edge-runtime-ctl
  ```
- It's also recommended to install [Docker Support for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=PeterJausovec.vscode-docker) to manage your IoT Edge Docker images, containers and registries. 

For C# developers, you can develop, debug and deploy [C# modules](https://docs.microsoft.com/azure/iot-edge/tutorial-csharp-module) and [C# Functions on IoT Edge](https://docs.microsoft.com/azure/iot-edge/tutorial-deploy-function)
- [IoT Edge C# module template](https://www.nuget.org/packages/Microsoft.Azure.IoT.Edge.Module)
  ```
  dotnet new -i Microsoft.Azure.IoT.Edge.Module
  ```
- [IoT Edge C# function template](https://www.nuget.org/packages/Microsoft.Azure.IoT.Edge.Function)
  ```
  dotnet new -i Microsoft.Azure.IoT.Edge.Function
  ```
- [.Net Core 2.0 SDK](https://www.microsoft.com/net/download/core)
- [C# for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp)

We will soon support other languages and more services on IoT Edge.

## Commnads

Press `F1` or `Ctrl + Shift + P` to open command palette, type `Edge:` to see all the commands:
- **Edge: Setup Edge**: Setup the Edge runtime.
- **Edge: Start Edge**: Start Edge runtime in your local machine.
- **Edge: Build IoT Edge module**: Build Edge module from source code. 
- **Edge: Build IoT Edge module Docker image**: Containerize your Edge module to Docker image. 
- **Edge: Push IoT Edge module Docker image**: Push an image to a Docker registry.
- **Edge: Create deployment for Edge device**: Create and submit the deployment to your Edge device with specified deployment manifest. 
- **Edge: Setup Edge using configuration file**: Take a configuration file for Edge setup.
- **Edge: Generate Edge setup configuration file**: Generate the json file for Edge: setup Edge using configuration file. Open the json file to see further description.
- **Edge: Generate Edge deployment manifest**: Generate the json file for Edge deployment.
- **Edge: Stop Edge**: Stop Edge runtime.
- **Edge: Restart Edge**: Restart the Edge runtime.
- **Edge: Uninstall**: Remove all modules and generated files.
- **Edge: Log in to container registry**: Add registry credentials to Edge runtime.

You can also trigger following frequently-used commands in context menu.
- **Edge: Build IoT Edge module**: The context menu of the \*.csproj file in VS Code file explorer. Directly build the target \*.csproj IoT Edge C# module project.
- **Edge: Build IoT Edge module Docker image**: The context menu of the Dockerfile or Dockerfile.debug. Use target Dockerfile to build a Docker image.
- **Edge: Create deployment for Edge device**: The context menu of an Edge device in device list. Create a deployment for target IoT Edge device with deployment manifest file you select.
- **Edge: Setup Edge**: The context menu of an Edge device in device list. Setup Edge runtime with target device connection string.
- **Edge: Generate Edge setup configuration file**: The context menu of an Edge device in device list. Device connection string will be passed to the Edge setup configuration file.
- **Edge: Get module twin**: The context menu of a deployed module. Fetch target module twin. 

## Code Snippets

| Trigger | Content |
| ---- | ---- |
| edgeModule | Add Edge module in Edge deployment manifest |
| edgeRoute | Add Edge route in Edge deployment manifest |

## Resources
- [Develop and deploy C# module](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-develop-csharp-module)
- [Debug C# module](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-debug-csharp-module)
- [Develop and deploy Azure Functions](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-develop-azure-function)
- [Debug Azure Functions](https://docs.microsoft.com/azure/iot-edge/how-to-vscode-debug-azure-function)
- [Easily Create IoT Edge custom modules with Visual Studio Code](https://blogs.msdn.microsoft.com/visualstudio/2017/12/12/easily-create-iot-edge-custom-modules-with-visual-studio-code/)

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
