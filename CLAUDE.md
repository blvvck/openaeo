# Project Instructions

Project-specific Claude files for this repo now live locally under `.claude/`.

Start with:
- `.claude/CONTEXT.md`
- `.claude/COMMANDS.md`
- `.claude/DESIGN_SYSTEM.md`
- `.claude/CRITICAL_CODE.md`

When fixing a bug, follow `~/.claude/protocols/REVIEW.md`: reproduce first, create a failing proof, then fix and prove it passes.

## Naming: 30-char hard limit

No class, type, interface, or exported function name longer than 30 characters. If you need 4+ words, the abstraction is wrong — split or simplify.
