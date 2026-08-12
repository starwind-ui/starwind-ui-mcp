import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import config from "../config/settings.js";
import { setupTools } from "./index.js";

async function createConnectedClient(): Promise<Client> {
  const server = new McpServer({ name: config.server.name, version: config.server.version });
  setupTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("v3 MCP registration", () => {
  it("registers the five focused public tools with input and output schemas", async () => {
    const client = await createConnectedClient();
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "starwind_add",
      "starwind_docs",
      "starwind_init",
      "starwind_migrate",
      "starwind_search",
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.outputSchema?.type).toBe("object");
      expect(tool.outputSchema?.properties).toHaveProperty("result");
    }
  });

  it("returns matching human-readable and structured tool results", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const client = await createConnectedClient();
    const response = await client.callTool({
      name: "starwind_init",
      arguments: {
        cwd: "/project-that-does-not-exist",
        packageManager: "pnpm",
        framework: "react",
      },
    });
    log.mockRestore();

    expect(response.isError).toBeFalsy();
    const content = response.content[0];
    expect(content.type).toBe("text");
    if (content.type !== "text") throw new Error("Expected text MCP content");
    const parsed = JSON.parse(content.text);
    expect(parsed.command).toContain("--framework react");
    expect(response.structuredContent).toEqual({ result: parsed });
    expect(log).not.toHaveBeenCalled();
  });

  it("keeps validation errors at the protocol boundary", async () => {
    const client = await createConnectedClient();
    const response = await client.callTool({
      name: "starwind_add",
      arguments: { components: [] },
    });

    expect(response.isError).toBe(true);
    expect(JSON.stringify(response.content)).toContain("At least one component");
  });
});
