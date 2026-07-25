import type { AppState } from '../domain/model';
import { assertValidAppState } from '../domain/validation';

export const STORAGE_KEY = 'hand-aufs-herz.app-state.v1';

export interface StateRepository {
  load(): AppState | null;
  save(state: AppState): void;
  clear(): void;
}

export class LocalStorageRepository implements StateRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): AppState | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    assertValidAppState(parsed);
    return parsed;
  }

  save(state: AppState): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}

export class MemoryStateRepository implements StateRepository {
  private value: string | null = null;

  load(): AppState | null {
    if (!this.value) {
      return null;
    }
    const parsed: unknown = JSON.parse(this.value);
    assertValidAppState(parsed);
    return parsed;
  }

  save(state: AppState): void {
    this.value = JSON.stringify(state);
  }

  clear(): void {
    this.value = null;
  }
}
