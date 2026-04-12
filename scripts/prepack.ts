import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const DIST_DIR = "dist";
const KEEP_FIELDS = [
    "name",
    "version",
    "description",
    "keywords",
    "license",
    "type",
    "exports",
    "peerDependencies",
];

mkdirSync(DIST_DIR, { recursive: true });

// Generate a clean package.json for publishing (no engines, scripts, devDependencies, etc.)
const src = JSON.parse(readFileSync("package.json", "utf-8")) as Record<string, unknown>;
const pkg: Record<string, unknown> = {};
for (const field of KEEP_FIELDS) {
    if (field in src) {
        pkg[field] = src[field];
    }
}
writeFileSync(`${DIST_DIR}/package.json`, JSON.stringify(pkg, null, 2) + "\n");

// Copy artifacts
cpSync("configs", `${DIST_DIR}/configs`, { recursive: true });
cpSync("README.md", `${DIST_DIR}/README.md`);
