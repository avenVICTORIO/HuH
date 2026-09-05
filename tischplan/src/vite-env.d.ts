/// <reference types="vite/client" />

import type {
  AppState,
  AssignmentMode,
  PlanResult,
  ReservationDraft,
  SeatingPreference,
  WeatherKind,
} from './domain/model';

declare global {
  interface Window {
    __HAH_TEST__?: {
      getState: () => AppState;
      replaceState: (state: AppState) => void;
      setNow: (epochMs: number) => void;
      tick: () => void;
      reset: () => void;
      selectServiceDate: (serviceDate: string) => void;
      createReservation: (draft: ReservationDraft) => string;
      createWalkIn: (partySize: number, preference?: SeatingPreference, serviceDate?: string, startTime?: string) => string;
      updateReservation: (id: string, update: import('./application/appController').ReservationUpdate) => void;
      autoAssign: (id: string) => boolean;
      applyAutoPlan: (serviceDate?: string) => PlanResult;
      manualAssign: (reservationId: string, optionId: string, mode?: AssignmentMode, overrideReason?: string, shortenedDurationMinutes?: number) => void;
      markPrepared: (id: string) => void;
      markArrived: (id: string) => void;
      markLeft: (id: string) => void;
      completeCleaning: (id: string) => void;
      completeReset: (id: string) => void;
      completeCleaningAndReset: (id: string) => void;
      setWeather: (serviceDate: string, weather: WeatherKind) => void;
      setOutsideOpen: (serviceDate: string, open: boolean) => void;
      startRush: (serviceDate?: string) => void;
      endRush: (serviceDate?: string) => void;
      beginReconciliation: (serviceDate?: string) => void;
      markReconciled: (id: string) => void;
      finishReconciliation: (serviceDate?: string, force?: boolean) => void;
      exportBackup: () => string;
      importBackup: (source: string) => void;
      getTasks: (serviceDate?: string) => ReturnType<import('./application/appController').AppController['getTasks']>;
    };
  }
}

export {};
