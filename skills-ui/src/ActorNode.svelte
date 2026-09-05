<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  let { data }: { data: any } = $props();
</script>

<div class="actor {data.art} {data.verweis ? 'verweis' : ''} {data.aktiv ? 'aktiv ' + (data.status ?? '') : ''}">
  <Handle type="target" position={Position.Left} />
  <div class="kopf">
    <span class="art">{data.verweis ? "⧉ Sub-Flow" : data.art === "ki" ? "✦ KI-Actor" : "ƒ JS-Actor"}</span>
    {#if data.start}<span class="start">Start</span>{/if}
    {#if data.aktiv}<span class="puls" title={data.status}></span>{/if}
  </div>
  <div class="name">{data.name}</div>
  <div class="text">{data.beschreibung}</div>
  {#if data.schleife}<div class="schleife">↺ {data.schleife}</div>{/if}
  <Handle type="source" position={Position.Right} />
</div>

<style>
  .actor { width: 230px; background: #FBF8F2; border: 1.5px solid #E3DBCB; border-radius: 16px; padding: 12px 14px 12px; box-shadow: 0 8px 24px -18px rgba(34,38,31,.5); font-family: Montserrat, system-ui, sans-serif; color: #2B2A26; }
  .actor.ki { border-color: #D9B48F; background: #FBF5EA; }
  .actor.verweis { border-style: dashed; border-color: #6C7F68; background: #EEF2EC; }
  .verweis .art { color: #3C4A3B; }
  .actor.aktiv { border-color: #3C4A3B; box-shadow: 0 0 0 4px rgba(60,74,59,.14); }
  .actor.aktiv.wartet { border-color: #B0553A; box-shadow: 0 0 0 4px rgba(176,85,58,.16); }
  .kopf { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .art { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; color: #6B6255; }
  .ki .art { color: #B0553A; }
  .start { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; background: #3C4A3B; color: #fff; border-radius: 999px; padding: 2px 8px; }
  .puls { margin-left: auto; width: 10px; height: 10px; border-radius: 50%; background: #B0553A; box-shadow: 0 0 0 0 rgba(176,85,58,.5); animation: puls 1.4s infinite; }
  @keyframes puls { 70% { box-shadow: 0 0 0 8px rgba(176,85,58,0); } 100% { box-shadow: 0 0 0 0 rgba(176,85,58,0); } }
  .name { font-family: "Cormorant Garamond", Georgia, serif; font-size: 21px; font-weight: 600; color: #3C4A3B; line-height: 1.1; }
  .text { font-size: 11.5px; color: #6B6255; line-height: 1.45; margin-top: 5px; }
  .schleife { margin-top: 8px; font-size: 10.5px; color: #8A7F6E; background: #F1EBDF; border-radius: 8px; padding: 3px 8px; display: inline-block; }
  :global(.svelte-flow__handle) { width: 9px; height: 9px; background: #B0553A; border: 2px solid #FBF8F2; }
</style>
