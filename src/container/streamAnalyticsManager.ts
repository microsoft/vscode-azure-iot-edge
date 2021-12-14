// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { StreamAnalyticsManagementClient, StreamingJobs } from "@azure/arm-streamanalytics";
import { StreamingJob } from "@azure/arm-streamanalytics/esm/models";
import axios from "axios";
import * as fse from "fs-extra";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { UserCancelledError } from "../common/UserCancelledError";
import { Utility } from "../common/utility";
import { AzureAccount, AzureSession, AzureSubscription } from "../typings/azure-account.api";
import { StreamAnalyticsPickItem } from "./models/streamAnalyticsPickItem";

export enum ASAUpdateStatus {
    Idle,
    CheckingUpdate,
    Updating,
}

export class StreamAnalyticsManager {
    public static getInstance(): StreamAnalyticsManager {
        if (!StreamAnalyticsManager.instance) {
            StreamAnalyticsManager.instance = new StreamAnalyticsManager();
        }
        return StreamAnalyticsManager.instance;
    }

    private static instance: StreamAnalyticsManager;
    private readonly azureAccount: AzureAccount;
    private readonly MaximumRetryCount: number = 30;
    private asaUpdateStatus: ASAUpdateStatus;

    private constructor() {
        this.azureAccount = vscode.extensions.getExtension<AzureAccount>("ms-vscode.azure-account")!.exports;
        this.asaUpdateStatus = ASAUpdateStatus.Idle;
    }

    public async getJobInfo(): Promise<any> {
        await Utility.waitForAzLogin(this.azureAccount);
        const streamingJob: StreamAnalyticsPickItem = await vscode.window.showQuickPick(this.loadAllStreamingJobs(), { placeHolder: `Select ${Constants.asaJobDesc}`, ignoreFocusOut: true });
        if (!streamingJob) {
            throw new UserCancelledError();
        }

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Querying Stream Analytics Job information",
            cancellable: true,
        }, async (progress, token): Promise<object> =>  {
            const ASAJobResourceId: string = streamingJob.job.id;
            return await this.publishAndQueryASAJobInfo(ASAJobResourceId, streamingJob.azureSubscription.session, token);
        });
    }

    public async checkAndUpdateASAJob(templateFile: string, moduleName: string) {
        if (this.asaUpdateStatus === ASAUpdateStatus.Idle) {
            await Utility.waitForAzLogin(this.azureAccount);
            try {
                this.asaUpdateStatus = ASAUpdateStatus.CheckingUpdate;
                const isUpdateAvailable = await this.isASAJobUpdateAvailable(templateFile, moduleName);
                this.asaUpdateStatus = ASAUpdateStatus.Idle;
                if (isUpdateAvailable) {
                    const yesOption = "Yes";
                    const option = await vscode.window.showInformationMessage(Constants.newASAJobAvailableMsg(moduleName), yesOption);
                    if (option === yesOption) {
                        this.asaUpdateStatus = ASAUpdateStatus.Updating;
                        await this.updateASAJobInfoModuleTwin(templateFile, moduleName);
                        this.asaUpdateStatus = ASAUpdateStatus.Idle;
                    }
                } else {
                    await vscode.window.showInformationMessage(Constants.noNewASAJobFoundMsg(moduleName));
                }
            } catch (err) {
                this.asaUpdateStatus = ASAUpdateStatus.Idle;
                throw err;
            }
        }
    }

    private async updateJobInfo(templateFile: string, moduleName: string): Promise<any> {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Updating Stream Analytics Job information",
            cancellable: true,
        }, async (progress, token): Promise<object> => {
            const ASAInfo = await this.getJobInfoFromDeploymentTemplate(templateFile, moduleName);
            const subscription = await this.getJobSubscription(ASAInfo);
            const ASAJobResourceId: string = ASAInfo.ASAJobResourceId;
            return await this.publishAndQueryASAJobInfo(ASAJobResourceId, subscription.session, token);
        });
    }

    private async isASAJobUpdateAvailable(templateFile: string, moduleName: string): Promise<boolean> {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Checking configurations update for Stream Analytics Job",
        }, async (): Promise<boolean> => {
            const ASAInfo = await this.getJobInfoFromDeploymentTemplate(templateFile, moduleName);
            const GetASAJobApiUrl: string = `https://management.azure.com${ASAInfo.ASAJobResourceId}?api-version=2019-06-01`;
            const curEtag = ASAInfo.ASAJobEtag;
            const subscription = await this.getJobSubscription(ASAInfo);
            const { aadAccessToken } = await Utility.acquireAadToken(subscription.session);
            const jobInfo = await axios.get(GetASAJobApiUrl, { headers: { Authorization: `bearer ${aadAccessToken}` } });

            const latestETag = jobInfo.headers.etag;
            return latestETag !== curEtag;
        });
    }

    private async updateASAJobInfoModuleTwin(templateFile: string, moduleName: string) {
        const jobInfo = await this.updateJobInfo(templateFile, moduleName);
        const moduleTwin = jobInfo.twin.content;
        const templateJson = await fse.readJson(templateFile);
        templateJson.modulesContent[moduleName] = moduleTwin;
        await fse.writeFile(templateFile, JSON.stringify(templateJson, null, 2), { encoding: "utf8" });
    }

    private async publishAndQueryASAJobInfo(resourceId: string, session: AzureSession, token: vscode.CancellationToken) {
        try {
            const apiUrl: string = `https://management.azure.com${resourceId}/publishedgepackage?api-version=2019-06-01`;
            const { aadAccessToken } = await Utility.acquireAadToken(session);

            const publishResponse = await axios.post(apiUrl, { headers: { Authorization: `bearer ${aadAccessToken}` }, resolveWithFullResponse: true });

            const operationResultUrl = publishResponse.headers.location;

            let retryTimes = 0;
            while (true) {
                await this.sleep(2000);

                const jobInfoResult = await axios.get(operationResultUrl, { headers: { Authorization: `bearer ${aadAccessToken}` } });

                if (token.isCancellationRequested) {
                    throw new UserCancelledError();
                }

                if (jobInfoResult.status === 202) {
                    if (retryTimes < this.MaximumRetryCount) {
                        retryTimes++;
                        continue;
                    } else {
                        throw new Error(Constants.queryASAJobInfoFailedMsg);
                    }
                } else if (jobInfoResult.status === 200) {
                    const result = jobInfoResult.data;
                    if (result.status === "Succeeded") {
                        const info = JSON.parse(result.manifest);
                        return info;
                    } else {
                        throw new Error(result.error.message);
                    }
                } else {
                    throw new Error("http status code: " + jobInfoResult.status);
                }
            }
        } catch (error) {
            if (!(error instanceof UserCancelledError)) {
                error.message = `Parse Stream Analytics jobs info failed: ${error.message}`;
            }
            throw error;
        }
    }

    private async getJobSubscription(ASAInfo): Promise<AzureSubscription> {
        for (const azureSubscription of this.azureAccount.subscriptions) {
            if (ASAInfo.ASAJobResourceId.indexOf(azureSubscription.subscription.id) >= 0) {
                return azureSubscription;
            }
        }

        const ASAJobName: string = ASAInfo.ASAJobResourceId.split("/").pop();
        throw new Error(`Cannot find Stream Analytics Job '${ASAJobName}' in your Azure account, please make sure to login to the right acount.`);
    }

    private async getJobInfoFromDeploymentTemplate(templateFile: string, moduleName) {
        try {
            const templateJson = await fse.readJson(templateFile);
            const ASAInfo = templateJson.modulesContent[moduleName]["properties.desired"];
            return ASAInfo;
        } catch (err) {
            throw new Error("Cannot parse Stream Analytics Job information from module twin: " + err.message);
        }
    }

    private async loadAllStreamingJobs(): Promise<StreamAnalyticsPickItem[]> {
        try {
            await this.azureAccount.waitForFilters();
            const jobPromises: Array<Promise<StreamAnalyticsPickItem[]>> = [];
            for (const azureSubscription of this.azureAccount.filters) {
                const tokenCredentials = await Utility.aquireTokenCredentials(azureSubscription.session);
                const client: StreamingJobs = new StreamAnalyticsManagementClient(
                    tokenCredentials,
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
