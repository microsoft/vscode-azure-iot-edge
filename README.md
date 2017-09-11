# Azure IoT Edge

## Prerequisites

* [Docker](https://www.docker.com/)

* [.NET Core](https://www.microsoft.com/net/core)

* [C# extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp)

## Commnads

Press `F1` or `Ctrl + Shift + P` to open command palette, type `Edge:` to see all the commands:

![commands](images/commands.png)


## Message template authoring

Go to [Dummy JSON](https://github.com/webroo/dummy-json) for reference.

## Sample of deployment.json

```json
{
    "modules": {
        "filter2": {
            "name": "filter2",
            "version": "1.0",
            "type": "docker",
            "status": "running",
            "config": {
                "image": "127.0.0.1:5000/filtermodule2",
                "tag": "latest",
                "env": {}
            }
        },
        "input-simulator": {
            "name": "input-simulator",
            "version": "1.0",
            "type": "docker",
            "status": "running",
            "config": {
                "image": "formulahendry/iot-edge-input-simulator",
                "tag": "latest",
                "env": {}
            }
        },
        "output-simulator": {
            "name": "output-simulator",
            "version": "1.0",
            "type": "docker",
            "status": "running",
            "config": {
                "image": "formulahendry/iot-edge-output-simulator",
                "tag": "latest",
                "env": {}
            }
        }
    }
}
```

## Sample of routes.json

```json
{
    "routes": [
        "FROM /messages/modules/input-simulator/outputs/MessageGeneratorOutput INTO BrokeredEndpoint(\"/modules/filter2/inputs/input1\")",
        "FROM /messages/modules/filter2/outputs/alertOutput INTO BrokeredEndpoint(\"/modules/output-simulator/inputs/input1\")"
    ]
}
```

## Debug .NET Core Module

1. Open the Module folder in VS Code
2. Press `F5` and select `Edge Debug (.NET Core)`, then a `launch.json` file will be created in `.vscode` folder

    ![debug-config](images/debug-config.png)
3. In `launch.json`, replace `<container_name>` with your real container name
4. Press `F5` again and select the right process (dotnet ***.dll) to attach

    ![select-process](images/select-process.png)

## Repo for simulator Modules

See https://github.com/azure/edge-module-debug


