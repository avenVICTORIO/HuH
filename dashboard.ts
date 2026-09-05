import { baseCss, iconHead } from "./styles";
import { chatWidgetCss, chatWidgetHtml, chatWidgetJs } from "./chatwidget";

export const dashboardPage = /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Team &amp; Zeiten – Hand aufs Herz</title>
${iconHead}
<style>
${baseCss}
  .topbar{display:flex; align-items:center; gap:12px; padding:12px 18px; background:var(--card); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:5;}
  .topbar img{height:40px; width:auto;}
  .topbar .ttl{font-family:var(--serif); font-size:clamp(20px,4vw,26px); color:var(--wald); flex:1; letter-spacing:.02em;}
  .topbar .miniclock{font-variant-numeric:tabular-nums; font-size:15px; color:var(--clay);}
  .topbar .term{background:none; border:1px solid var(--line); color:var(--grey); border-radius:999px; padding:8px 14px; font-size:12px; text-decoration:none; letter-spacing:.08em; text-transform:uppercase; font-weight:500; font-family:var(--sans);}
  .topbar .term:hover{color:var(--wald); border-color:var(--wald-hell);}

  /* ---- Seitenleisten-Navigation (Desktop) / Schublade (Mobil) ---- */
  .rahmen{display:flex; align-items:flex-start; gap:10px; max-width:1160px; margin:0 auto; width:100%;}
  .tabs{
    width:198px; flex:none; display:flex; flex-direction:column; gap:6px;
    padding:18px 0 18px 18px; position:sticky; top:82px;
  }
  .tab{
    padding:12px 16px; border:1px solid transparent; border-radius:12px; background:transparent; cursor:pointer;
    font-size:12px; letter-spacing:.1em; text-transform:uppercase; font-weight:500; color:var(--clay);
    transition:all .15s; text-align:left;
  }
  .tab:hover{border-color:var(--line); color:var(--wald); background:var(--card);}
  .tab.active{background:var(--wald); color:var(--sand-hell); border-color:var(--wald); font-weight:600;}
  .body{flex:1; min-width:0; padding:16px 18px 32px;}
  .view{display:none;} .view.active{display:block;}
  .nav-knopf{display:none;}
  .nav-schleier{display:none;}
  @media (max-width:880px){
    .rahmen{display:block;}
    .tabs{
      position:fixed; left:0; bottom:0; top:auto; width:min(300px,82vw); max-height:75vh; overflow:auto;
      background:var(--card); border:1px solid var(--line); border-left:none; border-bottom:none;
      border-radius:0 22px 0 0; padding:20px 18px 26px; z-index:80;
      transform:translateX(-105%); transition:transform .28s cubic-bezier(.4,0,.2,1);
      box-shadow:0 -10px 44px rgba(34,38,31,.22);
    }
    .tabs.offen{transform:none;}
    .tab{font-size:13px; padding:14px 16px;}
    .nav-knopf{
      display:grid; place-items:center; position:fixed; left:16px; bottom:16px;
      width:56px; height:56px; border-radius:50%; border:none; cursor:pointer;
      background:var(--wald); color:var(--sand-hell); z-index:81;
      box-shadow:0 8px 24px rgba(34,38,31,.32);
    }
    .nav-knopf svg{width:22px; height:22px;}
    .nav-schleier.offen{display:block; position:fixed; inset:0; background:rgba(34,38,31,.35); z-index:79;}
  }

  .sec-title{font-family:var(--serif); font-size:24px; color:var(--wald); margin:12px 0 4px; padding-bottom:0;}
  .sec-title::after{content:""; display:block; width:44px; height:2px; background:var(--amber); margin:8px 0 14px;}
  .sec-title:not(:first-child){margin-top:30px;}

  .card{background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:10px; box-shadow:0 1px 2px rgba(34,38,31,.03);}
  .row{display:flex; align-items:center; gap:12px;}
  .row .nm{flex:1; font-size:16px;}
  .row .nm small{display:block; color:var(--grey); font-size:12px; letter-spacing:.04em;}
  .tag{font-size:11px; padding:4px 11px; border-radius:20px; white-space:nowrap; letter-spacing:.06em; font-weight:500;}
  .tag.in{background:#E4EADF; color:var(--wald);} .tag.out{background:var(--sand-hell); color:var(--clay);}
  .dur{font-variant-numeric:tabular-nums; font-family:var(--serif); font-size:20px; color:var(--ink); min-width:88px; text-align:right;}
  .empty{color:var(--grey); font-size:14px; padding:14px; text-align:center; font-style:italic;}

  .bar{height:8px; background:var(--creme); border:1px solid var(--line); border-radius:6px; overflow:hidden; margin-top:8px;}
  .bar > i{display:block; height:100%; background:linear-gradient(90deg, var(--wald-hell), var(--wald)); border-radius:6px;}

  .ranges{display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;}
  .range{padding:8px 15px; border:1px solid var(--line); border-radius:999px; background:var(--card); cursor:pointer; font-size:13px; color:var(--clay); transition:all .15s;}
  .range:hover{border-color:var(--wald-hell); color:var(--wald);}
  .range.active{background:var(--amber); color:#FFF3EA; border-color:var(--amber); font-weight:500;}
  .totalline{display:flex; justify-content:space-between; font-size:14px; color:var(--grey); margin:10px 2px 0;}

  /* ---- Reservierungen ---- */
  .res-tools{display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px;}
  .res-tools input[type=date]{padding:9px 12px; border:1px solid var(--line); border-radius:10px; font-size:14px; font-family:var(--sans); background:var(--card); color:var(--ink);}
  .kpis{display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px;}
  .kpi{background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px; text-align:center;}
  .kpi .z{font-family:var(--serif); font-size:30px; color:var(--wald); line-height:1.1;}
  .kpi .l{font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--grey); margin-top:2px;}
  .res-datum{font-family:var(--serif); font-size:18px; color:var(--clay); margin:20px 0 8px;}
  .res-zeit{font-family:var(--serif); font-size:20px; color:var(--wald); min-width:56px;}
  .res-info{flex:1; min-width:0;}
  .res-info .n{font-size:16px;}
  .res-info small{display:block; color:var(--grey); font-size:12.5px; overflow:hidden; text-overflow:ellipsis;}
  .res-info .notiz{color:var(--amber); font-style:italic;}
  .pill{font-size:11px; padding:4px 11px; border-radius:20px; letter-spacing:.06em; font-weight:500; white-space:nowrap;}
  .pill.offen{background:var(--sand-hell); color:var(--clay);}
  .pill.bestaetigt{background:#E4EADF; color:var(--wald);}
  .pill.abgesagt{background:#F6E3DC; color:var(--rot);}
  .pill.erledigt{background:var(--creme); color:var(--grey);}
  .res-akt{display:flex; gap:6px;}
  .res-akt button{border:1px solid var(--line); background:var(--card); border-radius:9px; padding:7px 10px; font-size:12px; cursor:pointer; color:var(--clay); font-family:var(--sans);}
  .res-akt button:hover{border-color:var(--wald-hell); color:var(--wald);}
  .res-akt button.ok{color:var(--wald);}
  .res-akt button.no{color:var(--rot);}
  @media (max-width:560px){
    .kpis{grid-template-columns:repeat(3,1fr); gap:8px;}
    .row:has(.res-akt){flex-wrap:wrap;}
    .res-akt{width:100%; justify-content:flex-end;}
  }

  .miniform{display:flex; gap:8px; flex-wrap:wrap; margin:12px 0;}
  .miniform input{padding:11px 12px; border:1px solid var(--line); border-radius:10px; font-size:15px; font-family:var(--sans);}
  .miniform input.nm{flex:1; min-width:140px;} .miniform input.rl{width:150px;}
  .miniform input.pn{width:90px; letter-spacing:2px; font-variant-numeric:tabular-nums;}
  .miniform button{background:var(--wald); color:var(--sand-hell); border:none; border-radius:999px; padding:11px 20px; font-size:13px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; cursor:pointer; font-family:var(--sans);}
  .miniform button:hover{background:#2C382C;}
  .pin{font-variant-numeric:tabular-nums; letter-spacing:2px; color:var(--clay); font-size:15px; white-space:nowrap;}
  .iconbtn{border:none; background:none; cursor:pointer; font-size:14px; padding:6px 8px;}
  .iconbtn.edit{color:var(--wald);} .iconbtn.del{color:var(--rot);}
  .rowinput{padding:8px 10px; border:1px solid var(--line); border-radius:8px; font-size:14px;}
  .rowinput.nm{flex:1; min-width:100px;} .rowinput.rl{width:130px;} .rowinput.pn{width:70px; letter-spacing:2px;}
  .hint{font-size:13px; color:var(--grey); margin:2px 0 10px; line-height:1.5;}

  /* ---- PIN-Gate ---- */
  .gate-box{
    max-width:380px; margin:12vh auto 0; padding:0 24px; text-align:center;
  }
  .gate-box img{height:84px; width:auto; margin:0 auto 18px; display:block;}
  .gate-box h1{font-family:var(--serif); font-size:32px; color:var(--wald); margin:0 0 6px; font-weight:500;}
  .gate-box p{color:var(--clay); font-size:15px; margin:0 0 22px;}
  .gate-box form{display:flex; gap:10px;}
  .gate-box input{
    flex:1; text-align:center; font-size:24px; letter-spacing:14px; font-variant-numeric:tabular-nums;
    padding:13px; border:1px solid var(--line); border-radius:14px; background:var(--card); color:var(--wald); font-family:var(--sans);
  }
  .gate-box input:focus{outline:none; border-color:var(--wald-hell); box-shadow:0 0 0 3px rgba(108,127,104,.16);}
  .gate-box button{
    background:var(--wald); color:var(--sand-hell); border:none; border-radius:14px; padding:13px 22px;
    font-size:13px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; cursor:pointer; font-family:var(--sans);
  }
  .gate-fehler{color:var(--rot); font-size:14px; min-height:22px; margin-top:12px;}
  .gate-box a{display:inline-block; margin-top:14px; color:var(--grey); font-size:13px;}

  /* ---- Schichtplan (Woche) ---- */
  .sp-kopf{display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px;}
  .sp-kopf input[type=date]{padding:9px 12px; border:1px solid var(--line); border-radius:10px; font-size:14px; font-family:var(--sans); background:var(--card); color:var(--ink);}
  .sp-woche-lbl{font-family:var(--serif); font-size:18px; color:var(--wald); min-width:170px; text-align:center;}
  .sp-rahmen{display:flex; gap:14px; align-items:flex-start;}
  .sp-scroll{flex:1; min-width:0; overflow-x:auto; padding-bottom:6px;}
  .sp-woche{display:grid; grid-template-columns:repeat(7, minmax(148px,1fr)); gap:8px; min-width:1090px;}
  .sp-tag{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:10px; min-height:120px;}
  .sp-tag.heute{border-color:var(--amber);}
  .sp-tag-kopf{display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:10px;}
  .sp-tag-kopf .t{font-family:var(--serif); font-size:15.5px; color:var(--wald);}
  .sp-vorlage{border:1px dashed var(--line); background:none; border-radius:8px; padding:4px 8px;
    font-size:10.5px; color:var(--clay); cursor:pointer; font-family:var(--sans); white-space:nowrap;}
  .sp-vorlage:hover{border-color:var(--amber); color:var(--amber);}
  .sp-leer{color:var(--grey); font-size:12px; font-style:italic; text-align:center; padding:12px 0;}
  .sp-mini{border:1px solid var(--line); border-radius:10px; padding:8px 9px; margin-bottom:8px;
    background:var(--creme); transition:box-shadow .12s, border-color .12s;}
  .sp-mini.ueber{border-color:var(--wald-hell); box-shadow:0 0 0 3px rgba(108,127,104,.22);}
  .sp-mini-kopf{display:flex; justify-content:space-between; align-items:baseline; gap:6px;}
  .sp-mini-kopf .r{font-family:var(--serif); font-size:15px; color:var(--wald);}
  .sp-x{border:none; background:none; color:var(--grey); cursor:pointer; font-size:14px; padding:0 2px;}
  .sp-x:hover{color:var(--rot);}
  .sp-mini .z{font-size:11.5px; color:var(--clay); font-variant-numeric:tabular-nums; margin:2px 0 7px;}
  .sp-platz{margin-bottom:6px; border-radius:9px; transition:box-shadow .12s;}
  .sp-platz:last-child{margin-bottom:0;}
  .sp-platz.ueber{box-shadow:0 0 0 3px rgba(108,127,104,.28); background:rgba(108,127,104,.08);}
  .sp-frei{font-size:11.5px; color:var(--grey); font-style:italic; border:1.5px dashed var(--line);
    border-radius:8px; padding:5px 8px; text-align:center; margin-bottom:6px;}
  .sp-mini select{width:100%; font-size:12px; padding:5px 6px; border:1px solid var(--line);
    border-radius:8px; background:var(--card); color:var(--clay); font-family:var(--sans);}
  .sp-zug{display:inline-flex; align-items:center; gap:6px; background:var(--sand-hell); color:var(--ink);
    border-radius:999px; padding:4px 6px 4px 11px; font-size:12.5px; font-weight:500; max-width:100%;}
  .sp-zug span{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .sp-zug button{border:none; background:var(--card); border-radius:50%; width:19px; height:19px; flex:none;
    cursor:pointer; color:var(--rot); font-size:12px; line-height:1; display:grid; place-items:center;}
  .regel-karte{padding:14px 16px;}
  .regel-griff{
    cursor:grab; color:var(--grey); font-size:17px; line-height:1; padding:6px 8px 6px 2px;
    user-select:none; flex:none;
  }
  .regel-griff:active{cursor:grabbing;}
  .regel-karte.zieh{opacity:.4;}
  .regel-karte.ueber-oben{box-shadow:0 -3px 0 0 var(--amber);}
  .regel-karte.ueber-unten{box-shadow:0 3px 0 0 var(--amber);}
  .regel-zeile{display:flex; gap:8px; align-items:center; flex-wrap:wrap;}
  .regel-zeile input[type=time], .regel-zeile input[type=date]{
    padding:8px 10px; border:1px solid var(--line); border-radius:9px; font-size:13.5px;
    font-family:var(--sans); background:var(--card); color:var(--ink);}
  .regel-tage{display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;}
  .tag-toggle{
    width:40px; padding:7px 0; border-radius:9px; border:1px solid var(--line); background:var(--card);
    font-size:12px; font-weight:600; color:var(--grey); cursor:pointer; font-family:var(--sans); text-align:center;
  }
  .tag-toggle[aria-pressed="true"]{background:var(--wald); color:var(--sand-hell); border-color:var(--wald);}
  .regel-karte .inaktiv-lbl{display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--grey); margin-left:auto;}
  .sp-aside{width:172px; flex:none; position:sticky; top:96px; background:var(--card);
    border:1px solid var(--line); border-radius:14px; padding:14px;}
  .sp-aside-titel{font-size:11px; letter-spacing:.14em; text-transform:uppercase; font-weight:600; color:var(--grey); margin-bottom:12px;}
  .sp-gruppe{font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--amber); margin:10px 0 6px; font-weight:600;}
  .sp-gruppe:first-child{margin-top:0;}
  .sp-chip{
    display:flex; align-items:center; gap:7px; padding:8px 13px; border-radius:999px; margin-bottom:6px;
    background:var(--wald); color:var(--sand-hell); font-size:13px; font-weight:500;
    cursor:grab; user-select:none; box-shadow:0 1px 2px rgba(34,38,31,.12);
  }
  .sp-chip:active{cursor:grabbing;}
  .sp-chip.dragging{opacity:.4;}
  @media (max-width:880px){
    .sp-rahmen{flex-direction:column-reverse;}
    .sp-aside{position:static; width:100%;}
    .sp-aside #spChips{display:flex; flex-wrap:wrap; gap:6px;}
    .sp-aside .sp-chip{margin-bottom:0;}
    .sp-aside .sp-gruppe{width:100%;}
  }

  /* ---- Website-Karte ---- */
  .kt-pos{border-radius:10px; padding:2px 4px;}
  .kt-pos.kt-aus{opacity:.45;}
  .kt-pos.ueber-oben{box-shadow:0 -3px 0 0 var(--amber);}
  .kt-pos.ueber-unten{box-shadow:0 3px 0 0 var(--amber);}
  .kt-pos .edit-zeile{margin-bottom:4px;}

  /* ---- Meine Schichten ---- */
  .ms-aktiv{border-color:var(--wald-hell); box-shadow:0 0 0 3px rgba(108,127,104,.14);}
  .ms-aktiv .dur{color:var(--wald);}

  /* ---- Editier-Zeilen (Karte) ---- */
  .edit-zeile{display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;}
  .edit-zeile select, .edit-zeile input{padding:8px 10px; border:1px solid var(--line); border-radius:9px;
    font-size:13.5px; font-family:var(--sans); background:var(--card); color:var(--ink);}
  .edit-zeile .weg{border:none; background:var(--creme); border-radius:50%; width:22px; height:22px;
    cursor:pointer; color:var(--rot); font-size:13px; display:grid; place-items:center;}

  /* ---- Rollen-Katalog ---- */
  .rollen-chips{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;}
  .rolle-karte{margin-bottom:12px;}
  .cap-toggle{width:auto; padding:7px 12px; font-size:11.5px; letter-spacing:.02em;}
  .cap-toggle[data-capkey="*"][aria-pressed="true"]{background:var(--amber); border-color:var(--amber);}
  .tag.out{background:#F6E3DC; color:var(--rot);}
  .invite-zeile{flex-basis:100%; display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap;}
  .invite-zeile input{flex:1; min-width:240px; padding:8px 10px; border:1px solid var(--line); border-radius:9px; font-size:12.5px; font-family:var(--sans); background:var(--creme); color:var(--wald);}
  .invite-zeile small{color:var(--grey); font-size:11.5px;}
  .rollen-chips .r-chip{
    display:inline-flex; align-items:center; gap:8px; padding:8px 8px 8px 15px; border-radius:999px;
    background:var(--card); border:1px solid var(--line); font-size:13.5px; color:var(--ink);
  }
  .r-chip button{border:none; background:var(--creme); border-radius:50%; width:20px; height:20px;
    cursor:pointer; color:var(--rot); font-size:12px; line-height:1; display:grid; place-items:center;}

  /* ---- Meine Zeiten ---- */
  .mz-datum{font-family:var(--serif); font-size:17px; color:var(--clay); min-width:110px;}
  .mz-zeiten{display:flex; gap:8px; align-items:center; flex:1; flex-wrap:wrap;}
  .mz-zeiten input{padding:8px 10px; border:1px solid var(--line); border-radius:9px; font-size:13.5px; font-family:var(--sans); background:var(--card); color:var(--ink);}
  .mz-zeiten .bis{color:var(--grey); font-size:13px;}
  .mz-offen{font-size:12px; color:var(--wald); background:#E4EADF; border-radius:20px; padding:4px 11px; letter-spacing:.05em;}
  @media (max-width:560px){ .row:has(.mz-zeiten){flex-wrap:wrap;} .mz-datum{min-width:0;} }

  /* --- Mobil --- */
  @media (max-width:480px){
    .topbar{padding:10px 12px; gap:8px;}
    .topbar .ttl{font-size:18px;}
    .tabs{padding:12px 10px 0; gap:6px;}
    .tab{padding:9px 12px; font-size:14px;}
    .body{padding:14px 12px;}
    .miniform input.nm,.miniform input.rl{flex:1 1 100%;}
  }
  /* Nur die Bearbeiten-Zeile (mit Eingabefeldern) darf umbrechen, Anzeige-Zeilen nicht. */
  .row:has(.rowinput){flex-wrap:wrap;}
  .row:has(.rowinput) .rowinput.nm{flex:1 1 100%;}
${chatWidgetCss}
</style>
</head>
<body>
<!-- ===== PIN-GATE (ohne Session) ===== -->
<section id="gate" style="display:none">
  <div class="gate-box">
    <img src="/logo.png" alt="Hand aufs Herz">
    <h1>Arbeitsbereich</h1>
    <p>Melde dich mit deinem Passkey an – Fingerabdruck, Gesicht oder Geräte-Code.</p>
    <button type="button" id="gatePasskey" style="width:100%; padding:14px; border:none; border-radius:14px; background:var(--wald); color:var(--sand-hell); font-family:var(--sans); font-size:14px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; cursor:pointer;">Mit Passkey anmelden</button>
    <div class="gate-fehler" id="gateFehler"></div>
    <a href="/app">← Zum Dashboard</a>
  </div>
</section>

<div id="app" style="display:none">
<div class="topbar">
  <img src="/logo.png" alt="Hand aufs Herz">
  <div class="ttl" id="ttl">Arbeitsbereich</div>
  <div class="miniclock" id="clock">--:--:--</div>
  <a class="term" href="/app">Dashboard ›</a>
  <button class="term" id="btnAbmelden" style="cursor:pointer; background:none; font-family:var(--sans);">Abmelden</button>
</div>

<div class="rahmen">
<nav class="tabs" id="seitennav" aria-label="Bereiche">
  <div class="tab" data-v="heute">Heute · Live</div>
  <div class="tab" data-v="reservierungen">Reservierungen</div>
  <div class="tab" data-v="meine-schichten">Meine Schichten</div>
  <div class="tab" data-v="meine-zeiten">Meine Zeiten</div>
  <div class="tab" data-v="karte">Karte</div>
  <div class="tab" data-v="schichtplan">Schichtplan</div>
  <div class="tab" data-v="auswertung">Auswertung</div>
  <div class="tab" data-v="ablaeufe">Abläufe</div>
  <div class="tab" data-v="team">Team</div>
  <div class="tab" data-v="rollen">Rollen</div>
</nav>
<div class="nav-schleier" id="navSchleier"></div>
<button class="nav-knopf" id="navKnopf" aria-label="Navigation öffnen" aria-expanded="false" aria-controls="seitennav">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
</button>

<div class="body">
  <!-- ===== VIEW 1: HEUTE / LIVE ===== -->
  <section class="view active" id="v-heute">
    <div class="sec-title">Wer ist gerade da?</div>
    <div id="presentList"><div class="empty">lädt …</div></div>
    <div class="sec-title">Heute gearbeitet</div>
    <div id="todayList"><div class="empty">lädt …</div></div>
  </section>

  <!-- ===== VIEW: RESERVIERUNGEN ===== -->
  <section class="view" id="v-reservierungen">
    <div class="sec-title">Reservierungen</div>
    <div class="res-tools">
      <input type="date" id="resDatum">
      <div class="ranges" style="margin:0">
        <div class="range active" id="resHeuteBtn">Heute</div>
        <div class="range" id="resAlleBtn">Alle kommenden</div>
      </div>
    </div>
    <div class="kpis" id="resKpis" style="display:none; grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="z" id="kGaeste">–</div><div class="l">Gäste</div></div>
      <div class="kpi"><div class="z" id="kDrinnen">–</div><div class="l">Drinnen</div></div>
      <div class="kpi"><div class="z" id="kDraussen">–</div><div class="l">Draußen</div></div>
      <div class="kpi"><div class="z" id="kAuslastung">–</div><div class="l">Auslastung</div></div>
    </div>
    <div id="resList"><div class="empty">lädt …</div></div>

    <div class="sec-title" style="font-size:20px">Neue Reservierung</div>
    <p class="hint">Für Anrufe und Walk-ins – wird sofort als „Bestätigt“ angelegt. Kapazität prüft ihr selbst.</p>
    <div class="miniform" id="resNeuForm">
      <input class="nm" id="rnName" placeholder="Name *" maxlength="120">
      <input class="rl" id="rnTelefon" placeholder="Telefon" maxlength="40">
      <select id="rnBereich" class="rowinput" style="padding:11px 12px; border-radius:10px; font-size:15px; background:var(--card);">
        <option value="drinnen">Drinnen</option><option value="draussen">Draußen</option>
      </select>
      <input type="date" id="rnDatum">
      <input type="time" id="rnZeit" step="900" value="19:00">
      <input class="pn" id="rnPersonen" type="number" min="1" max="120" placeholder="Pers." value="2">
      <input class="nm" id="rnNotiz" placeholder="Notiz (optional)" maxlength="600">
      <button id="btnResNeu">+ Anlegen</button>
    </div>

    <div id="kapBlock" style="display:none">
      <div class="sec-title" style="font-size:20px">Plätze &amp; Kapazität</div>
      <p class="hint">
        Physische Plätze je Bereich – das Gesamtmaximum ergibt sich automatisch.
        Der Walk-in-Puffer bleibt für spontane Gäste frei und ist online nicht buchbar.
      </p>
      <div class="miniform">
        <label style="display:flex; flex-direction:column; gap:4px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--grey);">Drinnen
          <input class="pn" id="kapDrinnen" type="number" min="0" style="width:100px"></label>
        <label style="display:flex; flex-direction:column; gap:4px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--grey);">Draußen
          <input class="pn" id="kapDraussen" type="number" min="0" style="width:100px"></label>
        <label style="display:flex; flex-direction:column; gap:4px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--grey);">Walk-in-Puffer %
          <input class="pn" id="kapPuffer" type="number" min="0" max="90" step="5" style="width:100px"></label>
        <button id="btnKap" style="align-self:flex-end">Speichern</button>
      </div>
      <p class="hint" id="kapRechnung" style="margin-top:2px"></p>
    </div>
  </section>

  <!-- ===== VIEW 2: AUSWERTUNG ===== -->
  <section class="view" id="v-auswertung">
    <div class="sec-title">Zeiten pro Mitarbeiter</div>
    <div class="ranges" id="ranges">
      <div class="range active" data-r="today">Heute</div>
      <div class="range" data-r="week">Diese Woche</div>
      <div class="range" data-r="month">Dieser Monat</div>
      <div class="range" data-r="all">Alles</div>
    </div>
    <div id="reportList"><div class="empty">lädt …</div></div>
    <div class="totalline"><span id="reportRange"></span><span id="reportTotal"></span></div>
  </section>

  <!-- ===== VIEW 3: TEAM ===== -->
  <section class="view" id="v-team">
    <div class="sec-title">Team verwalten</div>
    <p class="hint">Person anlegen, dann per <b>Einladungslink</b> einladen – am Terminal richtet sie ihren Passkey ein (Fingerabdruck, Gesicht oder Geräte-Code). Was sie darf, kommt aus der Rolle (siehe <a href="/app/rollen">Rollen</a>).</p>
    <div id="teamList"><div class="empty">lädt …</div></div>
    <div class="miniform">
      <input class="nm" id="newVorname" placeholder="Vorname *" maxlength="60" autocomplete="off" required>
      <input class="nm" id="newNachname" placeholder="Nachname (optional)" maxlength="60" autocomplete="off">
      <select class="rl" id="newRole" style="padding:11px 12px; border:1px solid var(--line); border-radius:10px; font-size:15px; background:var(--card); font-family:var(--sans);"></select>
      <button id="btnAdd">+ Hinzufügen</button>
    </div>
  </section>

  <!-- ===== VIEW: ROLLEN & BERECHTIGUNGEN ===== -->
  <section class="view" id="v-rollen">
    <div class="sec-title">Rollen &amp; Berechtigungen</div>
    <p class="hint">Rollen sind Bündel von Fähigkeiten: Was eine Rolle darf, gilt für alle mit dieser Rolle. „Alles“ = Inhaber-Vollzugriff. Löschen geht nur, wenn keine Person die Rolle mehr trägt.</p>
    <div id="rollenListe"><div class="empty">lädt …</div></div>
    <div class="miniform">
      <input class="rl" id="rolleNeu" placeholder="Neue Rolle (z. B. Spüler)" maxlength="40">
      <button id="btnRolleNeu">+ Anlegen</button>
    </div>
  </section>

  <!-- ===== VIEW: ABLÄUFE / CHECKLISTEN (Admin) ===== -->
  <section class="view" id="v-ablaeufe">
    <div class="sec-title">Abläufe &amp; Checklisten</div>
    <p class="hint">Diese Aufgaben führen die Mitarbeiter am Terminal durch den Abend. Die <b>Reihenfolge ist chronologisch</b> (mit ▲▼ ändern); die <b>Info</b> klappt bei der jeweils aktiven Aufgabe automatisch aus.</p>
    <div class="ranges" id="abProzesse"></div>
    <div id="abListe"><div class="empty">lädt …</div></div>
    <div class="miniform">
      <input class="nm" id="abNeuTitel" placeholder="Neue Aufgabe" maxlength="200">
      <input class="rl" id="abNeuGruppe" placeholder="Gruppe (optional)" maxlength="60">
      <button id="abAdd">+ Hinzufügen</button>
    </div>
    <input id="abNeuInfo" placeholder="Zusatzinfo (optional)" maxlength="1000" style="width:100%; padding:11px 12px; border:1px solid var(--line); border-radius:10px; font-size:15px; font-family:var(--sans); margin-top:-4px">
  </section>

  <!-- ===== VIEW: WEBSITE-KARTE (Admin) ===== -->
  <section class="view" id="v-karte">
    <div class="sec-title">Speisekarte der Website</div>
    <p class="hint">
      Was hier steht, steht auf handaufsherz.restaurant/speisekarte – Änderungen sind sofort live.
      Reihenfolge per ⠿ ziehen. Getränke-Gruppen können Preisspalten haben (z. B. „0,3 l|0,5 l“),
      die Preise der Zeilen folgen mit | getrennt (z. B. „3,9|4,9“).
    </p>
    <div class="ranges" id="ktKapitel"></div>
    <div id="ktListe"><div class="empty">lädt …</div></div>
    <div class="card regel-karte">
      <div class="edit-zeile">
        <input id="ktNeuTitel" placeholder="Neue Gruppe (z. B. Unsere Vorspeisen)" style="flex:1; min-width:200px">
        <input id="ktNeuSpalten" placeholder="Preisspalten, optional (0,3 l|0,5 l)" style="width:220px">
        <button class="ok" id="btnKtGruppe" style="border:none; background:var(--wald); color:var(--sand-hell); border-radius:9px; padding:9px 16px; cursor:pointer; font-family:var(--sans);">+ Gruppe</button>
      </div>
    </div>
  </section>

  <!-- ===== VIEW: MEINE SCHICHTEN (Mitarbeiter, lesend) ===== -->
  <section class="view" id="v-meine-schichten">
    <div class="sec-title">Meine Schichten</div>
    <p class="hint">Deine eingeplanten Einsätze. Passt etwas nicht? Sag deinem Admin Bescheid.</p>
    <div id="msList"><div class="empty">lädt …</div></div>
  </section>

  <!-- ===== VIEW: SCHICHTPLAN (Admin, Wochenansicht) ===== -->
  <section class="view" id="v-schichtplan">
    <div class="sec-title">Schichtplan</div>
    <div class="sp-kopf">
      <button class="range" id="spZurueck" title="Woche zurück">‹</button>
      <span class="sp-woche-lbl" id="spWocheLbl"></span>
      <button class="range" id="spVor" title="Woche vor">›</button>
      <input type="date" id="spDatum" title="Woche wählen">
    </div>
    <p class="hint">Zieh eine Person aus der Leiste auf eine Schicht – nur passende Rollen lassen sich ablegen (Admins überall). „×“ löst die Zuweisung.</p>

    <div class="sp-rahmen">
      <div class="sp-scroll"><div class="sp-woche" id="spWoche"></div></div>
      <aside class="sp-aside">
        <div class="sp-aside-titel">Mitarbeiter</div>
        <div id="spChips"></div>
      </aside>
    </div>

    <div class="sec-title" style="font-size:20px">Wiederkehrende Schichten</div>
    <p class="hint">
      Der Wochen-Rhythmus des Hauses – die Vorlage ist die einzige Quelle des Plans:
      Änderungen hier gleichen den Kalender automatisch ab (besetzte Schichten bleiben immer stehen).
      Reihenfolge per ⠿ ziehen – sie gilt auch im Wochenplan.
    </p>
    <div id="spRegeln"><div class="empty">lädt …</div></div>
    <div class="card regel-karte" id="regelNeu">
      <div class="regel-zeile">
        <select class="rowinput" id="rgRolle" style="width:130px"></select>
        <input type="time" id="rgVon" value="16:30">
        <span class="bis" style="color:var(--grey); font-size:13px">bis</span>
        <input type="time" id="rgBis" value="22:30">
        <input type="number" id="rgAnzahl" class="rowinput pn" value="1" min="1" max="10" title="Wie viele gleiche Schichten">
        <select class="rowinput" id="rgRhythmus" style="width:150px">
          <option value="woechentlich">jede Woche</option>
          <option value="zweiwoechentlich">alle 2 Wochen</option>
        </select>
        <input type="date" id="rgStart" title="Startwoche (für 2-Wochen-Rhythmus)" style="display:none">
      </div>
      <div class="regel-tage" id="rgTage"></div>
      <div class="res-akt" style="margin-top:10px"><button class="ok" id="btnRegelNeu">+ Regel anlegen</button></div>
    </div>

  </section>

  <!-- ===== VIEW: MEINE ZEITEN / ZEITEN (Admin) ===== -->
  <section class="view" id="v-meine-zeiten">
    <div class="sec-title" id="mzTitel">Meine Zeiten</div>
    <p class="hint" id="mzHinweis" style="display:none">
      Deine gestempelten Zeiten. Stimmt etwas nicht? Sag deinem Admin Bescheid – nur er kann korrigieren.
    </p>
    <div class="ranges" id="mzRanges">
      <select id="mzWer" style="display:none; padding:8px 12px; border:1px solid var(--line); border-radius:999px; font-size:13px; background:var(--card); color:var(--clay); font-family:var(--sans);"></select>
      <div class="range" data-mzr="today">Heute</div>
      <div class="range active" data-mzr="week">Diese Woche</div>
      <div class="range" data-mzr="month">Dieser Monat</div>
    </div>
    <div id="mzList"><div class="empty">lädt …</div></div>
    <div class="totalline"><span id="mzRangeLbl"></span><span id="mzTotal"></span></div>

    <div id="mzAdminWerkzeuge" style="display:none">
      <div class="sec-title" style="font-size:20px">Zeit nachtragen</div>
      <p class="hint">Stempeln vergessen? Hier trägst du eine Schicht für die ausgewählte Person nach.</p>
      <div class="miniform">
        <input type="date" id="mzNeuDatum">
        <input type="time" id="mzNeuStart">
        <span style="align-self:center; color:var(--grey); font-size:13px">bis</span>
        <input type="time" id="mzNeuEnde">
        <button id="btnMzNeu">+ Nachtragen</button>
      </div>
    </div>
  </section>
</div><!-- /body -->
</div><!-- /rahmen -->
</div><!-- /app -->

${chatWidgetHtml}
<script>
${chatWidgetJs}
"use strict";
const p2=n=>String(n).padStart(2,"0");
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function hms(ms){ const s=Math.max(0,Math.floor(ms/1000)); return p2(Math.floor(s/3600))+":"+p2(Math.floor(s/60)%60)+":"+p2(s%60); }
function hhmm(ms){ const m=Math.max(0,Math.round(ms/60000)); return Math.floor(m/60)+" h "+p2(m%60)+" min"; }
function hm(ts){ const d=new Date(ts); return p2(d.getHours())+":"+p2(d.getMinutes()); }

/* Uhr */
setInterval(()=>{ const d=new Date(); $("clock").textContent=p2(d.getHours())+":"+p2(d.getMinutes())+":"+p2(d.getSeconds()); },1000);

/* ===== Anmeldung & Rollen ===== */
let ME=null;
const cap=(c)=>!!(ME&&ME.caps&&(ME.caps.includes("*")||ME.caps.includes(c))); // Fähigkeit der eigenen Rolle
let activeView=null;

function schubladeZu(){
  $("seitennav").classList.remove("offen");
  $("navSchleier").classList.remove("offen");
  $("navKnopf").setAttribute("aria-expanded","false");
}
$("navKnopf").addEventListener("click",()=>{
  const offen=$("seitennav").classList.toggle("offen");
  $("navSchleier").classList.toggle("offen",offen);
  $("navKnopf").setAttribute("aria-expanded",String(offen));
});
$("navSchleier").addEventListener("click",schubladeZu);

function aktiviere(v){
  activeView=v;
  schubladeZu();
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.v===v));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  $("v-"+v).classList.add("active");
  // Jeder Bereich hat seine eigene Adresse: /app/<bereich>
  if(location.pathname!=="/app/"+v) history.pushState(null,"","/app/"+v);
  // Titel neben dem Logo = aktueller Bereich (Name wie im Tab).
  { const t=document.querySelector('.tab[data-v="'+v+'"]'); if(t) $("ttl").textContent=(t.firstChild?t.firstChild.textContent:t.textContent).trim(); }
  if(v==="heute") loadHeute();
  if(v==="reservierungen") loadRes();
  if(v==="meine-schichten") loadMs();
  if(v==="meine-zeiten") loadMz();
  if(v==="karte") loadKarte();
  if(v==="schichtplan") loadSp();
  if(v==="auswertung") loadReport();
  if(v==="ablaeufe") loadAblaeufe();
  if(v==="team") loadTeam();
  if(v==="rollen") ladeRollen();
}
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>aktiviere(t.dataset.v)));

// Tabs folgen den Fähigkeiten der Rolle; Basis-Tabs (Meine Schichten/Zeiten) hat jeder.
const TAB_CAPS={heute:"auswertung",reservierungen:"reservierungen",schichtplan:"schichtplan",
  "meine-schichten":"","meine-zeiten":"",karte:"karte.admin",
  auswertung:"auswertung",ablaeufe:"ablaeufe.admin",team:"team.admin",rollen:"team.admin"};
const TAB_REIHE=["heute","reservierungen","schichtplan","meine-schichten","meine-zeiten","karte","auswertung","ablaeufe","team","rollen"];
const erlaubteTabs=()=>TAB_REIHE.filter(v=>!TAB_CAPS[v]||cap(TAB_CAPS[v]));

function starte(){
  $("gate").style.display="none"; $("app").style.display="";
  const erlaubt=erlaubteTabs();
  document.querySelectorAll(".tab").forEach(t=>{ t.style.display=erlaubt.includes(t.dataset.v)?"":"none"; });
  const wunsch=bereichAusPfad();
  aktiviere(erlaubt.includes(wunsch)?wunsch:erlaubt[0]);
  chatWidget.init({meId:ME.id, admin:cap("chat.admin"), senden:liveSenden}); liveVerbinden();
}
// Bereich aus der Adresse: /app/<bereich> (alte #-Anker werden noch verstanden).
function bereichAusPfad(){ return (location.pathname.split("/")[2]||location.hash.replace("#","")||""); }
// Zurück/Vor im Browser wechselt den Bereich, ohne neu zu laden.
window.addEventListener("popstate",()=>{ if(!ME) return; const b=bereichAusPfad(); if(erlaubteTabs().includes(b)) aktiviere(b); });

async function boot(){
  const r=await fetch("/api/me");
  if(r.ok){ ME=await r.json(); starte(); }
  else { $("gate").style.display=""; $("app").style.display="none"; }
}
// Passkey-Login direkt im Arbeitsbereich (gleiche Zeremonie wie am Terminal).
const b2a=(s)=>{ s=s.replace(/-/g,"+").replace(/_/g,"/"); const bin=atob(s+"=".repeat((4-s.length%4)%4));
  const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i); return u.buffer; };
const a2b=(buf)=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
$("gatePasskey").addEventListener("click",async ()=>{
  $("gateFehler").textContent="";
  try{
    const opts=await fetch("/api/passkey/login/optionen",{method:"POST"}).then(r=>r.json());
    opts.challenge=b2a(opts.challenge);
    (opts.allowCredentials||[]).forEach(c=>c.id=b2a(c.id));
    const cred=await navigator.credentials.get({publicKey:opts});
    const antwort={id:cred.id, rawId:a2b(cred.rawId), type:cred.type, clientExtensionResults:cred.getClientExtensionResults(),
      response:{clientDataJSON:a2b(cred.response.clientDataJSON), authenticatorData:a2b(cred.response.authenticatorData),
        signature:a2b(cred.response.signature), userHandle:cred.response.userHandle?a2b(cred.response.userHandle):null}};
    const r=await fetch("/api/passkey/login/abschluss",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(antwort)});
    if(!r.ok){ $("gateFehler").textContent=(await r.json()).fehler||"Anmeldung fehlgeschlagen."; return; }
    boot();
  }catch(e){ if(e.name!=="NotAllowedError") $("gateFehler").textContent="Das hat nicht geklappt: "+e.message; }
});
$("btnAbmelden").addEventListener("click",async ()=>{
  await fetch("/api/session",{method:"DELETE"});
  location.href="/app";
});

/* ---- Datumsgrenzen (lokal) ---- */
function dayStart(d){ const x=new Date(d); x.setHours(0,0,0,0); return x.getTime(); }
function ranges(){
  const now=new Date();
  const today0=dayStart(now);
  const dow=(now.getDay()+6)%7; // Montag=0
  const week0=today0-dow*86400000;
  const month0=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  return {
    today:{from:today0,to:today0+86400000,label:"Heute"},
    week:{from:week0,to:week0+7*86400000,label:"Diese Woche"},
    month:{from:month0,to:new Date(now.getFullYear(),now.getMonth()+1,1).getTime(),label:"Dieser Monat"},
    all:{from:0,to:Date.now()+1,label:"Gesamt"}
  };
}

/* ===== VIEW 1: HEUTE / LIVE ===== */
let presentData=[];
async function loadHeute(){
  const r=ranges().today;
  const [status,report]=await Promise.all([
    fetch("/api/status").then(x=>x.json()),
    fetch("/api/report?from="+r.from+"&to="+r.to).then(x=>x.json())
  ]);
  presentData=status.filter(s=>s.clockedIn);
  renderPresent();
  const today=report.filter(x=>x.totalMs>0).sort((a,b)=>b.totalMs-a.totalMs);
  $("todayList").innerHTML = today.length ? today.map(x=>
    '<div class="card row"><div class="nm">'+esc(x.name)+'<small>'+esc(x.role)+'</small></div>'+
    '<div class="dur">'+hhmm(x.totalMs)+'</div></div>').join("")
    : '<div class="empty">Heute noch niemand gestempelt</div>';
}
function renderPresent(){
  if(!presentData.length){ $("presentList").innerHTML='<div class="empty">Gerade niemand eingestempelt</div>'; return; }
  $("presentList").innerHTML=presentData.map(s=>
    '<div class="card row"><div class="nm">'+esc(s.name)+'<small>'+esc(s.role)+'</small></div>'+
    '<span class="tag in">seit '+hm(s.since)+'</span>'+
    '<div class="dur" data-since="'+s.since+'">'+hms(Date.now()-s.since)+'</div></div>').join("");
}
setInterval(()=>{
  if(activeView!=="heute") return;
  document.querySelectorAll('#presentList .dur[data-since]').forEach(el=>{
    el.textContent=hms(Date.now()-Number(el.dataset.since));
  });
},1000);

/* ===== VIEW: RESERVIERUNGEN ===== */
const WTAGE=["So","Mo","Di","Mi","Do","Fr","Sa"];
const MON=["Jan","Feb","März","April","Mai","Juni","Juli","Aug","Sep","Okt","Nov","Dez"];
function heuteISO(){ const d=new Date(); return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
function datumSchoen(iso){ const [y,m,t]=iso.split("-").map(Number); const d=new Date(y,m-1,t);
  return WTAGE[d.getDay()]+", "+t+". "+MON[m-1]+" "+y; }
let resModus="tag"; // "tag" = ein Datum, "alle" = kommende
const STATUS_LABEL={offen:"Offen",bestaetigt:"Bestätigt",abgesagt:"Abgesagt",erledigt:"Erledigt"};

let resEditId=null, resRows=[];
async function loadRes(){
  const datum=$("resDatum").value||heuteISO();
  let kpi=null;
  if(resModus==="tag"){
    [resRows,kpi]=await Promise.all([
      fetch("/api/reservierungen?datum="+datum).then(x=>x.json()),
      fetch("/api/reservierungen-uebersicht?datum="+datum).then(x=>x.json())
    ]);
  }else{
    resRows=await fetch("/api/reservierungen").then(x=>x.json());
  }
  $("resKpis").style.display=kpi?"grid":"none";
  if(kpi){ $("kGaeste").textContent=kpi.gaeste; $("kDrinnen").textContent=kpi.drinnen;
    $("kDraussen").textContent=kpi.draussen; $("kAuslastung").textContent=kpi.auslastung+" %"; }
  $("kapBlock").style.display=cap("reservierungen")?"":"none";
  if(cap("reservierungen") && !$("kapDrinnen").value){
    const kap=await fetch("/api/kapazitaet").then(x=>x.json());
    $("kapDrinnen").value=kap.drinnen; $("kapDraussen").value=kap.draussen;
    $("kapPuffer").value=kap.puffer;
    kapRechnen();
  }

  if(!resRows.length){ $("resList").innerHTML='<div class="empty">Keine Reservierungen '+(resModus==="tag"?"an diesem Tag":"in nächster Zeit")+'</div>'; return; }

  let html="", letztesDatum=null;
  for(const r of resRows){
    if(resModus==="alle" && r.datum!==letztesDatum){
      html+='<div class="res-datum">'+datumSchoen(r.datum)+'</div>';
      letztesDatum=r.datum;
    }
    if(r.id===resEditId){
      html+='<div class="card row">'+
        '<input class="rowinput nm" id="reName" value="'+esc(r.name)+'" placeholder="Name">'+
        '<input class="rowinput" type="date" id="reDatum" value="'+esc(r.datum)+'" style="width:150px">'+
        '<input class="rowinput" type="time" id="reZeit" value="'+esc(r.zeit)+'" step="900" style="width:110px">'+
        '<input class="rowinput pn" type="number" id="rePersonen" value="'+r.personen+'" min="1" max="120">'+
        '<select class="rowinput" id="reBereich" style="width:110px">'+
          '<option value="drinnen"'+(r.bereich==="drinnen"?" selected":"")+'>Drinnen</option>'+
          '<option value="draussen"'+(r.bereich==="draussen"?" selected":"")+'>Draußen</option></select>'+
        '<input class="rowinput rl" id="reTelefon" value="'+esc(r.telefon==="-"?"":r.telefon)+'" placeholder="Telefon">'+
        '<input class="rowinput nm" id="reNotiz" value="'+esc(r.notiz||"")+'" placeholder="Notiz">'+
        '<div class="res-akt">'+
          '<button class="ok" data-resave="'+r.id+'">Speichern</button>'+
          '<button data-recancel>Abbrechen</button>'+
        '</div></div>';
      continue;
    }
    const details=[r.personen+" Pers.", r.bereich==="draussen"?"Draußen":"Drinnen", r.anlass, "Code "+r.code, r.telefon!=="-"?r.telefon:null].filter(Boolean).join(" · ");
    html+='<div class="card row">'+
      '<div class="res-zeit">'+esc(r.zeit)+'</div>'+
      '<div class="res-info"><div class="n">'+esc(r.name)+'</div>'+
        '<small>'+esc(details)+'</small>'+
        (r.notiz?'<small class="notiz">„'+esc(r.notiz)+'“</small>':'')+
      '</div>'+
      '<span class="pill '+r.status+'">'+STATUS_LABEL[r.status]+'</span>'+
      '<div class="res-akt">'+
        (r.status==="offen"?'<button class="ok" data-st="bestaetigt" data-id="'+r.id+'">Bestätigen</button>':'')+
        (r.status!=="abgesagt"&&r.status!=="erledigt"?'<button class="no" data-st="abgesagt" data-id="'+r.id+'">Absagen</button>':'')+
        (r.status==="bestaetigt"?'<button data-st="erledigt" data-id="'+r.id+'">Erledigt</button>':'')+
        '<button data-reedit="'+r.id+'">Bearbeiten</button>'+
        '<button class="no" data-redel="'+r.id+'">Löschen</button>'+
      '</div></div>';
  }
  $("resList").innerHTML=html;
}
$("resDatum").addEventListener("change",()=>{ resModus="tag"; $("resHeuteBtn").classList.add("active"); $("resAlleBtn").classList.remove("active"); loadRes(); });
$("resHeuteBtn").addEventListener("click",()=>{ resModus="tag"; $("resDatum").value=heuteISO();
  $("resHeuteBtn").classList.add("active"); $("resAlleBtn").classList.remove("active"); loadRes(); });
$("resAlleBtn").addEventListener("click",()=>{ resModus="alle";
  $("resAlleBtn").classList.add("active"); $("resHeuteBtn").classList.remove("active"); loadRes(); });
$("resList").addEventListener("click",async e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.reedit){ resEditId=b.dataset.reedit; return loadRes(); }
  if(b.dataset.recancel!==undefined){ resEditId=null; return loadRes(); }
  if(b.dataset.redel){
    if(!confirm("Reservierung endgültig löschen? (Für eine Absage lieber „Absagen“ nutzen.)")) return;
    const r=await fetch("/api/team/reservierungen/"+b.dataset.redel,{method:"DELETE"});
    if(!r.ok){ alert("Löschen fehlgeschlagen"); }
    return loadRes();
  }
  if(b.dataset.resave){
    const alt=resRows.find(x=>x.id===b.dataset.resave)||{};
    const body={
      name:$("reName").value.trim(), telefon:$("reTelefon").value.trim(),
      email:alt.email, anlass:alt.anlass, bereich:$("reBereich").value,
      datum:$("reDatum").value, zeit:$("reZeit").value,
      personen:Number($("rePersonen").value), notiz:$("reNotiz").value.trim()
    };
    const r=await fetch("/api/team/reservierungen/"+b.dataset.resave,{method:"PUT",
      headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
    resEditId=null; return loadRes();
  }
  if(b.dataset.st){
    if(b.dataset.st==="abgesagt" && !confirm("Reservierung wirklich absagen?")) return;
    const r=await fetch("/api/team/reservierungen/"+b.dataset.id,{method:"PATCH",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({status:b.dataset.st})});
    if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
    loadRes();
  }
});

/* Kapazität (Admin): Gesamt ergibt sich automatisch, Puffer hält Plätze für Walk-ins frei. */
function kapRechnen(){
  const d=Number($("kapDrinnen").value)||0, a=Number($("kapDraussen").value)||0;
  const p=Math.min(90,Math.max(0,Number($("kapPuffer").value)||0));
  const on=(n)=>Math.floor(n*(1-p/100));
  $("kapRechnung").textContent=
    "Gesamt: "+(d+a)+" Plätze · online buchbar: "+on(d)+" drinnen + "+on(a)+" draußen = "
    +(on(d)+on(a))+" · für Walk-ins frei: "+((d+a)-(on(d)+on(a)));
}
["kapDrinnen","kapDraussen","kapPuffer"].forEach(id=>$(id).addEventListener("input",kapRechnen));
$("btnKap").addEventListener("click",async ()=>{
  const body={drinnen:Number($("kapDrinnen").value), draussen:Number($("kapDraussen").value),
    puffer:Number($("kapPuffer").value)};
  const r=await fetch("/api/kapazitaet",{method:"PUT",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  kapRechnen();
  loadRes();
});

/* Neue Reservierung (Telefon/Walk-in) */
$("btnResNeu").addEventListener("click",async ()=>{
  const body={
    name:$("rnName").value.trim(), telefon:$("rnTelefon").value.trim(),
    datum:$("rnDatum").value, zeit:$("rnZeit").value, bereich:$("rnBereich").value,
    personen:Number($("rnPersonen").value), notiz:$("rnNotiz").value.trim()
  };
  if(!body.name||!body.datum||!body.zeit||!body.personen){ alert("Name, Datum, Uhrzeit und Personen sind Pflicht"); return; }
  const r=await fetch("/api/team/reservierungen",{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  $("rnName").value=""; $("rnTelefon").value=""; $("rnNotiz").value="";
  loadRes();
});
$("resDatum").value=heuteISO();
$("rnDatum").value=heuteISO();
$("mzNeuDatum").value=heuteISO();

/* ===== VIEW 2: AUSWERTUNG ===== */
let curRange="today";
document.querySelectorAll(".range").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".range").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); curRange=b.dataset.r; loadReport();
}));
async function loadReport(){
  const r=ranges()[curRange];
  const rows=await fetch("/api/report?from="+r.from+"&to="+r.to).then(x=>x.json());
  rows.sort((a,b)=>b.totalMs-a.totalMs);
  const max=Math.max(1,...rows.map(x=>x.totalMs));
  const total=rows.reduce((s,x)=>s+x.totalMs,0);
  $("reportList").innerHTML = rows.length ? rows.map(x=>
    '<div class="card"><div class="row"><div class="nm">'+esc(x.name)+'<small>'+esc(x.role)+'</small></div>'+
    '<div class="dur">'+hhmm(x.totalMs)+'</div></div>'+
    '<div class="bar"><i style="width:'+(100*x.totalMs/max).toFixed(1)+'%"></i></div></div>').join("")
    : '<div class="empty">Keine Zeiten in diesem Zeitraum</div>';
  $("reportRange").textContent=r.label;
  $("reportTotal").textContent="Gesamt: "+hhmm(total);
}

/* ===== VIEW: MEINE ZEITEN (lesen) / ZEITEN (Admin-CRUD) ===== */
let mzRange="week", mzDaten=[], mzWerId=null;
const dtLocal=ts=>{ const d=new Date(ts);
  return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate())+"T"+p2(d.getHours())+":"+p2(d.getMinutes()); };
const mzTag=ts=>{ const d=new Date(ts);
  return ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+", "+p2(d.getDate())+"."+p2(d.getMonth()+1)+"."; };
const uhr=ts=>{ const d=new Date(ts); return p2(d.getHours())+":"+p2(d.getMinutes()); };

document.querySelectorAll("[data-mzr]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("[data-mzr]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); mzRange=b.dataset.mzr; loadMz();
}));
$("mzWer").addEventListener("change",()=>{ mzWerId=$("mzWer").value; loadMz(); });

async function mzWerFuellen(){
  if($("mzWer").options.length) return;
  const list=await fetch("/api/mitarbeiter").then(x=>x.json());
  $("mzWer").innerHTML=list.map(m=>'<option value="'+m.id+'"'+(m.id===ME.id?" selected":"")+'>'+esc(m.name)+'</option>').join("");
  mzWerId=ME.id;
}

async function loadMz(){
  const admin=cap("zeiten.admin");
  $("mzTitel").textContent=admin?"Zeiten":"Meine Zeiten";
  $("mzHinweis").style.display=admin?"none":"";
  $("mzAdminWerkzeuge").style.display=admin?"":"none";
  $("mzWer").style.display=admin?"":"none";
  if(admin){ await mzWerFuellen(); }

  const r=ranges()[mzRange];
  const url=admin
    ? "/api/zeiten/"+encodeURIComponent(mzWerId||ME.id)+"?from="+r.from+"&to="+r.to
    : "/api/meine-zeiten?from="+r.from+"&to="+r.to;
  mzDaten=await fetch(url).then(x=>x.json());
  mzDaten.sort((a,b)=>b.start-a.start);

  if(!mzDaten.length){
    $("mzList").innerHTML='<div class="empty">Keine Zeiten in diesem Zeitraum</div>';
  }else if(admin){
    // Das Datum steht fest – korrigiert werden nur die Uhrzeiten.
    $("mzList").innerHTML=mzDaten.map((s,i)=>
      '<div class="card row">'+
        '<div class="mz-datum">'+mzTag(s.start)+'</div>'+
        '<div class="mz-zeiten">'+
          '<input type="time" data-mzs="'+i+'" value="'+uhr(s.start)+'">'+
          '<span class="bis">bis</span>'+
          (s.end!=null
            ? '<input type="time" data-mze="'+i+'" value="'+uhr(s.end)+'">'
            : '<span class="mz-offen">läuft noch</span>')+
        '</div>'+
        '<div class="dur">'+hhmm((s.end??Date.now())-s.start)+'</div>'+
        '<div class="res-akt">'+
          '<button class="ok" data-mzsave="'+i+'">Speichern</button>'+
          '<button class="no" data-mzdel="'+i+'">Löschen</button>'+
        '</div>'+
      '</div>').join("");
  }else{
    $("mzList").innerHTML=mzDaten.map(s=>
      '<div class="card row">'+
        '<div class="mz-datum">'+mzTag(s.start)+'</div>'+
        '<div class="mz-zeiten"><span>'+uhr(s.start)+'</span><span class="bis">bis</span>'+
          (s.end!=null?'<span>'+uhr(s.end)+'</span>':'<span class="mz-offen">läuft noch</span>')+
        '</div>'+
        '<div class="dur">'+hhmm((s.end??Date.now())-s.start)+'</div>'+
      '</div>').join("");
  }
  const total=mzDaten.reduce((s,x)=>s+((x.end??Date.now())-x.start),0);
  $("mzRangeLbl").textContent=ranges()[mzRange].label;
  $("mzTotal").textContent="Gesamt: "+hhmm(total);
}

$("mzList").addEventListener("click",async e=>{
  const b=e.target.closest("button"); if(!b) return;
  const i=Number(b.dataset.mzsave ?? b.dataset.mzdel);
  const s=mzDaten[i]; if(!s) return;
  if(b.dataset.mzdel!=null){
    if(!confirm("Diese Zeit wirklich löschen?")) return;
    const r=await fetch("/api/zeiten/"+encodeURIComponent(mzWerId||ME.id),{method:"DELETE",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({inId:s.inId,outId:s.outId})});
    if(!r.ok) alert("Löschen fehlgeschlagen");
    return loadMz();
  }
  // Uhrzeit aufs bestehende Datum der Sitzung legen; über Mitternacht -> Folgetag.
  const anTag=(basisTs,hhmmWert)=>{ const d=new Date(basisTs); const [h,m]=hhmmWert.split(":").map(Number);
    d.setHours(h,m,0,0); return d.getTime(); };
  const startEl=document.querySelector('[data-mzs="'+i+'"]');
  const endeEl=document.querySelector('[data-mze="'+i+'"]');
  if(!startEl.value){ alert("Bitte eine Start-Uhrzeit angeben."); return; }
  const start=anTag(s.start,startEl.value);
  let end=null;
  if(endeEl){
    if(!endeEl.value){ alert("Bitte eine End-Uhrzeit angeben."); return; }
    end=anTag(s.start,endeEl.value);
    if(end<=start) end+=86400000; // Schicht über Mitternacht
  }
  const r=await fetch("/api/zeiten/"+encodeURIComponent(mzWerId||ME.id),{method:"PUT",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({inId:s.inId,outId:s.outId,start,end})});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  loadMz();
});

$("btnMzNeu").addEventListener("click",async ()=>{
  const datum=$("mzNeuDatum").value, von=$("mzNeuStart").value, bis=$("mzNeuEnde").value;
  if(!datum||!von||!bis){ alert("Bitte Datum, Start und Ende angeben."); return; }
  const start=new Date(datum+"T"+von).getTime();
  let end=new Date(datum+"T"+bis).getTime();
  if(end<=start) end+=86400000; // Schicht über Mitternacht
  const r=await fetch("/api/zeiten/"+encodeURIComponent(mzWerId||ME.id),{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({start,end})});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  $("mzNeuStart").value=""; $("mzNeuEnde").value="";
  loadMz();
});

/* ===== VIEW: WEBSITE-KARTE (Admin pflegt, sofort live) ===== */
let KT={kapitel:[],gruppen:[],positionen:[]}, ktKapitel=null, ktPosEdit=null, ktDrag=null;

async function loadKarte(){
  KT=await fetch("/api/karte").then(x=>x.json());
  if(!ktKapitel) ktKapitel=KT.kapitel[0].id;
  $("ktKapitel").innerHTML=KT.kapitel.map(k=>
    '<div class="range'+(k.id===ktKapitel?" active":"")+'" data-ktk="'+k.id+'">'+esc(k.titel)+'</div>').join("");
  renderKarte();
}

function renderKarte(){
  const gruppen=KT.gruppen.filter(g=>g.kapitel===ktKapitel);
  $("ktListe").innerHTML=gruppen.length?gruppen.map(g=>{
    const posn=KT.positionen.filter(p=>p.gruppe_id===g.id);
    return '<div class="card regel-karte" data-ktgid="'+g.id+'">'+
      '<div class="edit-zeile">'+
        '<span class="regel-griff" draggable="true" data-ktggriff="'+g.id+'" title="Gruppe sortieren">⠿</span>'+
        '<input data-ktgtitel="'+g.id+'" value="'+esc(g.titel)+'" style="flex:1; min-width:160px; font-weight:600">'+
        '<input data-ktgspalten="'+g.id+'" value="'+esc(g.spalten||"")+'" placeholder="Preisspalten (|)" style="width:150px">'+
        '<input data-ktgfuss="'+g.id+'" value="'+esc(g.fussnote||"")+'" placeholder="Fußnote" style="flex:1; min-width:140px">'+
        '<div class="res-akt"><button class="ok" data-ktgsave="'+g.id+'">Speichern</button>'+
        '<button class="no" data-ktgdel="'+g.id+'">Löschen</button></div>'+
      '</div>'+
      posn.map(p=>ktPosZeile(p)).join("")+
      '<div class="edit-zeile" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--line)">'+
        '<input data-ktneun="'+g.id+'" placeholder="Neue Position …" style="flex:1; min-width:160px">'+
        '<input data-ktneup="'+g.id+'" placeholder="Preis(e)" style="width:110px">'+
        '<button data-ktposneu="'+g.id+'" style="border:1px solid var(--line); background:var(--card); border-radius:9px; padding:8px 12px; cursor:pointer; font-family:var(--sans); font-size:12px;">+ Position</button>'+
      '</div>'+
    '</div>';
  }).join(""):'<div class="empty">Noch keine Gruppen in diesem Kapitel</div>';
  ktDnD();
}

function ktPosZeile(p){
  const offen=ktPosEdit===p.id;
  return '<div class="kt-pos'+(p.aktiv?"":" kt-aus")+'" data-ktpid="'+p.id+'">'+
    '<div class="edit-zeile" style="margin-bottom:'+(offen?'6px':'4px')+'">'+
      '<span class="regel-griff" draggable="true" data-ktpgriff="'+p.id+'" title="Position sortieren">⠿</span>'+
      '<input data-ktpname="'+p.id+'" value="'+esc(p.name)+'" style="flex:1; min-width:160px">'+
      '<input data-ktppreise="'+p.id+'" value="'+esc(p.preise||"")+'" placeholder="Preis(e)" style="width:100px">'+
      '<label style="font-size:11px; color:var(--grey); display:flex; align-items:center; gap:4px">'+
        '<input type="checkbox" data-ktpaktiv="'+p.id+'"'+(p.aktiv?" checked":"")+'> aktiv</label>'+
      '<div class="res-akt">'+
        '<button class="ok" data-ktpsave="'+p.id+'">Speichern</button>'+
        '<button data-ktpmehr="'+p.id+'">'+(offen?"Weniger":"Details")+'</button>'+
        '<button class="no" data-ktpdel="'+p.id+'">×</button>'+
      '</div>'+
    '</div>'+
    (offen?'<div class="edit-zeile" style="margin:0 0 10px 26px">'+
      '<input data-ktptext="'+p.id+'" value="'+esc(p.text||"")+'" placeholder="Beschreibung" style="flex:1; min-width:220px">'+
      '<input data-ktpoption="'+p.id+'" value="'+esc(p.option||"")+'" placeholder="Option (z. B. vegan, ohne Feta − 2,5 €)" style="flex:1; min-width:180px">'+
      ["v","vg","gf"].map(t=>'<label style="font-size:11px; color:var(--grey)"><input type="checkbox" data-ktptag="'+p.id+'" value="'+t+'"'+((p.tags||"").split(",").includes(t)?" checked":"")+'> '+t.toUpperCase()+'</label>').join("")+
      '<label style="font-size:11px; color:var(--grey)"><input type="checkbox" data-ktpstern="'+p.id+'"'+(p.stern?" checked":"")+'> * Wild</label>'+
    '</div>':'')+
  '</div>';
}

function ktPosLesen(p){
  const id=p.id;
  const val=(sel)=>{const el=document.querySelector('[data-'+sel+'="'+id+'"]'); return el?el.value.trim():null;};
  const chk=(sel)=>{const el=document.querySelector('[data-'+sel+'="'+id+'"]'); return el?el.checked:false;};
  const tags=[...document.querySelectorAll('[data-ktptag="'+id+'"]')].filter(c=>c.checked).map(c=>c.value).join(",");
  return {
    gruppe_id:p.gruppe_id,
    name:val("ktpname"), preise:val("ktppreise"),
    text:ktPosEdit===id?val("ktptext"):p.text,
    option:ktPosEdit===id?val("ktpoption"):p.option,
    tags:ktPosEdit===id?tags:(p.tags||""),
    stern:ktPosEdit===id?(chk("ktpstern")?1:0):p.stern,
    aktiv:chk("ktpaktiv")?1:0,
  };
}

function ktDnD(){
  const wire=(griffSel,zielAttr,reihenfolgeUrl,liste,filter)=>{
    document.querySelectorAll(griffSel).forEach(griff=>{
      griff.addEventListener("dragstart",e=>{
        ktDrag={id:griff.dataset.ktggriff||griff.dataset.ktpgriff, art:zielAttr};
        e.dataTransfer.setData("text/plain",ktDrag.id);
      });
      griff.addEventListener("dragend",()=>{ ktDrag=null;
        document.querySelectorAll("[data-ktgid],[data-ktpid]").forEach(k=>k.classList.remove("ueber-oben","ueber-unten")); });
    });
    document.querySelectorAll("["+zielAttr+"]").forEach(ziel=>{
      ziel.addEventListener("dragover",e=>{
        if(!ktDrag||ktDrag.art!==zielAttr) return;
        const zid=ziel.getAttribute(zielAttr);
        if(zid===ktDrag.id) return;
        e.preventDefault();
        const oben=e.offsetY<ziel.offsetHeight/2;
        ziel.classList.toggle("ueber-oben",oben); ziel.classList.toggle("ueber-unten",!oben);
      });
      ziel.addEventListener("dragleave",()=>ziel.classList.remove("ueber-oben","ueber-unten"));
      ziel.addEventListener("drop",async e=>{
        e.preventDefault();
        const oben=ziel.classList.contains("ueber-oben");
        ziel.classList.remove("ueber-oben","ueber-unten");
        if(!ktDrag||ktDrag.art!==zielAttr) return;
        const zid=ziel.getAttribute(zielAttr);
        const teil=liste().filter(filter);
        if(!teil.some(x=>x.id===ktDrag.id)) return; // nur innerhalb desselben Containers
        const ids=teil.map(x=>x.id).filter(i=>i!==ktDrag.id);
        const zi=ids.indexOf(zid);
        ids.splice(oben?zi:zi+1,0,ktDrag.id);
        await fetch(reihenfolgeUrl,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
        loadKarte();
      });
    });
  };
  wire("[data-ktggriff]","data-ktgid","/api/karte/gruppen-reihenfolge",
    ()=>KT.gruppen,g=>g.kapitel===ktKapitel);
  document.querySelectorAll("[data-ktgid]").forEach(gk=>{
    const gid=gk.dataset.ktgid;
    wire('[data-ktpgriff]',"data-ktpid","/api/karte/positionen-reihenfolge",
      ()=>KT.positionen,p=>p.gruppe_id===gid);
  });
}

document.getElementById("v-karte").addEventListener("click",async e=>{
  const chip=e.target.closest("[data-ktk]");
  if(chip){ ktKapitel=chip.dataset.ktk; ktPosEdit=null; return loadKarte(); }
  const b=e.target.closest("button"); if(!b) return;
  const d=b.dataset;
  const api=async (url,method,body)=>{
    const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},
      body:body?JSON.stringify(body):undefined});
    if(!r.ok && r.status!==204){ alert(((await r.json()).fehler)||"Fehler"); return false; }
    return true;
  };
  if(d.ktgsave){
    const g=KT.gruppen.find(x=>x.id===d.ktgsave);
    if(await api("/api/karte/gruppen/"+g.id,"PUT",{kapitel:g.kapitel,
      titel:document.querySelector('[data-ktgtitel="'+g.id+'"]').value.trim(),
      spalten:document.querySelector('[data-ktgspalten="'+g.id+'"]').value.trim(),
      fussnote:document.querySelector('[data-ktgfuss="'+g.id+'"]').value.trim()})) loadKarte();
    return;
  }
  if(d.ktgdel){
    if(!confirm("Gruppe samt allen Positionen löschen?")) return;
    if(await api("/api/karte/gruppen/"+d.ktgdel,"DELETE")) loadKarte();
    return;
  }
  if(d.ktposneu){
    const name=document.querySelector('[data-ktneun="'+d.ktposneu+'"]').value.trim();
    const preise=document.querySelector('[data-ktneup="'+d.ktposneu+'"]').value.trim();
    if(!name){ alert("Bitte einen Namen angeben."); return; }
    if(await api("/api/karte/positionen","POST",{gruppe_id:d.ktposneu,name,preise})) loadKarte();
    return;
  }
  if(d.ktpmehr){ ktPosEdit=ktPosEdit===d.ktpmehr?null:d.ktpmehr; return renderKarte(); }
  if(d.ktpsave){
    const p=KT.positionen.find(x=>x.id===d.ktpsave);
    if(await api("/api/karte/positionen/"+p.id,"PUT",ktPosLesen(p))){ ktPosEdit=null; loadKarte(); }
    return;
  }
  if(d.ktpdel){
    if(!confirm("Position löschen?")) return;
    if(await api("/api/karte/positionen/"+d.ktpdel,"DELETE")) loadKarte();
    return;
  }
});
$("btnKtGruppe").addEventListener("click",async ()=>{
  const titel=$("ktNeuTitel").value.trim();
  if(!titel){ alert("Bitte einen Gruppentitel angeben."); return; }
  const r=await fetch("/api/karte/gruppen",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({kapitel:ktKapitel,titel,spalten:$("ktNeuSpalten").value.trim()})});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  $("ktNeuTitel").value=""; $("ktNeuSpalten").value="";
  loadKarte();
});

/* ===== LIVE: WebSocket – der Server pusht, kein Polling ===== */
let liveWs=null, liveWarte=1000, liveWarVerbunden=false;
function liveVerbinden(){
  if(liveWs&&(liveWs.readyState===0||liveWs.readyState===1)) return;
  const ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+"/ws");
  liveWs=ws;
  ws.onopen=()=>{ if(liveWarVerbunden) liveNachziehen(); liveWarVerbunden=true; liveWarte=1000; };
  ws.onmessage=e=>{ let d; try{ d=JSON.parse(e.data); }catch(x){ return; } liveEreignis(d); };
  ws.onclose=()=>{ liveWs=null; if(!ME) return; setTimeout(liveVerbinden,liveWarte); liveWarte=Math.min(liveWarte*2,30000); };
  ws.onerror=()=>{ try{ ws.close(); }catch(x){} };
}
function liveSenden(obj){ if(liveWs&&liveWs.readyState===1) liveWs.send(JSON.stringify(obj)); }
// Nach einer Unterbrechung: Stand nachziehen, was in der Pause passiert ist.
function liveNachziehen(){ if(activeView) aktualisiereView(activeView); chatWidget.nachziehen(); }
const VIEW_LADER={heute:()=>loadHeute(),reservierungen:()=>loadRes(),"meine-schichten":()=>loadMs(),"meine-zeiten":()=>loadMz(),
  schichtplan:()=>loadSp(),auswertung:()=>loadReport(),ablaeufe:()=>loadAblaeufe(),team:()=>loadTeam(),rollen:()=>ladeRollen(),karte:()=>loadKarte()};
function aktualisiereView(v){ const f=VIEW_LADER[v]; if(f) f(); }
function liveEreignis(d){
  switch(d.typ){
    case "chat.nachricht": case "chat.geloescht": case "chat.tippt": return chatWidget.ereignis(d);
    case "reservierungen": if(activeView==="reservierungen"||activeView==="heute") aktualisiereView(activeView); return;
    case "zeiten": if(["heute","meine-zeiten","auswertung"].includes(activeView)) aktualisiereView(activeView); return;
    case "schichten": if(["meine-schichten","schichtplan"].includes(activeView)) aktualisiereView(activeView); return;
    case "ablauf": if(activeView==="ablaeufe") aktualisiereView(activeView); return;
    case "team": if(["team","rollen","schichtplan"].includes(activeView)) aktualisiereView(activeView); chatWidget.ereignis(d); return;
    case "karte": if(activeView==="karte") aktualisiereView(activeView); return;
  }
}

/* ===== VIEW: MEINE SCHICHTEN (Mitarbeiter, lesend) ===== */
async function loadMs(){
  const liste=await fetch("/api/meine-schichten").then(x=>x.json());
  if(!liste.length){
    $("msList").innerHTML='<div class="empty">Aktuell bist du für keine Schichten eingeplant.</div>';
    return;
  }
  const heute=heuteISO();
  const jetzt=new Date(); const jetztHM=p2(jetzt.getHours())+":"+p2(jetzt.getMinutes());
  $("msList").innerHTML=liste.map(s=>{
    const laeuft=s.datum===heute && s.von<=jetztHM && jetztHM<=s.bis;
    return '<div class="card row'+(laeuft?" ms-aktiv":"")+'">'+
      '<div class="mz-datum" style="min-width:150px">'+(s.datum===heute?"Heute":datumSchoen(s.datum))+'</div>'+
      '<div class="res-info"><div class="n">'+esc(s.rolle)+
        (laeuft?' <span class="tag in">Läuft jetzt</span>':'')+'</div>'+
        (s.notiz?'<small class="notiz">„'+esc(s.notiz)+'“</small>':'')+'</div>'+
      '<div class="dur" style="min-width:130px">'+esc(s.von)+' – '+esc(s.bis)+'</div>'+
    '</div>';
  }).join("");
}

/* ===== VIEW: SCHICHTPLAN (Admin: Woche, Vorlage je Tag, Drag & Drop nach Rolle) ===== */
let spTeam=[], spSlots=[];
let spDrag=null; // {mid, role, admin} der gerade gezogenen Person
const SP_TAGE=["Mo","Di","Mi","Do","Fr","Sa","So"];

function spMontag(){
  const [y,m,t]=($("spDatum").value||heuteISO()).split("-").map(Number);
  const d=new Date(y,m-1,t);
  d.setDate(d.getDate()-((d.getDay()+6)%7)); // Montag der Woche
  return d;
}
const spIso=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
function spTage(){ const mo=spMontag();
  return Array.from({length:7},(_,i)=>{const d=new Date(mo); d.setDate(d.getDate()+i); return spIso(d);}); }
const spKurz=iso=>{ const [,m,t]=iso.split("-").map(Number); return p2(t)+"."+p2(m)+"."; };
const passtAuf=(m,rolle)=>(m.caps||[]).some(c=>c==="*"||c==="schichtplan") || m.role.trim().toLowerCase()===rolle.trim().toLowerCase();

async function loadSp(){
  if(!$("spDatum").value) $("spDatum").value=heuteISO();
  if(!$("rgRolle").options.length) await ladeRollen();
  await loadRegeln();
  const tage=spTage();
  $("spWocheLbl").textContent=spKurz(tage[0])+" – "+spKurz(tage[6])+tage[6].slice(0,4).replace(/^/," ");
  if(!spTeam.length) spTeam=await fetch("/api/mitarbeiter").then(x=>x.json());
  spSlots=await fetch("/api/schichten?von="+tage[0]+"&bis="+tage[6]).then(x=>x.json());

  // Rechte Leiste: Chips nach Rolle gruppiert.
  const gruppen={};
  for(const m of spTeam) (gruppen[m.role]=gruppen[m.role]||[]).push(m);
  $("spChips").innerHTML=Object.entries(gruppen).map(([rolle,leute])=>
    '<div class="sp-gruppe">'+esc(rolle)+'</div>'+
    leute.map(m=>'<span class="sp-chip" draggable="true" data-mid="'+m.id+'" data-role="'+esc(m.role)+'" data-admin="'+((m.caps||[]).some(c=>c==="*"||c==="schichtplan")?1:0)+'">'+esc(m.name)+'</span>').join("")
  ).join("") || '<span class="empty">Kein Team angelegt</span>';

  // Wochenraster – gleiche Schichten (Rolle + Zeit) werden zu einer Karte mit mehreren Plätzen gruppiert.
  const heute=heuteISO();
  $("spWoche").innerHTML=spTage().map((datum,i)=>{
    const slots=spSlots.filter(s=>s.datum===datum);
    const gruppen=new Map();
    for(const s of slots){
      const key=s.rolle+"|"+s.von+"|"+s.bis;
      if(!gruppen.has(key)) gruppen.set(key,[]);
      gruppen.get(key).push(s);
    }
    return '<div class="sp-tag'+(datum===heute?" heute":"")+'">'+
      '<div class="sp-tag-kopf"><span class="t">'+SP_TAGE[i]+' '+spKurz(datum)+'</span></div>'+
      (gruppen.size?[...gruppen.values()].map(spMini).join(""):'<div class="sp-leer">keine Schichten</div>')+
      '</div>';
  }).join("");

  spDnD();
}

/** Eine Schicht-Karte: Kopf (Rolle, Zeit) + ein Platz je Slot der Gruppe. */
function spMini(gruppe){
  const s=gruppe[0];
  return '<div class="sp-mini" data-rolle="'+esc(s.rolle)+'">'+
    '<div class="sp-mini-kopf"><span class="r">'+esc(s.rolle)+(gruppe.length>1?' <small style="color:var(--clay)">×'+gruppe.length+'</small>':'')+'</span></div>'+
    '<div class="z">'+esc(s.von)+' – '+esc(s.bis)+'</div>'+
    gruppe.map(slot=>
      '<div class="sp-platz" data-slot="'+slot.id+'" data-rolle="'+esc(slot.rolle)+'">'+
        (slot.mitarbeiter_id
          ? '<span class="sp-zug"><span>'+esc(slot.mitarbeiter_name||"?")+'</span>'+
            '<button data-spfrei="'+slot.id+'" title="Zuweisung lösen">×</button></span>'
          : '<div class="sp-frei">offen – hierher ziehen</div>')+
      '</div>').join("")+
  '</div>';
}

function spDnD(){
  document.querySelectorAll(".sp-chip[draggable]").forEach(chip=>{
    chip.addEventListener("dragstart",e=>{
      spDrag={mid:chip.dataset.mid, role:chip.dataset.role, admin:chip.dataset.admin==="1"};
      e.dataTransfer.setData("text/plain",chip.dataset.mid);
      e.dataTransfer.effectAllowed="copy";
      chip.classList.add("dragging");
    });
    chip.addEventListener("dragend",()=>{ spDrag=null; chip.classList.remove("dragging"); });
  });
  document.querySelectorAll(".sp-platz").forEach(platz=>{
    // Besetzte Plätze sind keine Dropzone – erst „ד lösen, dann neu besetzen.
    if(!platz.querySelector(".sp-frei")) return;
    const erlaubt=()=>spDrag && (spDrag.admin || spDrag.role.trim().toLowerCase()===platz.dataset.rolle.trim().toLowerCase());
    platz.addEventListener("dragover",e=>{
      if(!erlaubt()) return; // kein preventDefault -> Browser verbietet den Drop
      e.preventDefault(); e.dataTransfer.dropEffect="copy"; platz.classList.add("ueber");
    });
    platz.addEventListener("dragleave",()=>platz.classList.remove("ueber"));
    platz.addEventListener("drop",async e=>{
      e.preventDefault(); platz.classList.remove("ueber");
      const mid=e.dataTransfer.getData("text/plain");
      if(mid) await spZuweisen(platz.dataset.slot,mid);
    });
  });
}

async function spZuweisen(slotId,mid){
  const r=await fetch("/api/schichten/"+slotId,{method:"PATCH",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({mitarbeiter_id:mid})});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  loadSp();
}

$("spDatum").addEventListener("change",loadSp);
$("spZurueck").addEventListener("click",()=>{ const d=spMontag(); d.setDate(d.getDate()-7); $("spDatum").value=spIso(d); loadSp(); });
$("spVor").addEventListener("click",()=>{ const d=spMontag(); d.setDate(d.getDate()+7); $("spDatum").value=spIso(d); loadSp(); });

$("spWoche").addEventListener("click",async e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.spfrei){ return spZuweisen(b.dataset.spfrei,null); }
});
/* ---- Wiederkehrende Schicht-Regeln (Editor) ---- */
let SP_REGELN=[];
const TAG_REIHE=[1,2,3,4,5,6,0]; // Mo … So

function tagToggles(gewaehlt,attr){
  return TAG_REIHE.map(t=>'<button type="button" class="tag-toggle" '+attr+' data-t="'+t+
    '" aria-pressed="'+gewaehlt.includes(t)+'">'+SP_TAGE[(t+6)%7]+'</button>').join("");
}
const rhythmusWahl=(sel,attr)=>'<select class="rowinput" '+attr+' style="width:150px">'+
  '<option value="woechentlich"'+(sel==="woechentlich"?" selected":"")+'>jede Woche</option>'+
  '<option value="zweiwoechentlich"'+(sel==="zweiwoechentlich"?" selected":"")+'>alle 2 Wochen</option></select>';

async function loadRegeln(){
  SP_REGELN=await fetch("/api/schicht-regeln").then(x=>x.json());
  const rollenOpt=(sel)=>ROLLEN.map(r=>'<option'+(r===sel?" selected":"")+'>'+esc(r)+'</option>').join("");
  if(!$("rgRolle").options.length) $("rgRolle").innerHTML=rollenOpt("Service");
  if(!$("rgTage").children.length) $("rgTage").innerHTML=tagToggles([0,1,3,4,5,6],'data-rgneu');
  $("spRegeln").innerHTML=SP_REGELN.length?SP_REGELN.map((r,i)=>{
    const tage=r.tage.split(",").map(Number);
    return '<div class="card regel-karte'+(r.aktiv?"":" inaktiv")+'" data-rid="'+r.id+'" style="'+(r.aktiv?"":"opacity:.55")+'">'+
      '<div class="regel-zeile">'+
        '<span class="regel-griff" draggable="true" data-rgriff="'+r.id+'" title="Ziehen zum Sortieren – die Reihenfolge gilt auch im Wochenplan">⠿</span>'+
        '<select class="rowinput" data-rrolle="'+i+'" style="width:130px">'+rollenOpt(r.rolle)+'</select>'+
        '<input type="time" data-rvon="'+i+'" value="'+esc(r.von)+'">'+
        '<span style="color:var(--grey); font-size:13px">bis</span>'+
        '<input type="time" data-rbis="'+i+'" value="'+esc(r.bis)+'">'+
        '<input type="number" class="rowinput pn" data-ranzahl="'+i+'" value="'+r.anzahl+'" min="1" max="10" title="Anzahl gleicher Schichten">'+
        rhythmusWahl(r.rhythmus,'data-rrhythmus="'+i+'"')+
        '<input type="date" data-rstart="'+i+'" value="'+esc(r.start||"")+'" style="'+(r.rhythmus==="zweiwoechentlich"?"":"display:none")+'">'+
        '<label class="inaktiv-lbl"><input type="checkbox" data-raktiv="'+i+'"'+(r.aktiv?" checked":"")+'> aktiv</label>'+
      '</div>'+
      '<div class="regel-tage">'+tagToggles(tage,'data-rtage="'+i+'"')+'</div>'+
      '<div class="res-akt" style="margin-top:10px">'+
        '<button class="ok" data-rsave="'+i+'">Speichern</button>'+
        '<button class="no" data-rdel="'+r.id+'">Löschen</button>'+
      '</div>'+
    '</div>';
  }).join(""):'<div class="empty">Noch keine Regeln – leg unten die erste an.</div>';
  regelnDnD();
}

/* Vorlage per Drag & Drop sortieren – die Reihenfolge bestimmt auch den Wochenplan. */
let regelDragId=null;
function regelnDnD(){
  document.querySelectorAll(".regel-griff[data-rgriff]").forEach(griff=>{
    griff.addEventListener("dragstart",e=>{
      regelDragId=griff.dataset.rgriff;
      e.dataTransfer.effectAllowed="move";
      e.dataTransfer.setData("text/plain",regelDragId);
      griff.closest(".regel-karte").classList.add("zieh");
    });
    griff.addEventListener("dragend",()=>{
      regelDragId=null;
      document.querySelectorAll(".regel-karte").forEach(k=>k.classList.remove("zieh","ueber-oben","ueber-unten"));
    });
  });
  document.querySelectorAll("#spRegeln .regel-karte[data-rid]").forEach(karte=>{
    karte.addEventListener("dragover",e=>{
      if(!regelDragId || karte.dataset.rid===regelDragId) return;
      e.preventDefault(); e.dataTransfer.dropEffect="move";
      const oben=e.offsetY < karte.offsetHeight/2;
      karte.classList.toggle("ueber-oben",oben);
      karte.classList.toggle("ueber-unten",!oben);
    });
    karte.addEventListener("dragleave",()=>karte.classList.remove("ueber-oben","ueber-unten"));
    karte.addEventListener("drop",async e=>{
      e.preventDefault();
      const zielOben=karte.classList.contains("ueber-oben");
      karte.classList.remove("ueber-oben","ueber-unten");
      if(!regelDragId || karte.dataset.rid===regelDragId) return;
      const ids=SP_REGELN.map(r=>r.id).filter(id=>id!==regelDragId);
      const ziel=ids.indexOf(karte.dataset.rid);
      ids.splice(zielOben?ziel:ziel+1,0,regelDragId);
      const r=await fetch("/api/schicht-regeln-reihenfolge",{method:"PUT",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
      if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
      loadSp(); // Regeln UND Wochenplan neu – die Reihenfolge gilt für beide
    });
  });
}

const toggleTage=(container)=>[...container.querySelectorAll(".tag-toggle")]
  .filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>Number(b.dataset.t));

document.getElementById("v-schichtplan").addEventListener("click",async e=>{
  const t=e.target.closest(".tag-toggle");
  if(t){ t.setAttribute("aria-pressed",String(t.getAttribute("aria-pressed")!=="true")); return; }
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.rdel){
    if(!confirm("Regel löschen? Bereits erzeugte Schichten bleiben bestehen.")) return;
    await fetch("/api/schicht-regeln/"+b.dataset.rdel,{method:"DELETE"});
    return loadRegeln();
  }
  if(b.dataset.rsave!=null){
    const i=b.dataset.rsave, r=SP_REGELN[Number(i)];
    const karte=b.closest(".regel-karte");
    const body={
      rolle:karte.querySelector('[data-rrolle="'+i+'"]').value,
      von:karte.querySelector('[data-rvon="'+i+'"]').value,
      bis:karte.querySelector('[data-rbis="'+i+'"]').value,
      anzahl:Number(karte.querySelector('[data-ranzahl="'+i+'"]').value),
      rhythmus:karte.querySelector('[data-rrhythmus="'+i+'"]').value,
      start:karte.querySelector('[data-rstart="'+i+'"]').value||null,
      tage:toggleTage(karte.querySelector(".regel-tage")),
      aktiv:karte.querySelector('[data-raktiv="'+i+'"]').checked?1:0,
    };
    const res_=await fetch("/api/schicht-regeln/"+r.id,{method:"PUT",
      headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res_.ok){ alert((await res_.json()).fehler||"Fehler"); return; }
    return loadRegeln();
  }
});
document.getElementById("v-schichtplan").addEventListener("change",e=>{
  const sel=e.target.closest("[data-rrhythmus]");
  if(sel){ const i=sel.dataset.rrhythmus;
    const start=sel.closest(".regel-zeile").querySelector('[data-rstart="'+i+'"]');
    if(start) start.style.display=sel.value==="zweiwoechentlich"?"":"none"; }
  if(e.target.id==="rgRhythmus") $("rgStart").style.display=e.target.value==="zweiwoechentlich"?"":"none";
});
$("btnRegelNeu").addEventListener("click",async ()=>{
  const body={
    rolle:$("rgRolle").value, von:$("rgVon").value, bis:$("rgBis").value,
    anzahl:Number($("rgAnzahl").value), rhythmus:$("rgRhythmus").value,
    start:$("rgStart").value||null, tage:toggleTage($("rgTage")),
  };
  const r=await fetch("/api/schicht-regeln",{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  loadRegeln();
});


/* ===== VIEW 3: TEAM (CRUD) + Rollen-Katalog ===== */
let editId=null, ROLLEN=[];

let ROLLEN_VOLL=[], CAP_KATALOG={};
async function ladeRollen(){
  const d=await fetch("/api/rollen").then(x=>x.json());
  ROLLEN_VOLL=d.rollen; CAP_KATALOG=d.katalog;
  ROLLEN=ROLLEN_VOLL.map(r=>r.name);
  const optionen=(gewaehlt)=>ROLLEN.map(r=>'<option'+(r===gewaehlt?" selected":"")+'>'+esc(r)+'</option>').join("");
  $("newRole").innerHTML=optionen("Service");
  // Rollen-Editor: pro Rolle ein Bündel aus Fähigkeits-Chips.
  $("rollenListe").innerHTML=ROLLEN_VOLL.map(r=>{
    const alles=r.caps.includes("*");
    const chip=(key,label,an)=>'<button type="button" class="tag-toggle cap-toggle" data-capkey="'+esc(key)+'" aria-pressed="'+an+'">'+esc(label)+'</button>';
    return '<div class="card regel-karte rolle-karte" data-rolle="'+esc(r.name)+'">'+
      '<div class="edit-zeile" style="justify-content:space-between">'+
        '<b style="font-family:var(--serif); font-size:18px; color:var(--wald)">'+esc(r.name)+'</b>'+
        '<div class="res-akt"><button class="ok" data-rolsave="'+esc(r.name)+'">Speichern</button>'+
        '<button class="no" data-rolledel="'+esc(r.name)+'">Löschen</button></div>'+
      '</div>'+
      '<div class="regel-tage">'+chip("*","Alles (Inhaber)",alles)+
        Object.entries(CAP_KATALOG).map(([k,l])=>chip(k,l,alles||r.caps.includes(k))).join("")+'</div>'+
    '</div>';
  }).join("")||'<div class="empty">Noch keine Rollen</div>';
  return optionen;
}

async function loadTeam(){
  const optionen=await ladeRollen();
  const list=await fetch("/api/mitarbeiter").then(x=>x.json());
  $("teamList").innerHTML = list.length ? list.map(m=>{
    if(m.id===editId){
      return '<div class="card row">'+
        '<input class="rowinput nm" id="eVorname" value="'+esc(m.vorname||"")+'" placeholder="Vorname">'+
        '<input class="rowinput nm" id="eNachname" value="'+esc(m.nachname||"")+'" placeholder="Nachname">'+
        '<select class="rowinput rl" id="eRole">'+optionen(m.role)+'</select>'+
        '<button class="iconbtn edit" data-save="'+m.id+'">Speichern</button>'+
        '<button class="iconbtn del" data-cancel>Abbrechen</button></div>';
    }
    const voll=(m.caps||[]).includes("*");
    const link=inviteUrls[m.id];
    return '<div class="card row" style="flex-wrap:wrap"><div class="nm">'+esc(m.name)+'<small>'+esc(m.role)+'</small></div>'+
      (voll?'<span class="tag in">Inhaber</span>':'')+
      (m.hatPasskey?'<span class="tag in" title="Passkey eingerichtet">🔑 Passkey</span>'
                   :'<span class="tag out" title="Noch kein Passkey">ohne Passkey</span>')+
      (m.hatPasskey
        ?'<button class="iconbtn" data-pkreset="'+m.id+'" title="Alle Passkeys entfernen – danach neu einladen">Passkey zurücksetzen</button>'
        :'<button class="iconbtn edit" data-einladung="'+m.id+'">Einladungslink</button>')+
      '<button class="iconbtn edit" data-edit="'+m.id+'">Bearbeiten</button>'+
      '<button class="iconbtn del" data-del="'+m.id+'">Löschen</button>'+
      (link?'<div class="invite-zeile"><input readonly value="'+esc(link)+'" onclick="this.select()">'+
            '<button class="iconbtn edit" data-kopieren="'+esc(link)+'">Kopieren</button>'+
            '<small>7 Tage gültig · einmal nutzbar</small></div>':'')+
    '</div>';
  }).join("") : '<div class="empty">Noch keine Mitarbeiter</div>';
}
let inviteUrls={};
$("teamList").addEventListener("click",async e=>{
  const t=e.target;
  if(t.dataset.edit){ editId=t.dataset.edit; return loadTeam(); }
  if(t.dataset.cancel!==undefined){ editId=null; return loadTeam(); }
  if(t.dataset.del){ if(confirm("Mitarbeiter wirklich löschen? Auch die Zeiten werden entfernt.")){ await fetch("/api/mitarbeiter/"+t.dataset.del,{method:"DELETE"}); loadTeam(); } return; }
  if(t.dataset.einladung){
    const r=await fetch("/api/mitarbeiter/"+t.dataset.einladung+"/einladung",{method:"POST"});
    const d=await r.json();
    if(!r.ok){ alert(d.fehler||"Einladung konnte nicht erstellt werden"); return; }
    inviteUrls[t.dataset.einladung]=d.url;
    return loadTeam();
  }
  if(t.dataset.kopieren){
    try{ await navigator.clipboard.writeText(t.dataset.kopieren); t.textContent="Kopiert ✓"; }
    catch{ alert("Bitte den Link manuell markieren und kopieren."); }
    return;
  }
  if(t.dataset.pkreset){
    if(!confirm("Alle Passkeys dieser Person entfernen? Sie braucht danach einen neuen Einladungslink.")) return;
    await fetch("/api/mitarbeiter/"+t.dataset.pkreset+"/passkeys",{method:"DELETE"});
    return loadTeam();
  }
  if(t.dataset.save){
    const body={vorname:$("eVorname").value.trim(),nachname:$("eNachname").value.trim(),role:$("eRole").value.trim()};
    if(!body.vorname){ alert("Der Vorname ist Pflicht."); return; }
    const r=await fetch("/api/mitarbeiter/"+t.dataset.save,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok){ alert((await r.json()).error||"Fehler"); return; }
    editId=null; loadTeam();
  }
});
/* Rollen = Capability-Bundles pflegen */
$("rollenListe").addEventListener("click",async e=>{
  const chip=e.target.closest(".cap-toggle");
  if(chip){
    const karte=chip.closest(".rolle-karte");
    const an=chip.getAttribute("aria-pressed")!=="true";
    chip.setAttribute("aria-pressed",String(an));
    // „Alles“ schaltet die Einzel-Chips mit; ein Einzel-Chip aus löst „Alles“.
    if(chip.dataset.capkey==="*") karte.querySelectorAll(".cap-toggle").forEach(c=>c.setAttribute("aria-pressed",String(an)));
    else if(!an) karte.querySelector('.cap-toggle[data-capkey="*"]').setAttribute("aria-pressed","false");
    return;
  }
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.rolsave){
    const karte=b.closest(".rolle-karte");
    const gedrueckt=[...karte.querySelectorAll('.cap-toggle[aria-pressed="true"]')].map(c=>c.dataset.capkey);
    const caps=gedrueckt.includes("*")?["*"]:gedrueckt;
    const r=await fetch("/api/rollen/"+encodeURIComponent(b.dataset.rolsave),{method:"PUT",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({caps})});
    if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
    b.textContent="Gespeichert ✓"; setTimeout(()=>{ b.textContent="Speichern"; },1500);
    return;
  }
  if(b.dataset.rolledel){
    if(!confirm('Rolle "'+b.dataset.rolledel+'" löschen?')) return;
    const r=await fetch("/api/rollen/"+encodeURIComponent(b.dataset.rolledel),{method:"DELETE"});
    if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
    ladeRollen();
  }
});
$("btnRolleNeu").addEventListener("click",async ()=>{
  const name=$("rolleNeu").value.trim();
  if(!name){ alert("Bitte einen Rollennamen angeben."); return; }
  const r=await fetch("/api/rollen",{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  $("rolleNeu").value="";
  ladeRollen();
});

$("btnAdd").addEventListener("click",async ()=>{
  const body={vorname:$("newVorname").value.trim(),nachname:$("newNachname").value.trim(),role:$("newRole").value.trim()};
  if(!body.vorname||!body.role){ alert("Vorname und Rolle sind Pflicht – der Nachname ist optional."); $("newVorname").focus(); return; }
  const r=await fetch("/api/mitarbeiter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){ alert((await r.json()).error||"Fehler"); return; }
  $("newVorname").value=""; $("newNachname").value=""; loadTeam();
});

/* ===== ABLÄUFE / CHECKLISTEN (Admin) ===== */
const AB_LABEL={aufbau:"Aufbau",leerlauf:"Leerlauf",abbau:"Abbau"};
let abProzess="aufbau", abEditId=null, abList=[];
function abChips(){
  $("abProzesse").innerHTML=Object.keys(AB_LABEL).map(p=>
    '<div class="range'+(p===abProzess?" active":"")+'" data-abp="'+p+'">'+AB_LABEL[p]+'</div>').join("");
}
async function loadAblaeufe(){
  abChips();
  const data=await fetch("/api/ablauf?prozess="+abProzess+"&datum="+heuteISO()).then(x=>x.json());
  abList=data.aufgaben||[];
  $("abListe").innerHTML = abList.length ? abList.map((a,i)=>{
    if(a.id===abEditId){
      return '<div class="card">'+
        '<div class="row">'+
          '<input class="rowinput nm" id="abETitel" value="'+esc(a.titel)+'">'+
          '<input class="rowinput rl" id="abEGruppe" value="'+esc(a.gruppe||"")+'" placeholder="Gruppe">'+
          '<button class="iconbtn edit" data-absave="'+a.id+'">Speichern</button>'+
          '<button class="iconbtn del" data-abcancel>Abbrechen</button>'+
        '</div>'+
        '<textarea class="rowinput" id="abEInfo" placeholder="Zusatzinfo (klappt am Terminal aus)" style="width:100%; margin-top:8px; min-height:56px; font-family:var(--sans)">'+esc(a.info||"")+'</textarea>'+
      '</div>';
    }
    return '<div class="card row">'+
      '<div class="nm">'+(a.gruppe?'<small style="color:var(--clay); text-transform:uppercase; letter-spacing:.04em">'+esc(a.gruppe)+'</small>':'')+esc(a.titel)+(a.info?'<small>'+esc(a.info)+'</small>':'')+'</div>'+
      '<button class="iconbtn" data-abup="'+a.id+'"'+(i===0?' disabled style="opacity:.3"':'')+' title="nach oben">▲</button>'+
      '<button class="iconbtn" data-abdown="'+a.id+'"'+(i===abList.length-1?' disabled style="opacity:.3"':'')+' title="nach unten">▼</button>'+
      '<button class="iconbtn edit" data-abedit="'+a.id+'">Bearbeiten</button>'+
      '<button class="iconbtn del" data-abdel="'+a.id+'">Löschen</button></div>';
  }).join("") : '<div class="empty">Noch keine Aufgaben – lege unten die erste an.</div>';
}
$("abProzesse").addEventListener("click",e=>{
  const c=e.target.closest("[data-abp]"); if(!c) return;
  abProzess=c.dataset.abp; abEditId=null; loadAblaeufe();
});
$("abListe").addEventListener("click",async e=>{
  const t=e.target;
  if(t.dataset.abedit){ abEditId=t.dataset.abedit; return loadAblaeufe(); }
  if(t.dataset.abcancel!==undefined){ abEditId=null; return loadAblaeufe(); }
  if(t.dataset.abdel){ if(confirm("Aufgabe wirklich löschen?")){ await fetch("/api/ablauf/aufgaben/"+t.dataset.abdel,{method:"DELETE"}); loadAblaeufe(); } return; }
  if(t.dataset.absave){
    const body={titel:$("abETitel").value.trim(),gruppe:$("abEGruppe").value.trim(),info:$("abEInfo").value.trim()};
    if(!body.titel){ alert("Titel ist Pflicht"); return; }
    const r=await fetch("/api/ablauf/aufgaben/"+t.dataset.absave,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
    abEditId=null; loadAblaeufe(); return;
  }
  const move=t.dataset.abup||t.dataset.abdown;
  if(move){
    const dir=t.dataset.abup?-1:1;
    const ids=abList.map(a=>a.id); const i=ids.indexOf(move); const j=i+dir;
    if(j<0||j>=ids.length) return;
    ids.splice(i,1); ids.splice(j,0,move);
    await fetch("/api/ablauf/aufgaben-reihenfolge",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
    loadAblaeufe();
  }
});
$("abAdd").addEventListener("click",async ()=>{
  const body={prozess:abProzess,titel:$("abNeuTitel").value.trim(),gruppe:$("abNeuGruppe").value.trim(),info:$("abNeuInfo").value.trim()};
  if(!body.titel){ alert("Titel ist Pflicht"); return; }
  const r=await fetch("/api/ablauf/aufgaben",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){ alert((await r.json()).fehler||"Fehler"); return; }
  $("abNeuTitel").value=""; $("abNeuGruppe").value=""; $("abNeuInfo").value=""; loadAblaeufe();
});

boot();
</script>
</body>
</html>`;
