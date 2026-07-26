import { GameType } from '../types';

export interface GameModeRules {
  /** Short paragraphs or bullet-style lines explaining how a round/turn plays out. */
  howToPlay: string[];
  /** One-line summary of the win condition. */
  howToWin: string;
}

export const GAME_RULES: Record<GameType, GameModeRules> = {
  '501': {
    howToPlay: [
      'Every player starts at 501 and takes turns throwing 3 darts per visit. Each dart’s score is subtracted from your remaining total.',
      'By default you can start scoring straight away (straight-in), but your setup may require you to hit a double before darts start counting (double-in).',
      'You must finish on exactly zero. Depending on the out mode, the final dart must land on a double, a double or triple (master out), or any segment (straight out).',
      'Go below zero, land on exactly 1 with a double/master out in play, or miss the required finish and the whole visit busts — your score resets to what it was before that turn.',
    ],
    howToWin: 'First player to reduce their score to exactly zero with a valid finish wins the leg.',
  },
  '301': {
    howToPlay: [
      'Identical to 501, just a shorter race: everyone starts at 301 instead of 501.',
      'Straight-in or double-in and double/master/straight-out all work the same way — whatever the match is set to.',
      'Bust the same way: go below zero, leave exactly 1 under a double/master out, or miss the required finish and the visit is voided.',
    ],
    howToWin: 'First player to reduce their score to exactly zero with a valid finish wins the leg.',
  },
  '201': {
    howToPlay: [
      'The sprint version of X01 — everyone starts at just 201, so legs are over fast.',
      'Same scoring, bust, and checkout rules as 501/301, governed by the match’s in/out mode.',
    ],
    howToWin: 'First player to reduce their score to exactly zero with a valid finish wins the leg.',
  },
  cricket: {
    howToPlay: [
      'Only 20, 19, 18, 17, 16, 15 and Bull are in play. Each number needs 3 marks to “close” — a single counts 1 mark, a double 2, a triple 3.',
      'Once you’ve closed a number, any further hits on it score points equal to the segment value (unless every opponent has also closed it, in which case it just sits dead).',
      'In standard Cricket, points you score go to your own total. In Cut-Throat, the twist reverses: your extra hits are added to every opponent who hasn’t closed that number yet, so you want to close numbers fast and avoid feeding your rivals.',
    ],
    howToWin: 'Close all 7 numbers/Bull first. In standard Cricket you also need the highest score; in Cut-Throat you need the lowest.',
  },
  aroundTheClock: {
    howToPlay: [
      'Work through the numbers 1 to 20 in order, then finish on Bull. You must hit your current target to advance — anything else is a wasted dart.',
      'In the standard variant, any hit on the current number (single, double, or triple) advances you to the next one.',
      'In the skip-ahead variant, a single moves you forward 1 number, a double moves you forward 2, and a triple moves you forward 3.',
      'Once you reach Bull it can’t be skipped past: a single bull banks one of the two hits you need, and a double bull finishes you outright.',
    ],
    howToWin: 'First player to work all the way around to Bull (2 single-bull hits or 1 double bull) wins.',
  },
  killer: {
    howToPlay: [
      'Each player is assigned their own number (1–20) in a bull-off or manual pick. Hitting your own number scores you lives — a single is 1 life, a double 2, a triple 3, up to the match’s max lives.',
      'Reach the max life count and you become a Killer. Only Killers can take lives away from opponents by hitting their number — a single removes 1 life, a double 2, a triple 3.',
      'Dropping below the max life count immediately strips a player’s Killer status, even mid-match. Lose all your lives and you’re eliminated.',
    ],
    howToWin: 'Last player left with lives remaining wins.',
  },
  shanghai: {
    howToPlay: [
      'Each round targets one number, starting at 1 and climbing (through however many rounds the match is set for). Every dart on the round’s number scores segment × multiplier; misses and other numbers score nothing.',
      'Land a single, a double, and a triple on the same number in the same visit — a “Shanghai” — and you win the game instantly, regardless of score.',
    ],
    howToWin: 'Hit a Shanghai (single + double + triple on the round’s number in one visit) for an instant win, or have the highest score when the rounds run out.',
  },
  practice170: {
    howToPlay: [
      'A checkout drill: every player races down from a shared 170, taking turns at the same running total rather than each having their own score.',
      'Darts count straight away and the finish must land on a double, exactly like double-out X01. Busting (going below zero, leaving 1, or missing the required double) voids that visit and the shared total stays where it was.',
    ],
    howToWin: 'First player to check out the shared 170 with a valid double finish wins the leg.',
  },
  bobs27: {
    howToPlay: [
      'A doubles-only drill across 20 rounds. Round 1 targets Double 1, round 2 targets Double 2, and so on up to Double 20.',
      'Hit the round’s double and you gain points equal to double the round number (e.g. Double 5 hit = +10); miss it entirely with all 3 darts and you lose that same amount instead.',
      'You start on 27 points, hence the name.',
    ],
    howToWin: 'Highest score after all 20 rounds wins.',
  },
};
