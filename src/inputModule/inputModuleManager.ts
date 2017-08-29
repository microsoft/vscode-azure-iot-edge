"use strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Executor } from "../common/executor";

const InputModuleName = "message-generator";
const InputTemplateFileName = "iot-edge-input-template.hbs";
const InputTemplateFilePath = path.join(os.tmpdir(), InputTemplateFileName);
const InputTemplate = `{
    Temperature: {{int 10 35}},
    Humidity: {{int 50 80}}
}`;
const InputConfigFileName = "config.json";
const InputConfigFilePath = path.join(os.tmpdir(), "iot-edge-input-config.json");

export class InputModuleManager {

    public editTemplate() {
        if (!fs.existsSync(InputTemplateFilePath)) {
            fs.writeFileSync(InputTemplateFilePath, InputTemplate);
        }
        vscode.workspace.openTextDocument(InputTemplateFilePath).then((document: vscode.TextDocument) => {
            vscode.window.showTextDocument(document);
        });
    }

    public deployTemplate() {
        Executor.runInTerminal(`docker cp ${InputTemplateFilePath} ${InputModuleName}:/app/${InputTemplateFileName}`);
    }

    public updateInterval() {
        vscode.window.showInputBox({
            prompt: "Interval",
            placeHolder: "Enter interval (milliseconds)",
        }).then((interval: string) => {
            if (interval !== undefined) {
                if (isNaN(Number(interval))) {
                    vscode.window.showWarningMessage("Please enter a valid number");
                } else {
                    const configContent = {
                        messageInterval: interval,
                    };
                    fs.writeFileSync(InputConfigFilePath, `${JSON.stringify(configContent, null, 4)}`);
                    Executor.runInTerminal(`docker cp ${InputConfigFilePath} ${InputModuleName}:/app/${InputConfigFileName}`);
                }
            }
        });
    }
}
