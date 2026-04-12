import { createRequire } from "node:module";

import migrate from "@oxlint/migrate";

const require = createRequire(import.meta.url);
// eslint-plugin-react-hooks is CJS-only, so we need createRequire
// oxlint-disable-next-line typescript-eslint(no-unsafe-assignment) -- CJS require return value
const reactHooksPlugin: Record<string, unknown> = require("eslint-plugin-react-hooks");

export const PLUGIN_ALIAS = "react-hooks-js";

export const pluginConfigs = (
    reactHooksPlugin as { configs: Record<string, { rules: Record<string, unknown> }> }
).configs;

export async function getNativeRuleShortNames(
    rules: Record<string, unknown>,
): Promise<Set<string>> {
    const result = await migrate([{ plugins: { "react-hooks": reactHooksPlugin }, rules }], {});
    return new Set(Object.keys(result.rules ?? {}).map((r) => r.replace(/^react\//, "")));
}

export function buildConfig(
    sourceRules: Record<string, unknown>,
    nativeRules: Set<string>,
): { jsPlugins: { name: string; specifier: string }[]; rules: Record<string, unknown> } {
    const rules: Record<string, unknown> = {};
    for (const [fullName, severity] of Object.entries(sourceRules)) {
        const shortName = fullName.replace(/^react-hooks\//, "");
        if (nativeRules.has(shortName)) continue;
        rules[`${PLUGIN_ALIAS}/${shortName}`] = severity;
    }
    return {
        jsPlugins: [{ name: PLUGIN_ALIAS, specifier: "eslint-plugin-react-hooks" }],
        rules,
    };
}

export const PRESETS = [
    { name: "recommended", configKey: "recommended" },
    { name: "recommended-latest", configKey: "recommended-latest" },
] as const;

export const TYPE_DECLARATION = [
    'import type { OxlintConfig } from "oxlint";',
    "declare const config: OxlintConfig;",
    "export default config;",
    "",
].join("\n");
