import type { AppState, BackupEnvelope } from './model';
import { assertValidAppState } from './validation';

export function createBackup(state: AppState, exportedAt = Date.now()): BackupEnvelope {
  return {
    format: 'hand-aufs-herz-backup',
    schemaVersion: 1,
    exportedAt,
    state: JSON.parse(JSON.stringify(state)) as AppState,
  };
}

export function serializeBackup(state: AppState, exportedAt = Date.now()): string {
  return JSON.stringify(createBackup(state, exportedAt), null, 2);
}

export function parseBackup(source: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Backup is not valid JSON: ${String(error)}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Backup must be an object.');
  }

  const envelope = parsed as Partial<BackupEnvelope>;
  if (envelope.format !== 'hand-aufs-herz-backup') {
    throw new Error('This file is not a Hand Aufs Herz backup.');
  }
  if (envelope.schemaVersion !== 1) {
    throw new Error('Backup schemaVersion must be exactly 1. No legacy migration is available.');
  }

  assertValidAppState(envelope.state);
  return JSON.parse(JSON.stringify(envelope.state)) as AppState;
}
