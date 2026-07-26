import { GameConfig, MatchRecord } from '../types';

/**
 * The guest/bot identity maps every finalizeMatch stores on its MatchRecord,
 * derived once from the config so all 8 game screens persist the same set —
 * including `guestAvatars`, which existed on the record type but was never
 * written by any screen (guest icon avatars degraded to initials in history).
 */
export function guestIdentityMaps(
  config: GameConfig
): Pick<MatchRecord, 'guestNames' | 'guestColors' | 'guestAvatars' | 'botPlayerIds'> {
  if (!config.guestPlayers) return {};
  const entries = Object.entries(config.guestPlayers);
  const botIds = entries.filter(([, g]) => g.isBot).map(([id]) => id);
  const avatarEntries = entries.flatMap(([id, g]) => (g.avatar ? [[id, g.avatar] as [string, string]] : []));
  return {
    guestNames: Object.fromEntries(entries.map(([id, g]) => [id, g.name])),
    guestColors: Object.fromEntries(entries.map(([id, g]) => [id, g.color])),
    guestAvatars: avatarEntries.length ? Object.fromEntries(avatarEntries) : undefined,
    botPlayerIds: botIds.length ? botIds : undefined,
  };
}
