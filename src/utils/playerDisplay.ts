import { colors } from '../theme';
import { GameConfig, MatchRecord, Player } from '../types';

export interface PlayerDisplay {
  name: string;
  color: string;
  avatar?: string;
  photoUri?: string;
}

const FALLBACK: PlayerDisplay = { name: 'Player', color: colors.primary };

export function resolvePlayerDisplay(
  playerId: string,
  playersMap: Record<string, Player>,
  guestPlayers?: GameConfig['guestPlayers']
): PlayerDisplay {
  const stored = playersMap[playerId];
  if (stored) return { name: stored.name, color: stored.color, avatar: stored.avatar, photoUri: stored.photoUri };
  const guest = guestPlayers?.[playerId];
  if (guest) return { name: guest.name, color: guest.color, avatar: guest.avatar };
  return FALLBACK;
}

export function resolvePlayerDisplayFromMatch(
  playerId: string,
  playersMap: Record<string, Player>,
  match: MatchRecord
): PlayerDisplay {
  const stored = playersMap[playerId];
  if (stored) return { name: stored.name, color: stored.color, avatar: stored.avatar, photoUri: stored.photoUri };
  const name = match.guestNames?.[playerId];
  if (name) {
    return {
      name,
      color: match.guestColors?.[playerId] ?? colors.primary,
      avatar: match.guestAvatars?.[playerId],
    };
  }
  return FALLBACK;
}
