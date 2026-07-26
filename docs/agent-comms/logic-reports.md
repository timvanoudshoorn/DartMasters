# Logic/Systems Agent — reports

## Round: Reduce Motion state shape + timeout/interval audit

### Task 1 — Reduce Motion: state shape

Built the equivalent of the Haptics toggle for a new `reducedMotionEnabled`
setting (default `false`, opt-in):

- `src/storage/storage.ts`: added `reducedMotionEnabled: boolean` to
  `AppSettings` and to `DEFAULT_SETTINGS` (`false`). Purely additive —
  `SettingsStorage.get()` already merges `{...DEFAULT_SETTINGS, ...stored}`,
  so old persisted blobs get the default automatically. No migration code
  added.
- `src/theme/motionPreference.ts` (new file): module-level boolean flag
  mirroring `haptics.ts`'s pattern, but synchronous/no gating needed:
  `setReducedMotionEnabled(enabled: boolean)` and
  `isReducedMotionEnabled(): boolean`. Includes a documented contract in
  comments for what "reduced" means for this app (entering= layout
  animations should render instantly/near-zero duration; Confetti/
  EventStinger/ScreenFlash should skip or fast-forward) — intentionally
  does not implement any gating itself, and does not import Reanimated.
- `App.tsx`: added `setReducedMotionEnabled(s.reducedMotionEnabled)` next to
  the existing `setSoundEnabled`/`setHapticsEnabled` calls in the launch
  `useEffect`.
- `src/screens/SettingsScreen.tsx`: added a `SwitchRow` labeled
  "Reduce motion" directly under "Haptics", wired to
  `update({ reducedMotionEnabled: v })`; `update()` now also calls
  `setReducedMotionEnabled(patch.reducedMotionEnabled)` when that key is
  present, matching how `soundEnabled`/`hapticsEnabled` are handled.
- Verified `src/logic/backup.ts` needs no changes — `AppSettings` round-trips
  generically via spread in both `exportAllData()`/`importAllData()`. Not
  touched.
- `npx tsc --noEmit` clean after these changes.
- Filled in the **Logic/Systems Agent — state shape** section of
  `docs/agent-comms/collab-reduce-motion.md` with the final field name/type/
  default, the exact `motionPreference.ts` API, where init happens, and an
  explicit contract/scope list for the Animation Agent's Round 2 gating work
  (what to gate: `entering=` props + STAGGER_MS delays across screens/
  components, Confetti/EventStinger/ScreenFlash, MountReveal's fade+rise;
  what NOT to gate: functional tactile feedback like PressableScale press
  springs, SwitchRow thumb slide, CheckoutBanner breathing dot). Did not
  prescribe implementation code — left ownership of the "how" to Animation
  Agent per the task brief.

Committed as `66fb867` — "Logic Agent: add reducedMotionEnabled setting +
motionPreference flag module" (`App.tsx`, `docs/agent-comms/collab-reduce-motion.md`,
`src/screens/SettingsScreen.tsx`, `src/storage/storage.ts`,
`src/theme/motionPreference.ts`).

### Task 2 — Timeout/interval cleanup audit

Audited the four target screens for the same unmount-leak class of bug that
F17 fixed in Cricket/HalveIt (an untracked toast `setTimeout` firing
`setState` after the component unmounted). Result: **all four screens are
already clean — no fixes needed, no commit for this task.**

- `src/screens/game/ShanghaiGameScreen.tsx` — one `setTimeout` (bot
  "thinking" delay, ~line 192), already inside a `useEffect` with cleanup
  `return () => { clearTimeout(timer); setBotThinking(false); }`, keyed to
  `[activePlayerId, dartsThisTurn]`. No toast UI on this screen at all.
- `src/screens/game/AroundTheClockGameScreen.tsx` — same: one bot-thinking
  `setTimeout` (~line 240), same clean `useEffect` cleanup pattern, keyed to
  `[activePlayerId, dartsThisTurn]`. No toast UI.
- `src/screens/game/Bobs27GameScreen.tsx` — zero `setTimeout`/`setInterval`
  calls anywhere in the file. This mode has no bot support and no toast;
  nothing to audit.
- `src/screens/game/KillerGameScreen.tsx` — two `setTimeout` calls covering
  two of its three phases: claim-phase bot auto-claim (~line 187, keyed to
  `[phase, claimIndex]`) and play-phase bot attack (~line 308, keyed to
  `[phase, activePlayerId, dartsThisTurn]`). Both already wrapped in
  `useEffect` with `return () => { clearTimeout(timer); setBotThinking(false); }`.
  The third phase (`bullOff`) has no timer — it's a manual tap-to-resolve
  screen. No toast UI anywhere in Killer.

None of these four screens use the toast-timer idiom (`toastTimer` ref +
`showToast()` with re-clear-before-reschedule) that Cricket
(`src/screens/game/CricketGameScreen.tsx`, lines 77-89) and HalveIt
(`src/screens/game/HalveItGameScreen.tsx`, lines 104-116) needed fixing for
— they simply don't have toast-style transient messages. Their only timers
are bot-thinking delays, and every one of those already follows the correct
cleanup convention already established in X01/Practice170/Cricket/HalveIt
(functionally equivalent to the `scheduleTimeout` ref-tracked-set pattern in
X01, just expressed as a single-timer `useEffect` cleanup since each bot
timer is 1:1 with its owning effect rather than needing a shared pending-set).

No decisions needed here beyond confirming the existing pattern was already
applied correctly; nothing was in a half-fixed state.

`npx tsc --noEmit` re-confirmed clean at the end of the session (no output).

## Round: Backup staleness nudge (Roadmap proposal #8, Logic half)

Added the additive state field and the single write point for it; deferred
all display work to the UI Agent per the task brief.

- `src/storage/storage.ts`: added `lastBackupAt: number | null` to
  `AppSettings` (default `null` in `DEFAULT_SETTINGS`) — exact same
  additive-optional-with-default shape as `hapticsEnabled`/
  `reducedMotionEnabled`. No migration needed: `SettingsStorage.get()`
  already does `{...DEFAULT_SETTINGS, ...stored}`, so any settings blob
  persisted before this change round-trips with `lastBackupAt: null`.

- **Where the timestamp write lives, and why:** in
  `src/screens/BackupRestoreScreen.tsx`'s `handleExport`, immediately after
  `await Share.share(...)` resolves without throwing — NOT inside
  `src/logic/backup.ts`. Reasoning: `backup.ts`'s `exportAllData()` only
  *gathers* the data snapshot; it has no knowledge of whether the user's
  share/export action actually completed. The screen's `handleExport` is
  the only place "did the export succeed" is determined at all, and it
  already defines success loosely — it doesn't inspect `Share.share`'s
  resolved `result.action` (e.g. `dismissedAction` on iOS), it only
  distinguishes "threw → catch → Alert('Export failed')" from "didn't
  throw". Setting `lastBackupAt` at that same point matches the app's
  existing, only definition of export success rather than inventing a
  stricter one. Wiring added:
  ```ts
  await Share.share({ message: json, title: 'DartMasters Backup' });
  const settings = await SettingsStorage.get();
  await SettingsStorage.save({ ...settings, lastBackupAt: Date.now() });
  ```
  This is a `try` block, so if `SettingsStorage.save` itself threw it would
  fall into the existing catch/Alert path — acceptable, since that would be
  a genuine storage failure worth surfacing the same way other export
  failures are.
- No changes to `backup.ts`, `BackupRestoreScreen.tsx`'s UI/JSX/layout, or
  any other screen. `GameSummaryScreen.tsx` and `GameSetupScreen.tsx` were
  not touched (out of scope this round per the brief — Rematch work is
  held back to avoid colliding with an in-flight Animation Agent task).
- `npx tsc --noEmit` clean (no output).

**For the UI Agent (next round, display half):**
- Field: `AppSettings.lastBackupAt: number | null` in
  `src/storage/storage.ts`, read via `SettingsStorage.get()` (same as any
  other setting). `null` means "never exported"; otherwise it's an epoch-ms
  `Date.now()` value from the moment of the most recent successful export.
- It updates itself — nothing further to wire for writes. Build whatever
  staleness UI/display against `settings.lastBackupAt` (e.g. relative time
  "Last backed up 3 days ago" / a warning state past some threshold) purely
  as a read; no new write path needed.
- Natural home for a display is `BackupRestoreScreen.tsx` itself (it already
  has the export/import UI) or a Settings/Home surface — your call, no
  constraint from this side beyond "don't add new writes, just read the
  field."
