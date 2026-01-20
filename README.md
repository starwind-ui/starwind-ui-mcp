# Starwind UI MCP Server

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/9878a189-46ec-462c-903f-a72276f707e3)

A TypeScript implementation of a Model Context Protocol (MCP) server for [Starwind UI](https://starwind.dev/) and [Starwind Pro](https://pro.starwind.dev/), providing tools to help developers work with Starwind UI and Pro components when leveraging AI tools like Claude, Windsurf, Cursor, and more.

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

## Available Tools

| Tool Name                    | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `starwind_init`              | Initializes a Starwind UI project (Pro by default). Use this FIRST.           |
| `starwind_docs`              | Fetches live documentation from starwind.dev with caching and topic filtering |
| `starwind_add`               | Generates validated install commands with package manager detection           |
| `search_starwind_pro_blocks` | Searches Starwind Pro blocks by query, category, or plan type                 |

## What is MCP?

The Model Context Protocol (MCP) is a protocol for extending AI capabilities through local servers. This implementation provides Starwind UI-specific tools to enhance AI assistant capabilities when working with Starwind UI. For more information about MCP itself, please visit the [official documentation](https://modelcontextprotocol.io/).

## Features

- **Live Documentation** - Fetches up-to-date docs from starwind.dev/llms.txt
- **Component Validation** - Validates components against the live component list
- **Pro Blocks Search** - Search and discover Starwind Pro blocks by query, category, or plan
- **Package Manager Detection** - Auto-detects npm, yarn, or pnpm
- **Caching & Rate Limiting** - Efficient caching with sensible rate limits
- **TypeScript** - Built with TypeScript for type safety

## License

MIT License - See LICENSE file for details.

## Security

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/starwind-ui-starwind-ui-mcp-badge.png)](https://mseep.ai/app/starwind-ui-starwind-ui-mcp)
