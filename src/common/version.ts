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
        return Versions.getInstall(Constants.installCSharpModule, true);
    }

    public static installCSFunctionTemplate(): boolean {
        return Versions.getInstall(Constants.installCSFunctionModule, true);
    }

    public static csTemplateVersion(): string {
        return Versions.getVersion(Constants.versionCSharpModule);
    }

    public static csFunctionTemplateVersion(): string {
        return Versions.getVersion(Constants.versionFunctionModule);
    }

    public static pythonTemplateVersion(): string {
        return Versions.getVersion(Constants.versionPythonModule, "master");
    }

    public static cTemplateVersion(): string {
        return Versions.getVersion(Constants.versionCModule, "master");
    }

    public static javaTemplateVersion(): string {
        return Versions.getVersion(Constants.versionJavaModule, "1.1.0");
    }

    private static edgeAgentVersion(): string {
        return Versions.getVersion(Constants.versionEdgeAgent, "1.0");
    }

    private static edgeHubVersion(): string {
        return Versions.getVersion(Constants.versionEdgeHub, "1.0");
    }

    private static tempSensorVersion(): string {
        return Versions.getVersion(Constants.versionTempSensor, "1.0");
    }

    private static getVersion(key: string, defaultVal: string = null): string {
        const version = Utility.getConfigurationProperty(key);
        if (!version) {
            return defaultVal;
        }
        return version;
    }

    private static getInstall(key: string, defaultVal: boolean): boolean {
        const val: boolean = Utility.getConfigurationProperty(key);
        if (val === undefined) {
            return defaultVal;
        }
        return val;
    }
}
