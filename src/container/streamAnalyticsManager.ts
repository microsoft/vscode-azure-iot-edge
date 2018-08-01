// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import StreamAnalyticsManagementClient = require("azure-arm-streamanalytics");
import * as request from "request-promise";
import * as vscode from "vscode";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { StreamAnalyticsPicItem } from "../container/models/streamAnalyticsPickItem";
import { AzureAccount } from "../typings/azure-account.api";

export class StreamAnalyticsManager {
    private readonly azureAccount: AzureAccount;

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
        if (!job) {
            throw new UserCancelledError();
        }
        return job;
    }

    public async getJobInfo(streamingJob: StreamAnalyticsPicItem): Promise<object> {
        try {
            const id: string = streamingJob.job.id;
            const publishJobUrl: string = `https://management.azure.com${id}/publishedgepackage?api-version=2017-04-01-preview`;

            const { aadAccessToken } = await Utility.acquireAadToken(streamingJob.azureSubscription.session);

            const publishResponse = await request.post(publishJobUrl, {
                auth: {
                    bearer: aadAccessToken,
                },
                resolveWithFullResponse: true,
            });

            const operationResultUrl = publishResponse.headers.location;

            await this.sleep(1000);

            const jobInfoResult = await request.get(operationResultUrl, {
                auth: {
                    bearer: aadAccessToken,
                },
            });

            const info = JSON.parse(JSON.parse(jobInfoResult).manifest);
            return info;
        } catch (error) {
            error.message = `Cannot parse Stream Analytics publish job information: ${error.message}`;
            throw error;
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

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
