import { baseCss } from "./styles";

export const terminalPage = /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Hand aufs Herz – Team-Terminal</title>
<style>
${baseCss}
  body{ -webkit-user-select:none; user-select:none; }
  .screen{display:none; min-height:100vh; flex-direction:column; align-items:center; padding:2vh 4vw 4vh;}
  .screen.active{display:flex;}

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

  /* Bestätigungs-Screen */
  #screen-confirm{justify-content:center; gap:6px;}
  .who{font-family:var(--serif); font-size:clamp(28px,8vw,44px); color:var(--wald); text-align:center;}
  .role{color:var(--clay); font-size:16px; margin-bottom:1rem;}
  .statuscard{background:var(--card); border:1px solid var(--line); border-radius:18px; padding:22px 26px; text-align:center; width:min(420px,88vw); margin-bottom:20px;}
  .statuscard .lbl{font-size:13px; color:var(--grey); letter-spacing:.5px; text-transform:uppercase;}
  .statuscard .since{font-family:var(--serif); font-size:clamp(20px,5vw,26px); color:var(--wald); margin:6px 0;}
  .statuscard .dur{font-variant-numeric:tabular-nums; font-size:clamp(30px,9vw,46px); font-family:var(--serif);}
  .bigbtn{display:block; width:min(420px,88vw); border:none; border-radius:16px; padding:20px; font-size:clamp(18px,5vw,22px); font-weight:600; color:#fff; cursor:pointer; letter-spacing:.3px;}
  .bigbtn.in{background:var(--wald);} .bigbtn.out{background:var(--clay);}
  .cancel{margin-top:14px; background:none; border:1px solid var(--line); color:var(--grey); border-radius:10px; padding:10px 16px; cursor:pointer; font-size:14px;}

  .toast{position:fixed; left:50%; top:50%; transform:translate(-50%,-50%) scale(.9);
    background:var(--wald); color:#fff; padding:26px 34px; border-radius:20px;
    font-size:clamp(18px,4.5vw,24px); text-align:center; box-shadow:0 12px 40px rgba(0,0,0,.25);
    opacity:0; pointer-events:none; transition:opacity .25s, transform .25s; z-index:50; max-width:88vw;}
  .toast.show{opacity:1; transform:translate(-50%,-50%) scale(1);}
  .toast.out{background:var(--clay);}
  .toast .big{font-family:var(--serif); font-size:1.4em; display:block; margin-top:6px;}
</style>
</head>
<body>

<section id="screen-login" class="screen active">
  <img class="logo" src="/logo.png" alt="Hand aufs Herz">
  <div class="clockwrap">
    <div class="clock" id="bigClock">--:--<span class="sec">:--</span></div>
    <div class="date" id="bigDate">&nbsp;</div>
  </div>
  <div class="prompt">Mit <b>4-stelligem PIN</b> ein- und ausstempeln</div>
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

<section id="screen-confirm" class="screen">
  <div class="who" id="cWho">Servus</div>
  <div class="role" id="cRole"></div>
  <div class="statuscard">
    <div class="lbl" id="cLbl">Status</div>
    <div class="since" id="cSince">--:--</div>
    <div class="dur" id="cDur"></div>
  </div>
  <button class="bigbtn in" id="cAction">Einstempeln</button>
  <button class="cancel" id="cCancel">Abbrechen</button>
</section>

<div class="toast" id="toast"></div>

<script>
"use strict";
const WD=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MO=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const p2=n=>String(n).padStart(2,"0");
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function hms(ms){ const s=Math.max(0,Math.floor(ms/1000)); return p2(Math.floor(s/3600))+":"+p2(Math.floor(s/60)%60)+":"+p2(s%60); }
function hm(ts){ const d=new Date(ts); return p2(d.getHours())+":"+p2(d.getMinutes()); }

/* Uhr */
function tick(){
  const d=new Date();
  $("bigClock").innerHTML=p2(d.getHours())+":"+p2(d.getMinutes())+'<span class="sec">:'+p2(d.getSeconds())+'</span>';
  $("bigDate").textContent=WD[d.getDay()]+", "+d.getDate()+". "+MO[d.getMonth()]+" "+d.getFullYear();
  if($("screen-confirm").classList.contains("active") && current && current.clockedIn){
    $("cDur").textContent=hms(Date.now()-current.since);
  }
}
setInterval(tick,250); tick();

function show(id){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); $(id).classList.add("active"); }

let toastT=null;
function toast(html,kind){ const t=$("toast"); t.className="toast show"+(kind==="out"?" out":""); t.innerHTML=html; clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2200); }

/* PIN-Pad */
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

/* Lookup + Bestätigung */
let current=null;
async function submit(){
  if(entry.length!==4){ pinFail(); return; }
  const pin=entry;
  const res=await fetch("/api/lookup?pin="+encodeURIComponent(pin));
  if(!res.ok){ pinFail(); return; }
  current=await res.json();
  entry=""; renderDots();
  showConfirm();
}
function showConfirm(){
  $("cWho").textContent="Servus, "+current.name;
  $("cRole").textContent=current.role||"";
  const act=$("cAction");
  if(current.clockedIn){
    $("cLbl").textContent="Eingestempelt seit";
    $("cSince").textContent=hm(current.since)+" Uhr";
    $("cDur").textContent=hms(Date.now()-current.since);
    act.textContent="Ausstempeln"; act.className="bigbtn out";
  }else{
    $("cLbl").textContent="Aktuell";
    $("cSince").textContent="ausgestempelt";
    $("cDur").textContent="";
    act.textContent="Einstempeln"; act.className="bigbtn in";
  }
  show("screen-confirm");
}
$("cAction").addEventListener("click",async ()=>{
  const r=await fetch("/api/stamp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:current.pin})});
  if(!r.ok){ toast("Fehler beim Stempeln","out"); return; }
  const d=await r.json();
  if(d.type==="in") toast("Servus "+esc(current.name)+"! <span class='big'>Eingestempelt "+hm(d.ts)+" Uhr</span>","in");
  else toast("Bis bald, "+esc(current.name)+"! <span class='big'>Ausgestempelt "+hm(d.ts)+" Uhr</span>","out");
  current=null;
  setTimeout(()=>show("screen-login"),1600);
});
$("cCancel").addEventListener("click",()=>{ current=null; show("screen-login"); });
</script>
</body>
</html>`;
