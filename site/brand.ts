// Marken-Fundament der öffentlichen Website: Farben, Typo, Grundraster.
// Das interne Terminal behält sein eigenes Theme (styles.ts) – hier lebt die Gästeseite.

export const brandCss = /* css */ `
  :root{
    /* Paper-Cut-Palette: Wald, Ton, Sand, Creme */
    --tann:#3C4A3B;        --tann-tief:#2C382C;   --tann-hell:#6C7F68;
    --ton:#B0553A;         --ton-hell:#C97A5E;
    --sand:#DCC9A9;        --sand-hell:#EADCC6;
    --taupe:#93826C;
    --creme:#F5F0E8;       --papier:#FBF8F3;
    --tinte:#22261F;       --tinte-weich:#5A6155;
    --linie:#E2D9CB;

    --serif:"Cormorant Garamond",Cormorant,Georgia,"Times New Roman",serif;
    --lese:"Lora",Georgia,serif;
    --sans:"Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;

    --breit:1180px;
    --schmal:760px;
    --rund:18px;
    --schatten:0 1px 2px rgba(34,38,31,.04), 0 12px 32px -18px rgba(34,38,31,.28);
  }

  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  html,body{margin:0; padding:0;}
  body{
    font-family:var(--lese); font-size:17px; line-height:1.72;
    background:var(--creme); color:var(--tinte);
    -webkit-font-smoothing:antialiased; overflow-x:hidden;
  }
  img{max-width:100%; display:block;}
  svg{display:block;}

  h1,h2,h3,h4{font-family:var(--serif); font-weight:500; line-height:1.08; margin:0; letter-spacing:.01em;}
  h1{font-size:clamp(40px,7.2vw,80px);}
  h2{font-size:clamp(30px,4.6vw,50px);}
  h3{font-size:clamp(21px,2.6vw,27px);}
  p{margin:0 0 1.1em;}
  a{color:var(--tann); text-underline-offset:3px;}

  /* Kleine Versalien-Labels – das Bindeglied der ganzen Marke */
  .eyebrow{
    font-family:var(--sans); font-size:11.5px; font-weight:600;
    letter-spacing:.24em; text-transform:uppercase; color:var(--ton);
    margin:0 0 .9rem;
  }
  .eyebrow.leise{color:var(--taupe);}
  .lead{font-size:clamp(18px,2.1vw,21px); line-height:1.65; color:var(--tinte-weich);}

  .wrap{max-width:var(--breit); margin:0 auto; padding:0 24px; width:100%;}
  .wrap.schmal{max-width:var(--schmal);}
  section{position:relative;}
  .luft{padding:clamp(64px,9vw,120px) 0;}
  .luft-klein{padding:clamp(44px,6vw,76px) 0;}

  .dunkel{background:var(--tann); color:var(--sand-hell);}
  .dunkel h1,.dunkel h2,.dunkel h3{color:var(--sand-hell);}
  .dunkel .lead{color:rgba(234,220,198,.82);}
  .dunkel .eyebrow{color:var(--sand);}
  .dunkel a{color:var(--sand-hell);}

  /* ---------- Buttons ---------- */
  .btn{
    display:inline-flex; align-items:center; justify-content:center; gap:.6em;
    font-family:var(--sans); font-size:12.5px; font-weight:600;
    letter-spacing:.16em; text-transform:uppercase; text-decoration:none;
    padding:16px 30px; border-radius:999px; border:1.5px solid var(--tann);
    background:var(--tann); color:var(--sand-hell); cursor:pointer;
    transition:transform .12s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
  }
  .btn:hover{background:var(--tann-tief); border-color:var(--tann-tief); box-shadow:var(--schatten);}
  .btn:active{transform:translateY(1px);}
  .btn[disabled]{opacity:.45; cursor:not-allowed; transform:none;}
  .btn.ton{background:var(--ton); border-color:var(--ton); color:#FFF6EF;}
  .btn.ton:hover{background:#98462F; border-color:#98462F;}
  .btn.linie{background:transparent; color:var(--tann);}
  .btn.linie:hover{background:var(--tann); color:var(--sand-hell);}
  .dunkel .btn.linie{border-color:rgba(234,220,198,.5); color:var(--sand-hell);}
  .dunkel .btn.linie:hover{background:var(--sand-hell); color:var(--tann); border-color:var(--sand-hell);}
  .btn.klein{padding:11px 20px; font-size:11px;}

  /* ---------- Karten ---------- */
  .karte{
    background:var(--papier); border:1px solid var(--linie);
    border-radius:var(--rund); padding:30px; box-shadow:var(--schatten);
  }

  /* ---------- Kopfzeile ---------- */
  .kopf{
    position:sticky; top:0; z-index:60;
    background:rgba(245,240,232,.86); backdrop-filter:saturate(1.4) blur(14px);
    border-bottom:1px solid transparent; transition:border-color .25s, background .25s;
  }
  .kopf.geheftet{border-bottom-color:var(--linie);}
  .kopf-innen{display:flex; align-items:center; gap:20px; height:74px; max-width:var(--breit); margin:0 auto; padding:0 24px;}
  .marke{display:flex; align-items:center; text-decoration:none; margin-right:auto;}
  .marke .logo-bild{height:54px; width:auto;}
  .fuss-logo{height:74px; width:auto; margin-bottom:16px; filter:invert(92%) sepia(14%) saturate(230%) hue-rotate(357deg);}
  .nav{display:flex; align-items:center; gap:28px;}
  .nav a{
    font-family:var(--sans); font-size:12px; font-weight:500; letter-spacing:.13em;
    text-transform:uppercase; text-decoration:none; color:var(--tinte-weich); position:relative; padding:6px 0;
  }
  .nav a::after{
    content:""; position:absolute; left:0; right:100%; bottom:0; height:1.5px;
    background:var(--ton); transition:right .25s ease;
  }
  .nav a:hover::after, .nav a[aria-current]::after{right:0;}
  .nav a[aria-current]{color:var(--tann);}
  .burger{display:none; width:44px; height:44px; border:1px solid var(--linie); border-radius:12px; background:var(--papier); cursor:pointer; align-items:center; justify-content:center; flex-direction:column; gap:4px;}
  .burger span{display:block; width:17px; height:1.5px; background:var(--tinte);}

  @media (max-width:920px){
    .kopf-innen{height:66px; gap:12px;}
    .nav{
      position:fixed; inset:66px 0 auto; flex-direction:column; align-items:stretch; gap:0;
      background:var(--papier); border-bottom:1px solid var(--linie); padding:8px 24px 22px;
      transform:translateY(-130%); transition:transform .3s cubic-bezier(.4,0,.2,1); max-height:calc(100vh - 66px); overflow:auto;
    }
    .nav.offen{transform:translateY(0);}
    .nav a{padding:15px 0; border-bottom:1px solid var(--linie); font-size:13px;}
    .nav a:last-child{border-bottom:0;}
    .nav .btn{margin-top:16px; border-bottom:0;}
    .burger{display:flex;}
  }

  /* ---------- Fußzeile ---------- */
  .fuss{background:var(--tann-tief); color:rgba(234,220,198,.78); font-size:15px;}
  .fuss a{color:rgba(234,220,198,.78); text-decoration:none;}
  .fuss a:hover{color:#fff;}
  .fuss-gitter{display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:40px; padding:70px 0 46px;}
  .fuss h4{font-family:var(--sans); font-size:11px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--sand); margin:0 0 16px;}
  .fuss ul{list-style:none; margin:0; padding:0; display:grid; gap:10px;}
  .fuss-unten{
    display:flex; flex-wrap:wrap; gap:8px 26px; align-items:center;
    border-top:1px solid rgba(234,220,198,.16); padding:22px 0 30px; font-size:13px; color:rgba(234,220,198,.55);
  }
  .fuss-unten .rechts{margin-left:auto; display:flex; gap:22px;}
  @media (max-width:820px){
    .fuss-gitter{grid-template-columns:1fr 1fr; gap:34px; padding:52px 0 34px;}
    .fuss-unten .rechts{margin-left:0;}
  }

  /* ---------- Sanftes Einblenden beim Scrollen ---------- */
  .auf{opacity:0; transform:translateY(22px); transition:opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1);}
  .auf.da{opacity:1; transform:none;}
  @media (prefers-reduced-motion:reduce){
    .auf{opacity:1; transform:none; transition:none;}
    html{scroll-behavior:auto;}
  }

  /* ---------- Formularelemente ---------- */
  .feld{display:block; margin-bottom:18px;}
  .feld > span{
    display:block; font-family:var(--sans); font-size:11px; font-weight:600;
    letter-spacing:.16em; text-transform:uppercase; color:var(--taupe); margin-bottom:8px;
  }
  .feld input, .feld textarea, .feld select{
    width:100%; font-family:var(--lese); font-size:16px; color:var(--tinte);
    background:var(--papier); border:1px solid var(--linie); border-radius:12px; padding:14px 16px;
    transition:border-color .18s, box-shadow .18s;
  }
  .feld textarea{min-height:112px; resize:vertical;}
  .feld input:focus, .feld textarea:focus, .feld select:focus{
    outline:none; border-color:var(--tann-hell); box-shadow:0 0 0 3px rgba(108,127,104,.16);
  }
  .feld.fehler input, .feld.fehler textarea{border-color:var(--ton);}
  .feld .hinweis{display:block; font-family:var(--sans); font-size:11.5px; letter-spacing:0; text-transform:none; color:var(--ton); margin-top:6px; font-weight:500;}
  .paar{display:grid; grid-template-columns:1fr 1fr; gap:0 18px;}
  @media (max-width:560px){ .paar{grid-template-columns:1fr;} }
`;

/** Google-Fonts der Marke – mit Systemschriften als Rückfall im <style>. */
export const fontLink = /* html */ `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">`;
