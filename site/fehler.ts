import { seite } from "./layout";
import { huegelSvg } from "./art";
import { HAUS } from "./info";

export const nichtGefundenPage = seite({
  titel: `Seite nicht gefunden – ${HAUS.name}`,
  beschreibung: "Diese Seite gibt es nicht (mehr).",
  inhalt: /* html */ `
<section class="dunkel" style="background:var(--tann); padding:clamp(72px,10vw,130px) 0 0; text-align:center;">
  <div class="wrap schmal">
    <p class="eyebrow" style="color:var(--sand)">Fehler 404</p>
    <h1 style="color:var(--sand-hell); margin-bottom:18px">Hier ist der Tisch leider leer</h1>
    <p class="lead" style="max-width:44ch; margin:0 auto 32px">
      Diese Seite gibt es nicht (mehr). Aber die Küche hat auf –
      schaut doch in die Karte oder reserviert gleich einen Platz.
    </p>
    <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap; padding-bottom:8px">
      <a class="btn ton" href="/reservierung">Tisch reservieren</a>
      <a class="btn linie" href="/speisekarte">Zur Speisekarte</a>
    </div>
  </div>
  ${huegelSvg(["var(--tann-hell)", "var(--sand)", "var(--creme)"], { hoehe: 130 })}
</section>
<section class="luft-klein"></section>`,
});
