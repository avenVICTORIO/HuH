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

<!-- ============ LOGIN ============ -->
<section id="screen-login" class="screen active">
  <img class="logo" src="/logo.png" alt="Hand aufs Herz">
  <div class="clockwrap">
    <div class="clock" id="bigClock">--:--<span class="sec">:--</span></div>
    <div class="date" id="bigDate">&nbsp;</div>
  </div>
  <div class="prompt">Mit <b>4-stelligem PIN</b> anmelden</div>
  <div class="dots" id="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  <div class="pad" id="pad">
    <div class="key" data-k="1">1</div><div class="key" data-k="2">2</div><div class="key" data-k="3">3</div>
    <div class="key" data-k="4">4</div><div class="key" data-k="5">5</div><div class="key" data-k="6">6</div>
    <div class="key" data-k="7">7</div><div class="key" data-k="8">8</div><div class="key" data-k="9">9</div>
    <div class="key action clear" data-k="clear">Löschen</div><div class="key" data-k="0">0</div>
    <div class="key action enter" data-k="enter">OK</div>
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
  <div class="topbar">
    <img src="/logo.png" alt="Hand aufs Herz">
    <div class="who" id="homeWho">Servus</div>
    <div class="miniclock" id="homeClock">--:--:--</div>
    <button class="btn-logout" id="btnLogout">Abmelden</button>
  </div>
  <div class="home-body">
    <div class="statuscard" id="statusCard">
      <div class="lbl" id="statLbl">Eingestempelt seit</div>
      <div class="since" id="statSince">--:--</div>
      <div class="dur" id="statDur">00:00:00</div>
      <button class="bigbtn out" id="btnStamp">Ausstempeln</button>
    </div>
    <template id="tplMitarbeiter">
      <a class="tile werkzeug" href="/team#meine-schichten"><span class="ico">${teamIcons.schichtplan}</span><span class="t">Meine Schichten</span></a>
    </template>
    <template id="tplWerkzeuge">
      <a class="tile werkzeug" href="/team#meine-zeiten"><span class="ico">${teamIcons.zeiten}</span><span class="t">Meine Zeiten</span></a>
      <a class="tile werkzeug" href="/team#reservierungen"><span class="ico">${teamIcons.reservierung}</span><span class="t">Reservierungen</span></a>
      <a class="tile werkzeug" href="/team#inventur"><span class="ico">${teamIcons.inventur}</span><span class="t">Inventur</span></a>
      <a class="tile werkzeug" href="/team#rezepte"><span class="ico">${teamIcons.drinks}</span><span class="t">Rezepte</span></a>
    </template>
    <template id="tplAdmin">
      <a class="tile werkzeug" href="/team#heute"><span class="ico">${teamIcons.live}</span><span class="t">Heute · Live</span></a>
      <a class="tile werkzeug" href="/team#schichtplan"><span class="ico">${teamIcons.schichtplan}</span><span class="t">Schichtplan</span></a>
      <a class="tile werkzeug" href="/team#auswertung"><span class="ico">${teamIcons.auswertung}</span><span class="t">Auswertung</span></a>
      <a class="tile werkzeug" href="/team#karte"><span class="ico">${teamIcons.handbuch}</span><span class="t">Karte</span></a>
      <a class="tile werkzeug" href="/team#team"><span class="ico">${teamIcons.team}</span><span class="t">Team</span></a>
    </template>
    <div class="tiles" id="tilesWerkzeuge"></div>
    <div class="tiles-trenner">Bald verfügbar</div>
    <div class="tiles">
      <div class="tile soon" data-soon="Aufgaben"><span class="ico">${teamIcons.aufgaben}</span><span class="t">Aufgaben</span><div class="badge-soon">kommt bald</div></div>
      <div class="tile soon" data-soon="Handbuch"><span class="ico">${teamIcons.handbuch}</span><span class="t">Handbuch</span><div class="badge-soon">kommt bald</div></div>
      <div class="tile soon" data-soon="Anleitungen"><span class="ico">${teamIcons.anleitungen}</span><span class="t">Anleitungen</span><div class="badge-soon">kommt bald</div></div>
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

/* ---------- PIN-Pad ---------- */
let entry=""; const dotsEl=$("dots");
function renderDots(){ dotsEl.querySelectorAll(".dot").forEach((d,i)=>d.classList.toggle("filled",i<entry.length)); }
function pinFail(){ dotsEl.classList.add("error"); setTimeout(()=>{entry="";dotsEl.classList.remove("error");renderDots();},500); }
function press(k){
  if(k==="clear"){ entry=""; dotsEl.classList.remove("error"); renderDots(); return; }
  if(k==="enter"){ submit(); return; }
  if(entry.length>=4) return;
  dotsEl.classList.remove("error"); entry+=k; renderDots();
  if(entry.length===4) setTimeout(submit,160);
}
$("pad").addEventListener("click",e=>{ const k=e.target.closest(".key"); if(k) press(k.dataset.k); });
window.addEventListener("keydown",e=>{
  if(!$("screen-login").classList.contains("active")) return;
  if(e.key>="0"&&e.key<="9") press(e.key);
  else if(e.key==="Enter") press("enter");
  else if(e.key==="Backspace"||e.key==="Escape") press("clear");
});

/* ---------- Anmeldung ---------- */
let current=null; // {id,name,role,pin,clockedIn,since}
async function submit(){
  if(entry.length!==4){ pinFail(); return; }
  const pin=entry; entry=""; renderDots();
  // Login = Session-Cookie setzen; damit kennt auch das Dashboard die Rolle.
  const res=await fetch("/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin})});
  if(!res.ok){ pinFail(); return; }
  current=await res.json();
  zeigeEntscheid();
}

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
    primary.onclick=()=>{ renderHome(); show("screen-home"); };
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
      renderHome(); show("screen-home");
    };
    secondary.textContent="Ohne Stempeln weiter";
    secondary.className="ent-secondary";
    secondary.onclick=()=>{ renderHome(); show("screen-home"); };
  }
  show("screen-entscheid");
}
$("entAbbruch").addEventListener("click",sessionEnde);
function renderHome(){
  $("homeWho").textContent="Servus, "+current.name;
  // Werkzeug-Karten nach Rolle: alle sehen Zeiten + Reservierungen, Admins alles.
  const ziel=$("tilesWerkzeuge");
  ziel.innerHTML="";
  if(!current.admin) ziel.appendChild($("tplMitarbeiter").content.cloneNode(true));
  ziel.appendChild($("tplWerkzeuge").content.cloneNode(true));
  if(current.admin) ziel.appendChild($("tplAdmin").content.cloneNode(true));
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
}
function updateDuration(){
  if(!current||!current.clockedIn) return;
  let s=Math.max(0,Math.floor((Date.now()-current.since)/1000));
  const h=Math.floor(s/3600); s-=h*3600; const m=Math.floor(s/60); s-=m*60;
  $("statDur").textContent=p2(h)+":"+p2(m)+":"+p2(s);
}

/* ---------- Ein-/Ausstempeln (Server prüft das ±2-h-Fenster der Schicht) ---------- */
async function stamp(expected){
  const r=await fetch("/api/stamp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:current.pin})});
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
</script>
</body>
</html>`;
