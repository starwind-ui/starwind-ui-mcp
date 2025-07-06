/**
 * Configuration settings for the MCP server
 */
import dotenv from "dotenv";

dotenv.config();

interface ServerConfig {
  name: string;
  version: string;
}

interface ToolsConfig {
  baseDir: string;
  enabled: string[];
}

export interface Config {
  server: ServerConfig;
  secret?: string;
  tools: ToolsConfig;
}

const config: Config = {
  server: {
    name: "Starwind MCP Server",
    version: "0.0.1",
  },
  tools: {
    baseDir: "./tools",
    enabled: [
      "get_package_manager",
      "fetch_llm_data",
      "get_documentation",
      "init_project",
      "install_component",
      "update_component",
    ],
  },
};

export default config;
