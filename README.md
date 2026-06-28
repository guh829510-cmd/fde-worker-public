# Freelance Domination Engine — Cloudflare Workers Edition

Your automated freelance job acquisition system running 24/7 on Cloudflare's edge network.

## Live URL
https://freelance-domination-engine.fde-work.workers.dev

## What It Does
- Scans Upwork RSS feeds every 3 minutes for FEA, Flutter, and AI jobs ($300-$45K+)
- Generates AI-powered proposals using Gemini 1.5 Flash
- Scores proposals for "humanity" (anti-AI detection)
- Sends instant Telegram alerts for high-value jobs ($3K+)
- Provides a web dashboard with all tracked jobs
- Stores everything in D1 SQLite database

## API Endpoints
| Endpoint | Description |
|----------|-------------|
| `/` or `/dashboard` | Live dashboard |
| `/api/health` | System health check |
| `/api/stats` | Job & proposal statistics |
| `/api/jobs` | List all tracked jobs |
| `/api/proposals` | List generated proposals |
| `/api/scan` | Trigger manual scan |

## Scans Run Automatically
Every 3 minutes via Cloudflare Cron Triggers — no action needed.

## Project Structure
```
cloudflare-fde/
├── src/
│   └── index.js          # Main worker code (15KB)
├── wrangler.toml         # Cloudflare config
├── schema.sql            # D1 database schema
└── package.json          # Project metadata
```

## Managed Resources
| Resource | ID/Name | Purpose |
|----------|---------|---------|
| D1 Database | fde-db | Job & proposal storage |
| KV Namespace | fde-cache | Cycle counter & config |
| Worker Script | freelance-domination-engine | Main application |
| workers.dev | fde-work | Public URL |
