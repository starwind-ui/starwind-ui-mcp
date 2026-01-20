/**
 * Configuration settings for the MCP server
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");

export interface Config {
  server: {
    name: string;
    version: string;
  };
}

const config: Config = {
  server: {
    name: pkg.name,
    version: pkg.version,
  },
};

export default config;
