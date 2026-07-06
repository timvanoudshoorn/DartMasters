import { KillerPlayerState, Multiplier } from '../types';

export function createKillerPlayers(playerIds: string[]): KillerPlayerState[] {
  return playerIds.map((playerId) => ({
    playerId,
    number: 0, // 0 = not yet claimed (Phase 1)
    lives: 0,
    isKiller: false,
    eliminated: false,
  }));
}

export function claimNumber(
  players: KillerPlayerState[],
  playerId: string,
  number: number
): { players: KillerPlayerState[]; collision: boolean } {
  const taken = players.some((p) => p.number === number);
  if (taken) return { players, collision: true };
  return {
    players: players.map((p) => (p.playerId === playerId ? { ...p, number } : p)),
    collision: false,
  };
}

export function applyKillerThrow(
  players: KillerPlayerState[],
  throwerId: string,
  hitNumber: number | null,
  multiplier: Multiplier,
  maxLives: number
): KillerPlayerState[] {
  if (hitNumber === null) return players;
  const owner = players.find((p) => p.number === hitNumber);
  if (!owner || owner.eliminated) return players;

  // Hit your own number: claim lives, capped at max. Reaching max makes you a Killer.
  if (owner.playerId === throwerId) {
    const newLives = Math.min(maxLives, owner.lives + multiplier);
    return players.map((p) =>
      p.playerId === owner.playerId ? { ...p, lives: newLives, isKiller: newLives === maxLives } : p
    );
  }

  // Hit an opponent's number: only effective if the thrower is currently a Killer
  // (i.e. at exactly max lives). Dropping the opponent below max immediately
  // revokes their Killer status, if they had it.
  const thrower = players.find((p) => p.playerId === throwerId);
  if (!thrower?.isKiller) return players;

  const newLives = Math.max(0, owner.lives - multiplier);
  return players.map((p) =>
    p.playerId === owner.playerId
      ? { ...p, lives: newLives, isKiller: newLives === maxLives, eliminated: newLives === 0 }
      : p
  );
}

export function getKillerWinner(players: KillerPlayerState[]): string | null {
  const remaining = players.filter((p) => !p.eliminated);
  return remaining.length === 1 ? remaining[0].playerId : null;
}
