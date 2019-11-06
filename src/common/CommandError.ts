// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class CommandError extends Error {
    public readonly errorCode: number;
    public readonly errorMsg: string;
    constructor(errorMsg: string, errorCode: number) {
        super(`Command failed with exit code ${errorCode}. Detail: ${errorMsg}`);
        this.errorCode = errorCode;
        this.errorMsg = errorMsg;
    }
}
