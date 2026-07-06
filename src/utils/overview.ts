import { computeWinStreak } from '../logic/stats';
import { MatchRecord, Player } from '../types';

export interface HomeOverview {
  primaryPlayer: Player | null;
  matches: number;
  winRate: number;
  streak: number;
}

export function computeHomeOverview(players: Player[], matches: MatchRecord[]): HomeOverview {
  const primaryPlayer = players.length
    ? players.slice().sort((a, b) => a.createdAt - b.createdAt)[0]
    : null;

  if (!primaryPlayer) {
    return { primaryPlayer: null, matches: 0, winRate: 0, streak: 0 };
  }

  const relevant = matches.filter((m) => m.results[primaryPlayer.id]);
  const wins = relevant.filter((m) => m.winnerId === primaryPlayer.id).length;

  return {
    primaryPlayer,
    matches: relevant.length,
    winRate: relevant.length > 0 ? Math.round((wins / relevant.length) * 100) : 0,
    streak: computeWinStreak(matches, primaryPlayer.id),
  };
}
