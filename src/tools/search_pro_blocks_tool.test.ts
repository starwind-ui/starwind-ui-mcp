import { beforeEach, describe, expect, it } from "vitest";

import { resetProBlocksToolState, searchProBlocksTool } from "./search_pro_blocks_tool";

describe("searchProBlocksTool", () => {
  beforeEach(() => {
    resetProBlocksToolState();
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(searchProBlocksTool.name).toBe("search_starwind_pro_blocks");
    });

    it("should have a description", () => {
      expect(searchProBlocksTool.description).toBeTruthy();
      expect(searchProBlocksTool.description).toContain("Starwind Pro");
    });

    it("should have correct input schema", () => {
      expect(searchProBlocksTool.inputSchema.type).toBe("object");
      expect(searchProBlocksTool.inputSchema.properties).toHaveProperty("query");
      expect(searchProBlocksTool.inputSchema.properties).toHaveProperty("category");
      expect(searchProBlocksTool.inputSchema.properties).toHaveProperty("plan");
      expect(searchProBlocksTool.inputSchema.properties).toHaveProperty("limit");
    });
  });

  describe("handler - no filters", () => {
    it("should return overview with categories when no filters provided", async () => {
      const result = await searchProBlocksTool.handler({});

      expect(result.message).toContain("No search criteria");
      expect(result.availableCategories).toBeDefined();
      expect(Array.isArray(result.availableCategories)).toBe(true);
      expect(result.totalBlocks).toBeGreaterThan(0);
      expect(result.source).toMatch(/^(network|cache)$/);
    });
  });

  describe("handler - search by query", () => {
    it("should find blocks matching query", async () => {
      const result = await searchProBlocksTool.handler({ query: "hero" });

      expect(result.totalMatches).toBeGreaterThan(0);
      expect(result.blocks).toBeDefined();
      expect(Array.isArray(result.blocks)).toBe(true);

      // All returned blocks should match "hero" in some way
      const blocks = result.blocks as Array<{ name: string; description: string; categories: string[] }>;
      blocks.forEach((block) => {
        const matchesName = block.name.toLowerCase().includes("hero");
        const matchesDesc = block.description.toLowerCase().includes("hero");
        const matchesCategory = block.categories.some((c) => c.toLowerCase().includes("hero"));
        expect(matchesName || matchesDesc || matchesCategory).toBe(true);
      });
    });

    it("should return empty results for non-matching query", async () => {
      const result = await searchProBlocksTool.handler({ query: "zzzznonexistent" });

      expect(result.totalMatches).toBe(0);
      expect(result.blocks).toEqual([]);
      expect(result.message).toContain("No blocks found");
    });
  });

  describe("handler - filter by category", () => {
    it("should filter blocks by category", async () => {
      const result = await searchProBlocksTool.handler({ category: "footer" });

      expect(result.totalMatches).toBeGreaterThan(0);
      expect(result.filters).toEqual({ category: "footer", plan: null });

      const blocks = result.blocks as Array<{ categories: string[] }>;
      blocks.forEach((block) => {
        expect(block.categories.some((c) => c.toLowerCase() === "footer")).toBe(true);
      });
    });

    it("should return empty results for non-existent category", async () => {
      const result = await searchProBlocksTool.handler({ category: "zzzznonexistent" });

      expect(result.totalMatches).toBe(0);
      expect(result.blocks).toEqual([]);
    });
  });

  describe("handler - filter by plan", () => {
    it("should filter blocks by free plan", async () => {
      const result = await searchProBlocksTool.handler({ plan: "free" });

      expect(result.filters).toEqual({ category: null, plan: "free" });

      const blocks = result.blocks as Array<{ plan: string }>;
      blocks.forEach((block) => {
        expect(block.plan).toBe("free");
      });
    });

    it("should filter blocks by pro plan", async () => {
      const result = await searchProBlocksTool.handler({ plan: "pro" });

      expect(result.filters).toEqual({ category: null, plan: "pro" });

      const blocks = result.blocks as Array<{ plan: string }>;
      blocks.forEach((block) => {
        expect(block.plan).toBe("pro");
      });
    });
  });

  describe("handler - combined filters", () => {
    it("should apply query and category filter together", async () => {
      const result = await searchProBlocksTool.handler({
        query: "dark",
        category: "hero",
      });

      expect(result.query).toBe("dark");
      expect(result.filters.category).toBe("hero");

      const blocks = result.blocks as Array<{ categories: string[] }>;
      blocks.forEach((block) => {
        expect(block.categories.some((c) => c.toLowerCase() === "hero")).toBe(true);
      });
    });
  });

  describe("handler - limit", () => {
    it("should respect limit parameter", async () => {
      const result = await searchProBlocksTool.handler({
        category: "hero",
        limit: 3,
      });

      expect((result.blocks as Array<unknown>).length).toBeLessThanOrEqual(3);
    });

    it("should cap limit at 50", async () => {
      const result = await searchProBlocksTool.handler({
        plan: "pro",
        limit: 100,
      });

      expect((result.blocks as Array<unknown>).length).toBeLessThanOrEqual(50);
    });
  });

  describe("handler - response structure", () => {
    it("should include all required fields", async () => {
      const result = await searchProBlocksTool.handler({ query: "pricing" });

      expect(result.query).toBe("pricing");
      expect(result.filters).toBeDefined();
      expect(result.totalMatches).toBeDefined();
      expect(result.resultsReturned).toBeDefined();
      expect(result.blocks).toBeDefined();
      expect(result.availableCategories).toBeDefined();
      expect(result.source).toMatch(/^(network|cache)$/);
    });

    it("should include install command with --yes flag", async () => {
      const result = await searchProBlocksTool.handler({ category: "footer", limit: 1 });

      const blocks = result.blocks as Array<{ installCommand: string }>;
      if (blocks.length > 0) {
        expect(blocks[0].installCommand).toContain("--yes");
      }
    });

    it("should include full preview URL", async () => {
      const result = await searchProBlocksTool.handler({ category: "footer", limit: 1 });

      const blocks = result.blocks as Array<{ previewUrl: string }>;
      if (blocks.length > 0) {
        expect(blocks[0].previewUrl).toContain("https://pro.starwind.dev");
      }
    });
  });

  describe("handler - caching", () => {
    it("should cache results and return from cache on second call", async () => {
      // First call
      const result1 = await searchProBlocksTool.handler({ category: "hero" });

      // Second call - should return from cache
      const result2 = await searchProBlocksTool.handler({ category: "footer" });
      expect(result2.source).toBe("cache");
    });

    it("should include cache info when returning cached data", async () => {
      // First call to populate cache
      await searchProBlocksTool.handler({ query: "hero" });

      // Second call
      const result = await searchProBlocksTool.handler({ query: "footer" });

      if (result.source === "cache") {
        expect(result.cacheInfo).toBeDefined();
        const cacheInfo = result.cacheInfo as { age: string; remainingTtl: string };
        expect(cacheInfo.age).toBeDefined();
        expect(cacheInfo.remainingTtl).toBeDefined();
      }
    });
  });
});
