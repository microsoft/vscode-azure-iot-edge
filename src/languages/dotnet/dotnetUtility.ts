"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { Executor } from "../../common/executor";
import { TelemetryClient } from "../../common/telemetryClient";
import { Utility } from "../../common/utility";

export class DotnetUtility {
    public static dotnetPublish(fileUri: vscode.Uri) {
        TelemetryClient.sendEvent("dotnetPublish.start");
        if (!fileUri) {
            return;
        }
        Executor.runInTerminal(`dotnet publish \"${Utility.adjustFilePath(fileUri.fsPath)}\"`);
        TelemetryClient.sendEvent("dotnetPublish.end");
    }
}
