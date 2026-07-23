// Erzeugt Favicon, App- und PWA-Icons aus dem Original-Logo (public/logo.png).
// Ausführen mit:  bun run icons   – Ergebnisse landen in public/icons + public/favicon.ico.

import sharp from "sharp";
import { mkdirSync } from "node:fs";

const LOGO = "public/logo.png";
const ZIEL = "public/icons";
const CREME = { r: 0xf5, g: 0xf0, b: 0xe8, alpha: 1 }; // Marken-Creme als Icon-Hintergrund

mkdirSync(ZIEL, { recursive: true });

/** Logo zentriert auf quadratischem Creme-Grund; anteil = Logofläche (0–1). */
async function icon(groesse: number, anteil: number): Promise<Buffer> {
  const innen = Math.round(groesse * anteil);
  const logo = await sharp(LOGO)
    .resize(innen, innen, { fit: "inside" })
    .toBuffer();
  const meta = await sharp(logo).metadata();
  return sharp({
    create: { width: groesse, height: groesse, channels: 4, background: CREME },
  })
    .composite([{
      input: logo,
      left: Math.round((groesse - (meta.width ?? innen)) / 2),
      top: Math.round((groesse - (meta.height ?? innen)) / 2),
    }])
    .png()
    .toBuffer();
}

/** ICO-Container mit eingebetteten PNGs (seit Vista Standard, von allen Browsern gelesen). */
function alsIco(pngs: { groesse: number; daten: Buffer }[]): Buffer {
  const kopf = Buffer.alloc(6);
  kopf.writeUInt16LE(0, 0); // reserviert
  kopf.writeUInt16LE(1, 2); // Typ: Icon
  kopf.writeUInt16LE(pngs.length, 4);
  const eintraege: Buffer[] = [];
  let offset = 6 + pngs.length * 16;
  for (const { groesse, daten } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(groesse >= 256 ? 0 : groesse, 0); // Breite (0 = 256)
    e.writeUInt8(groesse >= 256 ? 0 : groesse, 1); // Höhe
    e.writeUInt8(0, 2);  // Palette
    e.writeUInt8(0, 3);  // reserviert
    e.writeUInt16LE(1, 4);  // Farbebenen
    e.writeUInt16LE(32, 6); // Bit-Tiefe
    e.writeUInt32LE(daten.length, 8);
    e.writeUInt32LE(offset, 12);
    eintraege.push(e);
    offset += daten.length;
  }
  return Buffer.concat([kopf, ...eintraege, ...pngs.map((p) => p.daten)]);
}

// Browser-Favicons + Apple + PWA (78 % Logofläche, maskable mit Safe-Zone 62 %).
const GROESSEN: [string, number, number][] = [
  ["favicon-16.png", 16, 0.84],
  ["favicon-32.png", 32, 0.82],
  ["apple-touch-icon.png", 180, 0.72],
  ["icon-192.png", 192, 0.78],
  ["icon-512.png", 512, 0.78],
  ["maskable-512.png", 512, 0.62],
];
for (const [name, groesse, anteil] of GROESSEN) {
  await Bun.write(`${ZIEL}/${name}`, await icon(groesse, anteil));
  console.log(`✓ ${ZIEL}/${name}`);
}

await Bun.write(
  "public/favicon.ico",
  alsIco([
    { groesse: 16, daten: await icon(16, 0.84) },
    { groesse: 32, daten: await icon(32, 0.82) },
    { groesse: 48, daten: await icon(48, 0.8) },
  ]),
);
console.log("✓ public/favicon.ico");

await Bun.write(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: "Hand aufs Herz",
      short_name: "Hand aufs Herz",
      description: "Modernes Wirtshaus im Münchner Dreimühlenviertel – ehrliche Küche, von Herzen.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#F5F0E8",
      theme_color: "#3C4A3B",
      lang: "de",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2,
  ),
);
console.log("✓ public/site.webmanifest");
