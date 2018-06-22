import * as assert from "assert";
import * as fse from "fs-extra";
import * as path from "path";
import { Constants } from "../src/common/constants";
import { Utility } from "../src/common/utility";

suite("utility tests", () => {
  test("expandEnv", async () => {
    const input: string = await fse.readFile(path.resolve(__dirname, "../../testResources/deployment.template.json"), "utf8");
    // const mapObj: Map<string, string> = new Map<string, string>();
    // mapObj.set("MODULES.SampleModule.amd64", "test.az.io/filter:0.0.1-amd64");
    const imageString: string = "microsoft/tempSensor:1.0.0";
    process.env.IMAGE = imageString;
    process.env.edgeAgent = "test";
    const exceptStr: string[] = ["$edgeHub", "$edgeAgent", "$upstream"];
    const generated: string = Utility.expandEnv(input, ...exceptStr);
    const generatedObj = JSON.parse(generated);
    assert.equal(generatedObj.moduleContent
                  .$edgeAgent["properties.desired"]
                  .modules.tempSensor.settings.image, imageString);
  }).timeout(60 * 1000);

  test("expandModules", async () => {
    const input: string = await fse.readFile(path.resolve(__dirname, "../../testResources/deployment.template.json"), "utf8");
    const mapObj: Map<string, string> = new Map<string, string>();
    mapObj.set("MODULES.SampleModule.amd64", "test.az.io/filter:0.0.1-amd64");
    const generated: string = Utility.expandModules(input, mapObj);
    const generatedObj = JSON.parse(generated);
    assert.equal(generatedObj.moduleContent
                  .$edgeAgent["properties.desired"]
                  .modules.samplemodule.settings.image, "test.az.io/filter:0.0.1-amd64");
  }).timeout(60 * 1000);

  test("getValidModuleName", () => {
    let valid: string = Utility.getValidModuleName("test Space");
    assert.equal(valid, "test_Space");

    valid = Utility.getValidModuleName("test    Multiple-space");
    assert.equal(valid, "test_Multiple_space");
  });

  test("setModuleMap", async () => {
    const moduleDir = path.resolve(__dirname, "../../testResources/module1");
    const moduleToImageMap: Map<string, string> = new Map();
    const imageToDockerfileMap: Map<string, string> = new Map();
    const imageToBuildOptions: Map<string, string[]> = new Map();
    await Utility.setModuleMap(moduleDir, moduleToImageMap, imageToDockerfileMap, imageToBuildOptions);
    assert.equal(moduleToImageMap.size, 4);
    assert.equal(imageToDockerfileMap.size, 4);
    assert.equal(imageToBuildOptions.size, 4);
    assert.equal(imageToBuildOptions.get("localhost:5000/samplemodule:0.0.1-amd64").length, 8);
  }).timeout(60 * 1000);

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

  test("getAddressKey", () => {
    const keySet = new Set([]);
    let key = Utility.getAddressKey("localhost:5000", new Set([]));
    assert.equal(key, "localhost");
    keySet.add("localhost");
    key = Utility.getAddressKey("localhost:5000", keySet);
    assert.equal(key, "localhost_1");
    keySet.add("localhost_1");
    key = Utility.getAddressKey("localhost", keySet);
    assert.equal(key, "localhost_2");
    key = Utility.getAddressKey("a.azurecr.io", keySet);
    assert.equal(key, "a");
    keySet.add("a");
    key = Utility.getAddressKey("a", keySet);
    assert.equal(key, "a_1");
  });

  test("getRegistryAddress", () => {
    let registry = Utility.getRegistryAddress("localhost:5000/test");
    assert.equal(registry, "localhost:5000");

    registry = Utility.getRegistryAddress("localhost/test");
    assert.equal(registry, "localhost");

    registry = Utility.getRegistryAddress("LOCALHOST/test");
    assert.equal(registry, "localhost");

    registry = Utility.getRegistryAddress("a.azurecr.io/test");
    assert.equal(registry, "a.azurecr.io");

    registry = Utility.getRegistryAddress("microsoft/tet");
    assert.equal(registry, "docker.io");

    registry = Utility.getRegistryAddress("python");
    assert.equal(registry, "docker.io");
  });
});
