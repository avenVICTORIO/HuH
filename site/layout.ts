import { brandCss, fontLink } from "./brand";
import { iconHead } from "../styles";
import { HAUS, ZEITEN_TEXT } from "./info";

export const NAV = [
  { pfad: "/", label: "Start" },
  { pfad: "/speisekarte", label: "Speisekarte" },
  { pfad: "/ueber-uns", label: "Über uns" },
  { pfad: "/feiern", label: "Feiern" },
  { pfad: "/kontakt", label: "Kontakt" },
];

type SeitenOpts = {
  titel: string;
  beschreibung: string;
  aktiv?: string;
  css?: string;
  js?: string;
  /** Kopfzeile über dem Inhalt starten lassen (transparente Hero-Sektionen). */
  inhalt: string;
};

const kopf = (aktiv?: string) => /* html */ `
<header class="kopf" id="kopf">
  <div class="kopf-innen">
    <a class="marke" href="/" aria-label="${HAUS.name} – zur Startseite">
      <img src="/logo.png" alt="${HAUS.name}" class="logo-bild">
    </a>
    <nav class="nav" id="nav">
      ${NAV.map(
        (n) =>
          `<a href="${n.pfad}"${n.pfad === aktiv ? ' aria-current="page"' : ""}>${n.label}</a>`,
      ).join("\n      ")}
      <a class="btn ton klein" href="/reservierung">Tisch reservieren</a>
    </nav>
    <button class="burger" id="burger" aria-label="Menü öffnen" aria-expanded="false" aria-controls="nav">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;

const fuss = () => /* html */ `
<footer class="fuss">
  <div class="wrap">
    <div class="fuss-gitter">
      <div>
        <img src="/logo.png" alt="${HAUS.name}" class="fuss-logo">
        <p style="margin:0; max-width:34ch;">${HAUS.claim}<br>Modernes Wirtshaus im ${HAUS.viertel}.</p>
      </div>
      <div>
        <h4>Besuch</h4>
        <ul>
          <li>${HAUS.strasse}</li>
          <li>${HAUS.plz} ${HAUS.stadt}</li>
          <li><a href="${HAUS.karteUrl}" target="_blank" rel="noreferrer noopener">Route ansehen →</a></li>
        </ul>
      </div>
      <div>
        <h4>Öffnungszeiten</h4>
        <ul>
          ${ZEITEN_TEXT.map((z) => `<li>${z.tag}<br><span style="opacity:.72">${z.zeit}</span></li>`).join("\n          ")}
        </ul>
      </div>
      <div>
        <h4>Kontakt</h4>
        <ul>
          <li><a href="tel:${HAUS.telefonLink}">${HAUS.telefon}</a></li>
          <li><a href="mailto:${HAUS.mail}">${HAUS.mail}</a></li>
          <li><a href="${HAUS.instagram}" target="_blank" rel="noreferrer noopener">Instagram</a></li>
          <li><a href="${HAUS.tiktok}" target="_blank" rel="noreferrer noopener">TikTok</a></li>
        </ul>
      </div>
    </div>
    <div class="fuss-unten">
      <span>© ${new Date().getFullYear()} ${HAUS.name} · ${HAUS.stadt}</span>
      <span class="rechts">
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        <a href="/terminal">Team-Login</a>
      </span>
    </div>
  </div>
</footer>`;

const basisJs = /* js */ `
  // Kopfzeile bekommt beim Scrollen eine Trennlinie.
  const kopfEl = document.getElementById("kopf");
  const aufKopf = () => kopfEl.classList.toggle("geheftet", window.scrollY > 8);
  addEventListener("scroll", aufKopf, { passive: true }); aufKopf();

  // Mobiles Menü.
  const burger = document.getElementById("burger"), nav = document.getElementById("nav");
  burger.addEventListener("click", () => {
    const offen = nav.classList.toggle("offen");
    burger.setAttribute("aria-expanded", String(offen));
    burger.setAttribute("aria-label", offen ? "Menü schließen" : "Menü öffnen");
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { nav.classList.remove("offen"); burger.setAttribute("aria-expanded","false"); }
  });

  // Inhalte blenden beim Scrollen sanft ein.
  const beobachter = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) if (e.isIntersecting) { e.target.classList.add("da"); beobachter.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: .06 });
  document.querySelectorAll(".auf").forEach((el) => beobachter.observe(el));
`;

/** Rahmen jeder Gästeseite: Kopf, Inhalt, Fuß – plus Seiten-CSS/JS. */
export const seite = ({ titel, beschreibung, aktiv, css = "", js = "", inhalt }: SeitenOpts) =>
  /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${beschreibung}">
<meta name="theme-color" content="#3C4A3B">
${iconHead}
<meta property="og:title" content="${titel}">
<meta property="og:description" content="${beschreibung}">
<meta property="og:type" content="restaurant.restaurant">
<meta property="og:site_name" content="${HAUS.name}">
${aktiv ? `<link rel="canonical" href="${HAUS.url}${aktiv === "/" ? "" : aktiv}">
<meta property="og:url" content="${HAUS.url}${aktiv === "/" ? "" : aktiv}">` : ""}
<title>${titel}</title>
${fontLink}
<style>${brandCss}${css}</style>
</head>
<body>
${kopf(aktiv)}
<main id="inhalt">
${inhalt}
</main>
${fuss()}
<script>${basisJs}${js}</script>
</body>
</html>`;
