<script lang="ts">
  import type { AppState, PlanResult } from '../domain/model';
  import { formatTableList } from '../domain/tableCatalog';

  export let state: AppState;
  export let plan: PlanResult;
  export let onapply: () => void;
  export let oncancel: () => void;

  $: rows = plan.assignments.map((assignment) => ({
    assignment,
    reservation: state.reservations.find((candidate) => candidate.id === assignment.reservationId)!,
  }));
</script>

<div class="plan-preview">
  <div class="plan-summary">
    <div><b>{plan.assignedCount}</b><span>platziert</span></div>
    <div><b>{plan.unassignedCount}</b><span>offen</span></div>
    <div><b>{plan.changedCount}</b><span>Änderungen</span></div>
  </div>
  {#if plan.timedOut}<div class="notice warning">Zeitlimit erreicht; der beste gefundene gültige Plan wird gezeigt.</div>{/if}
  {#each plan.warnings as warning}<div class="notice danger">{warning}</div>{/each}
  {#if plan.changedCount === 0}<div class="completion-state"><span>✓</span><strong>Plan ist bereits aktuell</strong><p>Es gibt keine Änderung, die angewendet werden muss.</p></div>{/if}

  <div class="plan-rows">
    {#each rows as row}
      <div class:unassigned={!row.assignment.option} class="plan-row">
        <time>{row.reservation.startTime}</time>
        <span><strong>{row.reservation.name}</strong><small>{row.reservation.partySize} Pers.</small></span>
        <b>{row.assignment.option ? `${formatTableList(row.assignment.option.tableIds)}${row.assignment.mode === 'shared' ? ' · geteilt' : ''}` : 'offen'}</b>
      </div>
    {/each}
  </div>
  <div class="modal-actions">
    <button class="touch-button secondary" type="button" onclick={oncancel}>{plan.changedCount === 0 ? 'Schließen' : 'Abbrechen'}</button>
    {#if plan.changedCount > 0}<button class="touch-button" data-testid="apply-plan" type="button" onclick={onapply}>Plan anwenden</button>{/if}
  </div>
</div>
