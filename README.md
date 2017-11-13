# Azure IoT Edge for Visual Studio Code
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-blue.svg)](https://gitter.im/Microsoft/vscode-azure-iot-edge)

## Overview
Azure IoT Edge extension <sup>Preview</sup> makes it easy to code, build, deploy, and debug your [IoT Edge](https://docs.microsoft.com/azure/iot-edge/how-iot-edge-works) solutions in Visual Studio Code, by providing a rich set of functionalities:

- Create new IoT Edge projects
- Build and publish IoT Edge modules
- Debug IoT Edge modules locally
- Manage IoT Edge devices in IoT Hub (with [Azure IoT Toolkit](https://marketplace.visualstudio.com/items?itemName=vsciot-vscode.azure-iot-toolkit))
- Deploy IoT solutions to IoT Edge devices
- Stop and restart IoT Edge

## Prerequisites

- [Docker](https://www.docker.com/)
- [Azure IoT Edge Runtime Control](https://pypi.python.org/pypi/azure-iot-edge-runtime-ctl).
  ```
  pip install -U azure-iot-edge-runtime-ctl
  ```
- It's also recommended to install [Docker Support for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=PeterJausovec.vscode-docker) to manager your IoT Edge Docker images, containers and registries. 

For C# developers, you can develop, debug and deploy [C# modules](https://docs.microsoft.com/azure/iot-edge/tutorial-create-custom-module) and [C# Functions on IoT Edge](https://docs.microsoft.com/azure/iot-edge/tutorial-deploy-function)
- [IoT Edge C# module template](https://www.nuget.org/packages/Microsoft.Azure.IoT.Edge.Module)
- [IoT Edge C# function template](https://www.nuget.org/packages/Microsoft.Azure.IoT.Edge.Function)
- [.Net Core 2.0 SDK](https://www.microsoft.com/net/download/core)
- [C# for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp)

We will soon support other languages.

## Commnads

Press `F1` or `Ctrl + Shift + P` to open command palette, type `Edge:` to see all the commands:

- **Edge: Setup Edge**: Setup the Edge runtime. To trigger this, right click the Edge DeviceID in the device list.
- **Edge: Start Edge**: Start Edge runtime in your local machine.
- **Edge: Build IoT Edge module**: Build Edge module from source code. To trigger this command, right click the project file (e.g. `*.csproj` for .Net Core module project) and select this command in the context menu.
- **Edge: Build IoT Edge module Docker image**: Containerize your Edge module to Docker image. To trigger this command, right click the `Dockerfile` and select this command in the context menu. 
- **Edge: Push IoT Edge module Docker image**: Push an image a registry.
- **Edge: setup Edge using configuration file**: Take a configuration file for Edge setup.
- **Edge: Generate Edge setup configuration file**: Generate the json file for Edge: setup Edge using configuration file. Open the json file to see further description. 
- **Edge: Generate Edge deployment configuration file**: Generate the json file for Edge deployment.
- **Edge: Stop Edge**: Stop Edge runtime.
- **Edge: Restart Edge**: Restart the Edge runtime.
- **Edge: Uninstall**: Remove all modules and generated files.


## Get Started with IoT Edge in VS Code
### Develop and deploy your IoT Edge C# module
1. Run below commands to create a module or a function project.
  ```
  dotnet new aziotedgemodule -n <your_module_name>
  ```
2. Open this project in VS Code.
3. Set your IoT Hub connection string or login to Azure within Azure IoT Toolkit.
4. Develop your Edge module code, or you can use the default code as a simplest sample.
5. Right-click the `<your_module_name>.csproj` file and click **Build IoT Edge module**.
6. Right-click one of the DockerFiles under Docker folder, and click **Build IoT Edge module Docker image**. In the Select Folder box, either browse to or enter `./bin/Debug/netcoreapp2.0/publish`. Click **Select Folder as EXE_DIR**. Then specify your module image URL.
7. Type and select **Edge: Push IoT Edge module Docker image** in Command Palette with your module image URL.
8. Open and update the `deployment.json` file. Make sure you have correct modules and routes for your IoT Edge.
7. Find your Edge device ID, right-click it and click **Setup Edge**.
8. Type and select **Edge: Start Edge** in Command Palette.
9. Right-click the Edge DeviceID in the device list and select **Create deployment for Edge device**, select the `deployment.json` file you just updated.
10. Start your Edge runtime in Command Palette: **Edge: Start Edge**.

### Debug your IoT Edge C# module 
1. To start debugging, you need to use the `dockerfile.debug` to rebuild your docker image and deploy your Edge solution again. In VS Code explorer, select `Dockerfile.debug` and Right-click to choose **Build IoT Edge module Docker image**. Then containerize and publish your module image as usual. It's recommended to use a local registry to host your images for debugging purpose.
2. You can reuse the `deployment.json` file if you have correct modules and routes for your IoT Edge. In command Palette, type and select **Edge: Restart Edge** to get your module started in debug version.
3. Go to VS Code debug window. Press F5 and select **IoT Edge (.Net Core)**.
4. In `launch.json`, navigate to **Debug IoT Edge Module (.NET Core)** section and specify the <container_name>.
5. Navigate to `Program.cs`. Add breakpoints and press F5 again. Then select the dotnet process to attach to.
6. In Debug window, you can see the variables in left panel.

### Develop debug and deploy your Azure Function for IoT Edge
The steps should be almost the same as the C# module above. Differeces are listed below.
- Use `dotnet new aziotedgefunction -n <your_module_name>` to generate function project. 
- Specify the project root folder as the `EXE_DIR` during Docker image building.
- Use the section `Debug IoT Edge Function (.NET Core)` in lanuch.json

## Supported Operating Systems
Currently this extension supports the following operating systems:
- Windows 7 and later (32-bit and 64-bit)
- macOS 10.10 and later
- Ubuntu 16.04
The extension might work on other Linux distros as some users have reported, but be aware that Microsoft provides no guarantee or support for such installations

## Support and Contact Us
You can join in our [Gitter](https://gitter.im/Microsoft/vscode-azure-iot-edge) to ask for help, report issues and talk to the product team directly.
