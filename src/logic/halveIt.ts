import { HALVE_IT_SEQUENCE, HalveItPlayerState, HalveItTarget, Multiplier } from '../types';

export { HALVE_IT_SEQUENCE };

export function createHalveItPlayers(playerIds: string[]): HalveItPlayerState[] {
  return playerIds.map((playerId) => ({ playerId, score: 0 }));
}

export interface HalveItDart {
  segment: number; // 1-20, or 25 for bull
  multiplier: Multiplier;
}

/** Points scored by a single dart against a round's target; 0 if it doesn't qualify. */
export function scoreHalveItDart(target: HalveItTarget, dart: HalveItDart | null): number {
  if (!dart) return 0;
  switch (target.kind) {
    case 'number':
      return dart.segment === target.segment ? dart.segment * dart.multiplier : 0;
    case 'anyDouble':
      return dart.multiplier === 2 ? dart.segment * 2 : 0;
    case 'anyTriple':
      return dart.multiplier === 3 ? dart.segment * 3 : 0;
    case 'bull':
      // Single bull = 25, double bull = 50; triple bull doesn't exist.
      return dart.segment === 25 ? dart.segment * dart.multiplier : 0;
    default:
      return 0;
  }
}

export interface HalveItRoundResult {
  newScore: number;
  roundPoints: number;
  halved: boolean;
}

/**
 * Apply a full round (up to 3 darts) to a player's running score: sum every
 * qualifying dart's points, or halve the score (rounded down) if nothing in
 * the round qualified.
 */
export function applyHalveItRound(
  score: number,
  target: HalveItTarget,
  darts: (HalveItDart | null)[]
): HalveItRoundResult {
  const roundPoints = darts.reduce((sum, d) => sum + scoreHalveItDart(target, d), 0);
  if (roundPoints > 0) {
    return { newScore: score + roundPoints, roundPoints, halved: false };
  }
  return { newScore: Math.floor(score / 2), roundPoints: 0, halved: true };
}

export function getHalveItLeader(players: HalveItPlayerState[]): string | null {
  if (players.length === 0) return null;
  const max = Math.max(...players.map((p) => p.score));
  const leaders = players.filter((p) => p.score === max);
  return leaders.length === 1 ? leaders[0].playerId : null;
}
