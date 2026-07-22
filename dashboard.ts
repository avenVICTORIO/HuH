import { baseCss } from "./styles";

export const dashboardPage = /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Team &amp; Zeiten – Hand aufs Herz</title>
<style>
${baseCss}
  .topbar{display:flex; align-items:center; gap:12px; padding:12px 18px; background:var(--card); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:5;}
  .topbar img{height:40px; width:auto;}
  .topbar .ttl{font-family:var(--serif); font-size:clamp(18px,4vw,24px); color:var(--wald); flex:1;}
  .topbar .miniclock{font-variant-numeric:tabular-nums; font-size:15px; color:var(--clay);}
  .topbar a.term{background:none; border:1px solid var(--line); color:var(--grey); border-radius:10px; padding:8px 12px; font-size:13px; text-decoration:none;}

  .tabs{display:flex; gap:8px; padding:14px 18px 0; max-width:900px; margin:0 auto; width:100%; flex-wrap:wrap;}
  .tab{padding:10px 18px; border:1px solid var(--line); border-bottom:none; border-radius:12px 12px 0 0; background:var(--creme); cursor:pointer; font-size:15px; color:var(--clay);}
  .tab.active{background:var(--card); color:var(--wald); font-weight:600;}
  .body{max-width:900px; margin:0 auto; width:100%; padding:18px; border-top:1px solid var(--line);}
  .view{display:none;} .view.active{display:block;}

  .sec-title{font-family:var(--serif); font-size:20px; color:var(--wald); margin:4px 0 12px; border-bottom:2px solid var(--line); padding-bottom:8px;}
  .sec-title:not(:first-child){margin-top:28px;}

  .card{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px 16px; margin-bottom:10px;}
  .row{display:flex; align-items:center; gap:12px;}
  .row .nm{flex:1; font-size:16px;}
  .row .nm small{display:block; color:var(--grey); font-size:12px;}
  .tag{font-size:12px; padding:3px 10px; border-radius:20px; white-space:nowrap;}
  .tag.in{background:#e7efe8; color:var(--wald);} .tag.out{background:#f0ebe4; color:var(--clay);}
  .dur{font-variant-numeric:tabular-nums; font-family:var(--serif); font-size:18px; color:var(--ink); min-width:88px; text-align:right;}
  .empty{color:var(--grey); font-size:14px; padding:14px; text-align:center;}

  .bar{height:10px; background:var(--creme); border:1px solid var(--line); border-radius:6px; overflow:hidden; margin-top:6px;}
  .bar > i{display:block; height:100%; background:var(--wald);}

  .ranges{display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;}
  .range{padding:8px 14px; border:1px solid var(--line); border-radius:20px; background:var(--card); cursor:pointer; font-size:14px; color:var(--clay);}
  .range.active{background:var(--wald); color:#fff; border-color:var(--wald);}
  .totalline{display:flex; justify-content:space-between; font-size:14px; color:var(--grey); margin:10px 2px 0;}

  .miniform{display:flex; gap:8px; flex-wrap:wrap; margin:12px 0;}
  .miniform input{padding:11px 12px; border:1px solid var(--line); border-radius:10px; font-size:15px; font-family:var(--sans);}
  .miniform input.nm{flex:1; min-width:140px;} .miniform input.rl{width:150px;}
  .miniform input.pn{width:90px; letter-spacing:2px; font-variant-numeric:tabular-nums;}
  .miniform button{background:var(--wald); color:#fff; border:none; border-radius:10px; padding:11px 16px; font-size:15px; cursor:pointer;}
  .pin{font-variant-numeric:tabular-nums; letter-spacing:2px; color:var(--clay); font-size:15px; white-space:nowrap;}
  .iconbtn{border:none; background:none; cursor:pointer; font-size:14px; padding:6px 8px;}
  .iconbtn.edit{color:var(--wald);} .iconbtn.del{color:var(--rot);}
  .rowinput{padding:8px 10px; border:1px solid var(--line); border-radius:8px; font-size:14px;}
  .rowinput.nm{flex:1; min-width:100px;} .rowinput.rl{width:130px;} .rowinput.pn{width:70px; letter-spacing:2px;}
  .hint{font-size:13px; color:var(--grey); margin:2px 0 10px; line-height:1.5;}

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
</style>
</head>
<body>
<div class="topbar">
  <img src="/logo.png" alt="Hand aufs Herz">
  <div class="ttl">Team &amp; Zeiten</div>
  <div class="miniclock" id="clock">--:--:--</div>
  <a class="term" href="/">Terminal ›</a>
</div>

<div class="tabs">
  <div class="tab active" data-v="heute">Heute · Live</div>
  <div class="tab" data-v="auswertung">Auswertung</div>
  <div class="tab" data-v="team">Team</div>
</div>

<div class="body">
  <!-- ===== VIEW 1: HEUTE / LIVE ===== -->
  <section class="view active" id="v-heute">
    <div class="sec-title">Wer ist gerade da?</div>
    <div id="presentList"><div class="empty">lädt …</div></div>
    <div class="sec-title">Heute gearbeitet</div>
    <div id="todayList"><div class="empty">lädt …</div></div>
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
    <p class="hint">Name, Rolle und 4-stelligen PIN vergeben. Jeder PIN darf nur einmal existieren – damit stempelt der Mitarbeiter am Terminal ein und aus.</p>
    <div id="teamList"><div class="empty">lädt …</div></div>
    <div class="miniform">
      <input class="nm" id="newName" placeholder="Name (z. B. Anna)" maxlength="24">
      <input class="rl" id="newRole" placeholder="Rolle (z. B. Service)" maxlength="24">
      <input class="pn" id="newPin" placeholder="PIN" inputmode="numeric" maxlength="4">
      <button id="btnAdd">+ Hinzufügen</button>
    </div>
  </section>
</div>

<script>
"use strict";
const p2=n=>String(n).padStart(2,"0");
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function hms(ms){ const s=Math.max(0,Math.floor(ms/1000)); return p2(Math.floor(s/3600))+":"+p2(Math.floor(s/60)%60)+":"+p2(s%60); }
function hhmm(ms){ const m=Math.max(0,Math.round(ms/60000)); return Math.floor(m/60)+" h "+p2(m%60)+" min"; }
function hm(ts){ const d=new Date(ts); return p2(d.getHours())+":"+p2(d.getMinutes()); }

/* Uhr */
setInterval(()=>{ const d=new Date(); $("clock").textContent=p2(d.getHours())+":"+p2(d.getMinutes())+":"+p2(d.getSeconds()); },1000);

/* Tabs */
let activeView="heute";
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  t.classList.add("active"); $("v-"+t.dataset.v).classList.add("active");
  activeView=t.dataset.v;
  if(activeView==="heute") loadHeute();
  if(activeView==="auswertung") loadReport();
  if(activeView==="team") loadTeam();
}));

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

/* ===== VIEW 3: TEAM (CRUD) ===== */
let editId=null;
async function loadTeam(){
  const list=await fetch("/api/mitarbeiter").then(x=>x.json());
  $("teamList").innerHTML = list.length ? list.map(m=>{
    if(m.id===editId){
      return '<div class="card row">'+
        '<input class="rowinput nm" id="eName" value="'+esc(m.name)+'">'+
        '<input class="rowinput rl" id="eRole" value="'+esc(m.role)+'">'+
        '<input class="rowinput pn" id="ePin" value="'+esc(m.pin)+'" maxlength="4" inputmode="numeric">'+
        '<button class="iconbtn edit" data-save="'+m.id+'">Speichern</button>'+
        '<button class="iconbtn del" data-cancel>Abbrechen</button></div>';
    }
    return '<div class="card row"><div class="nm">'+esc(m.name)+'<small>'+esc(m.role)+'</small></div>'+
      '<span class="pin">PIN '+esc(m.pin)+'</span>'+
      '<button class="iconbtn edit" data-edit="'+m.id+'">Bearbeiten</button>'+
      '<button class="iconbtn del" data-del="'+m.id+'">Löschen</button></div>';
  }).join("") : '<div class="empty">Noch keine Mitarbeiter</div>';
}
$("teamList").addEventListener("click",async e=>{
  const t=e.target;
  if(t.dataset.edit){ editId=t.dataset.edit; return loadTeam(); }
  if(t.dataset.cancel!==undefined){ editId=null; return loadTeam(); }
  if(t.dataset.del){ if(confirm("Mitarbeiter wirklich löschen? Auch die Zeiten werden entfernt.")){ await fetch("/api/mitarbeiter/"+t.dataset.del,{method:"DELETE"}); loadTeam(); } return; }
  if(t.dataset.save){
    const body={name:$("eName").value.trim(),role:$("eRole").value.trim(),pin:$("ePin").value.trim()};
    const r=await fetch("/api/mitarbeiter/"+t.dataset.save,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok){ alert((await r.json()).error||"Fehler"); return; }
    editId=null; loadTeam();
  }
});
$("btnAdd").addEventListener("click",async ()=>{
  const body={name:$("newName").value.trim(),role:$("newRole").value.trim(),pin:$("newPin").value.trim()};
  if(!body.name||!body.role){ alert("Name und Rolle sind Pflicht"); return; }
  const r=await fetch("/api/mitarbeiter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){ alert((await r.json()).error||"Fehler"); return; }
  $("newName").value=""; $("newRole").value=""; $("newPin").value=""; loadTeam();
});

loadHeute();
</script>
</body>
</html>`;
