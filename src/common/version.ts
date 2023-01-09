import { Configuration } from "./configuration";
import { Constants } from "./constants";

type ImageJson = "${string}:${string}";

export class Versions {
    public static getRunTimeVersionMap(): Map<string, string> {
        const verMap: Map<string, string> = new Map();
        verMap.set(Constants.edgeAgentVerPlaceHolder, Versions.edgeAgentVersion());
        verMap.set(Constants.edgeHubVerPlaceHolder, Versions.edgeHubVersion());
        return verMap;
    }

    public static getSchemaVersionMap(): Map<string, string> {
        // Mapping between Edge Runtime version and module schema version
        const edgeAgentSchemaVerMap: Map<string, string> = new Map([
            ["1.4", "1.4"],
        ]);

        const edgeHubSchemaVerMap: Map<string, string> = new Map([
            ["1.4", "1.4"],
        ]);

        const verMap: Map<string, string> = new Map();
        verMap.set(Constants.edgeAgentSchemaVerPlaceHolder, edgeAgentSchemaVerMap.get(Versions.edgeAgentVersion()));
        verMap.set(Constants.edgeHubSchemaVerPlaceHolder, edgeHubSchemaVerMap.get(Versions.edgeHubVersion()));
        return verMap;
    }

    public static getSupportedEdgeRuntimeVersions(): string[] {
        return Versions.getValue(Constants.versionEdgeRuntime, []) as string[];
    }

    public static installCSharpTemplate(): boolean {
        return Versions.getValue(Constants.installCSharpModule, true) as boolean;
    }

    public static installCSFunctionTemplate(): boolean {
        return Versions.getValue(Constants.installCSFunctionModule, true) as boolean;
    }

    public static installNodeTemplate(): boolean {
        return Versions.getValue(Constants.installNodeModule, true) as boolean;
    }

    public static csTemplateVersion(): string {
        return Versions.getValue(Constants.versionCSharpModule) as string;
    }

    public static csFunctionTemplateVersion(): string {
        return Versions.getValue(Constants.versionFunctionModule) as string;
    }

    public static pythonTemplateVersion(): string {
        return Versions.getValue(Constants.versionPythonModule, "master") as string;
    }

    public static cTemplateVersion(): string {
        return Versions.getValue(Constants.versionCModule, "master") as string;
    }

    public static javaTemplateVersion(): string {
        return Versions.getValue(Constants.versionJavaModule) as string;
    }

    public static nodeTemplateVersion(): string {
        return Versions.getValue(Constants.versionNodeModule) as string;
    }

    public static tempSensorVersion(): string {
        return Versions.getValue(Constants.versionTempSensor, "1.4") as string;
    }

    public static updateSystemModuleImageVersion(templateJson: any, moduleName: string, versionMap: Map<string, string>) {
        if (templateJson !== undefined) {
            const sysModuleImage =
                templateJson.modulesContent.$edgeAgent["properties.desired"].systemModules[moduleName].settings.image;
            templateJson.modulesContent.$edgeAgent["properties.desired"].systemModules[moduleName].settings.image =
                Versions.getNewImageVersionJson(sysModuleImage, versionMap);
        }
    }

    public static updateSystemModuleSchemaVersion(templateJson: any, moduleName: string, versionMap: Map<string, string>) {
        if (templateJson !== undefined) {
            if (moduleName !== undefined) {
                switch (moduleName) {
                    case "edgeAgent":
                        templateJson.modulesContent.$edgeAgent["properties.desired"].schemaVersion =
                            Versions.getNewSchemaVersion(moduleName, versionMap);
                    case "edgeHub":
                        templateJson.modulesContent.$edgeHub["properties.desired"].schemaVersion =
                            Versions.getNewSchemaVersion(moduleName, versionMap);
                }
            }
        }
    }

    public static edgeHubVersion(): string {
        return Versions.getDefaultEdgeRuntimeVersion();
    }

    private static edgeAgentVersion(): string {
        return Versions.getDefaultEdgeRuntimeVersion();
    }

    private static getDefaultEdgeRuntimeVersion(): string {
        return Versions.getValue(Constants.versionDefaultEdgeRuntime, "1.4") as string;
    }

    private static getNewImageVersionJson(input: ImageJson, versionMap: Map<string, string>): string {
        if (input !== undefined) {
            const imageName: string = input.split(":")[0];
            switch (imageName) {
                case "mcr.microsoft.com/azureiotedge-agent":
                    return imageName + ":" + versionMap.get(Constants.edgeAgentVerPlaceHolder);
                case "mcr.microsoft.com/azureiotedge-hub":
                    return imageName + ":" + versionMap.get(Constants.edgeHubVerPlaceHolder);
                default:
                    return input;
            }
        }
    }

    private static getNewSchemaVersion(imageName: string, versionMap: Map<string, string>): string {
        if (imageName !== undefined) {
            switch (imageName) {
                case "edgeAgent":
                    return versionMap.get(Constants.edgeAgentSchemaVerPlaceHolder);
                case "edgeHub":
                    return versionMap.get(Constants.edgeHubSchemaVerPlaceHolder);
                default:
                    return imageName;
            }
        }
    }

    private static getValue(key: string, defaultVal: string|string[]|boolean = null): string | string[] | boolean {
        const value = Configuration.getConfigurationProperty(key);
        if (value === undefined || value === null) {
            return defaultVal;
        }
        return value;
    }
}
