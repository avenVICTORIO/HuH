import { mount } from 'svelte';
import App from './App.svelte';
import './fonts.css';
import './app.css';
import { controller } from './application/runtime';

const app = mount(App, {
  target: document.getElementById('app')!,
});

if (import.meta.env.VITE_ENABLE_TEST_API) {
  window.__HAH_TEST__ = {
    getState: () => controller.snapshot(),
    replaceState: (state) => controller.replaceStateForTests(state),
    setNow: (epochMs) => controller.setNowForTests(epochMs),
    tick: () => controller.tick(),
    reset: () => controller.resetAll(),
    selectServiceDate: (serviceDate) => controller.selectServiceDate(serviceDate),
    createReservation: (draft) => controller.createReservation(draft),
    createWalkIn: (partySize, preference = 'none', serviceDate, startTime) => controller.createWalkIn(partySize, preference, serviceDate, startTime),
    updateReservation: (id, update) => controller.updateReservation(id, update),
    autoAssign: (id) => controller.autoAssignReservation(id),
    applyAutoPlan: (serviceDate) => {
      const plan = controller.previewPlan(serviceDate);
      controller.applyPlan(plan, serviceDate);
      return plan;
    },
    manualAssign: (reservationId, optionId, mode = 'exclusive', overrideReason = '', shortenedDurationMinutes = undefined) => controller.manualAssign(reservationId, optionId, { mode, overrideReason, shortenedDurationMinutes }),
    markPrepared: (id) => controller.markPrepared(id),
    markArrived: (id) => controller.markArrived(id),
    markLeft: (id) => controller.markLeft(id),
    completeCleaning: (id) => controller.completeCleaning(id),
    completeReset: (id) => controller.completeReset(id),
    completeCleaningAndReset: (id) => controller.completeCleaningAndReset(id),
    setWeather: (serviceDate, weather) => controller.setWeather(serviceDate, weather),
    setOutsideOpen: (serviceDate, open) => controller.setOutsideOpen(serviceDate, open),
    startRush: (serviceDate) => controller.startRush(serviceDate),
    endRush: (serviceDate) => controller.endRush(serviceDate),
    beginReconciliation: (serviceDate) => controller.beginReconciliation(serviceDate),
    markReconciled: (id) => controller.markReconciled(id),
    finishReconciliation: (serviceDate, force = false) => controller.finishReconciliation(serviceDate, force),
    exportBackup: () => controller.exportBackup(),
    importBackup: (source) => controller.importBackup(source),
    getTasks: (serviceDate) => controller.getTasks(serviceDate),
  };
}

export default app;
