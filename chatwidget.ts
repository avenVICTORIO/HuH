// Globales Chat-Widget: runder Knopf unten mittig, öffnet den Team-Chat als
// Overlay – auf jeder Seite des Team-Bereichs und am Terminal. Keine eigene Route.
// Mobil: Raumliste als einklappbare Schublade (☰ im Chat-Kopf).
//
// Einbindung: ${chatWidgetCss} ins <style>, ${chatWidgetHtml} vor <script>,
// ${chatWidgetJs} am Anfang des Inline-Scripts. Die Seite ruft
//   chatWidget.init({ meId, admin, senden })   nach dem Login
//   chatWidget.ereignis(d)                     für Live-Ereignisse (chat.*, team)
//   chatWidget.nachziehen()                    nach einem WebSocket-Reconnect
//   chatWidget.aus()                           beim Abmelden

export const chatWidgetCss = /* css */ `
  /* ---- Chat-Widget: Knopf ---- */
  .chat-fab{position:fixed; left:50%; bottom:calc(18px + env(safe-area-inset-bottom)); transform:translateX(-50%); z-index:35;
    width:62px; height:62px; border-radius:50%; border:none; background:var(--wald); color:#fff; cursor:pointer;
    display:flex; align-items:center; justify-content:center; box-shadow:0 14px 32px -10px rgba(60,74,59,.65); transition:transform .12s;}
  .chat-fab:active{transform:translateX(-50%) scale(.95);}
  .chat-fab svg{width:28px; height:28px;}
  .chat-fab-badge{position:absolute; top:-4px; right:-6px; min-width:22px; padding:2px 6px; border-radius:999px;
    background:var(--amber); color:#fff; font-size:12px; font-weight:700; text-align:center; font-family:var(--sans); box-shadow:0 0 0 2px var(--creme);}
  body:has(.chat-fab:not([hidden])){padding-bottom:96px;}
  .chat-fab[hidden], .chat-overlay[hidden]{display:none;}
  /* Solange der Chat offen ist, tritt der Seiten-Hamburger (Team-Bereich, mobil) zurück. */
  body.chat-offen .nav-knopf, body.chat-offen .chat-fab{display:none;}

  /* ---- Chat-Widget: Overlay ---- */
  .chat-overlay{position:fixed; inset:0; z-index:60; background:rgba(34,38,31,.45); display:flex; align-items:center; justify-content:center; padding:24px;}
  .chat-panel{position:relative; display:grid; grid-template-columns:280px minmax(0,1fr); width:min(1100px,100%); height:min(86vh,820px);
    background:var(--creme); border-radius:22px; overflow:hidden; box-shadow:0 30px 80px -30px rgba(0,0,0,.55);}
  .chat-raeume{background:var(--card); border-right:1px solid var(--line); overflow-y:auto; padding:10px;}
  .chat-raeume-titel{font-family:var(--serif); font-size:20px; color:var(--wald); padding:8px 12px 10px;}
  .chat-raum{display:block; width:100%; text-align:left; background:none; border:none; border-radius:12px; padding:11px 12px; cursor:pointer; font-family:var(--sans); color:var(--ink);}
  .chat-raum:hover{background:var(--creme);} .chat-raum.aktiv{background:var(--creme); box-shadow:inset 3px 0 0 var(--wald);}
  .cr-kopf{display:flex; align-items:center; gap:8px;}
  .cr-titel{font-family:var(--serif); font-size:17px; color:var(--wald); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .cr-badge{min-width:20px; padding:2px 7px; border-radius:999px; background:var(--amber); color:#fff; font-size:11px; font-weight:700; text-align:center;}
  .cr-unter{font-size:12.5px; color:var(--grey); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .chat-raum.ungelesen .cr-unter{color:var(--clay); font-weight:600;}
  .chat-leer{color:var(--grey); font-size:14px; padding:14px; text-align:center; font-style:italic;}
  .chat-fenster{display:flex; flex-direction:column; min-height:0; min-width:0;}
  .chat-kopf{display:flex; align-items:center; gap:10px; padding:12px 14px; border-bottom:1px solid var(--line); background:var(--card);}
  .chat-kopf-text{flex:1; min-width:0;}
  .chat-titel{font-family:var(--serif); font-size:20px; color:var(--wald); line-height:1.15; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .chat-unter{font-size:12px; color:var(--grey);}
  .chat-burger, .chat-x{background:none; border:1px solid var(--line); border-radius:10px; width:36px; height:36px; font-size:18px; cursor:pointer; color:var(--wald); line-height:1; flex:none; display:inline-flex; align-items:center; justify-content:center; font-family:var(--sans);}
  .chat-burger{display:none;}
  .chat-verlauf{flex:1; min-height:0; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:6px; background:var(--creme);}
  .chat-tag{display:flex; align-items:center; gap:10px; margin:10px 0 6px; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--grey);}
  .chat-tag::before, .chat-tag::after{content:""; flex:1; height:1px; background:var(--line);}
  .msg{max-width:min(72%,560px); padding:9px 13px 10px; border-radius:16px 16px 16px 4px; background:var(--card); border:1px solid var(--line); align-self:flex-start; box-shadow:0 1px 2px rgba(34,38,31,.04);}
  .msg.eigene{align-self:flex-end; border-radius:16px 16px 4px 16px; background:var(--wald); border-color:var(--wald); color:#fff;}
  .msg-meta{font-size:11px; color:var(--grey); margin-bottom:3px; display:flex; align-items:center; gap:6px;}
  .msg.eigene .msg-meta{color:rgba(255,255,255,.72);}
  .msg-meta b{color:var(--wald); font-weight:600;} .msg.eigene .msg-meta b{color:#fff;}
  .msg-text{font-size:15px; line-height:1.45; white-space:pre-wrap; word-break:break-word;}
  .msg.ki{background:#F3EFE6; border-color:#E2D9C6;}
  .msg.ki .msg-meta b{color:var(--amber);}
  .msg.ki .msg-meta b::before{content:"✦ "; font-size:10px;}
  .msg.tippt .msg-text::after{content:"▍"; color:var(--amber); animation:chat-blink 1s steps(1) infinite;}
  @keyframes chat-blink{50%{opacity:0;}}
  .msg-del{margin-left:auto; background:none; border:none; color:inherit; opacity:.45; cursor:pointer; font-size:14px; line-height:1; padding:0 2px;}
  .msg:hover .msg-del{opacity:.9;}
  .chat-eingabe{display:flex; gap:10px; align-items:flex-end; padding:12px; border-top:1px solid var(--line); background:var(--card);}
  .chat-eingabe textarea{flex:1; resize:none; max-height:140px; padding:11px 14px; border:1px solid var(--line); border-radius:14px; font-family:var(--sans); font-size:15px; background:var(--creme); color:var(--ink); line-height:1.4;}
  .chat-eingabe textarea:focus{outline:none; border-color:var(--wald-hell);}
  .chat-senden{width:46px; height:46px; border:none; border-radius:14px; background:var(--wald); color:#fff; font-size:18px; cursor:pointer; flex:none;}
  .chat-senden:disabled{opacity:.5;}
  .chat-liste-back{display:none;}
  @media (max-width:880px){
    .chat-overlay{padding:0;}
    .chat-panel{display:flex; flex-direction:column; width:100%; height:100%; border-radius:0;}
    .chat-fenster{flex:1;}
    /* Raumliste als Schublade von links */
    .chat-raeume{position:absolute; top:0; bottom:0; left:0; width:min(320px,84vw); z-index:3; border-right:none;
      transform:translateX(-105%); transition:transform .22s ease; box-shadow:16px 0 40px -20px rgba(0,0,0,.45);}
    .chat-panel.liste-offen .chat-raeume{transform:none;}
    .chat-liste-back{position:absolute; inset:0; z-index:2; background:rgba(34,38,31,.35);}
    .chat-panel.liste-offen .chat-liste-back{display:block;}
    .chat-burger{display:inline-flex;}
    .msg{max-width:86%;}
  }
`;

export const chatWidgetHtml = /* html */ `
<!-- ===== Chat-Widget: globaler Knopf + Overlay ===== -->
<button class="chat-fab" id="chatFab" title="Team-Chat" hidden>
  <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 10a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H18l-7 6v-6h-1a3 3 0 0 1-3-3V10Z"/><path d="M14 15h12M14 20h8"/></svg>
  <span class="chat-fab-badge" id="chatFabBadge" hidden></span>
</button>
<div class="chat-overlay" id="chatOverlay" hidden>
  <div class="chat-panel" id="chatPanel">
    <aside class="chat-raeume" id="chatRaeume"></aside>
    <div class="chat-liste-back" id="chatListeBack"></div>
    <div class="chat-fenster">
      <div class="chat-kopf">
        <button class="chat-burger" id="chatBurger" title="Chats">☰</button>
        <div class="chat-kopf-text">
          <div class="chat-titel" id="chatTitel">Chat</div>
          <div class="chat-unter" id="chatUnter"></div>
        </div>
        <button class="chat-x" id="chatSchliessen" title="Schließen">✕</button>
      </div>
      <div class="chat-verlauf" id="chatVerlauf"></div>
      <form class="chat-eingabe" id="chatForm" autocomplete="off">
        <textarea id="chatText" rows="1" maxlength="2000" placeholder="Nachricht schreiben …"></textarea>
        <button type="submit" class="chat-senden" id="chatSendenBtn" title="Senden">➤</button>
      </form>
    </div>
  </div>
</div>
`;

export const chatWidgetJs = /* js */ `
/* ===== Chat-Widget (global, Overlay; Live-Ereignisse kommen von der Seite über chatWidget.ereignis) ===== */
window.chatWidget=(function(){
  const g=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const p2=n=>String(n).padStart(2,"0");
  const hm=ts=>{ const d=new Date(ts); return p2(d.getHours())+":"+p2(d.getMinutes()); };
  const MON=["Jan","Feb","März","April","Mai","Juni","Juli","Aug","Sep","Okt","Nov","Dez"];
  const mobil=()=>window.innerWidth<=880;
  let me=null, admin=false, sendeWs=function(){};
  let raeume=[], aktiv=null, nachrichten=[], scrollErzwingen=false, offen=false, geladen=false;
  let kiTippt=null; // {raum, job, text} – die KI schreibt gerade (gestreamt über den WebSocket)

  function init(o){ me=o.meId; admin=!!o.admin; sendeWs=o.senden||function(){}; g("chatFab").hidden=false; ladeRaeume(); }
  function aus(){ schliessen(); g("chatFab").hidden=true; raeume=[]; aktiv=null; nachrichten=[]; geladen=false; me=null; badge(0); }

  function badge(n){ const b=g("chatFabBadge"); b.textContent=n>99?"99+":String(n); b.hidden=!(n>0); }
  const badgeAusRaeumen=()=>badge(raeume.reduce((s,x)=>s+(x.ungelesen||0),0));
  async function ladeRaeume(){
    if(!me) return;
    const r=await fetch("/api/chat/raeume"); if(!r.ok) return;
    raeume=await r.json(); geladen=true; renderRaeume(); badgeAusRaeumen();
  }
  function renderRaeume(){
    g("chatRaeume").innerHTML='<div class="chat-raeume-titel">Chats</div>'+(raeume.map(r=>{
      const v=r.letzte?((r.letzte.ki?"KI: ":r.letzte.eigene?"Du: ":"")+r.letzte.text.replace(/\\s+/g," ")):(r.untertitel||"");
      return '<button class="chat-raum'+(r.id===aktiv?" aktiv":"")+(r.ungelesen?" ungelesen":"")+'" data-raum="'+r.id+'">'+
        '<div class="cr-kopf"><span class="cr-titel">'+esc(r.titel)+'</span>'+(r.ungelesen?'<span class="cr-badge">'+r.ungelesen+'</span>':'')+'</div>'+
        '<div class="cr-unter">'+esc(v)+'</div></button>';
    }).join("")||'<div class="chat-leer">Keine Chats</div>');
  }
  function gelesenLokal(id){ const r=raeume.find(x=>x.id===id); if(r&&r.ungelesen){ r.ungelesen=0; renderRaeume(); badgeAusRaeumen(); } }

  async function oeffnen(){
    if(!me) return;
    offen=true; g("chatOverlay").hidden=false; document.body.classList.add("chat-offen"); schubladeZu();
    await ladeRaeume();
    if(!aktiv&&raeume.length){ const erst=raeume.find(r=>r.ungelesen)||raeume[0]; await raumOeffnen(erst.id); }
    else if(aktiv){ await hole(); gelesenLokal(aktiv); }
    if(!mobil()) g("chatText").focus();
  }
  function schliessen(){ offen=false; g("chatOverlay").hidden=true; document.body.classList.remove("chat-offen"); schubladeZu(); }
  function schubladeZu(){ g("chatPanel").classList.remove("liste-offen"); }

  async function raumOeffnen(id){
    aktiv=id; nachrichten=[]; scrollErzwingen=true;
    const r=raeume.find(x=>x.id===id);
    g("chatTitel").textContent=r?r.titel:"Chat"; g("chatUnter").textContent=r?(r.untertitel||""):"";
    renderRaeume(); schubladeZu();
    await hole(); gelesenLokal(id);
    if(!mobil()) g("chatText").focus();
  }
  async function hole(){
    if(!aktiv) return;
    const raum=aktiv;
    const r=await fetch("/api/chat/raum/"+encodeURIComponent(raum));
    if(!r.ok||raum!==aktiv) return;
    nachrichten=(await r.json()).nachrichten; renderVerlauf();
  }
  function tagLabel(d){
    const h=new Date(), gst=new Date(); gst.setDate(h.getDate()-1);
    if(d.toDateString()===h.toDateString()) return "Heute";
    if(d.toDateString()===gst.toDateString()) return "Gestern";
    return ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+", "+d.getDate()+". "+MON[d.getMonth()]+(d.getFullYear()!==h.getFullYear()?" "+d.getFullYear():"");
  }
  function renderVerlauf(){
    const v=g("chatVerlauf");
    const amEnde=v.scrollHeight-v.scrollTop-v.clientHeight<90;
    const tippt=(kiTippt&&kiTippt.raum===aktiv)?kiTippt:null;
    if(!nachrichten.length&&!tippt){ v.innerHTML='<div class="chat-leer">Noch keine Nachrichten – schreib die erste.</div>'; return; }
    let html="", tag=null;
    for(const n of nachrichten){
      const d=new Date(n.ts);
      if(d.toDateString()!==tag){ tag=d.toDateString(); html+='<div class="chat-tag"><span>'+tagLabel(d)+'</span></div>'; }
      html+='<div class="msg'+(n.eigene?" eigene":"")+(n.ki?" ki":"")+'" data-mid="'+n.id+'">'+
        '<div class="msg-meta"><b>'+(n.eigene?"Du":esc(n.von_name))+'</b><span>'+hm(n.ts)+'</span>'+
          ((n.eigene||admin)?'<button class="msg-del" data-del="'+n.id+'" title="Nachricht löschen">×</button>':'')+'</div>'+
        '<div class="msg-text">'+esc(n.text)+'</div></div>';
    }
    // Die KI schreibt gerade: Blase mit dem bisherigen Text (kommt Stück für Stück über den WebSocket).
    if(tippt) html+='<div class="msg ki tippt" data-job="'+tippt.job+'"><div class="msg-meta"><b>KI</b><span>schreibt …</span></div><div class="msg-text">'+esc(tippt.text)+'</div></div>';
    v.innerHTML=html;
    if(amEnde||scrollErzwingen){ v.scrollTop=v.scrollHeight; scrollErzwingen=false; }
  }
  async function senden(){
    const ta=g("chatText"); const text=ta.value.trim(); if(!text||!aktiv) return;
    ta.value=""; ta.style.height=""; scrollErzwingen=true; g("chatSendenBtn").disabled=true;
    try{
      const r=await fetch("/api/chat/raum/"+encodeURIComponent(aktiv),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
      if(!r.ok){ ta.value=text; alert((await r.json()).fehler||"Senden fehlgeschlagen."); return; }
      const n=await r.json();
      // Das Live-Ereignis kann schneller sein als die Antwort – nie doppelt anhängen.
      if(!nachrichten.some(x=>x.id===n.id)){ nachrichten.push(n); renderVerlauf(); }
      const rm=raeume.find(x=>x.id===aktiv); if(rm){ rm.letzte={text:n.text,ts:n.ts,eigene:true}; renderRaeume(); }
    }finally{ g("chatSendenBtn").disabled=false; ta.focus(); }
  }

  // Live-Ereignisse von der Seite (WebSocket).
  function ereignis(d){
    if(!me) return;
    if(d.typ==="team"){ if(geladen) ladeRaeume(); return; }
    if(d.typ==="chat.geloescht"){
      if(d.raum===aktiv){ const v=nachrichten.length; nachrichten=nachrichten.filter(n=>n.id!==d.id); if(nachrichten.length!==v) renderVerlauf(); }
      if(geladen) ladeRaeume(); return;
    }
    if(d.typ==="chat.tippt"){
      if(d.abbruch){ if(kiTippt&&kiTippt.job===d.job){ kiTippt=null; if(d.raum===aktiv) renderVerlauf(); } return; }
      const neu=!kiTippt||kiTippt.job!==d.job;
      kiTippt={raum:d.raum,job:d.job,text:d.text||""};
      if(offen&&d.raum===aktiv){ if(neu) scrollErzwingen=true; renderVerlauf(); }
      return;
    }
    if(d.typ!=="chat.nachricht") return;
    const n=d.nachricht; n.eigene=(n.von===me);
    if(d.job&&kiTippt&&kiTippt.job===d.job) kiTippt=null; // fertige KI-Antwort ersetzt die Tipp-Blase
    const imRaum=(offen&&d.raum===aktiv);
    if(imRaum){
      if(!nachrichten.some(x=>x.id===n.id)){ nachrichten.push(n); renderVerlauf(); }
      sendeWs({typ:"chat.gelesen",raum:d.raum});
    }
    const r=raeume.find(x=>x.id===d.raum);
    if(r){ r.letzte={text:n.text,ts:n.ts,eigene:n.eigene,ki:!!n.ki}; if(!n.eigene&&!imRaum) r.ungelesen=(r.ungelesen||0)+1; renderRaeume(); badgeAusRaeumen(); }
    else if(!n.eigene) ladeRaeume();
  }
  function nachziehen(){ if(!me) return; ladeRaeume(); if(offen&&aktiv) hole(); }

  g("chatFab").addEventListener("click",()=>offen?schliessen():oeffnen());
  g("chatSchliessen").addEventListener("click",schliessen);
  g("chatOverlay").addEventListener("click",e=>{ if(e.target.id==="chatOverlay") schliessen(); });
  g("chatBurger").addEventListener("click",()=>g("chatPanel").classList.toggle("liste-offen"));
  g("chatListeBack").addEventListener("click",schubladeZu);
  g("chatRaeume").addEventListener("click",e=>{ const b=e.target.closest("[data-raum]"); if(b) raumOeffnen(b.dataset.raum); });
  g("chatForm").addEventListener("submit",e=>{ e.preventDefault(); senden(); });
  g("chatText").addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); senden(); } });
  g("chatText").addEventListener("input",e=>{ const t=e.target; t.style.height="auto"; t.style.height=Math.min(140,t.scrollHeight)+"px"; });
  g("chatVerlauf").addEventListener("click",async e=>{
    const b=e.target.closest("[data-del]"); if(!b) return;
    if(!confirm("Nachricht löschen?")) return;
    const r=await fetch("/api/chat/nachricht/"+b.dataset.del,{method:"DELETE"});
    if(r.ok){ nachrichten=nachrichten.filter(n=>n.id!==b.dataset.del); renderVerlauf(); ladeRaeume(); }
  });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&offen) schliessen(); });

  return {init,aus,oeffnen,schliessen,ereignis,nachziehen};
})();
`;
