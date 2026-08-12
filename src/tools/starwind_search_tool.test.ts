import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => resetStarwindSearchToolState());
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
      implementationTargets: ["astro", "react"],
    });
    expect(result.primitives.results[0]).toMatchObject({ id: "button" });
    expect(result.proDiscovery).toMatchObject({
      catalogUrl: "https://pro.starwind.dev/components/",
      setupCommand: "npx starwind@latest setup --yes",
    });
  });

  it("does not query Astro-only Pro metadata for React", async () => {
    const fetchMock = mockManifests();
    vi.stubGlobal("fetch", fetchMock);
    const result = await starwindSearchTool.handler({ query: "image", framework: "react" });
    expect(result.totalMatches).toBe(0);
    expect(result.proBlocks.note).toContain("target Astro");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
});
