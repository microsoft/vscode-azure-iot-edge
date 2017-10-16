"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { Executor } from "../../common/executor";

export class DotnetUtility {
    public static dotnetPublish(fileUri: vscode.Uri) {
        if (!fileUri) {
            return;
        }
        const dirname = path.dirname(fileUri.fsPath);
        Executor.runInTerminal(`cd ${dirname}`);
        Executor.runInTerminal("dotnet publish");
    }
}
