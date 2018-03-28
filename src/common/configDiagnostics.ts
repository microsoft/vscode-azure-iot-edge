"use restrict";
import * as fse from "fs-extra";
import { findNodeAtLocation, Node, parse, parseTree } from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class ConfigDiagnostics {
    public static async updateDiagnostics(document: vscode.TextDocument, diagCollection: vscode.DiagnosticCollection) {
        if (!document && path.basename(document.uri.fsPath) !== Constants.deploymentTemplate && path.basename(document.uri.fsPath) !== Constants.moduleManifest) {
            return;
        }

        diagCollection.delete(document.uri);
        let diags: vscode.Diagnostic[] = [];
        if (path.basename(document.uri.fsPath) === Constants.deploymentTemplate) {
            diags = await this.provideDeploymentTemplateDiagnostics(document);
        } else if (path.basename(document.uri.fsPath) === Constants.moduleManifest) {
            diags = await this.provideModuleManifestDiagnostics(document);
        }

        diagCollection.set(document.uri, diags);
    }

    private static async provideDeploymentTemplateDiagnostics(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const diags: vscode.Diagnostic[] = [];

        const pattern: RegExp = new RegExp(/\${MODULES\..+}/g);

        const moduleToImageMap: Map<string, string> = new Map();
        const imageToDockerfileMap: Map<string, string> = new Map();

        try {
            await Utility.setSlnModulesMap(path.dirname(document.uri.fsPath), moduleToImageMap, imageToDockerfileMap);

            const rootNode: Node = parseTree(document.getText());
            const moduleJsonPath: string[] = Constants.moduleDeploymentManifestJsonPath.slice(0, - 1); // remove the trailing "*" element
            const modulesNode: Node = findNodeAtLocation(rootNode, moduleJsonPath);

            for (const moduleNode of modulesNode.children) {
                const moduleName: string = moduleNode.children[0].value; // the node property name is stored in its first child node
                const imgJsonPath: string[] = Constants.imgDeploymentManifestJsonPath.slice(Constants.moduleNameDeploymentManifestJsonPathIndex + 1); // image node JSON path relative to module node
                const imageNode: Node = findNodeAtLocation(moduleNode.children[1], imgJsonPath); // the node value is stored in its second child node

                if (!imageNode) {
                    continue;
                }

                const imageUrl: string = imageNode.value;
                if (imageUrl.search(pattern) !== -1) {
                    const imageUrlUnwrapped: string = imageUrl.slice(2, -1); // remove the wrapping "${" and "}"
                    if (!moduleToImageMap.has(imageUrlUnwrapped)) {
                        const diag: vscode.Diagnostic = new vscode.Diagnostic(this.getNodeRange(document, imageNode),
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

    private static async provideModuleManifestDiagnostics(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const diags: vscode.Diagnostic[] = [];

        const rootNode: Node = parseTree(document.getText());
        const platformJsonPath: string[] = Constants.platformModuleManifestJsonPath.slice(0, -1); // remove the trailing "*" element
        const platformsNode: Node = findNodeAtLocation(rootNode, platformJsonPath);

        for (const platformNode of platformsNode.children) {
            const dockerfilePath: string = platformNode.children[1].value; // the node value is stored in its second child node
            const dockerfileFullPath: string = path.join(path.dirname(document.uri.fsPath), dockerfilePath);
            const exists: boolean = await fse.pathExists(dockerfileFullPath);
            if (!exists) {
                const diag: vscode.Diagnostic = new vscode.Diagnostic(this.getNodeRange(document, platformNode.children[1]),
                    "Invalid Dockfile path", vscode.DiagnosticSeverity.Error);
                diag.source = Constants.edgeDisplayName;
                diags.push(diag);
            }
        }

        return diags;
    }

    private static getNodeRange(document: vscode.TextDocument, node: Node): vscode.Range {
        return new vscode.Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
    }
}
