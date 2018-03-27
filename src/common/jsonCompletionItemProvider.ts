"use strict";
import * as fse from "fs-extra";
import { createScanner, getLocation, JSONScanner, Location, Node, parse, SyntaxKind } from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class JsonCompletionItemProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const location: Location = getLocation(document.getText(), document.offsetAt(position));

        if (location.matches(Constants.imgDeploymentManifestJsonPath)) {
            const images: string[] = await this.getSlnImgPlaceholders(document.uri);
            return this.getCompletionItems(images, document, position, location);
        }

        if (location.matches(Constants.moduleDeploymentManifestJsonPath)) {
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
                "\t\t\"createOptions\": \"${8:{}}\"",
                "\t}",
                "}",
            ].join("\n"));
            return [moduleCompletionItem];
        }

        // Disable these completion items temporarily because they will be duplicate with built-in JSON completion items
        // if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent"
        //     && location.path[2] === "properties.desired" && location.path[3] === "modules"
        //     && location.path[5] === "status") {
        //     return this.getCompletionItems(Constants.moduleStatuses, document, position);
        // }

        // Disable these completion items temporarily because they will be duplicate with built-in JSON completion items
        // if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent"
        //     && location.path[2] === "properties.desired" && location.path[3] === "modules"
        //     && location.path[5] === "restartPolicy") {
        //     return this.getCompletionItems(Constants.moduleRestartPolicies, document, position);
        // }

        if (location.matches(Constants.routeDeploymentManifestJsonPath)) {
            const json = parse(document.getText());
            const modules: any = ((json.moduleContent.$edgeAgent || {})["properties.desired"] || {}).modules || {};
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

    private async getSlnImgPlaceholders(templateUri: vscode.Uri): Promise<string[]> {
        const moduleToImageMap: Map<string, string> = new Map();
        const imageToDockerfileMap: Map<string, string> = new Map();

        try {
            await Utility.setSlnModulesMap(path.dirname(templateUri.fsPath), moduleToImageMap, imageToDockerfileMap);

            const placeholders: string[] = [];
            for (const module of moduleToImageMap.keys()) {
                placeholders.push("${" + module + "}");
            }

            return placeholders;
        } catch {
            return;
        }
    }

    private getCompletionItems(values: string[], document: vscode.TextDocument, position: vscode.Position, location: Location): vscode.CompletionItem[] {
        const offset: number = document.offsetAt(position);
        const node: Node = location.previousNode;

        const overwriteRange: vscode.Range = this.getOverwriteRange(document, position, offset, node);
        const separator: string = this.evaluateSeparaterAfter(document, position, offset, node);

        const completionItems: vscode.CompletionItem[] = [];
        for (let value of values) {
            value = "\"" + value + "\"";
            const completionItem: vscode.CompletionItem = new vscode.CompletionItem(value);
            completionItem.range = overwriteRange;
            completionItem.insertText = value + separator;
            completionItem.kind = vscode.CompletionItemKind.Value;
            completionItems.push(completionItem);
        }

        return completionItems;
    }

    // this method calculates the range to overwrite with the completion text
    private getOverwriteRange(document: vscode.TextDocument, position: vscode.Position, offset: number, node: Node): vscode.Range {
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
    private evaluateSeparaterAfter(document: vscode.TextDocument, position: vscode.Position, offset: number, node: Node) {
        // when the cursor is placed in a node, set the scanner location to the end of the node
        if (node && (node.type === "string" || node.type === "number" || node.type === "boolean" || node.type === "null")) {
            offset = node.offset + node.length;
        }

        const scanner: JSONScanner = createScanner(document.getText(), true);
        scanner.setPosition(offset);
        const token: SyntaxKind = scanner.scan();
        switch (token) {
            // do not append a comman when next token is comma or other close tokens
            case SyntaxKind.CommaToken:
            case SyntaxKind.CloseBraceToken:
            case SyntaxKind.CloseBracketToken:
            case SyntaxKind.EOF:
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
