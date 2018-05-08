// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { IPartialList } from "./IPartialList";

export interface IAzureClient<T> {
    listNext(nextPageLink: string): Promise<IPartialList<T>>;
}
