"use strict";

export class Utility {
    public static getDeviceId(deviceConnectionString: string): string {
        const result = /DeviceId=([^=;]+);/.exec(deviceConnectionString);
        return result ? result[1] : "";
    }
}
