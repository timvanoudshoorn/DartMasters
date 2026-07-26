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

## Round: Announcer silence — user-reported priority bug

### Root cause

Not a removed feature — the announcer wiring in `X01GameScreen.tsx`
(`announceGameOn`/`announceScore`/`cancelAnnouncements`/`announceGameShot`)
and `App.tsx`'s launch preload calls were all intact. The actual bug is
fallout from the prior freeze fix (`b3de50a`, "load announcer clips
sequentially instead of concurrently"):

- `src/utils/dartAnnouncer.ts`'s `preloadAnnouncerSounds()` used to fire all
  ~183 `Audio.Sound.createAsync()` calls via `Promise.all` — that flooded
  AVFoundation's setup queue and caused an iOS watchdog kill (0x8BADF00D) at
  launch, confirmed by device hang reports at the time. The fix serialized
  it into a `for` loop awaiting one clip at a time, which did stop the
  freeze — but on-device, 183 sequential native `Audio.Sound.createAsync()`
  round-trips add up to real wall-clock time (easily several seconds to
  well over a minute depending on device). Every score announced before its
  specific clip's turn in that queue hits `playClip()` → `clips.get(clipKey)`
  returning `undefined` → silent no-op (`if (!sound) return;`, line ~270 in
  the pre-fix file). Object key insertion order in `ANNOUNCER_FILES` puts
  `bust`/`game_on`/`game_shot` first, then `score_1` through `score_180` in
  ascending order, so anything played from a match started shortly after
  launch — which is exactly how anyone (a user or QA) would first notice the
  announcer "not working" — has a good chance of silently failing depending
  on which score total comes up. This is a genuine functional regression,
  not a false alarm: the freeze fix traded "app hangs at launch" for
  "announcer is silently broken for the first chunk of a session," which
  reads to the app owner as "the announcer isn't working anymore."
- **Fix:** `preloadAnnouncerSounds()` now loads in small concurrent batches
  (`PRELOAD_BATCH_SIZE = 8`, `Promise.all` per batch, batches run
  sequentially) instead of either all-at-once or fully serial. This keeps
  peak native concurrency far below whatever threshold triggered the
  watchdog kill (8 vs. 183) while cutting total preload wall-clock time
  roughly 8x versus the fully-serial version, so the announcer becomes
  usable much sooner after launch. If future testing on a real device shows
  the watchdog kill returns, `PRELOAD_BATCH_SIZE` is the one dial to tune
  down; if it's still too slow, tune it up — the batching structure itself
  is the fix, the exact number is a tradeoff knob.

### Silent-mode requirement (explicit ask from Head Agent mid-task)

Confirmed via reading `node_modules/expo-av/src/Audio.ts`: `setAudioModeAsync`
maintains one module-level `currentAudioMode` singleton and does
`_populateMissingKeys(partialMode, getCurrentAudioMode())` — i.e. each call
merges the given keys over whatever the *last* call (from any caller,
anywhere in the app) set, then pushes the merged result to the native
bridge. Traced the actual call sites before this fix: `dartAnnouncer.ts` had
its own module-load-time call (`playsInSilentModeIOS: true,
allowsRecordingIOS: false`), and `App.tsx`'s launch `useEffect` made an
independent second call with the identical two keys. `soundManager.ts` had
no call of its own. Because both existing calls carried identical values,
they weren't actively clobbering each other in the current code — but two
independent, unawaited callers of the same native audio-session singleton
is a live footgun: nothing prevented a future edit to either call site from
dropping `playsInSilentModeIOS` for the other, and there was no ordering
guarantee they'd both complete before first playback (both were fire-and-
forget).

Fix: added `configureAudioMode()` to `src/sound/soundManager.ts` as the
single owner of this native call (includes `playsInSilentModeIOS: true`,
`allowsRecordingIOS: false`, plus the previously-implicit-default
`staysActiveInBackground: false`, `shouldDuckAndroid: true`,
`playThroughEarpieceAndroid: false` made explicit so nothing relies on
`expo-av`'s internal defaults by accident). Removed the module-level call
from `dartAnnouncer.ts` entirely. `App.tsx`'s launch effect now `await`s
`configureAudioMode()` before calling `preloadSounds()` /
`preloadAnnouncerSounds()`, so the native audio session is guaranteed
configured for silent-mode override before any `Audio.Sound.createAsync()`
or playback happens for either the SFX or announcer systems. End state:
exactly one call site, awaited, ahead of all sound creation — silent-mode
override is no longer a race between competing callers.

### Ruled out (checked, not the cause)

- **Settings gating:** grepped the whole repo for `announcer`/`Announcer` —
  only `dartAnnouncer.ts` and `X01GameScreen.tsx` reference it. No
  `soundEnabled`/`hapticsEnabled`/`reducedMotionEnabled` check gates the
  announcer calls anywhere (in fact `dartAnnouncer.ts` doesn't check
  `soundEnabled` at all, unlike `soundManager.ts` — a separate, pre-existing
  quirk, not touched here since it's not the reported bug and touching it
  risks scope creep on a priority fix).
- **X01GameScreen control flow:** read `finishVisit`/mount effects in full,
  not just the `announce*` lines. Recent commits (`89a27a7` DartPad/GameHud
  rewire, `02ea234` haptic/undo audit pass) changed surrounding UI/haptic
  code but left every `announceGameOn`/`announceScore`/`cancelAnnouncements`/
  `announceGameShot` call site and its control flow untouched — confirmed
  via `git show` diffs on both commits.
- **`soundManager.ts` comparison:** its preload (`preloadSounds()`) still
  uses `Promise.all` over only 7 files, which is why it was never affected
  by the freeze bug or this preload-timing bug — too few files for either
  problem to manifest. Its `Audio.Sound`/`createAsync`/`playAsync` API usage
  is otherwise the same as `dartAnnouncer.ts`; no divergence found there.
- **expo-av / SDK 54 compatibility:** `expo-av@16.0.8` against `expo@54.0.36`
  per `package.json`; no deprecation warnings or breaking-change notes found
  in the installed package's source for `Audio.Sound`/`setAudioModeAsync`.
- **Asset files:** not re-verified individually this round (Head Agent's
  static read already confirmed all 183 files present); no evidence found
  that a `require()` path is bad — every clip that does fail would log
  `[dartAnnouncer] Failed to load clip "..."` via the existing per-clip
  `catch`, and that error handling was left intact.

### Files changed

- `App.tsx` — removed direct `Audio.setAudioModeAsync` call and `expo-av`
  import; now awaits `configureAudioMode()` before `preloadSounds()` /
  `preloadAnnouncerSounds()`.
- `src/sound/soundManager.ts` — added exported `configureAudioMode()`.
- `src/utils/dartAnnouncer.ts` — removed its module-level
  `Audio.setAudioModeAsync` call; `preloadAnnouncerSounds()` now loads in
  batches of `PRELOAD_BATCH_SIZE = 8` instead of fully sequential.

Committed as `d9533d4` — "Logic Agent: fix announcer silence — consolidate
audio-mode ownership, batch preload".

`npx tsc --noEmit` — clean, no output, confirmed after all changes above.
