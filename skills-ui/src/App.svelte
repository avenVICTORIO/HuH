<script lang="ts">
  // Zeigt einen Skill-Flow als Graph: Actors als Knoten, Übergaben als Kanten.
  // Daten kommen von /api/skills (Session-Cookie), die Markierung des gerade
  // aktiven Actors schickt die umgebende Seite per postMessage ({typ:"markiere"}).
  import { SvelteFlow, Background, Controls, type Node, type Edge } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import ActorNode from "./ActorNode.svelte";

  const nodeTypes = { actor: ActorNode };
  const flowId = new URLSearchParams(location.search).get("flow") ?? "";

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let fehler = $state("");
  let markiert: { actor: string | null; status: string | null } = { actor: null, status: null };

  type Actor = { id: string; name: string; art: "ki" | "js"; beschreibung: string; pos: { x: number; y: number } };
  type Flow = { id: string; name: string; start: string; actors: Actor[]; kanten: { von: string; nach: string; label?: string }[] };

  function baue(f: Flow) {
    const schleifen = new Map(f.kanten.filter((k) => k.von === k.nach).map((k) => [k.von, k.label ?? "↺"]));
    nodes = f.actors.map((a) => ({
      id: a.id,
      type: "actor",
      position: a.pos,
      data: { ...a, start: a.id === f.start, schleife: schleifen.get(a.id) ?? null, aktiv: markiert.actor === a.id, status: markiert.status },
    }));
    edges = f.kanten
      .filter((k) => k.von !== k.nach)
      .map((k, i) => {
        const rueck = f.actors.findIndex((a) => a.id === k.nach) < f.actors.findIndex((a) => a.id === k.von);
        return {
          id: "k" + i,
          source: k.von,
          target: k.nach,
          label: k.label,
          type: rueck ? "default" : "smoothstep",
          animated: !k.label,
          style: rueck ? "stroke:#B8AE9C;stroke-width:1.4;stroke-dasharray:5 4" : "stroke:#B0553A;stroke-width:1.8",
          labelStyle: "fill:#6B6255;font-size:11px;font-family:Montserrat,sans-serif",
          labelBgStyle: "fill:#F5F0E8",
        } satisfies Edge;
      });
  }

  async function laden() {
    const r = await fetch("/api/skills");
    if (!r.ok) { fehler = "Bitte zuerst anmelden."; return; }
    const flows: Flow[] = await r.json();
    const f = flows.find((x) => x.id === flowId) ?? flows[0];
    if (!f) { fehler = "Kein Flow gefunden."; return; }
    baue(f);
  }

  window.addEventListener("message", (e) => {
    if (e.data?.typ !== "markiere") return;
    markiert = { actor: e.data.actor ?? null, status: e.data.status ?? null };
    nodes = nodes.map((n) => ({ ...n, data: { ...n.data, aktiv: n.id === markiert.actor, status: markiert.status } }));
  });

  laden();
</script>

<div class="wrap">
  {#if fehler}<div class="hint">{fehler}</div>{/if}
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    fitView
    fitViewOptions={{ padding: 0.2 }}
    nodesDraggable={false}
    nodesConnectable={false}
    elementsSelectable={false}
    proOptions={{ hideAttribution: true }}
    minZoom={0.4}
    maxZoom={1.6}
  >
    <Background gap={18} bgColor="#F5F0E8" patternColor="#E3DBCB" />
    <Controls showLock={false} />
  </SvelteFlow>
</div>

<style>
  .wrap { position: absolute; inset: 0; }
  .hint { position: absolute; z-index: 5; top: 12px; left: 12px; background: #fff; border: 1px solid #E3DBCB; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #6B6255; }
</style>
