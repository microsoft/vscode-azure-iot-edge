// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import StreamAnalyticsManagementClient = require("azure-arm-streamanalytics");
import { StreamingJob } from "azure-arm-streamanalytics/lib/models";
import { StreamingJobs } from "azure-arm-streamanalytics/lib/operations";
import * as request from "request-promise";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { AzureAccount } from "../typings/azure-account.api";
import { StreamAnalyticsPickItem } from "./models/streamAnalyticsPickItem";

export class StreamAnalyticsManager {
    private readonly azureAccount: AzureAccount;
    private readonly MaximumRetryCount: number = 3;

    constructor() {
        this.azureAccount = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
    }

    public async selectStreamingJob(): Promise<StreamAnalyticsPickItem> {
        await Utility.waitForAzLogin(this.azureAccount);

        const job: StreamAnalyticsPickItem = await vscode.window.showQuickPick(this.loadAllStreamingJobs(), { placeHolder: `Select ${Constants.asaJobDesc}`, ignoreFocusOut: true });
        if (!job) {
            throw new UserCancelledError();
        }
        return job;
    }

    public async getJobInfo(streamingJob: StreamAnalyticsPickItem): Promise<object> {
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

            let retryTimes = 0;
            while (true) {
                await this.sleep(1000);

                const jobInfoResult = await request.get(operationResultUrl, {
                    auth: {
                        bearer: aadAccessToken,
                    },
                });

                if (!jobInfoResult) {
                    if (retryTimes < this.MaximumRetryCount) {
                        retryTimes++;
                        continue;
                    } else {
                        throw new Error(Constants.queryASAJobInfoFailedMsg);
                    }
                }

                const result = JSON.parse(jobInfoResult);
                if (result.status === "Succeeded") {
                    const info = JSON.parse(result.manifest);
                    return info;
                } else {
                    throw new Error(result.error.message);
                }
            }
        } catch (error) {
            error.message = `Cannot parse Stream Analytics publish job information: ${error.message}`;
            throw error;
        }
    }

    private async loadAllStreamingJobs(): Promise<StreamAnalyticsPickItem[]> {
        try {
            await this.azureAccount.waitForFilters();
            const jobPromises: Array<Promise<StreamAnalyticsPickItem[]>> = [];
            for (const azureSubscription of this.azureAccount.filters) {
                const client: StreamingJobs = new StreamAnalyticsManagementClient(
                    azureSubscription.session.credentials,
                    azureSubscription.subscription.subscriptionId!,
                ).streamingJobs;

                jobPromises.push(
                    Utility.listAzureResources<StreamingJob>(client.list(), client.listNext)
                        .then((jobs: StreamingJob[]) => jobs.map((job: StreamingJob) => {
                            return new StreamAnalyticsPickItem(job, azureSubscription);
                        })),
                );
            }

            const jobItems: StreamAnalyticsPickItem[] = await Utility.awaitPromiseArray<StreamAnalyticsPickItem>(jobPromises, Constants.asaJobDesc);
            return jobItems;
        } catch (error) {
            error.message = `Error fetching streaming job list: ${error.message}`;
            throw error;
        }
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
