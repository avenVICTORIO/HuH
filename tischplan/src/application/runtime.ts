import { AppController } from './appController';
import { MutableClock, SystemClock } from '../infrastructure/clock';
import { BrowserNotificationGateway } from '../infrastructure/notifications';
import { LocalStorageRepository } from '../infrastructure/localStorageRepository';

export const runtimeClock = import.meta.env.VITE_ENABLE_TEST_API
  ? new MutableClock(Date.now())
  : new SystemClock();

export const controller = new AppController(
  new LocalStorageRepository(),
  runtimeClock,
  new BrowserNotificationGateway(),
);
