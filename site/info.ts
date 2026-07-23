// Eine Quelle der Wahrheit für alle Betriebsdaten – Adresse, Zeiten, Kontakt.
// Öffnungszeiten werden hier UND von der Reservierungslogik gelesen.

export const HAUS = {
  name: "Hand aufs Herz",
  zusatz: "Wirtshaus",
  claim: "Ehrliche Küche. Von Herzen.",
  strasse: "Dreimühlenstraße 25",
  plz: "80469",
  stadt: "München",
  viertel: "Dreimühlenviertel",
  telefon: "+49 89 94474115",
  telefonLink: "+498994474115",
  domain: "handaufsherz.restaurant",
  url: "https://handaufsherz.restaurant",
  mail: "mail@handaufsherz.restaurant",
  instagram: "https://www.instagram.com/handaufsherz_restaurant/?igsh=a2JxdHM5bXR1cjNz#",
  instagramHandle: "@handaufsherz_restaurant",
  tiktok: "https://www.tiktok.com/@hand.aufs.herz.re?_t=ZN-8weILd0k3Co&_r=1",
  // Anbieterkennzeichnung (aus dem Impressum der bisherigen Website übernommen)
  firma: "Hand aufs Herz Restaurant Gastro GmbH & Co. KG",
  vertreter: "Victorio Schlecker",
  ustId: "DE453648294",
  register: "Amtsgericht München, HRA 120870",
  karteUrl: "https://www.google.com/maps/search/?api=1&query=Dreim%C3%BChlenstra%C3%9Fe+25%2C+80469+M%C3%BCnchen",
} as const;

/** Öffnungszeiten je Wochentag (0 = Sonntag). `null` = Ruhetag. */
export const OEFFNUNG: ({ von: string; bis: string } | null)[] = [
  { von: "17:00", bis: "23:00" }, // So
  { von: "17:00", bis: "23:00" }, // Mo
  null, //                            Di – Ruhetag
  { von: "17:00", bis: "23:00" }, // Mi
  { von: "17:00", bis: "23:00" }, // Do
  { von: "17:00", bis: "23:00" }, // Fr
  { von: "17:00", bis: "23:00" }, // Sa
];

export const WOCHENTAGE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
] as const;

export const ZEITEN_TEXT = [
  { tag: "Mittwoch – Montag", zeit: "17:00 – 23:00 Uhr" },
  { tag: "Dienstag", zeit: "Ruhetag" },
];
