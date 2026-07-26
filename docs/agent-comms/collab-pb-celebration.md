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

*(pending — do not start until the UI section above is filled in)*
