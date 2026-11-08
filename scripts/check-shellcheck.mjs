#!/usr/bin/env bun
// Static analysis for the shell scripts and the git hooks.
//
// ShellCheck runs from `@vscode-shellcheck/shellcheck-wasm`, so the check needs
// no binary on the host, no container and no download at run time: the
// WebAssembly module ships inside the dependency and `bun.lock` pins the same
// shellcheck version CI would otherwise take from the runner.
//
// The package's export map exposes the worker-based client only, so the
// synchronous entry point is loaded from the files beside its `package.json`.
//
// `--severity=warning` is the gate: errors and warnings fail, notes do not.
// `-x` follows the `source` directives so `expo-upgrade-lib.sh` is analysed
// through the script that uses it.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { wasmUrl } from "@vscode-shellcheck/shellcheck-wasm";

const packageJson = import.meta
  .resolve("@vscode-shellcheck/shellcheck-wasm/package.json");
const dist = new URL("./dist/", packageJson);
const { run } = await import(new URL("runner.js", dist));
const { createReadOnlyPreopen } = await import(new URL("preopen.js", dist));

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const TARGETS = [
  ...readdirSync(join(ROOT, "scripts"))
    .filter((name) => name.endsWith(".sh"))
    .sort()
    .map((name) => `scripts/${name}`),
  ".githooks/pre-commit",
  ".githooks/pre-push",
];

// WASI errno values the guest can act on. Anything else is reported as an I/O
// error rather than disguised as a missing file.
const ENOENT = 44;
const ENOTDIR = 54;
const EIO = 29;

/** Serves the repository read-only at the guest's `/mnt`. */
const files = {
  host: (path) => join(ROOT, path.replace(/^\/mnt/, "")),
  stat(path) {
    try {
      const stat = statSync(files.host(path));
      return {
        type: stat.isDirectory() ? "directory" : "file",
        size: stat.size,
        // The guest stores nanoseconds in a BigInt, so it wants an integer.
        mtime: Math.trunc(stat.mtimeMs),
      };
    } catch (error) {
      return error.code === "ENOENT" ? ENOENT : EIO;
    }
  },
  readFile(path) {
    try {
      return new Uint8Array(readFileSync(files.host(path)));
    } catch {
      return ENOENT;
    }
  },
  readDirectory(path) {
    try {
      return readdirSync(files.host(path), { withFileTypes: true }).map(
        (entry) => [entry.name, entry.isDirectory() ? "directory" : "file"],
      );
    } catch (error) {
      return error.code === "ENOENT" ? ENOENT : ENOTDIR;
    }
  },
};

const module = new WebAssembly.Module(readFileSync(wasmUrl));
const result = run(module, {
  args: [
    "-x",
    "-s",
    "bash",
    "--severity=warning",
    "-f",
    "gcc",
    ...TARGETS.map((target) => `/mnt/${target}`),
  ],
  env: { PWD: "/mnt" },
  preopens: [createReadOnlyPreopen(files)],
});

const stdout = new TextDecoder().decode(result.stdout);
const stderr = new TextDecoder().decode(result.stderr);
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);

if (result.exitCode === 0) {
  console.log(`✓ shellcheck reports no finding across ${TARGETS.length} files`);
} else if (result.exitCode === 1) {
  console.error("✗ shellcheck reports findings");
}

// ShellCheck's own meaning: 0 clean, 1 findings, 2 or higher invalid input.
process.exit(result.exitCode);
