import { afterEach, describe, expect, it, vi } from "vitest";

import { jsonResponse, proManifestFixture } from "../../test/starwind_manifest_fixture.js";
import { getStarwindProManifest, resetStarwindProManifestCache } from "./starwind_pro_manifest.js";

describe("Starwind Pro manifest outage behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetStarwindProManifestCache();
  });

  it("serves stale validated Pro metadata for a short retry window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(proManifestFixture))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    expect((await getStarwindProManifest()).source).toBe("network");
    vi.setSystemTime(new Date("2026-01-01T01:00:01Z"));
    expect((await getStarwindProManifest()).source).toBe("cache");
    expect((await getStarwindProManifest()).source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
