import { Configuration } from "./configuration";
import { Constants } from "./constants";

export class Versions {
    public static getRunTimeVersionMap(): Map<string, string> {
        const verMap: Map<string, string> = new Map();
        verMap.set(Constants.edgeAgentVerPlaceHolder, Versions.edgeAgentVersion());
        verMap.set(Constants.edgeHubVerPlaceHolder, Versions.edgeHubVersion());
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
        return Versions.getValue(Constants.versionTempSensor, "1.0") as string;
    }

    public static updateEdgeAgentImageVersion(templateJson: any, versionMap: Map<string, string>) {        
        if(templateJson) {
            const edgeAgentImage = 
                templateJson.modulesContent.$edgeAgent["properties.desired"].systemModules["edgeAgent"].settings["image"];
            templateJson.modulesContent.$edgeAgent["properties.desired"].systemModules["edgeAgent"].settings["image"] =
                Versions.getNewImageVersionJson(edgeAgentImage, versionMap);
        }
    }

    public static updateEdgeHubImageVersion(templateJson: any, versionMap: Map<string, string>) {        
        if(templateJson) {
            const edgeHubImage = templateJson.modulesContent.$edgeAgent["properties.desired"].systemModules["edgeHub"].settings["image"];
            templateJson.modulesContent.$edgeAgent["properties.desired"].systemModules["edgeHub"].settings["image"] =
                Versions.getNewImageVersionJson(edgeHubImage, versionMap);
        }
    }

    private static edgeAgentVersion(): string {
        return Versions.getDefaultEdgeRuntimeVersion();
    }

    public static edgeHubVersion(): string {
        return Versions.getDefaultEdgeRuntimeVersion();
    }

    private static getDefaultEdgeRuntimeVersion(): string {
        return Versions.getValue(Constants.versionDefaultEdgeRuntime, "1.0") as string;
    }

    private static getNewImageVersionJson(input: string, versionMap: Map<string, string>): string {        
        if (input) {
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

    private static getValue(key: string, defaultVal: string|string[]|boolean = null): string | string[] | boolean {
        const value = Configuration.getConfigurationProperty(key);
        if (value === undefined || value === null) {
            return defaultVal;
        }
        return value;
    }
}
