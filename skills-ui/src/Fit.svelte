<script lang="ts">
  // Passt den Ausschnitt an, sobald sich die Knoten ändern oder das Fenster (iframe) seine Größe ändert –
  // der `fitView`-Prop von SvelteFlow greift nur beim allerersten Rendern.
  import { useSvelteFlow } from "@xyflow/svelte";
  let { key }: { key: number } = $props();
  const { fitView } = useSvelteFlow();
  const fit = () => fitView({ padding: 0.2, duration: 200 });
  $effect(() => { void key; const t = setTimeout(fit, 80); return () => clearTimeout(t); });
  $effect(() => { window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); });
</script>
