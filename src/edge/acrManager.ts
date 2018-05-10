// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import { ContainerRegistryManagementClient } from "azure-arm-containerregistry";
import { Registry, RegistryListCredentialsResult } from "azure-arm-containerregistry/lib/models";
import * as request from "request-promise";
import * as vscode from "vscode";
import { Executor } from "../common/executor";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { AcrRegistryQuickPickItem } from "../container/models/AcrRegistryQuickPickItem";
import { AzureAccount, AzureSession, AzureSubscription } from "../typings/azure-account.api";

export class AcrManager {
    private readonly azureAccount: AzureAccount;
    private refreshTokenArc: string;

    constructor() {
        this.azureAccount = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public async selectAcrImage(): Promise<string> {
        const acrRegistryItem: AcrRegistryQuickPickItem = await this.selectAcrRegistry();
        if (acrRegistryItem === undefined) {
            throw new UserCancelledError();
        }

        const registryUrl: string = acrRegistryItem.registry.loginServer;

        const acrRepoItem: vscode.QuickPickItem = await this.selectAcrRepo(registryUrl, acrRegistryItem.azureSubscription.session);
        if (acrRepoItem === undefined) {
            throw new UserCancelledError();
        }

        const acrTagItem: vscode.QuickPickItem = await this.selectAcrTag(registryUrl, acrRepoItem.label);
        if (acrTagItem === undefined) {
            throw new UserCancelledError();
        }

        this.loginToAcr(acrRegistryItem.registry, acrRegistryItem.azureSubscription);

        return acrTagItem.description;
    }

    private async selectAcrRegistry(): Promise<AcrRegistryQuickPickItem> {
        if (!(await this.azureAccount.waitForLogin())) {
            await vscode.commands.executeCommand("azure-account.askForLogin");
        }

        const acrRegistryItem: AcrRegistryQuickPickItem = await vscode.window.showQuickPick(this.loadAcrRegistryItems(), { placeHolder: "Select Azure Container Registry", ignoreFocusOut: true });
        return acrRegistryItem;
    }

    private async loadAcrRegistryItems(): Promise<AcrRegistryQuickPickItem[]> {
        try {
            await this.azureAccount.waitForFilters();
            const registryPromises: Array<Promise<AcrRegistryQuickPickItem[]>> = [];
            for (const azureSubscription of this.azureAccount.filters) {
                const client = new ContainerRegistryManagementClient(
                    azureSubscription.session.credentials,
                    azureSubscription.subscription.subscriptionId!,
                );

                registryPromises.push(
                    Utility.listAllAzureResource(client.registries, client.registries.list())
                        .then((registries: Registry[]) => registries.map((registry: Registry) => {
                            return new AcrRegistryQuickPickItem(registry, azureSubscription);
                        })),
                );
            }

            const registryItems: AcrRegistryQuickPickItem[] = ([] as AcrRegistryQuickPickItem[]).concat(...(await Promise.all(registryPromises)));
            registryItems.sort((a, b) => a.label.localeCompare(b.label));
            return registryItems;
        } catch (error) {
            error.message = `Error fetching registry list: ${error.message}`;
            throw error;
        }
    }

    private async selectAcrRepo(registryUrl: string, session: AzureSession): Promise<vscode.QuickPickItem> {
        const acrRepoItem: vscode.QuickPickItem = await vscode.window.showQuickPick(this.loadAcrRepoItems(registryUrl, session), { placeHolder: "Select Repository", ignoreFocusOut: true });
        return acrRepoItem;
    }

    private async loadAcrRepoItems(registryUrl: string, session: AzureSession): Promise<vscode.QuickPickItem[]> {
        try {
            const { accessToken, refreshToken } = await this.acquireToken(session);
            this.refreshTokenArc = await this.acquireRefreshTokenArc(registryUrl, session.tenantId, refreshToken, accessToken);
            const accessTokenArc = await this.acquireAccessTokenArc(registryUrl, "registry:catalog:*", this.refreshTokenArc);

            const catalogResponse = await request.get(`https://${registryUrl}/v2/_catalog`, {
                auth: {
                    bearer: accessTokenArc,
                },
            });

            const repoItems: vscode.QuickPickItem[] = [];
            const repos = JSON.parse(catalogResponse).repositories;
            repos.map((repo) => {
                repoItems.push({
                    label: repo,
                    description: `${registryUrl}/${repo}`,
                });
            });
            repoItems.sort((a, b) => a.label.localeCompare(b.label));
            return repoItems;
        } catch (error) {
            error.message = `Error fetching repository list: ${error.message}`;
            throw error;
        }
    }

    private async acquireToken(session: AzureSession): Promise<{ accessToken: string, refreshToken: string }> {
        return new Promise<{ accessToken: string, refreshToken: string }>((resolve, reject) => {
            const credentials: any = session.credentials;
            const environment: any = session.environment;
            credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, (err: any, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                    });
                }
            });
        });
    }

    private async acquireRefreshTokenArc(registryUrl: string, tenantId: string, refreshToken: string, accessToken: string): Promise<string> {
        const refreshTokenResponse = await request.post(`https://${registryUrl}/oauth2/exchange`, {
            form: {
                grant_type: "access_token_refresh_token",
                service: registryUrl,
                tenant: tenantId,
                refresh_token: refreshToken,
                access_token: accessToken,
            },
        });
        return JSON.parse(refreshTokenResponse).refresh_token;
    }

    private async acquireAccessTokenArc(registryUrl: string, scope: string, refreshTokenArc: string) {
        const accessTokenResponse = await request.post(`https://${registryUrl}/oauth2/token`, {
            form: {
                grant_type: "refresh_token",
                service: registryUrl,
                scope,
                refresh_token: refreshTokenArc,
            },
        });
        return JSON.parse(accessTokenResponse).access_token;
    }

    private async selectAcrTag(registryUrl: string, repo: string): Promise<vscode.QuickPickItem> {
        const tag: vscode.QuickPickItem = await vscode.window.showQuickPick(this.loadAcrTagItems(registryUrl, repo), { placeHolder: "Select Tag", ignoreFocusOut: true });
        return tag;
    }

    private async loadAcrTagItems(registryUrl: string, repo: string): Promise<vscode.QuickPickItem[]> {
        try {
            const accessTokenArc = await this.acquireAccessTokenArc(registryUrl, `repository:${repo}:pull`, this.refreshTokenArc);

            const tagsResponse = await request.get(`https://${registryUrl}/v2/${repo}/tags/list`, {
                auth: {
                    bearer: accessTokenArc,
                },
            });

            const tagItems: vscode.QuickPickItem[] = [];
            const tags = JSON.parse(tagsResponse).tags;
            tags.map((tag) => {
                tagItems.push({
                    label: tag,
                    description: `${registryUrl}/${repo}:${tag}`,
                });
            });
            tagItems.sort((a, b) => a.label.localeCompare(b.label));
            return tagItems;
        } catch (error) {
            error.message = `Error fetching tag list: ${error.message}`;
            throw error;
        }
    }

    private async loginToAcr(registry: Registry, azureSubscription: AzureSubscription) {
        try {
            const adminUserEnabled: boolean = registry.adminUserEnabled;
            const registryUrl: string = registry.loginServer;
            const loginMessage = adminUserEnabled ? `Looks like the registry "${registryUrl}" has admin user enabled. `
                + `Would you like to run "docker login" with the admin user credentials?`
                : `Looks like the registry "${registryUrl}" does not have admin user enabled. `
                + `Would you like to enable admin user and run "docker login" with the admin user credentials?`;
            const option: string = await vscode.window.showInformationMessage(loginMessage, "Yes", "No");
            if (option === "Yes") {
                vscode.window.withProgress({ title: `Logging in to registry "${registryUrl}"...`, location: vscode.ProgressLocation.Window }, async (progress) => {
                    const registryName: string = registry.name;
                    const resourceGroup: string = registry.id.slice(registry.id.toLowerCase().search("resourcegroups/") + "resourcegroups/".length, registry.id.toLowerCase().search("/providers/"));
                    const client = new ContainerRegistryManagementClient(
                        azureSubscription.session.credentials,
                        azureSubscription.subscription.subscriptionId!,
                    );

                    if (!adminUserEnabled) {
                        progress.report({ message: `Enabling admin user for registry "${registryUrl}"...` });
                        await client.registries.update(resourceGroup, registryName, { adminUserEnabled: true });
                    }

                    progress.report({ message: `Fetching admin user credentials for registry "${registryUrl}"...` });
                    const creds: RegistryListCredentialsResult = await client.registries.listCredentials(resourceGroup, registryName);
                    const username: string = creds.username;
                    const password: string = creds.passwords[0].value;

                    Executor.runInTerminal(`docker login -u ${username} -p ${password} ${registryUrl}`);
                });
            }
        } catch (error) {
            error.message = `Error fetching registry credentials: ${error.message}`;
            throw error;
        }
    }
}
