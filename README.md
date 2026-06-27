<p align="center">
  <img alt="Starwind UI MCP Server" src="https://shieldcn.dev/header/gradient.svg?title=Starwind+UI+MCP+Server&amp;subtitle=Provide+AI+all+the+tools+it+needs+to+work+with+Starwind+UI&amp;mode=dark" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@starwind-ui/mcp"><img alt="badge" src="https://shieldcn.dev/npm/@starwind-ui/mcp.svg" /></a>
  <a href="https://github.com/starwind-ui/starwind-ui-mcp"><img alt="badge" src="https://shieldcn.dev/github/starwind-ui/starwind-ui-mcp/stars.svg" /></a>
  <a href="https://x.com/boston343builds"><img alt="follow" src="https://shieldcn.dev/x/follow/boston343builds.svg?split=true" /></a>
</p>

A TypeScript implementation of a Model Context Protocol (MCP) server for [Starwind UI](https://starwind.dev/) and [Starwind Pro](https://pro.starwind.dev/), providing tools to help developers work with Starwind UI and Pro components when leveraging AI tools like Codex, Claude Code, and Cursor.

## Quick Start

Select your MCP client and add the Starwind UI server configuration. For the full maintained setup guide, see the [Starwind UI MCP Server docs](https://starwind.dev/docs/getting-started/mcp/).

**Codex:**

```toml title="~/.codex/config.toml"
[mcp_servers.starwind_ui]
command = "npx"
args = ["-y", "@starwind-ui/mcp"]
enabled = true
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

**Cursor:**

```json title=".cursor/mcp.json"
{
  "mcpServers": {
    "starwind-ui": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@starwind-ui/mcp"],
      "env": {}
    }
  }
}
```

After adding the configuration, restart your editor or reload its MCP servers.

Detailed client instructions:

- [Starwind UI MCP Server docs](https://starwind.dev/docs/getting-started/mcp/)
- [Codex MCP docs](https://developers.openai.com/codex/mcp)
- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)
- [Cursor MCP docs](https://cursor.com/docs/mcp)

## Available Tools

| Tool Name         | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `starwind_init`   | Generates init commands for new Starwind UI projects, Pro by default            |
| `starwind_docs`   | Fetches live documentation from starwind.dev with caching and topic filtering   |
| `starwind_add`    | Generates validated install commands with package manager detection             |
| `starwind_search` | Searches Starwind UI components and Starwind Pro blocks with CLI-shaped filters |

The MCP server intentionally keeps a compact, intent-based tool surface. It does not expose standalone wrappers for every Starwind CLI command, such as setup, update, or remove.

## Starwind Pro Setup

Use `starwind_init` for new projects. For new projects that need Pro blocks, the generated command uses:

```bash
starwind@latest init --defaults --pro
```

For an already initialized Starwind UI project, use the Pro setup guidance returned by `starwind_add` or `starwind_search`:

```bash
starwind@latest setup --yes
```

`starwind_search` returns grouped standard component and Pro block results, with Pro block filters for `plan`, `category`, `limit`, and `offset`.

## What is MCP?

The Model Context Protocol (MCP) is a protocol for extending AI capabilities through local servers. This implementation provides Starwind UI-specific tools to enhance AI assistant capabilities when working with Starwind UI. For more information about MCP itself, please visit the [official documentation](https://modelcontextprotocol.io/).

## Features

- **Live Documentation** - Fetches up-to-date docs from starwind.dev/llms.txt
- **Component Validation** - Validates components against live component metadata with a refreshed fallback list
- **Starwind Search** - Search and discover standard components and Pro blocks by query, category, plan, limit, or offset
- **Compact Tool Surface** - Keeps uncommon or destructive CLI operations as command guidance instead of standalone MCP tools
- **Package Manager Detection** - Auto-detects npm, yarn, or pnpm
- **Caching & Rate Limiting** - Efficient caching with sensible rate limits
- **TypeScript** - Built with TypeScript for type safety

## License

MIT License - See LICENSE file for details.

## Security

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/starwind-ui-starwind-ui-mcp-badge.png)](https://mseep.ai/app/starwind-ui-starwind-ui-mcp)
