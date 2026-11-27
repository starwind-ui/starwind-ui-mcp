<p align="center">
  <img alt="Starwind UI MCP Server" src="https://shieldcn.dev/header/gradient.svg?title=Starwind+UI+MCP+Server&amp;subtitle=Provide+AI+all+the+tools+it+needs+to+work+with+Starwind+UI&amp;mode=dark" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@starwind-ui/mcp"><img alt="npm" src="https://shieldcn.dev/npm/@starwind-ui/mcp.svg" /></a>
  <a href="https://github.com/starwind-ui/starwind-ui-mcp"><img alt="GitHub stars" src="https://shieldcn.dev/github/starwind-ui/starwind-ui-mcp/stars.svg" /></a>
</p>

<p align="center">
  <a href="https://registry.modelcontextprotocol.io/?q=io.github.starwind-ui%2Fmcp">Official MCP Registry</a>
  ·
  <code>io.github.starwind-ui/mcp</code>
</p>

A TypeScript Model Context Protocol server for [Starwind UI v3](https://starwind.dev/) and [Starwind Pro](https://pro.starwind.dev/). It gives AI clients current guidance for Astro, React, Vue, and Svelte projects.

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

## v3 model

Starwind UI v3 has three related surfaces. The MCP keeps them distinct:

| Surface | What it represents | MCP behavior |
| --- | --- | --- |
| Styled components | Copy-owned UI components with Astro, React, Vue, and Svelte implementations | Search and install with `starwind_search` and `starwind_add` |
| Primitives | Lower-level Astro, React, Vue, and Svelte adapters, backed by Starwind Runtime where applicable | Search with `surface: "primitive"`; install with the v3 `primitives add` command |
| Runtime | Framework-neutral behavior APIs | Fetch with `starwind_docs` using the Runtime topic or surface |

The server validates these layers against the versioned [`ai-manifest.json`](https://starwind.dev/ai-manifest.json), caches validated data, and falls back to a bundled v3 snapshot if the site is unavailable. Validation drops framework targets that this version does not know, so a newer manifest still works.

## Tools

| Tool | Purpose |
| --- | --- |
| `starwind_init` | Generate v3 initialization commands for an existing Astro, React, Vue, or Svelte project. Pro is opt-in. |
| `starwind_add` | Validate requests and generate installation or deferred-install commands for styled components, primitives, or Pro blocks. |
| `starwind_search` | Search styled components, primitives, and Pro blocks with framework metadata and filters. |
| `starwind_docs` | Resolve exact component, primitive, Runtime, migration, and framework documentation. With `cwd`, it also points to the installed package docs page. |
| `starwind_migrate` | Inspect a project and generate safe, interactive-first v2-to-v3 migration guidance. |

Tool calls return both readable JSON text and MCP `structuredContent`.

## Requirements and behavior

- Generated v3 CLI commands require Node.js 22.12.0 or newer.
- `starwind_init` targets existing Astro 5+, React 18+, Vue 3.5.21+, or Svelte 5.29+ (below 6) projects. The CLI auto-detects the framework unless you supply `framework`.
- The `framework` input accepts `astro`, `react`, `vue`, or `svelte`. `starwind_search` also accepts `all`.
- Project context detects Astro (with React, Vue, or Svelte islands), Vite React, Next.js, React Router, TanStack Start, Vite Vue, Nuxt, Quasar, Laravel with Inertia Vue, Vite Svelte, and SvelteKit. It also reads `framework` and `componentDirs` from `starwind.config.json`.
- When you pass `cwd`, project context lists the docs that ship in installed `@starwind-ui/*` packages (1.6.0 and newer) under `packageDocs`. For a Primitive or Runtime topic, `starwind_docs` returns `installedDocs`, the page that matches the installed version.
- Free `@starwind-pro/*` catalog blocks work after ordinary initialization. Paid blocks require explicit authorization. Pass `pro: true` only when it is required.
- Pro search, setup, and installs work in every framework. Starwind Pro blocks are Astro components. For a React, Vue, or Svelte target, results include `proFrameworkWarning`: use an Astro host for the block, or port the block.
- Migration is interactive by default. Set `yes: true` only when backup-and-overwrite behavior is intended.
- Package-manager and project context are detected locally when possible, and add commands pass the resolved package manager to the CLI. No tool executes the generated command.
- The `packageManager` input accepts `npm`, `pnpm`, `yarn`, or `bun`. Detection checks lockfiles in the CLI order: `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `bun.lockb`, `package-lock.json`. Bun projects get `bunx starwind@latest` commands.

## Upgrading from free to Pro

The MCP keeps Pro discoverable without forcing paid setup. Search results link to the Pro catalog, free Pro blocks remain directly installable, and paid results include a structured `proUpgrade` path with purchase and installation links.

For an existing project, the MCP recommends:

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
