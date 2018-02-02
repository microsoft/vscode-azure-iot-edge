import * as assert from "assert";
import { Constants } from "../src/common/constants";
import { Utility } from "../src/common/utility";

suite("utility tests", () => {
  test("replaceAll", async () => {
    // tslint:disable-next-line:quotemark
    const input: string = '"%MODULE%": {\
                              "version": "1.0",\
                              "type": "docker",\
                              "status": "running",\
                              "restartPolicy": "always",\
                              "settings": {\
                                "image": "%MODULE_IMAGE%",\
                                "createOptions": ""\
                              }\
                            }\
                          }';
    const mapObj: Map<string, string> = new Map<string, string>();
    const moduleName: string = "SampleModule";
    mapObj.set(Constants.moduleNamePlaceholder, moduleName);
    mapObj.set(Constants.moduleImagePlaceholder, `\${MODULES.${moduleName}.amd64}`);
    const generated: string = Utility.replaceAll(input, mapObj);
    const expected: string = '"SampleModule": {\
                              "version": "1.0",\
                              "type": "docker",\
                              "status": "running",\
                              "restartPolicy": "always",\
                              "settings": {\
                                "image": "${MODULES.SampleModule.amd64}",\
                                "createOptions": ""\
                              }\
                            }\
                          }';
    assert.equal(generated, expected);
  }).timeout(60 * 1000);
});
