#!/usr/bin/env node
// Changesets updates package.json but not server.json. This copies the package version into
// server.json, so the MCP Registry entry names the npm version that the release publishes.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const serverFile = new URL("server.json", root);
const server = JSON.parse(readFileSync(serverFile, "utf8"));

server.version = pkg.version;
for (const entry of server.packages ?? []) {
  if (entry.identifier === pkg.name) entry.version = pkg.version;
}

writeFileSync(serverFile, `${JSON.stringify(server, null, 2)}\n`);
console.log(`server.json now names ${pkg.name}@${pkg.version}.`);
