# @starwind-ui/mcp

## 0.6.0

### Minor Changes

- 0baae49: Add Vue and Svelte support. The `framework` input now accepts `astro`, `react`, `vue`, or `svelte`. `starwind_init` generates `--framework vue` and `--framework svelte` commands and lists the Vue 3.5.21+ and Svelte 5.29+ (below 6) requirements. Project context detects Vite Vue, Nuxt, Quasar, Laravel with Inertia Vue, Vite Svelte, SvelteKit, and Astro with React, Vue, or Svelte islands. In a detected Vue host, the init command includes `--framework vue`, so the CLI can offer the Vue upgrade when the project uses an older Vue version.

  The server now accepts the current `ai-manifest.json`. Version 0.5.2 rejected it and used the bundled snapshot. Unknown framework targets in a future manifest are skipped. The bundled snapshot now includes Chart, Vue and Svelte targets, and the Vue and Svelte installation guides.

  Starwind Pro works in every framework. Search, setup, and install no longer reject or hide Pro blocks in React. Pro blocks are Astro components, so results for a React, Vue, or Svelte target include `proFrameworkWarning`. The Pro new-project command uses your framework.

  When you pass `cwd`, project context lists the docs that ship in installed `@starwind-ui/*` packages (1.6.0 and newer) under `packageDocs`. Packages hoisted to a workspace root are found too. `starwind_docs` accepts `cwd`. For a Primitive topic, a Runtime topic, or a styled component with a Primitive of the same name, it returns `installedDocs` with the path to the page that matches the installed version. If the website is unavailable, it returns that installed page.

  With `cwd`, styled search results add `projectImportPath`, such as `~/components/starwind/button` in Nuxt or `$lib/starwind/button` in SvelteKit 2. Search commands use the project's package manager runner.

  Add Bun support. The `packageManager` input accepts `bun`. A project with `bun.lock` or `bun.lockb` is detected as Bun, and generated commands use `bunx starwind@latest`. In a workspace member, detection uses the nearest lockfile or `packageManager` field in a parent folder.

## 0.5.2

### Patch Changes

- Update the MCP SDK to 1.32.1 to include upstream security fixes. Refresh runtime dependencies and development tools to current compatible releases.

## 0.5.1

### Patch Changes

- 729b22c: Add official MCP Registry ownership metadata and improve npm discovery metadata.

## 0.5.0

### Minor Changes

- 68196af: Update the MCP server for Starwind UI v3 with versioned manifest metadata, Astro and React targeting, styled and primitive layers, safe migration guidance, project-context detection, structured MCP results, and a guided free-to-Pro upgrade path with opt-in paid setup.

## 0.4.0

### Minor Changes

- ee82cca: Add the unified `starwind_search` tool for standard components and Starwind Pro blocks, refresh component metadata fallback behavior, and clarify Pro setup guidance for new versus existing Starwind UI projects.

### Patch Changes

- 4f2d048: feat: update documentation links to the new standard `.md` implementation
- 94ed2bc: refactor: update MCP implementation to the new `McpServer` API

## 0.3.1

### Patch Changes

- 9be88d1: Cleanup README by removing unused smithery references

## 0.3.0

### Minor Changes

- ecc5995: feat: completely revamp mcp server with only four tools - `starwind_init`, `starwind_add`, `starwind_docs`, and `search_starwind_pro_blocks` - resulting in a far more capable and understandable experience
