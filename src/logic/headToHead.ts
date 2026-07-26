import { GameType, MatchRecord } from '../types';

const X01_TYPES: GameType[] = ['501', '301', '201', 'practice170'];

export interface HeadToHeadModeBreakdown {
  gameType: GameType;
  matches: number;
  aWins: number;
  bWins: number;
}

export interface HeadToHeadAverages {
  aThreeDartAvg: number;
  bThreeDartAvg: number;
  aCheckoutPercent: number;
  bCheckoutPercent: number;
  aHighestCheckout: number;
  bHighestCheckout: number;
  aOneEighties: number;
  bOneEighties: number;
}

export interface HeadToHeadResult {
  /** Matches where both players competed against each other (any mode, 2+ players). */
  sharedMatches: MatchRecord[];
  totalMatches: number;
  aWins: number;
  bWins: number;
  draws: number; // matches with no winner (rare, e.g. abandoned) counted separately
  modeBreakdown: HeadToHeadModeBreakdown[];
  averages: HeadToHeadAverages;
  currentStreak: { playerId: string | null; count: number };
}

/**
 * Finds matches where both players took part — the shared match history used
 * to compute a head-to-head record. Includes matches with 3+ players (e.g. a
 * three-way Killer game) since both still "played against" each other.
 */
export function findSharedMatches(
  matches: MatchRecord[],
  playerAId: string,
  playerBId: string
): MatchRecord[] {
  return matches
    .filter((m) => m.results[playerAId] && m.results[playerBId])
    .slice()
    .sort((a, b) => b.date - a.date);
}

function computeX01Averages(matches: MatchRecord[], playerId: string) {
  const relevant = matches.filter((m) => X01_TYPES.includes(m.gameType) && m.results[playerId]);
  if (relevant.length === 0) {
    return { threeDartAvg: 0, checkoutPercent: 0, highestCheckout: 0, oneEighties: 0 };
  }
  let dartsSum = 0;
  let scoredSum = 0;
  let checkoutAttempts = 0;
  let checkoutHits = 0;
  let highestCheckout = 0;
  let oneEighties = 0;
  for (const m of relevant) {
    const r = m.results[playerId];
    dartsSum += r.dartsThrown;
    scoredSum += r.totalScored;
    checkoutAttempts += r.checkoutAttempts;
    checkoutHits += r.checkoutHits;
    highestCheckout = Math.max(highestCheckout, r.highestCheckout);
    oneEighties += r.oneEighties;
  }
  return {
    threeDartAvg: dartsSum > 0 ? (scoredSum / dartsSum) * 3 : 0,
    checkoutPercent: checkoutAttempts > 0 ? (checkoutHits / checkoutAttempts) * 100 : 0,
    highestCheckout,
    oneEighties,
  };
}

/**
 * Computes the full head-to-head comparison between two players: overall
 * record, per-mode breakdown, X01 averages, and the current streak — derived
 * entirely from existing MatchRecord data, nothing persisted.
 */
export function computeHeadToHead(
  matches: MatchRecord[],
  playerAId: string,
  playerBId: string
): HeadToHeadResult {
  const sharedMatches = findSharedMatches(matches, playerAId, playerBId);

  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  const modeMap = new Map<GameType, HeadToHeadModeBreakdown>();

  for (const m of sharedMatches) {
    if (m.winnerId === playerAId) aWins += 1;
    else if (m.winnerId === playerBId) bWins += 1;
    else draws += 1;

    const entry = modeMap.get(m.gameType) ?? {
      gameType: m.gameType,
      matches: 0,
      aWins: 0,
      bWins: 0,
    };
    entry.matches += 1;
    if (m.winnerId === playerAId) entry.aWins += 1;
    else if (m.winnerId === playerBId) entry.bWins += 1;
    modeMap.set(m.gameType, entry);
  }

  const aX01 = computeX01Averages(sharedMatches, playerAId);
  const bX01 = computeX01Averages(sharedMatches, playerBId);

  // sharedMatches is sorted newest-first; walk it to find the current streak.
  let streakPlayer: string | null = null;
  let streakCount = 0;
  for (const m of sharedMatches) {
    if (m.winnerId !== playerAId && m.winnerId !== playerBId) break;
    if (streakPlayer === null) {
      streakPlayer = m.winnerId;
      streakCount = 1;
    } else if (m.winnerId === streakPlayer) {
      streakCount += 1;
    } else {
      break;
    }
  }

  return {
    sharedMatches,
    totalMatches: sharedMatches.length,
    aWins,
    bWins,
    draws,
    modeBreakdown: Array.from(modeMap.values()).sort((a, b) => b.matches - a.matches),
    averages: {
      aThreeDartAvg: aX01.threeDartAvg,
      bThreeDartAvg: bX01.threeDartAvg,
      aCheckoutPercent: aX01.checkoutPercent,
      bCheckoutPercent: bX01.checkoutPercent,
      aHighestCheckout: aX01.highestCheckout,
      bHighestCheckout: bX01.highestCheckout,
      aOneEighties: aX01.oneEighties,
      bOneEighties: bX01.oneEighties,
    },
    currentStreak: { playerId: streakPlayer, count: streakCount },
  };
}
