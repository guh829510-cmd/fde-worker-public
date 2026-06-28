// FDE - Freelance Domination Engine
// Full system: scraping, AI proposals, Telegram, Dashboard

// D1 Database helpers
async function idb(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,source TEXT,title TEXT,description TEXT,url TEXT,budget_max REAL,budget_type TEXT,skills TEXT,match_score REAL,status TEXT DEFAULT 'new',created_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,job_id TEXT,content TEXT,price REAL,humanity_score REAL,domain TEXT,status TEXT DEFAULT 'draft',created_at TEXT)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC)")
  ]);
}

async function ij(db, job) {
  try {
    await db.prepare("INSERT OR IGNORE INTO jobs(id,source,title,description,url,budget_max,budget_type,skills,match_score,status,created_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .bind(job.id, job.source, job.title, job.description, job.url, job.budget_max, "fixed", job.domain, job.match_score, "new", new Date().toISOString()).run();
    return true;
  } catch(e) { return false; }
}

async function sp(db, p) {
  await db.prepare("INSERT OR REPLACE INTO proposals(id,job_id,content,price,humanity_score,domain,status,created_at)VALUES(?,?,?,?,?,?,?,?)")
    .bind(p.id, p.job_id, p.content, p.price, p.humanity_score, p.domain, "draft", new Date().toISOString()).run();
}

async function gs(db) {
  const t = (await db.prepare("SELECT COUNT(*)as c FROM jobs").first("c")) || 0;
  const n = (await db.prepare("SELECT COUNT(*)as c FROM jobs WHERE status='new'").first("c")) || 0;
  const p = (await db.prepare("SELECT COUNT(*)as c FROM proposals").first("c")) || 0;
  return { total: t, new_jobs: n, proposals: p };
}

async function gj(db, lim) {
  const { results } = await db.prepare("SELECT*FROM jobs ORDER BY created_at DESC LIMIT?").bind(lim || 50).all();
  return results || [];
}

async function gp(db) {
  const { results } = await db.prepare("SELECT*FROM proposals ORDER BY created_at DESC").all();
  return results || [];
}

// Skill matching
const DK = {
  FEA: ["fea","finite element","ansys","abaqus","comsol","simulation","structural","stress","mesh","cfd","mechanical"],
  Flutter: ["flutter","dart","cross-platform","mobile app","firebase","bloc","provider","riverpod"],
  AI_Systems: ["machine learning","deep learning","ai","llm","neural network","pytorch","tensorflow","rag","fine-tuning"]
};

function sm(t, d) {
  const x = (t + " " + d).toLowerCase();
  const a = Object.values(DK).flat();
  const m = a.filter(k => x.includes(k)).length;
  return Math.min(100, (m / 15) * 100);
}

function dd(t, d) {
  const x = (t + " " + d).toLowerCase();
  const s = {};
  for (const [dom, kws] of Object.entries(DK)) {
    s[dom] = kws.filter(k => x.includes(k)).length;
  }
  let b = "FEA", bs = -1;
  for (const [dom, sc] of Object.entries(s)) {
    if (sc > bs) { b = dom; bs = sc; }
  }
  return b;
}

// Gemini proposals
const DPR = {
  FEA: "Expert FEA consultant. ANSYS, ABAQUS, COMSOL.",
  Flutter: "Senior Flutter dev. BLoC, Firebase, performance.",
  AI_Systems: "AI systems engineer. PyTorch, ML, digital twins."
};

function sh(t) {
  let s = 50;
  for (const b of ["i hope this email", "dear hiring manager", "i am writing to"]) {
    if (t.toLowerCase().includes(b)) s -= 15;
  }
  if (["i'm", "i've", "don't"].some(c => t.toLowerCase().includes(c))) s += 10;
  if (t.includes("?")) s += 5;
  if (/\d/.test(t)) s += 5;
  return Math.max(0, Math.min(100, s));
}

async function gpr(j, env) {
  const pr = Math.max(j.budget_max * 0.7, 300);
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.startsWith("AIza")) {
    try {
      const dp = DPR[j.domain] || DPR.FEA;
      const bq = Math.round(pr * 0.5).toLocaleString();
      const pq = Math.round(pr).toLocaleString();
      const eq = Math.round(pr * 1.7).toLocaleString();
      const prompt = "You are a " + dp + " Write a short confident freelance proposal. Use contractions (I'm, I've, don't). Start with THEIR problem. Include 3 pricing tiers: Basic $" + bq + " / Professional $" + pq + " / Enterprise $" + eq + ". Sound human. NEVER say 'I hope this email finds you well'. 150 words.\n\nJob: " + j.title + "\nDesc: " + j.description.slice(0, 500);
      const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + env.GEMINI_API_KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 500 } })
      });
      if (resp.status === 200) {
        const data = await resp.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (content.length > 50) return { content: content, price: pr, humanity_score: sh(content) };
      }
    } catch(e) { console.warn("Gemini:", e); }
  }
  // Template fallback
  const bq = Math.round(pr * 0.5).toLocaleString();
  const pq = Math.round(pr).toLocaleString();
  const eq = Math.round(pr * 1.7).toLocaleString();
  let content = "";
  if (j.domain === "FEA") {
    content = "Hey, saw your project for " + j.title.slice(0, 40) + ". Done similar FEA work — cut analysis time 40%. ANSYS + Python automation.\n\nScope: Basic ($" + bq + ") / Pro ($" + pq + ") / Enterprise ($" + eq + ").\n\nQuick chat?\n\nBest";
  } else if (j.domain === "Flutter") {
    content = "Hey, saw you need Flutter dev for " + j.title.slice(0, 40) + ". Built similar — 50K+ MAU. Flutter + BLoC + Firebase. 60fps, offline-first.\n\nScope: Basic ($" + bq + ") / Pro ($" + pq + ") / Enterprise ($" + eq + ").\n\nLet me know!\n\nBest";
  } else {
    content = "Hey, your " + j.title.slice(0, 40) + " caught my eye. Built similar — reduced sim time 6hrs to 8min. Physics-informed ML.\n\nScope: Basic ($" + bq + ") / Pro ($" + pq + ") / Enterprise ($" + eq + ").\n\nCase study?\n\nBest";
  }
  return { content: content, price: pr, humanity_score: sh(content) };
}

// Upwork scraper
async function su(kws) {
  const jobs = [];
  for (const k of kws.slice(0, 3)) {
    try {
      const resp = await fetch("https://www.upwork.com/ab/feed/jobs/rss?q=" + encodeURIComponent(k) + "&sort=recency", { headers: { "User-Agent": "Mozilla/5.0" } });
      if (resp.status !== 200) continue;
      const txt = await resp.text();
      const items = txt.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const it of items.slice(0, 5)) {
        const title = (it.match(/<title>(.*?)<\/title>/)?.[1] || "").replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim();
        const desc = (it.match(/<description>(.*?)<\/description>/)?.[1] || "").replace(/<[^>]+>/g, "").replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim();
        const link = it.match(/<link>(.*?)<\/link>/)?.[1] || "";
        const bm = (title + " " + desc).match(/\$([\d,]+)/);
        const budget = bm ? parseFloat(bm[1].replace(/,/g, "")) : 0;
        const id = await hs(title + desc);
        jobs.push({ id: id, source: "upwork", title: title.slice(0, 150), description: desc.slice(0, 1000), url: link, budget_max: budget, match_score: sm(title, desc), domain: dd(title, desc), status: "new" });
      }
    } catch(e) { console.warn("Scrape:", e.message); }
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
  }
  return jobs;
}

// Telegram
async function st(msg, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    const resp = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: msg.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true })
    });
    return resp.status === 200;
  } catch(e) { return false; }
}

function fcs(cy, nj, pg, stats, mb) {
  if (!nj.length && !pg) return "";
  const q = nj.filter(j => j.budget_max < 1000).length;
  const m = nj.filter(j => j.budget_max >= 1000 && j.budget_max < 3000).length;
  const s = nj.filter(j => j.budget_max >= 3000 && j.budget_max < 6000).length;
  const p = nj.filter(j => j.budget_max >= 6000).length;
  const top = [...nj].sort((a, b) => b.budget_max - a.budget_max)[0];
  let r = "<b>Scan #" + cy + "</b> | " + nj.length + " jobs found\n";
  if (q) r += "⚡ Quick ($300-999): " + q + "\n";
  if (m) r += "📊 Mid ($1K-2.9K): " + m + "\n";
  if (s) r += "💼 Solid ($3K-6K): " + s + "\n";
  if (p) r += "👑 Premium ($6K+): " + p + "\n";
  if (pg) r += "📝 Proposals: " + pg + "\n";
  if (top) r += "💰 Top: $" + top.budget_max.toLocaleString() + " — " + top.title.slice(0, 40) + "...\n";
  r += "📈 Total: " + stats.total + " jobs | " + stats.proposals + " proposals";
  return r;
}

// Main scan
async function rs(env) {
  const cache = env.CACHE;
  const cy = parseInt((await cache.get("cycle_count")) || "0") + 1;
  await cache.put("cycle_count", String(cy));
  const mb = parseInt(env.MIN_BUDGET || "300");
  const kws = ["FEA", "finite element", "Flutter", "AI engineer", "machine learning", "simulation", "ANSYS", "ABAQUS"];
  console.log("Scan #" + cy + " | Min $" + mb);
  const rj = await su(kws);
  const nj = [];
  const al = [];
  for (const j of rj) {
    if (j.budget_max >= mb) {
      const ins = await ij(env.DB, j);
      if (ins) {
        nj.push(j);
        if (j.budget_max >= 3000) al.push(j);
      }
    }
  }
  let pg = 0;
  for (const j of al.slice(0, 3)) {
    await st("🎯 <b>$" + j.budget_max.toLocaleString() + " Job</b>\n" + j.title.slice(0, 65) + "\nMatch: " + Math.round(j.match_score) + "%\n" + j.url.slice(0, 80), env);
    const pr = await gpr(j, env);
    const pi = await hs(j.id + pr.content.slice(0, 50));
    await sp(env.DB, { id: pi, job_id: j.id, content: pr.content, price: pr.price, humanity_score: pr.humanity_score, domain: j.domain });
    pg++;
    await st("📝 <b>Proposal | $" + Math.round(pr.price).toLocaleString() + " | H: " + Math.round(pr.humanity_score) + "/100</b>\n\n" + pr.content.slice(0, 950), env);
  }
  const stats = await gs(env.DB);
  const summary = fcs(cy, nj, pg, stats, mb);
  if (summary) await st(summary, env);
  console.log("Scan #" + cy + " done: " + nj.length + " jobs, " + pg + " proposals");
}

// Dashboard HTML
const DH = `<!DOCTYPE html>
<html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>FDE</title><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
body{background:#0a0a0f;color:#e0e0e0;padding:20px}
h1{font-size:24px;color:#00ff88;margin-bottom:4px}
.subtitle{color:#888;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0}
.stat{background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;padding:16px;text-align:center}
.stat .num{font-size:28px;font-weight:700;color:#00ff88}
.stat .label{font-size:12px;color:#888}
table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}
th{background:#1a1a2e;color:#00ff88;padding:10px;text-align:left;position:sticky;top:0}
td{padding:10px;border-bottom:1px solid #2a2a3e}
tr:hover{background:#151525}
.budget{color:#00ff88;font-weight:600}
.score{padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600}
.score-high{background:#00ff8820;color:#00ff88}
.score-mid{background:#ffaa0020;color:#ffaa00}
.score-low{background:#ff444420;color:#ff4444}
.domain-tag{background:#2a2a3e;padding:2px 8px;border-radius:4px;font-size:11px;color:#aaa}
.footer{margin-top:30px;text-align:center;color:#666;font-size:12px}
a{color:#00ff88}
.status-new{color:#00ff88;font-weight:600}
</style></head><body>
<h1>Freelance Domination Engine</h1>
<div class=subtitle>$300 — $45K projects in FEA, Flutter, AI | Auto-scanning every 3 min</div>
<div class=stats id=s></div>
<h2 style="margin-top:20px;font-size:18px">Recent Opportunities</h2>
<table><thead><tr><th>Budget<th>Match<th>Domain<th>Title<th>Status</thead><tbody id=j></tbody></table>
<div class=footer>Refreshes every 30s | <a href=/api/scan>Trigger Scan</a> | <a href=/api/health>Health</a></div>
<script>
async function load(){
  const s=await(await fetch('/api/stats')).json();
  document.getElementById('s').innerHTML='<div class=stat><div class=num>'+s.total+'</div><div class=label>Total Jobs</div></div><div class=stat><div class=num>'+s.new_jobs+'</div><div class=label>New</div></div><div class=stat><div class=num>'+s.proposals+'</div><div class=label>Proposals</div></div>';
  const js=await(await fetch('/api/jobs?limit=20')).json();
  document.getElementById('j').innerHTML=js.map(j=>{
    const sc=Math.round(j.match_score);
    const cls=sc>=60?'score-high':sc>=30?'score-mid':'score-low';
    return '<tr><td class=budget>$'+(j.budget_max?j.budget_max.toLocaleString():'N/A')+'<td><span class="score '+cls+'">'+sc+'%</span><td><span class=domain-tag>'+(j.skills||'General')+'</span><td><a href="'+j.url+'" target=_blank>'+j.title.slice(0,65)+'</a><td><span class=status-'+j.status+'>'+j.status+'</span>';
  }).join('')||'<tr><td colspan=5 style="text-align:center;color:#666;padding:20px">No jobs yet. First scan running...</td></tr>';
}
load();setInterval(load,30000);
</script></body></html>`;

// API handler
async function ha(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (path === "/api/stats") return new Response(JSON.stringify(await gs(env.DB)), { headers: cors });
  if (path === "/api/jobs") {
    const { results } = await env.DB.prepare("SELECT*FROM jobs ORDER BY created_at DESC LIMIT?").bind(parseInt(url.searchParams.get("limit") || "50")).all();
    return new Response(JSON.stringify(results || []), { headers: cors });
  }
  if (path === "/api/proposals") {
    const { results } = await env.DB.prepare("SELECT*FROM proposals ORDER BY created_at DESC").all();
    return new Response(JSON.stringify(results || []), { headers: cors });
  }
  if (path === "/api/scan") { await rs(env); return new Response(JSON.stringify({ status: "scan triggered" }), { headers: cors }); }
  if (path === "/api/health") return new Response(JSON.stringify({ status: "ok", gemini: env.GEMINI_API_KEY && env.GEMINI_API_KEY.startsWith("AIza") ? "configured" : "missing", telegram: env.TELEGRAM_BOT_TOKEN ? "configured" : "missing", min_budget: env.MIN_BUDGET || "300", timestamp: new Date().toISOString() }), { headers: cors });
  if (path === "/" || path === "/dashboard") return new Response(DH, { headers: { "Content-Type": "text/html" } });
  return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
}

// Utils
async function hs(str) {
  const e = new TextEncoder();
  const d = e.encode(str);
  const h = await crypto.subtle.digest("SHA-256", d);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

// Module Worker entry
export default {
  async fetch(request, env, ctx) {
    await idb(env.DB);
    return ha(request, env);
  },
  async scheduled(event, env, ctx) {
    await idb(env.DB);
    ctx.waitUntil(rs(env));
  }
};