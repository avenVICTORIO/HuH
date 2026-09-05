import { baseCss, iconHead, teamIcons } from "./styles";

export const terminalPage = /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<title>Hand aufs Herz – Team-Terminal</title>
${iconHead}
<style>
${baseCss}
  body{ -webkit-user-select:none; user-select:none; }
  .screen{display:none; min-height:100vh; flex-direction:column;}
  .screen.active{display:flex;}

  /* ---------- LOGIN ---------- */
  #screen-login{align-items:center; justify-content:flex-start; padding:2vh 4vw 4vh;}
  .logo{width:120px; height:auto; margin:2.5vh 0 1vh; opacity:.92;}
  .clockwrap{text-align:center; margin:1vh 0 2.5vh;}
  .clock{ font-family:var(--serif); font-size:clamp(56px,13vw,120px); line-height:1;
    color:var(--wald); letter-spacing:2px; font-variant-numeric:tabular-nums; }
  .clock .sec{color:var(--amber); font-size:.6em;}
  .date{margin-top:.6rem; font-size:clamp(15px,3.5vw,22px); color:var(--clay); letter-spacing:.5px;}
  .prompt{font-size:clamp(15px,3.6vw,19px); margin:.2rem 0 1rem; text-align:center;}
  .prompt b{color:var(--wald);}
  .dots{display:flex; gap:18px; justify-content:center; margin-bottom:1.4rem; height:26px;}
  .dot{width:22px; height:22px; border-radius:50%; border:2.5px solid var(--wald); background:transparent; transition:transform .12s, background .12s;}
  .dot.filled{background:var(--wald); transform:scale(1.05);}
  .dots.error .dot{border-color:var(--rot); background:var(--rot);}
  .dots.error{animation:shake .4s;}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}
  .pad{display:grid; grid-template-columns:repeat(3,1fr); gap:14px; width:min(340px,86vw);}
  .key{ font-family:var(--serif); font-size:clamp(26px,7vw,34px); background:var(--card); color:var(--ink);
    border:1.5px solid var(--line); border-radius:16px; height:clamp(62px,12vh,80px);
    display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 1px 0 rgba(0,0,0,.04); transition:transform .06s, background .1s;}
  .key:active{transform:scale(.94); background:var(--creme);}
  .key.action{font-family:var(--sans); font-size:clamp(14px,3.6vw,17px); font-weight:600;}
  .key.clear{color:var(--clay);}
  .key.enter{background:var(--wald); color:#fff; border-color:var(--wald);}
  .loginfoot{margin-top:auto; padding-top:2.5vh; font-size:12px; color:var(--grey); text-align:center;}
  .loginfoot a{color:var(--grey);}

  /* ---------- Passkey-Login ---------- */
  .pk-bereich{display:flex; flex-direction:column; align-items:center; width:min(420px,88vw); margin-top:1vh;}
  .pk-anmelden{
    display:flex; align-items:center; justify-content:center; gap:12px; width:100%;
    border:none; border-radius:18px; padding:22px; background:var(--wald); color:#fff;
    font-family:var(--sans); font-size:clamp(17px,4.6vw,21px); font-weight:600; cursor:pointer;
    letter-spacing:.3px; box-shadow:0 10px 28px -14px rgba(60,74,59,.55);
  }
  .pk-anmelden:active{background:#2C382C;}
  .pk-anmelden svg{width:26px; height:26px; flex:none;}
  .pk-anmelden[disabled]{opacity:.6;}
  .pk-neu{
    margin-top:14px; width:100%; background:none; border:1.5px solid var(--line); border-radius:18px;
    padding:16px; font-family:var(--sans); font-size:clamp(14px,3.8vw,16px); color:var(--clay); cursor:pointer;
  }
  .pk-fehler{min-height:20px; margin-top:12px; font-size:14px; color:var(--rot); text-align:center;}
  .pk-form{width:100%; background:var(--card); border:1px solid var(--line); border-radius:20px; padding:24px 22px;}
  .pk-form-titel{font-family:var(--serif); font-size:clamp(22px,5.4vw,28px); color:var(--wald); text-align:center; margin-bottom:8px;}
  .pk-form-text{font-size:14px; color:var(--clay); text-align:center; margin:0 0 18px; line-height:1.5;}
  .pk-form input{
    width:100%; margin-bottom:12px; padding:15px 16px; border:1.5px solid var(--line); border-radius:14px;
    font-size:17px; font-family:var(--sans); background:var(--creme); color:var(--ink);
  }
  .pk-form input:focus{outline:none; border-color:var(--wald-hell);}

  /* ---------- HOME (nach Login) ---------- */
  .topbar{display:flex; align-items:center; gap:12px; padding:14px 18px; background:var(--card); border-bottom:1px solid var(--line);}
  .topbar img{height:38px; width:auto;}
  .topbar .who{font-family:var(--serif); font-size:clamp(18px,4.5vw,24px); color:var(--wald); flex:1;}
  .topbar .miniclock{font-variant-numeric:tabular-nums; font-size:15px; color:var(--clay);}
  .btn-logout{background:none; border:1px solid var(--line); color:var(--grey); border-radius:10px; padding:8px 12px; font-size:13px; cursor:pointer;}
  .home-body{flex:1; padding:18px; max-width:760px; width:100%; margin:0 auto;}
  .statuscard{background:var(--card); border:1px solid var(--line); border-radius:18px; padding:22px; text-align:center; margin-bottom:20px;}
  .statuscard .lbl{font-size:14px; color:var(--grey); letter-spacing:.5px; text-transform:uppercase;}
  .statuscard .since{font-family:var(--serif); font-size:clamp(22px,5.5vw,30px); color:var(--wald); margin:6px 0;}
  .statuscard .dur{font-variant-numeric:tabular-nums; font-size:clamp(30px,9vw,48px); color:var(--ink); font-family:var(--serif);}
  .bigbtn{display:block; width:100%; border:none; border-radius:16px; padding:20px; font-size:clamp(18px,5vw,22px); font-weight:600; color:#fff; cursor:pointer; margin-top:16px; letter-spacing:.3px;}
  .bigbtn.out{background:var(--clay);} .bigbtn.out:active{background:#725a30;}
  .bigbtn.in{background:var(--wald);} .bigbtn.in:active{background:#2f4a34;}
  .tiles{display:grid; grid-template-columns:repeat(2,1fr); gap:14px;}
  .tile{background:var(--card); border:1px solid var(--line); border-radius:16px; padding:20px 16px; text-align:center; cursor:pointer; transition:transform .06s;}
  .tile:active{transform:scale(.97);}
  .tile .ico{display:block; width:34px; height:34px; margin:0 auto 10px; color:var(--amber);}
  .tile .ico svg{width:100%; height:100%;}
  .tile .t{font-family:var(--serif); font-size:19px; color:var(--wald);}
  .tile.soon{opacity:.85;}
  .badge-soon{display:inline-block; margin-top:6px; font-size:11px; background:var(--creme); color:var(--clay); border:1px solid var(--line); border-radius:20px; padding:2px 10px;}
  a.tile{display:block; text-decoration:none;}
  .tile.werkzeug{border-color:var(--wald-hell); background:var(--card);}
  .tile.werkzeug .ico{color:var(--wald);}
  .tiles-trenner{
    display:flex; align-items:center; gap:12px; margin:22px 0 12px;
    font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--grey); font-weight:500;
  }
  .tiles-trenner::before, .tiles-trenner::after{content:""; flex:1; height:1px; background:var(--line);}

  /* ---------- Reservierungs-Hintergrund (Platzhalter für den grafischen Tischplan) ---------- */
  #screen-home{position:relative;}
  #tischplan-bg{position:absolute; left:0; right:0; top:66px; bottom:0; z-index:0;
    padding:14px 20px 40px; overflow:hidden; opacity:.55; pointer-events:none; -webkit-user-select:none; user-select:none;}
  #tischplan-bg .tp-kopf{font-family:var(--serif); color:var(--wald); font-size:clamp(18px,4vw,22px); margin:2px 0 4px;}
  #tischplan-bg .tp-kpi{font-size:13px; color:var(--clay); margin-bottom:10px;}
  #tischplan-bg .tp-res{display:flex; gap:12px; align-items:baseline; padding:6px 2px; border-bottom:1px solid var(--line); font-size:14px; max-width:640px;}
  #tischplan-bg .tp-zeit{font-family:var(--serif); color:var(--wald); min-width:52px;}
  #tischplan-bg .tp-name{flex:1; color:var(--ink);} #tischplan-bg .tp-det{color:var(--grey); font-size:12.5px;}
  #tischplan-bg .tp-leer{color:var(--grey); font-style:italic; padding:14px 2px;}
  .home-front{position:relative; z-index:1; margin-top:30vh;}   /* (alt) */

  /* ---------- Tischplan als Vollbild-Home + schlanke HuH-Leiste ---------- */
  #screen-home.active{height:100vh; min-height:0; overflow:hidden; flex-direction:column;}
  .huh-strip{display:flex; align-items:center; gap:12px; padding:8px 14px; background:var(--card); border-bottom:1px solid var(--line); flex:none;}
  .huh-strip .hs-hallo{font-family:var(--serif); font-size:clamp(15px,3.5vw,19px); color:var(--wald); white-space:nowrap;}
  .huh-strip .miniclock{font-variant-numeric:tabular-nums; font-size:14px; color:var(--clay); margin-left:auto;}
  .huh-strip .hs-menu{background:var(--wald); color:#fff; border:none; border-radius:10px; padding:8px 14px; font-size:14px; cursor:pointer; font-family:var(--sans);}
  .hs-aufbau{background:var(--amber); color:#fff; border:none; border-radius:999px; padding:6px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:var(--sans); white-space:nowrap;}
  .tischplan-frame{flex:1; width:100%; border:0; display:block; background:var(--creme);}

  /* Menü als Panel von rechts */
  .menu-back{position:fixed; inset:0; z-index:45; background:rgba(34,38,31,.4); display:flex; justify-content:flex-end;}
  .menu-karte{background:var(--creme); width:min(420px,92vw); height:100%; overflow-y:auto; padding:16px 16px calc(20px + env(safe-area-inset-bottom)); box-shadow:-16px 0 50px -20px rgba(0,0,0,.45);}
  .mk-kopf{display:flex; align-items:center; margin-bottom:8px;}
  .mk-kopf span{flex:1; font-family:var(--serif); font-size:20px; color:var(--wald);}
  .mk-x{background:none; border:none; font-size:22px; color:var(--grey); cursor:pointer; line-height:1;}
  .mk-titel{font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--grey); margin:20px 0 8px;}

  /* Aufbau-Banner + Prozess-Buttons auf dem Home */
  .ablauf-banner{display:flex; align-items:center; gap:12px; background:var(--amber); color:#fff;
    border-radius:14px; padding:13px 16px; margin-bottom:16px; cursor:pointer; box-shadow:0 10px 26px -14px rgba(176,85,58,.7);}
  .ablauf-banner .b-txt{flex:1; font-weight:600;} .ablauf-banner .b-go{font-size:13px; opacity:.9; white-space:nowrap;}
  .prozesse{display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:0 0 18px;}
  .proz{background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px 12px; text-align:center; cursor:pointer; transition:transform .06s;}
  .proz:active{transform:scale(.97);} .proz.fertig{border-color:var(--wald-hell); background:#eef2ec;}
  .proz .pt{font-family:var(--serif); font-size:clamp(16px,4vw,19px); color:var(--wald);}
  .proz .pp{font-variant-numeric:tabular-nums; font-size:13px; color:var(--clay); margin-top:5px;}
  .proz .pp.ok{color:var(--wald);}

  /* Vorschlag-Overlay (direkt nach Login) */
  .vorschlag-back{position:fixed; inset:0; z-index:40; background:rgba(34,38,31,.45); display:flex; align-items:center; justify-content:center; padding:6vw;}
  .vorschlag-karte{background:var(--card); border-radius:22px; padding:30px 28px; width:min(460px,92vw); text-align:center; box-shadow:0 24px 60px -20px rgba(0,0,0,.5);}
  .vk-titel{font-family:var(--serif); font-size:clamp(24px,6vw,32px); color:var(--wald); margin-bottom:8px;}
  .vk-text{font-size:clamp(15px,3.6vw,17px); color:var(--clay); margin:0 0 22px;}
  .vk-primary{display:block; width:100%; border:none; border-radius:16px; padding:18px; background:var(--wald); color:#fff; font-size:clamp(17px,4.6vw,20px); font-weight:600; cursor:pointer; font-family:var(--sans);}
  .vk-secondary{display:block; width:100%; margin-top:12px; background:none; border:1px solid var(--line); border-radius:16px; padding:14px; color:var(--clay); font-size:15px; cursor:pointer; font-family:var(--sans);}

  /* ---------- ABLAUF-SCREEN (Aufbau/Leerlauf/Abbau) ---------- */
  #screen-ablauf .ablauf-fortschritt{font-variant-numeric:tabular-nums; font-size:16px; color:var(--wald); font-weight:600;}
  .ablauf-body{flex:1; overflow-y:auto; padding:18px; max-width:720px; width:100%; margin:0 auto;}
  .ab-gruppe{font-family:var(--mono,var(--sans)); font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--grey); margin:18px 0 8px;}
  .ab-gruppe:first-child{margin-top:0;}
  .ab-task{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px 16px; margin-bottom:10px; transition:opacity .15s;}
  .ab-task .tt{font-size:clamp(16px,4vw,18px); color:var(--ink); display:flex; align-items:center; gap:10px;}
  .ab-task.fertig{opacity:.5;} .ab-task.fertig .tt{text-decoration:line-through; color:var(--wald);}
  .ab-task.kommt{opacity:.5;}
  .ab-check{width:24px; height:24px; border-radius:50%; border:2px solid var(--line); flex:none; display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px;}
  .ab-task.fertig .ab-check{background:var(--wald); border-color:var(--wald);}
  .ab-task.aktiv{border-color:var(--wald); box-shadow:0 10px 26px -16px rgba(60,74,59,.6);}
  .ab-task.aktiv .ab-check{border-color:var(--wald);}
  .ab-info{margin:12px 0 0; font-size:14.5px; color:var(--clay); line-height:1.5; background:var(--creme); border-radius:10px; padding:12px 14px;}
  .ab-erledigt{display:block; width:100%; margin-top:14px; border:none; border-radius:12px; padding:16px; background:var(--wald); color:#fff; font-size:clamp(16px,4.4vw,19px); font-weight:600; cursor:pointer; font-family:var(--sans); letter-spacing:.3px;}
  .ab-erledigt:active{background:#2f4a34;}
  .ablauf-foot{padding:14px 18px calc(14px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); background:var(--card); text-align:center;}
  .ablauf-abbruch{background:none; border:1px solid var(--line); color:var(--rot); border-radius:12px; padding:12px 22px; font-size:15px; cursor:pointer; font-family:var(--sans);}

  /* Rote Unterbrechen-Bestätigung */
  .confirm-back{position:fixed; inset:0; z-index:60; background:rgba(154,59,52,.28); display:flex; align-items:center; justify-content:center; padding:6vw;}
  .confirm-karte{background:var(--card); border:2px solid var(--rot); border-radius:22px; padding:30px 28px; width:min(480px,92vw); text-align:center; box-shadow:0 24px 60px -18px rgba(154,59,52,.55);}
  .ck-titel{font-family:var(--serif); font-size:clamp(26px,6.5vw,36px); color:var(--rot); margin-bottom:10px;}
  .ck-text{font-size:clamp(15px,3.6vw,17px); color:var(--ink); margin:0 0 24px; line-height:1.5;}
  .ck-ja{display:block; width:100%; border:none; border-radius:16px; padding:18px; background:var(--rot); color:#fff; font-size:clamp(17px,4.6vw,20px); font-weight:700; cursor:pointer; font-family:var(--sans);}
  .ck-nein{display:block; width:100%; margin-top:12px; background:var(--wald); color:#fff; border:none; border-radius:16px; padding:16px; font-size:16px; font-weight:600; cursor:pointer; font-family:var(--sans);}

  /* ---------- ENTSCHEIDUNG (nach Login) ---------- */
  #screen-entscheid{align-items:center; justify-content:center; padding:4vh 6vw; text-align:center;}
  .ent-logo{width:96px; height:auto; opacity:.92; margin-bottom:2vh;}
  .ent-hallo{font-family:var(--serif); font-size:clamp(30px,7vw,44px); color:var(--wald); margin-bottom:.6rem;}
  .ent-status{font-size:clamp(15px,3.6vw,18px); color:var(--clay); margin:0 0 4vh; max-width:34ch;}
  .ent-status b{color:var(--wald);}
  .ent-primary{
    display:block; width:min(420px,86vw); border:none; border-radius:18px; cursor:pointer;
    padding:24px; font-family:var(--sans); font-size:clamp(18px,5vw,22px); font-weight:600;
    color:#fff; letter-spacing:.3px; box-shadow:0 10px 28px -14px rgba(60,74,59,.55);
  }
  .ent-primary.start{background:var(--wald);} .ent-primary.start:active{background:#2C382C;}
  .ent-primary.weiter{background:var(--wald);} .ent-primary.weiter:active{background:#2C382C;}
  .ent-secondary{
    display:block; width:min(420px,86vw); margin-top:14px; cursor:pointer;
    background:none; border:1.5px solid var(--line); border-radius:18px; padding:18px;
    font-family:var(--sans); font-size:clamp(14px,3.8vw,17px); color:var(--clay);
  }
  .ent-secondary.ende{border-color:var(--amber); color:var(--amber); font-weight:600;}
  .ent-abbruch{margin-top:4vh; background:none; border:none; color:var(--grey); font-size:14px; cursor:pointer; text-decoration:underline; font-family:var(--sans);}

  /* ---------- KLÄRUNG (vergessenes Ausstempeln) ---------- */
  #screen-klaerung{align-items:center; justify-content:center; padding:4vh 6vw; text-align:center;}
  .kl-karte{background:var(--card); border:1px solid var(--sand); border-radius:20px; padding:28px 26px; width:min(460px,90vw);}
  .kl-titel{font-family:var(--serif); font-size:clamp(24px,5.5vw,32px); color:var(--amber); margin-bottom:10px;}
  .kl-text{font-size:clamp(14px,3.6vw,16px); color:var(--clay); margin:0 0 22px; line-height:1.5;}
  .kl-text b{color:var(--ink);}
  .kl-zeit{display:flex; gap:12px; align-items:center; justify-content:center; margin-bottom:22px;}
  .kl-zeit input{font-family:var(--serif); font-size:30px; padding:10px 14px; border:1.5px solid var(--line);
    border-radius:14px; background:var(--creme); color:var(--wald); text-align:center;}
  .kl-bestaetigen{width:100%; border:none; border-radius:16px; padding:18px; background:var(--wald);
    color:var(--sand-hell); font-family:var(--sans); font-size:17px; font-weight:600; cursor:pointer;}

  /* ---------- TOAST ---------- */
  .toast{position:fixed; left:50%; top:50%; transform:translate(-50%,-50%) scale(.9);
    background:var(--wald); color:#fff; padding:26px 34px; border-radius:20px;
    font-size:clamp(18px,4.5vw,24px); text-align:center; box-shadow:0 12px 40px rgba(0,0,0,.25);
    opacity:0; pointer-events:none; transition:opacity .25s, transform .25s; z-index:50; max-width:88vw;}
  .toast.show{opacity:1; transform:translate(-50%,-50%) scale(1);}
  .toast.out{background:var(--clay);}
  .toast .big{font-family:var(--serif); font-size:1.5em; display:block; margin-top:6px;}
</style>
</head>
<body>

<!-- ============ LOGIN (Passkey) ============ -->
<section id="screen-login" class="screen active">
  <img class="logo" src="/logo.png" alt="Hand aufs Herz">
  <div class="clockwrap">
    <div class="clock" id="bigClock">--:--<span class="sec">:--</span></div>
    <div class="date" id="bigDate">&nbsp;</div>
  </div>

  <div class="pk-bereich" id="pkStart">
    <button class="pk-anmelden" id="btnPkLogin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8.5" cy="8.5" r="4.5"/><path d="M3 21c0-3.3 2.5-5.5 5.5-5.5S14 17.7 14 21"/>
        <path d="M15 12.5l6-6M18.5 6l2.5 2.5M16.8 7.7l1.8 1.8"/></svg>
      Mit Passkey anmelden
    </button>
    <div class="pk-fehler" id="pkFehler"></div>
    <button class="pk-neu" id="btnPkNeuZeigen">Neu hier? Konto erstellen</button>
  </div>

  <div class="pk-bereich" id="pkRegistrierung" style="display:none">
    <div class="pk-form">
      <div class="pk-form-titel">Konto erstellen</div>
      <p class="pk-form-text">Einmal Name eintragen, dann sichert dein Gerät den Zugang (Fingerabdruck, Gesicht oder Geräte-Code).</p>
      <input id="pkVorname" placeholder="Vorname" autocomplete="given-name" maxlength="60">
      <input id="pkNachname" placeholder="Nachname" autocomplete="family-name" maxlength="60">
      <div class="pk-fehler" id="pkRegFehler"></div>
      <button class="pk-anmelden" id="btnPkRegistrieren">Passkey erstellen</button>
      <button class="pk-neu" id="btnPkZurueck">← Zurück zur Anmeldung</button>
    </div>
  </div>

  <div class="loginfoot">Hand aufs Herz · Team-Terminal &nbsp;·&nbsp; <a href="/team">Team &amp; Zeiten</a></div>
</section>

<!-- ============ KLÄRUNG: Ausstempeln vergessen ============ -->
<section id="screen-klaerung" class="screen">
  <div class="kl-karte">
    <div class="kl-titel">Kurze Frage zuerst</div>
    <p class="kl-text" id="klText"></p>
    <div class="kl-zeit">
      <span style="font-size:14px; color:var(--grey)">Feierabend um</span>
      <input type="time" id="klZeit">
      <span style="font-size:14px; color:var(--grey)">Uhr</span>
    </div>
    <button class="kl-bestaetigen" id="klOk">Zeit bestätigen</button>
  </div>
</section>

<!-- ============ ENTSCHEIDUNG (nach Login) ============ -->
<section id="screen-entscheid" class="screen">
  <img class="ent-logo" src="/logo.png" alt="Hand aufs Herz">
  <div class="ent-hallo" id="entWho">Servus!</div>
  <p class="ent-status" id="entStatus"></p>
  <button class="ent-primary" id="entPrimary"></button>
  <button class="ent-secondary" id="entSecondary"></button>
  <button class="ent-abbruch" id="entAbbruch">Abbrechen</button>
</section>

<!-- ============ HOME (nach Login) ============ -->
<section id="screen-home" class="screen">
  <!-- Schlanke HuH-Leiste über dem Tischplan -->
  <div class="huh-strip">
    <span class="hs-hallo" id="homeWho">Servus</span>
    <button class="hs-aufbau" id="ablaufBanner" style="display:none"></button>
    <span class="miniclock" id="homeClock">--:--:--</span>
    <button class="hs-menu" id="btnMenu">☰ Menü</button>
  </div>

  <!-- Tischplan-/Reservierungs-App im Vollbild -->
  <iframe id="tischplanFrame" class="tischplan-frame" src="/tischplan" title="Tischplan &amp; Reservierungen" allow="fullscreen; clipboard-write"></iframe>

  <!-- Menü: Ausstempeln, Abläufe, Werkzeuge, Abmelden -->
  <div class="menu-back" id="menuBack" style="display:none">
    <div class="menu-karte">
      <div class="mk-kopf"><span id="mkWho">Servus</span><button class="mk-x" id="mkClose">✕</button></div>
      <div class="statuscard" id="statusCard">
        <div class="lbl" id="statLbl">Eingestempelt seit</div>
        <div class="since" id="statSince">--:--</div>
        <div class="dur" id="statDur">00:00:00</div>
        <button class="bigbtn out" id="btnStamp">Ausstempeln</button>
      </div>
      <div class="mk-titel">Abläufe</div>
      <div class="prozesse" id="prozesse"></div>
      <div class="mk-titel">Werkzeuge</div>
      <!-- Werkzeug-Karten nach Fähigkeiten der Rolle (data-cap leer = für alle). -->
      <template id="tplWerkzeuge">
        <a class="tile werkzeug" href="/team#meine-schichten" data-cap=""><span class="ico">${teamIcons.schichtplan}</span><span class="t">Meine Schichten</span></a>
        <a class="tile werkzeug" href="/team#meine-zeiten" data-cap=""><span class="ico">${teamIcons.zeiten}</span><span class="t">Meine Zeiten</span></a>
        <a class="tile werkzeug" href="/team#reservierungen" data-cap="reservierungen"><span class="ico">${teamIcons.reservierung}</span><span class="t">Reservierungen</span></a>
        <a class="tile werkzeug" href="/team#inventur" data-cap="inventur"><span class="ico">${teamIcons.inventur}</span><span class="t">Inventur</span></a>
        <a class="tile werkzeug" href="/team#rezepte" data-cap="rezepte"><span class="ico">${teamIcons.drinks}</span><span class="t">Rezepte</span></a>
        <a class="tile werkzeug" href="/team#heute" data-cap="auswertung"><span class="ico">${teamIcons.live}</span><span class="t">Heute · Live</span></a>
        <a class="tile werkzeug" href="/team#schichtplan" data-cap="schichtplan"><span class="ico">${teamIcons.schichtplan}</span><span class="t">Schichtplan</span></a>
        <a class="tile werkzeug" href="/team#auswertung" data-cap="auswertung"><span class="ico">${teamIcons.auswertung}</span><span class="t">Auswertung</span></a>
        <a class="tile werkzeug" href="/team#ablaeufe" data-cap="ablaeufe.admin"><span class="ico">${teamIcons.aufgaben}</span><span class="t">Abläufe</span></a>
        <a class="tile werkzeug" href="/team#karte" data-cap="karte.admin"><span class="ico">${teamIcons.handbuch}</span><span class="t">Karte</span></a>
        <a class="tile werkzeug" href="/team#team" data-cap="team.admin"><span class="ico">${teamIcons.team}</span><span class="t">Team</span></a>
      </template>
      <div class="tiles" id="tilesWerkzeuge"></div>
      <button class="bigbtn" id="btnLogout" style="background:none; border:1px solid var(--line); color:var(--grey); margin-top:18px;">Abmelden</button>
    </div>
  </div>

  <!-- Vorschlag direkt nach Login -->
  <div class="vorschlag-back" id="vorschlag" style="display:none">
    <div class="vorschlag-karte">
      <div class="vk-titel" id="vkTitel">Bereit für den Aufbau?</div>
      <p class="vk-text" id="vkText">Sollen wir den Aufbau gemeinsam durchgehen?</p>
      <button class="vk-primary" id="vkStart">Aufbau starten</button>
      <button class="vk-secondary" id="vkSpaeter">Später</button>
    </div>
  </div>
</section>

<!-- ============ ABLAUF (Aufbau / Leerlauf / Abbau) ============ -->
<section id="screen-ablauf" class="screen">
  <div class="topbar">
    <button class="btn-logout" id="abZurueck">‹ Zum Tischplan</button>
    <div class="who" id="abTitel">Aufbau</div>
    <div class="ablauf-fortschritt" id="abFort">0/0</div>
  </div>
  <div class="ablauf-body" id="ablaufBody"></div>
  <div class="ablauf-foot">
    <button class="ablauf-abbruch" id="abUnterbrechen">Aufbau unterbrechen</button>
  </div>

  <!-- Rote Bestätigung -->
  <div class="confirm-back" id="abConfirm" style="display:none">
    <div class="confirm-karte">
      <div class="ck-titel" id="ckTitel">Aufbau unterbrechen?</div>
      <p class="ck-text" id="ckText">Es sind noch Aufgaben offen. Der Aufbau bleibt als „offen" markiert – du kannst jederzeit weitermachen.</p>
      <button class="ck-ja" id="abConfirmJa">Ja, unterbrechen</button>
      <button class="ck-nein" id="abConfirmNein">Weiter im Aufbau</button>
    </div>
  </div>
</section>

<div class="toast" id="toast"></div>

<script>
"use strict";
const WD=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MO=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const p2=n=>String(n).padStart(2,"0");
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hm=ts=>{const d=new Date(ts);return p2(d.getHours())+":"+p2(d.getMinutes());};

/* ---------- Uhr ---------- */
function tick(){
  const d=new Date();
  $("bigClock").innerHTML=p2(d.getHours())+":"+p2(d.getMinutes())+'<span class="sec">:'+p2(d.getSeconds())+'</span>';
  $("bigDate").textContent=WD[d.getDay()]+", "+d.getDate()+". "+MO[d.getMonth()]+" "+d.getFullYear();
  $("homeClock").textContent=p2(d.getHours())+":"+p2(d.getMinutes())+":"+p2(d.getSeconds());
  if($("screen-home").classList.contains("active")) updateDuration();
}
setInterval(tick,250); tick();

function show(id){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); $(id).classList.add("active"); window.scrollTo(0,0); }

/* ---------- Toast ---------- */
let toastT=null;
function toast(html,kind,ms){ const t=$("toast"); t.className="toast show"+(kind==="out"?" out":""); t.innerHTML=html; clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),ms||2200); }

/* ---------- Passkey-Anmeldung (WebAuthn) ---------- */
let current=null; // {id,name,vorname,nachname,role,admin,clockedIn,since,klaerung}

// base64url <-> ArrayBuffer für die WebAuthn-API.
const b2a=(s)=>{ s=s.replace(/-/g,"+").replace(/_/g,"/"); const bin=atob(s+"=".repeat((4-s.length%4)%4));
  const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i); return u.buffer; };
const a2b=(buf)=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");

function pkFehler(ziel,text){ $(ziel).textContent=text||""; }

async function pkLogin(){
  pkFehler("pkFehler","");
  const knopf=$("btnPkLogin"); knopf.disabled=true;
  try{
    const opts=await fetch("/api/passkey/login/optionen",{method:"POST"}).then(r=>r.json());
    opts.challenge=b2a(opts.challenge);
    (opts.allowCredentials||[]).forEach(c=>c.id=b2a(c.id));
    const cred=await navigator.credentials.get({publicKey:opts});
    const antwort={
      id:cred.id, rawId:a2b(cred.rawId), type:cred.type,
      clientExtensionResults:cred.getClientExtensionResults(),
      response:{
        clientDataJSON:a2b(cred.response.clientDataJSON),
        authenticatorData:a2b(cred.response.authenticatorData),
        signature:a2b(cred.response.signature),
        userHandle:cred.response.userHandle?a2b(cred.response.userHandle):null,
      },
    };
    const r=await fetch("/api/passkey/login/abschluss",{method:"POST",
      headers:{"Content-Type":"application/json"},body:JSON.stringify(antwort)});
    const d=await r.json();
    if(!r.ok){ pkFehler("pkFehler",d.fehler||"Anmeldung fehlgeschlagen."); return; }
    current=d;
    zeigeEntscheid();
  }catch(e){
    if(e.name!=="NotAllowedError") pkFehler("pkFehler","Das hat nicht geklappt: "+e.message);
  }finally{ knopf.disabled=false; }
}

// Registrierung: entweder Bootstrap (allererster Passkey = Inhaber) oder per Einladungslink.
const einladungCode=new URLSearchParams(location.search).get("einladung");

async function pkRegistrieren(){
  pkFehler("pkRegFehler","");
  const vorname=$("pkVorname").value.trim(), nachname=$("pkNachname").value.trim();
  if(!einladungCode && !vorname){ pkFehler("pkRegFehler","Bitte den Vornamen eintragen."); return; }
  const knopf=$("btnPkRegistrieren"); knopf.disabled=true;
  try{
    const r1=await fetch("/api/passkey/registrierung/optionen",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(einladungCode?{einladung:einladungCode}:{vorname,nachname})});
    const opts=await r1.json();
    if(!r1.ok){ pkFehler("pkRegFehler",opts.fehler||"Konto konnte nicht angelegt werden."); return; }
    opts.challenge=b2a(opts.challenge);
    opts.user.id=b2a(opts.user.id);
    (opts.excludeCredentials||[]).forEach(c=>c.id=b2a(c.id));
    const cred=await navigator.credentials.create({publicKey:opts});
    const antwort={
      id:cred.id, rawId:a2b(cred.rawId), type:cred.type,
      clientExtensionResults:cred.getClientExtensionResults(),
      response:{
        clientDataJSON:a2b(cred.response.clientDataJSON),
        attestationObject:a2b(cred.response.attestationObject),
        transports:cred.response.getTransports?cred.response.getTransports():[],
      },
    };
    const r2=await fetch("/api/passkey/registrierung/abschluss",{method:"POST",
      headers:{"Content-Type":"application/json"},body:JSON.stringify(antwort)});
    const d=await r2.json();
    if(!r2.ok){ pkFehler("pkRegFehler",d.fehler||"Passkey konnte nicht gespeichert werden."); return; }
    current=d;
    $("pkVorname").value=""; $("pkNachname").value="";
    $("pkRegistrierung").style.display="none"; $("pkStart").style.display="";
    toast("Willkommen, "+esc(current.vorname)+"! <span class='big'>Passkey eingerichtet</span>","in");
    zeigeEntscheid();
  }catch(e){
    if(e.name!=="NotAllowedError") pkFehler("pkRegFehler","Das hat nicht geklappt: "+e.message);
  }finally{ knopf.disabled=false; }
}

$("btnPkLogin").addEventListener("click",pkLogin);
$("btnPkRegistrieren").addEventListener("click",pkRegistrieren);
$("btnPkNeuZeigen").addEventListener("click",()=>{ $("pkStart").style.display="none"; $("pkRegistrierung").style.display=""; });
$("btnPkZurueck").addEventListener("click",()=>{ $("pkRegistrierung").style.display="none"; $("pkStart").style.display=""; });

// Start-Screen je nach Lage: Einladungslink -> Begrüßung; Bootstrap -> Konto erstellen; sonst nur Anmelden.
(async ()=>{
  if(einladungCode){
    const r=await fetch("/api/einladung/"+encodeURIComponent(einladungCode));
    const d=await r.json();
    if(!r.ok){ pkFehler("pkFehler",d.fehler||"Einladung ungültig."); $("btnPkNeuZeigen").style.display="none"; return; }
    $("pkStart").style.display="none"; $("pkRegistrierung").style.display="";
    $("pkVorname").style.display="none"; $("pkNachname").style.display="none";
    document.querySelector(".pk-form-titel").textContent="Servus, "+d.vorname+"!";
    document.querySelector(".pk-form-text").textContent=
      "Du bist als "+d.role+" eingeladen. Erstell jetzt deinen Passkey – danach meldest du dich damit am Terminal an.";
    $("btnPkZurueck").style.display="none";
    return;
  }
  const s=await fetch("/api/passkey/status").then(r=>r.json()).catch(()=>({bootstrap:false}));
  if(s.bootstrap){
    $("btnPkNeuZeigen").textContent="Erstes Konto anlegen (wird Inhaber)";
  }else{
    $("btnPkNeuZeigen").style.display="none";
    pkFehler("pkFehler","");
    const hinweis=document.createElement("div");
    hinweis.style.cssText="margin-top:14px; font-size:13px; color:var(--grey); text-align:center;";
    hinweis.textContent="Neu im Team? Dein Admin schickt dir einen Einladungslink.";
    $("pkStart").appendChild(hinweis);
  }
})();

// Läuft noch eine Session (Cookie gültig)? Dann direkt zum Entscheid-Screen.
fetch("/api/session").then(r=>r.ok?r.json():null).then(d=>{ if(d){ current=d; zeigeEntscheid(); } }).catch(()=>{});

/* Vergessenes Ausstempeln: muss vor allem anderen geklärt werden. */
function zeigeKlaerung(){
  const k=current.klaerung;
  const d=new Date(k.seit);
  $("klText").innerHTML="Du bist seit <b>"+WD[d.getDay()]+", "+d.getDate()+". "+MO[d.getMonth()]+
    " um "+hm(k.seit)+" Uhr</b> eingestempelt und hast dich nicht abgemeldet.<br>Wann war Feierabend?";
  $("klZeit").value=k.vorschlag;
  show("screen-klaerung");
}
$("klOk").addEventListener("click",async ()=>{
  const zeit=$("klZeit").value;
  if(!zeit) return;
  const r=await fetch("/api/klaerung",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({zeit})});
  const d=await r.json();
  if(!r.ok){ toast(esc(d.fehler||"Das hat nicht geklappt."),"out",2600); return; }
  toast("Danke! <span class='big'>Feierabend "+hm(d.ende)+" Uhr nachgetragen</span>","in");
  current.clockedIn=false; current.since=null; current.klaerung=null;
  zeigeEntscheid();
});

/* Login identifiziert nur – gestempelt wird bewusst, nie automatisch. */
function zeigeEntscheid(){
  if(current.klaerung){ zeigeKlaerung(); return; }
  $("entWho").textContent="Servus, "+current.name+"!";
  const primary=$("entPrimary"), secondary=$("entSecondary");
  if(current.clockedIn){
    $("entStatus").innerHTML="Deine Schicht läuft seit <b>"+hm(current.since)+" Uhr</b>.";
    primary.textContent="Weiter zum Arbeitsbereich";
    primary.className="ent-primary weiter";
    primary.onclick=()=>{ nachLogin(); };
    secondary.textContent="Schicht beenden & abmelden";
    secondary.className="ent-secondary ende";
    secondary.onclick=async ()=>{
      const d=await stamp("out");
      if(!d) return;
      toast("Pfiat di, "+esc(current.name)+"! <span class='big'>Ausgestempelt "+hm(d.ts)+" Uhr</span>","out");
      sessionEnde();
    };
  }else{
    $("entStatus").textContent="Schön, dass du da bist. Möchtest du deine Schicht starten?";
    primary.textContent="Schicht starten";
    primary.className="ent-primary start";
    primary.onclick=async ()=>{
      const d=await stamp("in");
      if(!d) return;
      current.clockedIn=true; current.since=d.ts;
      toast("Servus "+esc(current.name)+"! <span class='big'>Eingestempelt "+hm(d.ts)+" Uhr</span>","in");
      nachLogin();
    };
    secondary.textContent="Ohne Stempeln weiter";
    secondary.className="ent-secondary";
    secondary.onclick=()=>{ nachLogin(); };
  }
  show("screen-entscheid");
}
$("entAbbruch").addEventListener("click",sessionEnde);
function renderHome(){
  $("homeWho").textContent="Servus, "+current.name;
  { const w=$("mkWho"); if(w) w.textContent="Servus, "+current.name; }
  { const mb=$("menuBack"); if(mb) mb.style.display="none"; }
  // Werkzeug-Karten nach den Fähigkeiten der eigenen Rolle (Capability-Bundles).
  const caps=current.caps||[];
  const darf=(c)=>!c||caps.includes("*")||caps.includes(c);
  const ziel=$("tilesWerkzeuge");
  ziel.innerHTML="";
  const klon=$("tplWerkzeuge").content.cloneNode(true);
  klon.querySelectorAll("[data-cap]").forEach(a=>{ if(!darf(a.dataset.cap)) a.remove(); });
  ziel.appendChild(klon);
  if(current.clockedIn){
    $("statLbl").textContent="Eingestempelt seit";
    $("statSince").textContent=hm(current.since)+" Uhr";
    $("statDur").style.display="";
    $("btnStamp").textContent="Ausstempeln"; $("btnStamp").className="bigbtn out";
  }else{
    $("statLbl").textContent="Aktuell";
    $("statSince").textContent="Ausgestempelt";
    $("statDur").style.display="none";
    $("btnStamp").textContent="Einstempeln"; $("btnStamp").className="bigbtn in";
  }
  updateDuration();
  ladeAblaufHome();
}
function updateDuration(){
  if(!current||!current.clockedIn) return;
  let s=Math.max(0,Math.floor((Date.now()-current.since)/1000));
  const h=Math.floor(s/3600); s-=h*3600; const m=Math.floor(s/60); s-=m*60;
  $("statDur").textContent=p2(h)+":"+p2(m)+":"+p2(s);
}

/* ---------- Ein-/Ausstempeln (Server prüft das ±2-h-Fenster der Schicht) ---------- */
async function stamp(expected){
  const r=await fetch("/api/stamp",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  const d=await r.json(); // {name,type,ts} oder {fehler,klaerung?}
  if(!r.ok){
    if(d.klaerung){ current.klaerung=d.klaerung; zeigeKlaerung(); }
    else toast(esc(d.fehler||"Das geht gerade nicht."),"out",3200);
    return null;
  }
  return d;
}
$("btnStamp").addEventListener("click",async ()=>{
  if(!current) return;
  if(current.clockedIn){
    const d=await stamp("out");
    if(!d) return;
    current.clockedIn=false;
    toast("Pfiat di, "+esc(current.name)+"! <span class='big'>Ausgestempelt "+hm(d.ts)+" Uhr</span>","out");
    setTimeout(sessionEnde,1600);
  }else{
    const d=await stamp("in");
    if(!d) return;
    current.clockedIn=true; current.since=d.ts;
    toast("Willkommen zurück! <span class='big'>Eingestempelt "+hm(d.ts)+" Uhr</span>","in");
    renderHome();
  }
});
function sessionEnde(){ fetch("/api/session",{method:"DELETE"}); current=null; show("screen-login"); }
$("btnLogout").addEventListener("click",sessionEnde);

/* ---------- Platzhalter-Kacheln ---------- */
document.querySelectorAll(".tile.soon").forEach(t=>{
  t.addEventListener("click",()=>toast(esc(t.dataset.soon)+" richten wir als Nächstes ein.","",1800));
});

/* ========== ABENDFÜHRUNG: Aufbau / Leerlauf / Abbau ========== */
const AB_LABEL={aufbau:"Aufbau",leerlauf:"Aufgaben bei Leerlauf",abbau:"Abbau"};
const AB_KURZ={aufbau:"Aufbau",leerlauf:"Leerlauf",abbau:"Abbau"};
function heute(){ const d=new Date(); return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }

/* --- Home: Reservierungs-Hintergrund (Tischplan-Platzhalter) --- */
async function ladeTischplan(){
  const bg=$("tischplan-bg"); if(!bg) return;
  let liste=[], u=null;
  try{
    const [a,b]=await Promise.all([
      fetch("/api/reservierungen?datum="+heute()).then(r=>r.json()),
      fetch("/api/reservierungen-uebersicht?datum="+heute()).then(r=>r.json()),
    ]);
    liste=Array.isArray(a)?a:[]; u=b;
  }catch(e){ return; }
  const aktiv=liste.filter(r=>r.status==="offen"||r.status==="bestaetigt");
  let html='<div class="tp-kopf">Tischplan heute</div>';
  if(u&&!u.fehler) html+='<div class="tp-kpi">'+(u.gaeste||0)+' Gäste · '+(u.reservierungen||0)+' Reservierungen · drinnen '+(u.drinnen||0)+' / draußen '+(u.draussen||0)+'</div>';
  if(!aktiv.length) html+='<div class="tp-leer">Heute noch keine Reservierungen.</div>';
  else for(const r of aktiv){
    html+='<div class="tp-res"><span class="tp-zeit">'+esc(r.zeit)+'</span><span class="tp-name">'+esc(r.name)+'</span><span class="tp-det">'+r.personen+' Pers. · '+(r.bereich==="draussen"?"Draußen":"Drinnen")+'</span></div>';
  }
  bg.innerHTML=html;
}

/* --- Home: Banner + Prozess-Buttons aus dem Tages-Status --- */
async function ladeAblaufHome(){
  let st;
  try{ st=await fetch("/api/ablauf/status?datum="+heute()).then(r=>r.json()); }catch(e){ return null; }
  if(!st||st.fehler) return null;
  const b=$("ablaufBanner");
  if(st.aufbau.total>0 && !st.aufbau.fertig){
    b.style.display="";
    b.innerHTML='<span class="b-txt">Aufbau noch offen · '+st.aufbau.done+'/'+st.aufbau.total+' erledigt</span><span class="b-go">Fortsetzen ›</span>';
  }else b.style.display="none";
  $("prozesse").innerHTML=["aufbau","leerlauf","abbau"].map(p=>{
    const s=st[p]||{done:0,total:0,fertig:false};
    const ok=s.total>0 && s.fertig;
    return '<div class="proz'+(ok?" fertig":"")+'" data-proz="'+p+'"><div class="pt">'+AB_KURZ[p]+'</div>'+
      '<div class="pp'+(ok?" ok":"")+'">'+(s.total?(ok?"✓ fertig":s.done+"/"+s.total):"—")+'</div></div>';
  }).join("");
  return st;
}

/* --- Vorschlag direkt nach Login --- */
function zeigeVorschlag(st){
  $("vkText").textContent = st.aufbau.done>0
    ? "Der Aufbau ist noch nicht fertig ("+st.aufbau.done+"/"+st.aufbau.total+"). Weitermachen?"
    : "Sollen wir den Aufbau gemeinsam durchgehen?";
  $("vorschlag").style.display="";
}
async function nachLogin(){
  renderHome(); show("screen-home");
  const st=await fetch("/api/ablauf/status?datum="+heute()).then(r=>r.json()).catch(()=>null);
  if(st&&!st.fehler&&st.aufbau.total>0&&!st.aufbau.fertig) zeigeVorschlag(st);
}
$("vkStart").addEventListener("click",()=>{ $("vorschlag").style.display="none"; starteAblauf("aufbau"); });
$("vkSpaeter").addEventListener("click",()=>{ $("vorschlag").style.display="none"; });
$("ablaufBanner").addEventListener("click",()=>starteAblauf("aufbau"));
$("prozesse").addEventListener("click",e=>{ const c=e.target.closest("[data-proz]"); if(c){ $("menuBack").style.display="none"; starteAblauf(c.dataset.proz); } });

/* --- HuH-Menü (Ecke) --- */
$("btnMenu").addEventListener("click",()=>{ $("menuBack").style.display="flex"; });
$("mkClose").addEventListener("click",()=>{ $("menuBack").style.display="none"; });
$("menuBack").addEventListener("click",e=>{ if(e.target.id==="menuBack") $("menuBack").style.display="none"; });

/* --- Ablauf-Runner --- */
let abProzess="aufbau", abDaten=null;
async function starteAblauf(prozess){
  abProzess=prozess;
  $("abTitel").textContent=AB_LABEL[prozess];
  $("abUnterbrechen").textContent=AB_KURZ[prozess]+" unterbrechen";
  $("ckTitel").textContent=AB_KURZ[prozess]+" unterbrechen?";
  await ladeAblauf();
  show("screen-ablauf");
}
async function ladeAblauf(){
  abDaten=await fetch("/api/ablauf?prozess="+abProzess+"&datum="+heute()).then(r=>r.json());
  renderAblauf();
}
function renderAblauf(){
  const aufg=(abDaten&&abDaten.aufgaben)||[];
  const done=aufg.filter(a=>a.erledigt).length;
  $("abFort").textContent=done+"/"+aufg.length;
  const aktiv=aufg.find(a=>!a.erledigt);
  const aktivId=aktiv?aktiv.id:null;
  let html="", letzteGruppe=null;
  for(const a of aufg){
    if(a.gruppe && a.gruppe!==letzteGruppe){ html+='<div class="ab-gruppe">'+esc(a.gruppe)+'</div>'; letzteGruppe=a.gruppe; }
    const zustand=a.erledigt?"fertig":(a.id===aktivId?"aktiv":"kommt");
    html+='<div class="ab-task '+zustand+'"><div class="tt"><span class="ab-check">'+(a.erledigt?"✓":"")+'</span>'+esc(a.titel)+'</div>';
    if(zustand==="aktiv"){
      if(a.info) html+='<div class="ab-info">'+esc(a.info)+'</div>';
      html+='<button class="ab-erledigt" data-erledigt="'+a.id+'">Erledigt ✓</button>';
    }
    html+='</div>';
  }
  $("ablaufBody").innerHTML=html || '<div class="tp-leer" style="padding:20px">Für diesen Ablauf sind noch keine Aufgaben hinterlegt.</div>';
}
$("ablaufBody").addEventListener("click",async e=>{
  const b=e.target.closest("[data-erledigt]"); if(!b) return;
  b.disabled=true;
  await fetch("/api/ablauf/erledigt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({aufgabe_id:b.dataset.erledigt,datum:heute()})});
  await ladeAblauf();
  const aufg=(abDaten&&abDaten.aufgaben)||[];
  const rest=aufg.filter(a=>!a.erledigt).length;
  if(aufg.length>0 && rest===0){
    if(abProzess==="aufbau") toast("Aufbau fertig! <span class='big'>Der Tischplan ist bereit</span>","in",2600);
    else toast(AB_KURZ[abProzess]+" abgeschlossen. Danke!","in",2000);
    setTimeout(zurueckHome,1400);
  }
});
$("abZurueck").addEventListener("click",zurueckHome);
$("abUnterbrechen").addEventListener("click",()=>{ $("abConfirm").style.display=""; });
$("abConfirmNein").addEventListener("click",()=>{ $("abConfirm").style.display="none"; });
$("abConfirmJa").addEventListener("click",()=>{ $("abConfirm").style.display="none"; zurueckHome(); });
function zurueckHome(){ renderHome(); show("screen-home"); }
</script>
</body>
</html>`;
