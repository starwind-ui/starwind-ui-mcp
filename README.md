# Starwind UI MCP Server

[![smithery badge](https://smithery.ai/badge/@starwind-ui/starwind-ui-mcp)](https://smithery.ai/server/@starwind-ui/starwind-ui-mcp) [![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/9878a189-46ec-462c-903f-a72276f707e3)

A TypeScript implementation of a Model Context Protocol (MCP) server for [Starwind UI](https://starwind.dev/), providing tools to help developers work with Starwind UI components when leveraging AI tools like Claude, Windsurf, Cursor, and more.

## Quick Start

### Using npx

Instructions to set up your IDE to use a local MCP server vary by IDE. Here are examples for different platforms:

**Windsurf:**

```json title="mcp_config.json"
{
  "mcpServers": {
    "starwind-ui": {
      "command": "npx",
      "args": ["-y", "@starwind-ui/mcp"],
      "env": {}
    }
  }
}
```

**Cursor:**

```json title="mcp.json"
{
  "mcpServers": {
    "starwind-ui": {
      "command": "npx",
      "args": ["-y", "@starwind-ui/mcp"],
      "env": {}
    }
  }
}
```

**Claude Code:**

```json title=".mcp.json"
{
  "mcpServers": {
    "starwind-ui": {
      "command": "npx",
      "args": ["-y", "@starwind-ui/mcp"],
      "env": {}
    }
  }
}
```

Detailed instructions:

- [Windsurf MCP Setup](https://docs.windsurf.com/windsurf/cascade/mcp)
- [Cursor MCP Setup](https://docs.cursor.com/context/model-context-protocol)
- [Claude Code MCP Setup](https://docs.anthropic.com/en/docs/claude-code/mcp)

### Installing via Smithery

To install Starwind UI MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@starwind-ui/starwind-ui-mcp):

```bash
npx -y @smithery/cli install @starwind-ui/starwind-ui-mcp --client claude
```

## Available Tools

| Tool Name       | Description                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| `starwind_docs` | Fetches live documentation from starwind.dev with caching and topic filtering |
| `starwind_add`  | Generates validated install commands with package manager detection           |

## What is MCP?

The Model Context Protocol (MCP) is a protocol for extending AI capabilities through local servers. This implementation provides Starwind UI-specific tools to enhance AI assistant capabilities when working with Starwind UI. For more information about MCP itself, please visit the [official documentation](https://modelcontextprotocol.io/).

## Features

- **Live Documentation** - Fetches up-to-date docs from starwind.dev/llms.txt
- **Component Validation** - Validates components against the live component list
- **Package Manager Detection** - Auto-detects npm, yarn, or pnpm
- **Caching & Rate Limiting** - Efficient caching with sensible rate limits
- **TypeScript** - Built with TypeScript for type safety
- **Standard I/O Transport** - Uses stdio for AI assistant communication

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

## Local Development & Testing

### Testing Locally in Windsurf

1. Build the project:

   ```bash
   pnpm build
   ```

2. Update your Windsurf MCP config to point to your local build. Open your `mcp_config.json` (usually at `~/.codeium/windsurf/mcp_config.json`):

   ```json
   {
     "mcpServers": {
       "starwind-ui": {
         "command": "node",
         "args": ["C:/path/to/starwind-ui-mcp/dist/server.js"],
         "env": {}
       }
     }
   }
   ```

3. Restart Windsurf or reload MCP servers

4. Test by asking Cascade to use the Starwind tools

### Running Tests

```bash
pnpm test:run
```

### Using Changesets

Create a changeset when making changes:

```bash
pnpm changeset
```

## Adding New Tools

1. Create a new tool file in `src/tools/`
2. Register the tool in `src/tools/index.ts`
3. Rebuild with `pnpm build`

## License

MIT License - See LICENSE file for details.

## Security

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/starwind-ui-starwind-ui-mcp-badge.png)](https://mseep.ai/app/starwind-ui-starwind-ui-mcp)
