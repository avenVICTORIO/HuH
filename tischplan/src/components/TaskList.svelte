<script lang="ts">
  import type { OperationalTask } from '../domain/model';
  import { formatRelativeMinutes } from '../domain/time';

  export let tasks: OperationalTask[];
  export let now: number;
  export let onaction: (task: OperationalTask) => void;
  export let onsnooze: (taskId: string) => void;
  export let onacknowledge: (taskId: string) => void;
</script>

{#if tasks.length === 0}
  <div class="completion-state"><span>✓</span><strong>Alles erledigt</strong><p>Aktuell ist kein betrieblicher Schritt offen.</p></div>
{:else}
  {#each tasks as task, index}
    <article class:primary={index === 0} class:critical={task.priority === 'critical'} class="task-card">
      <div class="task-meta">
        <span>{task.priority === 'critical' ? 'Kritisch' : task.priority === 'high' ? 'Bald' : 'Hinweis'}</span>
        <time>{formatRelativeMinutes(task.dueAt, now)}</time>
      </div>
      <h4>{task.title}</h4>
      <p>{task.detail}</p>
      <div class="task-actions">
        {#if task.actionLabel}<button class="touch-button small" type="button" onclick={() => onaction(task)}>{task.actionLabel}</button>{/if}
        <button class="touch-button secondary small" type="button" onclick={() => onsnooze(task.id)}>10 Min.</button>
        {#if !['cleaning', 'prepare-join', 'prepare-split', 'reconciliation'].includes(task.kind)}
          <button class="text-button" type="button" onclick={() => onacknowledge(task.id)}>Ausblenden</button>
        {/if}
      </div>
    </article>
  {/each}
{/if}
