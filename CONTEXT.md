# Starwind UI MCP Context

This repository contains the TypeScript MCP server for Starwind UI v3. It exposes current Starwind UI, Runtime, and Starwind Pro guidance over MCP stdio without executing generated project commands.

## Domain glossary

| Term | Meaning |
| --- | --- |
| Styled component | A copy-owned Starwind UI component with one or more `astro`, `react`, `vue`, or `svelte` implementations. |
| Primitive | A lower-level adapter from the Starwind Astro, React, Vue, or Svelte package, optionally backed by a Runtime factory. |
| Runtime | Framework-neutral behavior APIs from `@starwind-ui/runtime`. |
| Pro block | An Astro component from the Pro catalog, installed with an `@starwind-pro/` identifier. Every framework can install it. Free blocks need ordinary initialization; paid blocks need explicit Pro authorization. |
| AI manifest | The versioned `https://starwind.dev/ai-manifest.json` contract for components, primitives, Runtime, guides, and CLI metadata. |
| Project context | Read-only detection of framework, host, Astro islands, config version and framework, component directories, installed component count, and, with an explicit `cwd`, installed package docs (`packageDocs`). |
| Installed docs | The `docs/` folder that each `@starwind-ui/*` package ships from 1.6.0. It matches the installed version. |
| Structured result | The object returned under MCP `structuredContent.result`, mirrored as formatted text for clients that use text content. |

## Public tool surface

- `starwind_init` generates v3 initialization commands for Astro, React, Vue, or Svelte. Framework override and Pro authorization are optional; Pro defaults to false.
- `starwind_add` validates styled components, primitives, and Pro blocks, then generates the correct v3 CLI namespace and flags.
- `starwind_search` returns separate styled, primitive, and Pro result groups with framework support, source metadata, and a discoverable upgrade path.
- `starwind_docs` resolves exact manifest pages before falling back to filtered aggregate documentation. With `cwd`, a Primitive or Runtime topic also returns the installed docs page.
- `starwind_migrate` generates interactive-first migration commands and review guidance for legacy Astro projects.

The surface stays intent-based. Free Pro discovery includes the catalog and setup entry point. Paid results return purchase, setup, license-key, and deferred-install guidance; update and remove remain outside the public tool list.

## Technical boundaries

- `src/server.ts` uses MCP stdio. Runtime code must never log to stdout outside protocol messages.
- `src/tools/index.ts` owns registration, output schemas, text mirroring, and structured results.
- `src/utils/starwind_manifest.ts` is the shared metadata boundary. Remote JSON must be timeout-bounded and schema-validated before caching.
- The bundled fallback should track each v3 release, but the production manifest remains authoritative.
- Pro manifest failure must not remove core Starwind UI results or silently classify an unknown block as paid.
- No tool rejects or hides Pro by framework. A known non-Astro target gets `proFrameworkWarning`, because Pro blocks are Astro components.
- Manifest validation drops unknown framework targets instead of failing, so a newer manifest keeps working.
- Existing-project Pro setup relies on the CLI's package-manager auto-detection and therefore omits `--package-manager`; generated add and migration commands may still pin the resolved manager.
- Paid block installation is deferred until Pro registry setup is detected or generated. Project inspection reports only whether configuration exists and never exposes the authorization value.
- Generated v3 CLI commands report Node.js `>=22.12.0`; this does not require the MCP package itself to drop its broader Node engine support.
- Project inspection is read-only. Tools generate commands and warnings but do not mutate user projects.

## Verification

Use `pnpm build`, `pnpm lint`, and `pnpm test:run`. The default suite is deterministic and offline. Set `RUN_LIVE_CONTRACT_TESTS=1` to verify the production v3 manifest contract intentionally.
