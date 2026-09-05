// Seed-Inhalt für die Ablauf-Checklisten (Aufbau / Leerlauf / Abbau).
// Quelle: „Abläufe Bar & Service_Hand aufs Herz_250726" (Qualitätsmanagement).
// Nach dem Seed sind die Aufgaben im Dashboard (Tab „Abläufe") frei editierbar.
// Hinweis: Titel/Info als Backtick-Strings, damit „…"-Anführungszeichen unproblematisch sind.

export type SeedAufgabe = {
  prozess: "aufbau" | "leerlauf" | "abbau";
  gruppe: string | null;
  titel: string;
  info: string | null;
};

export const ABLAEUFE_SEED: SeedAufgabe[] = [
  // ================= AUFBAU =================
  { prozess: "aufbau", gruppe: `Start & Technik`, titel: `Beleuchtung einschalten`, info: `iPad → App „Shelly" → Licht allgemein.` },
  { prozess: "aufbau", gruppe: `Start & Technik`, titel: `Musikanlage einschalten`, info: `Playlist „Herzerl" über Spotify abspielen.` },
  { prozess: "aufbau", gruppe: `Start & Technik`, titel: `Spülmaschine einschalten`, info: `Warten, bis sie grün leuchtet, bevor weitere Geräte (z. B. Kaffeemaschine) angeschaltet werden.` },
  { prozess: "aufbau", gruppe: `Start & Technik`, titel: `Kaffeemaschine einschalten`, info: `Immer Stufe 2. Kaffeemühle ggf. auffüllen.` },
  { prozess: "aufbau", gruppe: `Start & Technik`, titel: `Putzeimer bereitstellen`, info: `Mit Wasser + Spüli füllen, Lappen und Schwamm dazu.` },
  { prozess: "aufbau", gruppe: `Start & Technik`, titel: `Zapfhähne abzapfen`, info: `Aus jedem Zapfhahn ca. 1 Bierglas abzapfen.` },

  { prozess: "aufbau", gruppe: `Innen & Möbel`, titel: `Außenbeleuchtung einschalten`, info: `Hauswand über Schaltkasten. Schanigarten über Mehrfachsteckdose + schwarze Fernbedienung (Richtung Schanigarten halten, lange auf „On" drücken).` },
  { prozess: "aufbau", gruppe: `Innen & Möbel`, titel: `Stühle & Barhocker stellen`, info: `Im Gastraum abstuhlen und Barhocker stellen.` },
  { prozess: "aufbau", gruppe: `Innen & Möbel`, titel: `Gastraum kontrollieren`, info: `Alte Servietten, Essensreste, Staub entfernen. Bei Bedarf Tische, Stühle und Bänke wischen, Spinnweben an der Decke entfernen.` },

  { prozess: "aufbau", gruppe: `Toiletten`, titel: `Toiletten & Pissoirs spülen`, info: `Auf Sauberkeit achten, alle Toiletten und Pissoirs spülen.` },
  { prozess: "aufbau", gruppe: `Toiletten`, titel: `Toilettenpapier auffüllen`, info: `Halter + 5 Rollen in jedem Korb.` },
  { prozess: "aufbau", gruppe: `Toiletten`, titel: `Handtuchspender & Seife prüfen`, info: `Handtuchspender voll? Seife aufgefüllt?` },
  { prozess: "aufbau", gruppe: `Toiletten`, titel: `Mülleimer leeren (WC)`, info: null },

  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Außenbereich reinigen`, info: `Müll, Kippen und Dreck aufsammeln oder aufkehren.` },
  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Schanigarten bestuhlen`, info: `Stühle im Schanigarten aufstellen.` },
  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Bierbänke aufstellen`, info: `An der Hauswand aufstellen.` },
  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Markisen ausfahren`, info: `Bis etwa zur Hälfte ausfahren.` },
  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Mülleimer vor den Eingang stellen`, info: `Rechte Seite der Eingangstüre.` },
  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Staffelei & Schilder aufstellen`, info: null },
  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Blumen prüfen & ggf. gießen`, info: `Schanigarten und Fensterbänke. An heißen Tagen täglich.` },
  { prozess: "aufbau", gruppe: `Außenbereich`, titel: `Besteckkrüge & Aschenbecher verteilen`, info: `Jeder Tisch: 1 Krug mit 6× Besteck + Servietten. Aschenbecher jeweils dahinter.` },

  { prozess: "aufbau", gruppe: `Gastraum & Service`, titel: `Reservierungen checken`, info: `Wix App öffnen → nach „reserviert" filtern. Wünsche/Notizen in den Reservierungen prüfen.` },
  { prozess: "aufbau", gruppe: `Gastraum & Service`, titel: `Aufsteller „RESERVIERT" vorbereiten`, info: `RESERVIERT + Name + Zeit. Bei Bedarf Tische umstellen und Bestuhlung anpassen.` },
  { prozess: "aufbau", gruppe: `Gastraum & Service`, titel: `Brotstation vorbereiten`, info: `4× Wurzelbrot hell + 4× Vollkorn aufbacken (an ruhigen Tagen 2× & 2×), Brezn aufbacken.` },
  { prozess: "aufbau", gruppe: `Gastraum & Service`, titel: `Salz & Pfeffer vorbereiten`, info: `Streuer prüfen und ggf. auffüllen.` },

  { prozess: "aufbau", gruppe: `Barstation`, titel: `Getränkevorräte kontrollieren`, info: `Kühlung voll. Rotweine min. 3 je Sorte; Mikks, Aperol, Campari, Sarti min. 3 je Sorte.` },
  { prozess: "aufbau", gruppe: `Barstation`, titel: `Früchte & Kräuter vorbereiten`, info: `Zitronen & Orangen (halbe Scheiben), Limetten (ganze Scheiben), Minze in feuchtem Papier in der Kühlung.` },
  { prozess: "aufbau", gruppe: `Barstation`, titel: `Barstation aufbauen`, info: `Aperol, Campari, Sarti + je 1 Sorte Mikks neben die Kaffeemaschine. Früchte bereitstellen.` },
  { prozess: "aufbau", gruppe: `Barstation`, titel: `Eiswürfel auffüllen`, info: `Bei ruhigen Tagen halber Beutel. Bereitstellen.` },

  // ================= LEERLAUF =================
  { prozess: "leerlauf", gruppe: null, titel: `Bar-Brett wischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Tabletts durch die Spülmaschine lassen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Getränkeschubladen auswischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Bänke & Stühle wischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Fensterbänke wischen`, info: `Auch außen.` },
  { prozess: "leerlauf", gruppe: null, titel: `Bar-Regal mit Glasreiniger wischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Alt-Glas rausbringen`, info: `Orange Tonne.` },
  { prozess: "leerlauf", gruppe: null, titel: `Kaffee-Station & Maschine säubern`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Regale ordnen, Schubladen sortieren & wischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Gläsermatten säubern`, info: `Unter Zapfhahn & auf Regalbrett, darunter wischen.` },
  { prozess: "leerlauf", gruppe: null, titel: `Kerzen-Gläser auf Fensterbrettern säubern`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Fenster & Türgläser mit Glasreiniger wischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Salz- & Pfeffermühlen auffüllen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Besteckkrüge innen auswischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Kühlschranktüren mit Glasreiniger wischen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Kerzenreste von Tischen kratzen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Kerzenhalter reinigen`, info: null },
  { prozess: "leerlauf", gruppe: null, titel: `Spülbecken ausreiben & sauber wischen`, info: null },

  // ================= ABBAU =================
  { prozess: "abbau", gruppe: `Bar & Reinigung`, titel: `Geschirr spülen`, info: `Schwammtuch mitspülen. Tischaschenbecher zuletzt spülen.` },
  { prozess: "abbau", gruppe: `Bar & Reinigung`, titel: `Bar-Station abbauen`, info: `Mikks, Spirituosen & Früchte in die Kühlung.` },
  { prozess: "abbau", gruppe: `Bar & Reinigung`, titel: `Eis entsorgen`, info: `Übriges Eis in GN-Behälter und in die TK-Truhe.` },

  { prozess: "abbau", gruppe: `Vorräte auffüllen`, titel: `Kühlschubladen auffüllen`, info: `Getränke in Kühlschubladen auffüllen.` },
  { prozess: "abbau", gruppe: `Vorräte auffüllen`, titel: `Bar-Regal & Weinkühlschrank auffüllen`, info: `Rotweine min. 2/Sorte; Mikks/Aperol/Campari/Sarti min. 2/Sorte; Weißweine 2/Sorte (Stadler-Wein für Schorle min. 6).` },
  { prozess: "abbau", gruppe: `Vorräte auffüllen`, titel: `Zitrusfrüchte für morgen auffüllen`, info: `Nicht schneiden.` },

  { prozess: "abbau", gruppe: `Service`, titel: `Besteck polieren & Krüge vorbereiten`, info: `Je 6× Besteck + Servietten. Für außen Steinkrüge mit je 4×.` },
  { prozess: "abbau", gruppe: `Service`, titel: `Krüge auf alle Tische verteilen`, info: `Rest an Besteck in die Schublade einräumen.` },
  { prozess: "abbau", gruppe: `Service`, titel: `Leuchten einsammeln & laden`, info: `An Ladestation anschließen. Kerzenhalter neu bestücken (Kerzen unten anschmelzen, damit sie gut stehen).` },
  { prozess: "abbau", gruppe: `Service`, titel: `Tische in Ursprungsposition bringen`, info: null },

  { prozess: "abbau", gruppe: `Technik & Reinigung`, titel: `Kaffeemaschine reinigen`, info: `Frühestens 15 min vor Schließzeit und nach der Kaffeerunde. Abtropfgitter in der Küchen-Spülmaschine spülen.` },
  { prozess: "abbau", gruppe: `Technik & Reinigung`, titel: `Theke, Zapfhähne & Kühlfronten wischen`, info: null },
  { prozess: "abbau", gruppe: `Technik & Reinigung`, titel: `Bar-Licht ausschalten`, info: `Kühlschrankbeleuchtung und Licht „Station" am Schaltschrank aus. Bar-Licht über den Schalter hinter dem Tablett aus.` },
  { prozess: "abbau", gruppe: `Technik & Reinigung`, titel: `Spülmaschine abpumpen & ausschalten`, info: `Nach Anweisung Spülarme und Siebe entfernen und abspülen.` },
  { prozess: "abbau", gruppe: `Technik & Reinigung`, titel: `Küchenhandtuch zum Trocknen aufhängen`, info: `Über der Kaffeemaschine.` },

  { prozess: "abbau", gruppe: `Toiletten`, titel: `Toiletten & Pissoirs spülen`, info: `Auf Sauberkeit achten.` },
  { prozess: "abbau", gruppe: `Toiletten`, titel: `Toilettenpapier auffüllen`, info: `Halter + 5 Rollen in jedem Korb.` },
  { prozess: "abbau", gruppe: `Toiletten`, titel: `Handtuchspender, Seife & Mülleimer prüfen`, info: null },

  { prozess: "abbau", gruppe: `Rundgang & Außen`, titel: `Rundgang durch den Gastraum`, info: `Servietten, Essensreste, Staub entfernen. Bei Bedarf wischen, Spinnweben entfernen.` },
  { prozess: "abbau", gruppe: `Rundgang & Außen`, titel: `Außenbereich abbauen`, info: `Schilder, Staffelei, Mülleimer & Aschenbecher rein. Mülleimer leeren (keine Tüte – Brandgefahr durch Glut). Bierbänke auf Tische, Stühle anlehnen.` },
  { prozess: "abbau", gruppe: `Rundgang & Außen`, titel: `Außenbeleuchtung ausschalten`, info: `Fernbedienung Schanigarten, Stecker Lichterkette, Schaltschrank für Strahler außen.` },

  { prozess: "abbau", gruppe: `Kasse & Abschluss`, titel: `Kassenschnitt & Kassenabschluss`, info: `Alle Tische zu. „Mitarbeiter"-Tisch rabattieren. Ecos → CCV Kassenschnitt (Service 1 & 2) → Kassenabschluss → grüner Drucker. Bons tackern.` },
  { prozess: "abbau", gruppe: `Kasse & Abschluss`, titel: `Abrechnung`, info: `Geldbeutel zählen (Anfang 200€). Trinkgeld: 20% in Umschlag Küche, Rest unter Service. „Cash abzugeben" + Bons in Beutel „Umsatz". Alles in den Safe.` },
  { prozess: "abbau", gruppe: `Kasse & Abschluss`, titel: `Abschlussrunde`, info: `Keller, Personaltoilette, Küche schließen. Stühle hoch (Mo/Do/Sa), Matten zur Seite (Sa). Letzter Rundgang, alle Lichter aus (Barlicht!), Türe abschließen.` },
];
