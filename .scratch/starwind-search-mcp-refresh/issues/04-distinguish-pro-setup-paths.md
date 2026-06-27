Status: done

# Distinguish new-project and existing-project Pro setup guidance

## Parent

`.scratch/starwind-search-mcp-refresh/PRD.md`

## What to build

Update Pro setup guidance across the MCP server so it clearly separates new-project setup from existing-project setup. New projects should continue to use Pro init. Existing Starwind UI projects should be guided toward the Starwind setup command before adding Pro blocks.

This should remain guidance inside existing tools rather than a standalone setup tool.

## Acceptance criteria

- [x] New-project Pro guidance uses `starwind init --defaults --pro`.
- [x] Existing-project Pro guidance uses `starwind setup --yes` with package manager guidance when available.
- [x] Add responses include existing-project Pro setup guidance when Pro blocks are requested without new-project init.
- [x] Init responses remain focused on new project setup and mention existing-project setup only as an alternative path.
- [x] Search responses that include Pro blocks mention existing-project setup without implying users must re-run init.
- [x] No standalone setup MCP tool is added.
- [x] Tests cover Pro guidance for new project init, existing project Pro block Add, and Pro block Search results.

## Blocked by

`.scratch/starwind-search-mcp-refresh/issues/02-build-starwind-search.md`

## User stories covered

15, 16, 17, 18, 23, 24

## Comments

### Done - 2026-06-27

Implemented and verified.

- Added shared Starwind command helpers for dlx command generation, new-project Pro init commands, and existing-project Pro setup commands.
- Updated `starwind_add` to return `proSetup` guidance with both new-project and existing-project commands when Pro mode is active.
- Updated `starwind_init` to describe itself as new-project setup, while exposing existing-project Pro setup as an alternative path.
- Updated `starwind_search` to include existing-project setup guidance when returned results include Pro blocks.
- Kept setup as guidance only; no standalone setup MCP tool was added.

Checks run:

- `pnpm exec vitest run src/tools/starwind_add_tool.test.ts src/tools/starwind_init_tool.test.ts src/tools/starwind_search_tool.test.ts -t "setup"` initially failed as expected before implementation, then passed.
- `pnpm exec vitest run src/tools/starwind_add_tool.test.ts src/tools/starwind_init_tool.test.ts src/tools/starwind_search_tool.test.ts src/tools/index.test.ts`
- `pnpm exec vitest run src/tools/starwind_init_tool.test.ts`

Final verification: affected Add, Init, Search, and registration suites passed with 67 tests.

Reviewer verdict: Block initially. Reviewer found stale Init wording that still encouraged re-running init and described Init as an unconditional first step. Fixed the tool description and standard-mode response, added tests for existing-project setup guidance, and reran the affected suites. No unresolved reviewer findings remain.

Remaining risk: the old unregistered Pro-only search implementation still contains its historical wording, but it is no longer part of the public MCP tool list. Public registration and active README guidance are covered by tests and docs updates.
