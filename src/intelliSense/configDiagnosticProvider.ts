// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fse from "fs-extra";
import * as parser from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Utility } from "../common/utility";
import { IntelliSenseUtility } from "./intelliSenseUtility";

export class ConfigDiagnosticProvider {
    public async updateDiagnostics(document: vscode.TextDocument, diagCollection: vscode.DiagnosticCollection) {
        if (!document ||
            (path.basename(document.uri.fsPath) !== Constants.deploymentTemplate
            && path.basename(document.uri.fsPath) !== Constants.deploymentDebugTemplate
            && path.basename(document.uri.fsPath) !== Constants.moduleManifest)) {
            return;
        }

        diagCollection.delete(document.uri);
        let diags: vscode.Diagnostic[] = [];
        if (path.basename(document.uri.fsPath) === Constants.deploymentTemplate || path.basename(document.uri.fsPath) === Constants.deploymentDebugTemplate) {
            diags = await this.provideDeploymentTemplateDiagnostics(document);
        } else if (path.basename(document.uri.fsPath) === Constants.moduleManifest) {
            diags = await this.provideModuleManifestDiagnostics(document);
        }

        diagCollection.set(document.uri, diags);
    }

    private async provideDeploymentTemplateDiagnostics(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const diags: vscode.Diagnostic[] = [];

        const moduleToImageMap: Map<string, string> = new Map();

        try {
            await Utility.setSlnModulesMap(document.uri.fsPath, moduleToImageMap);

            const rootNode: parser.Node = parser.parseTree(document.getText());
            const moduleJsonPath: string[] = Constants.moduleDeploymentManifestJsonPath.slice(0, - 1); // remove the trailing "*" element
            const modulesNode: parser.Node = parser.findNodeAtLocation(rootNode, moduleJsonPath);

            for (const moduleNode of modulesNode.children) {
                const moduleName: string = moduleNode.children[0].value; // the node property name is stored in its first child node
                const imgJsonPath: string[] = Constants.imgDeploymentManifestJsonPath.slice(Constants.moduleNameDeploymentManifestJsonPathIndex + 1); // image node JSON path relative to module node
                const imageNode: parser.Node = parser.findNodeAtLocation(moduleNode.children[1], imgJsonPath); // the node value is stored in its second child node

                if (!imageNode) {
                    continue;
                }

                const imgPlaceholder: string = Utility.unwrapImagePlaceholder(imageNode.value);
                if (imgPlaceholder) {
                    if (!moduleToImageMap.has(imgPlaceholder)) {
                        const diag: vscode.Diagnostic = new vscode.Diagnostic(IntelliSenseUtility.getNodeRange(document, imageNode),
                            "Invalid image placeholder", vscode.DiagnosticSeverity.Error);
                        diag.source = Constants.edgeDisplayName;
                        diags.push(diag);
                    }
                }
            }
        } catch {
            return [];
        }

        return diags;
    }

    private async provideModuleManifestDiagnostics(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const diags: vscode.Diagnostic[] = [];

        const rootNode: parser.Node = parser.parseTree(document.getText());
        const platformJsonPath: string[] = Constants.platformModuleManifestJsonPath.slice(0, -1); // remove the trailing "*" element
        const platformsNode: parser.Node = parser.findNodeAtLocation(rootNode, platformJsonPath);

        for (const platformNode of platformsNode.children) {
            const dockerfilePath: string = platformNode.children[1].value; // the node value is stored in its second child node
            const dockerfileFullPath: string = path.join(path.dirname(document.uri.fsPath), dockerfilePath);
            const exists: boolean = await fse.pathExists(dockerfileFullPath);
            if (!exists) {
                const diag: vscode.Diagnostic = new vscode.Diagnostic(IntelliSenseUtility.getNodeRange(document, platformNode.children[1]),
                    "Invalid Dockerfile path", vscode.DiagnosticSeverity.Error);
                diag.source = Constants.edgeDisplayName;
                diags.push(diag);
            }
        }

        return diags;
    }
}
