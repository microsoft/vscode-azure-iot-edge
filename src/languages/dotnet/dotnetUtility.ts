"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { Executor } from "../../common/executor";
import { Utility } from "../../common/utility";

export class DotnetUtility {
    public static dotnetPublish(fileUri: vscode.Uri) {
        if (!fileUri) {
            return;
        }
        Executor.runInTerminal(`dotnet publish \"${Utility.adjustFilePath(fileUri.fsPath)}\"`);
    }
}
