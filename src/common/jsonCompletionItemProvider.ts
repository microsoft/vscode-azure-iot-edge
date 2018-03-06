"use strict";
import * as fse from "fs-extra";
import { getLocation, Location, parse } from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";
import { ContainerManager } from "../container/containerManager";
import { Constants } from "./constants";
import { Utility } from "./utility";

export class JsonCompletionItemProvider implements vscode.CompletionItemProvider {
    constructor(private containerManager: ContainerManager) {
    }
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const location: Location = getLocation(document.getText(), document.offsetAt(position));
        const range: vscode.Range = document.getWordRangeAtPosition(position) || new vscode.Range(position, position);

        if (location.path[0] === "moduleContent" && location.path[1] === "$edgeAgent"
            && location.path[2] === "properties.desired" && location.path[3] === "modules"
            && location.path[5] === "settings" && location.path[6] === "image") {
            const completionItems: vscode.CompletionItem[] = [];
            const images: string[] = await this.containerManager.listImages(document.uri);

            images.forEach((image) => {
                const completionItem: vscode.CompletionItem = new vscode.CompletionItem(image);
                // completionItem.filterText = "\"" + image;
                completionItems.push(completionItem);
            });

            // const moduleCompletionItem = new vscode.CompletionItem("edgeModule");
            // moduleCompletionItem.filterText = "\"edgeModule\"";
            // moduleCompletionItem.kind = vscode.CompletionItemKind.Module;
            // moduleCompletionItem.detail = "Module for edgeAgent to start";
            // moduleCompletionItem.range = range;
            return completionItems;
        }
    }
}
