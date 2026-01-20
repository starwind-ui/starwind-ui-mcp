import { beforeEach, describe, expect, it } from "vitest";

import { resetDocsToolState, starwindDocsTool } from "./starwind_docs_tool";

describe("starwindDocsTool", () => {
  beforeEach(() => {
    resetDocsToolState(); // Reset cache between tests
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
      expect(starwindDocsTool.inputSchema.type).toBe("object");
      expect(starwindDocsTool.inputSchema.properties).toHaveProperty("topic");
      expect(starwindDocsTool.inputSchema.properties).toHaveProperty("full");
      expect(starwindDocsTool.inputSchema.required).toEqual([]);
    });
  });

  describe("handler - fetching from starwind.dev", () => {
    it("should fetch documentation from llms.txt", async () => {
      const result = await starwindDocsTool.handler({});

      expect(result.url).toBe("https://starwind.dev/llms.txt");
      expect(result.documentation).toBeTruthy();
      expect(result.documentation).toContain("Starwind");
      expect(result.full).toBe(false);
      expect(result.source).toMatch(/^(network|cache)$/);
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
      // First call
      const result1 = await starwindDocsTool.handler({});
      const source1 = result1.source;

      // Second call - should return from cache
      const result2 = await starwindDocsTool.handler({});
      expect(result2.source).toBe("cache");
      expect(result2.documentation).toBe(result1.documentation);
    });

    it("should include cache info in cached response", async () => {
      // First call to populate cache
      await starwindDocsTool.handler({});

      // Second call - from cache
      const result = await starwindDocsTool.handler({});
      expect(result.cacheInfo).toBeDefined();
      expect(result.cacheInfo?.age).toBeDefined();
      expect(result.cacheInfo?.remainingTtl).toBeDefined();
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
      expect(result.source).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.topic).toBeNull();
      expect(result.full).toBe(false);
      expect(result.rateLimitInfo).toBeDefined();
    });
  });
});
