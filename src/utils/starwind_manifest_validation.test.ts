import { afterEach, describe, expect, it, vi } from "vitest";

import { liveShapeAiManifestFixture } from "../../test/ai_manifest_live_shape_fixture.js";
import { jsonResponse } from "../../test/starwind_manifest_fixture.js";
import { getStarwindManifest, resetStarwindManifestCache } from "./starwind_manifest.js";

type MutableManifest = {
  components: { name: string; implementationTargets: string[] }[];
  layeredDocs: { primitives: { id: string; adapterUsage: Record<string, unknown>[] }[] };
};

function cloneLiveShape(): MutableManifest {
  return structuredClone(liveShapeAiManifestFixture) as MutableManifest;
}

describe("AI manifest validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetStarwindManifestCache();
  });

  it("accepts the published four-framework manifest shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(liveShapeAiManifestFixture)));

    const { manifest, source } = await getStarwindManifest();

    expect(source).toBe("network");
    expect(manifest.runtimeCli.implementationTargets).toEqual([
      "legacy-astro",
      "astro",
      "react",
      "vue",
      "svelte",
    ]);
    expect(
      manifest.components.find((item) => item.name === "button")?.implementationTargets,
    ).toEqual(["astro", "react", "vue", "svelte"]);
    expect(
      manifest.components.find((item) => item.name === "image")?.implementationTargets,
    ).toEqual(["astro"]);
    expect(
      manifest.layeredDocs.primitives
        .find((item) => item.id === "dialog")
        ?.adapterUsage.map((usage) => usage.framework),
    ).toEqual(["Astro", "React", "Vue", "Svelte"]);
    expect(manifest.guides.map((guide) => guide.name)).toEqual(
      expect.arrayContaining(["frameworks/vite-vue", "frameworks/sveltekit"]),
    );
  });

  it("ignores unknown future targets instead of falling back", async () => {
    const future = cloneLiveShape();
    future.components.find((item) => item.name === "button")?.implementationTargets.push("solid");
    future.layeredDocs.primitives
      .find((item) => item.id === "button")
      ?.adapterUsage.push({
        framework: "Solid",
        packageName: "@starwind-ui/solid",
        importSource: "@starwind-ui/solid/button",
      });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(future)));

    const { manifest, source } = await getStarwindManifest();

    expect(source).toBe("network");
    expect(
      manifest.components.find((item) => item.name === "button")?.implementationTargets,
    ).toEqual(["astro", "react", "vue", "svelte"]);
    expect(
      manifest.layeredDocs.primitives
        .find((item) => item.id === "button")
        ?.adapterUsage.map((usage) => usage.packageName),
    ).toEqual([
      "@starwind-ui/astro",
      "@starwind-ui/react",
      "@starwind-ui/vue",
      "@starwind-ui/svelte",
    ]);
  });
});
