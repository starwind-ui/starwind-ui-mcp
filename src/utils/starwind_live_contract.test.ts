import { describe, expect, it } from "vitest";

import { getStarwindManifest, resetStarwindManifestCache } from "./starwind_manifest.js";
import { getStarwindProManifest, resetStarwindProManifestCache } from "./starwind_pro_manifest.js";

const liveDescribe = process.env.RUN_LIVE_CONTRACT_TESTS === "1" ? describe : describe.skip;

liveDescribe("starwind.dev v3 live contract", () => {
  it("publishes the expected versioned layered manifest", async () => {
    resetStarwindManifestCache();
    const { manifest, source } = await getStarwindManifest();

    expect(source).toBe("network");
    expect(manifest.version).toBe(2);
    expect(manifest.runtimeCli.configVersion).toBe(2);
    expect(manifest.components.length).toBeGreaterThanOrEqual(55);
    expect(manifest.layeredDocs.primitives.length).toBeGreaterThanOrEqual(36);
    expect(manifest.guides.some((guide) => guide.name.includes("migration"))).toBe(true);
  });

  it("publishes plan and dependency metadata for the Pro catalog", async () => {
    resetStarwindProManifestCache();
    const { manifest, source } = await getStarwindProManifest();

    expect(source).toBe("network");
    expect(manifest.totalBlocks).toBeGreaterThanOrEqual(234);
    expect(manifest.blocks.some((block) => block.plan === "free")).toBe(true);
    expect(manifest.blocks.some((block) => block.plan === "pro")).toBe(true);
    expect(
      manifest.blocks.some((block) => block.installCommand.trim().split(/\s+/).length > 4),
    ).toBe(true);
  });
});
