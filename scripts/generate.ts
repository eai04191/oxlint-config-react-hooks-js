import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import {
    PRESETS,
    TYPE_DECLARATION,
    buildConfig,
    getNativeRuleShortNames,
    pluginConfigs,
} from "./lib.ts";

mkdirSync("configs", { recursive: true });

const presetRows: string[] = [];

for (const preset of PRESETS) {
    const presetConfig = pluginConfigs[preset.configKey];
    if (!presetConfig) {
        throw new Error(`Config "${preset.configKey}" not found in eslint-plugin-react-hooks`);
    }
    const nativeRules = await getNativeRuleShortNames(presetConfig.rules);
    const config = buildConfig(presetConfig.rules, nativeRules);
    writeFileSync(`configs/${preset.name}.json`, JSON.stringify(config, null, 2) + "\n");
    writeFileSync(`configs/${preset.name}.d.json.ts`, TYPE_DECLARATION);
    const ruleCount = Object.keys(config.rules).length;
    presetRows.push(
        `| \`${preset.name}.json\` | ${String(ruleCount)} | \`${preset.configKey}\` from \`eslint-plugin-react-hooks\` |`,
    );
    console.log(`Generated configs/${preset.name}.json (${String(ruleCount)} rules)`);
}

// Update the presets table in README.md
const readmePath = "README.md";
const readme = readFileSync(readmePath, "utf-8");
const startMarker = "<!-- PRESETS START -->";
const endMarker = "<!-- PRESETS END -->";
const startIdx = readme.indexOf(startMarker);
const endIdx = readme.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const table = ["| Preset | Rules | Source |", "| --- | --- | --- |", ...presetRows].join("\n");
    const updated =
        readme.slice(0, startIdx + startMarker.length) + "\n" + table + "\n" + readme.slice(endIdx);
    writeFileSync(readmePath, updated);
    console.log("Updated README.md presets table");
}
