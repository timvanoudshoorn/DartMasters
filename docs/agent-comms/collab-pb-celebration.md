# Collab spec: Personal-best celebration on the win screen

Feature: `GameSummaryScreen`'s staged reveal ceremony currently treats every
win identically. `src/logic/personalBests.ts` is a fully-built, already-
consumed-elsewhere pure derived-data module, but nothing surfaces a "you
just set a new record" moment at the one point it's most meaningful. Scope
for v1 (Head-Agent decision, see `docs/agent-comms/head-log.md`): **personal
bests only**, not achievements — cleaner single-owner data, smaller diff,
achievements can be a fast-follow later.

## Sequencing (same pattern as collab-reduce-motion.md)

1. **Logic/Systems Agent writes this section first** — a pure function that,
   given the just-finished match and the winning player's match history,
   returns which personal-best categories (if any) were newly set *by this
   match*. UI/Animation build against what's written here.
2. **UI Agent reads this file, then implements** the visual "NEW BEST" badge
   on the relevant stat card, appending its section below.
3. **Animation Agent reads both sections, then adds motion/haptic**,
   appending its section last.
4. **QA/Integration Agent reviews the finished collab as a whole** once all
   three sections are filled in.

---

## Logic/Systems Agent — pure function contract (fill in below)

**File:** `src/logic/personalBests.ts` (new export, additive only — no
existing signatures changed).

```ts
export function newPersonalBestsFromMatch(
  matches: MatchRecord[],
  playerId: string,
  thisMatchId: string
): PersonalBestRecord[]
```

**Inputs:**
- `matches` — the player's **full match history, including** the
  just-finished match (same shape/array you already pass to
  `computePersonalBests` — just make sure the just-finished `MatchRecord`
  is in it before calling, e.g. right after it's written to storage).
- `playerId` — the id of the player you want celebration badges for (call
  once per player if you need it for multiple, e.g. both sides of a
  2-player match).
- `thisMatchId` — `MatchRecord.id` of the match that just finished.

**Output:** an array of zero or more `PersonalBestRecord` — the *same*
type `computePersonalBests` already returns (not a new type), just
filtered down to categories newly set by `thisMatchId`. Each entry has:

```ts
interface PersonalBestRecord {
  id: PersonalBestId;   // category key, see below
  label: string;        // human label, already correct for a badge, e.g. "Best Visit"
  value: number | null; // raw numeric value (never null in this function's output)
  formatted: string;    // display-ready string, e.g. "170", "9 darts", "8 wins"
  matchId: string | null; // will equal thisMatchId for every entry returned here
  date: number | null;
}
```

Empty array = nothing new was set this match (the normal case) — UI should
render the ceremony with no badge at all, not an empty/placeholder badge.

**`PersonalBestId` categories** (human meaning, for badge copy):
- `highestCheckout` — highest finishing checkout score in a single leg
  (X01/practice170 only). Higher is better.
- `bestThreeDartAvg` — best 3-dart average across a match. Higher is
  better. `formatted` is already rounded to 1 decimal (e.g. "78.4").
- `most180sInMatch` — most maximums (180s) thrown within a single match.
  Higher is better.
- `bestLegDarts` — fewest darts to win any single leg (the classic
  "9-darter" style record). **Lower is better** — this is the one
  category where a smaller number is the improvement; badge copy should
  read like "New personal best: 12-dart leg" not imply bigger-is-better.
- `bestVisit` — highest single 3-dart visit score. Higher is better.
- `longestWinStreak` — longest run of consecutive match wins across the
  player's entire history (not a per-match stat — a match only "newly
  sets" this category if it's the win that stretched the streak past the
  player's previous best). Higher is better.

Only X01-family game types (`501`, `301`, `201`, `practice170`) count
toward `highestCheckout`/`bestThreeDartAvg`/`most180sInMatch`/
`bestLegDarts`/`bestVisit` — a match of another game type will never
appear in those categories (it can still appear in `longestWinStreak`,
which is game-type-agnostic).

**How ties are handled:** a tie does **not** count as "new." Implementation
detail: this function reruns `computePersonalBests` twice — once with the
full history (including `thisMatchId`), once with `thisMatchId` filtered
out — and diffs. A category only appears in the result if (a) the
"with-match" computation currently attributes that record's `matchId` to
`thisMatchId`, **and** (b) that value is *strictly* better (per category's
direction) than the "without-match" value, or there was no qualifying
record at all before this match (first-ever record in that category).
Since `computePersonalBests` only ever replaces a record on strict
improvement (never `>=`/`<=`), a match that only *ties* the existing best
never becomes the record-holding `matchId` in the first place, so it's
excluded by (a) automatically — no separate tie-breaking logic needed
here.

**Judgment call made:** did not add match-id tracking to
`computePersonalBests` (it already had it — every `PersonalBestRecord`
already carried `matchId`/`date`, so no extension was needed). This
function is a thin diffing wrapper only; zero changes to existing stat
math, zero changes to `computePersonalBests`'s return shape, so
`PlayerProfileScreen.tsx`/`StatsTrendsScreen.tsx` are unaffected — verified
via `npx tsc --noEmit` (clean) plus a read of both call sites.

**Suggested call site for GameSummaryScreen (next round, UI Agent):** after
the match result is persisted and you have the up-to-date full match array
for the winning player (whatever `PlayerProfileScreen` currently sources
its `matches` from), call `newPersonalBestsFromMatch(matches, winnerId,
justFinishedMatch.id)` once for the winner. Result length 0 → no badge.
Result length 1+ → could show one badge per category, or just the single
"best" one if you want to keep the ceremony simple for v1 — your call.

---

## UI Agent — badge implementation (fill in below)

**File:** `src/screens/GameSummaryScreen.tsx` only (no other files touched).

**Data wiring:** the screen's existing data-loading effect already calls
`Promise.all([MatchStorage.getAll(), PlayerStorage.getAll()])`. Added one
line after `found` is resolved: `found?.winnerId ? newPersonalBestsFromMatch(matches,
found.winnerId, found.id) : []`, stored in new state `newBests`. Same
`matches` array `PlayerProfileScreen` sources `computePersonalBests` from
(`MatchStorage.getAll()`) — no new storage call pattern introduced. Only
computed for `match.winnerId`, so losers never carry badges and a
genuine tie (`winnerId` null) produces an empty array with zero extra
rendering, same as any other non-new-best win.

**Badging approach — all matching categories, not just one:** each PB
category is visually independent (a checkout record and a 3-dart-avg
record are different facts about different numbers), so I badge every
category returned, not just the single most impressive one. Since
`computePersonalBests`/`newPersonalBestsFromMatch` already dedupes to at
most one entry per category, and this screen only shows one X01 stat
grid, in practice this is at most 4 badged cells + up to 2 chips — never
visually noisy.

**Mapping categories to the existing UI:**
- `highestCheckout` → "Highest CO" cell
- `bestThreeDartAvg` → "3-Dart Avg" cell
- `most180sInMatch` → "180s" cell
- `bestLegDarts` → "Best Leg" cell

These four get a `newBest` prop on `RevealStat`: cell background/border
switches to `COLORS.positiveGlow`/`positiveBorder` (the same green-wash
tokens `CheckoutBanner` already uses for "good news," reused rather than
inventing a new wash), the counted-up value renders in `COLORS.positive`
(overriding the ember "hot" color — record beats merely-notable), a small
corner `medal` icon badge, and a "NEW BEST" caption line under the stat
label.

**Categories with no matching visible cell — `bestVisit` and
`longestWinStreak`:** X01's stat grid on this screen shows 3-Dart Avg,
First 9, Highest CO, Legs, 180s, 100+, Checkout %, Best Leg — no "highest
single visit" cell exists here (Cricket's grid shows "Best Turn" but
`bestVisit` per the logic contract only ever fires for X01 matches, so
it can never line up with that Cricket-only cell), and no win-streak cell
exists at all. Rather than shoehorning a new full stat card into the grid
(more layout risk, and these are rarer/lower-signal for a first version),
I added a small pill-chip row (reusing the same green wash + `medal` icon,
sized like a compact badge rather than a full `StatPill`) directly under
the winner's name/avatar header, one chip per category, reading e.g.
"NEW BEST · Longest Win Streak 8 wins". Renders only when 1+ such entries
exist for the winner.

**Empty-array no-op confirmed:** with `newBests = []` (the default/common
case), `newBestCellLabels` is an empty Set, `extraNewBests` is `[]`, no
extra JSX renders, and every `RevealStat` call passes `newBest={undefined}`
→ falsy → identical styles/output to before this change. Verified via
`npx tsc --noEmit` (clean) and a read-through of the diff — the existing
ceremony (reveal timing, `CountUp`, `Confetti`, winner name slam) is
untouched.

**Explicitly out of scope (left for Animation Agent, Stage 3):** no new
haptic or sound fires for the badge, and its entrance is whatever the
parent `RevealStat`'s existing `CountUp`/card `FadeInDown` already does —
no dedicated spring/stagger/haptic was added for the badge itself.

---

## Animation Agent — motion/haptic (fill in below)

**File:** `src/screens/GameSummaryScreen.tsx` only (no other files touched).

**What was added:** the medal-icon badge and "NEW BEST" caption inside
`RevealStat` (for the four matching cells) and the standalone
`extraBestChip`s (for `bestVisit`/`longestWinStreak`) now each get their
own `Animated.View`/`Animated.Text` with `entering={ZoomIn...springify()}`
tuned to `SPRING_BOUNCY` (`damping: 12, stiffness: 190` — the app's one
celebratory spring per `CLAUDE.md`), instead of just riding along with the
parent stat card's plain `FadeInDown`. This reads as "the card lands, then
a badge pops onto it" rather than the badge blending into the ordinary
card entrance. A new `REVEAL.newBestPop = 300`ms constant is the extra
beat between a card's own entrance delay and its badge's pop; it's
reduced-motion-gated (`R.newBestPop = reducedMs(REVEAL.newBestPop)`) and
added on top of the existing per-card `delay`, passed down to `RevealStat`
as a new optional `newBestPopDelay` prop (falls back to the plain `delay`,
i.e. simultaneous with the card, if not supplied — keeps the prop
non-breaking for the many `RevealStat` call sites that never pass it).

**Reduced-motion judgment call:** the badge's own `SPRING_BOUNCY` pop
*always* plays in full — only the extra 300ms "lands after the card" head
start collapses to 0 under reduced motion (via `reducedMs`), so the badge
appears simultaneously with its card instead of visibly staggered after
it. I leaned toward "fast-forward the choreography, not skip the
flourish entirely," per `motionPreference.ts`'s contract that a
celebratory pop is closer to a spectrum than a binary: pure ambient
decoration (`Confetti`, `PulseRing`, the win-screen `ScreenFlash`
territory) gets skipped outright under reduced motion, but this badge is
the single most personally meaningful thing the ceremony can show the
player — a genuine "you just set a record" fact, not wallpaper — so unlike
Confetti it still renders and still visibly snaps into place, it just
loses its staggered lead-in. This mirrors how the rest of this screen
already treats reduced motion (delays collapse to 0, but every element —
avatar, trophy badge, name — still appears, nothing is hidden).

**Multi-badge haptic judgment call — one tick, not one per badge:** added
a new `useEffect` (placed alongside the screen's existing haptic-echo
effect, before the `if (!match) return` guard, same pattern) that fires
`haptic.rigid()` exactly once, gated on `newBests.length > 0`, timed to
`reducedMs(REVEAL.stats) + reducedMs(REVEAL.newBestPop)` — the same sum
that produces the winner's first-card badge's pop delay (winner is always
`cardIndex 0` since `orderedIds` sorts them first), so the one haptic beat
lines up with the first badge visually landing. Did **not** give every
badge/chip its own tick: up to ~4 cell badges + 2 chips could all be
`newBest` in the same match, and the trophy thump (`haptic.heavy` at
`REVEAL.trophy`) and name-slam (`haptic.success` at `REVEAL.name`) already
fire moments earlier in this exact sequence — stacking 6 more ticks a few
hundred ms later would read as buzzing, not a single distinct "new record"
moment. `haptic.rigid` was chosen because it's otherwise unused anywhere
in this screen's ceremony (only `heavy`/`success` fire elsewhere), so it
reads as a genuinely new, sharp accent rather than a repeat of a haptic
already spent on the trophy/name beats. The silent badges/chips remain
fully visible with their own `SPRING_BOUNCY` pop — only the *haptic*
layer is deduped, not the visual one (Stage 2's "badge every category"
decision is untouched).

**Flag-off (motion on) trace:** mount → `REVEAL.overline` (80ms) label
fade → `REVEAL.trophy` (280ms) avatar `ZoomIn` + pulse rings, `haptic.heavy`
at 400ms → `REVEAL.name` (560ms) name slam, `haptic.success` at 660ms →
`REVEAL.stats` (900ms) winner's card `FadeInDown` begins (cardIndex 0,
`delay = 900`); at `900 + 300 = 1200ms` its `newBest` cells' medal badges
and any standalone chips `ZoomIn` with a bouncy overshoot, and
simultaneously `haptic.rigid()` fires once (scheduled at the same 1200ms
mark) — the badge appears to physically land under the finger/thumb via
the haptic beat, distinctly after the card itself (which started
animating in 300ms earlier and has already settled). Losers' cards follow
at `900 + statStep` increments but never carry badges (`newBestCellLabels`
is `null` for non-winners), so no further haptics fire for them.

**Flag-on (reduced motion) trace:** `isReducedMotionEnabled()` true →
every `REVEAL.*` value collapses to 0 via `reducedMs`, so overline/
trophy/name/stats/statStep/newBestPop are all 0 — all entrance `delay`s
become 0 and everything mounts together instead of cascading (matches the
rest of this screen's existing reduced-motion behavior, unchanged by this
work). The badge's `ZoomIn.delay(popDelay)` becomes `ZoomIn.delay(0)`
(since `newBestPopDelay = delay + R.newBestPop = 0 + 0 = 0`), so it pops
in at the same instant as its card rather than visibly after — but it
still *plays* the full `SPRING_BOUNCY` overshoot animation (only the
pre-delay was gated, not the spring itself), so a reduced-motion user
still sees and feels a distinct "pop," just without the staggered
lead-in. The haptic fires at `reducedMs(900) + reducedMs(300) = 0`, i.e.
immediately on mount, with the pre-existing trophy/name haptics landing
shortly after (`reducedMs(560) + 100 = 100`ms for the name success roll,
`reducedMs(280) + 120 = 120`ms for the trophy thump — note this pair's
relative order was already like that before this change, unaffected by
this work) — three closely-timed haptic beats in quick succession rather
than spread over 1.2s, which is the expected reduced-motion trade-off
(compressed timeline, nothing skipped).

**Not touched:** Logic's `newPersonalBestsFromMatch` diffing and UI's
category→cell mapping / chip-vs-badge placement decisions from Stages 1–2
are unchanged — this stage only added `entering=` props, one new `REVEAL`
constant, one new optional `RevealStat` prop, and one new `useEffect` for
the haptic.
