import { Configuration } from "./configuration";
import { Constants } from "./constants";

export class Platform {
    public static getDefaultPlatform(): Platform {
        const defaultPlatform = Configuration.getConfigurationProperty(Constants.defPlatformConfig);
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
        const platformObjs = Configuration.getConfiguration().get<any>(Constants.platformsConfig);
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
