# Dependency security update, 2026-10-21

The MCP server uses the SDK stdio transport in `src/server.ts`. It starts no HTTP listener and uses no SDK OAuth client or experimental task API.

The SDK minimum version is now 1.32.1. The unused Nodemon development dependency was removed. This removes its file watcher packages; Changesets still brings in braces through micromatch.

Compatible dependency updates also resolve patched Express, Hono, proxy-addr, and other transitive runtime packages. Vite is an explicit development dependency so PNPM resolves a patched Vite 8 release for Vitest's peer dependency. Its previous auto-installed peer stayed at 8.0.16 during compatible updates.

## Remaining development exposure

The npm bulk advisory endpoint reports two remaining packages. Their stated patched versions are absent from the npm registry as of this check:

- `braces` 3.0.3, through Changesets and micromatch. GHSA-vfj7-8cjw-p6xm requires 3.0.4. The registry lookup for 3.0.4 failed.
- `sprintf-js` 1.0.3, through Changesets and the js-yaml 3 parser's argparse dependency. GHSA-hp3w-g68c-fv3c requires 1.1.4. The registry lookup for 1.1.4 failed. Updating to the latest published 1.1.3 would retain the advisory.

These packages support release tasks. They are absent from the production dependency graph. Recheck the registry and advisory service before release. Use only trusted project files with the release tools until upstream patches are available.

## Verification

Used Node 24.22.1 and PNPM 11.8.0.

- `pnpm test:run`: 87 passed; two optional live contract tests skipped.
- `pnpm build` and `pnpm lint`: passed.
- `pnpm peers check`: passed after Vite became an explicit dependency.
- `pnpm pack`: passed. The extracted tarball completed an SDK stdio initialize and tools/list request for all five public tools.
- Production `pnpm audit --prod --json`: zero vulnerabilities across 95 dependencies before the final removal of the development-only Nodemon package.
- npm bulk advisory endpoint returned HTTP 200 and the two development advisories above. Later audit retries timed out, so endpoint availability varies.
- OSV batch audit of the final lockfile: checked all 388 exact package versions. It reports only the same braces and sprintf-js advisories.

The approved Changeset has been applied as version 0.5.2. The generated changelog and both versions in `server.json` match `package.json`. The release passed the same 87 tests, build, lint, and release-file formatting checks on 2026-10-22. The current release workflow opens a Changesets version PR; it contains no npm publish step. The 0.5.2 tarball completed an MCP stdio initialize and tools/list handshake, reporting version 0.5.2 and all five tools. After the user refreshed npm login and completed publish authentication, `npm publish` accepted `@starwind-ui/mcp@0.5.2` on 2026-10-22. npm completed processing, and the registry exposes version 0.5.2. A fresh isolated npm install succeeded and completed MCP stdio initialize and tools/list requests with all five tools. The registry SHA-512 integrity matches the tested release tarball (SHA-1 `8564106076956101ca022e65077e2878e493c7ca`).

## Sources

- [OSV API](https://google.github.io/osv.dev/api/)
- [SDK releases](https://github.com/modelcontextprotocol/typescript-sdk/releases)
- [PNPM update behavior](https://pnpm.io/cli/update)
- [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
