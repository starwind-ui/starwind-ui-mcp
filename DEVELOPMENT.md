# Development

This pnpm-managed TypeScript project builds the Starwind UI MCP stdio server from `src/` into `dist/`.

## Commands

```bash
pnpm build
pnpm lint
pnpm test:run
```

The normal test suite uses local v3 manifest fixtures. To check the live production contract explicitly:

```bash
RUN_LIVE_CONTRACT_TESTS=1 pnpm test:run src/utils/starwind_live_contract.test.ts
```

## Project structure

```text
src/
  config/                 Server configuration
  tools/                  Public MCP tools and registration
  utils/                  Manifest, project, command, and package-manager helpers
  server.ts               MCP stdio entrypoint
test/                     Shared deterministic test fixtures
```

## Adding or changing tools

Keep the public surface compact and intent-based. A tool definition needs a name, description, Zod input shape, Zod output shape, async handler, registration in `src/tools/index.ts`, and protocol-level tests.

Never write diagnostic output to stdout in runtime code because it corrupts MCP stdio. Use structured tool warnings for user-facing diagnostics. Network metadata must have a timeout, schema validation, cache behavior, and a graceful fallback where appropriate.

Use a changeset for publishable behavior changes:

```bash
pnpm changeset
```
