// Gemeinsames "Hand aufs Herz"-Theme (aus dem Team-Terminal übernommen).
export const baseCss = /* css */ `
  :root{
    --ink:#1A1A1A; --wald:#3A5A40; --wald-hell:#7A9A80;
    --amber:#C8891F; --clay:#8A6D3B; --rot:#9A3B34;
    --creme:#F2EFEC; --card:#FDFCFB; --line:#D9D9D9; --grey:#8A8A8A;
    --serif:Georgia,"Times New Roman",serif;
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
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
