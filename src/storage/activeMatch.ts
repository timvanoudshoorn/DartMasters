import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameConfig, GameType } from '../types';
import { getGameModeInfo } from '../data/gameModes';

const ACTIVE_MATCH_KEY = '@dartmasters/activeMatch';

export interface ActiveMatchPointer {
  config: GameConfig;
  startedAt: number;
}

export const ActiveMatchStorage = {
  async get(): Promise<ActiveMatchPointer | null> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_MATCH_KEY);
      return raw ? (JSON.parse(raw) as ActiveMatchPointer) : null;
    } catch {
      return null;
    }
  },
  async set(config: GameConfig): Promise<void> {
    await AsyncStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify({ config, startedAt: Date.now() }));
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(ACTIVE_MATCH_KEY);
  },
};

export function describeActiveMatch(gameType: GameType): { title: string; subtitle: string } {
  const info = getGameModeInfo(gameType);
  return { title: info.title, subtitle: info.subtitle };
}
