// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import TelemetryReporter from "@vscode/extension-telemetry";
import * as vscode from "vscode";
import { Constants } from "./constants";

const packageJSON = vscode.extensions.getExtension(Constants.ExtensionId).packageJSON;
const extensionVersion: string = packageJSON.version;
const aiKey: string = packageJSON.aiKey;

export class TelemetryClient {
    public static sendEvent(eventName: string, properties?: { [key: string]: string; }): void {
        this.stampInternalProperty(properties);
        this._client.sendTelemetryEvent(eventName, properties);
    }

    public static sendErrorEvent(eventName: string, properties?: { [key: string]: string; }): void {
        this.stampInternalProperty(properties);
        const errorProperties = Object.values(Constants.errorProperties);
        this._client.sendTelemetryErrorEvent(eventName, properties, null, errorProperties);
    }

    private static _isInternal: boolean = TelemetryClient.isInternalUser();

    private static _client = new TelemetryReporter(Constants.ExtensionId, extensionVersion, aiKey, true);

    private static isInternalUser(): boolean {
        const userDomain = process.env.USERDNSDOMAIN ? process.env.USERDNSDOMAIN.toLowerCase() : "";
        return userDomain.endsWith("microsoft.com");
    }

    private static stampInternalProperty(properties?: { [key: string]: string; }) {
        if (properties) {
            properties[Constants.isInternalPropertyName] = this._isInternal === true ? "true" : "false";
        } else {
            properties = {
                [Constants.isInternalPropertyName]: this._isInternal === true ? "true" : "false",
            };
        }
    }
}
