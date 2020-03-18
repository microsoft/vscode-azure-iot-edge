// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class RetryPolicy {
    public static async retry(maxRetryTimes: number, retryInterval: number, func: () => Promise<void>) {
        let retries: number = 0;
        while (true) {
            try {
                retries++;
                await func();
                break;
            } catch (err) {
                if (retries < maxRetryTimes) {
                    await this.sleep(retryInterval);
                    continue;
                }
                throw err;
            }
        }
    }

    private static async sleep(ms: number): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
}
