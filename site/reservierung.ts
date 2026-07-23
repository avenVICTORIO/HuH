import { seite } from "./layout";
import { huegelSvg } from "./art";
import { HAUS } from "./info";
import { HORIZONT_TAGE, MAX_PERSONEN_ONLINE, alsDatum } from "../reservierungen";

const css = /* css */ `
  .res-kopf{background:var(--tann); color:var(--sand-hell); padding:clamp(52px,7vw,88px) 0 0; text-align:center;}
  .res-kopf h1{color:var(--sand-hell); margin-bottom:16px;}
  .res-kopf .lead{color:rgba(234,220,198,.88);}
  .res-kopf .lead{max-width:50ch; margin:0 auto;}

  .buehne{max-width:820px; margin:0 auto; padding:0 24px clamp(60px,8vw,110px);}
  .bogen{background:var(--papier); border:1px solid var(--linie); border-radius:24px; box-shadow:var(--schatten); margin-top:-60px; position:relative; z-index:5; overflow:hidden;}

  /* ---------------- Schrittanzeige ---------------- */
  .schritte{display:flex; border-bottom:1px solid var(--linie); background:var(--creme);}
  .schritt{
    flex:1; display:flex; align-items:center; justify-content:center; gap:9px; padding:16px 10px;
    font-family:var(--sans); font-size:11px; font-weight:600; letter-spacing:.13em; text-transform:uppercase;
    color:var(--taupe); border-right:1px solid var(--linie); transition:color .2s, background .2s;
  }
  .schritt:last-child{border-right:0;}
  .schritt .nr{
    width:22px; height:22px; border-radius:50%; border:1.5px solid currentColor;
    display:grid; place-items:center; font-size:10.5px; flex:none;
  }
  .schritt.jetzt{color:var(--tann); background:var(--papier);}
  .schritt.jetzt .nr{background:var(--tann); color:var(--papier); border-color:var(--tann);}
  .schritt.fertig{color:var(--ton);}
  .schritt.fertig .nr{background:var(--ton); border-color:var(--ton); color:#fff;}
  @media (max-width:620px){ .schritt span:not(.nr){display:none;} .schritt{padding:14px 6px;} }

  .buehne-inhalt{padding:clamp(26px,4vw,42px);}
  .tafel{display:none;} .tafel.aktiv{display:block;}
  .tafel h2{font-size:clamp(24px,3.4vw,32px); margin-bottom:8px;}
  .tafel > p.hint{color:var(--taupe); font-size:15px; margin-bottom:26px;}

  /* ---------------- Personenwahl ---------------- */
  .personen{display:flex; flex-wrap:wrap; gap:9px; margin-bottom:8px;}
  .pers{
    width:52px; height:52px; border-radius:14px; border:1px solid var(--linie); background:var(--creme);
    font-family:var(--serif); font-size:20px; color:var(--tinte); cursor:pointer; transition:all .16s;
  }
  .pers:hover{border-color:var(--tann-hell);}
  .pers[aria-pressed="true"]{background:var(--tann); color:var(--sand-hell); border-color:var(--tann);}
  .bereich-wahl{width:auto; padding:0 22px; font-family:var(--sans); font-size:14px; font-weight:600; letter-spacing:.04em;}
  .gross-hinweis{
    display:none; background:var(--sand-hell); border-radius:12px; padding:16px 18px;
    font-size:15px; margin:16px 0 0;
  }
  .gross-hinweis.zeig{display:block;}

  /* ---------------- Zeitfenster ---------------- */
  .slots{display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:10px;}
  .slot{
    padding:15px 8px; border-radius:14px; border:1px solid var(--linie); background:var(--creme);
    font-family:var(--sans); font-size:15px; font-weight:600; color:var(--tinte); cursor:pointer;
    text-align:center; transition:all .16s; line-height:1.25;
  }
  .slot small{display:block; font-size:10px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--taupe); margin-top:4px;}
  .slot:hover:not([disabled]){border-color:var(--tann-hell); transform:translateY(-1px);}
  .slot[aria-pressed="true"]{background:var(--tann); color:var(--sand-hell); border-color:var(--tann);}
  .slot[aria-pressed="true"] small{color:rgba(234,220,198,.7);}
  .slot[disabled]{opacity:.36; cursor:not-allowed;}
  .slot.knapp small{color:var(--ton);}

  .melde{
    border-radius:12px; padding:15px 17px; font-size:15px; margin:0 0 20px;
    background:var(--sand-hell); color:var(--tinte-weich);
  }
  .melde.warn{background:#F6E3DC; color:#7E3A26;}
  .lade{color:var(--taupe); font-size:15px; padding:22px 0;}

  .zusammenfassung{
    display:flex; flex-wrap:wrap; gap:8px 26px; align-items:center;
    background:var(--sand-hell); border-radius:12px; padding:14px 18px; margin-bottom:24px; font-size:15px;
  }
  .zusammenfassung b{font-family:var(--sans); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--taupe); display:block; font-weight:600;}
  .zusammenfassung .aendern{margin-left:auto; background:none; border:0; color:var(--ton); font-family:var(--sans); font-size:12px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; cursor:pointer;}

  .aktionen{display:flex; gap:12px; align-items:center; margin-top:28px; flex-wrap:wrap;}
  .zurueck{background:none; border:0; color:var(--taupe); font-family:var(--sans); font-size:12px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; cursor:pointer; padding:10px 4px;}
  .zurueck:hover{color:var(--tann);}

  /* ---------------- Bestätigung ---------------- */
  .fertig{text-align:center; padding:16px 0 6px;}
  .fertig .haken{width:74px; height:74px; margin:0 auto 22px;}
  .code{
    font-family:var(--sans); font-size:30px; font-weight:600; letter-spacing:.26em;
    color:var(--tann); background:var(--sand-hell); border-radius:14px; padding:18px 22px 18px 30px;
    display:inline-block; margin:8px 0 6px;
  }
  .fertig-liste{list-style:none; margin:26px auto 0; padding:0; max-width:400px; text-align:left;}
  .fertig-liste li{display:flex; justify-content:space-between; gap:20px; padding:13px 0; border-bottom:1px solid var(--linie); font-size:16px;}
  .fertig-liste li span:first-child{font-family:var(--sans); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--taupe); align-self:center;}

  /* ---------------- Verwalten ---------------- */
  .verwalten{background:var(--sand-hell);}
  .verwalten-box{max-width:600px; margin:0 auto;}
  .code-form{display:flex; gap:10px; flex-wrap:wrap;}
  .code-form input{
    flex:1; min-width:180px; text-transform:uppercase; letter-spacing:.22em; font-family:var(--sans);
    font-weight:600; font-size:17px; text-align:center; background:var(--papier);
    border:1px solid var(--linie); border-radius:12px; padding:14px 16px; color:var(--tann);
  }
  .code-form input:focus{outline:none; border-color:var(--tann-hell); box-shadow:0 0 0 3px rgba(108,127,104,.16);}
  #verwaltenErgebnis{margin-top:22px;}
  .status-pille{
    display:inline-block; font-family:var(--sans); font-size:10.5px; font-weight:600; letter-spacing:.14em;
    text-transform:uppercase; padding:5px 11px; border-radius:999px; background:var(--tann-hell); color:#fff;
  }
  .status-pille.abgesagt{background:var(--ton);}

  .info-spalten{display:grid; grid-template-columns:repeat(3,1fr); gap:26px; margin-top:clamp(48px,7vw,80px);}
  .info-spalten h3{font-size:19px; margin-bottom:10px;}
  .info-spalten p{font-size:15px; color:var(--tinte-weich); margin:0;}
  @media (max-width:760px){ .info-spalten{grid-template-columns:1fr; gap:22px;} }
`;

const heute = alsDatum(new Date());
const spaetester = (() => {
  const d = new Date();
  d.setDate(d.getDate() + HORIZONT_TAGE);
  return alsDatum(d);
})();

const inhalt = /* html */ `
<section class="res-kopf">
  <div class="wrap schmal">
    <p class="eyebrow" style="color:var(--sand)">Tisch reservieren</p>
    <h1>Ein Platz für euch</h1>
    <p class="lead">
      Wählt Datum, Uhrzeit und Runde – die Bestätigung kommt sofort.
      Ab ${MAX_PERSONEN_ONLINE + 1} Personen planen wir gemeinsam über die Feiern-Anfrage.
    </p>
  </div>
  ${huegelSvg(["var(--tann-hell)", "var(--sand)", "var(--creme)"], { hoehe: 120 })}
</section>

<div class="buehne">
  <div class="bogen">
    <div class="schritte" id="schritte">
      <div class="schritt jetzt" data-nr="1"><span class="nr">1</span><span>Datum & Runde</span></div>
      <div class="schritt" data-nr="2"><span class="nr">2</span><span>Uhrzeit</span></div>
      <div class="schritt" data-nr="3"><span class="nr">3</span><span>Kontakt</span></div>
      <div class="schritt" data-nr="4"><span class="nr">4</span><span>Fertig</span></div>
    </div>

    <div class="buehne-inhalt">
      <!-- ---------- Schritt 1 ---------- -->
      <section class="tafel aktiv" data-tafel="1">
        <h2>Wann dürfen wir euch erwarten?</h2>
        <p class="hint">Dienstag ist unser Ruhetag – an allen anderen Tagen sind wir ab 17:00 Uhr für euch da.</p>

        <label class="feld" for="datum">
          <span>Datum</span>
          <input type="date" id="datum" min="${heute}" max="${spaetester}" value="${heute}">
        </label>

        <div class="feld">
          <span>Wie viele seid ihr?</span>
          <div class="personen" id="personen">
            ${Array.from({ length: MAX_PERSONEN_ONLINE }, (_, i) => i + 1)
              .map(
                (n) =>
                  `<button type="button" class="pers" data-n="${n}" aria-pressed="${n === 2}">${n}</button>`,
              )
              .join("")}
            <button type="button" class="pers" data-n="9" aria-pressed="false" style="width:auto; padding:0 16px; font-family:var(--sans); font-size:13px;">9+</button>
          </div>
          <div class="gross-hinweis" id="grossHinweis">
            Für Runden ab ${MAX_PERSONEN_ONLINE + 1} Personen stellen wir gerne ein eigenes Menü zusammen.
            <a href="/feiern" style="font-weight:600">Schreibt uns über die Feiern-Anfrage →</a>
          </div>
        </div>

        <div class="feld">
          <span>Wo sitzt ihr am liebsten?</span>
          <div class="personen" id="bereiche">
            <button type="button" class="pers bereich-wahl" data-bereich="drinnen" aria-pressed="true">Drinnen</button>
            <button type="button" class="pers bereich-wahl" data-bereich="draussen" aria-pressed="false">Draußen</button>
          </div>
          <p style="font-size:13.5px; color:var(--taupe); margin:8px 0 0" id="bereichHinweis">
            Draußen sitzt ihr auf unserer Terrasse – bei Regenwetter finden wir gemeinsam eine Lösung drinnen.
          </p>
        </div>

        <div class="aktionen">
          <button class="btn" id="zuZeiten">Freie Zeiten anzeigen</button>
        </div>
      </section>

      <!-- ---------- Schritt 2 ---------- -->
      <section class="tafel" data-tafel="2">
        <h2>Wann passt es euch?</h2>
        <p class="hint">Der Tisch gehört euch für rund zwei Stunden. Küchenschluss ist um 21:30 Uhr.</p>
        <div class="zusammenfassung" id="fassung2"></div>
        <div id="slotBereich"><p class="lade">Zeiten werden geladen …</p></div>
        <div class="aktionen">
          <button class="zurueck" data-zurueck="1">← Datum ändern</button>
        </div>
      </section>

      <!-- ---------- Schritt 3 ---------- -->
      <section class="tafel" data-tafel="3">
        <h2>Auf welchen Namen?</h2>
        <p class="hint">Wir melden uns nur, wenn etwas dazwischenkommt.</p>
        <div class="zusammenfassung" id="fassung3"></div>
        <div id="formFehler"></div>
        <form id="resForm" novalidate>
          <label class="feld"><span>Name *</span><input name="name" autocomplete="name" required></label>
          <div class="paar">
            <label class="feld"><span>E-Mail *</span><input type="email" name="email" autocomplete="email" required></label>
            <label class="feld"><span>Telefon *</span><input type="tel" name="telefon" autocomplete="tel" required></label>
          </div>
          <label class="feld">
            <span>Anlass (optional)</span>
            <select name="anlass">
              <option value="">Kein besonderer Anlass</option>
              <option>Geburtstag</option>
              <option>Jahrestag</option>
              <option>Geschäftsessen</option>
              <option>Familienessen</option>
              <option>Erster Besuch bei euch</option>
            </select>
          </label>
          <label class="feld">
            <span>Wünsche (optional)</span>
            <textarea name="notiz" placeholder="Allergien, Kinderstuhl, lieber ruhiger sitzen …"></textarea>
          </label>
          <p style="font-size:13px; color:var(--taupe); margin:0 0 4px">
            Mit dem Absenden stimmt ihr der Verarbeitung eurer Daten zur Bearbeitung der Reservierung zu
            (<a href="/datenschutz">Datenschutz</a>).
          </p>
          <div class="aktionen">
            <button class="btn ton" type="submit" id="absenden">Verbindlich reservieren</button>
            <button class="zurueck" type="button" data-zurueck="2">← Uhrzeit ändern</button>
          </div>
        </form>
      </section>

      <!-- ---------- Schritt 4 ---------- -->
      <section class="tafel" data-tafel="4">
        <div class="fertig" id="fertigBereich"></div>
      </section>
    </div>
  </div>

  <div class="info-spalten">
    <div>
      <h3>Zwei Stunden Zeit</h3>
      <p>Wir planen pro Tisch rund zwei Stunden. Wenn ihr länger bleiben möchtet – sagt einfach Bescheid, wir finden eine Lösung.</p>
    </div>
    <div>
      <h3>Spontan da?</h3>
      <p>Kurzfristig geht auch. Ruft uns unter <a href="tel:${HAUS.telefonLink}">${HAUS.telefon}</a> an, wir schauen, was frei ist.</p>
    </div>
    <div>
      <h3>Große Runde?</h3>
      <p>Ab ${MAX_PERSONEN_ONLINE + 1} Personen stellen wir ein eigenes Menü zusammen. <a href="/feiern">Zur Feiern-Anfrage →</a></p>
    </div>
  </div>
</div>

<section class="verwalten luft-klein" id="verwalten">
  <div class="wrap verwalten-box">
    <p class="eyebrow" style="text-align:center">Schon reserviert?</p>
    <h2 style="text-align:center; margin-bottom:10px">Reservierung ansehen oder absagen</h2>
    <p style="text-align:center; color:var(--taupe); font-size:15px; margin-bottom:24px">
      Gebt euren Buchungscode ein – ihr findet ihn in der Bestätigung.
    </p>
    <form class="code-form" id="codeForm">
      <input id="codeEingabe" placeholder="Z. B. K7QM2D" maxlength="6" autocomplete="off" aria-label="Buchungscode">
      <button class="btn" type="submit">Suchen</button>
    </form>
    <div id="verwaltenErgebnis"></div>
  </div>
</section>
`;

const js = /* js */ `
  const $ = (s) => document.querySelector(s);
  const zustand = { datum: "${heute}", personen: 2, bereich: "drinnen", zeit: null, res: null };
  const BEREICH_TEXT = { drinnen: "Drinnen", draussen: "Draußen (Terrasse)" };

  const monate = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const tage = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
  const langesDatum = (d) => {
    const [y,m,t] = d.split("-").map(Number);
    return tage[new Date(y, m-1, t).getDay()] + ", " + t + ". " + monate[m-1] + " " + y;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  // ---------- Schrittsteuerung ----------
  function zeige(nr) {
    document.querySelectorAll(".tafel").forEach((t) => t.classList.toggle("aktiv", +t.dataset.tafel === nr));
    document.querySelectorAll(".schritt").forEach((s) => {
      const n = +s.dataset.nr;
      s.classList.toggle("jetzt", n === nr);
      s.classList.toggle("fertig", n < nr);
    });
    const box = $(".bogen").getBoundingClientRect();
    if (box.top < 0) $(".bogen").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll("[data-zurueck]").forEach((b) =>
    b.addEventListener("click", () => zeige(+b.dataset.zurueck)));

  // ---------- Schritt 1: Datum & Personen ----------
  const grossHinweis = $("#grossHinweis");
  $("#personen").addEventListener("click", (e) => {
    const b = e.target.closest(".pers"); if (!b) return;
    document.querySelectorAll(".pers").forEach((p) => p.setAttribute("aria-pressed", String(p === b)));
    zustand.personen = +b.dataset.n;
    grossHinweis.classList.toggle("zeig", zustand.personen > ${MAX_PERSONEN_ONLINE});
  });
  $("#datum").addEventListener("change", (e) => { zustand.datum = e.target.value; });
  $("#bereiche").addEventListener("click", (e) => {
    const b = e.target.closest(".bereich-wahl"); if (!b) return;
    document.querySelectorAll(".bereich-wahl").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    zustand.bereich = b.dataset.bereich;
  });

  $("#zuZeiten").addEventListener("click", () => {
    if (zustand.personen > ${MAX_PERSONEN_ONLINE}) { location.href = "/feiern"; return; }
    if (!zustand.datum) return;
    zeige(2); ladeSlots();
  });

  // ---------- Schritt 2: Zeiten ----------
  const fassung = (ziel, mitZeit) => {
    $(ziel).innerHTML =
      '<div><b>Datum</b>' + langesDatum(zustand.datum) + '</div>' +
      '<div><b>Runde</b>' + zustand.personen + (zustand.personen === 1 ? " Person" : " Personen") + '</div>' +
      '<div><b>Bereich</b>' + BEREICH_TEXT[zustand.bereich] + '</div>' +
      (mitZeit && zustand.zeit ? '<div><b>Uhrzeit</b>' + zustand.zeit + ' Uhr</div>' : '') +
      '<button type="button" class="aendern" data-zurueck="' + (mitZeit ? 2 : 1) + '">Ändern</button>';
    $(ziel).querySelector(".aendern").addEventListener("click", (e) => zeige(+e.target.dataset.zurueck));
  };

  async function ladeSlots() {
    fassung("#fassung2", false);
    const bereich = $("#slotBereich");
    bereich.innerHTML = '<p class="lade">Zeiten werden geladen …</p>';
    try {
      const r = await fetch("/api/verfuegbarkeit?datum=" + zustand.datum + "&personen=" + zustand.personen + "&bereich=" + zustand.bereich);
      const d = await r.json();
      if (d.ruhetag) {
        bereich.innerHTML = '<p class="melde warn">' + esc(d.hinweis) + '</p>';
        return;
      }
      const frei = d.slots.filter((s) => s.buchbar);
      if (!frei.length) {
        bereich.innerHTML = '<p class="melde warn">An diesem Tag ist für ' + zustand.personen +
          ' Personen leider nichts mehr frei. Probiert einen anderen Tag – oder ruft uns an: ' +
          '<a href="tel:${HAUS.telefonLink}">${HAUS.telefon}</a>.</p>';
        return;
      }
      bereich.innerHTML = '<div class="slots">' + d.slots.map((s) => {
        const knapp = s.buchbar && s.frei <= 8;
        return '<button type="button" class="slot' + (knapp ? " knapp" : "") + '" data-zeit="' + s.zeit + '"' +
          (s.buchbar ? "" : " disabled") + ' aria-pressed="false">' + s.zeit +
          '<small>' + (s.buchbar ? (knapp ? "nur noch wenige" : "frei") : "belegt") + '</small></button>';
      }).join("") + '</div>';
      bereich.querySelectorAll(".slot").forEach((b) => b.addEventListener("click", () => {
        zustand.zeit = b.dataset.zeit;
        bereich.querySelectorAll(".slot").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        fassung("#fassung3", true);
        setTimeout(() => zeige(3), 160);
      }));
    } catch {
      bereich.innerHTML = '<p class="melde warn">Die Zeiten konnten nicht geladen werden. Bitte kurz neu laden.</p>';
    }
  }

  // ---------- Schritt 3: Absenden ----------
  $("#resForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const knopf = $("#absenden");
    const f = new FormData(e.target);
    const daten = {
      datum: zustand.datum, zeit: zustand.zeit, personen: zustand.personen, bereich: zustand.bereich,
      name: (f.get("name") || "").trim(), email: (f.get("email") || "").trim(),
      telefon: (f.get("telefon") || "").trim(), anlass: f.get("anlass"), notiz: f.get("notiz"),
    };
    const meldung = (text) => { $("#formFehler").innerHTML = '<p class="melde warn">' + esc(text) + '</p>'; };
    if (!daten.name || !daten.email || !daten.telefon) return meldung("Bitte Name, E-Mail und Telefon ausfüllen.");
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(daten.email)) return meldung("Bitte eine gültige E-Mail-Adresse angeben.");

    knopf.disabled = true; knopf.textContent = "Wird reserviert …";
    try {
      const r = await fetch("/api/reservierungen", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten),
      });
      const d = await r.json();
      if (!r.ok) { meldung(d.fehler || "Das hat leider nicht geklappt."); return; }
      $("#formFehler").innerHTML = "";
      zustand.res = d;
      $("#fertigBereich").innerHTML =
        '<svg class="haken" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="var(--tann-hell)" stroke-width="1.5"/>' +
        '<path d="M25 41l11 11 20-23" stroke="var(--ton)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<h2>Wir freuen uns auf euch!</h2>' +
        '<p style="color:var(--tinte-weich); max-width:44ch; margin:10px auto 0">Eure Reservierung ist notiert. Notiert euch den Code – damit könnt ihr sie jederzeit ansehen oder absagen.</p>' +
        '<div class="code">' + esc(d.code) + '</div>' +
        '<ul class="fertig-liste">' +
          '<li><span>Datum</span><span>' + langesDatum(d.datum) + '</span></li>' +
          '<li><span>Uhrzeit</span><span>' + esc(d.zeit) + ' Uhr</span></li>' +
          '<li><span>Personen</span><span>' + d.personen + '</span></li>' +
          '<li><span>Bereich</span><span>' + (BEREICH_TEXT[d.bereich] || esc(d.bereich)) + '</span></li>' +
          '<li><span>Name</span><span>' + esc(d.name) + '</span></li>' +
        '</ul>' +
        '<div class="aktionen" style="justify-content:center">' +
          '<a class="btn linie" href="/speisekarte">Schon mal die Karte ansehen</a>' +
        '</div>';
      zeige(4);
    } catch {
      meldung("Verbindung fehlgeschlagen. Bitte noch einmal versuchen.");
    } finally {
      knopf.disabled = false; knopf.textContent = "Verbindlich reservieren";
    }
  });

  // ---------- Reservierung verwalten ----------
  const ergebnis = $("#verwaltenErgebnis");
  const zeigeRes = (d) => {
    const abgesagt = d.status === "abgesagt";
    ergebnis.innerHTML =
      '<div class="karte">' +
        '<span class="status-pille' + (abgesagt ? " abgesagt" : "") + '">' +
          (abgesagt ? "Abgesagt" : d.status === "bestaetigt" ? "Bestätigt" : "Notiert") + '</span>' +
        '<h3 style="margin:14px 0 4px">' + esc(d.name) + '</h3>' +
        '<p style="color:var(--tinte-weich); margin:0">' + langesDatum(d.datum) + ' · ' + esc(d.zeit) +
          ' Uhr · ' + d.personen + (d.personen === 1 ? " Person" : " Personen") +
          ' · ' + (BEREICH_TEXT[d.bereich] || "") + '</p>' +
        (abgesagt ? '' :
          '<div class="aktionen"><button class="btn linie klein" id="stornieren">Reservierung absagen</button></div>') +
      '</div>';
    const s = document.getElementById("stornieren");
    if (s) s.addEventListener("click", async () => {
      if (!confirm("Reservierung wirklich absagen?")) return;
      s.disabled = true;
      const r = await fetch("/api/reservierungen/" + encodeURIComponent(d.code) + "/storno", { method: "POST" });
      if (r.ok) zeigeRes(await r.json());
      else { s.disabled = false; ergebnis.insertAdjacentHTML("beforeend", '<p class="melde warn">Absage fehlgeschlagen.</p>'); }
    });
  };

  $("#codeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("#codeEingabe").value.trim().toUpperCase();
    if (!code) return;
    ergebnis.innerHTML = '<p class="lade">Wird gesucht …</p>';
    const r = await fetch("/api/reservierungen/" + encodeURIComponent(code));
    if (!r.ok) { ergebnis.innerHTML = '<p class="melde warn">Zu diesem Code finden wir nichts. Bitte prüft die Schreibweise.</p>'; return; }
    zeigeRes(await r.json());
  });

  // Direktlink mit ?code=XYZ öffnet die Verwaltung.
  const vorgabe = new URLSearchParams(location.search).get("code");
  if (vorgabe) { $("#codeEingabe").value = vorgabe.toUpperCase(); $("#codeForm").requestSubmit();
    document.getElementById("verwalten").scrollIntoView({ behavior: "smooth" }); }
`;

export const reservierungPage = seite({
  titel: `Tisch reservieren – ${HAUS.name} ${HAUS.stadt}`,
  beschreibung:
    "Reserviert online euren Tisch im Hand aufs Herz in München. Freie Zeiten in Echtzeit, sofortige Bestätigung, jederzeit stornierbar.",
  aktiv: "/reservierung",
  css,
  js,
  inhalt,
});
