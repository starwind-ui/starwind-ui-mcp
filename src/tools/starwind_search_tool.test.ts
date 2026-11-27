import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { liveShapeAiManifestFixture } from "../../test/ai_manifest_live_shape_fixture.js";
import {
  aiManifestFixture,
  jsonResponse,
  proManifestFixture,
} from "../../test/starwind_manifest_fixture.js";
import { resetStarwindSearchToolState, starwindSearchTool } from "./starwind_search_tool.js";

function mockManifests(proValue: unknown = proManifestFixture) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes("ai-manifest")) return Promise.resolve(jsonResponse(aiManifestFixture));
    return Promise.resolve(jsonResponse(proValue));
  });
}

describe("starwindSearchTool", () => {
  beforeEach(() => {
    resetStarwindSearchToolState();
    vi.stubGlobal("fetch", mockManifests());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetStarwindSearchToolState();
  });

  it("keeps styled and primitive layers distinct", async () => {
    vi.stubGlobal("fetch", mockManifests());
    const result = await starwindSearchTool.handler({ query: "button" });
    expect(result.totalMatches).toBe(2);
    expect(result.styledComponents.results[0]).toMatchObject({
      name: "button",
      implementationTargets: ["astro", "react", "vue", "svelte"],
    });
    expect(result.primitives.results[0]).toMatchObject({ id: "button" });
    expect(result.proDiscovery).toMatchObject({
      catalogUrl: "https://pro.starwind.dev/components/",
      setupCommand: "npx starwind@latest setup --yes",
    });
  });

  it("returns Pro results for React with the Astro components warning", async () => {
    const fetchMock = mockManifests();
    vi.stubGlobal("fetch", fetchMock);
    const result = await starwindSearchTool.handler({ query: "hero", framework: "react" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.proBlocks.results.map((block: { id: string }) => block.id)).toEqual(["hero-01"]);
    expect(result.proBlocks.results[0]).toMatchObject({
      installCommand: "npx starwind@latest add @starwind-pro/hero-01 button --yes",
    });
    expect(result.proDiscovery).toBeDefined();
    expect(result.proFrameworkWarning).toContain("Astro components");
  });

  it.each(["vue", "svelte"] as const)(
    "filters styled and primitive results for %s and keeps Pro results",
    async (framework) => {
      const result = await starwindSearchTool.handler({ query: "button", framework });
      expect(result.styledComponents.results[0]).toMatchObject({
        name: "button",
        addCommand: `npx starwind@latest add button --yes --framework ${framework}`,
      });
      expect(result.primitives.results[0].adapters).toEqual([
        {
          framework,
          packageName: `@starwind-ui/${framework}`,
          importSource: `@starwind-ui/${framework}/button`,
        },
      ]);
      expect(result.proBlocks.source).toBe("network");
      // No Pro block matches "button", so no Pro warning.
      expect(result.proBlocks.results).toEqual([]);
      expect(result.proFrameworkWarning).toBeUndefined();

      const hero = await starwindSearchTool.handler({ query: "hero", framework });
      expect(hero.proFrameworkWarning).toContain("Astro components");

      const image = await starwindSearchTool.handler({ query: "image", framework });
      expect(image.styledComponents.results).toEqual([]);
    },
  );

  it("ranks a component's own name above a shared alias", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            jsonResponse(
              url.includes("ai-manifest") ? liveShapeAiManifestFixture : proManifestFixture,
            ),
          ),
        ),
    );

    const result = await starwindSearchTool.handler({ query: "item", surface: "styled" });

    expect(result.styledComponents.results[0].name).toBe("item");
  });

  it("uses the detected project framework for the Pro warning", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-search-svelte-"));
    try {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ devDependencies: { "@sveltejs/kit": "^2", svelte: "^5.29.0" } }),
      );
      const result = await starwindSearchTool.handler({ query: "hero", cwd });
      expect(result.proBlocks.results).toHaveLength(1);
      expect(result.proFrameworkWarning).toContain("Astro components");

      const astro = await starwindSearchTool.handler({ query: "hero", framework: "astro", cwd });
      expect(astro.proFrameworkWarning).toBeUndefined();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("marks free catalog blocks as requiring no paid setup", async () => {
    vi.stubGlobal("fetch", mockManifests());
    const result = await starwindSearchTool.handler({ query: "hero", framework: "astro" });
    expect(result.proBlocks.results[0]).toMatchObject({
      id: "hero-01",
      plan: "free",
      paidAuthorizationRequired: false,
      frameworkSupport: ["astro"],
    });
    expect(result.proBlocks.note).toContain("ordinary Starwind initialization");
    expect(result.proUpgrade).toBeUndefined();
    expect(result.proDiscovery).toBeDefined();
  });

  it("returns authorization setup only for paid results", async () => {
    vi.stubGlobal("fetch", mockManifests());
    const result = await starwindSearchTool.handler({ query: "pricing", plan: "pro" });
    expect(result.proBlocks.results[0]).toMatchObject({
      id: "pricing-02",
      plan: "pro",
      paidAuthorizationRequired: true,
      deferredInstallCommand:
        "npx starwind@latest add @starwind-pro/pricing-02 badge button card switch --yes",
    });
    expect(result.proBlocks.results[0].installCommand).toBeUndefined();
    expect(result.proUpgrade).toMatchObject({
      required: true,
      status: "setup-required",
      purchaseUrl: "https://pro.starwind.dev/",
      setupCommand: "npx starwind@latest setup --yes",
      licenseEnvironmentVariable: "STARWIND_LICENSE_KEY",
    });
  });

  it("recognizes existing Pro setup when returning paid results", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-search-pro-"));
    try {
      writeFileSync(join(cwd, "package.json"), JSON.stringify({ dependencies: { astro: "^6" } }));
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({
          version: 2,
          framework: "astro",
          pro: { registry: { headers: { Authorization: "Bearer ${STARWIND_LICENSE_KEY}" } } },
        }),
      );
      const result = await starwindSearchTool.handler({ query: "pricing", plan: "pro", cwd });
      expect(result.proUpgrade).toMatchObject({ required: false, status: "configured" });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("omits a malformed Pro preview URL without losing other results", async () => {
    const malformed = structuredClone(proManifestFixture);
    malformed.blocks[0].previewUrl = "https://[invalid";
    vi.stubGlobal("fetch", mockManifests(malformed));
    const result = await starwindSearchTool.handler({ query: "hero" });
    expect(result.proBlocks.results).toHaveLength(1);
    expect(result.proBlocks.results[0].previewUrl).toBeUndefined();
  });

  it("reports no additional page beyond an out-of-range offset", async () => {
    const result = await starwindSearchTool.handler({ category: "pricing", offset: 10 });
    expect(result.proBlocks.results).toEqual([]);
    expect(result.proBlocks.pagination.hasMore).toBe(false);
  });

  it("keeps core results when the Pro manifest is malformed", async () => {
    vi.stubGlobal("fetch", mockManifests({ blocks: "not-an-array" }));
    const result = await starwindSearchTool.handler({ query: "button", surface: "styled" });
    expect(result.styledComponents.results).toHaveLength(1);
    expect(result.proBlocks.source).toBe("unavailable");
  });

  it("supports plan/category filters and pagination", async () => {
    vi.stubGlobal("fetch", mockManifests());
    const result = await starwindSearchTool.handler({ category: "pricing", plan: "pro", limit: 1 });
    expect(result.proBlocks.totalMatches).toBe(1);
    expect(result.proBlocks.pagination).toEqual({ limit: 1, offset: 0, hasMore: false });
  });

  it("uses the project package manager runner in every generated command", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-search-bun-"));
    try {
      writeFileSync(join(cwd, "bun.lock"), "");
      const result = await starwindSearchTool.handler({ query: "button", cwd });
      expect(result.styledComponents.results[0].addCommand).toBe(
        "bunx starwind@latest add button --yes",
      );
      expect(result.primitives.results[0].addCommand).toBe(
        "bunx starwind@latest primitives add button --yes",
      );
      expect(result.proDiscovery.setupCommand).toBe("bunx starwind@latest setup --yes");

      const hero = await starwindSearchTool.handler({ query: "hero", cwd });
      expect(hero.proBlocks.results[0].installCommand).toBe(
        "bunx starwind@latest add @starwind-pro/hero-01 button --yes",
      );
      const pricing = await starwindSearchTool.handler({ query: "pricing", cwd });
      expect(pricing.proBlocks.results[0].deferredInstallCommand).toBe(
        "bunx starwind@latest add @starwind-pro/pricing-02 badge button card switch --yes",
      );
      expect(pricing.proUpgrade).toMatchObject({
        setupCommand: "bunx starwind@latest setup --yes",
        newProjectCommand: "bunx starwind@latest init --defaults --pro",
      });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("uses the selected framework for the Pro new-project command", async () => {
    const result = await starwindSearchTool.handler({ query: "pricing", framework: "vue" });
    expect(result.proUpgrade.newProjectCommand).toBe(
      "npx starwind@latest init --defaults --framework vue --pro",
    );
  });

  describe("project import paths", () => {
    function withProject(
      files: Record<string, string>,
      run: (cwd: string) => Promise<void>,
    ): Promise<void> {
      const cwd = mkdtempSync(join(tmpdir(), "starwind-search-import-"));
      for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(cwd, path)), { recursive: true });
        writeFileSync(join(cwd, path), content);
      }
      return run(cwd).finally(() => rmSync(cwd, { recursive: true, force: true }));
    }

    it.each([
      [
        "Nuxt",
        { "package.json": JSON.stringify({ dependencies: { nuxt: "^4", vue: "^3.5.21" } }) },
        "~/components/starwind/button",
      ],
      [
        "Nuxt with componentDir",
        {
          "package.json": JSON.stringify({ dependencies: { nuxt: "^4", vue: "^3.5.21" } }),
          "starwind.config.json": JSON.stringify({
            version: 2,
            framework: "vue",
            componentDir: "app/components/starwind",
          }),
        },
        "~/components/starwind/button",
      ],
      [
        "SvelteKit 2",
        {
          "package.json": JSON.stringify({
            devDependencies: { "@sveltejs/kit": "^2.20.0", svelte: "^5.29.0" },
          }),
        },
        "$lib/starwind/button",
      ],
      [
        "SvelteKit 3",
        {
          "package.json": JSON.stringify({
            devDependencies: { "@sveltejs/kit": "^3.0.0", svelte: "^5.29.0" },
          }),
        },
        "#lib/starwind/button/index.js",
      ],
      [
        "SvelteKit 3 from the installed version with a catalog range",
        {
          "package.json": JSON.stringify({
            devDependencies: { "@sveltejs/kit": "catalog:", svelte: "catalog:" },
          }),
          "node_modules/@sveltejs/kit/package.json": JSON.stringify({ version: "3.0.1" }),
        },
        "#lib/starwind/button/index.js",
      ],
      [
        "SvelteKit 2 from the installed version over a 3.x range",
        {
          "package.json": JSON.stringify({ devDependencies: { "@sveltejs/kit": "^3.0.0" } }),
          "node_modules/@sveltejs/kit/package.json": JSON.stringify({ version: "2.21.0" }),
        },
        "$lib/starwind/button",
      ],
      [
        "Nuxt 3 root layout keeps an app/ component folder",
        {
          "package.json": JSON.stringify({ dependencies: { nuxt: "^3.17.0", vue: "^3.5.21" } }),
          "app.vue": "<template />",
          "starwind.config.json": JSON.stringify({
            version: 2,
            framework: "vue",
            componentDir: "app/components/starwind",
          }),
        },
        "~/app/components/starwind/button",
      ],
      [
        "Nuxt 4 app layout",
        {
          "package.json": JSON.stringify({ dependencies: { nuxt: "^4.1.0", vue: "^3.5.21" } }),
          "app/app.vue": "<template />",
          "starwind.config.json": JSON.stringify({
            version: 2,
            framework: "vue",
            componentDir: "app/components/starwind",
          }),
        },
        "~/components/starwind/button",
      ],
      [
        "Quasar",
        {
          "package.json": JSON.stringify({
            dependencies: { vue: "^3.5.21" },
            devDependencies: { "@quasar/app-vite": "^2" },
          }),
        },
        "src/components/starwind/button",
      ],
      [
        "Astro with componentDirs.vue",
        {
          "package.json": JSON.stringify({ dependencies: { astro: "^5", vue: "^3.5.21" } }),
          "starwind.config.json": JSON.stringify({
            version: 2,
            framework: "astro",
            componentDir: "src/components/starwind",
            componentDirs: { vue: "src/components/starwind-vue" },
          }),
        },
        "@/components/starwind-vue/button",
      ],
    ])("adds projectImportPath for %s", async (_label, files, expected) => {
      await withProject(files, async (cwd) => {
        const framework = _label.startsWith("Astro") ? "vue" : undefined;
        const result = await starwindSearchTool.handler({
          query: "button",
          surface: "styled",
          cwd,
          framework,
        });
        expect(result.styledComponents.results[0]).toMatchObject({
          publicImportPath: "@/components/starwind/button",
          projectImportPath: expected,
        });
      });
    });

    it("omits projectImportPath without cwd or project evidence", async () => {
      const result = await starwindSearchTool.handler({ query: "button", surface: "styled" });
      expect(result.styledComponents.results[0].projectImportPath).toBeUndefined();
      await withProject({ "package.json": "{}" }, async (cwd) => {
        const empty = await starwindSearchTool.handler({ query: "button", surface: "styled", cwd });
        expect(empty.styledComponents.results[0].projectImportPath).toBeUndefined();
      });
    });
  });
});
