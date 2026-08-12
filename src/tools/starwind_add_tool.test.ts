import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aiManifestFixture,
  jsonResponse,
  proManifestFixture,
} from "../../test/starwind_manifest_fixture.js";
import { resetAddToolState, starwindAddTool } from "./starwind_add_tool.js";

function mockManifests() {
  return vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        jsonResponse(url.includes("ai-manifest") ? aiManifestFixture : proManifestFixture),
      ),
    );
}

describe("starwindAddTool", () => {
  beforeEach(() => {
    resetAddToolState();
    vi.stubGlobal("fetch", mockManifests());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAddToolState();
  });

  it("returns a structured error for an empty component list", async () => {
    const result = await starwindAddTool.handler({ components: [] });
    expect(result).toEqual({ success: false, error: "At least one component must be specified" });
  });

  it("rejects a mixed all request before loading manifests", async () => {
    const fetchMock = mockManifests();
    vi.stubGlobal("fetch", fetchMock);
    const result = await starwindAddTool.handler({ components: ["all", "button"] });
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("by itself") });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("generates deterministic package-manager and framework flags", async () => {
    const result = await starwindAddTool.handler({
      components: ["button"],
      framework: "react",
      packageManager: "pnpm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result).toMatchObject({
      success: true,
      surface: "styled",
      framework: "react",
      componentsToInstall: ["button"],
      command: "pnpm dlx starwind@latest add button --yes --framework react --package-manager pnpm",
    });
    expect(result.availableItems).toEqual(["button", "combobox"]);
  });

  it("rejects a component without the requested implementation", async () => {
    const result = await starwindAddTool.handler({
      components: ["image"],
      framework: "react",
      packageManager: "npm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result.success).toBe(false);
    expect(result.invalidComponents).toEqual(["image"]);
  });

  it("uses the primitive namespace and destination flags", async () => {
    const result = await starwindAddTool.handler({
      components: ["combobox"],
      surface: "primitive",
      framework: "astro",
      to: "src/ui/primitives",
      overwrite: true,
      packageManager: "npm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result.command).toBe(
      "npx starwind@latest primitives add combobox --yes --framework astro --to src/ui/primitives --overwrite --package-manager npm",
    );
  });

  it.each(["../outside", "/tmp/primitives", ".", "C:/primitives"])(
    "rejects CLI-incompatible primitive destination %s",
    async (to) => {
      const result = await starwindAddTool.handler({
        components: ["button"],
        surface: "primitive",
        to,
      });
      expect(result).toEqual({ success: false, error: "Invalid primitive destination path" });
    },
  );

  it("rejects Pro blocks for a configured React project without an explicit override", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-react-add-"));
    try {
      writeFileSync(join(cwd, "package.json"), JSON.stringify({ dependencies: { react: "^19" } }));
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({ version: 2, framework: "react", components: [] }),
      );
      const result = await starwindAddTool.handler({
        components: ["@starwind-pro/hero-01"],
        cwd,
        packageManager: "npm",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("target Astro");

      const componentResult = await starwindAddTool.handler({
        components: ["image"],
        cwd,
        packageManager: "npm",
      });
      expect(componentResult.success).toBe(false);
      expect(componentResult.invalidComponents).toEqual(["image"]);

      const configuredResult = await starwindAddTool.handler({
        components: ["button"],
        cwd,
        packageManager: "npm",
      });
      expect(configuredResult.command).toContain("--framework react");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("passes a detected framework to the generated add command", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-detected-add-"));
    try {
      writeFileSync(join(cwd, "package.json"), JSON.stringify({ dependencies: { astro: "^6" } }));
      const result = await starwindAddTool.handler({
        components: ["button"],
        cwd,
        packageManager: "pnpm",
      });
      expect(result.command).toContain("--framework astro");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
  it("does not configure paid authorization for a free Pro block", async () => {
    const result = await starwindAddTool.handler({
      components: ["@starwind-pro/hero-01"],
      framework: "astro",
      init: true,
      packageManager: "pnpm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result.command).toBe(
      "pnpm dlx starwind@latest init --defaults --framework astro && pnpm dlx starwind@latest add @starwind-pro/hero-01 button --yes --framework astro --package-manager pnpm",
    );
    expect(result.proAccess).toMatchObject({
      blocks: [{ name: "@starwind-pro/hero-01", plan: "free", dependencies: ["button"] }],
      paidAuthorizationRequested: false,
    });
    expect(result.proUpgrade).toBeUndefined();
    expect(result.proDiscovery).toMatchObject({
      catalogUrl: "https://pro.starwind.dev/components/",
      setupCommand: "pnpm dlx starwind@latest setup --yes",
    });
  });

  it("returns setup first and defers a paid block install for a new project", async () => {
    const result = await starwindAddTool.handler({
      components: ["@starwind-pro/pricing-02"],
      framework: "astro",
      init: true,
      packageManager: "npm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result.command).toBe("npx starwind@latest init --defaults --framework astro --pro");
    expect(result.command).not.toContain("&&");
    expect(result.deferredCommand).toBe(
      "npx starwind@latest add @starwind-pro/pricing-02 badge button card switch --yes --framework astro --package-manager npm",
    );
    expect(result.proAccess).toMatchObject({
      blocks: [
        {
          name: "@starwind-pro/pricing-02",
          plan: "pro",
          dependencies: ["badge", "button", "card", "switch"],
        },
      ],
      paidAuthorizationRequested: false,
    });
    expect(result.proUpgrade).toMatchObject({
      required: true,
      status: "setup-required",
      purchaseUrl: "https://pro.starwind.dev/",
      setupCommand: "npx starwind@latest init --defaults --framework astro --pro",
      licenseEnvironmentVariable: "STARWIND_LICENSE_KEY",
    });
    expect(result.proUpgrade.steps).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Get a Starwind Pro license"),
        expect.stringContaining("Replace the STARWIND_LICENSE_KEY placeholder"),
        expect.stringContaining("deferred install command"),
      ]),
    );
  });

  it("uses plain setup without a package-manager override for an existing free project", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-free-to-pro-"));
    try {
      writeFileSync(join(cwd, "package.json"), JSON.stringify({ dependencies: { astro: "^6" } }));
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({ version: 2, framework: "astro", components: [] }),
      );

      const result = await starwindAddTool.handler({
        components: ["@starwind-pro/pricing-02"],
        cwd,
        packageManager: "pnpm",
      });

      expect(result.command).toBe("pnpm dlx starwind@latest setup --yes");
      expect(result.command).not.toContain("--package-manager");
      expect(result.deferredCommand).toContain("@starwind-pro/pricing-02");
      expect(result.proUpgrade).toMatchObject({
        required: true,
        setupCommand: "pnpm dlx starwind@latest setup --yes",
      });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("installs directly when Pro registry configuration is already present", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "starwind-pro-configured-"));
    try {
      writeFileSync(join(cwd, "package.json"), JSON.stringify({ dependencies: { astro: "^6" } }));
      writeFileSync(
        join(cwd, "starwind.config.json"),
        JSON.stringify({
          version: 2,
          framework: "astro",
          components: [],
          pro: {
            registry: {
              headers: { Authorization: "Bearer ${STARWIND_LICENSE_KEY}" },
            },
          },
        }),
      );

      const result = await starwindAddTool.handler({
        components: ["@starwind-pro/pricing-02"],
        cwd,
        init: true,
        packageManager: "npm",
      });

      expect(result.command).toContain("add @starwind-pro/pricing-02");
      expect((result.commands as string[])[0]).toBe("npx starwind@latest init --defaults");
      expect((result.proUpgrade as Record<string, unknown>).setupCommand).toBe(
        (result.commands as string[])[0],
      );
      expect(result.deferredCommand).toBeUndefined();
      expect(result.project).toMatchObject({ proRegistryConfigured: true });
      expect(result.proUpgrade).toMatchObject({
        required: false,
        status: "configured",
      });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects malformed Pro manifest install commands instead of reflecting them", async () => {
    const malformed = structuredClone(proManifestFixture);
    malformed.blocks[0].installCommand = "npx starwind@latest add @starwind-pro/hero-01;unsafe";
    resetAddToolState();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            jsonResponse(url.includes("ai-manifest") ? aiManifestFixture : malformed),
          ),
        ),
    );

    const result = await starwindAddTool.handler({
      components: ["@starwind-pro/hero-01"],
      framework: "astro",
      packageManager: "npm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid Pro manifest install command",
      invalidComponents: ["@starwind-pro/hero-01"],
    });
  });

  it("fails closed when the Pro manifest is unavailable", async () => {
    resetAddToolState();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          url.includes("ai-manifest")
            ? Promise.resolve(jsonResponse(aiManifestFixture))
            : Promise.reject(new Error("offline")),
        ),
    );

    const result = await starwindAddTool.handler({
      components: ["@starwind-pro/hero-01"],
      framework: "astro",
      packageManager: "npm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result).toEqual({
      success: false,
      error: "Unable to validate Pro blocks because the Pro manifest is unavailable",
      invalidComponents: ["@starwind-pro/hero-01"],
    });
  });

  it("rejects unknown Pro block IDs", async () => {
    const result = await starwindAddTool.handler({
      components: ["@starwind-pro/not-real"],
      framework: "astro",
      packageManager: "npm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result).toEqual({
      success: false,
      error: "Unknown Pro block",
      invalidComponents: ["@starwind-pro/not-real"],
    });
  });

  it.each([
    "npx starwind@latest add @starwind-pro/hero-01 @starwind-pro/other",
    "npx starwind@latest add button @starwind-pro/hero-01",
  ])("rejects unsafe or reordered canonical Pro command: %s", async (installCommand) => {
    const malformed = structuredClone(proManifestFixture);
    malformed.blocks[0].installCommand = installCommand;
    resetAddToolState();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            jsonResponse(url.includes("ai-manifest") ? aiManifestFixture : malformed),
          ),
        ),
    );

    const result = await starwindAddTool.handler({
      components: ["@starwind-pro/hero-01"],
      framework: "astro",
      packageManager: "npm",
      cwd: "/project-that-does-not-exist",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Invalid Pro manifest install command",
    });
  });
});
