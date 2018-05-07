import * as assert from "assert";
import * as vscode from "vscode";
import { Constants } from "../src/common/constants";
import { Utility } from "../src/common/utility";
import * as myExtension from "../src/extension";

suite("Extension Tests", () => {

    test("should be present", () => {
        assert.ok(vscode.extensions.getExtension(Constants.ExtensionId));
    });

    test("should be able to get config", () => {
        const terminalRoot = Utility.getConfiguration().get<string>("terminalRoot");
        assert.equal(terminalRoot, "");
    });
});
