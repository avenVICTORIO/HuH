<script lang="ts">
  // Zeigt einen Skill-Flow als Graph: Actors als Knoten, Übergaben als Kanten, gerufene
  // Sub-Flows als eigene Knoten. Daten kommen von /api/skills (Session-Cookie); die
  // Markierung des gerade aktiven Actors schickt die umgebende Seite per postMessage.
  import { SvelteFlow, Background, Controls, type Node, type Edge } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import ActorNode from "./ActorNode.svelte";
  import Fit from "./Fit.svelte";

  const nodeTypes = { actor: ActorNode };
  const flowId = new URLSearchParams(location.search).get("flow") ?? "";

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let fehler = $state("");
  let generation = $state(0);
  let marked: { actor: string | null; status: string | null } = { actor: null, status: null };

  type Schema = { properties?: Record<string, unknown>; required?: string[] } | null;
  type Actor = { id: string; name: string; kind: "ai" | "code"; description: string; pos: { x: number; y: number }; input: Schema; output: Schema };
  type Ref = { flow: string; name: string; pos: { x: number; y: number } };
  type Flow = { id: string; name: string; start: string; actors: Actor[]; refs?: Ref[]; edges: { from: string; to: string; label?: string }[] };

  const keys = (s: Schema) => (s?.properties ? Object.keys(s.properties) : []);

  function build(f: Flow) {
    const loops = new Map(f.edges.filter((k) => k.from === k.to).map((k) => [k.from, k.label ?? "↺"]));
    const actorNodes: Node[] = f.actors.map((a) => ({
      id: a.id,
      type: "actor",
      position: a.pos,
      data: { ...a, start: a.id === f.start, loop: loops.get(a.id) ?? null, inKeys: keys(a.input), outKeys: keys(a.output), active: marked.actor === a.id, status: marked.status },
    }));
    const refNodes: Node[] = (f.refs ?? []).map((r) => ({
      id: "flow:" + r.flow,
      type: "actor",
      position: r.pos,
      data: { id: r.flow, name: r.name, kind: "flow", description: "Sub-Flow – läuft als eigener Lauf, das Ergebnis kommt als „return“ zurück.", ref: true, inKeys: [], outKeys: [], active: false, status: null },
    }));
    nodes = [...actorNodes, ...refNodes];
    const order = (id: string) => { const i = f.actors.findIndex((a) => a.id === id); return i >= 0 ? i : f.actors.length; };
    edges = f.edges
      .filter((k) => k.from !== k.to)
      .map((k, i) => {
        const back = order(k.to) < order(k.from);
        return {
          id: "e" + i,
          source: k.from,
          target: k.to,
          label: k.label,
          type: back ? "default" : "smoothstep",
          animated: !k.label,
          style: back ? "stroke:#B8AE9C;stroke-width:1.4;stroke-dasharray:5 4" : "stroke:#B0553A;stroke-width:1.8",
          labelStyle: "fill:#6B6255;font-size:11px;font-family:Montserrat,sans-serif",
          labelBgStyle: "fill:#F5F0E8",
        } satisfies Edge;
      });
    generation++;
  }

  async function load() {
    const r = await fetch("/api/skills");
    if (!r.ok) { fehler = "Bitte zuerst anmelden."; return; }
    const flows: Flow[] = await r.json();
    const f = flows.find((x) => x.id === flowId) ?? flows[0];
    if (!f) { fehler = "Kein Flow gefunden."; return; }
    build(f);
  }

  window.addEventListener("message", (e) => {
    if (e.data?.typ !== "markiere") return;
    marked = { actor: e.data.actor ?? null, status: e.data.status ?? null };
    nodes = nodes.map((n) => ({ ...n, data: { ...n.data, active: n.id === marked.actor, status: marked.status } }));
  });

  load();
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
    minZoom={0.3}
    maxZoom={1.6}
  >
    <Background gap={18} bgColor="#F5F0E8" patternColor="#E3DBCB" />
    <Controls showLock={false} />
    <Fit key={generation} />
  </SvelteFlow>
</div>

<style>
  .wrap { position: absolute; inset: 0; }
  .hint { position: absolute; z-index: 5; top: 12px; left: 12px; background: #fff; border: 1px solid #E3DBCB; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #6B6255; }
</style>
