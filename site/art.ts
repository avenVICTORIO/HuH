// Papierschnitt-Illustrationen der Marke: geschichtete Hügel, Blätter, Bogenmotiv.
// Alles inline als SVG – keine externen Assets, skaliert sauber auf jedem Display.

/**
 * Zweig mit Blättern – das ruhige Grün-Element der Marke.
 * Blätter wechseln die Seite und werden zur Spitze hin kleiner.
 */
export const zweigSvg = (klasse = "", farbe = "var(--tann)") => {
  const blatt = (y: number, gross: number, links: boolean) => {
    const r = links ? -1 : 1;
    const b = 46 * gross; // Länge des Blattes
    const h = 20 * gross; // halbe Breite
    return `<path d="M60 ${y} C ${60 + r * b * 0.45} ${y - h * 0.9}, ${60 + r * b} ${y - h * 0.5}, ${60 + r * b} ${y + h * 0.35}
      C ${60 + r * b * 0.5} ${y + h * 1.15}, ${60 + r * b * 0.18} ${y + h * 0.8}, 60 ${y}Z" fill="${farbe}"/>`;
  };
  const blaetter = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const y = 46 + i * 36;
      const gross = 1 - i * 0.1;
      return blatt(y, gross, i % 2 === 0) + blatt(y + 18, gross * 0.92, i % 2 !== 0);
    })
    .join("\n  ");
  return /* html */ `
<svg class="${klasse}" viewBox="0 0 120 260" fill="none" aria-hidden="true">
  <path d="M60 256 C 60 180, 58 100, 60 24" stroke="${farbe}" stroke-width="2.2" stroke-linecap="round"/>
  ${blaetter}
</svg>`;
};

/**
 * Geschichtete Papier-Hügel als Sektionsabschluss.
 * `richtung: "unten"` schließt eine helle Sektion nach unten hin ab.
 */
export const huegelSvg = (
  schichten: string[],
  { hoehe = 190, gespiegelt = false }: { hoehe?: number; gespiegelt?: boolean } = {},
) => {
  const pfade = [
    "M0 118 C 190 52, 330 138, 520 104 C 700 72, 840 130, 1000 88 L1000 200 L0 200Z",
    "M0 146 C 160 96, 300 168, 470 140 C 660 108, 820 162, 1000 126 L1000 200 L0 200Z",
    "M0 172 C 210 132, 360 190, 560 168 C 740 148, 870 186, 1000 162 L1000 200 L0 200Z",
  ];
  return /* html */ `
<svg class="huegel" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"
     style="width:100%; height:${hoehe}px; ${gespiegelt ? "transform:scaleY(-1);" : ""}">
  ${schichten.map((f, i) => `<path d="${pfade[i % pfade.length]}" fill="${f}"/>`).join("\n  ")}
</svg>`;
};

/** Sonnenscheibe hinter dem Bogen. */
export const sonneSvg = (farbe = "var(--ton)") => /* html */ `
<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="${farbe}"/></svg>`;

/**
 * Bogenfenster im Stil des Markenboards: Sonne, Wolke und Hügel in einer Rundbogen-Form.
 * Wird als Bildersatz genutzt, solange keine echten Fotos hinterlegt sind.
 */
export const bogenSzene = (klasse = "") => /* html */ `
<svg class="${klasse}" viewBox="0 0 420 560" fill="none" aria-hidden="true">
  <defs>
    <clipPath id="bogen">
      <path d="M0 210C0 94 94 0 210 0s210 94 210 210v350H0V210Z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#bogen)">
    <rect width="420" height="560" fill="var(--sand-hell)"/>
    <circle cx="212" cy="168" r="74" fill="var(--ton)"/>
    <path d="M96 214c0-16 13-29 29-29 6 0 12 2 17 6 7-14 21-23 37-23 23 0 42 19 42 42 0 4 0 8-2 12H96Z" fill="var(--papier)" opacity=".92"/>
    <path d="M0 372C74 330 128 386 196 360c76-29 138 16 224-14v214H0V372Z" fill="var(--sand)"/>
    <path d="M0 428c88-44 140 14 214-12 74-25 130 18 206-8v152H0V428Z" fill="var(--taupe)"/>
    <path d="M0 470c96-38 150 22 226-6 70-26 122 14 194-6v102H0V470Z" fill="var(--tann-hell)"/>
    <path d="M0 512c104-34 156 20 232-4 66-21 116 10 188-6v58H0v-48Z" fill="var(--tann)"/>
  </g>
  <path d="M0 210C0 94 94 0 210 0s210 94 210 210v350H0V210Z" stroke="var(--linie)" stroke-width="1.5" fill="none"/>
</svg>`;

/** Social-Icons für die großen Kanal-Links. */
export const sozialSvg: Record<string, string> = {
  instagram: /* html */ `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none"/></svg>`,
  tiktok: /* html */ `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/></svg>`,
};

/** Schlichte Linien-Icons für die Werteleiste (Saisonal, Mit Herz, Nachhaltig, Genuss). */
export const iconSvg: Record<string, string> = {
  blatt: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
    <path d="M8 33c0-13 8-22 24-24 1 15-7 24-19 25"/><path d="M8 33c4-8 10-13 17-16"/></svg>`,
  herz: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
    <path d="M20 32c-9-6-13-11-13-16 0-4 3-7 7-7 3 0 5 2 6 4 1-2 3-4 6-4 4 0 7 3 7 7 0 5-4 10-13 16Z"/></svg>`,
  berg: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 28c5-9 9-14 12-14s6 4 9 9"/><path d="M14 28c4-6 7-9 9-9s5 3 9 9"/><path d="M3 30h34"/></svg>`,
  sonne: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
    <circle cx="20" cy="21" r="7"/><path d="M20 6v3M20 33v3M6 21h3M31 21h3M10 11l2 2M28 11l-2 2M10 31l2-2M28 31l-2-2"/></svg>`,
};
