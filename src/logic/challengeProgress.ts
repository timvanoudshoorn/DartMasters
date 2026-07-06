import { ChallengeDefinition, getDailyChallenges } from '../data/dailyChallenges';
import { BullOffStorage, MatchStorage, PlayerStorage } from '../storage/storage';

export interface ChallengeStatus {
  definition: ChallengeDefinition;
  progress: number;
  completed: boolean;
}

export interface DailyChallengeReport {
  playerId: string | null;
  solo: ChallengeStatus[];
  multiplayer: ChallengeStatus[];
  completedCount: number;
  totalCount: number;
}

function isSameDay(ts: number, ref: Date): boolean {
  const d = new Date(ts);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

export async function computeDailyChallengeReport(): Promise<DailyChallengeReport> {
  const [players, matches, bullOffs] = await Promise.all([
    PlayerStorage.getAll(),
    MatchStorage.getAll(),
    BullOffStorage.getAll(),
  ]);

  const primaryPlayer = players.length
    ? players.slice().sort((a, b) => a.createdAt - b.createdAt)[0]
    : null;
  const today = new Date();
  const { solo, multiplayer } = getDailyChallenges(today);

  const buildEmpty = (defs: ChallengeDefinition[]): ChallengeStatus[] =>
    defs.map((definition) => ({ definition, progress: 0, completed: false }));

  if (!primaryPlayer) {
    return {
      playerId: null,
      solo: buildEmpty(solo),
      multiplayer: buildEmpty(multiplayer),
      completedCount: 0,
      totalCount: solo.length + multiplayer.length,
    };
  }

  const todaysMatches = matches.filter((m) => isSameDay(m.date, today) && m.results[primaryPlayer.id]);
  const todaysBullOffs = bullOffs.filter((b) => isSameDay(b.date, today));
  const ctx = { matches: todaysMatches, bullOffs: todaysBullOffs, playerId: primaryPlayer.id };

  const evaluate = (defs: ChallengeDefinition[]): ChallengeStatus[] =>
    defs.map((definition) => {
      const progress = Math.min(definition.target, Math.max(0, definition.progress(ctx)));
      return { definition, progress, completed: progress >= definition.target };
    });

  const soloStatus = evaluate(solo);
  const mpStatus = evaluate(multiplayer);
  const completedCount =
    soloStatus.filter((s) => s.completed).length + mpStatus.filter((s) => s.completed).length;

  return {
    playerId: primaryPlayer.id,
    solo: soloStatus,
    multiplayer: mpStatus,
    completedCount,
    totalCount: soloStatus.length + mpStatus.length,
  };
}
