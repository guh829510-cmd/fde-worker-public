# Freelance Domination Engine v2.1

24/7 automated job hunter running on Cloudflare Workers. Scans 20 working job sources every 3 minutes, finds FEA/Flutter/AI projects, generates AI proposals via Gemini, and sends instant Telegram alerts.

## Live Dashboard
https://freelance-domination-engine.fde-work.workers.dev

## Features
- **20 working sources**: WeWorkRemotely, WorkingNomads, Remotive, HN WhoIsHiring, EuroTechJobs, CryptoJobs, CodePen, Landing.jobs, 4DayWeek, SlashDev, RemoteOK, Reddit feeds, GitHub Jobs API, WWR category feeds
- **AI Proposals**: Gemini 1.5 Flash generates human-sounding proposals with 3 pricing tiers
- **Telegram Alerts**: Instant notifications for startup, scan cycles, job alerts, proposals, summaries
- **Web Dashboard**: Dark-themed live dashboard with job listings, stats, manual scan trigger
- **Auto-scans**: Every 3 minutes via Cloudflare Cron triggers
- **D1 Database**: SQLite edge database for job/proposal storage
- **Source rotation**: Cycles through all 20 sources over multiple scans

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` or `/dashboard` | GET | Live dashboard |
| `/api/health` | GET | Health check + config status |
| `/api/stats` | GET | Job/proposal counts |
| `/api/jobs?limit=N` | GET | Recent jobs |
| `/api/proposals` | GET | Recent proposals |
| `/api/logs` | GET | Scan logs |
| `/api/scan` | POST | Trigger manual scan |
| `/api/startup` | GET | Send startup Telegram message |

## Your Telegram
You should have received:
1. Startup message when the worker first activated
2. Scan cycle summaries every 3 minutes (when jobs are found)
3. Job alerts for high-match opportunities ($500+ or 25%+ match)
4. AI-generated proposals with humanity scores

## Technical Stack
- Cloudflare Workers (serverless edge)
- Cloudflare D1 (SQLite database)
- Cloudflare KV (cycle counter, startup flag)
- Cloudflare Cron Triggers (every 3 min)
- Gemini 1.5 Flash API (proposal generation)
- Telegram Bot API (instant alerts)

## Secrets Required
- `GEMINI_API_KEY` - Your Google AI API key (starts with AIza...)
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID

Set via: `wrangler secret put NAME`

## Source Reliability Notes
Many job boards have shut down their RSS feeds or block bot traffic:
- **Upwork RSS**: Dead (410 Gone)
- **Reddit search RSS**: Returns empty feeds
- **StackOverflow Jobs**: Shut down entirely
- **RemoteOK**: May block some requests
- The 20 sources in v2.1 are tested and working as of June 2026

## Deployment
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

## Cost
**Free on Cloudflare Workers free tier** (100K requests/day, 1 Cron trigger)
