import { Constants } from "./constants";
import { Utility } from "./utility";

export class Platform {
    public static getDefaultPlatform(): Platform {
        const defaultPlatform = Utility.getConfigurationProperty(Constants.defPlatformConfig);
        if (!defaultPlatform) {
            return new Platform("amd64", null);
        }
        const platform = defaultPlatform.platform ? defaultPlatform.platform : "amd64";
        return new Platform(platform, defaultPlatform.alias);
    }

    public static getDefaultPlatformStr(): string {
        return Platform.getDefaultPlatform().getDisplayName();
    }

    public static getPlatformsSetting(): Platform[] {
        const platformObjs = Utility.getConfiguration().get<any>("Platforms");
        const platforms: Platform[]  = [];
        for (const key in platformObjs) {
            if (platformObjs.hasOwnProperty(key)) {
                platforms.push(new Platform(key, null));
                const valArr: string[] = platformObjs[key];
                if (valArr) {
                    valArr.map((alias) => {
                        if (alias !== key) {
                            platforms.push(new Platform(key, alias));
                        }
                    });
                }
            }
        }
        return platforms;
    }

    public readonly platform: string;
    public readonly alias: string;

    constructor(platform: string, alias: string) {
        this.platform = platform ? platform : "amd64";
        this.alias = alias;
    }

    public getDisplayName() {
        return this.alias ? `${this.alias} (${this.platform})` : this.platform;
    }
}
