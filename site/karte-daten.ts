// Speisekarte als Daten (Stand Juli 2026, übernommen aus Kueche_Speisekarte-DE_2026-07_V2.pdf).
// Die Kennzeichnungen v/vg/gf stammen aus den Icons der Druckkarte – bitte bei jeder
// Kartenänderung gegenlesen; verbindliche Allergenauskunft gibt das Team im Haus.

export type Kennzeichen = "v" | "vg" | "gf";

export type Gericht = {
  name: string;
  preis?: string;
  text?: string;
  /** Zusatzzeile wie „vegan, ohne Feta − 2.5 €“. */
  option?: string;
  tags?: Kennzeichen[];
  /** Fußnoten-Marker, z. B. Wild aus eigener Jagd. */
  stern?: boolean;
};

export type Preisspalte = { label: string; werte: (string | null)[] };

export type Gruppe = {
  titel: string;
  /** Spaltenköpfe für Getränke (z. B. „0,3 l“ / „0,5 l“). */
  spalten?: string[];
  gerichte: Gericht[];
  /** Getränkezeilen mit mehreren Preisen. */
  zeilen?: { name: string; text?: string; preise: (string | null)[] }[];
  fussnote?: string;
};

export type Kapitel = {
  id: string;
  titel: string;
  unterzeile?: string;
  gruppen: Gruppe[];
};

export const KENNZEICHEN: Record<Kennzeichen, { kurz: string; lang: string }> = {
  v: { kurz: "V", lang: "vegetarisch" },
  vg: { kurz: "VG", lang: "vegan" },
  gf: { kurz: "GF", lang: "glutenfrei" },
};

export const SPEISEN: Kapitel[] = [
  {
    id: "vorspeisen",
    titel: "Vorspeisen",
    unterzeile: "Zum Ankommen, Teilen und Warmwerden.",
    gruppen: [
      {
        titel: "Unsere Vorspeisen",
        gerichte: [
          {
            name: "Hausgemachtes veganes Aufstrich-Trio",
            preis: "7,5",
            text: "Selbstgemachte vegane ‚Leberwurst‘ | Kartoffel-Kräuter-Aufstrich | Rote-Bete-Meerrettich-Aufstrich | frische Brezn & Brot",
            tags: ["vg"],
          },
          {
            name: "Obazda",
            preis: "9,5",
            text: "Obazda | rote Zwiebeln | Essiggurkerl | Radieserl | frische Brezn & Brot",
            tags: ["v"],
          },
          {
            name: "Röstkartoffeln mit Kräuterdip",
            preis: "8,0",
            text: "Rustikale Bratkartoffeln | Petersilie | Kräuter-Dip",
            tags: ["v", "gf"],
          },
          {
            name: "Gegrillte Wassermelone",
            preis: "13,0",
            text: "Rucola | Kürbiskernöl | Limette | karamellisierte Trauben | Feta",
            option: "vegan, ohne Feta − 2,5 €",
            tags: ["v", "gf"],
          },
          {
            name: "Ziegenkäse auf Bete-Tatar",
            preis: "15,5",
            text: "gebratener Ziegenkäse | rote und gelbe Bete | Walnüsse | Brotchips | Honig | Kräuteröl",
            option: "vegan, ohne Ziegenkäse und Honig − 3,0 €",
            tags: ["v"],
          },
          {
            name: "Tatar von der geräucherten Forelle",
            preis: "16,0",
            text: "Tatar von der geräucherten Forelle | eingelegte Zwiebeln | Brotchips",
          },
        ],
        fussnote: "extra Wurzelbrot 2,5 € · extra Brezn 2,0 €",
      },
    ],
  },
  {
    id: "salate",
    titel: "Salate & Suppen",
    unterzeile: "Leicht, saisonal, aus der Nachbarschaft.",
    gruppen: [
      {
        titel: "Unsere Salate",
        gerichte: [
          {
            name: "Kleiner Beilagensalat",
            preis: "5,5",
            text: "Saisonale Salatvariation | Kirschtomaten | Gurken",
            tags: ["vg", "gf"],
          },
          {
            name: "Hand-aufs-Herz-Salatteller",
            preis: "12,0",
            text: "Saisonale Salatvariation | Kirschtomaten | Gurken",
            tags: ["vg", "gf"],
          },
          {
            name: "Hand-aufs-Herz-Salat mit Kräuter-Pilzen",
            preis: "16,5",
            text: "Saisonale Salatvariation | gebratene Kräuter-Pilze",
            tags: ["vg", "gf"],
          },
          {
            name: "Hand-aufs-Herz-Salat mit Breznknödel",
            preis: "17,5",
            text: "Saisonale Salatvariation | gebräunte Breznknödel | Kräuterdip",
            tags: ["v"],
          },
          {
            name: "Hand-aufs-Herz-Salat mit Ziegenkäse",
            preis: "17,5",
            text: "Saisonale Salatvariation | warmer Ziegenkäse | Honig | Walnüsse",
            tags: ["v", "gf"],
          },
          {
            name: "Hand-aufs-Herz-Salat mit Hähnchen",
            preis: "18,5",
            text: "Saisonale Salatvariation | gebratene Hähnchenbruststreifen",
            tags: ["gf"],
          },
        ],
      },
      {
        titel: "Unsere Suppen",
        gerichte: [
          {
            name: "Gurkenkaltschale",
            preis: "6,5",
            text: "frische Gurkensuppe | Dill | Schnittlauch | Kresse | Scheibe Wurzelbrot",
            tags: ["v"],
          },
          {
            name: "Blumenkohlsüppchen",
            preis: "8,5",
            text: "Cremige Suppe vom Blumenkohl | gebratene Pilze | Kresse | Scheibe Wurzelbrot",
            tags: ["v"],
          },
        ],
      },
    ],
  },
  {
    id: "herzhaftes",
    titel: "Herzhaftes",
    unterzeile: "Wild aus eigener Jagd und vollwertige vegane Küche – Seite an Seite.",
    gruppen: [
      {
        titel: "Herzhaftes",
        gerichte: [
          {
            name: "Kässpätzle",
            preis: "16,5",
            text: "Hausgemachte Kässpätzle | kräftige Bergkäsemischung | Schmelzzwiebeln",
            tags: ["v"],
          },
          {
            name: "„Kein-Schweinsbraten“",
            preis: "18,5",
            text: "gebackener Knollensellerie | Kartoffel-Pastinaken-Stampf | vegane Bratensoße | Rotkohlsalat",
            tags: ["vg"],
          },
          {
            name: "Breznknödel",
            preis: "17,0",
            text: "Hausgemachte Breznknödel | Pilz-Rahmsoße",
            tags: ["v"],
          },
          {
            name: "Spitzkohl",
            preis: "17,5",
            text: "Gerösteter Spitzkohl | Röstkartoffeln | Kräuter-Pilze | vegane Bratensoße",
            tags: ["vg"],
          },
          {
            name: "Rahm-Geschnetzeltes",
            preis: "19,5",
            text: "von der Hähnchenbrust | hausgemachte Spätzle | Pilz-Rahmsoße",
          },
          {
            name: "Pasta mit Wild-Bolognese",
            preis: "18,0",
            text: "Pasta mit Wild-Bolognese | Parmesan | Kräuter",
            stern: true,
          },
          {
            name: "Wildfleischpflanzerl",
            preis: "25,0",
            text: "Fleischpflanzerl vom heimischen Wild | Marktgemüse | Kartoffel-Pastinaken-Stampf | Wildjus",
            stern: true,
          },
          {
            name: "Hirschragout",
            preis: "29,0",
            text: "Ragout von der Hirschkalbskeule | Breznknödel | Rotkohlsalat",
            stern: true,
          },
        ],
        fussnote:
          "* Unser Wild stammt überwiegend aus eigener Jagd. Bei Fragen sprecht gerne unser Hand-aufs-Herz-Team an.",
      },
    ],
  },
  {
    id: "suesses",
    titel: "Süße Versuchung",
    unterzeile: "Der letzte Gang, für den man immer noch Platz hat.",
    gruppen: [
      {
        titel: "Süße Versuchung",
        gerichte: [
          {
            name: "Bienenstich-Tiramisu",
            preis: "8,5",
            text: "Rumgetränkter Löffelbiskuit | Vanille-Tonkasahne | Mandelkrokant",
            tags: ["v"],
          },
          {
            name: "Strudel mit Vanillesoße",
            preis: "7,5",
            text: "Hausgemachter Strudel (mit wechselnder Füllung) | Vanillesoße",
            tags: ["vg"],
          },
          {
            name: "Pfannkuchen",
            preis: "7,0",
            text: "Hausgemachte Pfannkuchen | Puderzucker | Apfelmus",
            tags: ["v"],
          },
        ],
        fussnote:
          "Frag doch mal beim Hand-aufs-Herz-Team nach, ob noch eins unserer Tagesdesserts übrig ist.",
      },
    ],
  },
];

export const GETRAENKE: Kapitel[] = [
  {
    id: "bier",
    titel: "Bier & Wasser",
    unterzeile: "Frisch gezapft aus München.",
    gruppen: [
      {
        titel: "Biere",
        spalten: ["0,3 l", "0,5 l"],
        gerichte: [],
        zeilen: [
          { name: "Hacker-Pschorr Münchner Hell / Radler", preise: ["3,9", "4,9"] },
          { name: "Hacker-Pschorr Münchner Hell Naturtrüb", text: "alkoholfrei", preise: [null, "5,2"] },
          { name: "Hacker-Pschorr Münchner Dunkel", preise: [null, "5,2"] },
          { name: "Hacker-Pschorr Münchner Kellerbier", preise: [null, "5,2"] },
          { name: "Paulaner Hefe Weißbier / Russ", preise: [null, "5,2"] },
          { name: "Paulaner Hefe Weißbier", text: "alkoholfrei", preise: [null, "5,2"] },
          { name: "Paulaner Hefe Weißbier Dunkel", preise: [null, "5,2"] },
        ],
      },
      {
        titel: "Wasser",
        spalten: ["0,5 l", "1,0 l"],
        gerichte: [],
        zeilen: [
          { name: "Münchner Tafelwasser still", preise: ["3,5", "5,9"] },
          { name: "Münchner Tafelwasser prickelnd", preise: ["3,5", "5,9"] },
        ],
      },
    ],
  },
  {
    id: "alkoholfrei",
    titel: "Alkoholfrei",
    unterzeile: "Unsere eigenen Limonaden – hausgemacht, nicht zu süß.",
    gruppen: [
      {
        titel: "„Hand aufs Herz“ – Limo",
        spalten: ["0,3 l"],
        gerichte: [],
        zeilen: [
          { name: "Ingwer-Minze", preise: ["5,5"] },
          { name: "Beere-Zitrone", preise: ["5,5"] },
          { name: "Basilikum-Limette", preise: ["5,5"] },
          { name: "Maracuja-Zitrone", preise: ["5,5"] },
        ],
      },
      {
        titel: "Alkoholfreie Getränke",
        spalten: ["0,23 l", "0,33 l", "0,4 l"],
        gerichte: [],
        zeilen: [
          { name: "Paulaner Spezi", preise: [null, null, "4,5"] },
          { name: "Paulaner Zitronenlimo", preise: [null, null, "4,5"] },
          { name: "Coca Cola", preise: [null, "4,0", null] },
          { name: "Coca Cola Zero", preise: [null, "4,0", null] },
          { name: "Almdudler", preise: [null, "4,0", null] },
          { name: "Aqua Monaco Tonic Water", preise: ["4,0", null, null] },
          { name: "Aqua Monaco Ginger Beer", preise: ["4,0", null, null] },
        ],
      },
      {
        titel: "Säfte & Nektar",
        spalten: ["0,2 l"],
        gerichte: [],
        zeilen: [
          { name: "Wolfra Apfelsaft naturtrüb", preise: ["4,0"] },
          { name: "Wolfra Orange", preise: ["4,0"] },
          { name: "Wolfra Schwarze Johannisbeere", preise: ["4,0"] },
          { name: "Wolfra Maracuja", preise: ["4,0"] },
          { name: "Wolfra Rhabarber", preise: ["4,0"] },
        ],
      },
      {
        titel: "Schorlen",
        spalten: ["0,4 l"],
        gerichte: [],
        zeilen: [
          { name: "Wolfra Apfelsaft naturtrüb", preise: ["5,5"] },
          { name: "Wolfra Orange", preise: ["5,5"] },
          { name: "Wolfra Schwarze Johannisbeere", preise: ["5,5"] },
          { name: "Wolfra Maracuja", preise: ["5,5"] },
          { name: "Wolfra Rhabarber", preise: ["5,5"] },
        ],
      },
    ],
  },
  {
    id: "wein",
    titel: "Wein & Prosecco",
    unterzeile:
      "Entstanden in Zusammenarbeit mit F.X. Muschelkalk / Linke Weinhandel aus der Dreimühlenstraße.",
    gruppen: [
      {
        titel: "Unser Haus-Prosecco",
        spalten: ["0,1 l", "0,2 l"],
        gerichte: [],
        zeilen: [{ name: "Soligo Vino Frizzante Bianco", preise: ["4,5", "8,5"] }],
      },
      {
        titel: "Offene Weine · Weiß",
        spalten: ["0,1 l", "0,2 l"],
        gerichte: [],
        zeilen: [
          { name: "Grüner Veltliner", text: "Weingut Stadler, Weinviertel", preise: ["5,5", "9,5"] },
          { name: "Chardonnay", text: "aus Bio-Anbau, Weingut Rieger, Baden", preise: ["5,5", "9,5"] },
          { name: "Riesling Schlossberg", text: "Weingut Seiberth, Pfalz", preise: ["5,5", "9,5"] },
          { name: "Grauer Burgunder", text: "VDP-Weingut Heitlinger, Baden", preise: ["5,5", "9,5"] },
        ],
      },
      {
        titel: "Offene Weine · Rosé & Rot",
        spalten: ["0,1 l", "0,2 l"],
        gerichte: [],
        zeilen: [
          { name: "Zweigelt Rosé", text: "Weingut Stadler, Weinviertel", preise: ["5,5", "9,5"] },
          { name: "Zweigelt Selection", text: "Weingut Salzl, Burgenland", preise: ["5,5", "9,5"] },
          {
            name: "Spätburgunder / Pinot Noir",
            text: "aus Bio-Anbau, Weingut Kopp, Baden",
            preise: ["5,5", "9,5"],
          },
          { name: "Ursprung", text: "Weingut Markus Schneider, Pfalz", preise: ["7,0", "13,5"] },
        ],
      },
      {
        titel: "Weinschorle",
        spalten: ["0,2 l", "0,5 l"],
        gerichte: [],
        zeilen: [{ name: "Weinschorle weiß | rosé | rot", preise: ["4,5", "8,0"] }],
      },
      {
        titel: "Unsere Weißweine",
        spalten: ["0,75 l"],
        gerichte: [],
        zeilen: [
          { name: "Riesling »Drei Steine«", text: "aus Bio-Anbau, Weingut Schmitt, Pfalz", preise: ["29,0"] },
          {
            name: "Grauer Burgunder",
            text: "aus Bio-Anbau, VDP-Weingut Gutzler, Rheinhessen",
            preise: ["29,0"],
          },
          { name: "Silvaner", text: "aus Bio-Anbau, VDP-Weingut am Stein, Franken", preise: ["32,0"] },
          {
            name: "Wiener Gemischter Satz Natural",
            text: "aus Bio-Anbau, Weingut Fuchs-Steinklammer, Wien",
            preise: ["36,0"],
          },
          { name: "Lugana DOC »I Frati«", text: "Weingut Cà dei Frati, Lombardei", preise: ["38,0"] },
          {
            name: "Grüner Veltliner",
            text: "aus Bio-Anbau, handgelesen, Weingut Jurtschitsch, Kamptal",
            preise: ["38,0"],
          },
          { name: "Sauvignon Blanc »Nico« DOC", text: "Weingut Stroblhof, Südtirol", preise: ["49,0"] },
        ],
      },
      {
        titel: "Unsere Rotweine",
        spalten: ["0,75 l"],
        gerichte: [],
        zeilen: [
          {
            name: "Cuvée »Ronco Nole«",
            text: "Merlot / Refosco / Cabernet, Weingut Di Leonardo, Venetien",
            preise: ["29,0"],
          },
          {
            name: "Zweigelt",
            text: "aus Bio-Anbau, handgelesen, Weingut Jurtschitsch, Kamptal",
            preise: ["34,0"],
          },
          {
            name: "Spätburgunder / Pinot Noir",
            text: "aus Bio-Anbau, Weingut Kopp, Baden",
            preise: ["34,0"],
          },
          { name: "Cuvée »Ursprung«", text: "Weingut Markus Schneider, Pfalz", preise: ["40,0"] },
          {
            name: "Cuvée »wildwux«",
            text: "Zweigelt / St. Laurent / Blaufränkisch, Weingut Braunstein, Burgenland",
            preise: ["44,0"],
          },
          { name: "Cabernet Sauvignon", text: "Weingut Pasler, Burgenland", preise: ["46,0"] },
          { name: "Lagrein", text: "Weingut Alois Lageder, Südtirol", preise: ["46,0"] },
          {
            name: "Teroldego Rotaliano DOC",
            text: "aus Bio-Anbau, Weingut Foradori, Trentino/Südtirol",
            preise: ["49,0"],
          },
        ],
      },
    ],
  },
  {
    id: "bar",
    titel: "Bar",
    unterzeile: "Spritz-Ecke, Gin, Longdrinks und ein Schnapserl zum Schluss.",
    gruppen: [
      {
        titel: "Unsere Spritz-Ecke",
        gerichte: [],
        zeilen: [
          { name: "Aperol Spritz Classic", preise: ["8,5"] },
          { name: "Sarti Spritz", preise: ["8,5"] },
          { name: "Campari Spritz", preise: ["8,5"] },
          { name: "Hugo", preise: ["8,5"] },
          { name: "Hand aufs Herz Basil-Lime Spritz", preise: ["8,5"] },
          { name: "Hand aufs Herz Passion-Lemon Spritz", preise: ["8,5"] },
          { name: "Hand aufs Herz Ginger-Mint Spritz", preise: ["8,5"] },
          { name: "Hand aufs Herz Berry-Lemon Spritz", preise: ["8,5"] },
          { name: "Hand aufs Herz Alm Spritz", text: "Kräuterlimo", preise: ["8,5"] },
        ],
      },
      {
        titel: "Unsere Gin-Ecke",
        spalten: ["4 cl"],
        gerichte: [],
        zeilen: [
          { name: "Bombay Sapphire", preise: ["6,0"] },
          { name: "Knut Hansen", preise: ["7,5"] },
          { name: "Granit Bavaria Gin", preise: ["8,5"] },
          { name: "The Illusionist", preise: ["8,5"] },
          { name: "+ Aqua Monaco Tonic Water 0,23 l", preise: ["+4,0"] },
        ],
      },
      {
        titel: "Unsere Longdrinks",
        gerichte: [],
        zeilen: [
          { name: "Cuba Libre", preise: ["9,5"] },
          { name: "Negroni", preise: ["9,5"] },
          { name: "Negroni Sbagliato", preise: ["9,5"] },
          { name: "Wodka Cola", preise: ["9,5"] },
          { name: "Wodka Orange", preise: ["9,5"] },
          { name: "Americano", preise: ["9,5"] },
          { name: "Skinny Bitch", preise: ["9,5"] },
          { name: "Moscow Mule", preise: ["9,5"] },
          { name: "Munich Mule", preise: ["9,5"] },
          { name: "Espresso Martini", preise: ["9,5"] },
        ],
      },
      {
        titel: "Unsere Spirituosen-Ecke",
        spalten: ["2 cl"],
        gerichte: [],
        zeilen: [
          { name: "Frangelico", preise: ["4,0"] },
          { name: "Sambuca", preise: ["4,0"] },
          { name: "Haselnuss-Geist", preise: ["4,5"] },
          { name: "Freihof’s Williams Birne", preise: ["4,5"] },
          { name: "Freihof’s Marille", preise: ["4,5"] },
          { name: "Feinbrennerei Prinz – Alte Marille", preise: ["7,5"] },
          { name: "Feinbrennerei Prinz – Alte Williams-Christ-Birne", preise: ["7,5"] },
          { name: "Feinbrennerei Prinz – Alter Bodensee-Apfel", preise: ["7,5"] },
          { name: "Feinbrennerei Prinz – Alte Wald-Himbeere", preise: ["7,5"] },
          { name: "Feinbrennerei Prinz – Alte Haselnuss", preise: ["7,5"] },
        ],
      },
      {
        titel: "Digestif",
        spalten: ["4 cl"],
        gerichte: [],
        zeilen: [
          { name: "Ramazzotti", preise: ["5,5"] },
          { name: "Averna", preise: ["5,5"] },
          { name: "Jägermeister", preise: ["5,5"] },
          { name: "Kahlúa", preise: ["5,5"] },
          { name: "Baileys", preise: ["5,5"] },
          { name: "Selbstgemachter Erdbeerlimes", text: "Unsere Empfehlung", preise: ["3,0"] },
        ],
      },
      {
        titel: "Unsere Heißgetränke",
        gerichte: [],
        zeilen: [
          { name: "Café Crème", preise: ["3,7"] },
          { name: "Espresso", preise: ["2,5"] },
          { name: "Espresso doppelt", preise: ["3,0"] },
          { name: "Espresso Macchiato", preise: ["3,5"] },
          { name: "Cappuccino", preise: ["4,0"] },
          { name: "Latte Macchiato", preise: ["4,5"] },
          { name: "Heiße Schokolade", preise: ["4,0"] },
          {
            name: "Tee",
            text: "Kräuter, Pfefferminze, Ingwer-Zitrone, Grün, Waldbeere",
            preise: ["3,5"],
          },
        ],
      },
    ],
  },
];

/** Der Sonntags-Klassiker – auf Startseite und Karte gleichermaßen. */
export const SONNTAG = {
  titel: "Kässpätzle-Sonntag",
  preis: "19,9",
  text: "Herzhafte Kässpätzle mit der geheimen Tegernseer-Reibkas-Mischung der Naturkäserei Tegernseer Land, Schmelzzwiebeln, dazu ein frischer Beilagensalat und ein Getränk eurer Wahl zum Schlemmer-Preis.",
  getraenke: "Bier 0,5 l · Softdrinks · große Saftschorle 0,4 l · Glas Wein 0,1 l · Karaffe Wasser 1,0 l",
  nachtisch: "Für den süßen Abschluss: unser cremiges Bienenstich-Tiramisu (8,5 €).",
};
