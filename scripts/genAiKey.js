const fs = require("fs");

if (process.env.BUILD_SOURCEBRANCH) {
    const ISPROD = new RegExp(process.env.ISPRODTAG).test(process.env.BUILD_SOURCEBRANCH || "");
    const packageJson = JSON.parse(fs.readFileSync("package.json"));
    if (ISPROD) {
        packageJson.aiKey = process.env["PROD_AIKEY"];
        console.log("Updated Prod AiKey");
    } else {
        packageJson.aiKey = process.env["INT_AIKEY"] || packageJson.aiKey;
    }
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2) + "\n");
    console.log("Updated AiKey");
} else {
    console.log("Skipping genAiKey");
}
