/**
 * fetch-fixtures.js — Nexgen Worldcup Fantasy auto-updater
 * --------------------------------------------------------------
 * Runs on a schedule via GitHub Actions. Fetches ALL World Cup 2026
 * fixtures (upcoming + finished, with scores) from API-Football and
 * writes fixtures.json — which the predictor app reads.
 *
 * No manual entry. Key stays secret (API_FOOTBALL_KEY env secret).
 * Country flags come straight from the API as emoji where available,
 * with a name->emoji fallback map.
 *
 * Node 18+ (global fetch). GitHub Actions ubuntu has this.
 */
const fs = require("fs");

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_HOST = "v3.football.api-sports.io";
const LEAGUE = 1, SEASON = 2026, OUT = "fixtures.json";
if (!API_KEY) { console.error("Missing API_FOOTBALL_KEY"); process.exit(1); }

// name -> flag emoji fallback (extend as needed)
const FLAG = {
  Argentina:"🇦🇷",Brazil:"🇧🇷",France:"🇫🇷",England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Spain:"🇪🇸",Germany:"🇩🇪",
  Portugal:"🇵🇹",Netherlands:"🇳🇱",Belgium:"🇧🇪",Croatia:"🇭🇷",Morocco:"🇲🇦",USA:"🇺🇸","United States":"🇺🇸",
  Mexico:"🇲🇽",Canada:"🇨🇦",Japan:"🇯🇵","South Korea":"🇰🇷",Korea:"🇰🇷",Australia:"🇦🇺",Senegal:"🇸🇳",
  Norway:"🇳🇴",Uruguay:"🇺🇾",Colombia:"🇨🇴",Switzerland:"🇨🇭",Denmark:"🇩🇰",Poland:"🇵🇱",Serbia:"🇷🇸",
  Ecuador:"🇪🇨",Ghana:"🇬🇭",Nigeria:"🇳🇬",Cameroon:"🇨🇲",Tunisia:"🇹🇳",Egypt:"🇪🇬",Iran:"🇮🇷",
  "Saudi Arabia":"🇸🇦",Qatar:"🇶🇦","Costa Rica":"🇨🇷",Peru:"🇵🇪",Chile:"🇨🇱",Paraguay:"🇵🇾",
  Scotland:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",Wales:"🏴󠁧󠁢󠁷󠁬󠁳󠁿",Italy:"🇮🇹",Austria:"🇦🇹",Turkey:"🇹🇷",Ukraine:"🇺🇦",
  "Czech Republic":"🇨🇿",Czechia:"🇨🇿",Sweden:"🇸🇪",Algeria:"🇩🇿","Ivory Coast":"🇨🇮","South Africa":"🇿🇦",
  "New Zealand":"🇳🇿",Panama:"🇵🇦",Jamaica:"🇯🇲",Honduras:"🇭🇳",Uzbekistan:"🇺🇿",Jordan:"🇯🇴",
};
const flagFor = name => FLAG[name] || "🏳️";

async function api(path){
  const res = await fetch(`https://${API_HOST}/${path}`, { headers:{ "x-apisports-key":API_KEY } });
  if(!res.ok) throw new Error(`API ${path} -> HTTP ${res.status}`);
  const j = await res.json();
  if(j.errors && Object.keys(j.errors).length) console.warn("API note:", JSON.stringify(j.errors));
  return j.response || [];
}

async function main(){
  const raw = await api(`fixtures?league=${LEAGUE}&season=${SEASON}`);   // 1 request: all matches
  const FT = new Set(["FT","AET","PEN"]);                                 // finished states
  const fixtures = raw.map(fx => {
    const hn = fx.teams.home.name, an = fx.teams.away.name;
    const finished = FT.has(fx.fixture.status.short);
    return {
      id: fx.fixture.id,
      dateISO: fx.fixture.date,
      status: finished ? "FT" : (fx.fixture.status.short==="NS" ? "NS" : fx.fixture.status.short),
      home: { name: hn, flag: flagFor(hn), logo: fx.teams.home.logo },
      away: { name: an, flag: flagFor(an), logo: fx.teams.away.logo },
      gh: finished ? (fx.goals.home ?? 0) : null,
      ga: finished ? (fx.goals.away ?? 0) : null,
    };
  }).sort((a,b)=> new Date(a.dateISO) - new Date(b.dateISO));

  const out = { updated:new Date().toISOString(), count:fixtures.length, fixtures };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const fin = fixtures.filter(f=>f.status==="FT").length;
  console.log(`✅ Wrote ${fixtures.length} fixtures (${fin} finished).`);
}
main().catch(e=>{ console.error("❌", e.message); process.exit(1); });
