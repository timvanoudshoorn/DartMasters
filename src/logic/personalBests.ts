// Personal-best records derived purely from existing match history — no new
// tracking, no storage of its own. Every record carries the matchId/date it
// happened on (when applicable) so the UI can tap through to MatchDetail.

import { GameType, MatchRecord } from '../types';

const X01_TYPES: GameType[] = ['501', '301', '201', 'practice170'];

export type PersonalBestId =
  | 'highestCheckout'
  | 'bestThreeDartAvg'
  | 'most180sInMatch'
  | 'bestLegDarts'
  | 'bestVisit'
  | 'longestWinStreak';

export interface PersonalBestRecord {
  id: PersonalBestId;
  label: string;
  /** Raw numeric value, or null when the player has no qualifying match yet. */
  value: number | null;
  /** Display-ready string, e.g. "9 darts" or "170". */
  formatted: string;
  /** The match this record was set in, for tap-through to MatchDetail. Null
   * when the record has no single owning match (e.g. an empty streak). */
  matchId: string | null;
  date: number | null;
}

function record(
  id: PersonalBestId,
  label: string,
  value: number | null,
  formatted: string,
  matchId: string | null = null,
  date: number | null = null
): PersonalBestRecord {
  return { id, label, value, formatted, matchId, date };
}

/** Longest run of consecutive match wins across a player's full history
 * (not just the current trailing streak — see `computeWinStreak` in
 * stats.ts for that). Returns the streak length plus the match that closed
 * it out, for tap-through. */
export function computeLongestWinStreak(
  matches: MatchRecord[],
  playerId: string
): { length: number; matchId: string | null; date: number | null } {
  const relevant = matches
    .filter((m) => m.results[playerId])
    .slice()
    .sort((a, b) => a.date - b.date);

  let best = 0;
  let bestMatchId: string | null = null;
  let bestDate: number | null = null;
  let current = 0;
  let currentMatchId: string | null = null;
  let currentDate: number | null = null;

  for (const m of relevant) {
    if (m.winnerId === playerId) {
      current += 1;
      currentMatchId = m.id;
      currentDate = m.date;
    } else {
      current = 0;
      currentMatchId = null;
      currentDate = null;
    }
    if (current > best) {
      best = current;
      bestMatchId = currentMatchId;
      bestDate = currentDate;
    }
  }

  return { length: best, matchId: bestMatchId, date: bestDate };
}

/** Computes every tracked personal-best record for a player from their raw
 * match history. Records with no qualifying match yet still appear, with
 * `value: null`, so the UI can render an empty placeholder rather than
 * omitting the tile. */
export function computePersonalBests(matches: MatchRecord[], playerId: string): PersonalBestRecord[] {
  const playerMatches = matches.filter((m) => m.results[playerId]);
  const x01Matches = playerMatches.filter((m) => X01_TYPES.includes(m.gameType));

  let highestCheckout = { value: 0, matchId: null as string | null, date: null as number | null };
  let bestThreeDartAvg = { value: 0, matchId: null as string | null, date: null as number | null };
  let most180s = { value: 0, matchId: null as string | null, date: null as number | null };
  let bestLegDarts = { value: null as number | null, matchId: null as string | null, date: null as number | null };
  let bestVisit = { value: 0, matchId: null as string | null, date: null as number | null };

  for (const m of x01Matches) {
    const r = m.results[playerId];
    if (r.highestCheckout > highestCheckout.value) {
      highestCheckout = { value: r.highestCheckout, matchId: m.id, date: m.date };
    }
    if (r.threeDartAvg > bestThreeDartAvg.value) {
      bestThreeDartAvg = { value: r.threeDartAvg, matchId: m.id, date: m.date };
    }
    if (r.oneEighties > most180s.value) {
      most180s = { value: r.oneEighties, matchId: m.id, date: m.date };
    }
    if (r.bestLegDarts !== null && (bestLegDarts.value === null || r.bestLegDarts < bestLegDarts.value)) {
      bestLegDarts = { value: r.bestLegDarts, matchId: m.id, date: m.date };
    }
    if (r.highestVisit > bestVisit.value) {
      bestVisit = { value: r.highestVisit, matchId: m.id, date: m.date };
    }
  }

  const streak = computeLongestWinStreak(playerMatches, playerId);

  return [
    record(
      'highestCheckout',
      'Highest Checkout',
      highestCheckout.value > 0 ? highestCheckout.value : null,
      highestCheckout.value > 0 ? String(highestCheckout.value) : '—',
      highestCheckout.matchId,
      highestCheckout.date
    ),
    record(
      'bestThreeDartAvg',
      'Best 3-Dart Avg',
      bestThreeDartAvg.value > 0 ? bestThreeDartAvg.value : null,
      bestThreeDartAvg.value > 0 ? bestThreeDartAvg.value.toFixed(1) : '—',
      bestThreeDartAvg.matchId,
      bestThreeDartAvg.date
    ),
    record(
      'most180sInMatch',
      'Most 180s (Match)',
      most180s.value > 0 ? most180s.value : null,
      most180s.value > 0 ? String(most180s.value) : '—',
      most180s.matchId,
      most180s.date
    ),
    record(
      'bestLegDarts',
      'Best Leg',
      bestLegDarts.value,
      bestLegDarts.value !== null ? `${bestLegDarts.value} darts` : '—',
      bestLegDarts.matchId,
      bestLegDarts.date
    ),
    record(
      'bestVisit',
      'Best Visit',
      bestVisit.value > 0 ? bestVisit.value : null,
      bestVisit.value > 0 ? String(bestVisit.value) : '—',
      bestVisit.matchId,
      bestVisit.date
    ),
    record(
      'longestWinStreak',
      'Longest Win Streak',
      streak.length > 0 ? streak.length : null,
      streak.length > 0 ? `${streak.length} wins` : '—',
      streak.matchId,
      streak.date
    ),
  ];
}

/** Categories where a *lower* value is the better record (every other
 * category is higher-is-better). Kept as an explicit list rather than
 * inferring direction, since it's the one place that knowledge lives. */
const LOWER_IS_BETTER: PersonalBestId[] = ['bestLegDarts'];

/**
 * Given a player's full match history (including the just-finished match)
 * and that match's id, returns the subset of `computePersonalBests`
 * records that were *newly set specifically by this match* — i.e. this
 * match currently holds the record AND the record strictly improved on
 * whatever the player's best was immediately before this match.
 *
 * Pure diffing wrapper: reruns `computePersonalBests` once with the full
 * history and once with `thisMatchId` excluded, then compares. No stat
 * math is reimplemented here.
 *
 * Ties are handled for free by `computePersonalBests`'s own tie-breaking
 * (it only replaces a record on strict improvement, so of two matches
 * with an equal value, the earlier one — by input array order — keeps
 * the `matchId`). That means: (a) the "without" computation still credits
 * the earlier match as the record holder, so its value matches the "with"
 * computation's value and no false-positive "new best" is reported for a
 * merely-tying match; (b) a match can only appear in this function's
 * result if it is the one `computePersonalBests` currently attributes the
 * record to, which requires it to have been strictly better than every
 * match before it in the input order.
 *
 * Returns full `PersonalBestRecord`s (not just ids) so callers/UI can read
 * `label`/`formatted`/`value` directly without a second lookup.
 */
export function newPersonalBestsFromMatch(
  matches: MatchRecord[],
  playerId: string,
  thisMatchId: string
): PersonalBestRecord[] {
  const withMatch = computePersonalBests(matches, playerId);
  const withoutMatch = computePersonalBests(
    matches.filter((m) => m.id !== thisMatchId),
    playerId
  );

  const newlySet: PersonalBestRecord[] = [];

  for (const withRec of withMatch) {
    // This match must currently be the one holding the record.
    if (withRec.matchId !== thisMatchId || withRec.value === null) continue;

    const beforeRec = withoutMatch.find((r) => r.id === withRec.id) ?? null;

    if (beforeRec === null || beforeRec.value === null) {
      // First-ever qualifying record in this category.
      newlySet.push(withRec);
      continue;
    }

    const improved = LOWER_IS_BETTER.includes(withRec.id)
      ? withRec.value < beforeRec.value
      : withRec.value > beforeRec.value;

    if (improved) newlySet.push(withRec);
  }

  return newlySet;
}
