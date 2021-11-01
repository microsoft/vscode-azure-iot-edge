import * as assert from "assert";
import * as fse from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { BuildSettings } from "../src/common/buildSettings";
import { Configuration } from "../src/common/configuration";
import { Constants } from "../src/common/constants";
import { Platform } from "../src/common/platform";
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
    const generated: string = Utility.expandEnv(input, {}, ...exceptStr);
    const generatedObj = JSON.parse(generated);
    assert.equal(generatedObj.modulesContent
      .$edgeAgent["properties.desired"]
      .modules.SimulatedTemperatureSensor.settings.image, imageString);
  }).timeout(60 * 1000);

  test("expandModules", async () => {
    const input = await fse.readJson(path.resolve(__dirname, "../../testResources/deployment.template.json"));
    const mapObj: Map<string, string> = new Map<string, string>();
    mapObj.set("MODULES.SampleModule.amd64", "test.az.io/filter:0.0.1-amd64");
    const generated: string = Utility.expandModules(input, mapObj);
    const generatedObj = JSON.parse(generated);
    assert.equal(generatedObj.modulesContent
      .$edgeAgent["properties.desired"]
      .modules.samplemodule.settings.image, "test.az.io/filter:0.0.1-amd64");
  }).timeout(60 * 1000);

  test("convertCreateOptions", async () => {
    const input: string = await fse.readFile(path.resolve(__dirname, "../../testResources/deployment.template.json"), "utf8");
    let deployment = JSON.parse(input);
    const oldOptionObj = deployment.modulesContent.$edgeAgent["properties.desired"].modules.SimulatedTemperatureSensor.settings.createOptions;
    deployment = Utility.convertCreateOptions(deployment);
    const depStr = JSON.stringify(deployment, null, 2);
    assert.equal(
      deployment.modulesContent.$edgeAgent["properties.desired"].systemModules.edgeAgent.settings.createOptions,
      deployment.modulesContent.$edgeAgent["properties.desired"].systemModules.edgeHub.settings.createOptions,
    );

    const settings = deployment.modulesContent.$edgeAgent["properties.desired"].modules.SimulatedTemperatureSensor.settings;
    assert.equal(settings.hasOwnProperty("createOptions"), true);
    assert.equal(settings.hasOwnProperty("createOptions01"), true);
    assert.equal(settings.hasOwnProperty("createOptions02"), true);

    const optionString = settings.createOptions + settings.createOptions01 + settings.createOptions02;
    const optionObj = JSON.parse(optionString);
    for (const key in oldOptionObj) {
      if (oldOptionObj.hasOwnProperty(key)) {
        assert.equal(optionObj.hasOwnProperty(key), true);
      }
    }
    assert.equal(optionObj.Env.length, oldOptionObj.Env.length);
    assert.equal(JSON.stringify(optionObj.Env), JSON.stringify(oldOptionObj.Env));
  }).timeout(60 * 1000);

  test("serializeCreateOptions", async () => {
    const hostPort: any = {
      HostPort: "43",
    };

    const hostPorts50: any[] = Array(50).fill(hostPort);
    const PortBindingsVal = {
      "43/udp": hostPorts50,
      "42/tcp": [{
        HostPort: "42",
      }],
    };

    const createOptionsVal = {
      Env: ["k1=v1", "k2=v2", "k3=v3"],
      HostConfig: {
        PortBindings: PortBindingsVal,
      },
    };

    let settings = {
      image: "test",
      createOptions: createOptionsVal,
    };

    settings = Utility.serializeCreateOptions(settings, createOptionsVal);
    const outStr = JSON.stringify(settings);

    const expected = "{\"image\":\"test\",\"createOptions\":\"{\\\"Env\\\":[\\\"k1=v1\\\",\\\"k2=v2\\\",\\\"k3=v3\\\"],"
      + "\\\"HostConfig\\\":{\\\"PortBindings\\\":{\\\"43/udp\\\":[{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostP\",\"createOptions01\":\"ort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},"
      + "{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"},{\\\"HostPort\\\":\\\"43\\\"}],\\\"42/tcp\\\":[{\\\"HostPort\\\":\\\"42\\\"}]}}}\"}";
    assert.equal(outStr, expected);
  }).timeout(60 * 1000);

  test("serializeCreateOptionsShort", async () => {
    const createOptionsVal = {
      Env: ["k1=v1", "k2=v2", "k3=v3"],
    };

    let settings = {
      image: "test",
      createOptions: createOptionsVal,
    };

    settings = Utility.serializeCreateOptions(settings, createOptionsVal);
    const outStr = JSON.stringify(settings);
    const expected = "{\"image\":\"test\",\"createOptions\":\"{\\\"Env\\\":[\\\"k1=v1\\\",\\\"k2=v2\\\",\\\"k3=v3\\\"]}\"}";
    assert.equal(outStr, expected);
  }).timeout(60 * 1000);

  test("getValidModuleName", () => {
    let valid: string = Utility.getValidModuleName("test Space");
    assert.equal(valid, "test_Space");

    valid = Utility.getValidModuleName("test    Multiple-space");
    assert.equal(valid, "test_Multiple_space");
  });

  test("setModuleMap", async () => {
    sinon.stub(Platform, "getDefaultPlatform").callsFake(() => {
      return new Platform("arm32v7", "camera");
    });
    const moduleDir = path.resolve(__dirname, "../../testResources/module1");
    const moduleToImageMap: Map<string, string> = new Map();
    const imageToBuildSettings: Map<string, BuildSettings> = new Map();
    await Utility.setModuleMap(moduleDir, Constants.subModuleKeyPrefixTemplate(path.basename(moduleDir)), moduleToImageMap, imageToBuildSettings);
    assert.equal(moduleToImageMap.size, 7);
    assert.equal(moduleToImageMap.get("MODULES.module1"), "localhost:5000/samplemodule:0.0.1-arm32v7");
    assert.equal(moduleToImageMap.get("MODULES.module1.debug"), "localhost:5000/samplemodule:0.0.1-arm32v7.debug");
    assert.equal(imageToBuildSettings.size, 5);
    assert.equal(imageToBuildSettings.get("localhost:5000/samplemodule:0.0.1-amd64").options.length, 8);
    sinon.restore();
  }).timeout(60 * 1000);

  test("setSlnModulesMap", async () => {
    sinon.stub(Platform, "getDefaultPlatform").callsFake(() => {
      return new Platform("arm32v7", "camera");
    });
    const slnDir = path.resolve(__dirname, "../../testResources");
    const templateFile = path.join(slnDir, "deployment.template.json");
    const moduleToImageMap: Map<string, string> = new Map();
    const imageToBuildSettings: Map<string, BuildSettings> = new Map();
    await Utility.setSlnModulesMap(templateFile, moduleToImageMap, imageToBuildSettings);
    assert.equal(moduleToImageMap.size, 7);
    assert.equal(moduleToImageMap.get("MODULEDIR<./module1>"), "localhost:5000/samplemodule:0.0.1-arm32v7");
    assert.equal(moduleToImageMap.get("MODULEDIR<./module1>.debug"), "localhost:5000/samplemodule:0.0.1-arm32v7.debug");
    assert.equal(imageToBuildSettings.size, 5);
    assert.equal(imageToBuildSettings.get("localhost:5000/samplemodule:0.0.1-amd64").options.length, 8);
    sinon.restore();
  }).timeout(60 * 1000);

  test("getDisplayName", () => {
    const platform1 = new Platform("amd64", null);
    assert.equal("amd64", platform1.getDisplayName());

    const platform2 = new Platform("arm32v7", "test");
    assert.equal("test (arm32v7)", platform2.getDisplayName());
  });

  test("getPlatformsSetting", () => {
    sinon.stub(Configuration, "getConfiguration").callsFake(() => {
      const stubMap = new Map();
      stubMap.set(Constants.platformsConfig, {
        arm32v7: [],
        amd64: ["t1", "t2"],
        windows: null,
        test: ["test"],
      });
      return (stubMap as unknown) as vscode.WorkspaceConfiguration;
    });
    const platforms: Platform[] = Platform.getPlatformsSetting();
    assert.equal(platforms.length, 6);
  });

  test("replaceAll", async () => {
    // tslint:disable-next-line:quotemark
    const input: string = '"%MODULE%": {\
                              "version": "1.0",\
                              "type": "docker",\
                              "status": "running",\
                              "restartPolicy": "always",\
                              "settings": {\
                                "image": "%MODULE_IMAGE%",\
                                "createOptions": "{}"\
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
                                "createOptions": "{}"\
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

  test("getResourceGroupFromId", () => {
    assert.equal(Utility.getResourceGroupFromId(""), undefined);
    assert.equal(Utility.getResourceGroupFromId("/subscriptions/00000000-0000-0000-0000-000000000000/"
      + "resourceGroups/fangzh-aml/providers/Microsoft.MachineLearningServices/workspaces/fangzh-aml"),
      "fangzh-aml");
    assert.equal(Utility.getResourceGroupFromId("/subscriptions/00000000-0000-0000-0000-000000000000/"
      + "resourcegroups/fangzh-AML/providers/Microsoft.MachineLearningServices/workspaces/fangzh-aml"),
      "fangzh-AML");
  });
});
