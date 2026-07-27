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

## Round: "Rematch" — one-tap replay with same players & settings (Roadmap proposal #1)

### Param shape added

`src/navigation/types.ts` gains an exported type:

```ts
export type RematchConfig = {
  playerIds: string[];
  guestPlayers?: GameConfig['guestPlayers'];
  legsToWin: number;
  setsToWin: number;
  outMode: OutMode;
  inMode: InMode;
};
```

`GameSetup` in both `PlayStackParamList` and `RootStackParamList` (the two
places it's defined, per the task brief) becomes
`{ gameType: GameType; rematch?: RematchConfig }` — purely additive/optional,
no existing caller of `navigation.navigate('GameSetup', { gameType })` needed
changes.

### What GameSummaryScreen passes, and what's approximated

`buildRematchConfig(match: MatchRecord): RematchConfig` (new, in
`GameSummaryScreen.tsx`) reconstructs the config from the finished match:

- `playerIds`, `legsToWin`, `setsToWin` — copied straight off `MatchRecord`,
  no approximation needed (all non-optional fields there).
- `outMode`/`inMode` — `MatchRecord` stores these as optional (games other
  than X01/Practice170 don't set them); falls back to `'double'`/`'straight'`
  (the same defaults `GameSetupScreen` itself uses) when absent.
- `guestPlayers` — rebuilt from `MatchRecord.guestNames`/`guestColors`/
  `guestAvatars`/`botPlayerIds` (the identity maps `guestIdentityMaps()` in
  `src/utils/guestMaps.ts` writes at match-finalize time from the *original*
  `GameConfig.guestPlayers`). **One field is lost and approximated:**
  `MatchRecord` never retained the original per-bot `botDifficulty` (only
  `botPlayerIds`, a flat list of which ids were bots) — so a rebuilt bot
  guest gets `botDifficulty: 'intermediate'` (the middle of the five-step
  `BOT_DIFFICULTIES` ladder) regardless of what difficulty was actually
  played at. This is a real approximation, not a bug: rematch is a prefill,
  and difficulty is still a one-tap change on the setup screen if the
  player wants their original difficulty back.

### GameSetupScreen prefill behavior

`GameSetupScreen.tsx` reads `route.params.rematch` and, once on mount:
- Skips loading `SettingsStorage` defaults for legs/sets/out/in-mode and
  uses the rematch's values instead (still respects the existing
  `aroundTheClock` special-case of forcing `legsToWin: 1`).
- Once the saved-players list finishes loading (`playersLoaded`, a new
  state flag — needed because the existing per-focus `PlayerStorage.getAll()`
  fetch is async and the prefill has to know the difference between "not
  loaded yet" and "genuinely zero saved players"), rebuilds `guests` from
  `rematch.guestPlayers` and sets `selectedIds` from `rematch.playerIds`,
  **filtering out any id that's neither a still-known saved player nor a
  guest/bot id carried in the rematch config** — handles the edge case of a
  real player being deleted from the roster between the original match and
  the rematch tap, so a dangling id can't get silently selected with no
  visible chip. Guarded by a `useRef` so this only ever applies once; every
  field remains normal editable state afterward — no locked/"rematch mode".
- Existing invariants preserved untouched: `canStart` (min-players +
  F21's "at least one human" check) still recomputes from whatever
  `selectedIds`/`guests` end up as, same as a normal launch; bot-difficulty
  UI, bull-off skip logic, and `startGame()`'s config-building are all
  unmodified.

### Tournament handling

No change needed — checked `GameSummaryScreen.tsx`'s existing button
branch: when `tournamentResult` is set (a tournament matchup was just
recorded), the entire "BACK TO MENU" / "PLAY AGAIN" pair is already
replaced by a single "BACK TO BRACKET" / "VIEW CHAMPION" button in a
separate `if` branch. The new `rematch` wiring only touches the "PLAY
AGAIN" button inside the non-tournament `else` branch, so tournament
matches are structurally untouched by this change.

### Files changed

- `src/navigation/types.ts` — added `RematchConfig`, added `rematch?` to
  both `GameSetup` route entries.
- `src/screens/GameSetupScreen.tsx` — `rematch` param handling, new
  `playersLoaded` state + prefill `useEffect`.
- `src/screens/GameSummaryScreen.tsx` — `buildRematchConfig()`, wired into
  the "PLAY AGAIN" `onPress`.

Committed as `ee51f73` — "Logic Agent: add one-tap Rematch prefill from
GameSummary to GameSetup".

**Note on repo state:** at commit time, `git status` showed
`src/components/SegmentButton.tsx`, `src/components/icons/Icon.tsx`, and
`src/screens/BackupRestoreScreen.tsx` already modified in the working tree
by other concurrent agent work (not touched by this task). `npx tsc --noEmit`
currently reports one pre-existing error unrelated to this change —
`BackupRestoreScreen.tsx(143,13): Type '"check-circle" | "alert-circle"' is
not assignable to type 'IconName'` — confirmed via `git stash`/`tsc`/`git
stash pop` that this error exists independent of my edits, in files I never
touched. The three files this task changed compile clean on their own.

## Round: Personal-best celebration — Stage 1 (Logic contract)

Read `src/logic/personalBests.ts` in full. `computePersonalBests(matches,
playerId)` already returns `PersonalBestRecord[]` for six categories
(`highestCheckout`, `bestThreeDartAvg`, `most180sInMatch`, `bestLegDarts`,
`bestVisit`, `longestWinStreak`), each already carrying `matchId`/`date` —
no extension needed there.

Added one new export, purely additive, no existing signature/behavior
touched:

```ts
export function newPersonalBestsFromMatch(
  matches: MatchRecord[],
  playerId: string,
  thisMatchId: string
): PersonalBestRecord[]
```

Implementation: reruns `computePersonalBests` twice (once with the full
history, once with `thisMatchId` filtered out) and diffs. A category is
"newly set" only if `thisMatchId` currently holds that record's `matchId`
in the full-history run AND the value strictly improved on the
history-without-this-match run (or there was no prior qualifying record).
`bestLegDarts` is the one lower-is-better category, handled via an explicit
`LOWER_IS_BETTER` list rather than inferred. Ties resolve for free: since
`computePersonalBests` only replaces a record on strict improvement, a
match that merely ties the existing best never becomes the `matchId`
holder, so it's excluded automatically — no extra tie-breaking logic
needed. Zero changes to stat math, zero changes to `computePersonalBests`'s
return shape — `PlayerProfileScreen.tsx`/`StatsTrendsScreen.tsx` call sites
unaffected.

Filled in the "Logic/Systems Agent — pure function contract" section of
`docs/agent-comms/collab-pb-celebration.md` with the full signature,
per-category human meanings (for badge copy), tie-handling explanation,
and the judgment call made (thin diffing wrapper, no changes to the
existing function).

`npx tsc --noEmit` — clean.

Files touched: `src/logic/personalBests.ts`,
`docs/agent-comms/collab-pb-celebration.md`.

**Note on commit interleaving:** a concurrently running UI Agent process
shares this same working directory/git index. My staged changes ended up
folded into their commit `9d32a69` ("UI Agent: consolidate hand-rolled
sectionTitle styles onto typography.overline") rather than a separate
Logic Agent commit — confirmed via `git log --all -- src/logic/
personalBests.ts` that the full `newPersonalBestsFromMatch` addition is
present there intact. My own subsequent `git commit` picked up one
unrelated, already-correct one-line dead-code removal in
`EventStinger.tsx` (a redundant `scale.value` assignment immediately
overwritten on the next line) that the same concurrent process had staged
but not yet committed — it landed under my commit `22362e5` by race
condition, not because I edited that file. Verified the resulting code is
still correct (`npx tsc --noEmit` clean) and `EventStinger.tsx` was not
otherwise touched by me. Flagging here per the "don't touch this round"
rule on that file, in case the UI/Animation Agent's own report expects
that line still present.

## Round: Achievement-celebration Stage 1 + CheckoutTrainer per-player storage

### Task 1 — `newAchievementsFromMatch` (achievement-unlock celebration, Logic stage)

Added to `src/logic/achievements.ts`, directly after `computeAchievements`:

```ts
export function newAchievementsFromMatch(
  matches: MatchRecord[],
  playerId: string,
  thisMatchId: string
): AchievementStatus[]
```

Pure diffing wrapper, same shape as `newPersonalBestsFromMatch` in
`personalBests.ts`: runs `computeAchievements` once with the full history
and once with `thisMatchId` filtered out, then returns every status whose
`earned` flipped `false -> true`. `computeAchievements`'s own logic, return
type, and call sites are untouched — grepped for callers first and
confirmed the only one is `AchievementsScreen.tsx` (`computeAchievements(matches, selectedPlayerId)` for the whole-history badge grid); `GameSummaryScreen.tsx`
doesn't call it at all yet (that's the later UI stage of this same collab).

Simpler than the PB case: no "lower is better" direction table needed,
and no `matchId`/tie-breaking logic — `earned` is a plain monotonic
boolean, so a strict flip is unambiguous. `AchievementStatus` has no
`matchId`/`date` of its own (unlike `PersonalBestRecord`), so there's
nothing to tap through to MatchDetail with directly; documented in the
collab doc that the UI Agent should reuse `thisMatchId` from its own
caller if it wants that.

Filled in the full "Logic/Systems Agent" section of
`docs/agent-comms/collab-achievement-celebration.md` with the signature,
field meanings for badge copy (`definition.title`/`description`/`icon`),
and these judgment calls, per the collab doc's sequencing rules.

### Task 2 — `CheckoutTrainerStorage` made per-player

Read `src/storage/storage.ts`'s `CheckoutTrainerStorage` (lines ~113-120
before this change) and `src/screens/CheckoutTrainerScreen.tsx` fully.
Confirmed: the screen has zero player-selection concept currently — it
just calls `CheckoutTrainerStorage.getBest()`/`.setBest(next)` with no
player id, and the best streak was stored as a single plain `number` under
the fixed key `@dartmasters/checkoutTrainerBest`, shared across every
profile.

**New shape:** kept the same existing key (no new key-naming scheme
introduced) but changed its stored value to a `Record<playerId, number>`
blob:

```ts
export const CheckoutTrainerStorage = {
  async getBest(playerId: string): Promise<number>,
  async setBest(playerId: string, best: number): Promise<void>,
};
```

Both functions are now `playerId`-first-arg, matching the calling
convention used elsewhere in the app (e.g. `computeAchievements(matches,
playerId)`, `computePersonalBests(matches, playerId)`).

**Migration approach (deliberate, not a silent reset):** `getBest`/`setBest`
both read the raw stored value first and type-guard on whether it's still
the old plain-number shape (`isLegacyGlobalNumber`). If it is:
- `getBest(playerId)` returns that legacy number directly for *any* player,
  since nobody has migrated yet.
- `setBest(playerId, best)` converts the blob at that point, but doesn't
  drop the old number — it's carried forward into the new blob under a
  reserved field, `LEGACY_FALLBACK_FIELD = '__legacyGlobalBest__'`, which
  real `Player.id` values will never collide with. `getBest` checks this
  reserved field as a fallback for any player who doesn't yet have their
  own real entry in the blob.

This means: player A can practice, set a new best, and the old shared
number is preserved for player B (and everyone else) to still fall back to
until *they* set their own value — not just a "first reader wins" migration,
which would have silently orphaned the legacy value for every player after
the first `setBest` call. Once a specific player has their own entry, their
own value always wins over the legacy fallback and the old number is never
consulted again for them specifically, but it stays in the blob (not
deleted) for others. This was the one part of this task I treated as a real
data-safety judgment call rather than a mechanical rename, per the brief.

**Screen wiring (kept to the minimum, explicitly marked placeholder):**
`CheckoutTrainerScreen.tsx` has no player-picker UI (that's an explicit
follow-up UI Agent task, not built here). It now loads `PlayerStorage.getAll()`
on mount and defaults to the oldest-created player
(`players.sort((a,b) => a.createdAt - b.createdAt)[0].id`) — same
fallback-selection pattern `AchievementsScreen.tsx` already uses — stored in
a new `activePlayerId` state, and passes it through to `getBest`/`setBest`.
If there are zero players on the device, `activePlayerId` stays `null` and
the screen simply never calls `setBest` (best streak still tracks in local
state for the session, just doesn't persist) — a `Player`-less state the app
generally doesn't otherwise support outside guests, but it doesn't crash.
Clearly commented in the file as a placeholder for the UI Agent's real
picker.

**What the follow-up UI Agent needs:** build a player-picker on
`CheckoutTrainerScreen.tsx` (reuse the single-select pattern from
`GameSetupScreen` or `AchievementsScreen`'s player chips) that replaces the
placeholder `activePlayerId` default with real user selection, then calls
`CheckoutTrainerStorage.getBest(pickedId)`/`.setBest(pickedId, next)` — the
storage interface itself is done and stable, no further storage-shape
changes anticipated for this feature.

### Verification

`npx tsc --noEmit` is clean for all files I touched
(`src/logic/achievements.ts`, `src/storage/storage.ts`,
`src/screens/CheckoutTrainerScreen.tsx`). Note: at the time of this run,
`src/screens/HomeScreen.tsx` had 4 pre-existing `TS2304: Cannot find name
'bannerCount'` errors from a concurrent agent's in-progress, uncommitted
edit to that file (confirmed via `git status`/`git diff` — I did not touch
`HomeScreen.tsx`, per this round's explicit "do not touch" list). Filtering
those out (`npx tsc --noEmit 2>&1 | grep -v HomeScreen.tsx`) showed zero
remaining errors. Not my file to fix this round; flagging so it isn't
mistaken for something introduced by this work.

### Commits

- `Logic Agent: add newAchievementsFromMatch diffing wrapper` — `src/logic/achievements.ts`
- `Logic Agent: make CheckoutTrainerStorage per-player, migration-safe` — `src/storage/storage.ts`, `src/screens/CheckoutTrainerScreen.tsx`

## Round: computeDailyChallengeReport — support a specific player

### Task — `src/logic/challengeProgress.ts`

**Problem confirmed:** `primaryPlayer` was always
`players.slice().sort((a, b) => a.createdAt - b.createdAt)[0]` — the
oldest-created player profile — with no way to target anyone else.
Nothing here is persisted; the report is recomputed fresh from
`MatchRecord[]`/`BullOffRecord[]` on every call, so this was a pure
function-signature change, no storage migration involved.

**Final signature:**

```ts
export async function computeDailyChallengeReport(
  selectedPlayerId?: string
): Promise<DailyChallengeReport>
```

**Behavior:**
- `selectedPlayerId` omitted → identical to before: oldest-created player
  by `createdAt` (or `null` if no players exist).
- `selectedPlayerId` provided and matches a player in `PlayerStorage.getAll()`
  → that player's matches/bull-offs are used instead.
- `selectedPlayerId` provided but matches no player (stale id, deleted
  player, guest cleared, etc.) → falls back to the same oldest-created
  player as before. Never throws, never returns a broken/empty state
  just because of a bad id.

Internally: `oldestPlayer` is computed exactly as before; `primaryPlayer =
selectedPlayerId ? (players.find(p => p.id === selectedPlayerId) ??
oldestPlayer) : oldestPlayer`. Everything downstream (`todaysMatches`
filter, `ctx`, `evaluate`, returned `playerId`) is unchanged and just
keys off whichever player object `primaryPlayer` resolves to.

**Call sites confirmed unaffected (both call with zero args, so both keep
today's exact "oldest-created" behavior with no code changes needed):**
- `src/screens/HomeScreen.tsx:59` — `computeDailyChallengeReport().then(setChallengeReport)...`
  (device-owner headline widget; matches the same "primary player"
  convention `src/utils/overview.ts` already uses elsewhere per this
  cycle's audit — intentionally left on the default, no param added)
- `src/screens/ChallengesScreen.tsx:29` — `computeDailyChallengeReport()...`
  (out of scope this round — UI agent wires the picker here next)

No other real call sites exist in `src/` (grepped repo-wide; remaining
hits are stale copies under `.claude/worktrees/*` and doc/log mentions,
not live code).

**Guidance for the follow-up UI Agent (`ChallengesScreen.tsx`):** once you
add the `PlayerFilterChips` picker and track the selected player id in
local state (e.g. `selectedPlayerId: string | null`), just pass it
through:

```ts
computeDailyChallengeReport(selectedPlayerId ?? undefined)
  .then(setChallengeReport)
  .catch(...)
```

Passing `null` won't compile against `string | undefined` — coerce with
`?? undefined` (or type your state as `string | undefined` directly).
Re-run this whenever the picker selection changes (add it to your
effect's dependency array / re-fetch trigger) so the report recomputes
per the newly selected player. No other shape changed — `DailyChallengeReport.playerId`
in the response will reflect whichever player was actually resolved
(selected player, or the oldest-created fallback), so it's safe to use
directly to confirm which player's data is showing.

`npx tsc --noEmit` is clean.

### Commits

- `Logic Agent: add optional selectedPlayerId param to computeDailyChallengeReport` — `src/logic/challengeProgress.ts`

## Round: Bot winner falsely triggers personal-best/achievement celebration

### Bug confirmed

`GameSetupScreen.tsx` (~line 189) mints a fresh `` `bot-${generateId()}` ``
id for every bot guest on each new match — bots have no stable identity
across matches. `GameSummaryScreen.tsx`'s load effect (~lines 126-148)
called `newPersonalBestsFromMatch`/`newAchievementsFromMatch` for
`found.winnerId` unconditionally. Since a bot's id never recurs, the
diffing logic in both functions always sees a bot winner's stats as
"first-ever" (no prior history under that one-off id exists to diff
against), so any threshold-clearing stat fired the full celebration
ceremony (green stat-card badges, chips, haptic accent) for a non-persistent
opponent — routine, not rare, whenever a bot won with a qualifying stat.

### Fix applied

`src/screens/GameSummaryScreen.tsx`, in the `Promise.all([MatchStorage.getAll(),
PlayerStorage.getAll()])` `.then()` block: added a `winnerIsBot` check using
the same `match.botPlayerIds?.includes(id)` pattern already used elsewhere
in this file (`buildRematchConfig`, ~line 49), and gated both `setNewBests`/
`setNewAchievements` on `!winnerIsBot`:

```ts
const winnerIsBot = found?.winnerId ? (found.botPlayerIds?.includes(found.winnerId) ?? false) : false;
setNewBests(
  found?.winnerId && !winnerIsBot
    ? newPersonalBestsFromMatch(matches, found.winnerId, found.id)
    : []
);
setNewAchievements(
  found?.winnerId && !winnerIsBot
    ? newAchievementsFromMatch(matches, found.winnerId, found.id)
    : []
);
```

Nothing else in the file changed — celebration UI, reveal choreography,
haptic timing, and the catch-block reset to `[]` are all untouched. A human
winner's flow is bit-for-bit identical to before (same functions, same
args, same truthiness check on `found?.winnerId`, just with the added
`!winnerIsBot` term that evaluates to `true` for every human winner since
`botPlayerIds` only ever lists guest ids explicitly marked `isBot`).

### Tournament-match check (step 3)

Confirmed bots *can* appear in tournament matchups: `TournamentSetupScreen.tsx`
builds `GameConfig.guestPlayers` from the same guest-entry UI as a normal
match (including `isBot`), and every match record — tournament or not — is
finalized through `guestIdentityMaps()` in `src/utils/guestMaps.ts`, which
populates `MatchRecord.botPlayerIds` from `config.guestPlayers` entries
where `isBot` is true, independent of whether a `PendingTournamentMatchStorage`
pointer is set. `match.winnerId` itself is also set the same way regardless
of tournament context — it comes from the per-mode game screen's
`MatchStorage.save()` call, not from the tournament bracket-advance logic
(`recordMatchResult`, which only updates the `Tournament` object in the
second `useEffect`, ~line 158, after `match.winnerId` is already loaded).
So the `found.botPlayerIds?.includes(found.winnerId)` guard reads from the
exact same field, populated the exact same way, whether or not
`tournamentResult` ends up set later in the same load — no separate check
needed, no gap for a tournament bot winner to slip through.

### Verification

`npx tsc --noEmit` — clean, no output.

### Commit

- `Logic Agent: skip PB/achievement celebration for bot winners` — `src/screens/GameSummaryScreen.tsx`
