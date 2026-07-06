import { Multiplier, ShanghaiPlayerState } from '../types';

export function createShanghaiPlayers(playerIds: string[]): ShanghaiPlayerState[] {
  return playerIds.map((playerId) => ({ playerId, score: 0, shanghaiWin: false }));
}

export interface ShanghaiVisitDart {
  multiplier: Multiplier | null; // null = miss
}

export function scoreShanghaiVisit(
  target: number,
  darts: ShanghaiVisitDart[]
): { points: number; isShanghai: boolean } {
  const hits = darts.filter((d) => d.multiplier !== null) as { multiplier: Multiplier }[];
  const points = hits.reduce((s, d) => s + d.multiplier * target, 0);
  const multSet = new Set(hits.map((d) => d.multiplier));
  const isShanghai = multSet.has(1) && multSet.has(2) && multSet.has(3);
  return { points, isShanghai };
}

export function getShanghaiLeader(players: ShanghaiPlayerState[]): string | null {
  if (players.length === 0) return null;
  const max = Math.max(...players.map((p) => p.score));
  const leaders = players.filter((p) => p.score === max);
  return leaders.length === 1 ? leaders[0].playerId : null;
}
