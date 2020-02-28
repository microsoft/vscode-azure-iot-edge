// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class SimulatorInfo {
    public version: string;
    public standaloneDownloadUrl: string;
    constructor(version: string, standaloneDownloadUrl: string) {
        this.version = version;
        this.standaloneDownloadUrl = standaloneDownloadUrl;
    }
}
