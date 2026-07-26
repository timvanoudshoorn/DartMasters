import AsyncStorage from '@react-native-async-storage/async-storage';

// Additive storage namespace: user-settable goal targets per player, kept
// entirely separate from PlayerStorage/MatchStorage so existing data shapes
// are never touched. Goals are purely aspirational numbers the player types
// in — progress toward them is always derived live from match history.

const PLAYER_GOALS_KEY = '@dartmasters/playerGoals';

export interface PlayerGoals {
  /** Target 3-dart average across X01 matches. */
  targetThreeDartAvg?: number;
  /** Target checkout percentage (0-100) across X01 matches. */
  targetCheckoutPercent?: number;
  /** Target highest checkout to hit in a single match. */
  targetHighestCheckout?: number;
}

type PlayerGoalsMap = { [playerId: string]: PlayerGoals };

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

export const GoalsStorage = {
  async getForPlayer(playerId: string): Promise<PlayerGoals> {
    const all = await readJson<PlayerGoalsMap>(PLAYER_GOALS_KEY, {});
    return all[playerId] ?? {};
  },
  async setForPlayer(playerId: string, goals: PlayerGoals): Promise<void> {
    const all = await readJson<PlayerGoalsMap>(PLAYER_GOALS_KEY, {});
    all[playerId] = goals;
    await writeJson(PLAYER_GOALS_KEY, all);
  },
};
