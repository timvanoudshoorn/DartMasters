import { CRICKET_TARGETS, CricketPlayerState, Multiplier } from '../types';

export function createCricketPlayers(playerIds: string[]): CricketPlayerState[] {
  return playerIds.map((playerId) => ({ playerId, marks: {}, score: 0, legsWon: 0 }));
}

export function isTargetClosedFor(player: CricketPlayerState, target: number): boolean {
  return (player.marks[target] || 0) >= 3;
}

export function isAllClosedBy(player: CricketPlayerState): boolean {
  return CRICKET_TARGETS.every((t) => isTargetClosedFor(player, t));
}

export function applyCricketThrow(
  players: CricketPlayerState[],
  throwerId: string,
  target: number | null,
  multiplier: Multiplier,
  cutThroat = false
): CricketPlayerState[] {
  if (target === null) return players;

  const opponents = players.filter((p) => p.playerId !== throwerId);
  const openOpponents = opponents.filter((p) => !isTargetClosedFor(p, target));
  const allOthersClosed = openOpponents.length === 0;

  const thrower = players.find((p) => p.playerId === throwerId)!;
  const before = thrower.marks[target] || 0;
  const after = before + multiplier;
  const overflow = before >= 3 ? multiplier : Math.max(0, after - 3);
  const pointsToDistribute = overflow > 0 && !allOthersClosed ? overflow * target : 0;

  return players.map((p) => {
    if (p.playerId === throwerId) {
      const scoreGain = !cutThroat ? pointsToDistribute : 0;
      return { ...p, marks: { ...p.marks, [target]: after }, score: p.score + scoreGain };
    }
    if (cutThroat && pointsToDistribute > 0 && openOpponents.some((o) => o.playerId === p.playerId)) {
      return { ...p, score: p.score + pointsToDistribute };
    }
    return p;
  });
}

export function getCricketWinner(players: CricketPlayerState[], cutThroat = false): string | null {
  const closedPlayers = players.filter(isAllClosedBy);
  if (closedPlayers.length === 0) return null;
  if (cutThroat) {
    const minScore = Math.min(...players.map((p) => p.score));
    const winner = closedPlayers.find((p) => p.score <= minScore);
    return winner ? winner.playerId : null;
  }
  const maxScore = Math.max(...players.map((p) => p.score));
  const winner = closedPlayers.find((p) => p.score >= maxScore);
  return winner ? winner.playerId : null;
}
