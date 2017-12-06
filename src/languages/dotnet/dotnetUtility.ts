"use strict";
import * as vscode from "vscode";
import { Constants } from "../../common/constants";
import { Executor } from "../../common/executor";
import { TelemetryClient } from "../../common/telemetryClient";
import { Utility } from "../../common/utility";

export class DotnetUtility {
    public async dotnetPublish(fileUri?: vscode.Uri) {
        const projectFilePath: string = await Utility.getInputFilePath(fileUri, Constants.dotNetProjectFileNamePattern, ".NET project file", "dotnetPublish.start");

        if (projectFilePath) {
            Executor.runInTerminal(`dotnet publish \"${Utility.adjustFilePath(projectFilePath)}\"`);
            TelemetryClient.sendEvent("dotnetPublish.end");
        }
    }
}
