Status: done

# PRD: Starwind Search MCP Refresh

## Problem Statement

The Starwind UI MCP server currently exposes a small, understandable set of MCP tools, which is a product strength. However, its search and Pro setup guidance have drifted from the current Starwind CLI capabilities. The existing Pro block search tool only searches Starwind Pro blocks, while the CLI search command searches both standard components and Pro blocks with pagination-like controls. The server also sometimes points users toward `init --pro` when the more accurate guidance for an already-initialized Starwind UI project is to run `starwind setup`.

The user wants the MCP server to stay compact and agent-friendly. They do not want a large set of thin wrapper tools for every CLI command, especially destructive or rarely needed commands such as update and remove. The goal is to improve the quality of the existing MCP surface without adding unnecessary context weight for AI clients.

## Solution

Refresh the MCP server around a compact, intent-based tool surface:

- Keep setup focused on `starwind_init` for new project setup.
- Keep installation focused on `starwind_add`.
- Keep documentation lookup focused on `starwind_docs`.
- Replace or supersede the Pro-only search experience with a `starwind_search` MCP tool that mirrors the current CLI search command closely enough for agents: standard components plus Pro blocks, query search, Pro block plan/category filters, default limit of 20, and offset support for Pro block pagination.

Do not add standalone `starwind_setup`, `starwind_update`, or `starwind_remove` MCP tools as part of this PRD. Instead, expose existing-project Pro setup as guidance returned by the relevant tools when the user is working with Pro blocks. Advanced CLI operations can be reconsidered later only if users repeatedly ask for them.

Refresh fallback standard component metadata so offline or failed-network behavior remains accurate. Distinguish clearly between new-project Pro setup and existing-project Pro setup in tool responses.

## User Stories

1. As an AI assistant using the MCP server, I want one search tool for Starwind components and Pro blocks, so that I do not need to reason about multiple search surfaces.
2. As an AI assistant using the MCP server, I want standard components to appear in search results, so that I can discover installable components without separately fetching all documentation.
3. As an AI assistant using the MCP server, I want Pro blocks to appear in search results, so that I can recommend complete Starwind Pro sections when appropriate.
4. As an AI assistant using the MCP server, I want Pro block results to preserve install commands, so that I can hand the user a runnable Add command.
5. As an AI assistant using the MCP server, I want standard component results to include documentation references, so that I can inspect the component before recommending it.
6. As an AI assistant using the MCP server, I want search to support free/pro plan filtering for Pro blocks, so that I can respect the user's access constraints.
7. As an AI assistant using the MCP server, I want search to support category filtering for Pro blocks, so that I can narrow results to areas such as hero, pricing, footer, or testimonial.
8. As an AI assistant using the MCP server, I want search to default to a CLI-aligned limit, so that results are useful without being noisy.
9. As an AI assistant using the MCP server, I want offset support for Pro block results, so that I can page through larger result sets.
10. As an AI assistant using the MCP server, I want result counts and pagination metadata, so that I know whether more Pro block results are available.
11. As an AI assistant using the MCP server, I want search results grouped by standard components and Pro blocks, so that I can understand what kind of Add command is required.
12. As an AI assistant using the MCP server, I want network result source metadata, so that I can tell whether results came from live Starwind data, cache, or fallback data.
13. As an AI assistant using the MCP server, I want accurate fallback standard component metadata, so that search and add remain useful when live docs cannot be fetched.
14. As an AI assistant using the MCP server, I want stale fallback entries removed or treated carefully, so that I do not recommend invalid component installs.
15. As an AI assistant using the MCP server, I want Pro setup guidance to distinguish new projects from existing projects, so that I do not tell users to re-run init unnecessarily.
16. As an AI assistant using the MCP server, I want `starwind_add` to return existing-project Pro setup guidance when Pro blocks are requested, so that I can help users configure Pro correctly before adding blocks.
17. As an AI assistant using the MCP server, I want `starwind_init` to remain focused on new project setup, so that the setup path stays obvious.
18. As an AI assistant using the MCP server, I want the MCP server to avoid standalone update and remove tools, so that destructive or uncommon operations do not clutter the model context.
19. As an AI assistant using the MCP server, I want the public tool list to remain small, so that clients receive fewer tool descriptions and make better choices.
20. As a maintainer, I want tests at the MCP tool boundary, so that future Starwind CLI changes do not silently regress the server behavior.
21. As a maintainer, I want the README to match the new tool surface, so that users understand the intended workflow.
22. As a maintainer, I want the old Pro-only search concept retired or clearly superseded, so that the codebase does not carry duplicate search behavior.
23. As a Starwind user, I want the MCP server to recommend setup commands that match my project state, so that I can avoid accidental reconfiguration.
24. As a Starwind user, I want the MCP server to stay compact despite CLI growth, so that AI clients remain helpful rather than over-tooled.

## Implementation Decisions

- Introduce a `starwind_search` MCP tool as the main search experience.
- The search tool should cover both standard components and Pro blocks.
- The search tool should mirror the current CLI search shape where it matters for MCP use: query, plan, category, limit, and offset.
- The search tool does not need a `json` option because MCP responses are already structured.
- Search results should be grouped by result type instead of flattening all matches into one ambiguous list.
- The default search limit should align with the CLI default of 20.
- Offset applies to Pro block pagination. Standard component results are small enough to return directly after filtering.
- The Pro block search behavior should keep the useful scoring and manifest-driven metadata from the current Pro block search implementation.
- Standard component search should derive live component metadata from current Starwind documentation data when possible.
- Standard component fallback metadata should be refreshed to match current installable component slugs as closely as possible.
- Fallback metadata should not treat documentation patterns as installable components unless the live Starwind data reports them as components.
- The MCP server should avoid adding standalone setup, update, and remove tools in this iteration.
- Existing-project Pro setup guidance should be surfaced from the tools that already mention Pro blocks, especially Add and Search.
- New-project Pro setup should remain `starwind init --defaults --pro`.
- Existing-project Pro setup should be `starwind setup --yes` with package manager guidance where available.
- Tool responses should make clear whether a command is for new project setup, existing project setup, or adding a component/block.
- The public MCP tool surface should not grow simply because the CLI has more commands.
- README and tests should be updated to describe `starwind_search` and the compact tool philosophy.

## Testing Decisions

- Test at the MCP tool boundary where possible: listing tools and calling tools through the server is the highest-value seam because it reflects how clients consume the package.
- Use direct handler tests for detailed search ranking, fallback metadata, pagination, and command generation behavior.
- Prefer externally visible outputs over implementation details. Tests should assert tool names, schemas, response shape, commands, result grouping, counts, and guidance.
- Tests should cover live-fetch failure behavior through mocked fetches so fallback metadata can be verified deterministically.
- Tests should cover standard component search, Pro block search, combined query search, plan filtering, category filtering, default limit, explicit limit, offset, and empty-result behavior.
- Tests should cover the decision not to expose standalone setup, update, or remove tools in the MCP tool list.
- Existing tests for Add, Init, Docs, and MCP tool registration provide the prior art for this work.

## Out of Scope

- Adding standalone `starwind_setup`, `starwind_update`, or `starwind_remove` MCP tools.
- Executing Starwind CLI commands directly from the MCP server.
- Detecting the user's target project configuration from disk to infer whether Pro is already configured.
- Reworking the Starwind docs fetcher beyond what is needed for accurate search metadata.
- Changing the package transport or MCP server architecture.
- Adding UI or browser-facing behavior.
- Publishing changes to npm or updating official Starwind website documentation.

## Further Notes

The current Starwind CLI includes more commands than the MCP server should expose directly. This PRD intentionally keeps the server opinionated and compact: search gets broader because it improves discovery, while setup/update/remove remain command guidance rather than first-class MCP tools.

## Comments

### Done - 2026-06-27

Implemented and verified.

Completed issues:

- `01-refresh-component-metadata.md` - refreshed standard component metadata and fallback parsing. Commit: `33b26dd feat(metadata): refresh Starwind component fallback`.
- `02-build-starwind-search.md` - added the CLI-shaped `starwind_search` tool. Commit: `6013e0b feat(search): add Starwind component search tool`.
- `03-keep-mcp-tool-surface-compact.md` - registered `starwind_search`, removed the old Pro-only search from the public MCP surface, and updated README guidance. Commit: `2d411db feat(tools): expose compact Starwind search`.
- `04-distinguish-pro-setup-paths.md` - clarified new-project versus existing-project Pro setup guidance across Init, Add, and Search. Commit: `28b66f2 feat(setup): clarify Starwind Pro setup guidance`.

Final checks:

- `pnpm exec vitest run` - passed, 115 tests.
- `pnpm build` - passed, TypeScript build completed.

Reviewer coverage:

- Issue 01 reviewer initially blocked on compact `llms.txt` parsing; fixed with section-based parsing and additional tests.
- Issue 02 reviewer found no blocking issues and suggested additional edge-case tests; added them.
- Issue 03 reviewer initially blocked on stale Init guidance for the removed Pro-only search tool; fixed response text and tests.
- Issue 04 reviewer initially blocked on stale Init wording that encouraged re-running init; fixed tool description and standard-mode guidance.

Remaining risks:

- The old unregistered Pro-only search implementation remains in `src/tools/search_pro_blocks_tool.ts` with historical wording. It is no longer publicly registered, and the new public search surface is covered by registration tests.
- Search relies on the external Starwind Pro manifest shape at runtime; tests cover expected manifest behavior with deterministic fixtures.
