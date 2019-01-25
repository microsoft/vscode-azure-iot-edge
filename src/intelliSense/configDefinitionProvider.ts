// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { IntelliSenseUtility } from "./intelliSenseUtility";

export class ConfigDefinitionProvider implements vscode.DefinitionProvider {
    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Definition> {
        const dockerfileInfo: { dockerfile: string, range: vscode.Range } = await IntelliSenseUtility.getImageDockerfileAtLocation(document, position);
        if (dockerfileInfo && dockerfileInfo.dockerfile) {
            const beginOfFile: vscode.Position = new vscode.Position(0, 0);
            return new vscode.Location(vscode.Uri.file(dockerfileInfo.dockerfile), beginOfFile);
        }

        return undefined;
    }
}
