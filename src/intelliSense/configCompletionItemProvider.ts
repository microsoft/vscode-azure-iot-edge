// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as parser from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { Utility } from "../common/utility";
import { IntelliSenseUtility } from "./intelliSenseUtility";

export class ConfigCompletionItemProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const location: parser.Location = parser.getLocation(document.getText(), document.offsetAt(position));

        if (IntelliSenseUtility.locationMatch(location, Constants.moduleDeploymentManifestJsonPath)) {
            const moduleCompletionItem = new vscode.CompletionItem(Constants.moduleSnippetLabel);
            moduleCompletionItem.filterText = `\"${Constants.moduleSnippetLabel}\"`;
            moduleCompletionItem.kind = vscode.CompletionItemKind.Snippet;
            moduleCompletionItem.detail = Constants.moduleSnippetDetail;
            moduleCompletionItem.range = document.getWordRangeAtPosition(position);
            moduleCompletionItem.insertText = new vscode.SnippetString([
                "\"${1:" + Constants.moduleNameDft + "}\": {",
                "\t\"version\": \"${2:1.0}\",",
                "\t\"type\": \"" + Constants.moduleTypes.join(",") + "\",",
                "\t\"status\": \"${3|" + Constants.moduleStatuses.join(",") + "|}\",",
                "\t\"restartPolicy\": \"${4|" + Constants.moduleRestartPolicies.join(",") + "|}\",",
                "\t\"settings\": {",
                "\t\t\"image\": \"${5:" + Constants.registryPlaceholder + "}/${6:" + Constants.repoNamePlaceholder + "}:${7:" + Constants.tagPlaceholder + "}\",",
                "\t\t\"createOptions\": {$8}",
                "\t}",
                "}",
            ].join("\n"));
            return [moduleCompletionItem];
        }

        // Disable following two group of completion items temporarily because they will be duplicate with built-in JSON completion items
        // Tracking issue: https://github.com/Microsoft/vscode/issues/45864

        // if (location.path[0] === "modulesContent" && location.path[1] === "$edgeAgent"
        //     && location.path[2] === "properties.desired" && location.path[3] === "modules"
        //     && location.path[5] === "status") {
        //     return this.getCompletionItems(Constants.moduleStatuses, document, position);
        // }

        // if (location.path[0] === "modulesContent" && location.path[1] === "$edgeAgent"
        //     && location.path[2] === "properties.desired" && location.path[3] === "modules"
        //     && location.path[5] === "restartPolicy") {
        //     return this.getCompletionItems(Constants.moduleRestartPolicies, document, position);
        // }

        if (IntelliSenseUtility.locationMatch(location, Constants.imgDeploymentManifestJsonPath)) {
            const moduleToImageMap: Map<string, string> = new Map();
            await Utility.setSlnModulesMap(document.uri.fsPath, moduleToImageMap);
            return this.getCompletionItems(Array.from(moduleToImageMap.keys()), document, position, location);
        }

        if (IntelliSenseUtility.locationMatch(location, Constants.routeDeploymentManifestJsonPath)) {
            const json = parser.parse(document.getText());
            const modules: any = ((json.modulesContent.$edgeAgent || {})["properties.desired"] || {}).modules || {};
            const moduleIds: string[] = Object.keys(modules);

            const routeCompletionItem: vscode.CompletionItem = new vscode.CompletionItem(Constants.routeSnippetLabel);
            routeCompletionItem.filterText = `\"${Constants.routeSnippetLabel}\"`;
            routeCompletionItem.kind = vscode.CompletionItemKind.Snippet;
            routeCompletionItem.detail = Constants.routeSnippetDetail;
            routeCompletionItem.range = document.getWordRangeAtPosition(position);
            routeCompletionItem.insertText = new vscode.SnippetString(this.getRouteSnippetString(moduleIds));
            return [routeCompletionItem];
        }
    }

    private getCompletionItems(values: string[], document: vscode.TextDocument, position: vscode.Position, location: parser.Location): vscode.CompletionItem[] {
        const offset: number = document.offsetAt(position);
        const node: parser.Node = location.previousNode;

        const overwriteRange: vscode.Range = this.getOverwriteRange(document, position, offset, node);
        const separator: string = this.evaluateSeparatorAfter(document, position, offset, node);

        const completionItems: vscode.CompletionItem[] = [];
        for (const value of values) {
            const label = "\"${" + value + "}\"";
            const completionItem: vscode.CompletionItem = new vscode.CompletionItem(label);
            completionItem.range = overwriteRange;
            completionItem.insertText = label + separator;
            completionItem.kind = vscode.CompletionItemKind.Value;
            completionItem.sortText = value;

            completionItems.push(completionItem);
        }

        return completionItems;
    }

    // this method calculates the range to overwrite with the completion text
    private getOverwriteRange(document: vscode.TextDocument, position: vscode.Position, offset: number, node: parser.Node): vscode.Range {
        let overwriteRange: vscode.Range;
        if (node && node.offset <= offset && offset <= node.offset + node.length
            && (node.type === "property" || node.type === "string" || node.type === "number" || node.type === "boolean" || node.type === "null")) {
            // when the cursor is placed in a node, overwrite the entire content of the node with the completion text
            overwriteRange = new vscode.Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
        } else {
            // when the cursor is not placed in a node, overwrite the word to the postion with the completion text
            const currentWord: string = this.getCurrentWord(document, position);
            overwriteRange = new vscode.Range(document.positionAt(offset - currentWord.length), position);
        }

        return overwriteRange;
    }

    private getCurrentWord(document: vscode.TextDocument, position: vscode.Position): string {
        let i: number = position.character - 1;
        const text: string = document.lineAt(position.line).text;
        while (i >= 0 && ' \t\n\r\v":{[,'.indexOf(text.charAt(i)) === -1) {
            i--;
        }
        return text.substring(i + 1, position.character);
    }

    // this method evaluates whether to append a comma at the end of the completion text
    private evaluateSeparatorAfter(document: vscode.TextDocument, position: vscode.Position, offset: number, node: parser.Node) {
        // when the cursor is placed in a node, set the scanner location to the end of the node
        if (node && (node.type === "string" || node.type === "number" || node.type === "boolean" || node.type === "null")) {
            offset = node.offset + node.length;
        }

        const scanner: parser.JSONScanner = parser.createScanner(document.getText(), true);
        scanner.setPosition(offset);
        const token: parser.SyntaxKind = scanner.scan();
        switch (token) {
            // do not append a comma when next token is comma or other close tokens
            case parser.SyntaxKind.CommaToken:
            case parser.SyntaxKind.CloseBraceToken:
            case parser.SyntaxKind.CloseBracketToken:
            case parser.SyntaxKind.EOF:
                return "";
            default:
                return ",";
        }
    }

    private getRouteSnippetString(moduleIds: string[]): string {
        const snippet: string[] = ["\"${1:route}\":", "\"FROM"];

        const sources: string[] = ["${2|/*", "/messages/*", "/messages/modules/*"];
        if (moduleIds.length === 0) {
            sources.push(`/messages/modules/{moduleId}/*`);
            sources.push(`/messages/modules/{moduleId}/outputs/*`);
            sources.push(`/messages/modules/{moduleId}/outputs/{output}`);
        } else {
            for (const moduleId of moduleIds) {
                sources.push(`/messages/modules/${moduleId}/*`);
            }
            for (const moduleId of moduleIds) {
                sources.push(`/messages/modules/${moduleId}/outputs/*`);
            }
            for (const moduleId of moduleIds) {
                sources.push(`/messages/modules/${moduleId}/outputs/{output}`);
            }
        }

        snippet.push(sources.join(",") + "|}");
        snippet.push("WHERE ${3:<condition>} INTO");

        const sinks: string[] = ["${4|$upstream"];
        if (moduleIds.length === 0) {
            sinks.push(`BrokeredEndpoint(\\"/modules/{moduleId}/inputs/{input}\\")`);
        } else {
            for (const moduleId of moduleIds) {
                sinks.push(`BrokeredEndpoint(\\"/modules/${moduleId}/inputs/{input}\\")`);
            }
        }

        snippet.push(sinks.join(",") + "|}\"");

        return snippet.join(" ");
    }
}
