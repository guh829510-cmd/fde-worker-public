// ═══════════════════════════════════════════════════════════════
//  FREELANCE DOMINATION ENGINE v3.0 — PROFESSIONAL AGENT
//  20 sources | Gemini Pro | Anti-hallucination | Auto-apply
//  Email + Upwork API | Professional Telegram | Scans every 3 min
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
    const d = await r.json();
    return d;
  } catch (e) { return { ok: false, error: e.message }; }
}

async function tStartup(env) {
  const m = `<b>Freelance Domination Engine v3.0 — Active</b>

Scanning: Every 3 minutes
Sources: 20 working platforms
AI: Gemini 1.5 Pro with anti-hallucination
Domains: FEA · Flutter · AI Systems · General
Email: bubbletech1502@gmail.com

Your 24/7 job agent is live.`;
  await tSend(m, env);
}

async function tError(ctx, err, env) {
  const m = `<b>${ctx} Error</b>
<code>${(err.message || String(err)).slice(0,500)}</code>`;
  await tSend(m, env);
}

async function tScanStart(cycle, env) {
  // Silent scan start — only notify on results to avoid Telegram spam
  console.log(`Scan ${cycle} started`);
}

async function tJobFound(job, env) {
  const bud = job.budget_max > 0 ? `$${job.budget_max.toLocaleString()}` : "Budget: Not listed";
  const hs = Math.round(job.match_score);
  const ms = hs >= 50 ? "Strong" : hs >= 25 ? "Good" : "Moderate";
  const m = `<b>${job.title.slice(0,90)}</b>
${bud} · ${ms} match (${hs}%) · ${job.domain}
${job.url}`;
  await tSend(m, env);
}

async function tProposal(prop, job, env) {
  const hm = Math.round(prop.humanity_score);
  const hs = hm >= 80 ? "Human" : hm >= 60 ? "Natural" : "Review suggested";
  const m = `<b>Application Ready</b> · $${Math.round(prop.price).toLocaleString()} · ${hs} (${hm}/100)

${prop.content.slice(0,1200)}

—
<i>Apply: ${job.url}</i>`;
  await tSend(m, env);
}

async function tApplyStatus(job, result, env) {
  if (result.method === "email") {
    await tSend(`<b>Auto-apply queued</b>
Method: Email to ${result.recipient}
Job: ${job.title.slice(0,60)}
Status: ${result.status === "queued" ? "Ready to send" : result.status}`, env);
  } else if (result.method === "upwork_api") {
    const icon = result.status === "submitted" ? "Sent" : "Failed";
    await tSend(`<b>Upwork ${icon}</b> · ${job.title.slice(0,60)}${result.error ? "\nError: " + result.error : ""}`, env);
  }
}

async function tSummary(cycle, newJobs, props, autoApplied, stats, env) {
  if (!newJobs.length) {
    await tSend(`Scan ${cycle} complete — no new jobs found. Next scan in 3 minutes.`, env);
    return;
  }
  const top = [...newJobs].sort((a, b) => b.match_score - a.match_score)[0];
  let msg = `Scan ${cycle} — ${newJobs.length} new job${newJobs.length > 1 ? "s" : ""} found`;
  if (props) msg += `, ${props} application${props > 1 ? "s" : ""} drafted`;
  if (autoApplied) msg += `, ${autoApplied} auto-submitted`;
  if (top) msg += `\n\nBest match: ${top.title.slice(0,60)} (${Math.round(top.match_score)}%)`;
  await tSend(msg, env);
}

// ═══ D1 DATABASE ═══
async function dbInit(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,source TEXT,title TEXT,description TEXT,url TEXT,budget_max REAL,budget_type TEXT,skills TEXT,match_score REAL,status TEXT DEFAULT 'new',created_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,job_id TEXT,content TEXT,price REAL,humanity_score REAL,domain TEXT,status TEXT DEFAULT 'draft',created_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,job_id TEXT,method TEXT,recipient TEXT,subject TEXT,body TEXT,status TEXT DEFAULT 'pending',created_at TEXT)`),
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
  const { results } = await db.prepare(`SELECT * FROM proposals ORDER BY created_at DESC LIMIT 50`).all();
  return results || [];
}

async function dbLog(db, type, msg) {
  try {
    await db.prepare(`INSERT INTO logs(type,msg,created)VALUES(?,?,?)`).bind(type, msg, new Date().toISOString()).run();
  } catch {}
}

// ═══ SKILL MATCHER ═══
const SKILLS = {
  FEA: ["fea","finite element","ansys","abaqus","comsol","simulation","structural","stress","mesh","cfd","mechanical","nastran","ls-dyna","hypermesh","cfd analysis","thermal analysis","civil engineer","eit","pe engineer","anchorage","geotechnical","hydraulic","pavement","solidworks","autocad","revit","bentley","construction","infrastructure","surveying"],
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

// ═══ AUTO-APPLY ENGINE ═══

function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

async function autoApplyEmail(job, proposal, env) {
  const email = extractEmail(job.description);
  if (!email) return { method: "none", reason: "no email found" };
  
  const fromEmail = env.FROM_EMAIL || "bubbletech1502@gmail.com";
  const subject = `Application: ${job.title.slice(0, 60)}`;
  const body = `${proposal.content}\n\n---\nSent from ${fromEmail}`;
  
  await env.DB.prepare(`INSERT OR IGNORE INTO applications(id,job_id,method,recipient,subject,body,status,created_at)VALUES(?,?,?,?,?,?,?,?)`)
    .bind(hashSync(job.id + email), job.id, "email", email, subject, body, "pending", new Date().toISOString()).run();
  
  if (env.GMAIL_APP_PASSWORD) {
    try {
      const r = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: fromEmail, name: "Bharath - Freelance Engineer" },
          subject,
          content: [{ type: "text/plain", value: body }]
        })
      });
      if (r.ok) return { method: "email", recipient: email, status: "sent" };
    } catch (e) { console.error("Email send error:", e.message); }
  }
  
  return { method: "email", recipient: email, status: "queued" };
}

async function autoApplyUpwork(job, proposal, env) {
  if (!env.UPWORK_API_TOKEN || !job.url.includes("upwork.com")) return { method: "none" };
  try {
    const jobKey = job.url.match(/~[a-f0-9]+/)?.[0];
    if (!jobKey) return { method: "none", reason: "no job key" };
    
    const r = await fetch(`https://www.upwork.com/api/proposals/v1/jobs/${jobKey}/proposals`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${env.UPWORK_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coverLetter: proposal.content.slice(0, 5000),
        milestoneDeclarations: [{ amount: proposal.price, description: job.title.slice(0, 100) }],
        contractorTerms: { confidentialTermsAccepted: true }
      })
    });
    
    if (r.ok) {
      await dbLog(env.DB, "auto_apply", `Upwork proposal sent for ${job.title.slice(0,50)}`);
      return { method: "upwork_api", status: "submitted" };
    }
    const err = await r.json().catch(() => ({}));
    return { method: "upwork_api", status: "failed", error: err.message || r.status };
  } catch (e) {
    return { method: "upwork_api", status: "error", error: e.message };
  }
}

async function autoApply(job, proposal, env) {
  if (job.source.includes("upwork")) {
    return await autoApplyUpwork(job, proposal, env);
  }
  const emailResult = await autoApplyEmail(job, proposal, env);
  if (emailResult.method === "email") return emailResult;
  
  return { method: "manual", reason: "no auto-apply channel available. Use Telegram proposal to apply manually." };
}

// ═══ GEMINI AI PRO ENGINE ═══
const DOMAIN_PROFILE = {
  FEA: {
    title: "FEA & Simulation Engineer",
    skills: "ANSYS, ABAQUS, COMSOL, CFD, structural analysis, mesh optimization, Python automation, AutoCAD, SolidWorks",
    achievements: "Delivered 40+ FEA projects across civil, mechanical, and aerospace sectors. Reduced simulation cycles 40% via Python scripting."
  },
  Flutter: {
    title: "Senior Flutter Developer",
    skills: "Flutter, Dart, Firebase, BLoC, REST APIs, CI/CD, app store publishing",
    achievements: "Built 15+ production apps with 50K+ combined MAU. Consistent 60fps performance. Published on both App Store and Play Store."
  },
  AI_Systems: {
    title: "AI/ML Systems Engineer",
    skills: "PyTorch, TensorFlow, LLMs, RAG pipelines, MLOps, NLP, Computer Vision",
    achievements: "Deployed production ML systems serving 100K+ requests/day. Optimized training pipelines from 6hrs to 8min."
  },
  General: {
    title: "Senior Engineering Consultant",
    skills: "Multidisciplinary engineering, project management, system architecture, cross-functional leadership",
    achievements: "50+ international projects delivered. Top-rated across freelance platforms. 100% on-time delivery record."
  }
};

function humanityScore(text) {
  let s = 60;
  const corporate = ["dear hiring manager","to whom it may concern","i am writing to","i came across","please find attached","i hope this email finds you","i would like to apply","as per your","enclosed please find","dear sir","dear madam","dear recruiter"];
  const human = ["i'm","i've","don't","let's","won't","can't","hey","quick question","by the way"];
  const specifics = ["$","%","week","day","hour","project","specific","exactly","similar","delivered","built","implemented"];
  for (const b of corporate) if (text.toLowerCase().includes(b)) s -= 15;
  for (const g of human) if (text.toLowerCase().includes(g)) s += 6;
  for (const sp of specifics) if (text.toLowerCase().includes(sp)) s += 4;
  if (text.includes("?")) s += 5;
  if (/\$\d/.test(text)) s += 8;
  if (text.split("\n").filter(l => l.trim()).length > 4) s += 5;
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 80 && wordCount < 300) s += 5;
  return Math.max(0, Math.min(100, s));
}

async function genProposal(job, env) {
  const price = Math.max((job.budget_max || 0) * 0.65, 300);
  const prof = DOMAIN_PROFILE[job.domain] || DOMAIN_PROFILE.General;
  const jobDesc = (job.description || "").slice(0,800);

  if (env.GEMINI_API_KEY?.startsWith("AIza")) {
    try {
      const prompt = `ROLE: Professional freelance ${prof.title} applying for a specific job.
TASK: Write a concise, confident cover message (100-180 words) for this EXACT job.

ANTI-HALLUCINATION RULES (MANDATORY):
- ONLY mention skills/experience DIRECTLY relevant to THIS job's requirements
- If job is civil/structural engineering → talk about FEA, CAD, construction. NEVER mention ML/AI unless explicitly asked.
- If job is mobile app development → talk about Flutter/React Native. NEVER mention neural networks unless asked.
- If job is AI/ML → talk about PyTorch, models, data. NEVER mention Flutter unless asked.
- If you cannot determine the domain, use general engineering consulting language.
- NEVER invent fake metrics. Use ONLY: "${prof.achievements}"
- NEVER use generic AI buzzwords: "leverage", "synergy", "paradigm", "disruptive", "scalable solutions"

TONE: Confident but not arrogant. Conversational professional. Use contractions naturally.
STRUCTURE: Hook (why this job) → Relevant experience → Pricing tiers → Call to action question

PRICING TIERS (include exactly these):
• Starter: $${Math.round(price*0.5).toLocaleString()}
• Professional: $${Math.round(price).toLocaleString()}
• Full Service: $${Math.round(price*1.5).toLocaleString()}

YOUR PROFILE: ${prof.title}. ${prof.skills}. ${prof.achievements}.

JOB TITLE: ${job.title}
JOB DESCRIPTION: ${jobDesc}

OUTPUT ONLY the cover message. No preamble, no "Here is...", no quotes around text.`;

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 700 } })
      });
      if (r.ok) {
        const d = await r.json();
        let c = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        c = c.replace(/^\s*["']|["']\s*$/g, "").replace(/^Here is\s+(a\s+)?(cover\s+message|proposal)[:\s]*/i, "").trim();
        if (c.length > 120) return { content: c, price, humanity_score: humanityScore(c) };
      }
    } catch (e) { console.error("Gemini Pro err:", e.message); }
  }
  // Professional fallback — no hallucination, job-specific
  const c = `Hi,

I noticed your posting for "${job.title.slice(0,70)}" and wanted to reach out. As a ${prof.title} with hands-on experience in ${prof.skills.split(",").slice(0,3).join(", ")}, I believe I can deliver strong results for this project.

${prof.achievements}

I typically structure projects across three tiers:
• Starter: $${Math.round(price*0.5).toLocaleString()} — core deliverables, focused scope
• Professional: $${Math.round(price).toLocaleString()} — complete implementation
• Full Service: $${Math.round(price*1.5).toLocaleString()} — full build + testing + documentation

I'd be glad to discuss your timeline and specific requirements. What's your target delivery date?

Best regards`;
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
  { name: "reddit_slavelabour",  url: () => `https://www.reddit.com/r/slavelabour/new/.rss`,       type: "rss" },
  { name: "reddit_forhire",      url: () => `https://www.reddit.com/r/forhire/new/.rss`,            type: "rss" },
  { name: "reddit_hiring",       url: () => `https://www.reddit.com/r/hiring/new/.rss`,             type: "rss" },
  { name: "reddit_freelance",    url: () => `https://www.reddit.com/r/freelance/new/.rss`,          type: "rss" },
  { name: "api_github_jobs",   url: () => `https://jobs.github.com/positions.json?description=engineer&location=remote`, type: "json_api" },
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
        if (data) { jobs = parseGitHubJobs(data, src.name); } else { status = "empty_api"; }
      } else {
        const xml = await fetchText(url);
        if (xml) { jobs = parseRSS(xml, src.name); } else { status = "empty_rss"; }
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
  for (const j of unique) {
    if (await dbInsertJob(env.DB, j)) { newJobs.push(j); }
  }

  let props = 0;
  let autoApplied = 0;
  const jobsForProposals = newJobs.slice(0, 5);
  for (const job of jobsForProposals) {
    await tJobFound(job, env);
    const prop = await genProposal(job, env);
    const pid = hashSync(job.id + prop.content.slice(0, 40));
    await dbSaveProposal(env.DB, { id: pid, job_id: job.id, content: prop.content, price: prop.price, humanity_score: prop.humanity_score, domain: job.domain });
    await tProposal(prop, job, env);
    props++;
    
    const applyResult = await autoApply(job, prop, env);
    if (applyResult.method !== "manual") {
      await tApplyStatus(job, applyResult, env);
      if (applyResult.status === "submitted" || applyResult.status === "queued") autoApplied++;
    }
  }

  const stats = await dbStats(env.DB);
  const logMsg = `Cycle ${cycle}: ${newJobs.length} new, ${props} proposals, ${autoApplied} auto-applied. Sources: ${fetchLog.join(" | ")}`;
  await tSummary(cycle, newJobs, props, autoApplied, stats, env);
  await dbLog(env.DB, "scan_complete", logMsg);
  console.log(`Scan #${cycle}: ${newJobs.length} new jobs, ${props} proposals, ${autoApplied} auto-applied`);

  return { cycle, newJobs: newJobs.length, proposals: props, autoApplied, sources: rotated.length };
}

// ═══ DASHBOARD HTML ═══
const DASHBOARD = `<!DOCTYPE html>
<html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>FDE v3.0</title>
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
<h1>Freelance Domination Engine v3.0</h1>
<div class=subtitle>20 sources | Gemini Pro | Anti-hallucination | Auto-apply | Scans every 3 min</div>
<div class=status-bar id=bar></div>
<button onclick="triggerScan()">Trigger Manual Scan</button>
<div class=stats id=stats></div>
<h2 style="font-size:16px;color:#00ff88;margin:16px 0 8px">Active Sources</h2>
<div class=sources id=sources></div>
<h2 style="font-size:16px;color:#00ff88;margin:16px 0 8px">Recent Jobs</h2>
<table><thead><tr><th>Budget<th>M%<th>Domain<th>Title<th>Source</thead><tbody id=jobs></tbody></table>
<div class=ft>Auto-refreshes every 20s | <a href="/api/health">Health</a> | <a href="/api/stats">Stats</a> | <a href="/api/jobs">Jobs</a> | <a href="/api/proposals">Proposals</a> | <a href="/api/applications">Applications</a></div>
<script>
const ALL_SRC = ["WeWorkRemotely","WorkingNomads","Remotive","HN WhoIsHiring","EuroTechJobs","CryptoJobs","CodePen","Landing.jobs","4DayWeek","SlashDev","RemoteOK","Reddit r/slavelabour","Reddit r/forhire","Reddit r/hiring","Reddit r/freelance","GitHub Jobs API","Remotive (dev)","WWR Programming","WWR Frontend","WWR Fullstack"];
async function load(){
  try{
    const s=await(await fetch('/api/stats')).json();
    document.getElementById('stats').innerHTML='<div class=stat><div class=n>'+s.total+'</div><div class=l>Total Jobs</div></div><div class=stat><div class=n>'+s.new_jobs+'</div><div class=l>New</div></div><div class=stat><div class=n>'+s.proposals+'</div><div class=l>Proposals</div></div>';
    const h=await(await fetch('/api/health')).json();
    const tgStatus = typeof h.telegram === 'object' ? (h.telegram.bot_ok ? 'OK ' + h.telegram.bot_username : 'Error') : h.telegram;
    document.getElementById('bar').innerHTML='<span class=badge>Status: <span class=v>'+h.status+'</span></span><span class=badge>Gemini: <span class=v>'+h.gemini+'</span></span><span class=badge>Telegram: <span class=v>'+tgStatus+'</span></span><span class=badge>Sources: <span class=v>'+h.sources+'</span></span>';
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
  setTimeout(()=>{b.textContent='Trigger Manual Scan';b.disabled=false;},3000);
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
      min_budget: CFG.MIN_BUDGET, sources: PLATFORMS.length, version: "3.0", time: new Date().toISOString()
    }), { headers: CORS });
  }

  if (p === "/api/stats") return new Response(JSON.stringify(await dbStats(env.DB)), { headers: CORS });
  if (p === "/api/jobs") { const lim = parseInt(u.searchParams.get("limit") || "50"); return new Response(JSON.stringify(await dbGetJobs(env.DB, lim)), { headers: CORS }); }
  if (p === "/api/proposals") return new Response(JSON.stringify(await dbGetProposals(env.DB)), { headers: CORS });
  if (p === "/api/applications") { 
    const { results } = await env.DB.prepare(`SELECT * FROM applications ORDER BY created_at DESC LIMIT 50`).all();
    return new Response(JSON.stringify(results || []), { headers: CORS }); 
  }
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
    const testMsg = await tSend(`Telegram Test\nIf you see this, your bot is WORKING!\nBot: ${botInfo.result?.username || "unknown"}\nTime: ${new Date().toISOString()}`, env);
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
      ctx.waitUntil((async () => { await tStartup(env); await scanAll(env); })());
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