# CLAUDE.md — Reservierungs-App „Hand aufs Herz"

Kontext für Claude-Code-Sessions in diesem Projekt. Technische Regeln und
Invarianten stehen in `AGENTS.md` — die gelten weiterhin und zuerst.

## Was ist das hier?
Tablet-Reservierungssystem für das Restaurant „Hand aufs Herz" (München).
Basis: Svelte 5 + strict TypeScript, local-first (localStorage), ein
Offline-Build als einzelne HTML-Datei (`dist-file/Hand-aufs-Herz.html`).

Dieser Stand ist der **Merge** aus der final43-Version und der Bedienlogik
der alten HaH-Eigenentwicklung. Alle Änderungen sind in
`../00_LIESMICH_Merge.md` dokumentiert (22 Punkte). Kurzfassung der
Philosophie: **erst machen, dann höchstens eine Frage** — Schutzlogik bleibt
im Hintergrund aktiv, aber keine Rückfrage ohne operativen Wert.

## Leitplanken für Änderungen (vom Inhaber Victorio)
- Tablet-first, Abendservice, schnelles Grobmotorik-Tippen.
- Häufig genutzte Buttons: groß, grün, ganz oben. Selten: klein, weiß.
  Rot nur endgültig (No-Show, Stornieren).
- Direkt-Platzierung: Tisch antippen platziert sofort. Rückfragen nur bei
  Restplätzen (≥2 frei), zu kleinem Tisch (Tafel-Modus) oder Zeitkonflikt.
- Kein Reinigungsschritt: „Gäste sind gegangen" gibt den Tisch sofort frei.
- Wix ist nur LESEND angebunden (CSV-Import, Betrieb → Daten & Zeiten).
  Niemals Schreibzugriff auf Wix bauen.
- Deutsch, Zahlen im deutschen Format, Ton knapp.

## Arbeiten
- `npm install` einmalig, dann `npm run dev` (Entwicklung) oder
  `npm run build` (erzeugt `dist/` + Offline-Datei `dist-file/`).
- Vor Abschluss: `npm run verify` (check, unit, playbooks, e2e, build).
  Auf Maschinen ohne passende Playwright-Browser:
  `PLAYWRIGHT_CHROMIUM_PATH=<pfad-zu-chrome>` setzen.
- `HaH_Cockpit`-Konventionen des Gesamtordners: eine aktuelle Version je
  Dokument, Altes ins `_Archiv/`.

## Offene Punkte
Siehe `../00_LIESMICH_Merge.md` (unten) und `00_KI Projekt/Ideen-Backlog.md`
(Abschnitt „Reservierungs-App"): Zusatzstuhl flexibel an Tisch 11–14,
Ein-Tipp-Ankunft, Betrieb-Menü entrümpeln, Hochformat-Feinschliff,
Wix-Live-Anbindung (Etappe 3, nur lesend, braucht Wix-API-Schlüssel).
