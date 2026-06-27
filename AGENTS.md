# Agent Instructions

## Current Documentation

Fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage.

Prefer official documentation and primary sources. Use the best available documentation source in the current environment, and cite or summarize the source you used when it matters for accuracy.

Do not fetch external documentation for refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts unless the user specifically asks for it.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`; external PRs are not a triage surface for this tracker. See `docs/agents/issue-tracker.md`.

### Triage labels

The repo uses the default five-role triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain layout with one root `CONTEXT.md` and ADRs under `docs/adr/`. See `docs/agents/domain.md`.
