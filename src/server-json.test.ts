import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8")) as Record<string, any>;

describe("MCP Registry metadata", () => {
  it("names the package version in server.json", () => {
    const pkg = read("package.json");
    const server = read("server.json");

    expect(server.name).toBe(pkg.mcpName);
    expect(server.version).toBe(pkg.version);
    const npmEntry = server.packages.find(
      (entry: { identifier: string }) => entry.identifier === pkg.name,
    );
    expect(npmEntry?.version).toBe(pkg.version);
  });
});
