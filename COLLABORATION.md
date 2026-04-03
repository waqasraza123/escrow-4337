# Collaboration

## Working Model

This repo is meant to be continued by both humans and AI coding tools. The collaboration model is simple:

- use committed docs for durable shared understanding
- use local ignored context for active handoff state
- make one cohesive step at a time
- prove changes with relevant checks

## Source Of Truth

- Product and repo framing: `readme.md`
- Durable project memory: `docs/project-state.md`
- Current and target architecture: `docs/ARCHITECTURE.md`
- Sequenced implementation plan: `docs/EXECUTION_GUIDE.md`
- Codex-specific durable guidance: `AGENTS.md`
- AI assistant working guide: `CLAUDE.md`
- Local active handoff: `docs/_local/current-session.md`

## Standard Task Loop

1. Read the source-of-truth docs.
2. Inspect the current repo state.
3. Scope one meaningful change.
4. Run targeted checks first.
5. Run broader checks if they are relevant.
6. Update durable or local context files before stopping.

## Definition Of Done

A step is done when:

- the intended repo change is implemented cleanly
- the relevant checks were run
- unproven areas are called out explicitly
- follow-up context is recorded for the next person or agent

## Handoffs

When handing off work:

- record the active objective
- record the current blocker or next step
- record the most relevant verification commands
- avoid long narrative notes

Use `docs/_local/current-session.md` for this, not new ad hoc files.
