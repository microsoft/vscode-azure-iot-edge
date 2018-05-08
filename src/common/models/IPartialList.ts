// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

export interface IPartialList<T> extends Array<T> {
    nextLink?: string;
}
