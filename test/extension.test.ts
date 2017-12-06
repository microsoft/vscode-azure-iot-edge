import * as assert from "assert";
import * as vscode from "vscode";
import { Constants } from "../src/common/constants";
import { Utility } from "../src/common/utility";
import * as myExtension from "../src/extension";

suite("Extension Tests", () => {

    test("should be present", () => {
        assert.ok(vscode.extensions.getExtension(Constants.ExtensionId));
    });

    test("should activate", function() {
        this.timeout(1 * 60 * 1000);
        return vscode.extensions.getExtension(Constants.ExtensionId).activate().then((api) => {
            assert.ok(true);
        });
    });

    test("should be able to get config", () => {
        const terminalRoot = Utility.getConfiguration().get<string>("terminalRoot");
        assert.equal(terminalRoot, "");
    });
});
