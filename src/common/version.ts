import { Constants } from "./constants";
import { Utility } from "./utility";

export class Versions {
    public static getRunTimeVersionMap(): Map<string, string> {
        const verMap: Map<string, string> = new Map();
        verMap.set(Constants.edgeAgentVerPlaceHolder, Versions.edgeAgentVersion());
        verMap.set(Constants.edgeHubVerPlaceHolder, Versions.edgeHubVersion());
        verMap.set(Constants.tempSensorVerPlaceHolder, Versions.tempSensorVersion());
        return verMap;
    }

    public static installCSharpTemplate(): boolean {
        return Versions.getValue(Constants.installCSharpModule, true) as boolean;
    }

    public static installCSFunctionTemplate(): boolean {
        return Versions.getValue(Constants.installCSFunctionModule, true) as boolean;
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
        return Versions.getValue(Constants.versionJavaModule, "1.1.0") as string;
    }

    private static edgeAgentVersion(): string {
        return Versions.getValue(Constants.versionEdgeAgent) as string;
    }

    private static edgeHubVersion(): string {
        return Versions.getValue(Constants.versionEdgeHub, "1.0") as string;
    }

    private static tempSensorVersion(): string {
        return Versions.getValue(Constants.versionTempSensor, "1.0") as string;
    }

    private static getValue(key: string, defaultVal: string|boolean = null): string | boolean {
        const value = Utility.getConfigurationProperty(key);
        if (value === undefined) {
            return defaultVal;
        }
        return value;
    }
}
