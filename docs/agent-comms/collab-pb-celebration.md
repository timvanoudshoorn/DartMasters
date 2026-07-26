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

*(pending — do not start until the Logic section above is filled in)*

---

## Animation Agent — motion/haptic (fill in below)

*(pending — do not start until the UI section above is filled in)*
