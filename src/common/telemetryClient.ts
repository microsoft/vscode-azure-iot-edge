// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Constants } from "./constants";

const extensionVersion: string = vscode.extensions.getExtension(Constants.ExtensionId).packageJSON.version;

export class TelemetryClient {
    public static sendEvent(eventName: string, properties?: { [key: string]: string; }): void {
        this._client.sendTelemetryEvent(eventName, properties);
    }

    private static _client = new TelemetryReporter(Constants.ExtensionId, extensionVersion, Constants.AIKey);
}
