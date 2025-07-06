import * as fs from "fs";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { detectPackageManager, type PackageManagerInfo } from "./package_manager";

// Mock the fs and path modules
vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("path", () => ({
  resolve: vi.fn((dir: string, file: string) => `${dir}/${file}`),
}));

describe("detectPackageManager", () => {
  const mockCwd = "/mock/project";

  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("process", { cwd: () => mockCwd });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should detect pnpm when pnpm-lock.yaml exists", () => {
    // Mock the existence of pnpm-lock.yaml
    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      return filePath === `${mockCwd}/pnpm-lock.yaml`;
    });

    const result = detectPackageManager();

    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/pnpm-lock.yaml`);
    expect(result.name).toBe("pnpm");
    expect(result.installCmd).toBe("pnpm install");
    expect(result.addCmd).toBe("pnpm add");
    expect(result.removeCmd).toBe("pnpm remove");
    expect(result.runCmd).toBe("pnpm");
  });

  it("should detect yarn when yarn.lock exists", () => {
    // Mock the existence of yarn.lock
    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      return filePath === `${mockCwd}/yarn.lock`;
    });

    const result = detectPackageManager();

    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/pnpm-lock.yaml`);
    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/yarn.lock`);
    expect(result.name).toBe("yarn");
    expect(result.installCmd).toBe("yarn");
    expect(result.addCmd).toBe("yarn add");
    expect(result.removeCmd).toBe("yarn remove");
    expect(result.runCmd).toBe("yarn");
  });

  it("should detect npm when package-lock.json exists", () => {
    // Mock the existence of package-lock.json
    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      return filePath === `${mockCwd}/package-lock.json`;
    });

    const result = detectPackageManager();

    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/pnpm-lock.yaml`);
    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/yarn.lock`);
    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/package-lock.json`);
    expect(result.name).toBe("npm");
    expect(result.installCmd).toBe("npm install");
    expect(result.addCmd).toBe("npm install");
    expect(result.removeCmd).toBe("npm uninstall");
    expect(result.runCmd).toBe("npm run");
  });

  it("should respect priority order when multiple lock files exist", () => {
    // Mock the existence of multiple lock files
    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      return (
        filePath === `${mockCwd}/pnpm-lock.yaml` ||
        filePath === `${mockCwd}/yarn.lock` ||
        filePath === `${mockCwd}/package-lock.json`
      );
    });

    const result = detectPackageManager();

    // Should only check for pnpm-lock.yaml since we break after finding it
    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/pnpm-lock.yaml`);
    expect(fs.existsSync).not.toHaveBeenCalledWith(`${mockCwd}/yarn.lock`);
    expect(fs.existsSync).not.toHaveBeenCalledWith(`${mockCwd}/package-lock.json`);
    expect(result.name).toBe("pnpm");
  });

  it("should fall back to default manager when no lock files exist", () => {
    // Mock no lock files existing
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = detectPackageManager();

    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/pnpm-lock.yaml`);
    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/yarn.lock`);
    expect(fs.existsSync).toHaveBeenCalledWith(`${mockCwd}/package-lock.json`);
    expect(result.name).toBe("npm"); // Default is npm
  });

  it("should use the provided default manager if specified", () => {
    // Mock no lock files existing
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = detectPackageManager({ defaultManager: "pnpm" });

    expect(result.name).toBe("pnpm");
  });

  it("should use the provided cwd for file resolution", () => {
    const customCwd = "/custom/project/path";
    // Mock no lock files existing
    vi.mocked(fs.existsSync).mockReturnValue(false);

    detectPackageManager({ cwd: customCwd });

    expect(fs.existsSync).toHaveBeenCalledWith(`${customCwd}/pnpm-lock.yaml`);
    expect(fs.existsSync).toHaveBeenCalledWith(`${customCwd}/yarn.lock`);
    expect(fs.existsSync).toHaveBeenCalledWith(`${customCwd}/package-lock.json`);
  });
});
