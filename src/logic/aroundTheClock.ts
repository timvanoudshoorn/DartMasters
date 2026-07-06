import { ATC_SEQUENCE, AtcPlayerState } from '../types';

const BULL_INDEX = ATC_SEQUENCE.length - 1; // index of 25 (bull) — the final target

export function createAtcPlayers(playerIds: string[]): AtcPlayerState[] {
  return playerIds.map((playerId) => ({
    playerId,
    targetIndex: 0,
    bullHits: 0,
    dartsThrown: 0,
    legsWon: 0,
    finished: false,
  }));
}

export type AtcThrow = 'hit' | 'double' | 'triple' | 'miss';

export function currentAtcTarget(state: AtcPlayerState): number {
  return ATC_SEQUENCE[Math.min(state.targetIndex, BULL_INDEX)];
}

export function applyAtcThrow(
  state: AtcPlayerState,
  throwType: AtcThrow,
  skipAheadMode: boolean
): AtcPlayerState {
  if (state.finished) return state;
  const dartsThrown = state.dartsThrown + 1;

  // Already at the bull: it can never be skipped past. A single bull banks
  // one of the two hits needed to finish; a double bull finishes immediately.
  if (state.targetIndex >= BULL_INDEX) {
    if (throwType === 'miss') {
      return { ...state, dartsThrown };
    }
    if (throwType === 'double') {
      return { ...state, targetIndex: BULL_INDEX, bullHits: 2, dartsThrown, finished: true };
    }
    // 'hit' (single) or 'triple' both bank one single-bull hit — there is no
    // skip-ahead beyond the bull, since it's the final target.
    const newBullHits = Math.min(2, state.bullHits + 1);
    return {
      ...state,
      targetIndex: BULL_INDEX,
      bullHits: newBullHits,
      dartsThrown,
      finished: newBullHits >= 2,
    };
  }

  if (throwType === 'miss') {
    return { ...state, dartsThrown };
  }

  const advance = skipAheadMode ? (throwType === 'hit' ? 1 : throwType === 'double' ? 2 : 3) : 1;
  // Never let a skip-ahead advance land past the bull — it can only be
  // reached one target at a time, never skipped into.
  const newIndex = Math.min(state.targetIndex + advance, BULL_INDEX);
  return { ...state, targetIndex: newIndex, dartsThrown };
}

export function atcBullProgress(state: AtcPlayerState): { needed: 2; hits: number } | null {
  if (state.targetIndex < BULL_INDEX) return null;
  return { needed: 2, hits: state.bullHits };
}
