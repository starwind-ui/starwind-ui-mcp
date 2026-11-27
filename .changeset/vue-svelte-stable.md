---
"@starwind-ui/mcp": minor
---

Add Vue and Svelte support. The `framework` input now accepts `astro`, `react`, `vue`, or `svelte`. `starwind_init` generates `--framework vue` and `--framework svelte` commands and lists the Vue 3.5.21+ and Svelte 5.29+ (below 6) requirements. Project context detects Vite Vue, Nuxt, Quasar, Laravel with Inertia Vue, Vite Svelte, SvelteKit, and Astro with React, Vue, or Svelte islands.

The server now accepts the current `ai-manifest.json`. Version 0.5.2 rejected it and used the bundled snapshot. Unknown framework targets in a future manifest are skipped. The bundled snapshot now includes Chart, Vue and Svelte targets, and the Vue and Svelte installation guides.

Starwind Pro works in every framework. Search, setup, and install no longer reject or hide Pro blocks in React. Pro blocks are Astro components, so results for a React, Vue, or Svelte target include `proFrameworkWarning`.

When you pass `cwd`, project context lists the docs that ship in installed `@starwind-ui/*` packages (1.6.0 and newer) under `packageDocs`. `starwind_docs` accepts `cwd`. For a Primitive or Runtime topic, it returns `installedDocs` with the path to the page that matches the installed version.
