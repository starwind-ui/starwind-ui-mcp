import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDocsToolState, starwindDocsTool } from "./starwind_docs_tool";

describe("starwindDocsTool", () => {
  beforeEach(() => {
    resetDocsToolState(); // Reset cache between tests
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(starwindDocsTool.name).toBe("starwind_docs");
    });

    it("should have a description", () => {
      expect(starwindDocsTool.description).toBeTruthy();
      expect(starwindDocsTool.description).toContain("Starwind UI");
    });

    it("should have correct input schema", () => {
      expect(starwindDocsTool.inputSchema).toHaveProperty("topic");
      expect(starwindDocsTool.inputSchema).toHaveProperty("full");
    });
  });

  describe("handler - fetching from starwind.dev", () => {
    it("should fetch documentation from llms.txt", async () => {
      const result = await starwindDocsTool.handler({});

      expect(result.url).toBe("https://starwind.dev/llms.txt");
      expect(result.documentation).toBeTruthy();
      expect(result.documentation).toContain("Starwind");
      expect(result.full).toBe(false);
      expect(result.resultType).toBe("full");
    });

    it("should fetch full documentation from llms-full.txt", async () => {
      const result = await starwindDocsTool.handler({ full: true });

      expect(result.url).toBe("https://starwind.dev/llms-full.txt");
      expect(result.documentation).toBeTruthy();
      expect(result.full).toBe(true);
      // Full docs should be longer than standard
      expect(result.documentation.length).toBeGreaterThan(1000);
    });

    it("should contain component documentation", async () => {
      const result = await starwindDocsTool.handler({});

      // Should contain component links
      expect(result.documentation).toContain("Button");
      expect(result.documentation).toContain("Card");
      expect(result.documentation).toContain("Dialog");
    });
  });

  describe("handler - caching", () => {
    it("should cache results and return from cache on second call", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("# Starwind\n\nButton docs"),
      });
      vi.stubGlobal("fetch", fetchMock);

      // First call
      const result1 = await starwindDocsTool.handler({});
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - should return identical cached content
      const result2 = await starwindDocsTool.handler({});
      expect(result2.documentation).toBe(result1.documentation);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should include cache info in cached response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("# Starwind\n\nButton docs"),
      });
      vi.stubGlobal("fetch", fetchMock);

      // First call to populate cache
      await starwindDocsTool.handler({});
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - from cache
      const result = await starwindDocsTool.handler({});
      expect(result.cacheInfo).toBeDefined();
      expect(result.cacheInfo?.age).toBeDefined();
      expect(result.cacheInfo?.remainingTtl).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("handler - topic filtering", () => {
    it("should filter content by topic when topic is provided", async () => {
      const result = await starwindDocsTool.handler({ topic: "button" });

      expect(result.topic).toBe("button");
      expect(result.documentation).toContain("Button");
    });

    it("should return helpful message when topic not found", async () => {
      const result = await starwindDocsTool.handler({ topic: "zzzznonexistent" });

      expect(result.documentation).toContain("No documentation found for topic");
      expect(result.documentation).toContain("zzzznonexistent");
    });
  });

  describe("handler - specific page fetching", () => {
    it("should fetch specific component markdown page for known components", async () => {
      const result = await starwindDocsTool.handler({ topic: "sidebar" });

      expect(result.topic).toBe("sidebar");
      expect(result.url).toContain("/docs/components/sidebar.md");
      expect(result.pageType).toBe("component");
      expect(result.documentation).toBeTruthy();
    });

    it("should fetch specific guide page for known guides", async () => {
      const result = await starwindDocsTool.handler({ topic: "installation" });

      expect(result.topic).toBe("installation");
      expect(result.url).toContain("/docs/getting-started/installation.md");
      expect(result.pageType).toBe("guide");
    });

    it("should mark fallback component pages as components when the page fetch succeeds", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("# Color Picker\n\nComponent docs"),
        }),
      );

      const result = await starwindDocsTool.handler({ topic: "color-picker" });

      expect(result.resultType).toBe("page");
      expect(result.url).toBe("https://starwind.dev/docs/components/color-picker.md");
      expect(result.pageType).toBe("component");
    });

    it("should handle theming topic", async () => {
      const result = await starwindDocsTool.handler({ topic: "theming" });

      expect(result.topic).toBe("theming");
      // May fetch specific page or fall back to llms.txt
      expect(result.documentation).toBeTruthy();
    });

    it("should cache specific page results", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("# Button\n\nButton docs"),
      });
      vi.stubGlobal("fetch", fetchMock);

      // First call
      const first = await starwindDocsTool.handler({ topic: "button" });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - should return identical cached content
      const result = await starwindDocsTool.handler({ topic: "button" });
      expect(result.resultType).toBe("page");
      expect(result.documentation).toBe(first.documentation);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should fall back to llms.txt for unknown topics", async () => {
      const result = await starwindDocsTool.handler({ topic: "zzzznonexistent" });

      // Should fall back to llms.txt filtering
      expect(result.resultType).toBe("filtered");
      expect(result.note).toBeDefined();
      expect(result.url).toContain("llms.txt");
    });
  });

  describe("handler - response structure", () => {
    it("should include rate limit info in response", async () => {
      const result = await starwindDocsTool.handler({});

      expect(result.rateLimitInfo).toBeDefined();
      expect(result.rateLimitInfo.requestsRemaining).toBeDefined();
      expect(result.rateLimitInfo.resetAfter).toBeDefined();
    });

    it("should include all expected fields", async () => {
      const result = await starwindDocsTool.handler({});

      expect(result.documentation).toBeDefined();
      expect(result.resultType).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.topic).toBeNull();
      expect(result.full).toBe(false);
      expect(result.rateLimitInfo).toBeDefined();
    });
  });
});
