import AsyncStorage from '@react-native-async-storage/async-storage';
import { InMode, MatchRecord, OutMode, Player } from '../types';

const PLAYERS_KEY = '@dartmasters/players';
const MATCHES_KEY = '@dartmasters/matches';
const SETTINGS_KEY = '@dartmasters/settings';
const BULL_OFF_LOG_KEY = '@dartmasters/bullOffLog';
const CHECKOUT_TRAINER_BEST_KEY = '@dartmasters/checkoutTrainerBest';

export interface AppSettings {
  defaultOutMode: OutMode;
  defaultInMode: InMode;
  defaultLegsToWin: number;
  defaultSetsToWin: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotionEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultOutMode: 'double',
  defaultInMode: 'straight',
  defaultLegsToWin: 3,
  defaultSetsToWin: 1,
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotionEnabled: false,
};

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

export const PlayerStorage = {
  async getAll(): Promise<Player[]> {
    return readJson<Player[]>(PLAYERS_KEY, []);
  },
  async save(player: Player): Promise<void> {
    const players = await PlayerStorage.getAll();
    const idx = players.findIndex((p) => p.id === player.id);
    if (idx >= 0) players[idx] = player;
    else players.push(player);
    await writeJson(PLAYERS_KEY, players);
  },
  async remove(playerId: string): Promise<void> {
    const players = await PlayerStorage.getAll();
    await writeJson(PLAYERS_KEY, players.filter((p) => p.id !== playerId));
  },
};

export const MatchStorage = {
  async getAll(): Promise<MatchRecord[]> {
    return readJson<MatchRecord[]>(MATCHES_KEY, []);
  },
  async save(match: MatchRecord): Promise<void> {
    const matches = await MatchStorage.getAll();
    matches.unshift(match);
    await writeJson(MATCHES_KEY, matches);
  },
  async remove(matchId: string): Promise<void> {
    const matches = await MatchStorage.getAll();
    await writeJson(MATCHES_KEY, matches.filter((m) => m.id !== matchId));
  },
  async clear(): Promise<void> {
    await writeJson(MATCHES_KEY, []);
  },
};

export interface BullOffResult {
  winnerId: string;
  playerIds: string[];
  manual: boolean; // true = the player physically won a manual bull-off throw; false = randomly decided
  date: number;
}

export const BullOffStorage = {
  async getAll(): Promise<BullOffResult[]> {
    return readJson<BullOffResult[]>(BULL_OFF_LOG_KEY, []);
  },
  async record(result: BullOffResult): Promise<void> {
    const log = await BullOffStorage.getAll();
    log.unshift(result);
    await writeJson(BULL_OFF_LOG_KEY, log.slice(0, 200));
  },
};

export const SettingsStorage = {
  async get(): Promise<AppSettings> {
    const stored = await readJson<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...stored };
  },
  async save(settings: AppSettings): Promise<void> {
    await writeJson(SETTINGS_KEY, settings);
  },
  defaults: DEFAULT_SETTINGS,
};

// Solo "Checkout Trainer" drill — tracks only a best-streak high score,
// separate from match history and player stats.
export const CheckoutTrainerStorage = {
  async getBest(): Promise<number> {
    return readJson<number>(CHECKOUT_TRAINER_BEST_KEY, 0);
  },
  async setBest(best: number): Promise<void> {
    await writeJson(CHECKOUT_TRAINER_BEST_KEY, best);
  },
};
