# Visual Polish Log

Branch: `visual-polish` (branched from `visual-upgrade-v2`, which has the
most recent visual work — icon system, icon avatars, deeper game-mode
motion — ahead of `bugfix-sweep`/`main`).

## Design system check (start of session)

Task brief flagged a possible conflict between CLAUDE.md and a reported
"Fable 5 overhaul." Checked `src/theme/colors.ts` directly: the codebase
already implements Charcoal & Ember exactly as CLAUDE.md documents —
elevation ladder `#0C0B0A → #131211 → #181716 → #1E1D1B → #252422`,
ember accent `#C13620`/`#E85C3F`/`#8E2716`, Bebas Neue for scores, Inter
for UI. **No discrepancy found** — CLAUDE.md is accurate and current.
Using it as source of truth, no override needed.

## Screens

(entries added as work proceeds)
