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
