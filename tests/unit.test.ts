import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import {
    PLUGIN_ALIAS,
    PRESETS,
    buildConfig,
    getNativeRuleShortNames,
    pluginConfigs,
} from "../scripts/lib.ts";

describe("buildConfig", () => {
    it("excludes native rules and adds alias prefix", () => {
        const sourceRules = {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/purity": "error",
            "react-hooks/refs": "error",
        };
        const nativeRules = new Set(["rules-of-hooks", "exhaustive-deps"]);

        const config = buildConfig(sourceRules, nativeRules);

        deepStrictEqual(config.rules, {
            [`${PLUGIN_ALIAS}/purity`]: "error",
            [`${PLUGIN_ALIAS}/refs`]: "error",
        });
    });

    it("includes all rules when no native rules exist", () => {
        const sourceRules = {
            "react-hooks/purity": "error",
            "react-hooks/refs": "warn",
        };
        const nativeRules = new Set<string>();

        const config = buildConfig(sourceRules, nativeRules);

        strictEqual(Object.keys(config.rules).length, 2);
    });

    it("includes plugin alias in jsPlugins", () => {
        const config = buildConfig({}, new Set());

        deepStrictEqual(config.jsPlugins, [
            { name: PLUGIN_ALIAS, specifier: "eslint-plugin-react-hooks" },
        ]);
    });

    it("preserves severity values", () => {
        const sourceRules = {
            "react-hooks/incompatible-library": "warn",
            "react-hooks/purity": "error",
        };

        const config = buildConfig(sourceRules, new Set());

        strictEqual(config.rules[`${PLUGIN_ALIAS}/incompatible-library`], "warn");
        strictEqual(config.rules[`${PLUGIN_ALIAS}/purity`], "error");
    });
});

describe("getNativeRuleShortNames", () => {
    it("returns rules that @oxlint/migrate can migrate", async () => {
        const rules = {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/purity": "error",
        };

        const nativeRules = await getNativeRuleShortNames(rules);

        ok(nativeRules.has("rules-of-hooks"));
        ok(nativeRules.has("exhaustive-deps"));
        ok(!nativeRules.has("purity"));
    });
});

describe("pluginConfigs", () => {
    for (const preset of PRESETS) {
        it(`eslint-plugin-react-hooks has "${preset.configKey}" config`, () => {
            const config = pluginConfigs[preset.configKey];
            ok(config);
            ok(Object.keys(config.rules).length > 0);
        });
    }

    it("recommended-latest contains more rules than recommended", () => {
        const recommended = pluginConfigs["recommended"];
        const recommendedLatest = pluginConfigs["recommended-latest"];
        ok(recommended);
        ok(recommendedLatest);
        ok(Object.keys(recommendedLatest.rules).length > Object.keys(recommended.rules).length);
    });
});
