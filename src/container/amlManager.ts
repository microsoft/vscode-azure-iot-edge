// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { AzureMachineLearningWorkspaces } from "@azure/arm-machinelearningservices";
import { Workspace } from "@azure/arm-machinelearningservices/esm/models";
import { Workspaces } from "@azure/arm-machinelearningservices/esm/operations";
import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { AzureAccount, AzureSession } from "../typings/azure-account.api";
import { AmlWorkspaceQuickPickItem } from "./models/amlWorkspaceQuickPickItem";

export class AmlManager {
    private readonly azureAccount: AzureAccount;
    constructor() {
        this.azureAccount = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public async selectAmlImage(): Promise<string> {
        const workspaceItem: AmlWorkspaceQuickPickItem = await this.selectWorkspace();
        if (workspaceItem === undefined) {
            throw new UserCancelledError();
        }

        const imageItem: vscode.QuickPickItem = await this.selectImage(workspaceItem.workspace, workspaceItem.azureSubscription.session);
        if (imageItem === undefined) {
            throw new UserCancelledError();
        }

        return imageItem.description;
    }

    private async selectWorkspace(): Promise<AmlWorkspaceQuickPickItem> {
        await Utility.waitForAzLogin(this.azureAccount);

        const workspaceItem: AmlWorkspaceQuickPickItem =
            await vscode.window.showQuickPick(this.loadWorkspaceItems(), { placeHolder: `Select ${Constants.amlWorkspaceDesc}`, ignoreFocusOut: true });

        return workspaceItem;
    }

    private async loadWorkspaceItems(): Promise<AmlWorkspaceQuickPickItem[]> {
        try {
            await this.azureAccount.waitForFilters();
            const workspacePromises: Array<Promise<AmlWorkspaceQuickPickItem[]>> = [];
            for (const azureSubscription of this.azureAccount.filters) {
                const tokenCredentials = await Utility.aquireTokenCredentials(azureSubscription.session);
                const client: Workspaces = new AzureMachineLearningWorkspaces(
                    tokenCredentials,
                    azureSubscription.subscription.subscriptionId!,
                ).workspaces;

                workspacePromises.push(
                    Utility.listAzureResources<Workspace>(client.listBySubscription(), client.listBySubscriptionNext)
                        .then((workspaces: Workspace[]) => {
                            // More than one workspace can have the same name as long as they are in different resource groups.
                            const counts: Map<string, number> = this.getWorkspaceNameCounts(workspaces);
                            return workspaces.map((workspace: Workspace) => {
                                const label: string = counts.get(workspace.name) === 1 ? workspace.name : `${workspace.name} (${Utility.getResourceGroupFromId(workspace.id)})`;
                                return new AmlWorkspaceQuickPickItem(label, workspace, azureSubscription);
                            });
                        }),
                );
            }

            const workspaceItems: AmlWorkspaceQuickPickItem[] = await Utility.awaitPromiseArray<AmlWorkspaceQuickPickItem>(workspacePromises, Constants.amlWorkspaceDesc);
            return workspaceItems;
        } catch (error) {
            error.message = `Error fetching workspace list: ${error.message}`;
            throw error;
        }
    }

    private async selectImage(workspace: Workspace, session: AzureSession): Promise<vscode.QuickPickItem> {
        const imageItem: vscode.QuickPickItem = await vscode.window.showQuickPick(this.loadAmlImageItems(workspace, session),
            { placeHolder: "Select Image", ignoreFocusOut: true });
        return imageItem;
    }

    private async loadAmlImageItems(workspace: Workspace, session: AzureSession): Promise<vscode.QuickPickItem[]> {
        try {
            const modelMgmtEndpoint: string = await this.getModelMgmtEndpoint(workspace);
            const tokenCredentials = await Utility.aquireTokenCredentials(session);
            const client: ServiceClient = new ServiceClient(tokenCredentials);
            const result: HttpOperationResponse = await client.sendRequest({
                method: "GET",
                baseUrl: modelMgmtEndpoint,
                pathTemplate: `/api${workspace.id}/images`,
                queryParameters: { "api-version": Constants.amlApiVersion },
                serializationMapper: undefined,
                deserializationMapper: undefined,
            });

            if (result.parsedBody.value === undefined || result.parsedBody.value.length === 0) {
                throw new Error("No image can be found in the workspace.");
            }

            return result.parsedBody.value.map((image: IImage) => {
                return { label: image.name, description: image.imageLocation };
            });
        } catch (error) {
            error.message = `Error fetching image list: ${error.message}`;
            throw error;
        }
    }

    private getWorkspaceNameCounts(workspaces: Workspace[]): Map<string, number> {
        const counts: Map<string, number> = new Map<string, number>();
        workspaces.forEach((workspace: Workspace) => {
            counts.set(workspace.name, counts.has(workspace.name) ? counts.get(workspace.name) + 1 : 1);
        });

        return counts;
    }

    private async getModelMgmtEndpoint(workspace: Workspace): Promise<string> {
        const experimentationEndpoint: string = await this.getExperimentationEndpoint(workspace);
        let location: string;
        const res: string[] = experimentationEndpoint.match(/\/\/(.*?)\./);
        if (res.length < 2) {
            throw new Error("No available endpoint");
        } else {
            location = res[1];
        }

        return `https://${location}.modelmanagement.azureml.net`;
    }

    private async getExperimentationEndpoint(workspace: Workspace): Promise<string> {
        const client: ServiceClient = new ServiceClient();
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: workspace.discoveryUrl,
            serializationMapper: undefined,
            deserializationMapper: undefined,
        });
        if (result.status === 200) {
            return result.parsedBody.experimentation;
        } else {
            throw new Error("API end points not found."); // TODO: return defaults by region
        }
    }
}

interface IImage {
    imageLocation: string;
    name: string;
}

interface IEndPoints {
    catalog: string;
    experimentation: string;
    gallery: string;
    history: string;
    hyperdrive: string;
    modelmanagement: string;
}
