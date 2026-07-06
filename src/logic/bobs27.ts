import { Bobs27PlayerState } from '../types';

export const BOBS27_ROUNDS = 20;
export const BOBS27_START_SCORE = 27;

export function createBobs27Players(playerIds: string[]): Bobs27PlayerState[] {
  return playerIds.map((playerId) => ({ playerId, score: BOBS27_START_SCORE, round: 1, finished: false }));
}

export function applyBobs27Round(player: Bobs27PlayerState, hits: number): Bobs27PlayerState {
  const roundValue = player.round * 2;
  const newScore = hits > 0 ? player.score + hits * roundValue : player.score - roundValue;
  const nextRound = player.round + 1;
  return {
    ...player,
    score: newScore,
    round: nextRound,
    finished: nextRound > BOBS27_ROUNDS,
  };
}

export function getBobs27Leader(players: Bobs27PlayerState[]): string | null {
  if (players.length === 0) return null;
  const max = Math.max(...players.map((p) => p.score));
  const leaders = players.filter((p) => p.score === max);
  return leaders.length === 1 ? leaders[0].playerId : null;
}
