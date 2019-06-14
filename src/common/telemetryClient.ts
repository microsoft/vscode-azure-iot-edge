// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Constants } from "./constants";

const packageJSON = vscode.extensions.getExtension(Constants.ExtensionId).packageJSON;
const extensionVersion: string = packageJSON.version;
const aiKey: string = packageJSON.aiKey;

export class TelemetryClient {
    public static sendEvent(eventName: string, properties?: { [key: string]: string; }): void {
        if (properties) {
            properties[Constants.isInternalPropertyName] = TelemetryClient.isInternal === true ? "true" : "false";
        } else {
            properties = {
                [Constants.isInternalPropertyName] : TelemetryClient.isInternal === true ? "true" : "false",
            };
        }
        this._client.sendTelemetryEvent(eventName, properties);
    }

    private static isInternal: boolean = TelemetryClient.isInternalUser();

    private static _client = new TelemetryReporter(Constants.ExtensionId, extensionVersion, aiKey);

    private static isInternalUser(): boolean {
        const userDomain = process.env.USERDNSDOMAIN ? process.env.USERDNSDOMAIN.toLowerCase() : "";
        return userDomain.endsWith("microsoft.com");
    }
}
