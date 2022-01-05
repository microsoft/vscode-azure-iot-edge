const fs = require("fs");
console.log(process.env);
if (process.env.BUILD_SOURCEBRANCH) {
    const ISPROD = new RegExp(process.env.ISPRODTAG).test(process.env.BUILD_SOURCEBRANCH || "");
    console.log(process.env.ISPRODTAG);
    const packageJson = JSON.parse(fs.readFileSync("package.json"));
    if (ISPROD) {
        packageJson.aiKey = process.env["PROD_AIKEY"];
        console.log("Updated prod AiKey");
    } else {
        packageJson.aiKey = process.env["INT_AIKEY"] || packageJson.aiKey;
        console.log("Updated INT AiKey");
    }
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2) + "\n");
    console.log("Updated AiKey");
} else {
    console.log("Skipping genAiKey");
}
