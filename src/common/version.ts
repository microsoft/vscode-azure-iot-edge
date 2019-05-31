import { Configuration } from "./configuration";
import { Constants } from "./constants";

export class Versions {
    public static getRunTimeVersionMap(): Map<string, string> {
        const verMap: Map<string, string> = new Map();
        verMap.set(Constants.edgeAgentVerPlaceHolder, Versions.edgeAgentVersion());
        verMap.set(Constants.edgeHubVerPlaceHolder, Versions.edgeHubVersion());
        return verMap;
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

    private static edgeAgentVersion(): string {
        return Versions.getValue(Constants.versionEdgeAgent) as string;
    }

    private static edgeHubVersion(): string {
        return Versions.getValue(Constants.versionEdgeHub, "1.0") as string;
    }

    private static getValue(key: string, defaultVal: string|boolean = null): string | boolean {
        const value = Configuration.getConfigurationProperty(key);
        if (value === undefined || value === null) {
            return defaultVal;
        }
        return value;
    }
}
