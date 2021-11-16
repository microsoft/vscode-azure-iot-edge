import * as path from 'path';
import * as cp from 'child_process';

import { runTests, downloadAndUnzipVSCode } from 'vscode-test/out/index';

async function go() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		const extensionTestsPath = path.resolve(__dirname, './');

		await runTests({
			version: '1.40.0',
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				'--no-sandbox',
				// This disables all extensions except the one being testing
				'--disable-extensions'
			]
		});
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

go();
