<script lang="ts">
  import type { OperationalTask } from '../domain/model';
  import TaskList from './TaskList.svelte';

  export let tasks: OperationalTask[];
  export let now: number;
  export let onclose: () => void;
  export let onaction: (task: OperationalTask) => void;
  export let onsnooze: (taskId: string) => void;
  export let onacknowledge: (taskId: string) => void;

  $: criticalCount = tasks.filter((task) => task.priority === 'critical').length;
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<div class="task-popover-layer" data-testid="task-dropdown">
  <button class="task-popover-scrim" type="button" aria-label="Aufgaben schließen" onclick={onclose}></button>
  <div id="task-popover" class="task-popover" role="dialog" aria-label="Aktuelle Aufgaben">
    <header>
      <div>
        <h2>Aufgaben</h2>
        <p>{criticalCount ? `${criticalCount} kritisch · ${tasks.length} offen` : tasks.length ? `${tasks.length} aktuell oder bald fällig` : 'Nichts Aktuelles offen'}</p>
      </div>
      <button class="icon-button" type="button" aria-label="Aufgaben schließen" onclick={onclose}>×</button>
    </header>
    <div class="task-popover-scroll">
      <TaskList {tasks} {now} {onaction} {onsnooze} {onacknowledge} />
    </div>
  </div>
</div>
