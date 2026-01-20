import { describe, it, expect } from "vitest";
import { starwindInitTool } from "./starwind_init_tool.js";

describe("starwindInitTool", () => {
  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(starwindInitTool.name).toBe("starwind_init");
    });

    it("should have a description mentioning Pro default", () => {
      expect(starwindInitTool.description).toContain("Pro");
      expect(starwindInitTool.description).toContain("FIRST");
    });

    it("should have correct input schema", () => {
      expect(starwindInitTool.inputSchema).toBeDefined();
      expect(starwindInitTool.inputSchema.properties).toHaveProperty("cwd");
      expect(starwindInitTool.inputSchema.properties).toHaveProperty("packageManager");
      expect(starwindInitTool.inputSchema.properties).toHaveProperty("pro");
    });

    it("should have pro default to true in schema", () => {
      const proSchema = starwindInitTool.inputSchema.properties.pro as { default: boolean };
      expect(proSchema.default).toBe(true);
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
        "Or use search_starwind_pro_blocks to find Pro blocks like heroes, footers, etc.",
      );
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
