// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

import * as jsonMap from "json-source-map";
import * as vscode from "vscode";

export class ASAModuleUpdateCodeLensProvider implements vscode.CodeLensProvider {
    private templateFilePath: string;
    private ASAModuleTwinPathRoot: string = "/modulesContent/";

    public async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const deploymentJsonString = document.getText();
        this.templateFilePath = document.uri.fsPath;
        return Promise.resolve(this.generateCodeLens(deploymentJsonString));
    }

    public generateCodeLens(deploymentJsonString: string): vscode.CodeLens[] {
        const codeLensArr: vscode.CodeLens[]  = [];
        const result = jsonMap.parse(deploymentJsonString);
        const deploymentJson = result.data;
        const ASAModuleNamesArr = [];
        for (const name in deploymentJson.modulesContent) {
            if (deploymentJson.modulesContent[name]["properties.desired"].ASAJobEtag) {
                ASAModuleNamesArr.push(name);
            }
        }

        for (const name of ASAModuleNamesArr) {
            const lineNum = result.pointers[this.ASAModuleTwinPathRoot + name].key.line;
            const range = new vscode.Range(lineNum, 0, lineNum, 100);
            const cmd: vscode.Command = {
                title: "Check Configurations Update for ASA Job",
                command: "azure-iot-edge.internal.checkUpdateForASAModule",
                arguments: [this.templateFilePath, name],
            };
            codeLensArr.push(new vscode.CodeLens(range, cmd));
        }

        return codeLensArr;
    }
}
