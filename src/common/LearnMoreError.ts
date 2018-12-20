// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

export class LearnMoreError extends Error {
    public readonly url: string;
    constructor(msg: string, url: string) {
        super(msg);
        this.url = url;
    }
}
