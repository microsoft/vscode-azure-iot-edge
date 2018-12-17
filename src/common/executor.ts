// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { ChildProcess, exec, execSync, spawn, SpawnOptions } from "child_process";
import * as vscode from "vscode";
import { Constants } from "./constants";

export class Executor {
    public static runInTerminal(command: string, terminal: string = Constants.edgeDisplayName): void {
        if (this.terminals[terminal] === undefined ) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        this.terminals[terminal].sendText(command);
    }

    public static exec(command: string) {
        return exec(command);
    }

    public static execSync(command: string) {
        return execSync(command, { encoding: "utf8" });
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    public static async executeCMD(outputPane: vscode.OutputChannel, command: string,
                                   options: SpawnOptions, ...args: string[]): Promise<string> {
        return await new Promise((resolve: (output: string) => void, reject: (e: Error) => void): void => {
            if (outputPane) {
                outputPane.show();
                outputPane.appendLine(`Executing ${command} ${args.join(" ")}`);
            }
            let stderr: string = "";
            let stdOutput: string = "";
            const p: ChildProcess = spawn(command, args, options);
            p.stdout.on("data", (data: string | Buffer): void => {
                const dataStr = data.toString();
                stdOutput = stdOutput.concat(dataStr);
                if (outputPane) {
                    outputPane.append(dataStr);
                }
            });
            p.stderr.on("data", (data: string | Buffer) => {
                const dataStr = data.toString();
                stderr = stderr.concat(dataStr);
                if (outputPane) {
                    outputPane.append(dataStr);
                }
            });
            p.on("error", (err: Error) => {
                reject(new Error(err.toString()));
            });
            p.on("exit", (code: number, signal: string) => {
                if (code !== 0) {
                    reject (new Error((`Command failed with exit code ${code}.`)));
                } else {
                    resolve(stdOutput);
                }
            });
        });
    }

    private static terminals: { [id: string]: vscode.Terminal } = {};
}
