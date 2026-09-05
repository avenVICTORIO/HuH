import { AppController } from '../src/application/appController';
import type { ReservationDraft } from '../src/domain/model';
import { createInitialState } from '../src/domain/state';
import { MutableClock } from '../src/infrastructure/clock';
import { MemoryNotificationGateway } from '../src/infrastructure/notifications';
import { MemoryStateRepository } from '../src/infrastructure/localStorageRepository';

export const BASE_NOW = new Date(2026, 8, 1, 15, 0, 0, 0).getTime();
export const BASE_DATE = '2026-09-01';

export function createHarness(now = BASE_NOW): {
  controller: AppController;
  clock: MutableClock;
  repository: MemoryStateRepository;
  notifications: MemoryNotificationGateway;
} {
  const clock = new MutableClock(now);
  const repository = new MemoryStateRepository();
  const notifications = new MemoryNotificationGateway();
  const controller = new AppController(repository, clock, notifications);
  return { controller, clock, repository, notifications };
}

export function draft(overrides: Partial<ReservationDraft> = {}): ReservationDraft {
  return {
    serviceDate: BASE_DATE,
    startTime: '18:00',
    partySize: 2,
    name: 'Testgast',
    source: 'phone',
    preference: 'none',
    allowTableSharing: false,
    ...overrides,
  };
}

export function emptyState(now = BASE_NOW) {
  return createInitialState(now);
}
