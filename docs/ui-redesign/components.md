# DartMasters UI Consistency — Phase 3 (shared primitives)

Per design-system.md's "Component work for Phase 3" section. Primitives
only — no screen was wired onto anything new (that's Phase 4). The only
screen-adjacent change is inside `SwitchRow.tsx` itself, since screens
already just render `<SwitchRow>` and need no changes to pick up the fix.

## 1. Three named color tokens (`src/theme/colors.ts`)

Added to `COLORS`, reusing the exact existing hex values (no new colors
invented):

```ts
onFill: '#0A0A0A',   // AchievementsScreen + ChallengesScreen checkmark glyph
killer: '#9B6BFF',   // KillerGameScreen skull icon (3 occurrences)
gold:   '#E8C84A',   // LeaderboardScreen RANK_COLORS[0]
silver: '#C7CDD6',   // LeaderboardScreen RANK_COLORS[1]
bronze: '#C98A4F',   // LeaderboardScreen RANK_COLORS[2]
```

**Deviation from design-system.md, with reasoning:** the doc says to add
`gold`/`silver`/`bronze` to the semantic `colors` export in
`src/theme/index.ts` following the existing alias pattern. But
`colors.gold` **already exists** there and means `COLORS.accentHot` — it's
actively used as a `StatPill` accent color in `PlayerProfileScreen.tsx`,
`MatchDetailScreen.tsx`, and `StatsTrendsScreen.tsx`. Reusing the name for
the medal color would have silently redefined an existing, in-use token
(explicitly forbidden: "don't change colors/values"). Instead, the medal
aliases are exported as `colors.medalGold` / `colors.medalSilver` /
`colors.medalBronze`, plus `colors.onFill` and `colors.killer` (no
collision there). `COLORS.gold/silver/bronze` in `colors.ts` itself use the
plain names as the design doc specifies — only the semantic re-export in
`theme/index.ts` had to route around the collision. `rankTextTop`'s
`'#1A1A1A'` was left as-is (not applied) since the doc says `onFill`
replaces it, but `onFill` is `#0A0A0A` and the current value is a distinct
`#1A1A1A` — applying it would be a visible color change, which is
explicitly out of scope for this phase (and out of scope entirely, since
no screens were touched).

## 2. `SwitchRow.tsx` — bare `Pressable` → `PressableScale`

Replaced the `Pressable` import/usage with `PressableScale` (`haptic="tick"`,
`scaleTo={0.97}`), and removed the now-redundant manual `haptic.tick()` call
(the old code fired it inside `onPress`; `PressableScale` fires its haptic
on press-in instead, so keeping both would double-fire). Visual appearance,
`styles.container`, and toggle behavior are unchanged.

## 3. `src/components/GameHud.tsx` (new)

```ts
interface GameHudProps {
  onExit: () => void;
  centerContent: React.ReactNode;
  dartsThisTurn?: number;
}
```

Read `HalveItGameScreen`, `ShanghaiGameScreen`, and `KillerGameScreen` —
all three (and, per audit.md, `Bobs27`/`AroundTheClock`/`Cricket`/
`Practice170`) share byte-for-byte identical `topBar`/`exitBtn`/`legPill`/
`dartsIndicator` styles: a 36×36 circular exit button (`Icon name="close"`,
`colors.textMuted`, `colors.bgCardAlt`), a centered pill (plain text
"ROUND n/N" in most screens, an icon+text "titlePill" in Killer), and a
row of 3 dart-thrown dots. `centerContent` is passed through as a plain
`ReactNode` so callers keep full control of the pill's exact shape (legPill
vs. titlePill are both just whatever the caller renders).

Killer's `claim`/`bullOff` phases don't track a dart count and use a bare
`<View style={{ width: 36 }} />` in the dots' place, purely to keep
`centerContent` visually centered — `dartsThisTurn` is optional and when
omitted `GameHud` renders the equivalent 36px spacer itself.

## 4. `src/components/PlayerFilterChips.tsx` (new)

```ts
export interface PlayerFilterChipData {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  photoUri?: string;
}

interface PlayerFilterChipsProps {
  players: PlayerFilterChipData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  avatarSize?: number; // default 26
}
```

Read `AchievementsScreen`, `HeadToHeadScreen`, and `StatsTrendsScreen`.
Achievements and StatsTrends are genuinely the same widget (single-select,
`selectedId`/`onSelect`, avatar 24 vs 28, pill chip, `color + '14'` active
tint) — consolidated faithfully, splitting the difference on cosmetic
details that differed slightly between the two copies (avatar size 26,
label `fonts.bodySemibold` 13px, `paddingVertical: spacing.xs + 2`,
`paddingHorizontal: spacing.sm + 2`, `borderTopColor: colors.edge` added
since one copy had it and one didn't — a strict superset, not a visual
change to either).

**Deviation, with reasoning:** `HeadToHeadScreen`'s picker is *not* the
same interaction — it's a **two-player, order-tracked multi-select** (each
chip shows a numbered badge for pick order 1/2), structurally closer to
`PlayerSelectGrid` than to a single-select filter. Forcing it into
`selectedId`/`onSelect` would have either broken HeadToHead's two-pick flow
or bloated this primitive with multi-select/order-badge props that
Achievements and StatsTrends don't need. Left HeadToHead unconsolidated for
now — flagging for Phase 4 to make the call (extend `PlayerFilterChips`
with an optional order-badge multi-select mode, or accept HeadToHead as
intentionally different, the same kind of judgment call design-system.md
already made for `PlayerSelectGrid` vs. this component).

## 5. `src/components/TabBar.tsx` (new)

```ts
export interface TabBarOption<T extends string = string> {
  key: T;
  label: string;
}

interface TabBarProps<T extends string = string> {
  options: TabBarOption<T>[];
  value: T;
  onChange: (key: T) => void;
}
```

Read `ChallengesScreen`'s solo/multiplayer `TabButton`/`tabRow` and
`LeaderboardScreen`'s `periodRow`/`periodBtn`. Both are a `colors.bgCardAlt`
track, `radius.full`, `padding: 4`, `colors.primary`-filled active pill —
reconciled the two sets of slightly different constants:
`paddingVertical: spacing.sm + 2` (Challenges' value — more generous
target) and `fontSize: 12` (Leaderboard's value). Neither original screen
was touched; Phase 4 swaps both onto this.

## 6. `DartPad.tsx` extended (not X01 wired up yet)

Two new optional props, both additive/backward-compatible — existing
`CheckoutTrainerScreen` usage (`<DartPad onDart={tapDart} disabled={!!result} />`)
is completely unaffected:

```ts
interface DartPadProps {
  onDart: (dart: Dart) => void;
  disabled?: boolean;
  primeSegments?: number[];        // new
  variant?: 'default' | 'x01';     // new, defaults to 'default'
}
```

Read `X01GameScreen.tsx`'s bespoke pad: it uses a different digit order
(`NUMBER_GRID_ROWS`: `20,1,18,4,13 / 6,10,15,2,17 / 3,19,7,16,8 / 11,14,9,12,5`,
copied into `DartPad` as `X01_NUMBER_ROWS`) rendered as 4 explicit rows
instead of a single wrapping flex grid, plus a `PRIME_SEGMENTS` highlight
for `{20, 19, 18}`. `variant: 'x01'` switches the grid to the explicit-row
layout; `primeSegments` (a plain `number[]`, so any screen can supply its
own set) adds a `tilePrime` style (raised background, stronger border) to
matching tiles regardless of variant.

**Deviation, with reasoning:** X01's own tile styling has additional
divergence beyond digit order/prime-highlight (its `numberBtn` carries its
own shadow, radius 10 vs `DartPad`'s `radius.sm` = 10 — actually identical
today — but a different armed-state visual and its own `bottomBtn` radius
11 vs `DartPad`'s `radius.md` = 14, flagged in audit.md as a drift bug).
This phase did **not** attempt to make `DartPad`'s output pixel-identical
to X01's current (drifted) styles — that would mean re-introducing the
radius-11 bug into a shared component. `DartPad` keeps its own consistent
`radius.sm`/`radius.md` tile styling; Phase 4, when it swaps
`X01GameScreen` onto extended `DartPad`, will resolve that remaining
1px-radius drift by adopting `DartPad`'s values (the corrective direction
audit.md's fix #2 already calls for), not by preserving X01's bespoke
magic numbers.

## Not touched

- `CameraScoringScreen.tsx`, anything in `src/logic/`.
- No screen's layout/imports were changed except `SwitchRow.tsx` itself.
- No new dependencies.
