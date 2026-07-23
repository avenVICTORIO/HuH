import { seite } from "./layout";
import { huegelSvg, iconSvg, sozialSvg } from "./art";
import { HAUS, ZEITEN_TEXT } from "./info";
import { SONNTAG } from "./karte-daten";

const WERTE = [
  { icon: "blatt", titel: "Saisonal", text: "Kurze Wege, kleine Betriebe, das was der Monat hergibt." },
  { icon: "herz", titel: "Mit Herz", text: "Jedes Gericht entsteht von Hand – ohne Abkürzungen." },
  { icon: "berg", titel: "Wild & Vegan", text: "Aus eigener Jagd und aus dem Garten. Beides mit Sorgfalt." },
  { icon: "sonne", titel: "Genuss erleben", text: "Ein Ort zum Ankommen, Bleiben und Wiederkommen." },
];

const HIGHLIGHTS = [
  {
    tag: "Aus eigener Jagd",
    titel: "Wild, das eine Herkunft hat",
    text: "Hirschragout, Wildfleischpflanzerl, Wild-Bolognese. Unser Wild kommt überwiegend aus der eigenen Jagd – wir wissen, wo es herkommt, und erzählen es euch gern.",
  },
  {
    tag: "Vollwertig vegan",
    titel: "Grün, ohne Ersatzgedanken",
    text: "Der „Kein-Schweinsbraten“ aus gebackenem Knollensellerie, gerösteter Spitzkohl, hausgemachte Aufstriche. Kein Beiwerk, sondern eigene Hauptrollen.",
  },
  {
    tag: "Nachbarschaft",
    titel: "Freunde, die liefern",
    text: "Metzgerei Magnus Bauch, Früchte Feldbrach, Fischzucht Aumühle im Isartal, Weine von F.X. Muschelkalk aus derselben Straße.",
  },
];

const KOSTPROBEN = [
  { name: "Hirschragout", preis: "29,0", text: "Ragout von der Hirschkalbskeule | Breznknödel | Rotkohlsalat" },
  { name: "„Kein-Schweinsbraten“", preis: "18,5", text: "gebackener Knollensellerie | Kartoffel-Pastinaken-Stampf | vegane Bratensoße" },
  { name: "Kässpätzle", preis: "16,5", text: "Hausgemachte Kässpätzle | Bergkäsemischung | Schmelzzwiebeln" },
  { name: "Bienenstich-Tiramisu", preis: "8,5", text: "Rumgetränkter Löffelbiskuit | Vanille-Tonkasahne | Mandelkrokant" },
];

const css = /* css */ `
  /* ---------------- Hero: dunkle Bühne, große Typo, Sonne hinter Hügeln ---------------- */
  .hero{
    position:relative; overflow:hidden; text-align:center;
    background:radial-gradient(120% 90% at 50% 100%, rgba(108,127,104,.35) 0%, rgba(108,127,104,0) 55%), linear-gradient(178deg, var(--tann-tief) 0%, var(--tann) 78%);
    color:var(--sand-hell);
    display:flex; flex-direction:column; justify-content:center;
    min-height:min(88vh, 860px); padding:clamp(56px,9vh,110px) 0 0;
  }
  .hero-inhalt{position:relative; z-index:4; max-width:880px; margin:0 auto; padding:0 24px;}
  .hero .eyebrow{color:var(--sand); margin-bottom:1.6rem;}
  .hero h1{
    font-size:clamp(48px,9vw,108px); color:var(--papier);
    margin:0 0 10px; letter-spacing:.005em;
  }
  .hero h1 .zeile2{display:block; font-style:italic; font-weight:400; color:var(--ton-hell);}
  .hero .zier{display:flex; align-items:center; justify-content:center; gap:16px; margin:26px 0 24px;}
  .hero .zier::before, .hero .zier::after{content:""; width:56px; height:1px; background:rgba(234,220,198,.4);}
  .hero .zier span{width:6px; height:6px; border-radius:50%; background:var(--ton-hell);}
  .hero .lead{max-width:52ch; margin:0 auto; color:rgba(234,220,198,.86);}
  .hero-aktionen{display:flex; flex-wrap:wrap; gap:14px; justify-content:center; margin-top:38px;}
  .hero .btn.ton{background:var(--sand-hell); border-color:var(--sand-hell); color:var(--tann);}
  .hero .btn.ton:hover{background:var(--papier); border-color:var(--papier); color:var(--tann-tief);}
  .hero .btn.linie{border-color:rgba(234,220,198,.55); color:var(--sand-hell); background:rgba(44,56,44,.35); backdrop-filter:blur(2px);}
  .hero .btn.linie:hover{background:var(--sand-hell); color:var(--tann); border-color:var(--sand-hell);}

  /* Landschaft am unteren Rand: Sonne geht hinter den Hügeln auf */
  .hero-landschaft{position:relative; z-index:1; margin-top:clamp(40px,7vh,80px); pointer-events:none;}
  .hero-sonne{
    position:absolute; left:50%; bottom:0; transform:translate(-50%, 38%);
    width:clamp(200px,26vw,320px); height:clamp(200px,26vw,320px); border-radius:50%;
    background:var(--ton); opacity:.95; z-index:0;
  }
  .hero-sonne::after{
    content:""; position:absolute; inset:-34px; border-radius:50%;
    border:1px solid rgba(201,122,94,.4);
  }
  .hero-landschaft .huegel{position:relative; z-index:2;}

  /* sanfter Einstieg beim Laden */
  @keyframes hero-auf{from{opacity:0; transform:translateY(26px);} to{opacity:1; transform:none;}}
  .hero-inhalt > *{animation:hero-auf .9s cubic-bezier(.22,1,.36,1) both;}
  .hero-inhalt > *:nth-child(2){animation-delay:.08s;}
  .hero-inhalt > *:nth-child(3){animation-delay:.16s;}
  .hero-inhalt > *:nth-child(4){animation-delay:.22s;}
  .hero-inhalt > *:nth-child(5){animation-delay:.3s;}
  @media (prefers-reduced-motion:reduce){ .hero-inhalt > *{animation:none;} }

  /* ---------------- Werteband (hell, unter dem dunklen Hero) ---------------- */
  .werte{display:grid; grid-template-columns:repeat(4,1fr); gap:36px;}
  .wert{text-align:center;}
  .wert svg{width:38px; height:38px; margin:0 auto 14px; color:var(--ton);}
  .wert h3{font-size:15px; letter-spacing:.16em; text-transform:uppercase; font-family:var(--sans); font-weight:600; margin-bottom:8px; color:var(--tann);}
  .wert p{font-size:15px; margin:0; color:var(--tinte-weich); line-height:1.6;}
  @media (max-width:800px){ .werte{grid-template-columns:1fr 1fr; gap:30px 22px;} }

  /* ---------------- Geschichte ---------------- */
  .story{display:grid; grid-template-columns:1fr 1fr; gap:clamp(32px,6vw,84px); align-items:center;}
  .zitat{
    font-family:var(--serif); font-size:clamp(23px,3vw,32px); line-height:1.35; color:var(--tann);
    border-left:2px solid var(--ton); padding-left:26px; margin:0 0 22px;
  }
  .signatur{font-family:var(--sans); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--taupe);}
  @media (max-width:860px){ .story{grid-template-columns:1fr;} }

  /* ---------------- Highlights ---------------- */
  .drei{display:grid; grid-template-columns:repeat(3,1fr); gap:26px;}
  .drei .karte{display:flex; flex-direction:column;}
  .drei h3{margin:10px 0 12px;}
  .drei p{font-size:16px; color:var(--tinte-weich); margin:0;}
  @media (max-width:860px){ .drei{grid-template-columns:1fr;} }

  /* ---------------- Sonntag ---------------- */
  .sonntag{background:var(--ton); color:#FFF3EA; overflow:hidden; position:relative;}
  .sonntag h2{color:#FFF3EA;}
  .sonntag .eyebrow{color:rgba(255,243,234,.7);}
  .sonntag .lead{color:rgba(255,243,234,.9);}
  .sonntag-gitter{display:grid; grid-template-columns:1.2fr .8fr; gap:clamp(28px,5vw,64px); align-items:center; position:relative; z-index:2;}
  .preisstempel{
    width:190px; height:190px; border-radius:50%; border:1.5px solid rgba(255,243,234,.5);
    display:flex; flex-direction:column; align-items:center; justify-content:center; margin-left:auto; text-align:center;
  }
  .preisstempel .zahl{font-family:var(--serif); font-size:56px; line-height:1;}
  .preisstempel .wort{font-family:var(--sans); font-size:10px; letter-spacing:.24em; text-transform:uppercase; margin-top:8px; opacity:.8;}
  .sonntag .detail{font-size:15px; opacity:.86; border-top:1px solid rgba(255,243,234,.25); padding-top:16px; margin-top:22px;}
  @media (max-width:800px){ .sonntag-gitter{grid-template-columns:1fr;} .preisstempel{margin:0;} }

  /* ---------------- Kostproben ---------------- */
  .proben{display:grid; grid-template-columns:1fr 1fr; gap:26px 48px;}
  .probe{display:flex; align-items:baseline; gap:14px; padding:0 0 8px;}
  .probe .name{font-family:var(--serif); font-size:22px; white-space:nowrap;}
  .probe .fuell{flex:1; border-bottom:1px dotted var(--taupe); opacity:.55; transform:translateY(-5px);}
  .probe .preis{font-family:var(--sans); font-size:14px; font-weight:600; color:var(--ton);}
  .probe-text{font-size:15px; color:var(--tinte-weich); margin:0;}
  @media (max-width:800px){ .proben{grid-template-columns:1fr; gap:22px;} }

  /* ---------------- Besuch ---------------- */
  .besuch{display:grid; grid-template-columns:1fr 1fr; gap:clamp(28px,5vw,64px);}
  .zeiten{list-style:none; margin:0; padding:0;}
  .zeiten li{display:flex; justify-content:space-between; gap:20px; padding:15px 0; border-bottom:1px solid var(--linie); font-size:16px;}
  .zeiten li:last-child{border-bottom:0;}
  .zeiten .ruhe{color:var(--ton);}
  .adresse{font-family:var(--serif); font-size:clamp(24px,3vw,32px); line-height:1.3; margin:0 0 18px;}
  @media (max-width:760px){ .besuch{grid-template-columns:1fr;} }

  /* ---------------- Abschluss-CTA ---------------- */
  .abschluss-sektion{position:relative;}
  .abschluss{text-align:center;}
  .abschluss h2{max-width:16ch; margin:0 auto 20px;}
  .abschluss .lead{max-width:52ch; margin:0 auto 34px;}
  .sozial{display:flex; gap:14px; justify-content:center; margin-top:34px;}
  .sozial a{
    width:58px; height:58px; border-radius:50%; display:grid; place-items:center;
    border:1.5px solid rgba(234,220,198,.45); color:var(--sand-hell);
    transition:background .18s, color .18s, border-color .18s, transform .12s;
  }
  .sozial a:hover{background:var(--sand-hell); color:var(--tann); border-color:var(--sand-hell); transform:translateY(-2px);}
  .sozial svg{width:24px; height:24px;}
`;

const inhalt = /* html */ `
<section class="hero">
  <div class="hero-inhalt">
    <p class="eyebrow">Modernes Wirtshaus · ${HAUS.viertel}, ${HAUS.stadt}</p>
    <h1>Ehrliche Küche.<span class="zeile2">Von Herzen.</span></h1>
    <div class="zier"><span></span></div>
    <p class="lead">
      Süddeutsch, alpin, ohne Getue. Wild aus eigener Jagd neben vollwertiger veganer Küche –
      und ein Platz am Tisch, an dem man länger bleibt als geplant.
    </p>
    <div class="hero-aktionen">
      <a class="btn ton" href="/reservierung">Tisch reservieren</a>
      <a class="btn linie" href="/speisekarte">Zur Speisekarte</a>
    </div>
  </div>
  <div class="hero-landschaft">
    <div class="hero-sonne"></div>
    ${huegelSvg(["var(--tann-hell)", "var(--sand)", "var(--creme)"], { hoehe: 170 })}
  </div>
</section>

<section class="luft-klein">
  <div class="wrap">
    <div class="werte auf">
      ${WERTE.map(
        (w) => `
      <div class="wert">
        ${iconSvg[w.icon]}
        <h3>${w.titel}</h3>
        <p>${w.text}</p>
      </div>`,
      ).join("")}
    </div>
  </div>
</section>

<section class="luft">
  <div class="wrap">
    <div class="story auf">
      <div>
        <p class="eyebrow">Herzlich willkommen</p>
        <h2>Ein Traum wurde Wirklichkeit – und wächst jeden Tag weiter.</h2>
        <p class="lead" style="margin-top:22px">
          Seit unserer Eröffnung Mitte 2025 im ${HAUS.viertel} ist aus einer Idee ein lebendiger Ort
          des Zusammenkommens geworden. Wir verbinden die Herzlichkeit bayrischer Wirtshaus-Tradition
          mit modernen Ansprüchen an Genuss, Atmosphäre und Nachhaltigkeit.
        </p>
        <a class="btn linie" href="/ueber-uns">Unsere Geschichte</a>
      </div>
      <div>
        <blockquote class="zitat">
          „Für mich gibt es kein schöneres Gefühl, als die Menschen in meinem Umfeld glücklich zu machen.“
        </blockquote>
        <p class="signatur">Victorio · Inhaber</p>
        <p style="margin-top:26px; color:var(--tinte-weich)">
          Aufgewachsen in einem kleinen Dorf am Bodensee, Quereinsteiger aus dem Büro – und mit dem
          Hand aufs Herz endlich dort angekommen, wo er hingehört: hinter einem Tresen, an dem
          Gäste fröhlicher rausgehen, als sie reingekommen sind.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="luft-klein">
  <div class="wrap">
    <div class="drei auf">
      ${HIGHLIGHTS.map(
        (h) => `
      <article class="karte">
        <p class="eyebrow" style="margin-bottom:0">${h.tag}</p>
        <h3>${h.titel}</h3>
        <p>${h.text}</p>
      </article>`,
      ).join("")}
    </div>
  </div>
</section>

<section class="sonntag luft">
  <div class="wrap">
    <div class="sonntag-gitter auf">
      <div>
        <p class="eyebrow">Jeden Sonntag</p>
        <h2>${SONNTAG.titel}</h2>
        <p class="lead" style="margin-top:20px">${SONNTAG.text}</p>
        <div class="detail">
          <strong style="font-family:var(--sans); font-size:11px; letter-spacing:.2em; text-transform:uppercase;">Getränk zur Wahl</strong><br>
          ${SONNTAG.getraenke}
        </div>
        <div style="margin-top:28px">
          <a class="btn linie" style="border-color:rgba(255,243,234,.55); color:#FFF3EA" href="/reservierung">Sonntagstisch sichern</a>
        </div>
      </div>
      <div>
        <div class="preisstempel">
          <span class="zahl">${SONNTAG.preis.replace(",", ",")}</span>
          <span class="wort">Euro · alles dabei</span>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="luft">
  <div class="wrap">
    <div class="auf" style="text-align:center; margin-bottom:44px">
      <p class="eyebrow">Eine Kostprobe</p>
      <h2>Was gerade auf den Tisch kommt</h2>
    </div>
    <div class="proben auf">
      ${KOSTPROBEN.map(
        (k) => `
      <div>
        <div class="probe">
          <span class="name">${k.name}</span>
          <span class="fuell"></span>
          <span class="preis">${k.preis} €</span>
        </div>
        <p class="probe-text">${k.text}</p>
      </div>`,
      ).join("")}
    </div>
    <div style="text-align:center; margin-top:46px" class="auf">
      <a class="btn linie" href="/speisekarte">Ganze Speisekarte ansehen</a>
    </div>
  </div>
</section>

<section class="luft-klein" style="background:var(--sand-hell)">
  <div class="wrap">
    <div class="besuch auf">
      <div>
        <p class="eyebrow">Hier findet ihr uns</p>
        <p class="adresse">${HAUS.strasse}<br>${HAUS.plz} ${HAUS.stadt}</p>
        <p style="color:var(--tinte-weich)">
          Mitten im ${HAUS.viertel} – zwischen Isar und Schlachthofviertel.
          U-Bahn Poccistraße oder Bus bis Kapuzinerplatz, dann ein kurzer Spaziergang.
        </p>
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:22px">
          <a class="btn linie klein" href="${HAUS.karteUrl}" target="_blank" rel="noreferrer noopener">Route öffnen</a>
          <a class="btn linie klein" href="tel:${HAUS.telefonLink}">${HAUS.telefon}</a>
        </div>
      </div>
      <div>
        <p class="eyebrow">Öffnungszeiten</p>
        <ul class="zeiten">
          ${ZEITEN_TEXT.map(
            (z) =>
              `<li><span>${z.tag}</span><span${z.zeit === "Ruhetag" ? ' class="ruhe"' : ""}>${z.zeit}</span></li>`,
          ).join("\n          ")}
        </ul>
        <p style="font-size:15px; color:var(--taupe); margin-top:18px">
          Küche bis 21:30 Uhr. Für kurzfristige Tische ruft am besten kurz an.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="dunkel luft abschluss-sektion">
  <div class="wrap schmal abschluss auf">
    <p class="eyebrow">Schön, dass ihr da seid</p>
    <h2>Reserviert euren Platz am Tisch</h2>
    <p class="lead">
      In zwei Minuten gebucht, sofort bestätigt. Für größere Runden ab neun Personen
      planen wir gemeinsam – meldet euch einfach.
    </p>
    <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap">
      <a class="btn ton" href="/reservierung">Jetzt reservieren</a>
      <a class="btn linie" href="/feiern">Feier anfragen</a>
    </div>
    <div class="sozial">
      <a href="${HAUS.instagram}" target="_blank" rel="noreferrer noopener" aria-label="Instagram – ${HAUS.instagramHandle}" title="Instagram">${sozialSvg.instagram}</a>
      <a href="${HAUS.tiktok}" target="_blank" rel="noreferrer noopener" aria-label="TikTok – @hand.aufs.herz.re" title="TikTok">${sozialSvg.tiktok}</a>
    </div>
  </div>
</section>
`;

export const homePage = seite({
  titel: `${HAUS.name} – ${HAUS.claim} | Wirtshaus in ${HAUS.stadt}`,
  beschreibung:
    "Modernes Wirtshaus im Münchner Dreimühlenviertel: süddeutsche Küche, Wild aus eigener Jagd und vollwertige vegane Gerichte. Jetzt Tisch reservieren.",
  aktiv: "/",
  css,
  inhalt,
});
