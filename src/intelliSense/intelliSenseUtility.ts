// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as parser from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";
import { BuildSettings } from "../common/buildSettings";
import { Constants } from "../common/constants";
import { Utility } from "../common/utility";

// This class contains utility functions specific to IntelliSense features,
// or more specifically, functions related to parser, which are unlikely to be used by non-IntelliSense classes.
export class IntelliSenseUtility {
    public static locationMatch(location: parser.Location, jsonPath: string[]): boolean {
        return location.matches(jsonPath) && location.path.length === jsonPath.length;
    }

    public static async getImageDockerfileAtLocation(document: vscode.TextDocument, position: vscode.Position): Promise<{ dockerfile: string, range: vscode.Range }> {
        const location: parser.Location = parser.getLocation(document.getText(), document.offsetAt(position));

        if (IntelliSenseUtility.locationMatch(location, Constants.imgDeploymentManifestJsonPath)) {
            const moduleToImageMap: Map<string, string> = new Map();
            const imageToBuildSettingsMap: Map<string, BuildSettings> = new Map();

            try {
                await Utility.setSlnModulesMap(document.uri.fsPath, moduleToImageMap, imageToBuildSettingsMap);

                const node: parser.Node = location.previousNode;
                const imagePlaceholder: string = Utility.unwrapImagePlaceholder(node.value);
                const image = moduleToImageMap.get(imagePlaceholder);
                if (image) {
                    const dockerfile: string = imageToBuildSettingsMap.get(image).dockerFile;
                    const range: vscode.Range = IntelliSenseUtility.getNodeRange(document, node);
                    return { dockerfile, range };
                }
            } catch {
                return undefined;
            }
        }

        return undefined;
    }

    public static getNodeRange(document: vscode.TextDocument, node: parser.Node): vscode.Range {
        return new vscode.Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
    }
}
