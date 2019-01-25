import * as assert from "assert";
import * as vscode from "vscode";
import { Configuration } from "../src/common/configuration";
import { Constants } from "../src/common/constants";

suite("Extension Tests", () => {

    test("should be present", () => {
        assert.ok(vscode.extensions.getExtension(Constants.ExtensionId));
    });

    test("should be able to get config", () => {
        const terminalRoot = Configuration.getConfiguration().get<string>("terminalRoot");
        assert.equal(terminalRoot, "");
    });
});
