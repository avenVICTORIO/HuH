# Benutzerhandbuch

## Grundidee

Der Raumplan ist die Hauptansicht. Er soll in wenigen Sekunden beantworten:

- Welche Tische sind frei, bald belegt, besetzt oder in Reinigung?
- Wer kommt als Nächstes?
- Welche Aufgaben sind jetzt oder bald relevant?

Seltenere Funktionen liegen hinter **Betrieb**. Dadurch bleibt die Hauptansicht auf dem Tablet übersichtlich.

## Ersteinrichtung

Vor der ersten echten Reservierung sollte ein verantwortliches Teammitglied den Betrieb einmal vollständig einrichten:

1. Unter **Betrieb → Daten & Zeiten** für jeden Wochentag die Öffnungszeiten hinterlegen. Über **Zeitfenster hinzufügen** sind mehrere getrennte Phasen möglich, etwa `09:00–12:00` und `17:00–23:00`. Ein Tag ohne Zeitfenster ist ein Ruhetag.
2. Im selben Bereich Aufenthaltsdauer, Reinigung, Zusammenstellen und Rückbau an die realen Abläufe anpassen. Diese Werte blockieren Tische tatsächlich und beeinflussen die Planung.
3. Unter **Betrieb → Betrieb** den Wetterstandort suchen, das richtige Suchergebnis auswählen und speichern. Erst danach erscheint die rein informative Vorhersage. Der gesetzte Status **Trocken/Regen** und die Freigabe des Außenbereichs bleiben bewusste Entscheidungen des Teams.
4. Optional Barplätze, automatische Walk-in-Teilung und native Hinweise konfigurieren. Native Hinweise funktionieren ergänzend nur, solange die Anwendung geöffnet ist.
5. Eine Testreservierung anlegen und den vollständigen Weg bis Abgang und Reinigung prüfen. Für eine umfangreichere Einweisung kann **Demo-Monat erzeugen** verwendet werden; anschließend stellt **Alles auf null** den gesamten lokalen Stand einschließlich Einstellungen zurück.
6. Unter **Backup & Gerätewechsel** ein erstes Backup herunterladen und einen betrieblichen Speicherort dafür festlegen.

Die Daten liegen ausschließlich im aktuellen Browserprofil. Vor dem Löschen von Browserdaten, einem Gerätewechsel oder einer größeren Demonstration sollte deshalb ein aktuelles Backup vorhanden sein.

### Start ohne lokalen Server

Die ausgelieferte Datei `dist-file/Hand-aufs-Herz.html` kann in Chromium direkt per Doppelklick bzw. über **Datei öffnen** gestartet werden. JavaScript und Gestaltung sind vollständig in dieser einen Datei enthalten; Node.js, eine Installation oder ein lokaler Webserver sind dafür nicht erforderlich.

Die HTML-Datei sollte anschließend an einem festen Speicherort bleiben und möglichst immer mit demselben Browserprofil geöffnet werden. Browser können Daten einer `file://`-Anwendung abhängig vom absoluten Dateipfad getrennt behandeln. Deshalb vor Verschieben, Umbenennen oder Ersetzen der Datei ein JSON-Backup herunterladen und danach bei Bedarf wieder importieren. Die Wettervorhersage benötigt weiterhin eine Internetverbindung; native Browserhinweise können beim Start vom Dateisystem eingeschränkt sein. Die Aufgabenliste in der Anwendung bleibt maßgeblich.

![Hauptansicht mit Raumplan, Reservierungsliste und Aufgabenglocke](assets/user-guide/01-raumplan.png)

*Die Hauptansicht auf einem Tablet: Raumplan, Reservierungen und die Glocke für aktuell relevante Aufgaben.*

## Betriebstag wechseln

Der angezeigte Betriebstag steht groß links oben in der Kopfzeile:

- Die Pfeile **‹ ›** wechseln tageweise.
- Ein Tipp auf das Datum öffnet einen Kalender für weiter entfernte Tage.
- **Heute** erscheint nur, wenn gerade nicht der aktuelle Tag gewählt ist, und springt mit einem Tipp zurück.

Dieses eine Datum gilt überall: für die Reservierungsliste, den Raumplan, den Zeitplan und die Aufgaben. Es gibt bewusst keinen zweiten Datumswähler.

## Reservierung anlegen

1. **＋ Reservierung** antippen.
2. Eingangskanal wählen: Telefon, persönlich, online oder sonstige.
3. Datum im lokalen Format `TT.MM.JJJJ` eingeben oder über die große Kalenderfläche wählen. Die großen Uhrzeitfelder werden automatisch aus allen Öffnungszeitfenstern dieses Wochentags erzeugt. Pausen zwischen zwei Zeitfenstern und die jeweilige Schließzeit sind keine möglichen Ankunftszeiten.
4. Sitzbereichswunsch wählen:
   - **Keine Präferenz**
   - **Innen**
   - **Außen**
5. Personenzahl und die **geplante Verweildauer** einstellen. Die Dauer folgt dem Standard für die Gruppengröße und lässt sich in 15-Minuten-Schritten anpassen; ein Tipp auf **Zurück zum Standard** stellt den Vorgabewert wieder her. Die geplante Dauer blockiert den Tisch tatsächlich und fließt in Planung und Zeitplan ein. Auch später ist sie über **Bearbeiten** änderbar.
6. Kontaktdaten eingeben.
7. Abschließen mit:
   - **Automatisch platzieren** — sucht eine sichere Platzierung.
   - **Tisch auswählen** — anschließend einen Tisch im Raumplan antippen.
   - **Nur vormerken** — bleibt sichtbar offen.

Ein Innen-/Außenwunsch ist für die Automatik verbindlich. Kann er nicht sicher erfüllt werden, bleibt die Reservierung offen.

![Reservierungsassistent mit Gästezahl und Sitzbereich](assets/user-guide/05-reservierung-anlegen.png)

*Der Assistent führt mit großen Touch-Zielen schrittweise durch Gruppe, Sitzbereich, Kontakt und anschließende Platzierung.*

## Walk-in aufnehmen

1. **Walk-in** antippen.
2. Gästezahl über die große Zahleneingabe setzen.
3. Optional Innen oder Außen wählen.
4. Automatisch oder manuell platzieren.

Walk-ins erlauben standardmäßig geteilte Tischbelegung. Die Grenze ist ausschließlich die Sitzplatzkapazität. Vier einzelne Walk-ins können daher gemeinsam an einem Vierertisch sitzen.

Auch verbundene Tafeln sind für Walk-ins möglich: Da die Gäste bereits vor Ort sind und kurz warten können, entfällt die sonst nötige Vorlaufzeit für das Zusammenstellen. Direkt nach der Platzierung erscheint die Aufgabe **Tische zusammenstellen**; physische Konflikte mit anderen Belegungen, Reinigung oder Rückbau bleiben selbstverständlich ausgeschlossen.

Walk-ins sind per Definition schon da. Deshalb gilt:

- Ein platzierter Walk-in ist sofort **Am Tisch** — eine separate Ankunftsbestätigung entfällt.
- Nach **Direkt automatisch platzieren** springt die Ansicht zum Raumplan in den richtigen Bereich, und der vorgeschlagene Tisch leuchtet deutlich auf. Ein Tipp irgendwo auf den Plan lässt die Hervorhebung sanft ausklingen.
- Ist ein Tisch aktuell frei, aber später reserviert, bietet die manuelle Platzierung eine **verkürzte Belegung** an („Nur bis 17:15 frei"): Die Verweildauer wird passend gekürzt, Reinigung und ggf. Aufbau der Folgereservierung bleiben gesichert. Ein kurzer Grund ist Pflicht — die Gäste sollen vorab informiert sein.
- Ein einzelner Walk-in kann sich **zu einer bereits sitzenden Partei dazusetzen** (z. B. an einen Vierertisch mit zwei Gästen). Auch das ist eine bewusste manuelle Entscheidung mit Begründungspflicht: erst die Gäste am Tisch fragen, dann platzieren.

![Walk-in-Assistent mit Schnellauswahl für Gästezahl und Bereich](assets/user-guide/06-walk-in.png)

*Gästezahl und gewünschter Bereich lassen sich ohne Tastatur erfassen.*

## Raumplan lesen

Jeder Tisch zeigt die aktuell wichtigste Information:

- **frei** — Tischnummer und Kapazität
- **bald** — Name, Uhrzeit und Personenzahl der nächsten Reservierung
- **besetzt** — aktuelle Partei bzw. Anzahl gleichzeitig sitzender Parteien
- **Reinigung** — Tisch ist physisch noch nicht wieder verfügbar
- **geschlossen** — Außenbereich ist wegen Regen oder betrieblicher Schließung nicht nutzbar

Je näher die nächste Ankunft rückt, desto kräftiger wird der Tisch golden hervorgehoben; in den letzten Minuten pulsiert er leicht, überfällige Ankünfte leuchten rot. So ist ohne Lesen erkennbar, wo gleich Gäste stehen werden.

Belegte Tische zeigen ihre Tischnummer weiterhin klein in der Ecke. Sitzen mehrere Parteien an einem Tisch, wird er sichtbar in Segmente geteilt — auch dann noch, wenn ein Teil der Plätze bereits in Reinigung ist („· Reinigung" im Tischtext).

**Innen/Außen** liegt direkt über dem Raumplan, weil der Wechsel nur diese Ansicht betrifft. Alternativ wechselt ein senkrechtes Wischen über dem Raumplan zwischen beiden Bereichen.

Zusammengezogene Tische erhalten eine gemeinsame Umrandung. Das ist eine zeitabhängige Reservierungszuordnung, keine dauerhafte Änderung am Grundriss.

## Tisch antippen

Die Tischansicht ordnet Informationen bewusst nach Wichtigkeit:

1. **Belegungszeit** — eine horizontal praktisch unbegrenzt scrollbare Zeitleiste mit Reservierung und anschließender Reinigungs-/Rückbauzeit.
2. **Jetzt am Tisch** — aktuell sitzende oder gerade abgeräumte Parteien.
3. **Nächste Ankunft** — groß hervorgehoben.
4. **Danach** — kleinere Zeilen für spätere Reservierungen.

Für die tägliche Arbeit wichtig: Die häufigsten Schritte stehen als Schnellaktionen direkt in der Tischansicht, ohne dass die Reservierung geöffnet werden muss:

- **✓ Ankunft bestätigen** — sobald das Ankunftsfenster erreicht ist.
- **No-Show** — erst ab der erwarteten Ankunftszeit, mit Sicherheitsabfrage.
- **✓ Gäste sind gegangen** — für die gerade sitzende Partei; startet die Reinigung.
- **✓ Reinigung fertig** bzw. anschließend **✓ Rückbau fertig** — schließt die Belegung ab.

Die Schaltflächen erscheinen nur, wenn der jeweilige Schritt zeitlich plausibel ist.

![Tischansicht mit Zeitleiste und nächster Reservierung](assets/user-guide/02-tischansicht.png)

*Die Tischansicht hält die nächste Ankunft groß und spätere Reservierungen kompakt.*

Die Tisch-Zeitleiste lässt sich stufenlos von drei Stunden bis zu einem Monat zoomen. Datum und Uhrzeit stehen in zwei getrennten Kopfzeilen. Bis neun Stunden zeigen die Linien Halbstunden, darüber bleiben über Tages-, Wochen- und Monatszoom hinweg Stunden-Ticks erhalten; nur die Textbeschriftung wird bei wenig Platz ausgedünnt. Geschlossene Phasen werden schraffiert auf höchstens etwa eine sichtbare Stunde zusammengeschoben; Öffnungszeiten und Reservierungsdauern behalten ihren vollen Maßstab. Unterhalb eines Tages bleibt der Pixelmaßstab auch beim Scrollen durch eine geschlossene Nacht konstant. Der Detailzoom hält jeweils 30 Kalendertage im Scrollpuffer; ein Nachladen an dessen Rand erfolgt erst nach Ende der Scrollgeste. Horizontal kann dadurch ruhig über Mitternacht und mehrere Betriebstage gescrollt oder über das Datumsfeld im Format `TT.MM.JJJJ` direkt beispielsweise ins nächste Jahr gesprungen werden.

Eine freie Stelle innerhalb der hell dargestellten Öffnungszeit kann direkt angetippt werden; sie wird auf 15 Minuten gerundet. Die Reservierung wird dann für genau dieses Datum, diese Uhrzeit und diesen Tisch angelegt. Der Abschluss bleibt gesperrt, wenn Kapazität, Öffnungszeit, Reinigung, Aufbau/Rückbau, Außenstatus oder eine andere Belegung kollidieren. Anlage und feste Tischzuweisung werden gemeinsam gespeichert; es bleibt bei einem Konflikt keine halbfertige offene Reservierung zurück.

Jede Partei kann von dort geöffnet werden. Wurde die Reservierung aus einer Tischansicht geöffnet, führt **Zurück zu Tisch …** wieder genau zu dieser Tischansicht; **Schließen** beendet dagegen den gesamten Dialog. Reservierungen, die direkt aus der Seitenliste, Suche oder Aufgabenliste geöffnet wurden, haben keinen künstlichen Tisch-Zurückweg. Gibt es überhaupt keine aktuelle oder spätere Belegung, zeigt die Tischkarte stattdessen einen ruhigen Frei-Zustand ohne leere „Nächste Ankunft“-Zeile.

![Reservierungsansicht mit Zurück-Schaltfläche zum Tisch](assets/user-guide/03-reservierung-mit-zurueck.png)

*Der kontextbezogene Zurück-Knopf erscheint nur beim Weg Tisch → Reservierung.*

**Offene Reservierung hier platzieren** erscheint nur, wenn mindestens eine offene Reservierung an genau diesem Tisch physisch und zeitlich platziert werden kann. Die anschließende Auswahl enthält ebenfalls nur diese passenden Reservierungen.

## Raumplan und Zeitplan

Die Reiter links oben im Arbeitsbereich wechseln die Hauptansicht zwischen:

- **Raumplan** — räumlicher Überblick und primäre Ansicht während des Betriebs.
- **Zeitplan** — alternative, Gantt-artige Tagesansicht mit einer Lane je Tisch sowie getrennten Gruppen für innen und außen. Eine rote senkrechte Linie markiert die aktuelle Uhrzeit; beim Öffnen des heutigen Tages startet die Ansicht automatisch dort. Beim Scrollen in einen anderen Tag folgt das Datum links oben automatisch, und **Heute** springt zurück zum aktuellen Tag und zur aktuellen Uhrzeit.

Im Zeitplan bestimmt der stufenlose Zoom den Zeitraum über die volle verfügbare Breite: mindestens drei Stunden, dann fließend größere Ausschnitte bis maximal ein Monat. Die obere Achsenzeile zeigt Kalendertage, die untere Uhrzeiten. Bis neun Stunden werden Halbstunden-Ticks gezeichnet, bei allen größeren Ausschnitten weiterhin Stunden-Ticks. Wo der Platz für jeden Text fehlt, bleiben die Ticklinien bestehen und nur einzelne Uhrzeitbeschriftungen werden ausgelassen. Unterhalb eines Tages ist der Maßstab an die Zoomstufe gebunden und ändert sich nicht, nur weil die sichtbare Mitte gerade in einer komprimierten Schließphase liegt. Der 30-Tage-Detailpuffer wird erst nach Ende einer Scroll- oder Drag-Geste unmerklich neu zentriert. So bleiben Reservierungsbreiten beim Übergang über Mitternacht stabil.

Auf dem Tablet lässt sich der Zeitraum zusätzlich mit zwei Fingern auf- und zuziehen (Pinch-Zoom); der Regler rechts oben bleibt als Alternative. Der Zeitplan folgt dem oben gewählten Betriebstag — ein weit entferntes Datum wird über den Kalender in der Kopfzeile geöffnet.

Schließzeiten und Pausen zwischen zwei Öffnungsfenstern erscheinen als schmale schraffierte Unterbrechung von höchstens ungefähr einer Stunde Breite. So bleibt auch in der Wochen- oder Monatsansicht mehr Platz für tatsächlich reservierbare Zeit. Die hinterlegten realen Zeitpunkte ändern sich dadurch nicht; Scrollen, Reservierungsblöcke und das Antippen eines freien Bereichs verwenden weiterhin die exakte Kalenderzeit.

Reservierungsblöcke zeigen Belegungs- und anschließende Reinigungs-/Rückbauzeit. Auch hier legt das Antippen einer tatsächlich freien Öffnungszeit eine Reservierung direkt für diesen Tisch und das angezeigte Datum an. Deaktivierte Barplätze bleiben zur Orientierung sichtbar, werden aber am Ende der Innengruppe gedämpft dargestellt.

![Zeitplan mit Tisch-Lanes und horizontaler Zeitachse](assets/user-guide/08-zeitplan.png)

*Der Zeitplan zeigt dieselben Reservierungen als alternative Lane-Ansicht; Raumplan und Zeitplan sind gleichberechtigte Reiter.*

## Reservierungen suchen

Die Suche am unteren Rand der Reservierungsliste durchsucht den aktuell gewählten Betriebstag nach Name oder Telefonnummer. Leerzeichen, Klammern, Schrägstriche und Bindestriche in Telefonnummern müssen nicht mit eingegeben werden; `030123456` findet daher auch `030 / 12 34-56`. Während einer Suche werden alle Status berücksichtigt, auch wenn zuvor beispielsweise **Platziert** gewählt war. Trefferzahl und ein mindestens 44 px großer Löschknopf machen den Suchzustand auf dem Tablet eindeutig. Nach dem Löschen gilt wieder der gewählte Statusfilter.

![Gefilterte Reservierungsliste mit Trefferzahl und Löschknopf](assets/user-guide/07-suche.png)

*Während einer Suche werden alle Status einbezogen; die Trefferzahl macht den Filterzustand sichtbar.*

## Automatisch planen

**Auto-Plan** öffnet immer zuerst eine Vorschau. Die Vorschau zeigt:

- neue und geänderte Zuweisungen,
- offen bleibende Reservierungen,
- fixierte Platzierungen,
- Zeitlimit-/Konflikthinweise.

Erst **Plan anwenden** ändert die Daten. Gibt es in der Vorschau keine Änderung, zeigt sie stattdessen **Plan ist bereits aktuell** und bietet keine wirkungslose Anwenden-Schaltfläche an. Bereits sitzende Gäste, Reinigungsvorgänge, manuell gesperrte Platzierungen und Platzierungen im Einfrierfenster werden nicht ungefragt verschoben.

![Auto-Plan-Vorschau mit Änderungen und offen bleibenden Reservierungen](assets/user-guide/09-auto-plan.png)

*Die Vorschau trennt Prüfung und Mutation: Erst „Plan anwenden“ übernimmt die gezeigten Änderungen.*

Der Solver darf je Planung höchstens eine Sekunde rechnen. Er zeigt danach den besten bis dahin gefundenen gültigen Plan; ein erreichtes Zeitlimit ist niemals eine Erlaubnis, physische Regeln zu verletzen.

**Auto-Plan** erscheint nur, solange der Tag mindestens eine noch nicht platzierte Reservierung enthält, die die Automatik prüfen darf. Sind alle Gäste platziert, verschwindet die Schaltfläche, statt eine wirkungslose Prüfung anzubieten. Auf schmalen Ansichten bleibt auch **Liste** ausgeblendet, solange der Tag keine Reservierungen enthält.

Die Automatik berücksichtigt:

- Gästezahl und Sitzplatzkapazität,
- Innen-/Außenwunsch,
- Regen und geschlossenen Außenbereich,
- Aufenthaltsdauer,
- Reinigung nach jeder Partei,
- Aufbauzeit für zusammengezogene Tische,
- Rückbauzeit vor einer anderen Tischkonfiguration,
- bereits sitzende Gäste,
- geteilte Tischbelegung,
- den gemeinsamen Zusatzplatz von Tisch 17 und 17A.

## Manuell platzieren und bewusst abweichen

Bei manueller Platzierung werden passende Einzel- und Tafelkombinationen angeboten.

Eine kurze Begründung ist Pflicht, wenn Mitarbeitende:

- entgegen dem Innen-/Außenwunsch platzieren oder
- eine normale Reservierung ohne vorherige Zustimmung an einen geteilten Tisch setzen.

Physisch unmögliche Platzierungen — Überkapazität, Zeitkollision, offene Reinigung, fehlende Aufbauzeit — bleiben gesperrt. Ein manueller Override ist Kontrolle, kein Weg zum Doppelbuchen.

![Manuelle Platzierungsoptionen für einen ausgewählten Tisch](assets/user-guide/10-manuelle-platzierung.png)

*Ausgehend vom angetippten Tisch erscheinen Einzel- und Verbindungsmöglichkeiten mit Kapazität, Bereich und Verfügbarkeit.*

## Ankunft, Verspätung und Abgang

Die Schritte Ankunft, No-Show, Abgang und Reinigung stehen als Schnellaktionen direkt in der Tischansicht (siehe oben). Die Reservierungsansicht bietet dieselben Aktionen mit allen Details:

- **Ankunft bestätigen** erscheint ab 20 Minuten vor der erwarteten Ankunft und sperrt die tatsächliche Belegung gegen Umplanung. Davor zeigt die Karte nur, ab wann die Bestätigung möglich ist.
- **Verspätung** verschiebt die erwartete operative Ankunft und wird protokolliert.
- **No-Show** erscheint erst ab der erwarteten Ankunftszeit und gibt die geplanten Ressourcen frei.
- **Tisch frei / Gäste gegangen** startet die Reinigung.

Nach dem Abgang bleibt der Tisch bis zum Abschluss der Reinigung blockiert. Bei einer Tafel kann anschließend ein eigener Rückbau-Schritt offen sein. Bleibt dieselbe Tafelkonfiguration für die Folgereservierung bestehen, entfällt unnötiger Rückbau und erneuter Aufbau.

## Aufgaben und Hinweise

Die Glocke im Kopf zeigt als Zähler, wie viele Aufgaben aktuell oder bald relevant sind. Erst ein Antippen öffnet die vollständige Aufgabenliste als Dropdown; der Raumplan verliert dadurch im normalen Betrieb keine Höhe. Dieselbe Liste ist weiterhin unter **Betrieb → Jetzt** erreichbar. Nur der aktive Stoßbetrieb bleibt als unübersehbarer Warnstreifen sichtbar.

![Geöffnete Aufgabenliste unter der Glocke](assets/user-guide/04-aufgaben.png)

*Die Aufgabenliste liegt über der Hauptansicht und zeigt nur aktuell oder bald bearbeitbare Schritte.*

Zukünftige Aufgaben werden nicht unmittelbar nach dem Anlegen einer Reservierung eingeblendet:

- Ankünfte erscheinen erst im unter **Daten & Zeiten** konfigurierten Ankunftsvorlauf.
- Das Zusammenstellen verbundener Tische erscheint erst im konfigurierten Vorbereitungsvorlauf vor dem errechneten Aufbautermin.
- Noch nicht platzierte Reservierungen und Regenkonflikte erscheinen höchstens vier Stunden vor der Ankunft.
- Bereits überfällige Ankünfte, Reinigung, Rückbau und Raumabgleich sind unmittelbar relevant und bleiben sichtbar, bis sie bearbeitet werden.

Mögliche Aufgaben:

- Reservierung kommt bald,
- Reservierung ist überfällig,
- Tische zusammenstellen,
- Tische zurückbauen,
- Tisch reinigen,
- baldige Reservierung noch ohne Tisch,
- Regenkonflikt,
- Raumzustand nach Stoßbetrieb abgleichen.

Aufgaben können zehn Minuten verschoben oder — wenn fachlich sinnvoll — ausgeblendet werden. Aufbau, Reinigung, Rückbau und Raumabgleich werden durch die jeweilige reale Aktion abgeschlossen, nicht nur weggeklickt.

## Wetter und Außenbereich

Unter **Betrieb → Betrieb**:

- **Trocken** oder **Regen** setzen.
- Außenbereich betrieblich öffnen/schließen.
- Einen Standort für die externe Wettervorhersage suchen und speichern.

Regen schließt den Außenbereich für neue Planungen. Bereits außen platzierte Reservierungen werden nicht heimlich verschoben. Stattdessen erscheint ein kritischer Konflikt, den das Team bewusst löst.

Nach dem Speichern eines Standorts bewertet ein kleines Overlay im Raumplan die nächsten drei Vorhersagestunden in Klartext — im Zeitplan wird es ausgeblendet, damit es keine Tisch-Lanes verdeckt — **trocken**, **windig**, **evtl. Regen**, **Regen …%** oder **Sturmböen** — und fasst links zusammen, ob draußen verlässlich platziert werden kann: **Draußen ok**, **Draußen unsicher** oder **Nicht draußen**. Riskante Stunden sind gelb bzw. rot hinterlegt, sodass die Terrassen-Entscheidung auf einen Blick möglich ist; die genauen Zahlen zu Regen und Böen erscheinen beim Berühren einer Stunde. Ein Antippen öffnet sieben Tage mit Temperatur, Niederschlagswahrscheinlichkeit und -menge sowie Wind und Böen. Die Prognose stammt über Bright Sky aus Daten des Deutschen Wetterdienstes; die explizit gestartete Standortsuche nutzt OpenStreetMap Nominatim.

![Sieben-Tage-Wettervorhersage mit Informationshinweis](assets/user-guide/12-wetter.png)

*Die Detailansicht kennzeichnet ausdrücklich, dass die Prognose nur informiert und keine betrieblichen Entscheidungen automatisiert.*

Die externe Prognose ist ausschließlich eine Entscheidungshilfe. Sie ändert niemals den manuell gesetzten Wetterstatus, die Freigabe des Außenbereichs, Aufgaben, Reservierungen oder den Plan. Diese Entscheidungen bleiben immer bei den Mitarbeitenden. Standort und Koordinaten werden lokal in den Betriebseinstellungen gespeichert; Suchanfragen bzw. Vorhersageabrufe werden an die genannten Dienste übertragen.

## Stoßbetrieb und Rückkehr zur Ordnung

Wenn Mitarbeitende während einer Spitze Gäste frei platzieren, ohne jede Aktion einzutragen:

1. **Stoßbetrieb starten**.
2. Im Restaurant pragmatisch arbeiten. Native Hinweise pausieren.
3. Sobald Luft ist, **Stoßbetrieb beenden**.
4. **Abgleich öffnen** wählen. Die App wechselt direkt zu **Betrieb**.
5. **Raumabgleich beginnen**.
6. Für jeden bereits fälligen Vorgang den Ist-Zustand bestätigen. Zukünftige Ankünfte werden noch nicht als Abgleichaktion angeboten:
   - sitzt wie geplant,
   - sitzt an anderem Tisch,
   - No-Show,
   - bereits gegangen und sauber,
   - nicht erfassten Walk-in hinzufügen.
7. Abgleich abschließen.
8. Optional Auto-Plan für die noch zukünftigen Reservierungen vorschauen und anwenden.

![Aktiver Stoßbetrieb im Betriebsfenster](assets/user-guide/13-stossbetrieb.png)

*Im Stoßbetrieb warnt die Oberfläche vor dem möglicherweise abweichenden Raumzustand und führt anschließend in den Pflichtabgleich.*

Das System behauptet während des Stoßbetriebs ausdrücklich nicht, den Raum vollständig zu kennen. Nach dem Abgleich sind tatsächliche Belegungen wieder harte Randbedingungen.

## Einstellungen

Unter **Betrieb → Daten & Zeiten** lassen sich Durchschnittswerte einstellen:

- beliebig viele Öffnungszeitfenster oder einen Ruhetag für jeden Wochentag,
- Reinigung je Partei,
- Zusammenstellen je Tischverbindung,
- Rückbau je Verbindung,
- typische Aufenthaltsdauer für kleine/große Gruppen,
- Einfrierfenster vor Ankunft,
- Ankunfts- und Vorbereitungshinweis,
- Verspätungskulanz,
- automatische Walk-in-Teilung,
- optionale Barplätze für Einzelgäste.

Die Zeitwerte sind keine reine Anzeige. Sie werden direkt als harte Nebenbedingungen der Planung verwendet.

Die wöchentlichen Öffnungszeiten steuern den Reservierungsdialog: Für das gewählte Datum werden in jedem Zeitfenster halbstündliche Ankunftszeiten ab Öffnung bis vor Schließung angeboten. So lassen sich beispielsweise `09:00–12:00` und `17:00–23:00` mit einer geschlossenen Mittagspause hinterlegen. Hat ein Wochentag kein Zeitfenster, kann an diesem Tag keine Reservierung angelegt werden.

![Öffnungszeiten mit zwei getrennten Zeitfenstern an einem Wochentag](assets/user-guide/11-oeffnungszeiten.png)

*Mehrere Zeitfenster bilden beispielsweise Vormittags- und Abendservice mit geschlossener Mittagspause ab.*

## Demo- und Testdaten

Unter **Betrieb → Betrieb → Demo & Testdaten** stehen zwei bewusst bestätigungspflichtige Aktionen nebeneinander:

- **Demo-Monat erzeugen** ersetzt Reservierungen und Tageszustände durch eine deterministische, realistisch schwankende Auslastung für 30 Tage ab dem gewählten Datum. Bei den standardmäßig täglich hinterlegten Öffnungszeiten belegen zehn realistische Großgruppen wechselnde Kombinationen aus zwei oder drei verbundenen Tischen; die erste ist direkt am Starttag sichtbar. Konfigurierte Ruhetage bleiben frei. Wochenenden sind stärker, einzelne Tage regnerisch und Außenplätze bleiben dann ebenfalls frei. Öffnungszeiten, Wetterstandort und sonstige Einstellungen bleiben erhalten.
- **Alles auf null** entfernt den vollständigen lokalen Arbeitsstand und setzt auch Öffnungszeiten, Wetterstandort und Einstellungen auf Standard zurück.

Beide Aktionen können echte lokale Daten ersetzen. Vor dem Einsatz in einem produktiv genutzten Browserprofil sollte deshalb ein Backup heruntergeladen werden.

## Backup und Gerätewechsel

Unter **Betrieb → Daten & Zeiten → Backup & Gerätewechsel**:

- **Backup herunterladen** erzeugt eine JSON-Datei.
- **Backup importieren** ersetzt den vollständigen lokalen Arbeitsstand durch die Datei.

Der Import akzeptiert nur exakt die aktuelle Schema-Version. Es gibt bewusst keine Legacy-Migration.

Die Backup-Datei enthält personenbezogene Daten im Klartext. Sie sollte nicht in öffentlich zugänglichen Ordnern oder ungeschützten Chats abgelegt werden.

## Was lokal gespeichert wird

Alle Reservierungen, Einstellungen, Tageszustände, Aufgabenquittungen, Benachrichtigungsbelege, Rush-Zustände und Audit-Einträge werden nach jeder Änderung in einem versionierten `localStorage`-Datensatz gespeichert.

Ein privates Browserfenster, das Löschen von Website-Daten, ein Browserprofilwechsel oder beim Dateisystem-Build je nach Browser auch ein geänderter Dateipfad kann diesen lokalen Stand entfernen bzw. einen getrennten Stand öffnen. Regelmäßige Backups bleiben deshalb sinnvoll.
