# Visual Polish Log

Branch: `visual-polish`, worked from an isolated `git worktree` at
`../DartMasters-visual-polish` (branched from `visual-upgrade-v2`, which
has the most recent visual work — icon system, icon avatars, deeper
game-mode motion, MountReveal launch-safe entrance — ahead of
`bugfix-sweep`/`main`). Isolated because the main working directory is
shared with other concurrent agents actively committing to other
branches (`bugfix-sweep`, `audio-pipeline`, `feature-build`).

## Design system check (start of session)

Checked `src/theme/colors.ts` directly against CLAUDE.md's documented
Charcoal & Ember system: elevation ladder `#0C0B0A → #131211 → #181716 →
#1E1D1B → #252422`, ember accent `#C13620`/`#E85C3F`/`#8E2716`, Bebas
Neue for scores, Inter for UI. **Matches exactly — no discrepancy.**
CLAUDE.md is accurate and current; using it as source of truth.

## Screens

### Home
Already fully polished on `visual-upgrade-v2`: `MountReveal` staggered
entrance (header → continue card → stats band → challenges → CTA → nav
grid), real icons, no bare `Pressable`. No changes needed.

### Mode Select
Already solid: staggered `FadeInDown` row entrance (safe here — not the
launch route), real icons, consistent card styling. No changes needed.

### Game Setup
Found one design-rule violation: `MultiplierSelector` (the sliding-thumb
segmented control used in the X01 scoring tray) used a bare `Pressable`
per segment instead of `PressableScale`, so segments gave no tactile
scale feedback on press — inconsistent with `SegmentButton` and the
"bare Pressable in UI chrome is a design bug" rule. Fixed: segments now
use `PressableScale` with `PRESS_SCALE.key`, `haptic="none"` (the
differentiated tick/medium haptic logic already lived in the ownPress
handler, preserved as-is). Rest of the screen (guest chips, bot
picker, PlayerSelectGrid) already used real primitives correctly.
