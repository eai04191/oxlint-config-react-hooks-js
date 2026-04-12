# oxlint-config-react-hooks-js

Oxlint config presets for [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks) as a JS plugin. Provides React Compiler lint rules that are not available in oxlint's native React plugin.

## Why

Oxlint's built-in `react` plugin covers `rules-of-hooks` and `exhaustive-deps` natively, but the React Compiler rules (introduced in eslint-plugin-react-hooks v7) have no native oxlint equivalent. This package bridges the gap by configuring `eslint-plugin-react-hooks` as an oxlint JS plugin with the correct alias and rule settings.

Rules that oxlint already implements natively are automatically excluded using [@oxlint/migrate](https://www.npmjs.com/package/@oxlint/migrate).

> [!WARNING]
> This package runs `eslint-plugin-react-hooks` as an oxlint JS plugin, which is significantly slower than oxlint's native Rust-based rules. Expect a noticeable performance hit compared to a native-only setup.

## Presets

<!-- PRESETS START -->

| Preset                    | Rules | Source                                                |
| ------------------------- | ----- | ----------------------------------------------------- |
| `recommended.json`        | 15    | `recommended` from `eslint-plugin-react-hooks`        |
| `recommended-latest.json` | 16    | `recommended-latest` from `eslint-plugin-react-hooks` |

<!-- PRESETS END -->

## Installation

```sh
pnpm add -D oxlint-config-react-hooks-js eslint-plugin-react-hooks
```

`eslint-plugin-react-hooks` is a peer dependency and must be installed in your project.

## Usage

### JSON config (`.oxlintrc.json`)

```json
{
    "$schema": "./node_modules/oxlint/configuration_schema.json",
    "extends": ["./node_modules/oxlint-config-react-hooks-js/configs/recommended-latest.json"]
}
```

### TypeScript config (`oxlint.config.ts`)

```ts
import { defineConfig } from "oxlint";
import reactCompiler from "oxlint-config-react-hooks-js/configs/recommended-latest.json" with { type: "json" };

export default defineConfig({
    extends: [reactCompiler],
});
```

The JSON import is typed as `OxlintConfig` via the bundled `.d.json.ts` declaration files.

### Overriding rules

```ts
import { defineConfig } from "oxlint";
import reactCompiler from "oxlint-config-react-hooks-js/configs/recommended-latest.json" with { type: "json" };

export default defineConfig({
    extends: [reactCompiler],
    rules: {
        "react-hooks-js/incompatible-library": "off",
        // Add rules not in the preset
        "react-hooks-js/todo": "error",
    },
});
```

## How it works

The `scripts/generate.ts` script:

1. Reads the `recommended` and `recommended-latest` configs from `eslint-plugin-react-hooks`
2. Passes them through `@oxlint/migrate` to identify rules that oxlint implements natively
3. Excludes native rules and prefixes the remaining rules with the `react-hooks-js` alias
4. Outputs JSON preset files to `configs/`

The `react-hooks-js` alias is required because `react-hooks` is a reserved plugin name in oxlint (covered by the native `react` plugin).

## License

MIT
