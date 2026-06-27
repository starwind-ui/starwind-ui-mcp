Status: done

# Keep the MCP tool surface compact around Starwind search

## Parent

`.scratch/starwind-search-mcp-refresh/PRD.md`

## What to build

Wire the new search experience into the public MCP tool list without expanding the server into a broad CLI wrapper. The public tool surface should expose `starwind_search` instead of the Pro-only search concept, and it should not add standalone setup, update, or remove tools.

Update user-facing docs and registration tests so MCP clients see a compact, intent-based tool list.

## Acceptance criteria

- [x] The MCP tool list exposes `starwind_search`.
- [x] The MCP tool list does not expose standalone setup, update, or remove tools.
- [x] The old Pro-only search concept is removed from public registration or clearly superseded without adding an extra active search tool.
- [x] README tool documentation describes `starwind_search` as searching standard components and Pro blocks.
- [x] README or tool descriptions preserve the compact-tool-surface philosophy.
- [x] MCP registration tests assert the intended tool names and exclude unnecessary CLI wrapper tools.
- [x] Existing Docs, Add, and Init tools remain available.

## Blocked by

`.scratch/starwind-search-mcp-refresh/issues/02-build-starwind-search.md`

## User stories covered

18, 19, 21, 22, 24

## Comments

### Done - 2026-06-27

Implemented and verified.

- Replaced the public MCP registration for the old Pro-only search tool with `starwind_search`.
- Added MCP registration coverage that asserts the compact public tool list and explicitly excludes setup, update, remove, and the old Pro-only search tool from public registration.
- Updated README tool documentation to describe `starwind_search` and the compact, intent-based tool surface.
- Fixed stale `starwind_init` guidance so it points users to `starwind_search` instead of the removed public `search_starwind_pro_blocks` tool.

Checks run:

- `pnpm exec vitest run src/tools/index.test.ts -t "tools/list"` initially failed as expected before registration was updated.
- `pnpm exec vitest run src/tools/index.test.ts src/tools/starwind_search_tool.test.ts`
- `pnpm exec vitest run src/tools/index.test.ts src/tools/starwind_init_tool.test.ts src/tools/starwind_search_tool.test.ts`

Final verification: registration, init, and search focused suites passed with 35 tests.

Reviewer verdict: Block initially. Reviewer found stale `search_starwind_pro_blocks` guidance in the Init tool response after the public tool was removed. Fixed the response and updated the Init test to assert `starwind_search` guidance and reject the removed tool name. No unresolved reviewer findings remain.
