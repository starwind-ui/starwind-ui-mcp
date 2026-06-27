Status: done

# Refresh standard component metadata and fallbacks

## Parent

`.scratch/starwind-search-mcp-refresh/PRD.md`

## What to build

Create a reliable standard component metadata path that both Add and Search can rely on. The behavior should prefer live Starwind documentation data, cache it as appropriate, and fall back to a refreshed list of current installable standard component slugs when live data cannot be fetched.

The fallback should avoid recommending documentation-only patterns as installable components unless live Starwind data reports them as components. The completed slice should make failed-network component validation and search behavior deterministic and current.

## Acceptance criteria

- [x] Standard component metadata can be fetched from current Starwind documentation data and includes component slugs plus documentation URLs.
- [x] Fallback metadata is refreshed to match current installable standard components as closely as possible.
- [x] Fallback metadata removes or handles stale entries that are not installable standard components.
- [x] Add behavior continues to validate standard components using live data when available.
- [x] Add behavior falls back to refreshed metadata when live docs cannot be fetched.
- [x] Tests cover live metadata parsing and failed-network fallback behavior.

## Blocked by

None - can start immediately

## User stories covered

2, 5, 12, 13, 14, 20

## Comments

### Done - 2026-06-27

Implemented and verified.

- Added a shared standard component metadata provider that parses installable components from Starwind `llms.txt`, caches successful live metadata, and falls back to a refreshed current slug list.
- Updated `starwind_add` to validate against the shared metadata provider while preserving its existing response fields.
- Refreshed fallback coverage for newer installable components including `color-picker`, `input-group`, `native-select`, and `kbd`, and excluded the documented `combobox` Select pattern from installable fallbacks.
- Added tests for normal multi-line parsing, compact production-style parsing, failed-network fallback behavior, metadata caching, and `starwind_add` fallback/network validation.

Checks run:

- `pnpm exec vitest run src/utils/starwind_component_metadata.test.ts`
- `pnpm exec vitest run src/tools/starwind_add_tool.test.ts -t "refreshed fallback"`
- `pnpm exec vitest run src/utils/starwind_component_metadata.test.ts src/tools/starwind_add_tool.test.ts`

Final verification: `src/utils/starwind_component_metadata.test.ts` and `src/tools/starwind_add_tool.test.ts` passed with 32 tests.

Reviewer verdict: Block initially. Reviewer found the parser was too line-oriented for compact `llms.txt` content and could silently fall back. Fixed by parsing the installable-components section as text with a global component-link matcher, then added compact-shape tests and an Add live-metadata test. No unresolved reviewer findings remain.
