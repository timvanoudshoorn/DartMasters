import { MatchRecord, PlayerMatchResult, X01Visit } from '../types';

export function computeX01PlayerResult(
  playerId: string,
  visits: X01Visit[],
  legsWon: number,
  setsWon: number,
  isWinner: boolean,
  legDartsHistory: number[] = []
): PlayerMatchResult {
  const dartsThrown = visits.reduce((s, v) => s + v.dartsUsed, 0);
  const totalScored = visits.reduce((s, v) => s + v.scored, 0);
  const threeDartAvg = dartsThrown > 0 ? (totalScored / dartsThrown) * 3 : 0;

  const firstNineVisits = visits.slice(0, 3); // 3 visits = 9 darts
  const firstNineDarts = firstNineVisits.reduce((s, v) => s + v.dartsUsed, 0);
  const firstNineScored = firstNineVisits.reduce((s, v) => s + v.scored, 0);
  const firstNineAvg = firstNineDarts > 0 ? (firstNineScored / firstNineDarts) * 3 : null;

  const checkoutAttempts = visits.filter((v) => v.isCheckoutAttempt).length;
  const checkoutHits = visits.filter((v) => v.checkout).length;
  const highestCheckout = visits
    .filter((v) => v.checkout)
    .reduce((max, v) => Math.max(max, v.scored), 0);
  const oneEighties = visits.filter((v) => v.oneEighty).length;
  const count100Plus = visits.filter((v) => !v.bust && v.scored >= 100).length;
  const count140Plus = visits.filter((v) => !v.bust && v.scored >= 140).length;
  const highestVisit = visits.reduce((max, v) => Math.max(max, v.bust ? 0 : v.scored), 0);
  const bestLegDarts = legDartsHistory.length > 0 ? Math.min(...legDartsHistory) : null;
  const doublesHit = visits.reduce((sum, v) => sum + v.darts.filter((d) => d.multiplier === 2).length, 0);

  return {
    playerId,
    legsWon,
    setsWon,
    dartsThrown,
    totalScored,
    threeDartAvg,
    firstNineAvg,
    highestCheckout,
    checkoutAttempts,
    checkoutHits,
    oneEighties,
    count100Plus,
    count140Plus,
    bestLegDarts,
    highestVisit,
    marksPerRound: null,
    isWinner,
    doublesHit,
  };
}

export interface CareerStats {
  gamesPlayed: number;
  gamesWon: number;
  legsPlayed: number;
  legsWon: number;
  winRate: number;
  avgThreeDart: number;
  avgFirstNine: number;
  checkoutPercent: number;
  highestCheckout: number;
  highestVisit: number;
  oneEighties: number;
  count100Plus: number;
  count140Plus: number;
  bestLegDarts: number | null;
  bestThreeDartAvg: number;
}

const emptyCareer = (): CareerStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  legsPlayed: 0,
  legsWon: 0,
  winRate: 0,
  avgThreeDart: 0,
  avgFirstNine: 0,
  checkoutPercent: 0,
  highestCheckout: 0,
  highestVisit: 0,
  oneEighties: 0,
  count100Plus: 0,
  count140Plus: 0,
  bestLegDarts: null,
  bestThreeDartAvg: 0,
});

export function aggregateCareerStats(
  matches: MatchRecord[],
  playerId: string,
  gameTypeFilter?: MatchRecord['gameType']
): CareerStats {
  const relevant = matches.filter(
    (m) => m.results[playerId] && (!gameTypeFilter || m.gameType === gameTypeFilter)
  );
  if (relevant.length === 0) return emptyCareer();

  const stats = emptyCareer();
  let weightedDartsSum = 0;
  let weightedScoreSum = 0;
  let firstNineWeighted = 0;
  let firstNineMatchCount = 0;
  let checkoutAttempts = 0;
  let checkoutHits = 0;

  for (const m of relevant) {
    const r = m.results[playerId];
    stats.gamesPlayed += 1;
    if (r.isWinner) stats.gamesWon += 1;
    stats.legsPlayed += r.legsWon + countOpponentLegs(m, playerId);
    stats.legsWon += r.legsWon;
    stats.highestCheckout = Math.max(stats.highestCheckout, r.highestCheckout);
    stats.highestVisit = Math.max(stats.highestVisit, r.highestVisit);
    stats.oneEighties += r.oneEighties;
    stats.count100Plus += r.count100Plus;
    stats.count140Plus += r.count140Plus;
    if (r.bestLegDarts !== null) {
      stats.bestLegDarts = stats.bestLegDarts === null ? r.bestLegDarts : Math.min(stats.bestLegDarts, r.bestLegDarts);
    }
    stats.bestThreeDartAvg = Math.max(stats.bestThreeDartAvg, r.threeDartAvg);
    checkoutAttempts += r.checkoutAttempts;
    checkoutHits += r.checkoutHits;

    weightedDartsSum += r.dartsThrown;
    weightedScoreSum += r.totalScored;
    if (r.firstNineAvg !== null) {
      firstNineWeighted += r.firstNineAvg;
      firstNineMatchCount += 1;
    }
  }

  stats.winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0;
  stats.avgThreeDart = weightedDartsSum > 0 ? (weightedScoreSum / weightedDartsSum) * 3 : 0;
  stats.avgFirstNine = firstNineMatchCount > 0 ? firstNineWeighted / firstNineMatchCount : 0;
  stats.checkoutPercent = checkoutAttempts > 0 ? (checkoutHits / checkoutAttempts) * 100 : 0;

  return stats;
}

export function computeWinStreak(matches: MatchRecord[], playerId: string): number {
  const relevant = matches
    .filter((m) => m.results[playerId])
    .slice()
    .sort((a, b) => b.date - a.date);
  let streak = 0;
  for (const m of relevant) {
    if (m.winnerId === playerId) streak += 1;
    else break;
  }
  return streak;
}

function countOpponentLegs(m: MatchRecord, playerId: string): number {
  return Object.values(m.results)
    .filter((r) => r.playerId !== playerId)
    .reduce((sum, r) => sum + r.legsWon, 0);
}
