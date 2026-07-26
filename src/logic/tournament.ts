// Pure single-elimination bracket logic. No React, no storage, no I/O —
// a tournament is just pairings and winners layered on top of normal
// matches, which are played and scored entirely by the existing per-mode
// game logic/screens.

import { shuffled } from '../utils/shuffle';
import { generateId } from '../utils/id';
import { Tournament, TournamentMatchup, TournamentRound } from '../types';

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard tournament seed ordering for a bracket of `size` slots (size must
 * be a power of two), e.g. size=8 -> [0,7,3,4,1,6,2,5] (1v8, 4v5, 2v7, 3v6
 * once paired consecutively). This spreads any empty ("bye") seeds evenly
 * across round-0 matchups instead of clustering them, so a bye is never
 * paired against another bye.
 */
function seedOrder(size: number): number[] {
  if (size <= 1) return [0];
  const prev = seedOrder(size / 2);
  const out: number[] = [];
  prev.forEach((s) => {
    out.push(s);
    out.push(size - 1 - s);
  });
  return out;
}

function makeMatchup(a: string | null, b: string | null): TournamentMatchup {
  const matchup: TournamentMatchup = { id: generateId(), playerAId: a, playerBId: b };
  resolveIfBye(matchup);
  return matchup;
}

/** A matchup with exactly one real player and no opponent auto-advances. */
function resolveIfBye(matchup: TournamentMatchup) {
  const hasA = !!matchup.playerAId;
  const hasB = !!matchup.playerBId;
  if (hasA && !hasB) {
    matchup.winnerId = matchup.playerAId;
    matchup.isBye = true;
  } else if (hasB && !hasA) {
    matchup.winnerId = matchup.playerBId;
    matchup.isBye = true;
  }
}

/**
 * Pushes known winners from each round into the next round's slots and
 * resolves any byes that creates, repeating until nothing changes. Handles
 * cascading byes (e.g. a bye immediately followed by another bye) generically.
 */
function propagate(rounds: TournamentRound[]) {
  for (let pass = 0; pass < rounds.length; pass++) {
    let changed = false;
    for (let r = 1; r < rounds.length; r++) {
      const prev = rounds[r - 1];
      const round = rounds[r];
      round.matchups.forEach((matchup, i) => {
        const srcA = prev.matchups[i * 2];
        const srcB = prev.matchups[i * 2 + 1];
        const nextA = srcA?.winnerId ?? null;
        const nextB = srcB?.winnerId ?? null;
        if (nextA && matchup.playerAId !== nextA) {
          matchup.playerAId = nextA;
          changed = true;
        }
        if (nextB && matchup.playerBId !== nextB) {
          matchup.playerBId = nextB;
          changed = true;
        }
        if (!matchup.winnerId) {
          resolveIfBye(matchup);
          if (matchup.winnerId) changed = true;
        }
      });
    }
    if (!changed) break;
  }
}

/**
 * Builds a complete single-elimination bracket (every round, all the way to
 * the final) for the given players. Player order is randomized before
 * seeding. Byes (when the player count isn't a power of 2) are resolved
 * immediately and their winners propagated forward.
 */
export function createBracket(playerIds: string[]): TournamentRound[] {
  if (playerIds.length < 2) {
    throw new Error('A tournament needs at least 2 players');
  }

  const size = nextPowerOfTwo(playerIds.length);
  const seededPlayers = shuffled(playerIds);
  const order = seedOrder(size);
  const slots: (string | null)[] = order.map((seedIndex) =>
    seedIndex < seededPlayers.length ? seededPlayers[seedIndex] : null
  );

  const roundCount = Math.log2(size);
  const rounds: TournamentRound[] = [];

  const round0: TournamentMatchup[] = [];
  for (let i = 0; i < size; i += 2) {
    round0.push(makeMatchup(slots[i], slots[i + 1]));
  }
  rounds.push({ roundIndex: 0, matchups: round0 });

  for (let r = 1; r < roundCount; r++) {
    const count = size / Math.pow(2, r + 1);
    rounds.push({
      roundIndex: r,
      matchups: Array.from({ length: count }, () => makeMatchup(null, null)),
    });
  }

  propagate(rounds);
  return rounds;
}

/** Finds the earliest matchup with two known, undecided players. */
export function findNextPlayableMatchup(
  tournament: Tournament
): { roundIndex: number; matchupIndex: number } | null {
  for (const round of tournament.rounds) {
    const idx = round.matchups.findIndex((m) => m.playerAId && m.playerBId && !m.winnerId);
    if (idx >= 0) return { roundIndex: round.roundIndex, matchupIndex: idx };
  }
  return null;
}

/** True once the final round's single matchup has a winner. */
export function isTournamentComplete(tournament: Tournament): boolean {
  const finalRound = tournament.rounds[tournament.rounds.length - 1];
  return !!finalRound?.matchups[0]?.winnerId;
}

/**
 * Records the outcome of a played matchup and advances the bracket,
 * propagating the winner into the next round (and marking the tournament
 * complete if this was the final). Returns a new Tournament — does not
 * mutate the input.
 */
export function recordMatchResult(
  tournament: Tournament,
  roundIndex: number,
  matchupIndex: number,
  winnerId: string,
  matchId: string
): Tournament {
  const rounds: TournamentRound[] = tournament.rounds.map((round) => ({
    roundIndex: round.roundIndex,
    matchups: round.matchups.map((m) => ({ ...m })),
  }));

  const matchup = rounds[roundIndex]?.matchups[matchupIndex];
  if (!matchup) return tournament;
  // Defensive: only a player actually in this matchup can win it, and a
  // decided matchup can't be silently re-decided by a different match.
  // Currently unreachable through the app's own flows, but one navigation
  // change away from silent bracket corruption without these guards.
  if (winnerId !== matchup.playerAId && winnerId !== matchup.playerBId) return tournament;
  if (matchup.winnerId && matchup.matchId && matchup.matchId !== matchId) return tournament;

  matchup.winnerId = winnerId;
  matchup.matchId = matchId;
  matchup.isBye = false;

  propagate(rounds);

  const next: Tournament = { ...tournament, rounds };
  if (isTournamentComplete(next)) {
    next.status = 'completed';
    next.winnerId = next.rounds[next.rounds.length - 1].matchups[0].winnerId ?? null;
    next.completedAt = Date.now();
  }
  return next;
}
