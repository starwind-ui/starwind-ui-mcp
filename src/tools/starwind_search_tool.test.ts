import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetStarwindSearchToolState, starwindSearchTool } from "./starwind_search_tool.js";

const LLMS_TXT = `# Starwind UI - AI Reference Guide

## Installable Components and Documentation

Starwind UI currently includes the following installable components:

- [Button](https://starwind.dev/docs/components/button)
- [Card](https://starwind.dev/docs/components/card)
- [Native Select](https://starwind.dev/docs/components/native-select)

## Documented Select Patterns

- Combobox: Select plus \`SelectSearch\` pattern documented at https://starwind.dev/docs/components/combobox. Install with \`starwind add select\`; there is no separate \`combobox\` install target.
`;

function createManifest(blockCount = 4) {
  const baseBlocks = [
    {
      id: "hero-01",
      name: "Hero 1",
      description: "Landing hero with a button CTA",
      categories: ["hero"],
      keywords: ["hero", "button", "landing"],
      plan: "free",
      installCommand: "npx starwind@latest add @starwind-pro/hero-01 button",
      previewUrl: "/components/hero-01",
    },
    {
      id: "pricing-01",
      name: "Pricing 1",
      description: "Pricing section",
      categories: ["pricing"],
      keywords: ["pricing"],
      plan: "pro",
      installCommand: "npx starwind@latest add @starwind-pro/pricing-01 card",
      previewUrl: "/components/pricing-01",
    },
    {
      id: "footer-01",
      name: "Footer 1",
      description: "Footer section",
      categories: ["footer"],
      keywords: ["footer"],
      plan: "free",
      installCommand: "npx starwind@latest add @starwind-pro/footer-01",
      previewUrl: "/components/footer-01",
    },
    {
      id: "hero-02",
      name: "Hero 2",
      description: "Premium hero",
      categories: ["hero"],
      keywords: ["hero"],
      plan: "pro",
      installCommand: "npx starwind@latest add @starwind-pro/hero-02",
      previewUrl: "/components/hero-02",
    },
  ];

  const blocks =
    blockCount <= baseBlocks.length
      ? baseBlocks.slice(0, blockCount)
      : Array.from({ length: blockCount }, (_, index) => ({
          id: `hero-${String(index + 1).padStart(2, "0")}`,
          name: `Hero ${index + 1}`,
          description: `Hero section ${index + 1}`,
          categories: ["hero"],
          keywords: ["hero"],
          plan: index % 2 === 0 ? "free" : "pro",
          installCommand: `npx starwind@latest add @starwind-pro/hero-${String(index + 1).padStart(
            2,
            "0",
          )}`,
          previewUrl: `/components/hero-${String(index + 1).padStart(2, "0")}`,
        }));

  return {
    $schema: "https://pro.starwind.dev/schema.json",
    name: "Starwind Pro",
    version: "1.0.0",
    generatedAt: "2026-06-27T00:00:00.000Z",
    baseUrl: "https://pro.starwind.dev",
    totalBlocks: blocks.length,
    categories: ["hero", "pricing", "footer"],
    blocks,
  };
}

function mockFetch(manifest = createManifest()) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url === "https://starwind.dev/llms.txt") {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(LLMS_TXT),
        });
      }

      if (url === "https://pro.starwind.dev/r/manifest.json") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(manifest),
        });
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }),
  );
}

describe("starwindSearchTool", () => {
  beforeEach(() => {
    resetStarwindSearchToolState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("tool definition", () => {
    it("should expose the CLI-shaped search input schema", () => {
      expect(starwindSearchTool.name).toBe("starwind_search");
      expect(starwindSearchTool.inputSchema).toHaveProperty("query");
      expect(starwindSearchTool.inputSchema).toHaveProperty("plan");
      expect(starwindSearchTool.inputSchema).toHaveProperty("category");
      expect(starwindSearchTool.inputSchema).toHaveProperty("limit");
      expect(starwindSearchTool.inputSchema).toHaveProperty("offset");
    });
  });

  describe("handler", () => {
    it("should return standard component matches with docs and add command hints", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({ query: "native" });

      expect(result.standardComponents.totalMatches).toBe(1);
      expect(result.standardComponents.results).toEqual([
        {
          slug: "native-select",
          name: "Native Select",
          docsUrl: "https://starwind.dev/docs/components/native-select",
          markdownUrl: "https://starwind.dev/docs/components/native-select.md",
          addCommand: "npx starwind@latest add native-select --yes",
        },
      ]);
      expect(result.standardComponents.source).toBe("network");
    });

    it("should return Pro block matches with preview URLs and add commands", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({ query: "pricing" });

      expect(result.proBlocks.totalMatches).toBe(1);
      expect(result.proBlocks.results[0]).toMatchObject({
        id: "pricing-01",
        name: "Pricing 1",
        categories: ["pricing"],
        plan: "pro",
        installCommand: "npx starwind@latest add @starwind-pro/pricing-01 card --yes",
        previewUrl: "https://pro.starwind.dev/components/pricing-01",
      });
      expect(result.proBlocks.source).toBe("network");
    });

    it("should include existing-project setup guidance when Pro blocks are returned", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({ query: "hero" });

      expect(result.proSetup).toEqual({
        newProjectCommand: "npx starwind@latest init --defaults --pro",
        existingProjectCommand: "npx starwind@latest setup --yes",
        note: "For a new project, initialize with --pro. For an already initialized Starwind UI project, run setup once before adding Pro blocks.",
      });
      expect(JSON.stringify(result.proSetup)).not.toContain("Re-run init");
    });

    it("should not duplicate --yes when a Pro block install command already includes it", async () => {
      const manifest = createManifest(1);
      manifest.blocks[0].installCommand =
        "npx starwind@latest add @starwind-pro/hero-01 button --yes";
      mockFetch(manifest);

      const result = await starwindSearchTool.handler({ query: "hero" });

      expect(result.proBlocks.results[0].installCommand).toBe(
        "npx starwind@latest add @starwind-pro/hero-01 button --yes",
      );
    });

    it("should return grouped standard component and Pro block matches for the same query", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({ query: "button" });

      expect(result.standardComponents.results.map((component) => component.slug)).toEqual([
        "button",
      ]);
      expect(result.proBlocks.results.map((block) => block.id)).toEqual(["hero-01"]);
      expect(result.totalMatches).toBe(2);
    });

    it("should filter Pro blocks by plan and category", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({
        category: "Hero",
        plan: "pro",
      });

      expect(result.standardComponents.results).toEqual([]);
      expect(result.proBlocks.totalMatches).toBe(1);
      expect(result.proBlocks.results.map((block) => block.id)).toEqual(["hero-02"]);
      expect(result.filters).toEqual({ category: "Hero", plan: "pro" });
    });

    it("should support queryless Pro pagination when filters are present", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({
        category: "hero",
        limit: 1,
        offset: 1,
      });

      expect(result.proBlocks.results.map((block) => block.id)).toEqual(["hero-02"]);
      expect(result.proBlocks.pagination).toEqual({
        limit: 1,
        offset: 1,
        hasMore: false,
      });
    });

    it("should use a default Pro block limit of 20 and support offset", async () => {
      mockFetch(createManifest(25));

      const firstPage = await starwindSearchTool.handler({ query: "hero" });
      const secondWindow = await starwindSearchTool.handler({
        query: "hero",
        offset: 5,
        limit: 3,
      });

      expect(firstPage.proBlocks.results).toHaveLength(20);
      expect(firstPage.proBlocks.pagination).toEqual({
        limit: 20,
        offset: 0,
        hasMore: true,
      });
      expect(secondWindow.proBlocks.results.map((block) => block.id)).toEqual([
        "hero-06",
        "hero-07",
        "hero-08",
      ]);
      expect(secondWindow.proBlocks.pagination).toEqual({
        limit: 3,
        offset: 5,
        hasMore: true,
      });
    });

    it("should return helpful no-result metadata without throwing", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({ query: "zzzznonexistent" });

      expect(result.totalMatches).toBe(0);
      expect(result.standardComponents.results).toEqual([]);
      expect(result.proBlocks.results).toEqual([]);
      expect(result.message).toContain("No Starwind components or Pro blocks found");
    });

    it("should return a helpful overview for an empty search", async () => {
      mockFetch();

      const result = await starwindSearchTool.handler({});

      expect(result.message).toContain("Provide a query");
      expect(result.standardComponents.totalAvailable).toBe(3);
      expect(result.proBlocks.totalAvailable).toBe(4);
      expect(result.proBlocks.availableCategories).toEqual(["hero", "pricing", "footer"]);
      expect(result.standardComponents.results).toEqual([]);
      expect(result.proBlocks.results).toEqual([]);
    });
  });
});
