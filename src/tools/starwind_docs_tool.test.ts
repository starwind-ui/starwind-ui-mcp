import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aiManifestFixture,
  jsonResponse,
  textResponse,
} from "../../test/starwind_manifest_fixture.js";
import { resetDocsToolState, starwindDocsTool } from "./starwind_docs_tool.js";

function mockDocs(pages: Record<string, string> = {}) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes("ai-manifest")) return Promise.resolve(jsonResponse(aiManifestFixture));
    return Promise.resolve(
      textResponse(pages[url] ?? "# Starwind UI\n\n## Unknown topic\nAggregate documentation."),
    );
  });
}

describe("starwindDocsTool", () => {
  beforeEach(() => resetDocsToolState());

  afterEach(() => {
    vi.unstubAllGlobals();
    resetDocsToolState();
  });

  it("resolves migration through the v3 guide manifest", async () => {
    const markdown = "# Migrating to Starwind UI v3\n\nRun the migration command.";
    vi.stubGlobal(
      "fetch",
      mockDocs({
        "https://starwind.dev/docs/getting-started/migration.md": markdown,
      }),
    );

    const result = await starwindDocsTool.handler({ topic: "migration" });

    expect(result).toMatchObject({
      resultType: "page",
      pageType: "guide",
      url: "https://starwind.dev/docs/getting-started/migration.md",
      metadataSource: "network",
      documentation: markdown,
    });
  });

  it("distinguishes a primitive page from the styled component with the same name", async () => {
    vi.stubGlobal(
      "fetch",
      mockDocs({ "https://starwind.dev/docs/primitives/button.md": "# Button Primitive" }),
    );

    const result = await starwindDocsTool.handler({ topic: "button", surface: "primitive" });

    expect(result.pageType).toBe("primitive");
    expect(result.url).toBe("https://starwind.dev/docs/primitives/button.md");
  });

  it("resolves framework aliases and Runtime documentation", async () => {
    const fetchMock = mockDocs({
      "https://starwind.dev/docs/frameworks/vite-react.md": "# Vite React",
      "https://starwind.dev/docs/runtime.md": "# Runtime",
    });
    vi.stubGlobal("fetch", fetchMock);

    const react = await starwindDocsTool.handler({ topic: "react" });
    const runtime = await starwindDocsTool.handler({ topic: "runtime" });

    expect(react.pageType).toBe("guide");
    expect(react.url).toContain("vite-react.md");
    expect(runtime.pageType).toBe("runtime");
    expect(runtime.url).toBe("https://starwind.dev/docs/runtime.md");
  });

  it("caches both the manifest and the resolved page", async () => {
    const fetchMock = mockDocs({
      "https://starwind.dev/docs/components/button.md": "# Button",
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await starwindDocsTool.handler({ topic: "button" });
    const second = await starwindDocsTool.handler({ topic: "button" });

    expect(first.documentation).toBe(second.documentation);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second.cacheInfo).not.toBeNull();
  });

  it("falls back to aggregate filtering instead of guessing an unknown component URL", async () => {
    const fetchMock = mockDocs({
      "https://starwind.dev/llms.txt": "# Docs\n\n## Custom setup\nUse your own adapter.",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await starwindDocsTool.handler({ topic: "custom setup" });

    expect(result.resultType).toBe("filtered");
    expect(result.url).toBe("https://starwind.dev/llms.txt");
    expect(result.documentation).toContain("Custom setup");
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain(
      "https://starwind.dev/docs/components/custom setup.md",
    );
  });
});
