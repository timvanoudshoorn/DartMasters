// Backup & Restore — reads/writes every AsyncStorage-backed slice of app
// data through the existing storage modules only, so shapes round-trip
// exactly as those modules define them. Never touches AsyncStorage directly.

import { AppSettings, BullOffResult, BullOffStorage, CheckoutTrainerStorage, MatchStorage, PlayerStorage, SettingsStorage } from '../storage/storage';
import { TournamentStorage } from '../storage/tournament';
import { GoalsStorage, PlayerGoals } from '../storage/goals';
import { MatchRecord, Player, Tournament } from '../types';

export const BACKUP_VERSION = 2;

export interface BackupData {
  version: number;
  exportedAt: number;
  players: Player[];
  matches: MatchRecord[];
  settings: AppSettings;
  bullOffLog: BullOffResult[];
  /** Added in version 2; absent on older exports, treated as empty on import. */
  tournaments?: Tournament[];
  /** Added in version 2; keyed by player id, absent on older exports. */
  playerGoals?: { [playerId: string]: PlayerGoals };
  /** Added in version 2; Checkout Trainer per-player best-streak blob
   * (keyed by player id, plus a reserved legacy-fallback field), absent on
   * older exports. */
  checkoutTrainerBest?: { [playerId: string]: number };
}

const REQUIRED_KEYS: (keyof BackupData)[] = ['version', 'players', 'matches', 'settings', 'bullOffLog'];

/** Gathers every AsyncStorage-backed slice into a single JSON-serializable snapshot. */
export async function exportAllData(): Promise<BackupData> {
  const [players, matches, settings, bullOffLog, tournaments, checkoutTrainerBest] = await Promise.all([
    PlayerStorage.getAll(),
    MatchStorage.getAll(),
    SettingsStorage.get(),
    BullOffStorage.getAll(),
    TournamentStorage.getAll(),
    CheckoutTrainerStorage.getAllBest(),
  ]);

  const playerGoals: { [playerId: string]: PlayerGoals } = {};
  for (const player of players) {
    const goals = await GoalsStorage.getForPlayer(player.id);
    if (goals.targetThreeDartAvg != null || goals.targetCheckoutPercent != null || goals.targetHighestCheckout != null) {
      playerGoals[player.id] = goals;
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    players,
    matches,
    settings,
    bullOffLog,
    tournaments,
    playerGoals,
    checkoutTrainerBest,
  };
}

export function exportAllDataAsJson(data: BackupData): string {
  return JSON.stringify(data, null, 2);
}

/** Structural validation only — does not attempt to deep-validate every record shape. */
function isValidBackup(value: unknown): value is BackupData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) return false;
  }
  if (!Array.isArray(obj.players)) return false;
  if (!Array.isArray(obj.matches)) return false;
  if (!obj.settings || typeof obj.settings !== 'object') return false;
  if (!Array.isArray(obj.bullOffLog)) return false;
  return true;
}

/**
 * Parses and validates a previously exported JSON string, then writes every
 * slice back through its owning storage module's write function(s) so the
 * persisted shapes are identical to what those modules produce normally.
 */
export async function importAllData(jsonString: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('That text is not valid JSON.');
  }

  if (!isValidBackup(parsed)) {
    throw new Error('That JSON does not look like a DartMasters backup — missing expected fields.');
  }

  const data = parsed;

  // Players: replace wholesale via save() (no bulk "setAll" on this module).
  for (const player of data.players) {
    await PlayerStorage.save(player);
  }

  // Matches: clear then re-save in original order. MatchStorage.save()
  // unshifts each record, so saving in reverse preserves the original order.
  await MatchStorage.clear();
  for (const match of [...data.matches].reverse()) {
    await MatchStorage.save(match);
  }

  await SettingsStorage.save({ ...SettingsStorage.defaults, ...data.settings });

  // Bull-off log: BullOffStorage.record() also unshifts.
  for (const result of [...data.bullOffLog].reverse()) {
    await BullOffStorage.record(result);
  }

  // Tournaments: absent on backups made before version 2.
  for (const tournament of [...(data.tournaments ?? [])].reverse()) {
    await TournamentStorage.save(tournament);
  }

  // Player goals: absent on backups made before version 2.
  for (const [playerId, goals] of Object.entries(data.playerGoals ?? {})) {
    await GoalsStorage.setForPlayer(playerId, goals);
  }

  // Checkout Trainer best streaks: absent on backups made before this field
  // was added; nothing to restore in that case (not a required key).
  if (data.checkoutTrainerBest) {
    await CheckoutTrainerStorage.setAllBest(data.checkoutTrainerBest);
  }
}
