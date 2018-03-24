## The legacy modules
1. C# modules created from Microsoft.Azure.IoT.Edge.Module template before version 1.2.0 (inclusive).
2. C# Edge Function modules created from Microsoft.Azure.IoT.Edge.Function before version 1.1.0 (inclusive).

## Migration steps
### Prerequisites
Install Azure Iot Edge (version 0.2.0) Visual Studio Code Extension.
### For legacy C# modules
1. Open the legacy module project folder in VSCode.
2. Right click the `*.csproj` file and choose "Convert to IoT Edge Module".
3. Fill in the module docker image repository name in the input box.
4. A new file "module.json" will be created in the project folder. And Dockerfiles for different platform are also created in the same folder.

### For legacy C# Edge Function modules
1. Open the legacy Function module project folder in VSCode.
2. Right click the "host.json" file and choose "Convert to IoT EdgeModule".
3. Fill in the module docker image repository name in the input box.
4. A new file "module.json" will be created in the project folder. And Dockerfiles for different platform are also created in the same folder.

### After Migraton
Command "Edge: Build IoT Edge Module Image" and command "Edge: Build and Push IoT Edge Module Image" can be used to build the module with the new structure.
