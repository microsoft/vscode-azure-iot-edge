// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

import { commands, env, ExtensionContext, extensions, Uri, window } from "vscode";
import { Constants } from "./constants";
import { TelemetryClient } from "./telemetryClient";

const NPS_SURVEY_URL = "https://www.surveymonkey.com/r/SMQM3DH";
const PROBABILITY = 0.15;
const SESSION_COUNT_THRESHOLD = 2;
const SESSION_COUNT_KEY = "nps/sessionCount";
const LAST_SESSION_DATE_KEY = "nps/lastSessionDate";
const SKIP_VERSION_KEY = "nps/skipVersion";
const IS_CANDIDATE_KEY = "nps/isCandidate";

export class NPS {
    public static async takeSurvey({ globalState }: ExtensionContext) {
        const skipVersion = globalState.get(SKIP_VERSION_KEY, "");
        if (skipVersion) {
            return;
        }

        const date = new Date().toDateString();
        const lastSessionDate = globalState.get(LAST_SESSION_DATE_KEY, new Date(0).toDateString());

        if (date === lastSessionDate) {
            return;
        }

        const sessionCount = globalState.get(SESSION_COUNT_KEY, 0) + 1;
        await globalState.update(LAST_SESSION_DATE_KEY, date);
        await globalState.update(SESSION_COUNT_KEY, sessionCount);

        if (sessionCount < SESSION_COUNT_THRESHOLD) {
            return;
        }

        const isCandidate = globalState.get(IS_CANDIDATE_KEY, false)
            || Math.random() < PROBABILITY;

        await globalState.update(IS_CANDIDATE_KEY, isCandidate);

        const extensionVersion = extensions.getExtension(Constants.ExtensionId).packageJSON.version || "unknown";
        if (!isCandidate) {
            await globalState.update(SKIP_VERSION_KEY, extensionVersion);
            return;
        }

        const take = {
            title: "Take Survey",
            run: async () => {
                TelemetryClient.sendEvent("nps.survey/takeShortSurvey");
                commands.executeCommand("vscode.open",
                    Uri.parse(
                        `${NPS_SURVEY_URL}?o=${encodeURIComponent(process.platform)}&v=${encodeURIComponent(extensionVersion)}&m=${encodeURIComponent(env.machineId)}`));
                await globalState.update(IS_CANDIDATE_KEY, false);
                await globalState.update(SKIP_VERSION_KEY, extensionVersion);
            },
        };
        const remind = {
            title: "Remind Me Later",
            run: async () => {
                TelemetryClient.sendEvent("nps.survey/remindMeLater");
                await globalState.update(SESSION_COUNT_KEY, 0);
            },
        };
        const never = {
            title: "Don't Show Again",
            run: async () => {
                TelemetryClient.sendEvent("nps.survey/dontShowAgain");
                await globalState.update(IS_CANDIDATE_KEY, false);
                await globalState.update(SKIP_VERSION_KEY, extensionVersion);
            },
        };
        TelemetryClient.sendEvent("nps.survey/userAsked");
        const button = await window.showInformationMessage("Do you mind taking a quick feedback survey about the Azure IoT Edge Extension for VS Code?", take, remind, never);
        await (button || remind).run();
    }
}
