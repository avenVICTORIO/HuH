// Gemeinsames Theme der internen Seiten (Terminal + Team-Dashboard).
// Nutzt dieselbe Papier-Palette wie die Gästeseite (site/brand.ts) – die alten
// Variablennamen (--wald, --clay …) bleiben erhalten, damit beide Seiten sie teilen.
export const baseCss = /* css */ `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Montserrat:wght@400;500;600&display=swap');
  :root{
    --ink:#22261F;
    --wald:#3C4A3B;  --wald-hell:#6C7F68;
    --amber:#B0553A; --clay:#93826C; --rot:#9A3B34;
    --creme:#F5F0E8; --card:#FBF8F3; --line:#E2D9CB; --grey:#8A8A80;
    --sand:#DCC9A9;  --sand-hell:#EADCC6;
    --serif:"Cormorant Garamond",Cormorant,Georgia,"Times New Roman",serif;
    --sans:"Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box; -webkit-tap-highlight-color:transparent;}
  html,body{margin:0; padding:0;}
  body{
    font-family:var(--sans); background:var(--creme); color:var(--ink);
    min-height:100vh; overflow-x:hidden;
  }
  .serif{font-family:var(--serif);}
  a{color:var(--wald);}
`;

/**
 * Favicon-, App-Icon- und Manifest-Verdrahtung für alle Seiten (Gäste + intern).
 * Die Dateien erzeugt `bun run icons` aus public/logo.png.
 */
export const iconHead = /* html */ `
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/icons/favicon-16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="apple-mobile-web-app-title" content="Hand aufs Herz">`;

/** Schlichte Linien-Icons für die internen Seiten – statt Emojis. */
export const teamIcons: Record<string, string> = {
  aufgaben: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8" y="6" width="24" height="28" rx="4"/><path d="M14 14l2.5 2.5L21 12M14 22l2.5 2.5L21 20"/><path d="M24 15h4M24 23h4"/></svg>`,
  handbuch: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 10c-3-2.4-7-3-12-2v22c5-1 9-.4 12 2 3-2.4 7-3 12-2V8c-5-1-9-.4-12 2Z"/><path d="M20 10v22"/></svg>`,
  anleitungen: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="20" cy="20" r="12"/><path d="M16.5 16.5a3.5 3.5 0 0 1 6.8 1c0 2.3-3.3 2.8-3.3 5"/><path d="M20 26.5h.01"/></svg>`,
  drinks: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 8h20l-8.5 11v10"/><path d="M15 32h10"/><path d="M13.5 12.5h13"/></svg>`,
  reservierung: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="7" y="9" width="26" height="24" rx="4"/><path d="M7 16h26M14 6v6M26 6v6"/><path d="M14 23l3.5 3.5L26 20"/></svg>`,
  zeiten: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="20" cy="21" r="12"/><path d="M20 14v7l5 3"/><path d="M16 5h8"/></svg>`,
  team: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="15" cy="15" r="5"/><path d="M6 32c0-5 4-8 9-8s9 3 9 8"/><circle cx="28" cy="16" r="4"/><path d="M27 24c4 .4 7 3 7 7"/></svg>`,
  auswertung: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 7v26h26"/><path d="M13 26v-8M20 26V12M27 26v-5"/></svg>`,
  live: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 21h7l4-9 6 17 4-11h9"/></svg>`,
  inventur: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 14l14-7 14 7-14 7-14-7Z"/><path d="M6 14v13l14 7 14-7V14"/><path d="M20 21v13"/></svg>`,
  schichtplan: /* html */ `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="8" width="28" height="26" rx="4"/><path d="M6 15h28M13 5v6M27 5v6"/><path d="M12 22h6M12 28h9M22 22h6"/></svg>`,
};
