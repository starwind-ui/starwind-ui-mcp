import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it } from "vitest";

import config from "../config/settings.js";
import { setupTools } from "./index.js";

/**
 * Shape of a text content entry returned in a CallToolResult.
 */
interface TextContent {
  type: string;
  text: string;
}

/**
 * Spin up an in-memory MCP server (with all tools registered) linked to a
 * client over an in-process transport. This exercises the real
 * `registerTool` registration, JSON-Schema generation, and the
 * request/response round trip without any network or stdio.
 */
async function createConnectedClient(): Promise<Client> {
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  });
  setupTools(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return client;
}

describe("setupTools - MCP registration", () => {
  let client: Client;

  beforeEach(async () => {
    client = await createConnectedClient();
  });

  describe("tools/list", () => {
    it("exposes every registered tool", async () => {
      const { tools: listed } = await client.listTools();
      const names = listed.map((t) => t.name).sort();

      expect(names).toEqual(["starwind_add", "starwind_docs", "starwind_init", "starwind_search"]);
    });

    it("keeps advanced CLI wrappers out of the public MCP tool surface", async () => {
      const { tools: listed } = await client.listTools();
      const names = listed.map((t) => t.name);

      expect(names).not.toContain("search_starwind_pro_blocks");
      expect(names).not.toContain("starwind_setup");
      expect(names).not.toContain("starwind_update");
      expect(names).not.toContain("starwind_remove");
    });

    it("provides a description and JSON-Schema input for each tool", async () => {
      const { tools: listed } = await client.listTools();

      for (const tool of listed) {
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema).toHaveProperty("properties");
      }
    });

    it("derives the JSON-Schema `required` array from non-optional Zod fields", async () => {
      const { tools: listed } = await client.listTools();
      const add = listed.find((t) => t.name === "starwind_add");

      // `components` is the only required field; everything else is optional.
      expect(add?.inputSchema.required).toEqual(["components"]);
    });
  });

  describe("tools/call - success", () => {
    it("wraps the handler result in a text content block with parseable JSON", async () => {
      // starwind_init is fully offline and deterministic (no network).
      const result = await client.callTool({
        name: "starwind_init",
        arguments: { packageManager: "pnpm" },
      });

      expect(result.isError).toBeFalsy();

      const content = result.content as TextContent[];
      expect(content).toHaveLength(1);
      expect(content[0].type).toBe("text");

      const parsed = JSON.parse(content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.command).toContain("pnpm dlx");
    });
  });

  describe("tools/call - handler errors surface as isError results", () => {
    it("returns isError:true when a handler throws", async () => {
      // Empty array passes Zod validation but the handler rejects it.
      const result = await client.callTool({
        name: "starwind_add",
        arguments: { components: [] },
      });

      expect(result.isError).toBe(true);
      const content = result.content as TextContent[];
      expect(content[0].text).toContain("At least one component must be specified");
    });
  });

  describe("tools/call - Zod input validation at the protocol boundary", () => {
    it("flags an invalid enum value as an input validation error", async () => {
      const result = await client.callTool({
        name: "starwind_init",
        arguments: { packageManager: "bun" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as TextContent[];
      expect(content[0].text).toContain("Invalid arguments for tool starwind_init");
      expect(content[0].text).toContain("Invalid enum value");
    });

    it("flags a wrong-typed field as an input validation error", async () => {
      const result = await client.callTool({
        name: "starwind_init",
        arguments: { pro: "yes" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as TextContent[];
      expect(content[0].text).toContain("Invalid arguments for tool starwind_init");
      expect(content[0].text).toContain("Expected boolean, received string");
    });

    it("flags a missing required field as an input validation error", async () => {
      const result = await client.callTool({
        name: "starwind_add",
        arguments: {},
      });

      expect(result.isError).toBe(true);
      const content = result.content as TextContent[];
      expect(content[0].text).toContain("Invalid arguments for tool starwind_add");
    });
  });
});
