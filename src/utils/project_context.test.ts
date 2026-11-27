import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { inspectStarwindProject } from "./project_context.js";

const VITE_SVELTE_CONFIG = [
  'import { svelte as sveltePlugin } from "@sveltejs/vite-plugin-svelte";',
  'import { defineConfig } from "vite";',
  "export default defineConfig({ plugins: [sveltePlugin()] });",
].join("\n");

describe("inspectStarwindProject", () => {
  it("recognizes Astro config files even when the dependency signal is unavailable", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-context-"));
    try {
      writeFileSync(join(cwd, "astro.config.mjs"), "export default {};");
      expect(inspectStarwindProject(cwd).detectedFramework).toBe("astro");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("detects Pro registry configuration without returning credentials", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-pro-"));
    try {
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({
          version: 2,
          framework: "astro",
          pro: {
            registry: {
              headers: { Authorization: "Bearer ${STARWIND_LICENSE_KEY}" },
            },
          },
        }),
      );

      const context = inspectStarwindProject(cwd);
      expect(context.proRegistryConfigured).toBe(true);
      expect(JSON.stringify(context)).not.toContain("Bearer");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("does not treat valid non-object JSON as project configuration", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-invalid-json-shape-"));
    try {
      writeFileSync(join(cwd, "package.json"), "[]");
      writeFileSync(join(cwd, "starwind.config.json"), '"text"');
      const context = inspectStarwindProject(cwd);
      expect(context.packageJsonFound).toBe(false);
      expect(context.starwindConfigFound).toBe(false);
      expect(context.configVersion).toBeNull();
      expect(context.configVersionInvalid).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  describe("host detection", () => {
    function withProject(
      packageJson: Record<string, unknown>,
      files: string[],
      run: (cwd: string) => void,
    ) {
      const cwd = mkdtempSync(join(tmpdir(), "starwind-project-host-"));
      try {
        writeFileSync(join(cwd, "package.json"), JSON.stringify(packageJson));
        for (const file of files) writeFileSync(join(cwd, file), "");
        run(cwd);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }

    it.each([
      [
        { dependencies: { vue: "^3.5.21" }, devDependencies: { "@vitejs/plugin-vue": "^6" } },
        [],
        "vue",
        "vite-vue",
      ],
      [{ dependencies: { nuxt: "^4", vue: "^3.5.21" } }, [], "vue", "nuxt"],
      [{ dependencies: { vue: "^3.5.21", quasar: "^2" } }, ["quasar.config.ts"], "vue", "quasar"],
      [
        { devDependencies: { "@quasar/app-vite": "^2" }, dependencies: { vue: "^3.5.21" } },
        [],
        "vue",
        "quasar",
      ],
      [
        {
          dependencies: { vue: "^3.5.21", "@inertiajs/vue3": "^2" },
          devDependencies: { "laravel-vite-plugin": "^2" },
        },
        ["artisan"],
        "vue",
        "laravel-inertia-vue",
      ],
      [
        { devDependencies: { "@sveltejs/kit": "^2", svelte: "^5.29.0", vite: "^7" } },
        [],
        "svelte",
        "sveltekit",
      ],
      [
        {
          devDependencies: { svelte: "^5.29.0", "@sveltejs/vite-plugin-svelte": "^6", vite: "^7" },
        },
        [],
        "svelte",
        "vite-svelte",
      ],
      [{ dependencies: { react: "^19", next: "^16" } }, [], "react", "nextjs"],
      [
        { dependencies: { react: "^19" }, devDependencies: { "@react-router/dev": "^7" } },
        [],
        "react",
        "react-router",
      ],
      [
        { dependencies: { react: "^19", "@tanstack/react-start": "^1" } },
        [],
        "react",
        "tanstack-start",
      ],
      [{ dependencies: { react: "^19", "react-dom": "^19" } }, [], "react", "vite-react"],
    ])("detects %j as %s on %s", (packageJson, files, framework, host) => {
      withProject(packageJson, files, (cwd) => {
        const context = inspectStarwindProject(cwd);
        expect(context.detectedFramework).toBe(framework);
        expect(context.detectedHost).toBe(host);
        expect(context.astroIslandFrameworks).toEqual([]);
      });
    });

    it("keeps a React host when a stray Vue or Svelte dependency is present", () => {
      withProject(
        { dependencies: { react: "^19", "react-dom": "^19", vue: "^3.5.21", svelte: "^5.29.0" } },
        [],
        (cwd) => {
          const context = inspectStarwindProject(cwd);
          expect(context.detectedFramework).toBe("react");
          expect(context.detectedHost).toBe("vite-react");
        },
      );
    });

    it("prefers a Svelte host over a Vue host, as the CLI does", () => {
      withProject(
        {
          dependencies: { vue: "^3.5.21", svelte: "^5.29.0" },
          devDependencies: { "@vitejs/plugin-vue": "^6", "@sveltejs/vite-plugin-svelte": "^6" },
        },
        [],
        (cwd) => expect(inspectStarwindProject(cwd).detectedFramework).toBe("svelte"),
      );
    });

    it("reads peer and optional dependencies", () => {
      withProject({ peerDependencies: { nuxt: "^4" } }, [], (cwd) =>
        expect(inspectStarwindProject(cwd).detectedHost).toBe("nuxt"),
      );
    });

    it("reports Astro with Vue and Svelte islands", () => {
      withProject(
        {
          dependencies: {
            astro: "^5",
            "@astrojs/vue": "^5",
            vue: "^3.5.21",
            "@astrojs/svelte": "^7",
            svelte: "^5.29.0",
          },
        },
        [],
        (cwd) => {
          const context = inspectStarwindProject(cwd);
          expect(context.detectedFramework).toBe("astro");
          expect(context.detectedHost).toBe("astro");
          expect(context.astroIslandFrameworks).toEqual(["vue", "svelte"]);
        },
      );
    });
  });

  it.each(["astro", "react", "vue", "svelte"])(
    "reads framework %s and componentDirs from starwind.config.json",
    (framework) => {
      const cwd = mkdtempSync(join(tmpdir(), "starwind-project-config-"));
      try {
        writeFileSync(
          join(cwd, "starwind.config.json"),
          JSON.stringify({
            version: 2,
            framework,
            componentDir: "src/components/starwind",
            componentDirs: { vue: "src/components/starwind-vue", solid: "src/solid", react: 4 },
          }),
        );
        const context = inspectStarwindProject(cwd);
        expect(context.configuredFramework).toBe(framework);
        expect(context.componentDirs).toEqual({ vue: "src/components/starwind-vue" });
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );

  it("ignores an unknown configured framework", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-config-unknown-"));
    try {
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({ version: 2, framework: "solid" }),
      );
      expect(inspectStarwindProject(cwd).configuredFramework).toBeNull();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("returns installed package docs paths only when asked", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-package-docs-"));
    try {
      const vueDir = join(cwd, "node_modules", "@starwind-ui", "vue");
      mkdirSync(join(vueDir, "docs"), { recursive: true });
      writeFileSync(join(vueDir, "package.json"), JSON.stringify({ version: "1.6.0" }));
      writeFileSync(join(vueDir, "docs", "llms.txt"), "# Vue docs");
      writeFileSync(join(vueDir, "docs", "README.md"), "# Vue");
      // A package before 1.6.0 has no docs folder and is left out.
      const reactDir = join(cwd, "node_modules", "@starwind-ui", "react");
      mkdirSync(reactDir, { recursive: true });
      writeFileSync(join(reactDir, "package.json"), JSON.stringify({ version: "1.5.0" }));

      expect(inspectStarwindProject(cwd).packageDocs).toEqual([]);
      expect(inspectStarwindProject(cwd, { packageDocs: true }).packageDocs).toEqual([
        {
          packageName: "@starwind-ui/vue",
          packageVersion: "1.6.0",
          docsDir: join(vueDir, "docs"),
          llmsTxt: join(vueDir, "docs", "llms.txt"),
          readme: join(vueDir, "docs", "README.md"),
        },
      ]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("finds package docs hoisted to a parent workspace node_modules", () => {
    const root = mkdtempSync(join(tmpdir(), "starwind-project-hoisted-"));
    try {
      const svelteDir = join(root, "node_modules", "@starwind-ui", "svelte");
      mkdirSync(join(svelteDir, "docs"), { recursive: true });
      writeFileSync(join(svelteDir, "package.json"), JSON.stringify({ version: "1.6.0" }));
      writeFileSync(join(svelteDir, "docs", "llms.txt"), "# Svelte docs");
      const app = join(root, "apps", "web");
      mkdirSync(app, { recursive: true });

      expect(inspectStarwindProject(app, { packageDocs: true }).packageDocs).toEqual([
        {
          packageName: "@starwind-ui/svelte",
          packageVersion: "1.6.0",
          docsDir: join(svelteDir, "docs"),
          llmsTxt: join(svelteDir, "docs", "llms.txt"),
          readme: null,
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("prefers the nearest node_modules over a hoisted copy", () => {
    const root = mkdtempSync(join(tmpdir(), "starwind-project-nearest-"));
    try {
      const app = join(root, "apps", "web");
      for (const [base, version] of [
        [root, "1.6.0"],
        [app, "1.6.1"],
      ] as const) {
        const dir = join(base, "node_modules", "@starwind-ui", "runtime");
        mkdirSync(join(dir, "docs"), { recursive: true });
        writeFileSync(join(dir, "package.json"), JSON.stringify({ version }));
        writeFileSync(join(dir, "docs", "llms.txt"), "# Runtime docs");
      }
      expect(inspectStarwindProject(app, { packageDocs: true }).packageDocs[0].packageVersion).toBe(
        "1.6.1",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps a Next.js app that declares Svelte for a widget as React", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-next-svelte-"));
    try {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({
          dependencies: { next: "^16", react: "^19", "react-dom": "^19" },
          devDependencies: {
            svelte: "^5.29.0",
            "@sveltejs/vite-plugin-svelte": "^6",
            vite: "^7",
          },
        }),
      );
      writeFileSync(join(cwd, "vite.config.ts"), "");
      const context = inspectStarwindProject(cwd);
      expect(context.detectedFramework).toBe("react");
      expect(context.detectedHost).toBe("nextjs");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("detects a complete Vite Svelte host even when React is declared", () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-project-vite-svelte-"));
    try {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({
          dependencies: { react: "^19", svelte: "^5.29.0" },
          devDependencies: { "@sveltejs/vite-plugin-svelte": "^6", vite: "^7" },
        }),
      );
      mkdirSync(join(cwd, "src"));
      for (const file of ["src/main.ts", "src/App.svelte"]) writeFileSync(join(cwd, file), "");
      writeFileSync(join(cwd, "vite.config.ts"), VITE_SVELTE_CONFIG);
      expect(inspectStarwindProject(cwd)).toMatchObject({
        detectedFramework: "svelte",
        detectedHost: "vite-svelte",
      });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  describe("CLI Svelte host checks", () => {
    function viteSvelteProject(svelte: string, config: string, run: (cwd: string) => void) {
      const cwd = mkdtempSync(join(tmpdir(), "starwind-project-svelte-check-"));
      try {
        writeFileSync(
          join(cwd, "package.json"),
          JSON.stringify({
            dependencies: { next: "^16", react: "^19" },
            devDependencies: { svelte, "@sveltejs/vite-plugin-svelte": "^6", vite: "^7" },
          }),
        );
        mkdirSync(join(cwd, "src"));
        for (const file of ["src/main.ts", "src/App.svelte"]) writeFileSync(join(cwd, file), "");
        writeFileSync(join(cwd, "vite.config.ts"), config);
        run(cwd);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }

    it("keeps React when the Vite config does not call the official Svelte plugin", () => {
      viteSvelteProject(
        "^5.29.0",
        'import { defineConfig } from "vite";\nexport default defineConfig({ plugins: [] });',
        (cwd) => expect(inspectStarwindProject(cwd).detectedFramework).toBe("react"),
      );
    });

    it.each(["^5.28.0", "^4.2.0", ">=5.29.0", "catalog:", "workspace:*"])(
      "keeps React when the Svelte range %s is outside >=5.29.0 <6",
      (range) => {
        viteSvelteProject(range, VITE_SVELTE_CONFIG, (cwd) =>
          expect(inspectStarwindProject(cwd).detectedFramework).toBe("react"),
        );
      },
    );

    it.each(["^5.29.0", "~5.30.1", "5.31.2", ">=5.29.0 <6"])(
      "accepts the supported Svelte range %s",
      (range) => {
        viteSvelteProject(range, VITE_SVELTE_CONFIG, (cwd) =>
          expect(inspectStarwindProject(cwd).detectedHost).toBe("vite-svelte"),
        );
      },
    );

    it("requires the sveltekit plugin for a SvelteKit host", () => {
      const cwd = mkdtempSync(join(tmpdir(), "starwind-project-kit-check-"));
      try {
        writeFileSync(
          join(cwd, "package.json"),
          JSON.stringify({
            dependencies: { react: "^19" },
            devDependencies: { "@sveltejs/kit": "^2", svelte: "^5.29.0", vite: "^7" },
          }),
        );
        mkdirSync(join(cwd, "src", "routes"), { recursive: true });
        writeFileSync(join(cwd, "src", "app.html"), "");
        writeFileSync(join(cwd, "vite.config.ts"), "export default {};");
        expect(inspectStarwindProject(cwd).detectedFramework).toBe("react");

        writeFileSync(
          join(cwd, "vite.config.ts"),
          'import { sveltekit } from "@sveltejs/kit/vite";\nexport default { plugins: [sveltekit()] };',
        );
        expect(inspectStarwindProject(cwd).detectedHost).toBe("sveltekit");
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });
  });
});
