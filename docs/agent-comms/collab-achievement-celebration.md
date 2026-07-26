# Collab spec: Achievement-unlock celebration on the win screen

Fast-follow to the already-shipped personal-best celebration
(`docs/agent-comms/collab-pb-celebration.md`) — same 3-stage pattern,
same win-screen ceremony, this time for `src/logic/achievements.ts`
instead of `personalBests.ts`.

**Head Agent decision on multi-badge sequencing:** if a single match both
sets a new personal best AND unlocks an achievement, treat it as one
combined celebration pass — reuse the same badge slot/mechanism and the
same single haptic accent already built for PBs, don't stack two separate
pops/haptic beats in one ceremony. The Animation stage should make sure a
match with both PB(s) and achievement(s) still fires only one accent
haptic total, matching the existing "one `haptic.rigid()` per ceremony,
not per badge" rule from the PB work.

## Sequencing (same as collab-pb-celebration.md)

1. Logic/Systems Agent writes its section first — the pure function.
2. UI Agent reads it, builds the badge, appends its section.
3. Animation Agent reads both, adds motion/haptic, appends its section.
4. QA/Integration Agent reviews the finished collab as a whole.

---

## Logic/Systems Agent — pure function contract (fill in below)

**Function** (`src/logic/achievements.ts`, appended after `computeAchievements`):

```ts
export function newAchievementsFromMatch(
  matches: MatchRecord[],
  playerId: string,
  thisMatchId: string
): AchievementStatus[]
```

Pure diffing wrapper, structured exactly like `newPersonalBestsFromMatch` in
`personalBests.ts`: calls `computeAchievements(matches, playerId)` once with
the full history (including the just-finished match) and once with
`thisMatchId` filtered out of `matches`, then returns every status from the
"with" run whose `earned` flipped `false -> true` relative to the "without"
run (or didn't exist/wasn't earned before at all). `computeAchievements`
itself, its existing call sites (only `AchievementsScreen.tsx`), and its
return shape are untouched — this is additive only.

**Existing `AchievementStatus` shape** (unchanged, just documenting it here
for the UI Agent since it's simpler than `PersonalBestRecord`):

```ts
interface AchievementStatus {
  definition: AchievementDefinition; // { id, title, description, icon: IconName, target, getProgress }
  progress: number;                  // clamped 0..target
  earned: boolean;
}
```

For badge copy: use `definition.title` (short, e.g. "Big Fish") as the
headline, `definition.description` (e.g. "Hit a checkout of 100 or more.")
as the subtext, and `definition.icon` (an `IconName` from
`components/icons/Icon.tsx`, Feather-family) as the badge glyph — there is
no separate "flavor" field, `title`/`description` are the only copy the
definition carries. `progress`/`target` are available if the badge wants to
show e.g. "10/10" but every status returned by `newAchievementsFromMatch` is
by definition freshly `earned: true`, so `progress === definition.target`
for all of them — probably not worth surfacing on the badge itself.

**Judgment calls:**
- No "which direction is improvement" concept needed (unlike PBs' `LOWER_IS_BETTER`
  list) — `earned` is a plain boolean, and achievement progress is monotonic
  non-decreasing as more matches are added, so a strict `false -> true` flip
  is unambiguous; no tie-breaking or "which match currently owns this"
  logic is needed the way `PersonalBestRecord.matchId` required.
- Unlike `PersonalBestRecord`, `AchievementStatus` carries no `matchId`/`date`
  of its own — there's nothing here for the UI to tap through to
  MatchDetail with. If the UI Agent wants tap-through, it would need to pass
  `thisMatchId` through separately (the caller already has it, since it's
  the match that just finished) rather than expecting it on the returned
  object.
- Returns full `AchievementStatus` objects (not just ids), same rationale as
  `newPersonalBestsFromMatch` — callers read `definition.title` etc. directly
  without a second lookup against `ACHIEVEMENTS`.

**Head Agent's combined-sequencing note** (re-read above): when a match
produces both new PBs and new achievements, only one haptic accent should
fire for the whole ceremony — that's an Animation-stage concern layered on
top of both Logic outputs; this function doesn't need to know about PBs at
all, it only computes achievement-side unlocks.

---

## UI Agent — badge implementation (fill in below)

*(pending — do not start until the Logic section above is filled in)*

---

## Animation Agent — motion/haptic (fill in below)

*(pending — do not start until the UI section above is filled in)*
