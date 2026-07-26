import { GameType, MatchRecord } from '../types';

const X01_TYPES: GameType[] = ['501', '301', '201', 'practice170'];

export interface TrendPoint {
  matchId: string;
  date: number;
  threeDartAvg: number;
  checkoutPercent: number | null;
}

export type TrendDirection = 'improving' | 'declining' | 'steady';

export interface PlayerTrend {
  points: TrendPoint[];
  direction: TrendDirection;
  firstHalfAvg: number;
  secondHalfAvg: number;
  delta: number;
  bestAvg: number;
  worstAvg: number;
  currentAvg: number;
}

/**
 * Time-ordered 3-dart-average trend for a player's X01 matches (501/301/201/
 * practice170 — the only modes with a meaningful per-match 3-dart average).
 * Returns null when there isn't enough history to plot (fewer than 2 matches).
 *
 * `direction` is a simple first-half-vs-second-half average comparison, not a
 * regression — good enough to tell "trending up" from "trending down" without
 * overclaiming precision.
 */
export function computePlayerTrend(
  matches: MatchRecord[],
  playerId: string,
  limit = 20
): PlayerTrend | null {
  const relevant = matches
    .filter((m) => X01_TYPES.includes(m.gameType) && m.results[playerId])
    .slice()
    .sort((a, b) => a.date - b.date);

  const recent = relevant.length > limit ? relevant.slice(relevant.length - limit) : relevant;
  if (recent.length < 2) return null;

  const points: TrendPoint[] = recent.map((m) => {
    const r = m.results[playerId];
    return {
      matchId: m.id,
      date: m.date,
      threeDartAvg: r.threeDartAvg,
      checkoutPercent: r.checkoutAttempts > 0 ? (r.checkoutHits / r.checkoutAttempts) * 100 : null,
    };
  });

  const mid = Math.ceil(points.length / 2);
  const firstHalf = points.slice(0, mid);
  const secondHalf = points.slice(mid);
  const avgOf = (pts: TrendPoint[]) => pts.reduce((s, p) => s + p.threeDartAvg, 0) / pts.length;

  const firstHalfAvg = avgOf(firstHalf);
  const secondHalfAvg = secondHalf.length > 0 ? avgOf(secondHalf) : firstHalfAvg;
  const delta = secondHalfAvg - firstHalfAvg;
  const direction: TrendDirection = Math.abs(delta) < 1 ? 'steady' : delta > 0 ? 'improving' : 'declining';

  const avgs = points.map((p) => p.threeDartAvg);

  return {
    points,
    direction,
    firstHalfAvg,
    secondHalfAvg,
    delta,
    bestAvg: Math.max(...avgs),
    worstAvg: Math.min(...avgs),
    currentAvg: avgs[avgs.length - 1],
  };
}
