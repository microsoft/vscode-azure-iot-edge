// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict"; 
import { ChildProcess, exec, execSync, spawn, SpawnOptions } from "child_process";
import * as vscode from "vscode";

export class Executor {
    public static runInTerminal(command: string, terminal: string = "Azure IoT Edge"): void {
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
                                   options: SpawnOptions, ...args: string[]): Promise<void> {
        await new Promise((resolve: () => void, reject: (e: Error) => void): void => {
            outputPane.show();
            let stderr: string = "";
            const p: ChildProcess = spawn(command, args, options);
            p.stdout.on("data", (data: string | Buffer): void =>
                outputPane.append(data.toString()));
            p.stderr.on("data", (data: string | Buffer) => {
                stderr = stderr.concat(data.toString());
                outputPane.append(data.toString());
            });
            p.on("error", (err: Error) => {
                reject(new Error(err.toString()));
            });
            p.on("exit", (code: number, signal: string) => {
                if (code !== 0) {
                    reject (new Error((`Command failed with exit code ${code}`)));
                } else {
                    resolve();
                }
            });
        });
    }

    private static terminals: { [id: string]: vscode.Terminal } = {};
}
