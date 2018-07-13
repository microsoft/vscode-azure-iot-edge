// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import StreamAnalyticsManagementClient = require("azure-arm-streamanalytics");
import * as request from "request-promise";
import * as vscode from "vscode";
import { UserCancelledError } from "../common/UserCancelledError";
import { StreamAnalyticsPicItem } from "../container/models/streamAnalyticsPickItem";
import { AzureAccount, AzureSession } from "../typings/azure-account.api";

export class StreamAnalyticsManager {
    private readonly azureAccount: AzureAccount;
    private readonly STREAM_ANALYTICS_IMAGE: string = "microsoft/azureiotedge-azure-stream-analytics:1.0.0-preview006";

    constructor() {
        this.azureAccount = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public async selectStreamingJob(): Promise<StreamAnalyticsPicItem> {
        if (!(await this.azureAccount.waitForLogin())) {
            await vscode.commands.executeCommand("azure-account.askForLogin");
            // If the promise returned the by above command execution is fulfilled and the user is still not logged in, it means the user cancels.
            if (!(await this.azureAccount.waitForLogin())) {
                throw new UserCancelledError();
            }
        }

        const job: StreamAnalyticsPicItem = await vscode.window.showQuickPick(this.loadAllStreamingJobs(), { placeHolder: "Select Azure Stream Analytics Jobs", ignoreFocusOut: true });
        return job;
    }

    public getImageName(): string {
        return this.STREAM_ANALYTICS_IMAGE;
    }

    public async getJobInfo(streamingJob: StreamAnalyticsPicItem): Promise<object> {
        const subscriptionId: string = streamingJob.azureSubscription.subscription.id;
        const id: string = streamingJob.job.id;
        const resourceGroup: string = id.slice(id.toLowerCase().search("resourcegroups/") + "resourcegroups/".length, id.toLowerCase().search("/providers/"));
        const jobName: string = streamingJob.job.name;
        const publishJobUrl: string = `https://management.azure.com${subscriptionId}/resourceGroups/${resourceGroup}` +
                                    `/providers/Microsoft.StreamAnalytics/streamingjobs/${jobName}/publishedgepackage?api-version=2017-04-01-preview`;

        const { aadAccessToken } = await this.acquireAadToken(streamingJob.azureSubscription.session);

        const publishResponse = await request.post(publishJobUrl, {
            auth: {
                bearer: aadAccessToken,
            },
            resolveWithFullResponse: true,
        });

        const operationResultUrl = publishResponse.headers.location;

        const jobInfoResult = await request.get(operationResultUrl, {
            auth: {
                bearer: aadAccessToken,
            },
        });

        try {
            const info = JSON.parse(JSON.parse(jobInfoResult).manifest);
            return info;
        } catch (e) {
            throw new Error("Cannot parse Stream Analytics publish job information!") + e.toString();
        }
    }

    private async loadAllStreamingJobs(): Promise<StreamAnalyticsPicItem[]> {
        try {
            await this.azureAccount.waitForFilters();
            const items: StreamAnalyticsPicItem[] = [];

            for (const azureSubscription of this.azureAccount.filters) {
                const client = new StreamAnalyticsManagementClient(
                    azureSubscription.session.credentials,
                    azureSubscription.subscription.subscriptionId!,
                );

                const streamingJobs = await client.streamingJobs.list();
                streamingJobs.forEach((job) => {
                    items.push(new StreamAnalyticsPicItem(job, azureSubscription));
                });
            }
            return items;
        } catch (error) {
            error.message = `Error fetching streaming jobs list: ${error.message}`;
            throw error;
        }
    }

    private async acquireAadToken(session: AzureSession): Promise<{ aadAccessToken: string, aadRefreshToken: string }> {
        return new Promise<{ aadAccessToken: string, aadRefreshToken: string }>((resolve, reject) => {
            const credentials: any = session.credentials;
            const environment: any = session.environment;
            credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, (err: any, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        aadAccessToken: result.accessToken,
                        aadRefreshToken: result.refreshToken,
                    });
                }
            });
        });
    }
}
