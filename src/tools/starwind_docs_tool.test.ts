import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { liveShapeAiManifestFixture } from "../../test/ai_manifest_live_shape_fixture.js";
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
      full: false,
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

  it("resolves a valid explicit component fallback without marking full requested", async () => {
    const url = "https://starwind.dev/docs/components/custom-widget.md";
    const fetchMock = mockDocs({ [url]: "# Custom Widget" });
    vi.stubGlobal("fetch", fetchMock);

    const result = await starwindDocsTool.handler({ topic: "custom-widget", surface: "component" });

    expect(result).toMatchObject({ resultType: "page", pageType: "component", url, full: false });
  });

  it("rejects unsafe explicit-page slugs and uses the aggregate fallback", async () => {
    const fetchMock = mockDocs();
    vi.stubGlobal("fetch", fetchMock);

    const result = await starwindDocsTool.handler({ topic: "../../secret", surface: "component" });

    expect(result.resultType).toBe("filtered");
    expect(result.url).toBe("https://starwind.dev/llms.txt");
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain(
      "https://starwind.dev/docs/components/../../secret.md",
    );
  });

  it("preserves the rate-limit error instead of reporting a fetch failure", async () => {
    vi.stubGlobal("fetch", mockDocs());

    for (let index = 0; index < 10; index += 1) {
      await starwindDocsTool.handler({
        topic: `custom-${index}`,
        surface: "component",
      });
    }

    await expect(
      starwindDocsTool.handler({ topic: "custom-over-limit", surface: "component" }),
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("resolves Vue and Svelte guide topics", async () => {
    vi.stubGlobal(
      "fetch",
      mockDocs({ "https://starwind.dev/docs/frameworks/vite-vue.md": "# Vite Vue" }),
    );

    const vue = await starwindDocsTool.handler({ topic: "vue" });

    expect(vue).toMatchObject({ pageType: "guide", documentation: "# Vite Vue" });
  });

  it("resolves framework topics to guides with the published manifest shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.includes("ai-manifest")
              ? jsonResponse(liveShapeAiManifestFixture)
              : textResponse(`# ${url}`),
          ),
        ),
    );

    const react = await starwindDocsTool.handler({ topic: "react" });
    const vue = await starwindDocsTool.handler({ topic: "vue" });
    const svelte = await starwindDocsTool.handler({ topic: "svelte" });
    const button = await starwindDocsTool.handler({ topic: "button" });

    expect(react).toMatchObject({ pageType: "guide", metadataSource: "network" });
    expect(react.url).toBe("https://starwind.dev/docs/frameworks/vite-react.md");
    expect(vue.url).toBe("https://starwind.dev/docs/frameworks/vite-vue.md");
    expect(svelte.url).toBe("https://starwind.dev/docs/getting-started/svelte.md");
    expect(button).toMatchObject({ pageType: "component" });
  });

  describe("installed package docs", () => {
    let cwd: string;

    function addPackage(name: string, version: string, pages: string[]) {
      const dir = join(cwd, "node_modules", "@starwind-ui", name);
      mkdirSync(join(dir, "docs"), { recursive: true });
      writeFileSync(join(dir, "package.json"), JSON.stringify({ version }));
      writeFileSync(join(dir, "docs", "llms.txt"), `# ${name}`);
      for (const page of pages) {
        mkdirSync(join(dir, "docs", page, ".."), { recursive: true });
        writeFileSync(join(dir, "docs", page), `# ${page}`);
      }
      return join(dir, "docs");
    }

    beforeEach(() => {
      cwd = mkdtempSync(join(tmpdir(), "starwind-docs-installed-"));
      vi.stubGlobal("fetch", mockDocs());
    });
    afterEach(() => rmSync(cwd, { recursive: true, force: true }));

    it("points a Primitive topic to the project framework's installed page", async () => {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ dependencies: { "@sveltejs/kit": "^2", svelte: "^5.29.0" } }),
      );
      addPackage("react", "1.6.0", ["primitives/button.md"]);
      const svelteDocs = addPackage("svelte", "1.6.0", ["primitives/button.md"]);

      const result = await starwindDocsTool.handler({
        topic: "button",
        surface: "primitive",
        cwd,
      });

      expect(result.pageType).toBe("primitive");
      expect(result.installedDocs).toMatchObject({
        path: join(svelteDocs, "primitives", "button.md"),
        packageName: "@starwind-ui/svelte",
        packageVersion: "1.6.0",
      });
      expect(result.installedDocs?.note).toContain("@starwind-ui/svelte@1.6.0");
    });

    it("falls back to the Runtime controller page for a Primitive topic", async () => {
      const runtimeDocs = addPackage("runtime", "1.6.0", ["controllers/combobox.md", "README.md"]);

      const result = await starwindDocsTool.handler({
        topic: "combobox",
        surface: "primitive",
        cwd,
      });

      expect(result.installedDocs?.path).toBe(join(runtimeDocs, "controllers", "combobox.md"));
    });

    it("points Runtime topics to the installed Runtime docs", async () => {
      const runtimeDocs = addPackage("runtime", "1.6.0", ["controllers/button.md", "README.md"]);

      const overview = await starwindDocsTool.handler({ topic: "runtime", cwd });
      const controller = await starwindDocsTool.handler({
        topic: "button",
        surface: "runtime",
        cwd,
      });

      expect(overview.installedDocs?.path).toBe(join(runtimeDocs, "README.md"));
      expect(controller.pageType).toBe("runtime");
      expect(controller.installedDocs?.path).toBe(join(runtimeDocs, "controllers", "button.md"));
    });

    it("omits installedDocs without cwd, for styled components, and before 1.6.0", async () => {
      addPackage("astro", "1.6.0", ["primitives/button.md"]);
      const legacy = join(cwd, "node_modules", "@starwind-ui", "react");
      mkdirSync(legacy, { recursive: true });

      const withoutCwd = await starwindDocsTool.handler({ topic: "button", surface: "primitive" });
      const styled = await starwindDocsTool.handler({ topic: "button", surface: "component", cwd });

      expect(withoutCwd.installedDocs).toBeUndefined();
      expect(styled.installedDocs).toBeUndefined();

      rmSync(join(cwd, "node_modules", "@starwind-ui", "astro"), { recursive: true, force: true });
      const noDocs = await starwindDocsTool.handler({ topic: "button", surface: "primitive", cwd });
      expect(noDocs.installedDocs).toBeUndefined();
    });
  });
});
