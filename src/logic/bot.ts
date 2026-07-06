import { getCheckoutSuggestion } from '../data/checkoutTable';
import { AtcThrow } from './aroundTheClock';
import { BotDifficulty, CricketMarks, Dart, dartValue, KillerPlayerState, Multiplier, OutMode } from '../types';

export interface BotProfile {
  label: string;
  avgTarget: number; // approximate 3-dart average this difficulty plays to
  skill: number; // 0..1 overall accuracy/shot-selection bias
  doubleAccuracy: number; // 0..1 chance of converting an attempted double
}

export const BOT_PROFILES: Record<BotDifficulty, BotProfile> = {
  beginner: { label: 'Beginner', avgTarget: 40, skill: 0.18, doubleAccuracy: 0.2 },
  amateur: { label: 'Amateur', avgTarget: 60, skill: 0.38, doubleAccuracy: 0.35 },
  intermediate: { label: 'Intermediate', avgTarget: 80, skill: 0.58, doubleAccuracy: 0.5 },
  pro: { label: 'Pro', avgTarget: 100, skill: 0.76, doubleAccuracy: 0.65 },
  legend: { label: 'Legend', avgTarget: 120, skill: 0.92, doubleAccuracy: 0.8 },
};

export const BOT_DIFFICULTIES: BotDifficulty[] = ['beginner', 'amateur', 'intermediate', 'pro', 'legend'];

function chance(p: number): boolean {
  return Math.random() < p;
}

const DARTBOARD_NEIGHBORS: Record<number, [number, number]> = {
  20: [1, 5], 1: [18, 20], 18: [1, 4], 4: [18, 13], 13: [4, 6], 6: [13, 10], 10: [6, 15], 15: [10, 2],
  2: [15, 17], 17: [2, 3], 3: [17, 19], 19: [3, 7], 7: [19, 16], 16: [7, 8], 8: [16, 11], 11: [8, 14],
  14: [11, 9], 9: [14, 12], 12: [9, 5], 5: [12, 20],
};

function neighborOf(segment: number): number {
  const pair = DARTBOARD_NEIGHBORS[segment];
  if (!pair) return segment;
  return pair[Math.floor(Math.random() * 2)];
}

function parseCheckoutLabel(label: string): Dart {
  if (label === 'Bull') return { segment: 25, multiplier: 2 };
  const prefix = label[0];
  const multiplier: Multiplier = prefix === 'T' ? 3 : prefix === 'D' ? 2 : 1;
  const segment = parseInt(label.slice(1), 10);
  return { segment, multiplier };
}

const X01_DART_POOL: Dart[] = [
  { segment: 0, multiplier: 1 },
  { segment: 5, multiplier: 1 },
  { segment: 10, multiplier: 1 },
  { segment: 14, multiplier: 1 },
  { segment: 18, multiplier: 1 },
  { segment: 19, multiplier: 1 },
  { segment: 20, multiplier: 1 },
  { segment: 5, multiplier: 2 },
  { segment: 10, multiplier: 2 },
  { segment: 16, multiplier: 2 },
  { segment: 20, multiplier: 2 },
  { segment: 14, multiplier: 3 },
  { segment: 19, multiplier: 3 },
  { segment: 20, multiplier: 3 },
  { segment: 25, multiplier: 1 },
  { segment: 25, multiplier: 2 },
];

function weightedPick(pool: Dart[], skill: number): Dart {
  const exponent = 1 + skill * 4;
  const weights = pool.map((d) => Math.pow(dartValue(d) + 1, exponent));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Decide a single X01 dart for the bot, given the live remaining score and darts left in the visit. */
export function decideX01Dart(
  remaining: number,
  dartsLeft: 1 | 2 | 3,
  _outMode: OutMode,
  profile: BotProfile
): Dart {
  const combo = getCheckoutSuggestion(remaining, dartsLeft);
  if (combo) {
    const intended = parseCheckoutLabel(combo[0]);
    const isDoubleDart = intended.multiplier === 2;
    const successChance = isDoubleDart ? profile.doubleAccuracy : Math.min(0.95, profile.skill + 0.25);
    if (chance(successChance)) return intended;
    if (isDoubleDart) {
      return chance(0.55) ? { segment: intended.segment, multiplier: 1 } : { segment: 0, multiplier: 1 };
    }
    return { segment: neighborOf(intended.segment), multiplier: 1 };
  }
  return weightedPick(X01_DART_POOL, profile.skill);
}

const CRICKET_TARGET_ORDER = [20, 19, 18, 17, 16, 15, 25];

export function decideCricketThrow(
  myMarks: CricketMarks,
  profile: BotProfile
): { target: number | null; multiplier: Multiplier } {
  const open = CRICKET_TARGET_ORDER.filter((t) => (myMarks[t] || 0) < 3);
  const pool = open.length ? open : CRICKET_TARGET_ORDER;
  const biasedIndex = Math.min(pool.length - 1, Math.floor((1 - profile.skill) * pool.length * Math.random()));
  const intendedTarget = pool[biasedIndex];

  const hitChance = Math.min(0.92, 0.3 + profile.skill * 0.6);
  if (!chance(hitChance)) {
    return chance(0.5) ? { target: null, multiplier: 1 } : { target: intendedTarget, multiplier: 1 };
  }

  const r = Math.random();
  let multiplier: Multiplier = r < profile.skill * 0.5 ? 3 : r < profile.skill * 0.5 + 0.25 ? 2 : 1;
  if (intendedTarget === 25) multiplier = Math.min(2, multiplier) as Multiplier;
  return { target: intendedTarget, multiplier };
}

export function decideAtcThrow(profile: BotProfile): AtcThrow {
  const hitChance = Math.min(0.95, 0.45 + profile.skill * 0.5);
  if (!chance(hitChance)) return 'miss';
  const r = Math.random();
  if (r < profile.skill * 0.5) return 'triple';
  if (r < profile.skill * 0.5 + 0.3) return 'double';
  return 'hit';
}

export function decideKillerClaim(unclaimedNumbers: number[]): number {
  return unclaimedNumbers[Math.floor(Math.random() * unclaimedNumbers.length)];
}

export function decideKillerThrow(
  self: KillerPlayerState,
  allPlayers: KillerPlayerState[],
  profile: BotProfile
): { hitPlayerId: string | null; multiplier: Multiplier } {
  const hitChance = Math.min(0.92, 0.35 + profile.skill * 0.55);
  if (!chance(hitChance)) return { hitPlayerId: null, multiplier: 1 };

  let targetId: string;
  if (self.isKiller) {
    const targets = allPlayers.filter((p) => p.playerId !== self.playerId && !p.eliminated);
    if (targets.length === 0) return { hitPlayerId: null, multiplier: 1 };
    const sorted = [...targets].sort((a, b) => a.lives - b.lives);
    targetId = chance(profile.skill) ? sorted[0].playerId : targets[Math.floor(Math.random() * targets.length)].playerId;
  } else {
    targetId = self.playerId;
  }

  const r = Math.random();
  const multiplier: Multiplier = r < profile.skill * 0.45 ? 3 : r < profile.skill * 0.45 + 0.3 ? 2 : 1;
  return { hitPlayerId: targetId, multiplier };
}

export function decideShanghaiDart(profile: BotProfile): Multiplier | null {
  const hitChance = Math.min(0.92, 0.4 + profile.skill * 0.5);
  if (!chance(hitChance)) return null;
  const r = Math.random();
  if (r < profile.skill * 0.4) return 3;
  if (r < profile.skill * 0.4 + 0.3) return 2;
  return 1;
}
