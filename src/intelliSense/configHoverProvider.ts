// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fse from "fs-extra";
import * as vscode from "vscode";
import { IntelliSenseUtility } from "./intelliSenseUtility";

export class ConfigHoverProvider implements vscode.HoverProvider {
    public async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover> {
        const dockerfileInfo: { dockerfile: string, range: vscode.Range } = await IntelliSenseUtility.getImageDockerfileAtLocation(document, position);
        if (dockerfileInfo && dockerfileInfo.dockerfile) {
            const dockerfileContent: string = await fse.readFile(dockerfileInfo.dockerfile, "utf-8");
            return new vscode.Hover({ language: "dockerfile", value: dockerfileContent }, dockerfileInfo.range);
        }

        return undefined;
    }
}
