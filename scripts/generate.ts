import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import {
    PLUGIN_ALIAS,
    PRESETS,
    TYPE_DECLARATION,
    TYPE_DECLARATION_FILE,
    buildConfig,
    getNativeRuleShortNames,
    pluginConfigs,
    pluginRuleNames,
} from "./lib.ts";

mkdirSync("configs", { recursive: true });

writeFileSync(TYPE_DECLARATION_FILE, TYPE_DECLARATION);

interface PresetDetail {
    name: string;
    configKey: string;
    ruleCount: number;
    enabled: string[];
    excluded: string[];
    sourceShortNames: Set<string>;
}

const presetDetails: PresetDetail[] = [];

for (const preset of PRESETS) {
    const presetConfig = pluginConfigs[preset.configKey];
    if (!presetConfig) {
        throw new Error(`Config "${preset.configKey}" not found in eslint-plugin-react-hooks`);
    }
    const nativeRules = await getNativeRuleShortNames(presetConfig.rules);
    const config = buildConfig(presetConfig.rules, nativeRules);
    writeFileSync(`configs/${preset.name}.json`, JSON.stringify(config, null, 2) + "\n");

    const sourceShortNames = new Set(
        Object.keys(presetConfig.rules).map((n) => n.replace(/^react-hooks\//, "")),
    );
    const enabled = Object.keys(config.rules)
        .map((r) => r.replace(new RegExp(`^${PLUGIN_ALIAS}/`), ""))
        .sort();
    const excluded = [...nativeRules].sort();

    presetDetails.push({
        name: preset.name,
        configKey: preset.configKey,
        ruleCount: enabled.length,
        enabled,
        excluded,
        sourceShortNames,
    });
    console.log(`Generated configs/${preset.name}.json (${String(enabled.length)} rules)`);
}

const presetRows = presetDetails.map(
    (d) =>
        `| \`${d.name}.json\` | ${String(d.ruleCount)} | \`${d.configKey}\` from \`eslint-plugin-react-hooks\` |`,
);

const inAnyPreset = new Set<string>();
for (const d of presetDetails) {
    for (const r of d.sourceShortNames) inAnyPreset.add(r);
}
const optInRules = pluginRuleNames.filter((n) => !inAnyPreset.has(n)).sort();

function formatRuleList(rules: string[]): string {
    if (rules.length === 0) return "_(none)_";
    return rules.map((r) => `- \`${r}\``).join("\n");
}

const rulesSectionParts: string[] = [];
for (const d of presetDetails) {
    rulesSectionParts.push(`#### \`${d.name}\``);
    rulesSectionParts.push("");
    rulesSectionParts.push(
        `Enabled via JS plugin (${String(d.enabled.length)} rules, prefixed with \`${PLUGIN_ALIAS}/\`):`,
    );
    rulesSectionParts.push("");
    rulesSectionParts.push(formatRuleList(d.enabled));
    rulesSectionParts.push("");
    rulesSectionParts.push(
        `Excluded because oxlint covers them natively (${String(d.excluded.length)} rules):`,
    );
    rulesSectionParts.push("");
    rulesSectionParts.push(formatRuleList(d.excluded));
    rulesSectionParts.push("");
}

rulesSectionParts.push("#### Opt-in rules (not in any preset)");
rulesSectionParts.push("");
rulesSectionParts.push(
    `Rules shipped by \`eslint-plugin-react-hooks\` that no preset enables (${String(optInRules.length)} rules). Add them manually under \`rules\` with the \`${PLUGIN_ALIAS}/\` prefix (see [Overriding rules](#overriding-rules)):`,
);
rulesSectionParts.push("");
rulesSectionParts.push(formatRuleList(optInRules));

const rulesSection = rulesSectionParts.join("\n");

const readmePath = "README.md";
let readme = readFileSync(readmePath, "utf-8");

function replaceBetween(
    source: string,
    startMarker: string,
    endMarker: string,
    replacement: string,
    label: string,
): string {
    const startIdx = source.indexOf(startMarker);
    const endIdx = source.indexOf(endMarker);
    if (startIdx === -1 || endIdx === -1) {
        console.warn(`Markers for ${label} not found in README.md — skipping`);
        return source;
    }
    const updated =
        source.slice(0, startIdx + startMarker.length) +
        "\n\n" +
        replacement +
        "\n\n" +
        source.slice(endIdx);
    console.log(`Updated README.md ${label}`);
    return updated;
}

const presetsTable = ["| Preset | Rules | Source |", "| --- | --- | --- |", ...presetRows].join(
    "\n",
);
readme = replaceBetween(
    readme,
    "<!-- PRESETS START -->",
    "<!-- PRESETS END -->",
    presetsTable,
    "presets table",
);
readme = replaceBetween(
    readme,
    "<!-- RULES START -->",
    "<!-- RULES END -->",
    rulesSection,
    "rules section",
);

writeFileSync(readmePath, readme);
