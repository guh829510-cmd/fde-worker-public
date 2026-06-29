// ═══════════════════════════════════════════════════════════════
//  FREELANCE DOMINATION ENGINE v2.1.1 — TELEGRAM DEBUG EDITION
//  20 working sources | RSS + API | AI proposals | Telegram
//  Debug endpoints for self-diagnosis | Auto-scans every 3 min
// ═══════════════════════════════════════════════════════════════

// ═══ CONFIG ═══
const CFG = {
  MIN_BUDGET: 300,
  KEYWORDS: ["FEA", "finite element", "ANSYS", "ABAQUS", "COMSOL", "simulation", "structural analysis",
             "Flutter", "Dart", "cross-platform", "mobile app", "Firebase",
             "machine learning", "deep learning", "AI engineer", "LLM", "neural network",
             "Python", "PyTorch", "TensorFlow", "automation", "engineering consultant"],
  DOMAINS: { FEA: 1, Flutter: 1, AI_Systems: 1, General: 1 },
  SCAN_BATCH: 15,
  MAX_JOBS_PER_SRC: 8,
  TELEGRAM_MAX_LEN: 4000,
};

// ═══ TELEGRAM ═══
async function tSend(msg, env, parseMode = "HTML") {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { ok: false, error: "missing credentials" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: msg.slice(0, CFG.TELEGRAM_MAX_LEN), parse_mode: parseMode, disable_web_page_preview: true })
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error("TG_API_ERR:", r.status, err.description || "unknown");
      return { ok: false, error: err.description || `HTTP ${r.status}` };
    }
    return { ok: true };
  } catch (e) { console.error("TG_ERR:", e.message); return { ok: false, error: e.message }; }
}

async function tGetMe(env) {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "no token" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
    return await r.json();
  } catch (e) { return { ok: false, error: e.message }; }
}

async function tStartup(env) {
  const m = `🚀 <b>FREELANCE DOMINATION ENGINE v2.1 — ACTIVATED</b>

⏰ Scanning every <b>3 minutes</b>
💰 Budget range: <b>All budgets</b>
🔍 Sources: <b>20 working platforms</b>
🤖 AI: <b>Gemini 1.5 Flash</b> with humanity scoring
📊 Domains: <b>FEA | Flutter | AI Systems | General</b>

Your 24/7 job hunter is <b>LIVE</b>. First scan incoming...`;
  return await tSend(m, env);
}

async function tError(ctx, err, env) {
  const m = `⚠️ <b>${ctx} Error</b>
<code>${(err.message || String(err)).slice(0,500)}</code>`;
  await tSend(m, env);
}

async function tScanStart(cycle, env) {
  await tSend(`🔍 <b>Scan #${cycle} STARTED</b>
Searching 20 platforms for FEA/Flutter/AI jobs...`, env);
}

async function tJobFound(job, env) {
  const bud = job.budget_max > 0 ? `$${job.budget_max.toLocaleString()}` : "Budget N/A";
  const tier = job.budget_max >= 6000 ? "👑 PREMIUM" : job.budget_max >= 3000 ? "💼 SOLID" : job.budget_max >= 1000 ? "📊 MID" : "⚡ NEW";
  const m = `${tier} | <b>${bud}</b>
📌 ${job.title.slice(0,90)}
🎯 Match: ${Math.round(job.match_score)}% | 🏷 ${job.domain}
🔗 ${job.url.slice(0,80)}
📡 Source: ${job.source}`;
  await tSend(m, env);
}

async function tProposal(prop, job, env) {
  const m = `📝 <b>AI PROPOSAL READY</b> | $${Math.round(prop.price).toLocaleString()} | 🧠 Humanity: ${Math.round(prop.humanity_score)}/100

${prop.content.slice(0,950)}

<i>Based on: ${job.title.slice(0,60)}</i>`;
  await tSend(m, env);
}

async function tSummary(cycle, newJobs, props, stats, env) {
  if (!newJobs.length && !props) return;
  const q = newJobs.filter(j => j.budget_max < 1000).length;
  const m = newJobs.filter(j => j.budget_max >= 1000 && j.budget_max < 3000).length;
  const s = newJobs.filter(j => j.budget_max >= 3000 && j.budget_max < 6000).length;
  const p = newJobs.filter(j => j.budget_max >= 6000).length;
  const top = [...newJobs].sort((a, b) => b.budget_max - a.budget_max)[0];
  let msg = `✅ <b>Scan #${cycle} COMPLETE</b>

<b>NEW JOBS FOUND: ${newJobs.length}</b>
${q ? `⚡ Quick ($300-999): ${q}\n` : ""}${m ? `📊 Mid ($1K-2.9K): ${m}\n` : ""}${s ? `💼 Solid ($3K-6K): ${s}\n` : ""}${p ? `👑 Premium ($6K+): ${p}\n` : ""}
📝 Proposals generated: ${props}
📈 Total DB: ${stats.total} jobs | ${stats.proposals} proposals`;
  if (top) msg += `\n\n🏆 <b>Top Job:</b> $${top.budget_max.toLocaleString()} — ${top.title.slice(0,50)}...`;
  await tSend(msg, env);
}

// ═══ D1 DATABASE ═══
async function dbInit(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,source TEXT,title TEXT,description TEXT,url TEXT,budget_max REAL,budget_type TEXT,skills TEXT,match_score REAL,status TEXT DEFAULT 'new',created_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,job_id TEXT,content TEXT,price REAL,humanity_score REAL,domain TEXT,status TEXT DEFAULT 'draft',created_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT,msg TEXT,created TEXT)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`),
  ]);
}

async function dbInsertJob(db, j) {
  try {
    await db.prepare(`INSERT OR IGNORE INTO jobs(id,source,title,description,url,budget_max,budget_type,skills,match_score,status,created_at)VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(j.id, j.source, j.title, j.description, j.url, j.budget_max, j.budget_type, j.skills, j.match_score, "new", new Date().toISOString()).run();
    return true;
  } catch (e) { console.error("DB_INSERT_ERR:", e.message); return false; }
}

async function dbSaveProposal(db, p) {
  await db.prepare(`INSERT OR REPLACE INTO proposals(id,job_id,content,price,humanity_score,domain,status,created_at)VALUES(?,?,?,?,?,?,?,?)`)
    .bind(p.id, p.job_id, p.content, p.price, p.humanity_score, p.domain, "draft", new Date().toISOString()).run();
}

async function dbStats(db) {
  const t = (await db.prepare(`SELECT COUNT(*)c FROM jobs`).first("c")) || 0;
  const n = (await db.prepare(`SELECT COUNT(*)c FROM jobs WHERE status='new'`).first("c")) || 0;
  const p = (await db.prepare(`SELECT COUNT(*)c FROM proposals`).first("c")) || 0;
  return { total: t, new_jobs: n, proposals: p };
}

async function dbGetJobs(db, lim) {
  const { results } = await db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`).bind(lim || 50).all();
  return results || [];
}

async function dbGetProposals(db) {
  const { results } = await db.prepare(`SELECT * FROM proposals ORDER BY created DESC LIMIT 50`).all();
  return results || [];
}

async function dbLog(db, type, msg) {
  try {
    await db.prepare(`INSERT INTO logs(type,msg,created)VALUES(?,?,?)`).bind(type, msg, new Date().toISOString()).run();
  } catch {}
}

// ═══ SKILL MATCHER ═══
const SKILLS = {
  FEA: ["fea","finite element","ansys","abaqus","comsol","simulation","structural","stress","mesh","cfd","mechanical","nastran","ls-dyna","hypermesh","cfd analysis","thermal analysis"],
  Flutter: ["flutter","dart","cross-platform","firebase","bloc","riverpod","getx","provider","mobile app","ios app","android app","flutterflow"],
  AI_Systems: ["machine learning","deep learning","ai engineer","llm","neural network","pytorch","tensorflow","rag","fine-tuning","nlp","computer vision","openai","langchain","huggingface","sklearn","data science","mlops","reinforcement learning","generative ai","gpt","bert","stable diffusion"],
};

function matchScore(title, desc) {
  const text = (title + " " + desc).toLowerCase();
  const all = Object.values(SKILLS).flat();
  const hits = all.filter(k => text.includes(k)).length;
  return Math.min(100, (hits / 20) * 100);
}

function detectDomain(title, desc) {
  const text = (title + " " + desc).toLowerCase();
  const s = {};
  for (const [d, kws] of Object.entries(SKILLS)) s[d] = kws.filter(k => text.includes(k)).length;
  let b = "General", bs = 0;
  for (const [d, sc] of Object.entries(s)) { if (sc > bs) { b = d; bs = sc; } }
  return b;
}

// ═══ GEMINI AI ═══
const DPROMPT = {
  FEA: "Expert FEA simulation engineer. ANSYS, ABAQUS, COMSOL, CFD.",
  Flutter: "Senior Flutter developer. BLoC, Firebase, performance optimization.",
  AI_Systems: "AI/ML systems engineer. PyTorch, LLMs, MLOps, production AI.",
  General: "Senior engineering consultant. Multidisciplinary technical expert."
};

const TPL = {
  FEA: (j, p) => `Hey, your ${j.title.slice(0,40)} project caught my eye. I've delivered 40+ FEA projects — reduced sim time 40% via Python automation. ANSYS + ABAQUS certified.\n\nScope: Basic ($${Math.round(p*0.5).toLocaleString()}) / Professional ($${Math.round(p).toLocaleString()}) / Enterprise ($${Math.round(p*1.7).toLocaleString()})\n\nQuick chat to discuss?\n\nBest`,
  Flutter: (j, p) => `Hey, saw you need Flutter work for ${j.title.slice(0,40)}. Built similar apps — 50K+ MAU. Flutter + BLoC + Firebase, 60fps. Published on both stores.\n\nScope: Basic ($${Math.round(p*0.5).toLocaleString()}) / Professional ($${Math.round(p).toLocaleString()}) / Enterprise ($${Math.round(p*1.7).toLocaleString()})\n\nLet me know if interested!\n\nBest`,
  AI_Systems: (j, p) => `Hey, ${j.title.slice(0,40)} — exactly my domain. Built production ML systems: 6hr sims → 8min. Physics-informed neural nets + RAG pipelines deployed.\n\nScope: Basic ($${Math.round(p*0.5).toLocaleString()}) / Professional ($${Math.round(p).toLocaleString()}) / Enterprise ($${Math.round(p*1.7).toLocaleString()})\n\nCase studies available?\n\nBest`,
  General: (j, p) => `Hey, your ${j.title.slice(0,40)} project looks interesting. I specialize in engineering solutions — delivered 50+ projects internationally. Top-rated across platforms.\n\nScope: Basic ($${Math.round(p*0.5).toLocaleString()}) / Professional ($${Math.round(p).toLocaleString()}) / Enterprise ($${Math.round(p*1.7).toLocaleString()})\n\nLet's discuss?\n\nBest`
};

function humanityScore(text) {
  let s = 50;
  const bad = ["i hope this email","dear hiring manager","i am writing to","to whom it may concern","i came across","please find attached"];
  const good = ["i'm","i've","don't","let's","won't","can't"];
  for (const b of bad) if (text.toLowerCase().includes(b)) s -= 12;
  for (const g of good) if (text.toLowerCase().includes(g)) s += 8;
  if (text.includes("?")) s += 5;
  if (/\d/.test(text)) s += 5;
  if (text.split("\n").length > 3) s += 5;
  return Math.max(0, Math.min(100, s));
}

async function genProposal(job, env) {
  const price = Math.max((job.budget_max || 0) * 0.65, 300);
  if (env.GEMINI_API_KEY?.startsWith("AIza")) {
    try {
      const dp = DPROMPT[job.domain] || DPROMPT.General;
      const prompt = `You are: ${dp}
Write a SHORT confident freelance proposal (120 words max).
RULES: Use contractions (I'm, I've, don't). Start with THEIR problem. Include 3 pricing tiers: Basic $${Math.round(price*0.5).toLocaleString()} / Professional $${Math.round(price).toLocaleString()} / Enterprise $${Math.round(price*1.7).toLocaleString()}. Sound like a real human expert. NEVER use corporate phrases. Be direct and confident.

JOB: ${job.title}
DESCRIPTION: ${(job.description || "").slice(0,600)}`;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.75, maxOutputTokens: 500 } })
      });
      if (r.ok) {
        const d = await r.json();
        const c = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (c.length > 80) return { content: c, price, humanity_score: humanityScore(c) };
      }
    } catch (e) { console.error("Gemini err:", e.message); }
  }
  const t = TPL[job.domain] || TPL.General;
  const c = t(job, price);
  return { content: c, price, humanity_score: humanityScore(c) };
}

// ═══ ═══ ═══ ═══ PLATFORM SCRAPERS ═══ ═══ ═══ ═══

async function fetchText(url) {
  try {
    const r = await fetch(url, { headers: {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, cf: { cacheTtl: 60 } });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { console.error("fetchText:", e.message); return null; }
}

async function fetchJSON(url) {
  try {
    const r = await fetch(url, { headers: {"User-Agent":"Mozilla/5.0","Accept":"application/json"}, cf: { cacheTtl: 60 } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { console.error("fetchJSON:", e.message); return null; }
}

function parseRSS(xml, source) {
  if (!xml) return [];
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const jobs = [];
  for (const it of items.slice(0, CFG.MAX_JOBS_PER_SRC)) {
    const title = (it.match(/<title>(.*?)<\/title>/i)?.[1] || "").replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").replace(/<[^>]+>/g, "").trim();
    const desc = (it.match(/<description>(.*?)<\/description>/i)?.[1] || "").replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").replace(/<[^>]+>/g, "").trim();
    const link = it.match(/<link>(.*?)<\/link>/i)?.[1] || it.match(/<guid[^>]*>(.*?)<\/guid>/i)?.[1] || "";
    if (!title) continue;
    const bm = (title + " " + desc).match(/\$([\d,]+(?:\.\d+)?)\s*(k|K)?/);
    let budget = bm ? parseFloat(bm[1].replace(/,/g, "")) : 0;
    if (bm && bm[2]) budget *= 1000;
    const id = hashSync(title + desc);
    const dom = detectDomain(title, desc);
    const ms = matchScore(title, desc);
    jobs.push({ id, source, title: title.slice(0,150), description: desc.slice(0,800), url: link, budget_max: budget, budget_type: budget > 0 ? "fixed" : "unknown", skills: "", domain: dom, match_score: ms });
  }
  return jobs;
}

function hashSync(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(36).slice(0, 12);
}

// ═══ WORKING JOB SOURCES ═══
const PLATFORMS = [
  // ─── CONFIRMED WORKING RSS ───
  { name: "weworkremotely",    url: () => `https://weworkremotely.com/remote-jobs.rss`,             type: "rss" },
  { name: "workingnomads",     url: () => `https://www.workingnomads.com/jobs.atom`,                type: "rss" },
  { name: "remotive_jobs",     url: () => `https://remotive.com/remote-jobs/feed`,                  type: "rss" },
  { name: "hn_whoishiring",    url: () => `https://hnrss.org/whoishiring`,                          type: "rss" },
  { name: "eurotechjobs",      url: () => `https://www.eurotechjobs.com/feed/`,                     type: "rss" },
  { name: "cryptojobs",        url: () => `https://cryptocurrencyjobs.co/remote/developer/feed.xml`, type: "rss" },
  { name: "codepen_jobs",      url: () => `https://codepen.io/jobs/feed/`,                          type: "rss" },
  { name: "landing_jobs",      url: () => `https://landing.jobs/jobs.rss`,                          type: "rss" },
  { name: "4dayweek",          url: () => `https://4dayweek.io/remote-jobs/rss.xml`,                type: "rss" },
  { name: "slashdev",          url: () => `https://slashdev.io/jobs?format=rss`,                    type: "rss" },
  { name: "remoteok",          url: () => `https://remoteok.com/remote-jobs.rss`,                   type: "rss" },

  // ─── REDDIT RAW FEEDS ───
  { name: "reddit_slavelabour",  url: () => `https://www.reddit.com/r/slavelabour/new/.rss`,       type: "rss" },
  { name: "reddit_forhire",      url: () => `https://www.reddit.com/r/forhire/new/.rss`,            type: "rss" },
  { name: "reddit_hiring",       url: () => `https://www.reddit.com/r/hiring/new/.rss`,             type: "rss" },
  { name: "reddit_freelance",    url: () => `https://www.reddit.com/r/freelance/new/.rss`,          type: "rss" },

  // ─── API SOURCES ───
  { name: "api_github_jobs",   url: () => `https://jobs.github.com/positions.json?description=engineer&location=remote`, type: "json_api" },

  // ─── RSS WITH KEYWORD ROTATION ───
  { name: "remotive_dev",      url: kw => `https://remotive.com/remote-jobs/feed/?s=${enc(kw)}&job_type=developer`, type: "rss" },
  { name: "wework_prog",       url: () => `https://weworkremotely.com/categories/remote-programming-jobs.rss`, type: "rss" },
  { name: "wework_frontend",   url: () => `https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss`, type: "rss" },
  { name: "wework_fullstack",  url: () => `https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss`, type: "rss" },
];

function enc(s) { return encodeURIComponent(s); }

function parseGitHubJobs(data, source) {
  if (!Array.isArray(data)) return [];
  return data.slice(0, CFG.MAX_JOBS_PER_SRC).map(j => {
    const title = (j.title || "").trim();
    const desc = (j.description || "").replace(/<[^>]+>/g, " ").slice(0, 800);
    const url = j.url || "";
    const budget = 0;
    const id = hashSync(title + desc);
    const dom = detectDomain(title, desc);
    const ms = matchScore(title, desc);
    return { id, source, title: title.slice(0,150), description: desc, url, budget_max: budget, budget_type: "unknown", skills: "", domain: dom, match_score: ms };
  });
}

async function scanAll(env) {
  const cache = env.CACHE;
  const cycle = parseInt((await cache.get("cycle")) || "0") + 1;
  await cache.put("cycle", String(cycle));

  await tScanStart(cycle, env);
  await dbLog(env.DB, "scan_start", `Cycle ${cycle} started`);

  const allJobs = [];
  const kws = CFG.KEYWORDS;

  const offset = ((cycle - 1) * 8) % Math.max(1, PLATFORMS.length - CFG.SCAN_BATCH);
  const rotated = [...PLATFORMS.slice(offset), ...PLATFORMS.slice(0, offset)].slice(0, CFG.SCAN_BATCH);

  let fetchLog = [];
  for (const src of rotated) {
    try {
      const kw = kws[cycle % kws.length];
      const url = typeof src.url === "function" ? src.url(kw) : src.url;
      let jobs = [];
      let status = "ok";

      if (src.type === "json_api") {
        const data = await fetchJSON(url);
        if (data) {
          jobs = parseGitHubJobs(data, src.name);
        } else { status = "empty_api"; }
      } else {
        const xml = await fetchText(url);
        if (xml) {
          jobs = parseRSS(xml, src.name);
        } else { status = "empty_rss"; }
      }

      allJobs.push(...jobs);
      fetchLog.push(`${src.name}=${jobs.length}(${status})`);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));
    } catch (e) {
      fetchLog.push(`${src.name}=ERR:${e.message.slice(0,40)}`);
    }
  }

  const seen = new Set();
  const unique = [];
  for (const j of allJobs) {
    if (!seen.has(j.id) && j.match_score >= 5) {
      seen.add(j.id);
      unique.push(j);
    }
  }

  const newJobs = [];
  const alerts = [];
  for (const j of unique) {
    if (await dbInsertJob(env.DB, j)) {
      newJobs.push(j);
      if (j.budget_max >= 500 || j.match_score >= 25) alerts.push(j);
    }
  }

  let props = 0;
  const topAlerts = alerts.sort((a, b) => b.match_score - a.match_score).slice(0, 4);
  for (const job of topAlerts) {
    await tJobFound(job, env);
    const prop = await genProposal(job, env);
    const pid = hashSync(job.id + prop.content.slice(0, 40));
    await dbSaveProposal(env.DB, { id: pid, job_id: job.id, content: prop.content, price: prop.price, humanity_score: prop.humanity, domain: job.domain });
    await tProposal(prop, job, env);
    props++;
  }

  const stats = await dbStats(env.DB);
  const logMsg = `Cycle ${cycle}: ${newJobs.length} new, ${props} proposals. Sources: ${fetchLog.join(" | ")}`;
  await tSummary(cycle, newJobs, props, stats, env);
  await dbLog(env.DB, "scan_complete", logMsg);
  console.log(`Scan #${cycle}: ${newJobs.length} new jobs, ${props} proposals`);

  return { cycle, newJobs: newJobs.length, proposals: props, sources: rotated.length };
}

// ═══ DASHBOARD HTML ═══
const DASHBOARD = `<!DOCTYPE html>
<html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>FDE v2.1</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
body{background:#0a0a0f;color:#e0e0e0;padding:20px}
h1{font-size:26px;color:#00ff88;margin-bottom:4px}
.subtitle{color:#888;font-size:13px;margin-bottom:16px}
.status-bar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.badge{background:#1a1a2e;border:1px solid #2a2a3e;border-radius:8px;padding:8px 14px;font-size:12px}
.badge .v{color:#00ff88;font-weight:700}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px}
.stat{background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;padding:14px;text-align:center}
.stat .n{font-size:26px;font-weight:700;color:#00ff88}
.stat .l{font-size:11px;color:#888;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
th{background:#1a1a2e;color:#00ff88;padding:8px;text-align:left;position:sticky;top:0;font-size:11px}
td{padding:8px;border-bottom:1px solid #222}
tr:hover{background:#151525}
.bud{color:#00ff88;font-weight:700;font-size:13px}
.sc{padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700}
.sh{background:#00ff8820;color:#00ff88}.sm{background:#ffaa0020;color:#ffaa00}.sl{background:#ff444420;color:#ff4444}
.dt{background:#2a2a3e;padding:2px 7px;border-radius:4px;font-size:10px;color:#aaa}
.src{font-size:10px;color:#666}
.ft{margin-top:20px;text-align:center;color:#555;font-size:11px}
a{color:#00ff88;text-decoration:none}
button{background:#00ff88;color:#000;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;margin-bottom:16px}
button:hover{background:#00cc6a}
.sources{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin:12px 0}
.sr{background:#111;border:1px solid #222;border-radius:6px;padding:6px 10px;font-size:11px;color:#888}
.sr .ok{color:#00ff88}.sr .off{color:#444}
</style></head><body>
<h1>Freelance Domination Engine v2.1</h1>
<div class=subtitle>20 working sources | FEA · Flutter · AI · General | All budgets | Scans every 3 min</div>
<div class=status-bar id=bar></div>
<button onclick="triggerScan()">⚡ TRIGGER MANUAL SCAN</button>
<div class=stats id=stats></div>
<h2 style="font-size:16px;color:#00ff88;margin:16px 0 8px">📡 Active Sources</h2>
<div class=sources id=sources></div>
<h2 style="font-size:16px;color:#00ff88;margin:16px 0 8px">📋 Recent Jobs</h2>
<table><thead><tr><th>Budget<th>M%<th>Domain<th>Title<th>Source</thead><tbody id=jobs></tbody></table>
<div class=ft>Auto-refreshes every 20s | <a href="/api/health">Health</a> | <a href="/api/stats">Stats</a> | <a href="/api/jobs">All Jobs</a> | <a href="/api/test-telegram">Test TG</a> | <a href="/api/cron-status">Cron</a></div>
<script>
const ALL_SRC = ["WeWorkRemotely","WorkingNomads","Remotive","HN WhoIsHiring","EuroTechJobs","CryptoJobs","CodePen","Landing.jobs","4DayWeek","SlashDev","RemoteOK","Reddit r/slavelabour","Reddit r/forhire","Reddit r/hiring","Reddit r/freelance","GitHub Jobs API","Remotive (dev)","WWR Programming","WWR Frontend","WWR Fullstack"];
async function load(){
  try{
    const s=await(await fetch('/api/stats')).json();
    document.getElementById('stats').innerHTML='<div class=stat><div class=n>'+s.total+'</div><div class=l>Total Jobs</div></div><div class=stat><div class=n>'+s.new_jobs+'</div><div class=l>New</div></div><div class=stat><div class=n>'+s.proposals+'</div><div class=l>Proposals</div></div>';
    const h=await(await fetch('/api/health')).json();
    const tgStatus = typeof h.telegram === 'object' ? (h.telegram.bot_ok ? '✅ ' + h.telegram.bot_username : '❌ error') : h.telegram;
    document.getElementById('bar').innerHTML='<span class=badge>⚡ Status: <span class=v>'+h.status+'</span></span><span class=badge>🤖 Gemini: <span class=v>'+h.gemini+'</span></span><span class=badge>📱 Telegram: <span class=v>'+tgStatus+'</span></span><span class=badge>💰 Min: <span class=v>$'+h.min_budget+'</span></span>';
    document.getElementById('sources').innerHTML=ALL_SRC.map(s=>'<div class=sr><span class=ok>●</span> '+s+'</div>').join('');
    const js=await(await fetch('/api/jobs?limit=25')).json();
    document.getElementById('jobs').innerHTML=js.map(j=>{
      const sc=Math.round(j.match_score||0);
      const cls=sc>=60?'sh':sc>=30?'sm':'sl';
      return '<tr><td class=bud>'+(j.budget_max>0?'$'+j.budget_max.toLocaleString():'N/A')+'<td><span class="sc '+cls+'">'+sc+'%</span><td><span class=dt>'+(j.domain||'General')+'</span><td><a href="'+j.url+'" target=_blank>'+(j.title||'').slice(0,60)+'</a><td><span class=src>'+j.source+'</span>';
    }).join('')||'<tr><td colspan=5 style="text-align:center;color:#666;padding:20px">No jobs yet — first scan running...</td></tr>';
  }catch(e){document.getElementById('jobs').innerHTML='<tr><td colspan=5 style="text-align:center;color:#666;padding:20px">Loading...</td></tr>';}
}
async function triggerScan(){
  const b=document.querySelector('button');b.textContent='Scanning...';b.disabled=true;
  try{await fetch('/api/scan',{method:'POST'});b.textContent='Scan Triggered!';}catch{b.textContent='Error';}
  setTimeout(()=>{b.textContent='⚡ TRIGGER MANUAL SCAN';b.disabled=false;},3000);
}
load();setInterval(load,20000);
</script></body></html>`;

// ═══ API ROUTER ═══
async function router(req, env) {
  const u = new URL(req.url);
  const p = u.pathname;
  const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  if (p === "/" || p === "/dashboard") return new Response(DASHBOARD, { headers: { "Content-Type": "text/html" } });

  if (p === "/api/health") {
    const botInfo = await tGetMe(env);
    return new Response(JSON.stringify({
      status: "live", gemini: env.GEMINI_API_KEY?.startsWith("AIza") ? "active" : "missing",
      telegram: { token_set: !!env.TELEGRAM_BOT_TOKEN, chat_id_set: !!env.TELEGRAM_CHAT_ID, bot_username: botInfo.result?.username || null, bot_ok: botInfo.ok },
      min_budget: CFG.MIN_BUDGET, sources: PLATFORMS.length, version: "2.1.1", time: new Date().toISOString()
    }), { headers: CORS });
  }

  if (p === "/api/stats") return new Response(JSON.stringify(await dbStats(env.DB)), { headers: CORS });
  if (p === "/api/jobs") { const lim = parseInt(u.searchParams.get("limit") || "50"); return new Response(JSON.stringify(await dbGetJobs(env.DB, lim)), { headers: CORS }); }
  if (p === "/api/proposals") return new Response(JSON.stringify(await dbGetProposals(env.DB)), { headers: CORS });
  if (p === "/api/logs") { const { results } = await env.DB.prepare(`SELECT * FROM logs ORDER BY created DESC LIMIT 50`).all(); return new Response(JSON.stringify(results || []), { headers: CORS }); }

  if (p === "/api/scan" && req.method === "POST") {
    try { const r = await scanAll(env); return new Response(JSON.stringify({ triggered: true, ...r }), { headers: CORS }); }
    catch (e) { await tError("Scan", e, env); return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS }); }
  }

  if (p === "/api/startup") {
    const result = await tStartup(env);
    return new Response(JSON.stringify({ startup: "sent", telegram: result }), { headers: CORS });
  }

  if (p === "/api/test-telegram") {
    const botInfo = await tGetMe(env);
    const testMsg = await tSend(`🧪 <b>Telegram Test</b>\nIf you see this, your bot is WORKING!\nBot: ${botInfo.result?.username || "unknown"}\nTime: ${new Date().toISOString()}`, env);
    return new Response(JSON.stringify({ bot: botInfo, testMessage: testMsg, chat_id: env.TELEGRAM_CHAT_ID }), { headers: CORS });
  }

  if (p === "/api/cron-status") {
    const cycle = await env.CACHE.get("cycle") || "0";
    const lastLog = await env.DB.prepare(`SELECT * FROM logs ORDER BY created DESC LIMIT 5`).all();
    return new Response(JSON.stringify({ cycle, cron_schedule: "*/3 * * * *", last_logs: lastLog.results || [] }), { headers: CORS });
  }

  return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: CORS });
}

// ═══ ENTRY POINTS ═══
export default {
  async fetch(req, env, ctx) {
    await dbInit(env.DB);
    const startupKey = "startup_done";
    const started = await env.CACHE.get(startupKey);
    if (!started) {
      await env.CACHE.put(startupKey, "1", { expirationTtl: 86400 });
      ctx.waitUntil((async () => {
        await tStartup(env);
        await scanAll(env);
      })());
    }
    return router(req, env);
  },

  async scheduled(event, env, ctx) {
    await dbInit(env.DB);
    ctx.waitUntil((async () => {
      try { await scanAll(env); }
      catch (e) { console.error("Cron failed:", e); await tError("Cron", e, env); }
    })());
  }
};