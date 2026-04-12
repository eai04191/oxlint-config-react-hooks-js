import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { PLUGIN_ALIAS, PRESETS } from "../scripts/lib.ts";

describe("generated JSON presets", () => {
    for (const preset of PRESETS) {
        describe(preset.name, () => {
            const configPath = `configs/${preset.name}.json`;
            const config: {
                jsPlugins: { name: string; specifier: string }[];
                rules: Record<string, string>;
            } = JSON.parse(readFileSync(configPath, "utf-8")) as {
                jsPlugins: { name: string; specifier: string }[];
                rules: Record<string, string>;
            };

            it("parses as valid JSON", () => {
                ok(config);
                ok(typeof config === "object");
            });

            it("has jsPlugins with alias and specifier", () => {
                strictEqual(config.jsPlugins.length, 1);
                deepStrictEqual(config.jsPlugins[0], {
                    name: PLUGIN_ALIAS,
                    specifier: "eslint-plugin-react-hooks",
                });
            });

            it("all rules have the alias prefix", () => {
                for (const ruleName of Object.keys(config.rules)) {
                    ok(
                        ruleName.startsWith(`${PLUGIN_ALIAS}/`),
                        `Rule "${ruleName}" should start with "${PLUGIN_ALIAS}/"`,
                    );
                }
            });

            it("excludes native oxlint rules (rules-of-hooks, exhaustive-deps)", () => {
                const ruleShortNames = Object.keys(config.rules).map((r) =>
                    r.replace(`${PLUGIN_ALIAS}/`, ""),
                );
                ok(!ruleShortNames.includes("rules-of-hooks"));
                ok(!ruleShortNames.includes("exhaustive-deps"));
            });

            it("severity is only error or warn", () => {
                for (const [ruleName, severity] of Object.entries(config.rules)) {
                    ok(
                        severity === "error" || severity === "warn",
                        `Rule "${ruleName}" has unexpected severity "${severity}"`,
                    );
                }
            });

            it("contains at least one rule", () => {
                ok(Object.keys(config.rules).length > 0);
            });
        });
    }

    it("recommended-latest is a superset of recommended", () => {
        const recommended: { rules: Record<string, string> } = JSON.parse(
            readFileSync("configs/recommended.json", "utf-8"),
        ) as { rules: Record<string, string> };
        const recommendedLatest: { rules: Record<string, string> } = JSON.parse(
            readFileSync("configs/recommended-latest.json", "utf-8"),
        ) as { rules: Record<string, string> };

        for (const ruleName of Object.keys(recommended.rules)) {
            ok(
                ruleName in recommendedLatest.rules,
                `Rule "${ruleName}" in recommended but missing from recommended-latest`,
            );
        }
    });

    it("recommended-latest has more rules than recommended", () => {
        const recommended: { rules: Record<string, string> } = JSON.parse(
            readFileSync("configs/recommended.json", "utf-8"),
        ) as { rules: Record<string, string> };
        const recommendedLatest: { rules: Record<string, string> } = JSON.parse(
            readFileSync("configs/recommended-latest.json", "utf-8"),
        ) as { rules: Record<string, string> };

        ok(Object.keys(recommendedLatest.rules).length > Object.keys(recommended.rules).length);
    });
});

describe("type declaration files", () => {
    for (const preset of PRESETS) {
        it(`${preset.name}.d.json.ts exists with correct content`, () => {
            const dts = readFileSync(`configs/${preset.name}.d.json.ts`, "utf-8");
            ok(dts.includes('import type { OxlintConfig } from "oxlint"'));
            ok(dts.includes("declare const config: OxlintConfig"));
            ok(dts.includes("export default config"));
        });
    }
});

describe("eslint-plugin-react-hooks resolution", () => {
    it("specifier is resolvable via Node.js module resolution", async () => {
        const resolved = await import("eslint-plugin-react-hooks");
        ok(resolved);
    });
});

describe("oxlint extends loads rules correctly", () => {
    const projectRoot = resolve(".");
    const oxlintBin = resolve("node_modules/.bin/oxlint");

    function runOxlint(cwd: string): string {
        const result = spawnSync(oxlintBin, ["."], {
            cwd,
            encoding: "utf-8",
            env: { ...process.env, NODE_PATH: join(projectRoot, "node_modules") },
        });
        // DEBUG: probe CI-only missing "Finished ... with N rules" line
        console.log(`[oxlint probe] cwd=${cwd}`);
        console.log(
            `[oxlint probe] status=${String(result.status)} signal=${String(result.signal)}`,
        );
        console.log(`[oxlint probe] stdout=${JSON.stringify(result.stdout)}`);
        console.log(`[oxlint probe] stderr=${JSON.stringify(result.stderr)}`);
        console.log(
            `[oxlint probe] env CI=${String(process.env.CI)} TERM=${String(process.env.TERM)} NO_COLOR=${String(process.env.NO_COLOR)} FORCE_COLOR=${String(process.env.FORCE_COLOR)}`,
        );
        return result.stdout + result.stderr;
    }

    function getRuleCount(output: string): number {
        const match = /with (\d+) rules/.exec(output);
        ok(match, `Could not parse rule count from: ${output}`);
        return Number(match[1]);
    }

    for (const preset of PRESETS) {
        it(`oxlint runs without errors when extending ${preset.name}.json`, () => {
            const tmpDir = mkdtempSync(join(tmpdir(), "oxlint-test-"));
            try {
                const configPath = resolve(`configs/${preset.name}.json`);
                writeFileSync(
                    join(tmpDir, ".oxlintrc.json"),
                    JSON.stringify({ extends: [configPath] }),
                );
                writeFileSync(join(tmpDir, "dummy.ts"), "export {};\n");

                const result = runOxlint(tmpDir);
                ok(
                    result.includes("Found 0 warnings and 0 errors"),
                    `oxlint should run cleanly, got: ${result}`,
                );
            } finally {
                rmSync(tmpDir, { recursive: true });
            }
        });
    }

    it("detects violations via extended rules", () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "oxlint-test-"));
        try {
            const configPath = resolve("configs/recommended-latest.json");
            writeFileSync(
                join(tmpDir, ".oxlintrc.json"),
                JSON.stringify({ extends: [configPath] }),
            );
            // set-state-in-render: calling setState during render
            writeFileSync(
                join(tmpDir, "violation.tsx"),
                [
                    'import { useState } from "react";',
                    "export function Component() {",
                    "  const [x, setX] = useState(0);",
                    "  setX(1);",
                    "  return x;",
                    "}",
                    "",
                ].join("\n"),
            );

            let output = "";
            try {
                execFileSync(oxlintBin, ["."], {
                    cwd: tmpDir,
                    encoding: "utf-8",
                    env: { ...process.env, NODE_PATH: join(projectRoot, "node_modules") },
                });
                ok(false, "oxlint should have exited with non-zero");
            } catch (e: unknown) {
                const err = e as { status: number; stdout: string };
                ok(err.status !== 0, "oxlint should report errors");
                output = err.stdout;
            }

            ok(
                output.includes("react-hooks-js(set-state-in-render)"),
                `Expected react-hooks-js(set-state-in-render) violation, got: ${output}`,
            );
        } finally {
            rmSync(tmpDir, { recursive: true });
        }
    });

    it("rule count increases by exactly the number of jsPlugin rules", () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "oxlint-test-"));
        try {
            writeFileSync(join(tmpDir, "dummy.ts"), "export {};\n");

            // Baseline rule count without config
            const baseOutput = runOxlint(tmpDir);
            const baseRuleCount = getRuleCount(baseOutput);

            // Extend recommended-latest
            const configPath = resolve("configs/recommended-latest.json");
            writeFileSync(
                join(tmpDir, ".oxlintrc.json"),
                JSON.stringify({ extends: [configPath] }),
            );
            const extendedOutput = runOxlint(tmpDir);
            const extendedRuleCount = getRuleCount(extendedOutput);

            // Should increase by the exact number of jsPlugin rules
            const configRules = JSON.parse(
                readFileSync("configs/recommended-latest.json", "utf-8"),
            ) as { rules: Record<string, string> };
            const expectedIncrease = Object.keys(configRules.rules).length;

            strictEqual(
                extendedRuleCount - baseRuleCount,
                expectedIncrease,
                `Expected ${String(expectedIncrease)} additional rules, got ${String(extendedRuleCount - baseRuleCount)}`,
            );
        } finally {
            rmSync(tmpDir, { recursive: true });
        }
    });
});
