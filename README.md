<p align="center">
  <img alt="Starwind UI MCP Server" src="https://shieldcn.dev/header/gradient.svg?title=Starwind+UI+MCP+Server&amp;subtitle=Provide+AI+all+the+tools+it+needs+to+work+with+Starwind+UI&amp;mode=dark" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@starwind-ui/mcp"><img alt="npm" src="https://shieldcn.dev/npm/@starwind-ui/mcp.svg" /></a>
  <a href="https://github.com/starwind-ui/starwind-ui-mcp"><img alt="GitHub stars" src="https://shieldcn.dev/github/starwind-ui/starwind-ui-mcp/stars.svg" /></a>
</p>

<p align="center">
  <a href="https://registry.modelcontextprotocol.io/?search=io.github.starwind-ui%2Fmcp">Official MCP Registry</a>
  ·
  <code>io.github.starwind-ui/mcp</code>
</p>

A TypeScript Model Context Protocol server for [Starwind UI v3](https://starwind.dev/) and [Starwind Pro](https://pro.starwind.dev/). It gives AI clients current, framework-aware guidance for Astro and React projects.

## Quick start

For the maintained client setup guide, see the [Starwind UI MCP documentation](https://starwind.dev/docs/getting-started/mcp/).

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.starwind_ui]
command = "npx"
args = ["-y", "@starwind-ui/mcp"]
enabled = true
```

Claude Code (`.mcp.json`) or Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "starwind-ui": {
      "command": "npx",
      "args": ["-y", "@starwind-ui/mcp"]
    }
  }
}
```

Restart the client or reload its MCP servers after changing the configuration.

## Official MCP Registry

The server will be published under `io.github.starwind-ui/mcp`. The registry entry points to the public `@starwind-ui/mcp` npm package and uses the same `stdio` transport shown in the client configuration examples.

## v3 model

Starwind UI v3 has three related surfaces. The MCP keeps them distinct:

| Surface | What it represents | MCP behavior |
| --- | --- | --- |
| Styled components | Copy-owned UI components with Astro and/or React implementations | Search and install with `starwind_search` and `starwind_add` |
| Primitives | Lower-level Astro and React adapters, backed by Starwind Runtime where applicable | Search with `surface: "primitive"`; install with the v3 `primitives add` command |
| Runtime | Framework-neutral behavior APIs | Fetch with `starwind_docs` using the Runtime topic or surface |

The server validates these layers against the versioned [`ai-manifest.json`](https://starwind.dev/ai-manifest.json), caches validated data, and falls back to a bundled v3 snapshot if the site is unavailable.

## Tools

| Tool | Purpose |
| --- | --- |
| `starwind_init` | Generate v3 initialization commands for an existing Astro or React project. Pro is opt-in. |
| `starwind_add` | Validate requests and generate installation or deferred-install commands for styled components, primitives, or Astro-only Pro blocks. |
| `starwind_search` | Search styled components, primitives, and Pro blocks with framework metadata and filters. |
| `starwind_docs` | Resolve exact component, primitive, Runtime, migration, and framework documentation. |
| `starwind_migrate` | Inspect a project and generate safe, interactive-first v2-to-v3 migration guidance. |

Tool calls return both readable JSON text and MCP `structuredContent`.

## Requirements and behavior

- Generated v3 CLI commands require Node.js 22.12.0 or newer.
- `starwind_init` targets existing Astro 5+ or React 18+ projects and lets the CLI auto-detect the framework unless `framework` is supplied.
- Free `@starwind-pro/*` catalog blocks work after ordinary initialization. Paid blocks require explicit authorization; pass `pro: true` only when it is required.
- Starwind Pro blocks currently target Astro. React searches omit them, and React add requests reject them explicitly.
- Migration is interactive by default. Set `yes: true` only when backup-and-overwrite behavior is intended.
- Package-manager and project context are detected locally when possible, and add commands pass the resolved package manager to the CLI. No tool executes the generated command.

## Upgrading from free to Pro

The MCP keeps Pro discoverable without forcing paid setup. Search results link to the Pro catalog, free Pro blocks remain directly installable, and paid results include a structured `proUpgrade` path with purchase and installation links.

For an existing Astro project, the MCP recommends:

```bash
pnpm dlx starwind@latest setup --yes
```

The setup command auto-detects the project's package manager, so it does not need a `--package-manager` flag. It prepares the Pro registry and `.env.local`; replace the `STARWIND_LICENSE_KEY` placeholder with the purchased key, then run the returned `deferredCommand`. Treat the key as sensitive: keep `.env.local` out of source control and never expose the key in logs or client-side code. A project initialized with `pro: true` receives the equivalent `init --pro` command instead.

## Development

```bash
pnpm build
pnpm lint
pnpm test:run
```

Run the opt-in production manifest contract test with:

```bash
RUN_LIVE_CONTRACT_TESTS=1 pnpm test:run src/utils/starwind_live_contract.test.ts
```

## License

MIT. See `LICENSE`.

## Security

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/starwind-ui-starwind-ui-mcp-badge.png)](https://mseep.ai/app/starwind-ui-starwind-ui-mcp)
