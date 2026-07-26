# DartMasters UI Consistency — Phase 4 (game screens)

Applies the Phase 3 primitives (`GameHud`, extended `DartPad`, `colors.killer`)
to the game screens, per design-system.md's Phase 4 plan. One commit per
screen. `npx tsc --noEmit` stayed clean throughout.

## Screens touched

- `src/screens/game/HalveItGameScreen.tsx`
- `src/screens/game/Bobs27GameScreen.tsx`
- `src/screens/game/ShanghaiGameScreen.tsx`
- `src/screens/game/AroundTheClockGameScreen.tsx`
- `src/screens/game/KillerGameScreen.tsx` (all 3 phases — claim, bullOff,
  play — plus the `colors.killer` token at its 3 former `'#9B6BFF'`
  call sites)
- `src/screens/game/CricketGameScreen.tsx`
- `src/screens/CheckoutTrainerScreen.tsx`
- `src/screens/game/X01GameScreen.tsx`
- `src/screens/game/Practice170GameScreen.tsx`

All 9 now render `<GameHud onExit centerContent dartsThisTurn? />` instead
of their own hand-rolled `topBar`/`exitBtn`/`legPill`/`dartsIndicator`
styles, which were deleted (not left dead) from each file's stylesheet.
`centerContent` is each screen's existing pill/title content, passed
through unchanged.

## Discrepancies resolved along the way

1. **X01GameScreen's Undo button had no home in `GameHud`.** `GameHud`'s
   contract (per components.md) is `{ onExit, centerContent, dartsThisTurn?
   }` — the right-hand slot is either a dart-count dot row or an invisible
   36px spacer, not a custom action button. X01's top bar, uniquely among
   the 8 game screens, had a *functional* Undo button on the right instead
   of a decorative dots/spacer. Forcing it into `GameHud` would have meant
   either dropping Undo (unacceptable — it's wired to real history-stack
   state) or modifying the shared component (out of scope for Phase 4,
   which only consumes Phase 3 primitives). Resolution: `GameHud` now
   handles the exit + title/subtitle stack; the Undo button moved into the
   deck's header row, next to the existing camera-scoring button, styled
   to match it (`cameraBtn`'s 32×32 `radius.sm` treatment). Same wiring
   (`onPress={undo}`, same `disabled` condition), new position.

2. **Practice170GameScreen has the identical Undo-button problem** (it's
   X01's practice-mode sibling, same top-bar shape). Same resolution in
   spirit: `GameHud` for exit + title, Undo relocated to a small floating
   icon button in the top-right corner of the input card (this screen has
   no camera button to sit next to, so it gets its own absolutely
   positioned 32×32 button instead of a header row).

3. **X01GameScreen's number-grid/multiplier/bull-miss pad** now renders as
   `<DartPad onDart={tapDart} disabled={inputDisabled} variant="x01"
   primeSegments={[20, 19, 18]} />`, replacing the bespoke `numberGrid`/
   `bottomRow` JSX and all its styles. `tapDart` (the scoring callback) is
   unchanged — only its caller changed from hand-rolled tiles to `DartPad`.
   The local `multiplier` state, `tapSegment`/`tapMiss` helper functions,
   and `NUMBER_GRID_ROWS`/prime-set styling all became dead code once
   `DartPad` took over rendering + multiplier bookkeeping internally, and
   were removed. This incidentally resolves the `bottomBtn` `borderRadius:
   11` vs. `radius.md` (14) drift audit.md flagged — `DartPad`'s own
   bull/miss buttons use `radius.md`, so X01 now matches automatically
   rather than needing a manual fix.

4. **X01GameScreen's remaining magic-number border radii** were routed
   through `radius.sm/md/lg/xl` (theme import added) wherever a hardcoded
   value exactly matched a scale constant (10→sm, 14→md, 18→lg, 24→xl),
   plus `radius.full` for small circular elements (dots, avatar-sized
   chips) where any radius ≥ half the box's size renders identically.
   Values that don't exactly coincide with the scale (8, 12, 13, 16, and
   similar one-off paddings/radii elsewhere in the sheet) were left as-is
   — per design-system.md, only the *drifted* `bottomBtn` value was a
   flagged bug; other odd numbers are deliberate one-off treatments, not
   forgotten token references, and changing them would be a visual diff
   this phase isn't authorized to make.

## Not touched

- `CameraScoringScreen.tsx`, anything in `src/logic/`.
- Achievements/HeadToHead/StatsTrends/Challenges/Leaderboard/MatchDetail —
  handled by a parallel Phase 4 agent in a different worktree.
- No new dependencies.
