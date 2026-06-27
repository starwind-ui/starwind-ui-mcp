# Starwind UI MCP Context

This repo contains the Starwind UI MCP server: a TypeScript Model Context Protocol server that exposes Starwind UI and Starwind Pro helper tools to AI-capable editors and assistants.

## Domain Glossary

| Term | Meaning |
| --- | --- |
| MCP server | The local server process that exposes Starwind UI tools over MCP stdio. The entrypoint is `src/server.ts`. |
| MCP tool | A callable capability registered on the MCP server, implemented under `src/tools/` and surfaced to MCP clients. |
| Starwind UI | The Astro and Tailwind CSS component system documented at `starwind.dev`. |
| Starwind Pro | The premium Starwind block library documented at `pro.starwind.dev`; Pro blocks require project initialization with the `--pro` flag. |
| Standard component | A regular Starwind UI component slug such as `button`, `card`, or `dialog`. |
| Pro block | A Starwind Pro block identifier, usually passed with an `@starwind-pro/` prefix. |
| Init command | The generated `starwind@latest init` command that prepares a target Astro/Tailwind project for Starwind UI. |
| Add command | The generated `starwind@latest add` command that installs standard components or Pro blocks into a target project. |
| Docs fetch | Runtime retrieval of Starwind documentation from Starwind markdown or `llms.txt` endpoints, with in-memory caching and rate limiting. |
| Package manager detection | Local detection of npm, pnpm, or yarn so generated commands match the target project. |

## Current Product Shape

The server currently exposes these primary tools:

- `starwind_init` generates initialization commands and defaults to Starwind Pro support.
- `starwind_docs` fetches current Starwind documentation by topic or from aggregate docs.
- `starwind_add` validates requested components and generates install commands.
- `search_starwind_pro_blocks` fetches and searches the Starwind Pro manifest.

## Technical Boundaries

This is a pnpm-managed TypeScript package. The source lives under `src/`, tests use Vitest, and build output goes to `dist/`.

The server uses `@modelcontextprotocol/sdk` with a stdio transport. Tools are registered centrally in `src/tools/index.ts`, and shared configuration lives in `src/config/settings.ts`.

Network calls to Starwind documentation and manifest endpoints should keep graceful fallback, caching, and rate-limit behavior in mind because MCP clients may invoke tools repeatedly.

## Development Notes

Use `pnpm test:run` for the test suite and `pnpm build` for TypeScript compilation. Add new MCP tools by creating a tool file in `src/tools/`, exporting a `ToolDefinition`-shaped object, and registering it in `src/tools/index.ts`.

Prefer the existing response style for tool handlers: return JSON-serializable objects with clear command strings, source metadata, warnings, and actionable next steps.
