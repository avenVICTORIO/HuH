import { seite } from "./layout";
import { huegelSvg } from "./art";
import { HAUS } from "./info";
import { alle } from "../db";
import { gerichteLaden } from "../rezepte";
import { KAPITEL_META, KENNZEICHEN, SONNTAG, type Kennzeichen } from "./karte-daten";

// Karteninhalte kommen aus der Datenbank (Admin pflegt sie im Team-Bereich).
type DbGruppe = {
  id: string;
  kapitel: string;
  titel: string;
  spalten: string | null;
  fussnote: string | null;
};
type DbPosition = {
  id: string;
  gruppe_id: string;
  name: string;
  text: string | null;
  option: string | null;
  tags: string | null;
  stern: number;
  preise: string | null;
  gericht_id: string | null;
  /** Aus der Küche: false, wenn die Zutaten für keine Portion mehr reichen. */
  verfuegbar?: boolean;
};

const css = /* css */ `
  .karte-kopf{background:var(--tann); color:var(--sand-hell); padding:clamp(56px,8vw,96px) 0 0; text-align:center;}
  .karte-kopf h1{color:var(--sand-hell); margin-bottom:18px;}
  .karte-kopf .lead{color:rgba(234,220,198,.88);}
  .karte-kopf .lead{max-width:52ch; margin:0 auto;}

  /* Sprungleiste + Filter kleben unter der Kopfzeile */
  .leiste{position:sticky; top:74px; z-index:40; background:var(--papier); border-bottom:1px solid var(--linie);}
  .leiste-innen{display:flex; align-items:center; gap:10px; max-width:var(--breit); margin:0 auto; padding:12px 24px; overflow-x:auto; scrollbar-width:none;}
  .leiste-innen::-webkit-scrollbar{display:none;}
  .sprung{
    font-family:var(--sans); font-size:11.5px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
    text-decoration:none; color:var(--tinte-weich); padding:9px 15px; border-radius:999px;
    border:1px solid transparent; white-space:nowrap; transition:background .18s, color .18s, border-color .18s;
  }
  .sprung:hover{background:var(--creme); border-color:var(--linie);}
  .sprung.aktiv{background:var(--tann); color:var(--sand-hell);}
  .leiste .teiler{width:1px; height:22px; background:var(--linie); flex:none; margin:0 6px;}
  .filter{
    font-family:var(--sans); font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
    padding:9px 14px; border-radius:999px; border:1px solid var(--linie); background:transparent;
    color:var(--taupe); cursor:pointer; white-space:nowrap; transition:all .18s;
  }
  .filter:hover{border-color:var(--tann-hell); color:var(--tann);}
  .filter[aria-pressed="true"]{background:var(--ton); border-color:var(--ton); color:#FFF3EA;}
  @media (max-width:920px){ .leiste{top:66px;} .leiste-innen{padding:10px 16px;} }

  /* ---------------- Kapitel & Gruppen ---------------- */
  .kapitel{padding:clamp(52px,7vw,88px) 0 0; scroll-margin-top:140px;}
  .kapitel-kopf{text-align:center; margin-bottom:clamp(32px,5vw,56px);}
  .kapitel-kopf h2{margin-bottom:12px;}
  .kapitel-kopf p{color:var(--taupe); font-size:16px; max-width:50ch; margin:0 auto;}
  .gruppe{margin-bottom:52px;}
  .gruppe > h3{
    font-family:var(--sans); font-size:11.5px; font-weight:600; letter-spacing:.24em; text-transform:uppercase;
    color:var(--ton); text-align:center; margin:0 0 8px;
  }
  .gruppe .regel{display:flex; align-items:center; gap:14px; margin:0 auto 30px; max-width:340px;}
  .gruppe .regel::before, .gruppe .regel::after{content:""; flex:1; height:1px; background:var(--linie);}
  .gruppe .regel span{width:5px; height:5px; border-radius:50%; background:var(--sand);}

  .speisen{display:grid; grid-template-columns:1fr 1fr; gap:0 clamp(28px,4vw,60px);}
  @media (max-width:840px){ .speisen{grid-template-columns:1fr;} }

  .gericht{padding:20px 0; border-bottom:1px solid var(--linie);}
  .gericht.aus{display:none;}
  .gericht-kopf{display:flex; align-items:baseline; gap:12px;}
  .gericht-kopf .name{font-family:var(--serif); font-size:clamp(19px,2.1vw,22px); line-height:1.25;}
  .gericht-kopf .fuell{flex:1; border-bottom:1px dotted var(--linie); transform:translateY(-5px); min-width:16px;}
  .gericht-kopf .preis{font-family:var(--sans); font-size:14px; font-weight:600; color:var(--ton); white-space:nowrap;}
  .gericht .beschr{font-size:15px; color:var(--tinte-weich); margin:6px 0 0; line-height:1.55;}
  .gericht .option{font-family:var(--sans); font-size:12.5px; color:var(--taupe); margin:7px 0 0; font-style:italic;}
  .tags{display:inline-flex; gap:5px; margin-left:2px; transform:translateY(-2px);}
  .tag{
    font-family:var(--sans); font-size:9.5px; font-weight:600; letter-spacing:.1em;
    padding:3px 7px; border-radius:5px; background:var(--sand-hell); color:var(--tann); white-space:nowrap;
  }
  .tag.vg{background:var(--tann-hell); color:#fff;}
  .tag.gf{background:var(--linie); color:var(--taupe);}
  .tag.heute-aus{background:#F6E3DC; color:var(--ton); letter-spacing:.06em;}
  .gericht.aus-heute .name, .gericht.aus-heute .preis, .gericht.aus-heute .beschr{opacity:.55;}
  .fussnote{font-size:14px; color:var(--taupe); text-align:center; margin:22px 0 0; font-style:italic;}

  /* ---------------- Getränkezeilen mit Spalten ---------------- */
  .getraenke{width:100%; border-collapse:collapse; font-size:16px;}
  .getraenke th{
    font-family:var(--sans); font-size:10px; font-weight:600; letter-spacing:.16em; text-transform:uppercase;
    color:var(--taupe); text-align:right; padding:0 0 10px; width:72px; font-weight:600;
  }
  .getraenke th:first-child{text-align:left;}
  .getraenke td{padding:13px 0; border-bottom:1px solid var(--linie); vertical-align:baseline;}
  .getraenke td.preis{text-align:right; font-family:var(--sans); font-size:14px; font-weight:600; color:var(--ton); white-space:nowrap; width:72px;}
  .getraenke .gname{font-family:var(--serif); font-size:19px;}
  .getraenke .gtext{display:block; font-size:14px; color:var(--taupe); margin-top:2px;}

  /* ---------------- Legende & Sonntag ---------------- */
  .legende{display:flex; flex-wrap:wrap; gap:10px 24px; justify-content:center; align-items:center; font-size:14px; color:var(--taupe);}
  .legende .tag{margin-right:7px;}
  .sonntagsband{background:var(--ton); color:#FFF3EA; text-align:center;}
  .sonntagsband h2{color:#FFF3EA; margin-bottom:16px;}
  .sonntagsband .lead{color:rgba(255,243,234,.9);}
  .sonntagsband .eyebrow{color:rgba(255,243,234,.7);}
  .sonntagsband .lead{max-width:56ch; margin:0 auto 8px;}
  .sonntagsband .preis{
    font-family:var(--serif); font-size:clamp(44px,7vw,68px); line-height:1; margin:26px 0 6px;
  }
  .haltung{background:var(--sand-hell);}
  .haltung-gitter{display:grid; grid-template-columns:1fr 1fr; gap:clamp(30px,5vw,72px); align-items:start;}
  @media (max-width:820px){ .haltung-gitter{grid-template-columns:1fr;} }
  .haltung p{color:var(--tinte-weich);}
  .partner{list-style:none; margin:0; padding:0;}
  .partner li{padding:16px 0; border-bottom:1px solid rgba(147,130,108,.3);}
  .partner li:last-child{border-bottom:0;}
  .partner .wer{font-family:var(--serif); font-size:20px; color:var(--tann); display:block;}
  .partner .was{font-size:14px; color:var(--taupe);}
  .hinweisbox{
    background:var(--sand-hell); border-radius:var(--rund); padding:26px 28px;
    font-size:15px; color:var(--tinte-weich); text-align:center;
  }
  .keine-treffer{display:none; text-align:center; color:var(--taupe); padding:40px 0; font-style:italic;}
  .kapitel.leer .keine-treffer{display:block;}
  .kapitel.leer .speisen, .kapitel.leer .gruppe > h3, .kapitel.leer .gruppe .regel, .kapitel.leer .fussnote{display:none;}
`;

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const preis = (p?: string | null) => (p ? `${p} €` : "");

const posTags = (p: DbPosition): Kennzeichen[] =>
  (p.tags ?? "").split(",").map((t) => t.trim()).filter((t): t is Kennzeichen => t in KENNZEICHEN);

const tagsHtml = (p: DbPosition) => {
  const tags = posTags(p);
  return tags.length
    ? `<span class="tags">${tags
        .map((t) => `<span class="tag ${t}" title="${KENNZEICHEN[t].lang}">${KENNZEICHEN[t].kurz}</span>`)
        .join("")}</span>`
    : "";
};

const gerichtHtml = (p: DbPosition) => /* html */ `
<article class="gericht${p.verfuegbar === false ? " aus-heute" : ""}" data-tags="${posTags(p).join(" ")}">
  <div class="gericht-kopf">
    <span class="name">${esc(p.name)}${tagsHtml(p)}${
      p.verfuegbar === false ? '<span class="tags"><span class="tag heute-aus">heute aus</span></span>' : ""
    }</span>
    <span class="fuell"></span>
    <span class="preis">${preis(p.preise)}</span>
  </div>
  ${p.text ? `<p class="beschr">${esc(p.text)}${p.stern ? " <span title='Wild aus eigener Jagd'>*</span>" : ""}</p>` : ""}
  ${p.option ? `<p class="option">${esc(p.option)}</p>` : ""}
</article>`;

const getraenkeHtml = (gr: DbGruppe, zeilen: DbPosition[]) => {
  const spalten = gr.spalten ? gr.spalten.split("|") : [""];
  return /* html */ `
<table class="getraenke">
  ${
    gr.spalten
      ? `<thead><tr><th></th>${spalten.map((s) => `<th>${esc(s)}</th>`).join("")}</tr></thead>`
      : ""
  }
  <tbody>
    ${zeilen
      .map((z) => {
        const preise = (z.preise ?? "").split("|");
        return `<tr>
      <td><span class="gname">${esc(z.name)}</span>${z.text ? `<span class="gtext">${esc(z.text)}</span>` : ""}</td>
      ${spalten
        .map((_, i) => `<td class="preis">${preise[i] ? `${esc(preise[i])} €` : ""}</td>`)
        .join("")}
    </tr>`;
      })
      .join("\n    ")}
  </tbody>
</table>`;
};

const gruppeHtml = (gr: DbGruppe, positionen: DbPosition[], getraenk: boolean) => /* html */ `
<div class="gruppe">
  <h3>${esc(gr.titel)}</h3>
  <div class="regel"><span></span></div>
  ${
    getraenk
      ? getraenkeHtml(gr, positionen)
      : `<div class="speisen">${positionen.map(gerichtHtml).join("")}</div>`
  }
  ${gr.fussnote ? `<p class="fussnote">${esc(gr.fussnote)}</p>` : ""}
</div>`;

const kapitelHtml = (
  meta: (typeof KAPITEL_META)[number],
  gruppen: DbGruppe[],
  posVon: (g: DbGruppe) => DbPosition[],
) => /* html */ `
<section class="kapitel" id="${meta.id}">
  <div class="wrap">
    <div class="kapitel-kopf auf">
      <h2>${meta.titel}</h2>
      ${meta.unterzeile ? `<p>${meta.unterzeile}</p>` : ""}
    </div>
    ${gruppen.map((gr) => gruppeHtml(gr, posVon(gr), meta.getraenk)).join("")}
    <p class="keine-treffer">Zu dieser Auswahl haben wir hier nichts – schaut in ein anderes Kapitel.</p>
  </div>
</section>`;

const inhaltAus = (
  kapitel: { meta: (typeof KAPITEL_META)[number]; gruppen: DbGruppe[] }[],
  posVon: (g: DbGruppe) => DbPosition[],
) => /* html */ `
<section class="karte-kopf">
  <div class="wrap schmal">
    <p class="eyebrow" style="color:var(--sand)">Speisen & Getränke · Stand Juli 2026</p>
    <h1>Unsere Karte</h1>
    <p class="lead">
      Süddeutsche Küche, Wild aus eigener Jagd und vegane Vielfalt. Wir kochen mit dem,
      was die Saison hergibt – deshalb ändert sich hier regelmäßig etwas.
    </p>
  </div>
  ${huegelSvg(["var(--tann-hell)", "var(--sand)", "var(--creme)"], { hoehe: 130 })}
</section>

<div class="leiste">
  <div class="leiste-innen">
    ${kapitel.map((k) => `<a class="sprung" href="#${k.meta.id}">${k.meta.titel}</a>`).join("\n    ")}
    <span class="teiler"></span>
    <button class="filter" data-filter="v" aria-pressed="false">Vegetarisch</button>
    <button class="filter" data-filter="vg" aria-pressed="false">Vegan</button>
    <button class="filter" data-filter="gf" aria-pressed="false">Glutenfrei</button>
  </div>
</div>

${kapitel.filter((k) => !k.meta.getraenk).map((k) => kapitelHtml(k.meta, k.gruppen, posVon)).join("")}

<section class="luft-klein">
  <div class="wrap schmal">
    <div class="legende">
      ${Object.entries(KENNZEICHEN)
        .map(([k, v]) => `<span><span class="tag ${k}">${v.kurz}</span>${v.lang}</span>`)
        .join("")}
      <span>* Wild überwiegend aus eigener Jagd</span>
    </div>
    <p style="text-align:center; font-size:14px; color:var(--taupe); margin:20px 0 0">
      Eine Übersicht der enthaltenen Allergene stellen wir euch im Haus gerne zur Verfügung.
    </p>
  </div>
</section>

<section class="haltung luft">
  <div class="wrap">
    <div class="haltung-gitter auf">
      <div>
        <p class="eyebrow">Unsere Haltung</p>
        <h2>Nachhaltig genießen</h2>
        <p class="lead" style="margin-top:20px">
          Gutes Essen beginnt für uns nicht erst in der Küche, sondern viel früher – bei den
          Zutaten und den Menschen, mit denen wir arbeiten.
        </p>
        <p>
          Wir bleiben den kulinarischen Wurzeln der Region treu und interpretieren klassische
          Gerichte zeitgemäß neu: alpine Klassiker, frische saisonale Küche und moderne pflanzliche
          Kompositionen, dazu regionale Biere, ausgewählte Weine und erfrischende Aperitifs.
          Nachhaltigkeit ist dabei kein Trend, sondern eine Haltung – deshalb arbeiten wir mit
          kleinen Erzeugern, die mit genauso viel Sorgfalt arbeiten wie wir.
        </p>
        <p>
          So wissen wir genau, was auf den Teller kommt. Und ihr dürft euch auf Frische,
          Qualität und echten Geschmack freuen.
        </p>
      </div>
      <div>
        <p class="eyebrow leise">Unsere Partnerbetriebe</p>
        <ul class="partner">
          <li><span class="wer">Metzgerei Magnus Bauch</span><span class="was">Fleisch aus der Nachbarschaft</span></li>
          <li><span class="wer">Früchte Feldbrach</span><span class="was">Gemüse & Obst</span></li>
          <li><span class="wer">Fischzucht Aumühle</span><span class="was">Fisch aus dem Isartal</span></li>
          <li><span class="wer">Eigene Jagd</span><span class="was">Wild – verantwortungsvoll, im Einklang mit der Natur</span></li>
          <li><span class="wer">F.X. Muschelkalk / Linke Weinhandel</span><span class="was">Weine aus der Dreimühlenstraße</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="sonntagsband luft">
  <div class="wrap schmal">
    <p class="eyebrow" style="color:rgba(255,243,234,.7)">Jeden Sonntag</p>
    <h2>${SONNTAG.titel}</h2>
    <p class="lead">${SONNTAG.text}</p>
    <div class="preis">${SONNTAG.preis} €</div>
    <p style="font-size:14px; opacity:.82; margin:0 auto; max-width:52ch">
      Getränk zur Wahl: ${SONNTAG.getraenke}<br>${SONNTAG.nachtisch}
    </p>
    <div style="margin-top:30px">
      <a class="btn linie" style="border-color:rgba(255,243,234,.55); color:#FFF3EA" href="/reservierung">Sonntagstisch reservieren</a>
    </div>
  </div>
</section>

${kapitel.filter((k) => k.meta.getraenk).map((k) => kapitelHtml(k.meta, k.gruppen, posVon)).join("")}

<section class="luft">
  <div class="wrap schmal">
    <div class="hinweisbox">
      Alle Preise in Euro, inklusive Mehrwertsteuer. Änderungen und saisonale Abweichungen
      behalten wir uns vor – die verbindliche Karte liegt bei uns im Haus.
      <div style="margin-top:20px"><a class="btn ton klein" href="/reservierung">Tisch reservieren</a></div>
    </div>
  </div>
</section>
`;

const js = /* js */ `
  // Aktives Kapitel in der Sprungleiste mitführen.
  const sprungLinks = [...document.querySelectorAll(".sprung")];
  const kapitel = [...document.querySelectorAll(".kapitel")];
  const markiere = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) {
      if (!e.isIntersecting) continue;
      const id = e.target.id;
      sprungLinks.forEach((a) => a.classList.toggle("aktiv", a.getAttribute("href") === "#" + id));
    }
  }, { rootMargin: "-140px 0px -70% 0px" });
  kapitel.forEach((k) => markiere.observe(k));

  // Mehrfachfilter über die Kennzeichnungen; ein Gericht muss alle gewählten tragen.
  const aktiveFilter = new Set();
  const anwenden = () => {
    for (const k of kapitel) {
      const gerichte = [...k.querySelectorAll(".gericht")];
      let sichtbar = 0;
      for (const g of gerichte) {
        const tags = (g.dataset.tags || "").split(" ").filter(Boolean);
        const passt = [...aktiveFilter].every((f) => tags.includes(f));
        g.classList.toggle("aus", !passt);
        if (passt) sichtbar++;
      }
      // Getränkekapitel haben keine Gerichte – sie bleiben unangetastet.
      k.classList.toggle("leer", gerichte.length > 0 && sichtbar === 0);
    }
  };
  document.querySelectorAll(".filter").forEach((b) => {
    b.addEventListener("click", () => {
      const f = b.dataset.filter;
      const an = !aktiveFilter.has(f);
      an ? aktiveFilter.add(f) : aktiveFilter.delete(f);
      b.setAttribute("aria-pressed", String(an));
      anwenden();
    });
  });
`;

// Die fertige Seite wird gecacht und bei jeder Karten-Änderung neu gebaut.
let cacheHtml: string | null = null;
export function karteInvalidieren() {
  cacheHtml = null;
}

/** Speisekarte aus der Datenbank rendern (Admin pflegt sie unter /team#karte). */
export async function karteSeite(): Promise<string> {
  if (cacheHtml) return cacheHtml;

  const gruppen = await alle<DbGruppe>("SELECT * FROM karte_gruppen ORDER BY sortierung, titel");
  const positionen = await alle<DbPosition>(
    "SELECT * FROM karte_positionen WHERE aktiv = 1 ORDER BY sortierung, name",
  );
  // Verknüpfte Küchen-Gerichte: reicht der Bestand für keine Portion mehr -> „heute aus“.
  const verf = new Map((await gerichteLaden()).map((g) => [g.id, g.verfuegbar]));
  for (const p of positionen) {
    if (p.gericht_id && verf.has(p.gericht_id)) {
      const v = verf.get(p.gericht_id);
      p.verfuegbar = v == null ? undefined : v > 0;
    }
  }
  const posVon = (g: DbGruppe) => positionen.filter((p) => p.gruppe_id === g.id);
  const kapitel = KAPITEL_META
    .map((meta) => ({ meta, gruppen: gruppen.filter((g) => g.kapitel === meta.id) }))
    // Kapitel ohne Inhalt tauchen weder in der Sprungleiste noch auf der Seite auf.
    .filter((k) => k.gruppen.some((g) => posVon(g).length));

  cacheHtml = seite({
    titel: `Speisekarte – ${HAUS.name} ${HAUS.stadt}`,
    beschreibung:
      "Die aktuelle Speise- und Getränkekarte vom Hand aufs Herz in München: Vorspeisen, Salate, Herzhaftes mit Wild aus eigener Jagd, vegane Gerichte, Weine und Bar.",
    aktiv: "/speisekarte",
    css,
    js,
    inhalt: inhaltAus(kapitel, posVon),
  });
  return cacheHtml;
}
