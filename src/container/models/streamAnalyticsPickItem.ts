// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { StreamingJob } from "@azure/arm-streamanalytics/esm/models";
import * as vscode from "vscode";
import { AzureSubscription } from "../../typings/azure-account.api";

export class StreamAnalyticsPickItem implements vscode.QuickPickItem {
    public readonly label: string;
    public readonly description: string;
    public readonly detail?: string;

    constructor(
        public readonly job: StreamingJob,
        public readonly azureSubscription: AzureSubscription,
    ) {
        this.label = job.name || "";
        this.description = azureSubscription.subscription.displayName;
    }
}
