import { afterEach, describe, expect, it, vi } from "vitest";

import { aiManifestFixture, jsonResponse } from "../../test/starwind_manifest_fixture.js";
import { getStarwindManifest, resetStarwindManifestCache } from "./starwind_manifest.js";

describe("Starwind manifest outage behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetStarwindManifestCache();
  });

  it("serves stale validated data and suppresses repeated refresh failures", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(aiManifestFixture))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse(aiManifestFixture));
    vi.stubGlobal("fetch", fetchMock);

    expect((await getStarwindManifest()).source).toBe("network");
    vi.setSystemTime(new Date("2026-01-01T01:00:01Z"));
    expect((await getStarwindManifest()).source).toBe("cache");
    expect((await getStarwindManifest()).source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date("2026-01-01T01:01:02Z"));
    expect((await getStarwindManifest()).source).toBe("network");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries shortly after a cold fallback and recovers authoritative data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse(aiManifestFixture));
    vi.stubGlobal("fetch", fetchMock);

    expect((await getStarwindManifest()).source).toBe("fallback");
    expect((await getStarwindManifest()).source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    expect((await getStarwindManifest()).source).toBe("network");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
