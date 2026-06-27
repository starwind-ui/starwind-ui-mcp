import { describe, expect, it } from "vitest";

import { starwindInitTool } from "./starwind_init_tool.js";

describe("starwindInitTool", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(starwindInitTool.name).toBe("starwind_init");
    });

    it("should describe init as new-project setup with existing-project setup guidance", () => {
      expect(starwindInitTool.description).toContain("Pro");
      expect(starwindInitTool.description).toContain("new Starwind UI project");
      expect(starwindInitTool.description).toContain("already initialized");
      expect(starwindInitTool.description).toContain("starwind setup --yes");
      expect(starwindInitTool.description).not.toContain("ALWAYS");
      expect(starwindInitTool.description).not.toContain("FIRST");
    });

    it("should have correct input schema", () => {
      expect(starwindInitTool.inputSchema).toBeDefined();
      expect(starwindInitTool.inputSchema).toHaveProperty("cwd");
      expect(starwindInitTool.inputSchema).toHaveProperty("packageManager");
      expect(starwindInitTool.inputSchema).toHaveProperty("pro");
    });

    it("should default to Pro setup when pro is omitted", async () => {
      const result = await starwindInitTool.handler({});
      expect(result.proEnabled).toBe(true);
    });
  });

  describe("handler - Pro mode (default)", () => {
    it("should default to Pro setup when no args provided", async () => {
      const result = await starwindInitTool.handler({});

      expect(result.success).toBe(true);
      expect(result.proEnabled).toBe(true);
      expect(result.setupType).toBe("Starwind Pro");
      expect(result.command).toContain("--pro");
      expect(result.command).toContain("--defaults");
    });

    it("should use Pro setup when pro=true", async () => {
      const result = await starwindInitTool.handler({ pro: true });

      expect(result.proEnabled).toBe(true);
      expect(result.command).toContain("--pro");
    });

    it("should include description about Pro capabilities", async () => {
      const result = await starwindInitTool.handler({});

      expect(result.description).toContain("Pro");
      expect(result.description).toContain("standard components");
      expect(result.description).toContain("Pro blocks");
    });

    it("should include next steps for Pro setup", async () => {
      const result = await starwindInitTool.handler({});

      const nextSteps = result.nextSteps as string[];
      expect(nextSteps).toContain(
        "Or use starwind_search to find components and Pro blocks like heroes, footers, etc.",
      );
      expect(nextSteps.join("\n")).not.toContain("search_starwind_pro_blocks");
    });

    it("should distinguish new-project init from existing-project Pro setup", async () => {
      const result = await starwindInitTool.handler({ packageManager: "pnpm" });

      expect(result.command).toBe("pnpm dlx starwind@latest init --defaults --pro");
      expect(result.proSetup).toEqual({
        newProjectCommand: "pnpm dlx starwind@latest init --defaults --pro",
        existingProjectCommand: "pnpm dlx starwind@latest setup --yes --package-manager pnpm",
        note: "Use init for a new project. For an already initialized Starwind UI project, run setup once before adding Pro blocks.",
      });
    });
  });

  describe("handler - Standard mode (opt-out)", () => {
    it("should use Standard setup when pro=false", async () => {
      const result = await starwindInitTool.handler({ pro: false });

      expect(result.success).toBe(true);
      expect(result.proEnabled).toBe(false);
      expect(result.setupType).toBe("Starwind Standard");
      expect(result.command).not.toContain("--pro");
      expect(result.command).toContain("--defaults");
    });

    it("should warn about Pro blocks not working in standard mode", async () => {
      const result = await starwindInitTool.handler({ pro: false });

      const nextSteps = result.nextSteps as string[];
      expect(nextSteps).toContain("Note: Pro blocks will NOT work with this setup");
    });

    it("should point standard-mode users to setup for existing projects instead of re-running init", async () => {
      const result = await starwindInitTool.handler({ packageManager: "pnpm", pro: false });
      const serialized = JSON.stringify(result);

      expect(result.proSetup).toEqual({
        newProjectCommand: "pnpm dlx starwind@latest init --defaults --pro",
        existingProjectCommand: "pnpm dlx starwind@latest setup --yes --package-manager pnpm",
        note: "To use Pro blocks later, use init --pro for a new project or setup for an already initialized Starwind UI project.",
      });
      expect(serialized).toContain("starwind@latest setup --yes");
      expect(serialized).not.toContain("re-run init");
      expect(serialized).not.toContain("Re-run init");
    });
  });

  describe("handler - package manager", () => {
    it("should use pnpm dlx by default (from lock file)", async () => {
      const result = await starwindInitTool.handler({});

      expect(result.packageManager).toBe("pnpm");
      expect(result.command).toContain("pnpm dlx");
    });

    it("should use specified package manager", async () => {
      const result = await starwindInitTool.handler({ packageManager: "yarn" });

      expect(result.packageManager).toBe("yarn");
      expect(result.command).toContain("yarn dlx");
    });

    it("should use npx for npm", async () => {
      const result = await starwindInitTool.handler({ packageManager: "npm" });

      expect(result.packageManager).toBe("npm");
      expect(result.command).toContain("npx");
    });
  });

  describe("handler - response structure", () => {
    it("should include all required fields", async () => {
      const result = await starwindInitTool.handler({});

      expect(result.success).toBe(true);
      expect(result.command).toBeDefined();
      expect(result.packageManager).toBeDefined();
      expect(result.proEnabled).toBeDefined();
      expect(result.setupType).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.nextSteps).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(result.cliFlags).toBeDefined();
    });

    it("should include requirements info", async () => {
      const result = await starwindInitTool.handler({});

      const requirements = result.requirements as { framework: string; styling: string };
      expect(requirements.framework).toBe("Astro");
      expect(requirements.styling).toBe("Tailwind CSS v4");
    });

    it("should include CLI flags documentation", async () => {
      const result = await starwindInitTool.handler({});

      const cliFlags = result.cliFlags as Record<string, string>;
      expect(cliFlags["--defaults"]).toBeDefined();
      expect(cliFlags["--pro"]).toBeDefined();
    });
  });
});
