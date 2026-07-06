import { getCheckoutSuggestion } from '../data/checkoutTable';
import { Dart, dartValue, InMode, isDoubleHit, isMasterHit, OutMode, X01Visit } from '../types';

export interface DartOutcome {
  remainingAfter: number;
  scoreApplied: number;
  bust: boolean;
  checkout: boolean;
  opensNow: boolean;
  visitEnds: boolean;
  gated: boolean; // dart didn't count because double-in hasn't been satisfied yet
}

export function evaluateDart(
  liveRemaining: number,
  dart: Dart,
  outMode: OutMode,
  inMode: InMode,
  alreadyOpened: boolean
): DartOutcome {
  const needsToOpen = inMode === 'double' && !alreadyOpened;

  if (needsToOpen && !isDoubleHit(dart)) {
    return {
      remainingAfter: liveRemaining,
      scoreApplied: 0,
      bust: false,
      checkout: false,
      opensNow: false,
      visitEnds: false,
      gated: true,
    };
  }

  const value = dartValue(dart);
  const after = liveRemaining - value;

  if (after < 0) {
    return {
      remainingAfter: liveRemaining,
      scoreApplied: value,
      bust: true,
      checkout: false,
      opensNow: needsToOpen,
      visitEnds: true,
      gated: false,
    };
  }

  if (after === 0) {
    const validFinish =
      outMode === 'straight' ? true : outMode === 'double' ? isDoubleHit(dart) : isMasterHit(dart);
    if (validFinish) {
      return {
        remainingAfter: 0,
        scoreApplied: value,
        bust: false,
        checkout: true,
        opensNow: needsToOpen,
        visitEnds: true,
        gated: false,
      };
    }
    return {
      remainingAfter: liveRemaining,
      scoreApplied: value,
      bust: true,
      checkout: false,
      opensNow: needsToOpen,
      visitEnds: true,
      gated: false,
    };
  }

  if (outMode !== 'straight' && after === 1) {
    return {
      remainingAfter: liveRemaining,
      scoreApplied: value,
      bust: true,
      checkout: false,
      opensNow: needsToOpen,
      visitEnds: true,
      gated: false,
    };
  }

  return {
    remainingAfter: after,
    scoreApplied: value,
    bust: false,
    checkout: false,
    opensNow: needsToOpen,
    visitEnds: false,
    gated: false,
  };
}

export function isCheckoutAttemptFor(remaining: number): boolean {
  return getCheckoutSuggestion(remaining, 3) !== null;
}

export function buildVisit(
  playerId: string,
  startScore: number,
  darts: Dart[],
  finalRemaining: number,
  bust: boolean,
  checkout: boolean
): X01Visit {
  const scored = bust ? 0 : startScore - finalRemaining;
  return {
    playerId,
    startScore,
    scored,
    darts,
    dartsUsed: darts.length as 1 | 2 | 3,
    bust,
    checkout,
    isCheckoutAttempt: isCheckoutAttemptFor(startScore),
    oneEighty: !bust && scored === 180,
  };
}
