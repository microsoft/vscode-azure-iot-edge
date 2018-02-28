"use strict";
import { getLocation, Location, parse } from "jsonc-parser";
import * as vscode from "vscode";

export class JsonCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
        const location: Location = getLocation(document.getText(), document.offsetAt(position));
        const range: vscode.Range = document.getWordRangeAtPosition(position) || new vscode.Range(position, position);

        if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent"
            && location.path[2] === "properties.desired" && location.path[3] === "modules"
            && location.path[5] === "settings" && location.path[6] === "image") {
            const moduleCompletionItem = new vscode.CompletionItem("edgeModule");
            moduleCompletionItem.filterText = "\"edgeModule\"";
            moduleCompletionItem.kind = vscode.CompletionItemKind.Module;
            moduleCompletionItem.detail = "Module for edgeAgent to start";
            moduleCompletionItem.range = range;
            moduleCompletionItem.insertText = new vscode.SnippetString([
                "\"${1:SampleModule}\": {",
                "\t\"version\": \"${2:1.0}\",",
                "\t\"type\": \"docker\",",
                "\t\"status\": \"${3|running,stopped|}\",",
                "\t\"restartPolicy\": \"${4|always,never,on-failed,on-unhealthy|}\",",
                "\t\"settings\": {",
                "\t\t\"image\": \"${5:<registry>}/${6:<image>}:${7:<tag>}\",",
                "\t\t\"createOptions\": \"${8:{}}\"",
                "\t}",
                "}",
            ].join("\n"));
            return [moduleCompletionItem];
        }
    }
}
