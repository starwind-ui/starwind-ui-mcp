---
"@starwind-ui/mcp": minor
---

Add Vue and Svelte support. The `framework` input now accepts `astro`, `react`, `vue`, or `svelte`. `starwind_init` generates `--framework vue` and `--framework svelte` commands and lists the Vue 3.5.21+ and Svelte 5.29+ (below 6) requirements. Project context detects Vite Vue, Nuxt, Quasar, Laravel with Inertia Vue, Vite Svelte, SvelteKit, and Astro with React, Vue, or Svelte islands. In a detected Vue host, the init command includes `--framework vue`, so the CLI can offer the Vue upgrade when the project uses an older Vue version.

The server now accepts the current `ai-manifest.json`. Version 0.5.2 rejected it and used the bundled snapshot. Unknown framework targets in a future manifest are skipped. The bundled snapshot now includes Chart, Vue and Svelte targets, and the Vue and Svelte installation guides.

Starwind Pro works in every framework. Search, setup, and install no longer reject or hide Pro blocks in React. Pro blocks are Astro components, so results for a React, Vue, or Svelte target include `proFrameworkWarning`. The Pro new-project command uses your framework.

When you pass `cwd`, project context lists the docs that ship in installed `@starwind-ui/*` packages (1.6.0 and newer) under `packageDocs`. Packages hoisted to a workspace root are found too. `starwind_docs` accepts `cwd`. For a Primitive topic, a Runtime topic, or a styled component with a Primitive of the same name, it returns `installedDocs` with the path to the page that matches the installed version. If the website is unavailable, it returns that installed page.

With `cwd`, styled search results add `projectImportPath`, such as `~/components/starwind/button` in Nuxt or `$lib/starwind/button` in SvelteKit 2. Search commands use the project's package manager runner.

Add Bun support. The `packageManager` input accepts `bun`. A project with `bun.lock` or `bun.lockb` is detected as Bun, and generated commands use `bunx starwind@latest`.
