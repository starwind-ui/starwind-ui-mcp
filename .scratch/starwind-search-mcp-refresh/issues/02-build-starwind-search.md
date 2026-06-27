Status: done

# Build the CLI-shaped Starwind search tool

## Parent

`.scratch/starwind-search-mcp-refresh/PRD.md`

## What to build

Build the `starwind_search` MCP tool as the main search experience. It should search standard components and Pro blocks in one call, with a CLI-shaped input contract: query, plan, category, limit, and offset.

The result should be structured for MCP clients, not terminal output. Standard component matches and Pro block matches should be grouped separately, with counts, source metadata, commands or documentation references, and pagination metadata where relevant.

## Acceptance criteria

- [x] `starwind_search` accepts an optional query string.
- [x] `starwind_search` accepts Pro block `plan` and `category` filters.
- [x] `starwind_search` uses a default limit of 20 for Pro block results.
- [x] `starwind_search` supports offset for Pro block pagination.
- [x] Standard component results include component slugs, display names when available, documentation URLs, and Add command hints.
- [x] Pro block results include block identifiers, names, descriptions, categories, plan, preview URLs, and Add commands.
- [x] Results are grouped by standard components and Pro blocks.
- [x] Empty searches return helpful overview or no-result metadata without throwing.
- [x] Tests cover standard component-only matches, Pro block-only matches, mixed matches, plan filtering, category filtering, limit, offset, and no-result behavior.

## Blocked by

`.scratch/starwind-search-mcp-refresh/issues/01-refresh-component-metadata.md`

## User stories covered

1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20

## Comments

### Done - 2026-06-27

Implemented and verified.

- Added the `starwind_search` tool implementation with CLI-shaped inputs: query, Pro block plan/category filters, limit, and offset.
- Returned grouped standard component and Pro block results with counts, source metadata, Add command hints, documentation URLs, preview URLs, and pagination metadata.
- Used the shared standard component metadata provider from issue 01 for component search.
- Preserved manifest-driven Pro block scoring and added default Pro block limit 20 with max 50.
- Kept empty no-filter calls lightweight by returning overview metadata instead of dumping Pro block results.

Checks run:

- `pnpm exec vitest run src/tools/starwind_search_tool.test.ts`
- `pnpm exec vitest run src/utils/starwind_component_metadata.test.ts src/tools/starwind_search_tool.test.ts`

Final verification: `src/tools/starwind_search_tool.test.ts` passed with 10 tests.

Reviewer verdict: Looks reasonable in scoped review. Reviewer suggested additional tests for existing `--yes` install commands, case-insensitive category filtering, and queryless filtered pagination. Added those tests and reran the focused search suite successfully. No unresolved reviewer findings remain.
