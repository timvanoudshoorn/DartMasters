import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament, TournamentMatchContext } from '../types';

const TOURNAMENTS_KEY = '@dartmasters/tournaments';
const PENDING_TOURNAMENT_MATCH_KEY = '@dartmasters/pendingTournamentMatch';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const TournamentStorage = {
  async getAll(): Promise<Tournament[]> {
    return readJson<Tournament[]>(TOURNAMENTS_KEY, []);
  },
  async get(tournamentId: string): Promise<Tournament | null> {
    const all = await TournamentStorage.getAll();
    return all.find((t) => t.id === tournamentId) ?? null;
  },
  async save(tournament: Tournament): Promise<void> {
    const all = await TournamentStorage.getAll();
    const idx = all.findIndex((t) => t.id === tournament.id);
    if (idx >= 0) all[idx] = tournament;
    else all.unshift(tournament);
    await writeJson(TOURNAMENTS_KEY, all);
  },
  async remove(tournamentId: string): Promise<void> {
    const all = await TournamentStorage.getAll();
    await writeJson(TOURNAMENTS_KEY, all.filter((t) => t.id !== tournamentId));
  },
};

/**
 * Points at the tournament matchup currently being played through the
 * normal Game/GameSummary flow. This is the hook that lets GameSummaryScreen
 * report a match result back into a tournament without the per-mode game
 * screens (X01GameScreen, CricketGameScreen, ...) needing to know
 * tournaments exist at all — they just finish a normal match as always.
 */
export const PendingTournamentMatchStorage = {
  async get(): Promise<TournamentMatchContext | null> {
    return readJson<TournamentMatchContext | null>(PENDING_TOURNAMENT_MATCH_KEY, null);
  },
  async set(context: TournamentMatchContext): Promise<void> {
    await AsyncStorage.setItem(PENDING_TOURNAMENT_MATCH_KEY, JSON.stringify(context));
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_TOURNAMENT_MATCH_KEY);
  },
};
