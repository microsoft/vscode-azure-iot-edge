"use restrict";
import * as fse from "fs-extra";
import { parse } from "jsonc-parser";
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

        // const template: string = await fse.readFile(document.uri.fsPath, "utf8");
        // const pattern: RegExp = new RegExp(/\${MODULES\..+}/g);
        // const matched: string[] = template.match(pattern);

        // const moduleToImageMap: Map<string, string> = new Map();
        // const imageToDockerfileMap: Map<string, string> = new Map();

        // try {
        //     await Utility.setSlnModulesMap(path.dirname(document.uri.fsPath), moduleToImageMap, imageToDockerfileMap);

        //     for (const image of matched) {
        //         if (!moduleToImageMap.has(`\$${image}`)) {
        //             const diag: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(5, 0)), "Invalid image URL", vscode.DiagnosticSeverity.Error);
        //             diag.source = Constants.edgeDisplayName;
        //             diags.push(diag);
        //         }
        //     }
        // } catch {
        //     return;
        // }

        const json = parse(document.getText());
        const modules: any = (((json.moduleContent || {}).$edgeAgent || {})["properties.desired"] || {}).modules || {};
        const images: 

        return diags;
    }

    private static async provideModuleManifestDiagnostics(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        return [];
    }
}
