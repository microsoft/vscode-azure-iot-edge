// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

export class ConfigNotSetError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}
