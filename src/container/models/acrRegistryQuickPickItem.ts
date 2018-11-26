// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { AzureSubscription } from "../../typings/azure-account.api";

export class AcrRegistryQuickPickItem implements vscode.QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    public readonly detail?: string;

    constructor(
        public readonly registry: Registry,
        public readonly azureSubscription: AzureSubscription,
    ) {
        this.label = registry.loginServer || "";
        this.description = azureSubscription.subscription.displayName;
    }
}
