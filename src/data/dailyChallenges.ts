import { BullOffResult } from '../storage/storage';
import { MatchRecord } from '../types';

export type ChallengeCategory = 'solo' | 'multiplayer';

export interface ChallengeEvalContext {
  matches: MatchRecord[]; // already filtered to "today" for this playerId
  bullOffs: BullOffResult[]; // already filtered to "today"
  playerId: string;
}

export interface ChallengeDefinition {
  id: string;
  category: ChallengeCategory;
  title: string;
  target: number;
  progress: (ctx: ChallengeEvalContext) => number; // 0..target
}

function isX01(m: MatchRecord): boolean {
  return m.gameType === '501' || m.gameType === '301' || m.gameType === '201';
}

const has = (b: boolean) => (b ? 1 : 0);

const SOLO_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'solo-180-501',
    category: 'solo',
    title: 'Hit a 180 in a 501 game',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => m.gameType === '501' && (m.results[playerId]?.oneEighties ?? 0) > 0)),
  },
  {
    id: 'solo-leg-under-20',
    category: 'solo',
    title: 'Win a leg in under 20 darts',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some((m) => {
          const r = m.results[playerId];
          return !!r && r.bestLegDarts !== null && r.bestLegDarts <= 19;
        })
      ),
  },
  {
    id: 'solo-finish-double',
    category: 'solo',
    title: 'Finish on a double',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => m.outMode === 'double' && (m.results[playerId]?.checkoutHits ?? 0) > 0)),
  },
  {
    id: 'solo-3-tons',
    category: 'solo',
    title: 'Hit 3 ton-plus scores in one game (100+)',
    target: 3,
    progress: ({ matches, playerId }) =>
      Math.min(3, matches.reduce((max, m) => Math.max(max, m.results[playerId]?.count100Plus ?? 0), 0)),
  },
  {
    id: 'solo-complete-atc',
    category: 'solo',
    title: 'Complete an Around the Clock game',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => m.gameType === 'aroundTheClock' && !!m.results[playerId]?.isWinner)),
  },
  {
    id: 'solo-avg-60',
    category: 'solo',
    title: 'Achieve a 3-dart average above 60',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => isX01(m) && (m.results[playerId]?.threeDartAvg ?? 0) > 60)),
  },
  {
    id: 'solo-checkout-100',
    category: 'solo',
    title: 'Hit a checkout of 100 or more',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => (m.results[playerId]?.highestCheckout ?? 0) >= 100)),
  },
  {
    id: 'solo-bull-off-hit',
    category: 'solo',
    title: 'Hit the bull in a bull off',
    target: 1,
    progress: ({ bullOffs, playerId }) => has(bullOffs.some((b) => b.winnerId === playerId)),
  },
  {
    id: 'solo-170-checkout',
    category: 'solo',
    title: 'Complete a 170 checkout',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => m.gameType === 'practice170' && (m.results[playerId]?.checkoutHits ?? 0) > 0)),
  },
  {
    id: 'solo-bobs27-positive',
    category: 'solo',
    title: "Win Bob's 27 with a positive score",
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some(
          (m) => m.gameType === 'bobs27' && !!m.results[playerId]?.isWinner && m.results[playerId]!.totalScored > 0
        )
      ),
  },
  {
    id: 'solo-5-doubles',
    category: 'solo',
    title: 'Hit 5 doubles in one game',
    target: 5,
    progress: ({ matches, playerId }) =>
      Math.min(5, matches.reduce((max, m) => Math.max(max, m.results[playerId]?.doublesHit ?? 0), 0)),
  },
  {
    id: 'solo-atc-no-miss',
    category: 'solo',
    title: 'Complete Around the Clock without missing',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some(
          (m) =>
            m.gameType === 'aroundTheClock' &&
            !!m.results[playerId]?.isWinner &&
            (m.results[playerId]?.missCount ?? 1) === 0
        )
      ),
  },
];

const MULTIPLAYER_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'mp-beat-501-under-20',
    category: 'multiplayer',
    title: 'Beat an opponent in 501 in under 20 darts',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some((m) => {
          const r = m.results[playerId];
          return (
            m.gameType === '501' &&
            (m.startingScore ?? 501) === 501 &&
            m.playerIds.length >= 2 &&
            !!r?.isWinner &&
            r.bestLegDarts !== null &&
            r.bestLegDarts <= 19
          );
        })
      ),
  },
  {
    id: 'mp-cricket-no-loss',
    category: 'multiplayer',
    title: 'Win a Cricket game without losing a single segment',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some((m) => {
          const r = m.results[playerId];
          return m.gameType === 'cricket' && m.playerIds.length >= 2 && !!r?.isWinner && (r.marksPerRound ?? 0) >= 3;
        })
      ),
  },
  {
    id: 'mp-killer-eliminate',
    category: 'multiplayer',
    title: 'Eliminate a player in Killer',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some(
          (m) => m.gameType === 'killer' && m.playerIds.length >= 2 && (m.results[playerId]?.eliminationsCount ?? 0) > 0
        )
      ),
  },
  {
    id: 'mp-leg-100-checkout',
    category: 'multiplayer',
    title: 'Win a leg with a 100+ checkout against an opponent',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some((m) => {
          const r = m.results[playerId];
          return isX01(m) && m.playerIds.length >= 2 && !!r?.isWinner && r.highestCheckout >= 100;
        })
      ),
  },
  {
    id: 'mp-beat-a-killer',
    category: 'multiplayer',
    title: 'Beat an opponent who is already a killer',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some(
          (m) =>
            m.gameType === 'killer' &&
            m.winnerId === playerId &&
            (m.killerEverPlayerIds ?? []).some((id) => id !== playerId)
        )
      ),
  },
  {
    id: 'mp-2-legs-in-a-row',
    category: 'multiplayer',
    title: 'Win 2 legs in a row against an opponent',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(
        matches.some((m) => {
          if (m.playerIds.length < 2) return false;
          const history = m.legWinnerHistory ?? [];
          for (let i = 1; i < history.length; i++) {
            if (history[i] === playerId && history[i - 1] === playerId) return true;
          }
          return false;
        })
      ),
  },
  {
    id: 'mp-outscore-every-round',
    category: 'multiplayer',
    title: 'Hit a higher score than your opponent in every round of a game',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => m.playerIds.length === 2 && !!m.results[playerId]?.outscoredEveryRound)),
  },
  {
    id: 'mp-win-shanghai',
    category: 'multiplayer',
    title: 'Win a Shanghai game',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => m.gameType === 'shanghai' && m.playerIds.length >= 2 && !!m.results[playerId]?.isWinner)),
  },
  {
    id: 'mp-bull-off-win',
    category: 'multiplayer',
    title: 'Complete a bull off win',
    target: 1,
    progress: ({ bullOffs, playerId }) =>
      has(bullOffs.some((b) => b.winnerId === playerId && b.playerIds.length >= 2)),
  },
  {
    id: 'mp-killer-survivor',
    category: 'multiplayer',
    title: 'Win a game of Killer as the last survivor',
    target: 1,
    progress: ({ matches, playerId }) =>
      has(matches.some((m) => m.gameType === 'killer' && m.playerIds.length >= 2 && !!m.results[playerId]?.isWinner)),
  },
];

function dateSeed(date: Date): number {
  const key = `${date.getFullYear()}${date.getMonth()}${date.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededPick<T>(pool: T[], count: number, seed: number): T[] {
  const arr = [...pool];
  let s = seed || 1;
  const next = () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function getDailyChallenges(date: Date = new Date()): {
  solo: ChallengeDefinition[];
  multiplayer: ChallengeDefinition[];
} {
  const seed = dateSeed(date);
  return {
    solo: seededPick(SOLO_CHALLENGES, 3, seed),
    multiplayer: seededPick(MULTIPLAYER_CHALLENGES, 3, seed + 1),
  };
}
