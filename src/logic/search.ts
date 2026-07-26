import { getGameModeInfo } from '../data/gameModes';
import { MatchRecord, Player } from '../types';

export interface PlayerSearchResult {
  kind: 'player';
  player: Player;
}

export interface MatchSearchResult {
  kind: 'match';
  match: MatchRecord;
  /** Names of the participants, resolved for display (players + guests). */
  participantNames: string[];
}

export interface SearchResults {
  players: PlayerSearchResult[];
  matches: MatchSearchResult[];
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Resolves a display name for a participant of a match, falling back through
 * the players list then guest names stored directly on the match record. */
function resolveParticipantName(playerId: string, players: Player[], match: MatchRecord): string {
  const stored = players.find((p) => p.id === playerId);
  if (stored) return stored.name;
  const guestName = match.guestNames?.[playerId];
  if (guestName) return guestName;
  return 'Player';
}

/**
 * Pure, case-insensitive substring search across players (by name) and
 * matches (by game mode title or participant name). No fuzzy matching —
 * the local data set is small enough that a simple substring scan is
 * instant and predictable.
 */
export function searchAll(query: string, players: Player[], matches: MatchRecord[]): SearchResults {
  const q = normalize(query);
  if (!q) return { players: [], matches: [] };

  const playerResults: PlayerSearchResult[] = players
    .filter((p) => normalize(p.name).includes(q))
    .map((player) => ({ kind: 'player', player }));

  const matchResults: MatchSearchResult[] = matches
    .filter((m) => {
      const modeInfo = getGameModeInfo(m.gameType);
      if (normalize(modeInfo.title).includes(q)) return true;
      return m.playerIds.some((id) => normalize(resolveParticipantName(id, players, m)).includes(q));
    })
    .map((match) => ({
      kind: 'match',
      match,
      participantNames: match.playerIds.map((id) => resolveParticipantName(id, players, match)),
    }));

  return { players: playerResults, matches: matchResults };
}
