import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "bun:test";

/**
 * The schema generator and the runtime library must move together.
 *
 * The generator is published as `auth` on the same release line as
 * `better-auth`, and generating the schema with a different build is what
 * produced the nested-library skew this replaced: the CLI carried its own
 * older copy of the library, so the generated columns could disagree with
 * the code that reads them.
 *
 * Pinning one of the two is not enough, because a caret on the other side
 * drifts in the opposite direction on the next update. This test states the
 * invariant directly, so any drift fails here instead of surfacing as a
 * schema mismatch at runtime.
 */
function findPackageJson(specifier: string): string {
  // Walk up from this file instead of resolving the module: the workspace
  // hoists these packages to the root node_modules, which module resolution
  // from apps/api does not reach.
  let dir = import.meta.dir;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, "node_modules", specifier, "package.json");
    try {
      readFileSync(candidate, "utf8");
      return candidate;
    } catch {
      // Not at this level; try the parent.
    }
    dir = dirname(dir);
  }
  throw new Error(`Could not locate ${specifier} in any node_modules`);
}

function readPackageVersion(specifier: string): string {
  const raw = readFileSync(findPackageJson(specifier), "utf8");
  const pkg = JSON.parse(raw) as { name?: string; version?: string };
  if (pkg.name !== specifier) {
    throw new Error(`Expected package ${specifier}, found ${pkg.name}`);
  }
  return pkg.version ?? "";
}

describe("auth CLI and library version parity", () => {
  it("installs the schema generator on the same version as the library", () => {
    const library = readPackageVersion("better-auth");
    const generator = readPackageVersion("auth");

    expect(library).toMatch(/^\d+\.\d+\.\d+/);
    expect(generator).toBe(library);
  });
});
