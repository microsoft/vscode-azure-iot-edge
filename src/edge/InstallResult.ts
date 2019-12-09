// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
export enum InstallReturn {
    Success = 0,
    Failed,
    Canceled,
    NotSupported,
    IsInstalling,
}

export class InstallResult {
    public readonly resultType: InstallReturn;
    public readonly errMsg: string;
    constructor(resultType: InstallReturn, errMsg: string = null) {
        this.resultType = resultType;
        this.errMsg = errMsg;
    }
}
