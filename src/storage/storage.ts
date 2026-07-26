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
  /** Epoch ms of the last successful export via BackupRestoreScreen; null until the first export. */
  lastBackupAt: number | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultOutMode: 'double',
  defaultInMode: 'straight',
  defaultLegsToWin: 3,
  defaultSetsToWin: 1,
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotionEnabled: false,
  lastBackupAt: null,
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

// Solo "Checkout Trainer" drill — tracks only a best-streak high score per
// player, separate from match history and player stats.
//
// Shape history: originally a single global number under
// CHECKOUT_TRAINER_BEST_KEY, shared across every profile on the device (a
// bug — every other stat in the app is keyed per-player). Now a
// `Record<playerId, number>` blob under the *same* key (simplest migration:
// no new key to introduce, and `readJson`'s try/catch already treats a
// pre-existing raw number as unparseable-as-the-new-shape... actually it
// would parse fine as JSON but produce the wrong TS shape, so we guard
// explicitly below instead of relying on that).
//
// Migration: on first read, if the stored value under the key is still the
// old shape (a plain number, from before this change), it's carried forward
// under a reserved `LEGACY_FALLBACK_FIELD` inside the new blob rather than
// discarded outright — so every player who doesn't yet have their own
// per-player entry can still fall back to it, not just whichever player
// happens to read first. This is intentionally generous (every un-migrated
// player starts from the old shared best) rather than strict, because the
// alternative (resetting everyone to 0) is a silent regression a player
// would experience as "my best streak got deleted." Once a specific player
// has their own real entry (after any `setBest` call for them), that
// player's own value always wins over the legacy fallback and the legacy
// field is never consulted again for that player — but it's left in place
// (not deleted) so other, not-yet-migrated players can still use it. The
// old key is reused rather than retired to avoid adding a second key naming
// scheme to this file. `LEGACY_FALLBACK_FIELD` is a bracket-prefixed
// sentinel that real `Player.id` values (uuid-shaped strings elsewhere in
// this file) will never collide with.
const LEGACY_FALLBACK_FIELD = '__legacyGlobalBest__';

interface CheckoutTrainerBestBlob {
  [playerId: string]: number;
}

function isLegacyGlobalNumber(raw: unknown): raw is number {
  return typeof raw === 'number';
}

export const CheckoutTrainerStorage = {
  /** Best streak for a specific player. Falls back to the pre-migration
   * global best (until that player sets their own value) rather than
   * silently resetting to 0. */
  async getBest(playerId: string): Promise<number> {
    const raw = await readJson<CheckoutTrainerBestBlob | number>(CHECKOUT_TRAINER_BEST_KEY, {});

    if (isLegacyGlobalNumber(raw)) {
      // Pure legacy shape still on disk (no player has migrated yet) —
      // every player starts from it.
      return raw;
    }

    if (playerId in raw) return raw[playerId];
    if (LEGACY_FALLBACK_FIELD in raw) return raw[LEGACY_FALLBACK_FIELD];
    return 0;
  },
  async setBest(playerId: string, best: number): Promise<void> {
    const raw = await readJson<CheckoutTrainerBestBlob | number>(CHECKOUT_TRAINER_BEST_KEY, {});
    const blob: CheckoutTrainerBestBlob = isLegacyGlobalNumber(raw)
      ? { [LEGACY_FALLBACK_FIELD]: raw }
      : { ...raw };
    blob[playerId] = best;
    await writeJson(CHECKOUT_TRAINER_BEST_KEY, blob);
  },
};
