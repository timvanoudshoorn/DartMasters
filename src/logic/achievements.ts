import { IconName } from '../components/icons/Icon';
import { GameType, MatchRecord } from '../types';
import { aggregateCareerStats, CareerStats, computeWinStreak } from './stats';

/** Every game mode the app currently supports — used by the "play them all" achievement. */
const ALL_GAME_TYPES: GameType[] = [
  '501',
  '301',
  '201',
  'cricket',
  'aroundTheClock',
  'killer',
  'shanghai',
  'practice170',
  'bobs27',
];

export interface AchievementContext {
  /** Matches involving this player only. */
  matches: MatchRecord[];
  playerId: string;
  career: CareerStats;
  winStreak: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  target: number;
  /** Returns raw progress toward `target` (unclamped — computeAchievements clamps it). */
  getProgress: (ctx: AchievementContext) => number;
}

export interface AchievementStatus {
  definition: AchievementDefinition;
  progress: number;
  earned: boolean;
}

function killerEliminations(ctx: AchievementContext): number {
  return ctx.matches
    .filter((m) => m.gameType === 'killer')
    .reduce((sum, m) => sum + (m.results[ctx.playerId]?.eliminationsCount ?? 0), 0);
}

function cutThroatWins(ctx: AchievementContext): number {
  return ctx.matches.filter(
    (m) => m.gameType === 'cricket' && m.cutThroat && m.winnerId === ctx.playerId
  ).length;
}

function distinctGameTypesPlayed(ctx: AchievementContext): number {
  return new Set(ctx.matches.map((m) => m.gameType)).size;
}

/** Best (lowest) leg-darts count achieved, or Infinity if none recorded yet. */
function bestLegDarts(ctx: AchievementContext): number {
  return ctx.career.bestLegDarts ?? Infinity;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-win',
    title: 'First Blood',
    description: 'Win your first match.',
    icon: 'trophy',
    target: 1,
    getProgress: (ctx) => ctx.career.gamesWon,
  },
  {
    id: 'ten-wins',
    title: 'Proven Winner',
    description: 'Win 10 matches.',
    icon: 'medal',
    target: 10,
    getProgress: (ctx) => ctx.career.gamesWon,
  },
  {
    id: 'fifty-legs',
    title: 'Marathon',
    description: 'Play 50 legs.',
    icon: 'clock',
    target: 50,
    getProgress: (ctx) => ctx.career.legsPlayed,
  },
  {
    id: 'hundred-legs',
    title: 'Iron Arm',
    description: 'Play 100 legs.',
    icon: 'shield',
    target: 100,
    getProgress: (ctx) => ctx.career.legsPlayed,
  },
  {
    id: 'first-180',
    title: 'Maximum!',
    description: 'Throw your first 180.',
    icon: 'bolt',
    target: 1,
    getProgress: (ctx) => ctx.career.oneEighties,
  },
  {
    id: 'ten-180s',
    title: 'Big Gun',
    description: 'Throw 10 maximums.',
    icon: 'flame',
    target: 10,
    getProgress: (ctx) => ctx.career.oneEighties,
  },
  {
    id: 'ton-plus',
    title: 'Ton Up',
    description: 'Score a 100+ visit.',
    icon: 'target',
    target: 1,
    getProgress: (ctx) => ctx.career.count100Plus,
  },
  {
    id: 'big-fish',
    title: 'Big Fish',
    description: 'Hit a checkout of 100 or more.',
    icon: 'crosshair',
    target: 1,
    getProgress: (ctx) => (ctx.career.highestCheckout >= 100 ? 1 : 0),
  },
  {
    id: 'nine-darter',
    title: 'Perfect Leg',
    description: 'Win a leg in 9 darts.',
    icon: 'star',
    target: 1,
    getProgress: (ctx) => (bestLegDarts(ctx) <= 9 ? 1 : 0),
  },
  {
    id: 'win-streak-3',
    title: 'On Fire',
    description: 'Win 3 matches in a row.',
    icon: 'pulse',
    target: 3,
    getProgress: (ctx) => ctx.winStreak,
  },
  {
    id: 'win-streak-5',
    title: 'Unstoppable',
    description: 'Win 5 matches in a row.',
    icon: 'rocket',
    target: 5,
    getProgress: (ctx) => ctx.winStreak,
  },
  {
    id: 'killer-first-blood',
    title: 'Regicide',
    description: 'Eliminate an opponent in Killer.',
    icon: 'skull',
    target: 1,
    getProgress: killerEliminations,
  },
  {
    id: 'killer-instinct',
    title: 'Killer Instinct',
    description: 'Eliminate 10 opponents in Killer.',
    icon: 'crown',
    target: 10,
    getProgress: killerEliminations,
  },
  {
    id: 'cutthroat-champion',
    title: 'Cutthroat Champion',
    description: 'Win a Cut-Throat Cricket match.',
    icon: 'dartboard',
    target: 1,
    getProgress: cutThroatWins,
  },
  {
    id: 'jack-of-all-trades',
    title: 'Jack of All Trades',
    description: 'Play every game mode at least once.',
    icon: 'compass',
    target: ALL_GAME_TYPES.length,
    getProgress: distinctGameTypesPlayed,
  },
];

export function computeAchievements(matches: MatchRecord[], playerId: string): AchievementStatus[] {
  const relevant = matches.filter((m) => m.results[playerId]);
  const career = aggregateCareerStats(relevant, playerId);
  const winStreak = computeWinStreak(relevant, playerId);
  const ctx: AchievementContext = { matches: relevant, playerId, career, winStreak };

  return ACHIEVEMENTS.map((definition) => {
    const raw = definition.getProgress(ctx);
    const progress = Math.min(definition.target, Math.max(0, raw));
    return { definition, progress, earned: progress >= definition.target };
  });
}
