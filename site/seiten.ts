// Die erzählenden Seiten: Über uns, Feiern, Kontakt, Impressum, Datenschutz.

import { seite } from "./layout";
import { bogenSzene, huegelSvg, iconSvg, zweigSvg } from "./art";
import { HAUS, ZEITEN_TEXT } from "./info";
import { alsDatum } from "../reservierungen";

// ------------------------------------------------------------------ Bausteine

const seitenkopf = (eyebrow: string, titel: string, lead: string) => /* html */ `
<section class="dunkel" style="background:var(--tann); padding:clamp(52px,7vw,88px) 0 0; text-align:center;">
  <div class="wrap schmal">
    <p class="eyebrow" style="color:var(--sand)">${eyebrow}</p>
    <h1 style="margin-bottom:16px">${titel}</h1>
    <p class="lead" style="max-width:52ch; margin:0 auto">${lead}</p>
  </div>
  ${huegelSvg(["var(--tann-hell)", "var(--sand)", "var(--creme)"], { hoehe: 120 })}
</section>`;

const gemeinsamesCss = /* css */ `
  .zwei{display:grid; grid-template-columns:1fr 1fr; gap:clamp(30px,5vw,72px); align-items:center;}
  @media (max-width:860px){ .zwei{grid-template-columns:1fr;} }
  .zwei svg.szene{width:100%; max-width:380px; margin:0 auto;}
  .zitat-gross{
    font-family:var(--serif); font-size:clamp(25px,3.6vw,38px); line-height:1.32; color:var(--tann);
    text-align:center; max-width:22ch; margin:0 auto;
  }
  .werte-drei{display:grid; grid-template-columns:repeat(3,1fr); gap:26px;}
  .werte-drei svg{width:34px; height:34px; color:var(--ton); margin-bottom:14px;}
  .werte-drei h3{margin-bottom:10px;}
  .werte-drei p{font-size:15.5px; color:var(--tinte-weich); margin:0;}
  @media (max-width:820px){ .werte-drei{grid-template-columns:1fr;} }
  .melde{border-radius:12px; padding:15px 17px; font-size:15px; margin:0 0 18px; background:var(--sand-hell); color:var(--tinte-weich);}
  .melde.warn{background:#F6E3DC; color:#7E3A26;}
  .melde.gut{background:#E4EADF; color:#2F4A34;}
  .rechtstext h2{font-size:24px; margin:38px 0 12px;}
  .rechtstext h2:first-child{margin-top:0;}
  .rechtstext p, .rechtstext li{font-size:16px; color:var(--tinte-weich);}
  .rechtstext ul{padding-left:20px;}
`;

// ------------------------------------------------------------------ Über uns

export const ueberUnsPage = seite({
  titel: `Über uns – ${HAUS.name} ${HAUS.stadt}`,
  beschreibung:
    "Victorio, Quereinsteiger vom Bodensee, hat sich mit dem Hand aufs Herz einen Herzenswunsch erfüllt: ein modernes Wirtshaus im Münchner Dreimühlenviertel.",
  aktiv: "/ueber-uns",
  css: gemeinsamesCss,
  inhalt: /* html */ `
${seitenkopf(
  "Über uns",
  "Wirtshaus, neu gedacht",
  "Bei uns trifft traditionelle Wirtshauskultur auf modernes Lebensgefühl – fernab von dunklen, schweren Gaststuben und fleischlastigen Klassikern.",
)}

<section class="luft">
  <div class="wrap">
    <div class="zwei auf">
      <div>
        <p class="eyebrow">Die Geschichte</p>
        <h2>Ein Traum, der jeden Tag weiterwächst</h2>
        <p class="lead" style="margin-top:20px">
          Seit unserer Eröffnung Mitte 2025 im wunderschönen ${HAUS.viertel} ist aus einer Idee ein
          lebendiger Ort des Zusammenkommens geworden.
        </p>
        <p>
          Mein Name ist Victorio. Mit diesem Wirtshaus habe ich mir einen lang gehegten Herzenswunsch
          erfüllt: einen Platz zu schaffen, an dem ehrliche Küche, Gastfreundschaft und Genuss im
          Mittelpunkt stehen. Aufgewachsen bin ich in einem kleinen Dorf am Bodensee – die Liebe zur
          süddeutschen, bayrischen und alpinen Küche kommt von dort.
        </p>
        <p>
          Vorher saß ich im Büro. Heute stehe ich da, wo ich hingehöre. Denn es gibt für mich kein
          schöneres Gefühl, als die Menschen in meinem Umfeld glücklich zu machen.
        </p>
      </div>
      <div>${bogenSzene("szene")}</div>
    </div>
  </div>
</section>

<section class="dunkel luft-klein">
  <div class="wrap schmal">
    <blockquote class="zitat-gross" style="color:var(--sand-hell)">
      „Unser Ziel ist es, eine neue, zeitgemäße Art des Zusammenseins zu schaffen.“
    </blockquote>
  </div>
</section>

<section class="luft">
  <div class="wrap">
    <div class="auf" style="text-align:center; max-width:56ch; margin:0 auto 48px">
      <p class="eyebrow">Wofür wir stehen</p>
      <h2>Herzlichkeit trifft Haltung</h2>
      <p style="color:var(--tinte-weich); margin-top:18px">
        Wir verbinden die Herzlichkeit bayrischer Wirtshaus-Tradition mit modernen Ansprüchen an
        Genuss, Atmosphäre und Nachhaltigkeit.
      </p>
    </div>
    <div class="werte-drei auf">
      <article class="karte">
        ${iconSvg.berg}
        <h3>Wild aus eigener Jagd</h3>
        <p>
          Unser Wild stammt überwiegend aus der eigenen Jagd. Wir wissen, woher es kommt, wie es gelebt hat
          und wie viel davon auf dem Teller landet. Fragt uns – wir erzählen es gern.
        </p>
      </article>
      <article class="karte">
        ${iconSvg.blatt}
        <h3>Vegane Vielfalt</h3>
        <p>
          Kreative, vollwertige vegane Speisen stehen bei uns gleichberechtigt neben allem anderen.
          Kein Ersatzgericht, sondern eine eigene Handschrift.
        </p>
      </article>
      <article class="karte">
        ${iconSvg.herz}
        <h3>Kurze Wege</h3>
        <p>
          Wir arbeiten mit kleinen Betrieben aus der Nachbarschaft: Metzgerei Magnus Bauch,
          Früchte Feldbrach, Fischzucht Aumühle im Isartal. Nachhaltigkeit ist für uns kein Trend,
          sondern eine Haltung.
        </p>
      </article>
    </div>
  </div>
</section>

<section class="luft-klein" style="background:var(--sand-hell)">
  <div class="wrap schmal" style="text-align:center">
    <h2>Kommt vorbei</h2>
    <p class="lead" style="margin:16px auto 30px; max-width:46ch">
      Am schönsten erzählt sich das alles bei einem Teller Kässpätzle und einem Glas Wein.
    </p>
    <a class="btn ton" href="/reservierung">Tisch reservieren</a>
  </div>
</section>`,
});

// -------------------------------------------------------------------- Feiern

const heute = alsDatum(new Date());

export const feiernPage = seite({
  titel: `Feiern – ${HAUS.name} ${HAUS.stadt}`,
  beschreibung:
    "Geburtstag, Hochzeit, Firmen- oder Weihnachtsfeier: Im Hand aufs Herz in München planen wir eure Feier mit individuellem Menü – auch vegetarisch und vegan.",
  aktiv: "/feiern",
  css:
    gemeinsamesCss +
    /* css */ `
    .anlaesse{display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-top:30px;}
    .anlass{
      font-family:var(--sans); font-size:11.5px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
      padding:11px 18px; border-radius:999px; border:1px solid var(--linie); color:var(--tinte-weich); background:var(--papier);
    }
    .anfrage-box{max-width:660px; margin:0 auto;}
  `,
  inhalt: /* html */ `
${seitenkopf(
  "Feiern",
  "Euer Anlass, unser Wirtshaus",
  "Geburtstag, Hochzeit, Firmenfeier, Weihnachtsfeier oder einfach ein schöner Abend mit Freunden – wir geben eurer Feier einen Rahmen.",
)}

<section class="luft">
  <div class="wrap">
    <div class="zwei auf">
      <div>
        <p class="eyebrow">Gemeinsam geplant</p>
        <h2>Gutes Essen, feine Getränke, herzlicher Service</h2>
        <p style="margin-top:20px">
          Unser modernes Wirtshaus bietet den passenden Rahmen für private Feiern in gemütlicher
          Atmosphäre. Um Essen, Getränke und Service kümmern wir uns – ihr kümmert euch um eure Gäste.
        </p>
        <p>
          Wir stellen individuelle Menüs zusammen, natürlich auch mit vegetarischen und veganen
          Optionen. Sagt uns, was ihr euch vorstellt, und wir machen einen Vorschlag.
        </p>
        <div class="anlaesse" style="justify-content:flex-start">
          ${["Geburtstag", "Hochzeit", "Firmenfeier", "Weihnachtsfeier", "Taufe", "Einfach so"]
            .map((a) => `<span class="anlass">${a}</span>`)
            .join("")}
        </div>
      </div>
      <div>${zweigSvg("szene", "var(--tann-hell)")}</div>
    </div>
  </div>
</section>

<section class="luft" style="background:var(--sand-hell)">
  <div class="wrap anfrage-box">
    <div style="text-align:center; margin-bottom:32px">
      <p class="eyebrow">Unverbindlich anfragen</p>
      <h2>Erzählt uns von eurer Feier</h2>
      <p style="color:var(--tinte-weich); margin-top:14px">
        Wir melden uns zeitnah zurück – meist noch am selben oder am nächsten Tag.
      </p>
    </div>

    <div class="karte">
      <div id="anfrageMelde"></div>
      <form id="anfrageForm" novalidate>
        <label class="feld"><span>Name *</span><input name="name" autocomplete="name" required></label>
        <div class="paar">
          <label class="feld"><span>E-Mail *</span><input type="email" name="email" autocomplete="email" required></label>
          <label class="feld"><span>Telefon</span><input type="tel" name="telefon" autocomplete="tel"></label>
        </div>
        <div class="paar">
          <label class="feld">
            <span>Anlass</span>
            <select name="anlass">
              <option value="">Bitte wählen</option>
              <option>Geburtstag</option><option>Hochzeit</option><option>Firmenfeier</option>
              <option>Weihnachtsfeier</option><option>Taufe</option><option>Anderer Anlass</option>
            </select>
          </label>
          <label class="feld"><span>Wunschdatum</span><input type="date" name="datum" min="${heute}"></label>
        </div>
        <label class="feld"><span>Wie viele Gäste?</span><input type="number" name="personen" min="1" max="120" placeholder="z. B. 18"></label>
        <label class="feld">
          <span>Was schwebt euch vor? *</span>
          <textarea name="notiz" required placeholder="Menüwünsche, Ernährungsformen, Uhrzeit, besondere Ideen …"></textarea>
        </label>
        <p style="font-size:13px; color:var(--taupe); margin:0 0 14px">
          Eure Angaben nutzen wir ausschließlich zur Bearbeitung dieser Anfrage (<a href="/datenschutz">Datenschutz</a>).
        </p>
        <button class="btn ton" type="submit" id="anfrageKnopf">Anfrage senden</button>
      </form>
    </div>

    <p style="text-align:center; color:var(--taupe); font-size:15px; margin-top:26px">
      Lieber direkt sprechen? <a href="tel:${HAUS.telefonLink}">${HAUS.telefon}</a> ·
      <a href="mailto:${HAUS.mail}">${HAUS.mail}</a>
    </p>
  </div>
</section>`,
  js: /* js */ `
  const anfrageForm = document.getElementById("anfrageForm");
  const anfrageMelde = document.getElementById("anfrageMelde");
  const anfrageKnopf = document.getElementById("anfrageKnopf");
  anfrageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(anfrageForm);
    const daten = Object.fromEntries(f.entries());
    const zeig = (art, text) => { anfrageMelde.innerHTML = '<p class="melde ' + art + '">' + text + '</p>'; };
    if (!daten.name?.trim() || !daten.email?.trim() || !daten.notiz?.trim()) {
      return zeig("warn", "Bitte Name, E-Mail und eine kurze Beschreibung ausfüllen.");
    }
    anfrageKnopf.disabled = true; anfrageKnopf.textContent = "Wird gesendet …";
    try {
      const r = await fetch("/api/anfragen", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); zeig("warn", d.fehler || "Das hat nicht geklappt."); return; }
      anfrageForm.reset();
      zeig("gut", "Danke! Eure Anfrage ist bei uns angekommen – wir melden uns zeitnah zurück.");
    } catch {
      zeig("warn", "Verbindung fehlgeschlagen. Bitte noch einmal versuchen.");
    } finally {
      anfrageKnopf.disabled = false; anfrageKnopf.textContent = "Anfrage senden";
    }
  });`,
});

// ------------------------------------------------------------------- Kontakt

export const kontaktPage = seite({
  titel: `Kontakt & Anfahrt – ${HAUS.name} ${HAUS.stadt}`,
  beschreibung: `Hand aufs Herz, ${HAUS.strasse}, ${HAUS.plz} ${HAUS.stadt}. Täglich ab 17:00 Uhr, Dienstag Ruhetag. Telefon ${HAUS.telefon}.`,
  aktiv: "/kontakt",
  css:
    gemeinsamesCss +
    /* css */ `
    .kontakt-gitter{display:grid; grid-template-columns:1fr 1fr; gap:clamp(30px,5vw,64px);}
    @media (max-width:800px){ .kontakt-gitter{grid-template-columns:1fr;} }
    .zeiten{list-style:none; margin:0; padding:0;}
    .zeiten li{display:flex; justify-content:space-between; gap:20px; padding:14px 0; border-bottom:1px solid var(--linie); font-size:16px;}
    .zeiten li:last-child{border-bottom:0;}
    .zeiten .ruhe{color:var(--ton);}
    .kontaktzeile{display:flex; gap:14px; padding:16px 0; border-bottom:1px solid var(--linie); font-size:16px;}
    .kontaktzeile b{font-family:var(--sans); font-size:11px; letter-spacing:.15em; text-transform:uppercase; color:var(--taupe); width:100px; flex:none; padding-top:4px;}
    .kontaktzeile a{text-decoration:none;}
  `,
  inhalt: /* html */ `
${seitenkopf(
  "Kontakt",
  "Hier findet ihr uns",
  `Mitten im ${HAUS.viertel} – zwischen Isar und Schlachthofviertel, ein paar Schritte vom Kapuzinerplatz.`,
)}

<section class="luft">
  <div class="wrap">
    <div class="kontakt-gitter auf">
      <div>
        <p class="eyebrow">Adresse & Kontakt</p>
        <p style="font-family:var(--serif); font-size:clamp(26px,3.4vw,34px); line-height:1.25; margin:0 0 24px">
          ${HAUS.strasse}<br>${HAUS.plz} ${HAUS.stadt}
        </p>
        <div class="kontaktzeile"><b>Telefon</b><a href="tel:${HAUS.telefonLink}">${HAUS.telefon}</a></div>
        <div class="kontaktzeile"><b>E-Mail</b><a href="mailto:${HAUS.mail}">${HAUS.mail}</a></div>
        <div class="kontaktzeile"><b>Instagram</b><a href="${HAUS.instagram}" target="_blank" rel="noreferrer noopener">${HAUS.instagramHandle}</a></div>
        <div class="kontaktzeile"><b>Anfahrt</b>
          <span>U3/U6 Poccistraße oder Bus bis Kapuzinerplatz.<br>
          Parken im Viertel ist begrenzt – kommt am besten mit Rad oder Öffis.</span>
        </div>
        <div style="margin-top:28px; display:flex; gap:12px; flex-wrap:wrap">
          <a class="btn ton" href="/reservierung">Tisch reservieren</a>
          <a class="btn linie" href="${HAUS.karteUrl}" target="_blank" rel="noreferrer noopener">Route öffnen</a>
        </div>
      </div>
      <div>
        <p class="eyebrow">Öffnungszeiten</p>
        <div class="karte">
          <ul class="zeiten">
            ${ZEITEN_TEXT.map(
              (z) =>
                `<li><span>${z.tag}</span><span${z.zeit === "Ruhetag" ? ' class="ruhe"' : ""}>${z.zeit}</span></li>`,
            ).join("\n            ")}
          </ul>
          <p style="font-size:14.5px; color:var(--taupe); margin:18px 0 0">
            Küche bis 21:30 Uhr. An Feiertagen können die Zeiten abweichen –
            aktuelle Hinweise findet ihr auf Instagram.
          </p>
        </div>
        <div class="karte" style="margin-top:20px">
          <h3 style="margin-bottom:10px">Größere Runde?</h3>
          <p style="font-size:15.5px; color:var(--tinte-weich); margin:0 0 16px">
            Ab neun Personen planen wir gemeinsam – mit eigenem Menü und in Ruhe abgestimmt.
          </p>
          <a class="btn linie klein" href="/feiern">Zur Feiern-Anfrage</a>
        </div>
      </div>
    </div>
  </div>
</section>`,
});

// --------------------------------------------------------- Impressum & Datenschutz

export const impressumPage = seite({
  titel: `Impressum – ${HAUS.name}`,
  beschreibung: "Impressum und Anbieterkennzeichnung des Restaurants Hand aufs Herz in München.",
  css: gemeinsamesCss,
  inhalt: /* html */ `
${seitenkopf("Rechtliches", "Impressum", "Angaben gemäß § 5 DDG.")}
<section class="luft">
  <div class="wrap schmal rechtstext">
    <h2>Anbieter</h2>
    <p>
      ${HAUS.firma}<br>${HAUS.strasse}<br>${HAUS.plz} ${HAUS.stadt}
    </p>
    <h2>Vertreten durch</h2>
    <p>${HAUS.vertreter}</p>
    <h2>Kontakt</h2>
    <p>
      Telefon: <a href="tel:${HAUS.telefonLink}">${HAUS.telefon}</a><br>
      E-Mail: <a href="mailto:${HAUS.mail}">${HAUS.mail}</a>
    </p>
    <h2>Registereintrag</h2>
    <p>${HAUS.register}</p>
    <h2>Umsatzsteuer-ID</h2>
    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${HAUS.ustId}</p>
    <h2>Streitschlichtung</h2>
    <p>
      Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:
      <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer noopener">ec.europa.eu/consumers/odr</a>.
      Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer
      Verbraucherschlichtungsstelle teilzunehmen.
    </p>
  </div>
</section>`,
});

export const datenschutzPage = seite({
  titel: `Datenschutz – ${HAUS.name}`,
  beschreibung: "Informationen zur Verarbeitung personenbezogener Daten bei Reservierungen und Anfragen.",
  css: gemeinsamesCss,
  inhalt: /* html */ `
${seitenkopf("Rechtliches", "Datenschutz", "Was wir speichern, wozu – und wie lange.")}
<section class="luft">
  <div class="wrap schmal rechtstext">
    <h2>Verantwortlich</h2>
    <p>${HAUS.firma}, ${HAUS.strasse}, ${HAUS.plz} ${HAUS.stadt}, <a href="mailto:${HAUS.mail}">${HAUS.mail}</a></p>

    <h2>Reservierungen</h2>
    <p>
      Für eine Tischreservierung verarbeiten wir Name, E-Mail-Adresse, Telefonnummer, Datum, Uhrzeit,
      Personenzahl sowie eure freiwilligen Angaben zu Anlass und Wünschen. Rechtsgrundlage ist
      Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher Maßnahmen). Ohne diese Angaben können
      wir den Tisch nicht zuverlässig freihalten.
    </p>

    <h2>Anfragen für Feiern</h2>
    <p>
      Bei einer Feier-Anfrage verarbeiten wir eure Kontaktdaten und die Angaben zur geplanten
      Veranstaltung, um euch ein Angebot machen zu können (Art. 6 Abs. 1 lit. b DSGVO).
    </p>

    <h2>Speicherdauer</h2>
    <p>
      Reservierungs- und Anfragedaten löschen wir, sobald sie für die Abwicklung nicht mehr
      erforderlich sind, spätestens nach zwölf Monaten – soweit keine gesetzlichen
      Aufbewahrungspflichten entgegenstehen.
    </p>

    <h2>Hosting und Server-Logs</h2>
    <p>
      Beim Aufruf dieser Seite fallen technisch notwendige Verbindungsdaten an. Die Website nutzt
      Schriftarten von Google Fonts; dabei wird eine Verbindung zu Servern von Google aufgebaut und
      eure IP-Adresse übertragen. Cookies zu Analyse- oder Marketingzwecken setzen wir nicht ein.
    </p>

    <h2>Eure Rechte</h2>
    <ul>
      <li>Auskunft über die zu eurer Person gespeicherten Daten (Art. 15 DSGVO)</li>
      <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
      <li>Löschung (Art. 17 DSGVO) und Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
      <li>Datenübertragbarkeit (Art. 20 DSGVO) und Widerspruch (Art. 21 DSGVO)</li>
      <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
    </ul>
    <p>Eine Reservierung könnt ihr jederzeit selbst über euren Buchungscode absagen.</p>

    <h2>Hinweis</h2>
    <p>
      Dieser Text ist eine Arbeitsfassung für den internen Gebrauch und ersetzt keine
      Rechtsberatung. Bitte vor dem Livegang juristisch prüfen lassen.
    </p>
  </div>
</section>`,
});
