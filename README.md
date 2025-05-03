[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/starwind-ui-starwind-ui-mcp-badge.png)](https://mseep.ai/app/starwind-ui-starwind-ui-mcp)

# Starwind UI MCP Server

[![smithery badge](https://smithery.ai/badge/@Boston343/starwind-ui-mcp)](https://smithery.ai/server/@Boston343/starwind-ui-mcp)

A TypeScript implementation of a Model Context Protocol (MCP) server for Starwind UI, providing tools to help developers work with Starwind UI components.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build the TypeScript code
pnpm build

# Start the server
pnpm start
```

### Installing via Smithery

To install Starwind UI MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@Boston343/starwind-ui-mcp):

```bash
npx -y @smithery/cli install @Boston343/starwind-ui-mcp --client claude
```

### Setup Your IDE

Instructions to set up your IDE to use a local MCP server vary by IDE. Here is an example for Windsurf:

```json title="mcp_config.json"
{
	"mcpServers": {
		"starwind ui": {
			"command": "node",
			"args": ["c:\\path\\to\\folder\\starwind-ui-mcp\\dist\\server.js"],
			"env": {}
		}
	}
}
```

Detailed instructions:

- [Windsurf MCP Setup](https://docs.codeium.com/windsurf/mcp)
- [Cursor MCP Setup](https://docs.cursor.com/context/model-context-protocol)

## What is MCP?

The Model Context Protocol (MCP) is a protocol for extending AI capabilities through local servers. This implementation provides Starwind UI-specific tools to enhance AI assistant capabilities when working with Starwind UI. For more information about MCP itself, please visit the [official documentation](https://modelcontextprotocol.io/).

## Features

- **Tool-based Architecture** - Modular design for easy addition of new tools
- **Starwind UI Documentation Tool** - Access documentation links for Starwind UI components
- **Package Manager Detection** - Detect and use the appropriate package manager (npm, yarn, pnpm)
- **LLM Data Fetcher** - Retrieve Starwind UI information for LLMs with caching and rate limiting
- **TypeScript Implementation** - Built with TypeScript for better type safety and developer experience
- **Standard I/O Transport** - Uses stdio for communication with AI assistants

## Available Tools

| Tool Name             | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `init_project`        | Initializes a new Starwind UI project                             |
| `install_component`   | Generates installation commands for Starwind UI components        |
| `update_component`    | Generates update commands for Starwind UI components              |
| `get_documentation`   | Returns documentation links for Starwind UI components and guides |
| `fetch_llm_data`      | Fetches LLM data from starwind.dev (rate limited, with caching)   |
| `get_package_manager` | Detects and returns the current package manager information       |

## Development

This project is set up to use PNPM for package manager for development purposes. If you are not using pnpm, you will need to update the package.json file with the appropriate package manager commands you need.

## Project Structure

```
src/
  ├── config/         # Server configuration
  │   └── settings.ts # Configuration settings
  ├── tools/          # MCP tools implementations
  │   ├── index.ts    # Tool registration
  │   └── *.ts        # Individual tool implementations
  ├── utils/          # Utility functions
  └── server.ts       # Main MCP server implementation
```

## Adding New Tools

To add your own tools to the server:

1. Create a new tool file in the `src/tools/` directory
2. Register the tool in `src/tools/index.ts`
3. Enable the tool in `src/config/settings.ts`
4. Rebuild the server with `pnpm build`
5. Restart the server with `pnpm start`

## License

MIT License - See LICENSE file for details.
