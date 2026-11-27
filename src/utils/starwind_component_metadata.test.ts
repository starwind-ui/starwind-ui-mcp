import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aiManifestFixture, jsonResponse } from "../../test/starwind_manifest_fixture.js";
import {
  getStandardComponentMetadata,
  resetStandardComponentMetadataCache,
} from "./starwind_component_metadata.js";
import { getStarwindManifest } from "./starwind_manifest.js";

describe("Starwind v3 manifest metadata", () => {
  beforeEach(() => resetStandardComponentMetadataCache());

  afterEach(() => {
    vi.unstubAllGlobals();
    resetStandardComponentMetadataCache();
  });

  it("uses the versioned AI manifest and reuses a validated cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(aiManifestFixture));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getStandardComponentMetadata();
    const second = await getStandardComponentMetadata();

    expect(first.source).toBe("network");
    expect(second.source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.components.find((item) => item.slug === "button")).toMatchObject({
      implementationTargets: ["astro", "react", "vue", "svelte"],
      publicImportPath: "@/components/starwind/button",
      installCommand: "npx starwind@latest add button",
    });
  });

  it("rejects malformed remote data and falls back to the complete v3 snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ version: 1 })));

    const { manifest, source } = await getStarwindManifest();

    expect(source).toBe("fallback");
    expect(manifest.version).toBe(2);
    expect(manifest.components).toHaveLength(56);
    expect(manifest.layeredDocs.primitives).toHaveLength(37);
    expect(manifest.runtimeCli.implementationTargets).toEqual([
      "legacy-astro",
      "astro",
      "react",
      "vue",
      "svelte",
    ]);
    expect(
      manifest.components.find((item) => item.name === "chart")?.implementationTargets,
    ).toEqual(["astro", "react", "vue", "svelte"]);
    expect(
      manifest.components.find((item) => item.name === "image")?.implementationTargets,
    ).toEqual(["astro"]);
    expect(manifest.components.some((item) => item.name === "fieldset")).toBe(false);
    expect(
      manifest.layeredDocs.primitives
        .find((item) => item.id === "chart")
        ?.adapterUsage.map((usage) => usage.importSource),
    ).toEqual([
      "@starwind-ui/astro/chart",
      "@starwind-ui/react/chart",
      "@starwind-ui/vue/chart",
      "@starwind-ui/svelte/chart",
    ]);
    expect(manifest.guides.map((guide) => guide.name)).toEqual(
      expect.arrayContaining([
        "astro-vue",
        "astro-svelte",
        "vite-vue",
        "nuxt",
        "quasar",
        "laravel-inertia-vue",
        "vite-svelte",
        "sveltekit",
        "svelte",
        "rtl",
      ]),
    );
    expect(manifest.components.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "checkbox-group",
        "combobox",
        "field",
        "form",
        "navigation-menu",
        "toggle-group",
      ]),
    );
  });

  it("preserves framework restrictions from the manifest", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(aiManifestFixture)));

    const { components } = await getStandardComponentMetadata();

    expect(components.find((item) => item.slug === "image")?.implementationTargets).toEqual([
      "astro",
    ]);
  });
});
