import { baseCss } from "./styles";

export const terminalPage = /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<title>Hand aufs Herz – Team-Terminal</title>
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
  .tile .ico{font-size:34px; display:block; margin-bottom:8px;}
  .tile .t{font-family:var(--serif); font-size:19px; color:var(--wald);}
  .tile.soon{opacity:.85;}
  .badge-soon{display:inline-block; margin-top:6px; font-size:11px; background:var(--creme); color:var(--clay); border:1px solid var(--line); border-radius:20px; padding:2px 10px;}

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
  <div class="loginfoot">Hand aufs Herz · Team-Terminal &nbsp;·&nbsp; <a href="/dashboard">Team &amp; Zeiten</a></div>
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
    <div class="tiles">
      <div class="tile soon" data-soon="Aufgaben"><span class="ico">✅</span><span class="t">Aufgaben</span><div class="badge-soon">kommt bald</div></div>
      <div class="tile soon" data-soon="Handbuch"><span class="ico">📖</span><span class="t">Handbuch</span><div class="badge-soon">kommt bald</div></div>
      <div class="tile soon" data-soon="Anleitungen"><span class="ico">🧽</span><span class="t">Anleitungen</span><div class="badge-soon">kommt bald</div></div>
      <div class="tile soon" data-soon="Rezepte &amp; Drinks"><span class="ico">🍸</span><span class="t">Rezepte &amp; Drinks</span><div class="badge-soon">kommt bald</div></div>
    </div>
  </div>
</section>

<div class="toast" id="toast"></div>

<script>
"use strict";
const WD=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MO=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const ADMIN_PIN="0009"; // öffnet Team & Zeiten (Dashboard)
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
  if(pin===ADMIN_PIN){ location.href="/dashboard"; return; }
  const res=await fetch("/api/lookup?pin="+encodeURIComponent(pin));
  if(!res.ok){ pinFail(); return; }
  current=await res.json();
  await loginEmployee();
}
async function loginEmployee(){
  // Ankommen = automatisch einstempeln, falls noch nicht eingestempelt.
  if(!current.clockedIn){
    const d=await stamp("in");
    current.clockedIn=true; current.since=d.ts;
    toast("Servus "+esc(current.name)+"! <span class='big'>Eingestempelt "+hm(d.ts)+" Uhr</span>","in");
  }
  renderHome();
  show("screen-home");
}
function renderHome(){
  $("homeWho").textContent="Servus, "+current.name;
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

/* ---------- Ein-/Ausstempeln ---------- */
async function stamp(expected){
  const r=await fetch("/api/stamp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:current.pin})});
  return r.json(); // {name,type,ts}
}
$("btnStamp").addEventListener("click",async ()=>{
  if(!current) return;
  if(current.clockedIn){
    const d=await stamp("out");
    current.clockedIn=false;
    toast("Pfiat di, "+esc(current.name)+"! <span class='big'>Ausgestempelt "+hm(d.ts)+" Uhr</span>","out");
    setTimeout(()=>{ current=null; show("screen-login"); },1600);
  }else{
    const d=await stamp("in");
    current.clockedIn=true; current.since=d.ts;
    toast("Willkommen zurück! <span class='big'>Eingestempelt "+hm(d.ts)+" Uhr</span>","in");
    renderHome();
  }
});
$("btnLogout").addEventListener("click",()=>{ current=null; show("screen-login"); });

/* ---------- Platzhalter-Kacheln ---------- */
document.querySelectorAll(".tile.soon").forEach(t=>{
  t.addEventListener("click",()=>toast(esc(t.dataset.soon)+" richten wir als Nächstes ein 🙂","",1800));
});
</script>
</body>
</html>`;
