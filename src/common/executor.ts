// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { ChildProcess, execSync, ExecSyncOptions, spawn, SpawnOptions } from "child_process";
import * as vscode from "vscode";
import { CommandError } from "./CommandError";
import { Configuration } from "./configuration";
import { Constants } from "./constants";

export class Executor {
    public static runInTerminal(command: string, terminal: string = Constants.edgeDisplayName): void {
        if (this.terminals[terminal] === undefined) {
            this.terminals[terminal] = Executor.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        this.terminals[terminal].sendText(command);
    }

    public static execSync(command: string) {
        const envVars = Executor.getEnvFromConfig();
        const options: ExecSyncOptions = { encoding: "utf8" };
        if (envVars) {
            const processEnvs = JSON.parse(JSON.stringify(process.env));
            options.env = Executor.mergeEnvs(envVars, processEnvs);
        }
        return execSync(command, options);
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    public static async executeCMD(outputPane: vscode.OutputChannel, command: string,
                                   options: SpawnOptions, ...args: string[]): Promise<string> {
        return await new Promise((resolve: (output: string) => void, reject: (e: Error) => void): void => {
            Executor.show(outputPane);
            Executor.appendLine(`Executing ${command} ${args.join(" ")}`, outputPane);

            let stderr: string = "";
            let stdOutput: string = "";
            const envVars = Executor.getEnvFromConfig();
            if (envVars) {
                options = options || {};
                let processEnvs = JSON.parse(JSON.stringify(process.env));
                processEnvs = Executor.mergeEnvs(envVars, processEnvs);
                options.env = Executor.mergeEnvs(options.env, processEnvs);
            }

            const p: ChildProcess = spawn(command, args, options);
            p.stdout.on("data", (data: string | Buffer): void => {
                const dataStr = data.toString();
                stdOutput = stdOutput.concat(dataStr);
                Executor.append(dataStr, outputPane);
            });
            p.stderr.on("data", (data: string | Buffer) => {
                const dataStr = data.toString();
                stderr = stderr.concat(dataStr);
                Executor.append(dataStr, outputPane);
            });
            p.on("error", (err: Error) => {
                reject(new Error(`${err.toString()}. Detail: ${stderr}`));
            });
            p.on("exit", (code: number, signal: string) => {
                if (code !== 0) {
                    reject (new CommandError(stderr, code));
                } else {
                    resolve(stdOutput);
                }
            });
        });
    }

    private static terminals: { [id: string]: vscode.Terminal } = {};

    private static show(outputPane: vscode.OutputChannel): void {
        if (outputPane) {
            outputPane.show();
        }
    }

    private static append(value: string, outputPane: vscode.OutputChannel): void {
        if (outputPane) {
            outputPane.append(value);
        }
    }

    private static appendLine(value: string, outputPane: vscode.OutputChannel): void {
        if (outputPane) {
            outputPane.appendLine(value);
        }
    }

    private static createTerminal(terminal: string): vscode.Terminal {
        const envVars  = Executor.getEnvFromConfig();
        const options: vscode.TerminalOptions = { name: terminal };
        if (envVars) {
            options.env = envVars;
        }
        return vscode.window.createTerminal(options);
    }

    private static mergeEnvs(overrideEnv, envs) {
        if (!overrideEnv) {
            return envs;
        }

        envs = envs || {};
        for (const key of Object.keys(overrideEnv)) {
            envs[key] = overrideEnv[key];
        }
        return envs;
    }

    private static getEnvFromConfig() {
        const envVars = Configuration.getConfigurationProperty("executor.env");
        if (envVars && Object.keys(envVars).length > 0) {
            return envVars;
        } else {
            return undefined;
        }
    }
}
