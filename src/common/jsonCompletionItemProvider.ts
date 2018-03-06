"use strict";
import * as fse from "fs-extra";
import { getLocation, Location, parse } from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class JsonCompletionItemProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const location: Location = getLocation(document.getText(), document.offsetAt(position));

        if (location.path.length === 5 && location.path[0] === "moduleContent"
            && location.path[1] === "$edgeAgent" && location.path[2] === "properties.desired"
            && location.path[3] === "modules") {
            const moduleCompletionItem = new vscode.CompletionItem("edgeModule");
            moduleCompletionItem.filterText = "\"edgeModule\"";
            moduleCompletionItem.kind = vscode.CompletionItemKind.Snippet;
            moduleCompletionItem.detail = "Module for edgeAgent to start";
            moduleCompletionItem.range = document.getWordRangeAtPosition(position);
            moduleCompletionItem.insertText = new vscode.SnippetString([
                "\"${1:SampleModule}\": {",
                "\t\"version\": \"${2:1.0}\",",
                "\t\"type\": \"docker\",",
                "\t\"status\": \"${3|" + Constants.moduleStatuses.join(",") + "|}\",",
                "\t\"restartPolicy\": \"${4|" + Constants.moduleRestartPolicies.join(",") + "|}\",",
                "\t\"settings\": {",
                "\t\t\"image\": \"${5:<registry>}/${6:<repo-name>}:${7:<tag>}\",",
                "\t\t\"createOptions\": \"${8:{}}\"",
                "\t}",
                "}",
            ].join("\n"));
            return [moduleCompletionItem];
        }

        if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent"
            && location.path[2] === "properties.desired" && location.path[3] === "modules"
            && location.path[5] === "status") {
            return this.getCompletionItems(Constants.moduleStatuses, document, position);
        }

        if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent"
            && location.path[2] === "properties.desired" && location.path[3] === "modules"
            && location.path[5] === "restartPolicy") {
            return this.getCompletionItems(Constants.moduleRestartPolicies, document, position);
        }

        if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent"
            && location.path[2] === "properties.desired" && location.path[3] === "modules"
            && location.path[5] === "settings" && location.path[6] === "image") {
            const images: string[] = await this.getSlnImgPlaceholders(document.uri);
            return this.getCompletionItems(images, document, position);
        }

        if (location.path.length === 5 && location.path[0] === "moduleContent"
            && location.path[1] === "$edgeHub" && location.path[2] === "properties.desired"
            && location.path[3] === "routes") {
            const json = parse(document.getText());
            const modules: any = ((json.moduleContent.$edgeAgent || {})["properties.desired"] || {}).modules || {};
            const moduleIds: string[] = Object.keys(modules);

            const routeCompletionItem: vscode.CompletionItem = new vscode.CompletionItem("edgeRoute");
            routeCompletionItem.filterText = "\"edgeRoute\"";
            routeCompletionItem.kind = vscode.CompletionItemKind.Snippet;
            routeCompletionItem.detail = "Route for the Edge Hub. Route name is used as the key for the route. To delete a route, set the route name as null";
            routeCompletionItem.range = document.getWordRangeAtPosition(position);
            routeCompletionItem.insertText = new vscode.SnippetString(this.getRouteSnippetString(moduleIds));
            return [routeCompletionItem];
        }
    }

    private async getSlnImgPlaceholders(templateUri: vscode.Uri): Promise<string[]> {
        const moduleDirs: string[] = await Utility.getSubDirectories(path.join(path.dirname(templateUri.fsPath), Constants.moduleFolder));

        if (!moduleDirs) {
            return;
        }

        const images: string[] = [];
        await Promise.all(
            moduleDirs.map(async (module) => {
                const moduleFile: string = path.join(module, Constants.moduleManifest);
                const moduleName: string = path.basename(module);
                if (await fse.exists(moduleFile)) {
                    const moduleInfo: any = await fse.readJson(moduleFile);

                    Object.keys(moduleInfo.image.tag.platforms).map((platform) => {
                        images.push("${MODULES." + moduleName + "." + platform + "}");
                    });
                }
            }),
        );

        return images;
    }

    private getCompletionItems(values: string[], document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completionItems: vscode.CompletionItem[] = [];

        for (let value of values) {
            // Wrapped the value with quotation marks since the triggering text is also used to filter
            value = "\"" + value + "\"";
            const completionItem: vscode.CompletionItem = new vscode.CompletionItem(value);
            completionItem.range = this.getOverwriteRange(document, position);
            // Replace the overwriteRange with the image plus the trailing comma
            completionItem.insertText = value + ",";
            completionItem.kind = vscode.CompletionItemKind.Value;
            completionItems.push(completionItem);
        }

        return completionItems;
    }

    private getOverwriteRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
        // Include the trailing comma (if exists) to the overwrite range
        const wordRange: vscode.Range = document.getWordRangeAtPosition(position);
        const nextCharRange: vscode.Range = new vscode.Range(wordRange.end.line, wordRange.end.character, wordRange.end.line, wordRange.end.character + 1);
        const nextChar: string = document.getText(nextCharRange);
        const overwriteRange: vscode.Range = nextChar === "," ? wordRange.with(undefined, nextCharRange.end) : wordRange;

        return overwriteRange;
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
