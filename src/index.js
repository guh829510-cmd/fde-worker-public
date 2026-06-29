See the full v4.0 source code at the deployed worker or request the file. The complete 1,571-line engine includes:

## v4.0 — Conscious AI Agent

### Architecture (18 Sections, 65 Functions)
1. **Configuration** — Domain profiles with salary ranges, keywords, batch sizes
2. **20 Job Sources** — RSS + API (WWR, Remotive, HN, Reddit, GitHub, etc.)
3. **Database Layer** — 5 tables: jobs, proposals, applications, outreach, logs
4. **Job Classification** — `classifyJobType()` detects freelance vs remote
5. **Domain Detection** — FEA, Flutter, AI_Systems, General with profiles
6. **Gemini Pro AI** — Anti-hallucination prompts for proposals + cover letters
7. **Telegram Bot** — HTML formatted notifications
8. **MailChannels Email** — Free email sending from bubbletech1502@gmail.com
9. **Dual Pipeline** — Freelance (proposals) vs Remote (cover letters)
10. **Proactive Outreach** — Daily recruiter outreach engine
11. **Scan Orchestrator** — 6-phase scan with full logging
12. **API Router** — 11 endpoints
13. **Dashboard** — Dark-themed live UI
14. **Entry Points** — fetch + scheduled handlers

### Dual Pipeline
| | Freelance | Remote |
|--|-----------|--------|
| **Content** | Project proposal with pricing tiers | Professional cover letter |
| **Focus** | Portfolio, deliverables, scope | Experience, team fit, salary |
| **AI Prompt** | "Write a confident project proposal" | "Write a professional cover letter" |
| **Includes** | Starter/Pro/Full pricing | Salary expectation range |
| **Telegram** | "Freelance Opportunity · Domain" | "Remote Position · Domain" |

### Proactive Outreach
- Daily warm emails to companies posting relevant jobs
- Relationship-building tone (not cold sales)
- Max 5 outreach emails per day
- Tracked in `outreach` table with status

### Conscious AI Features
- Job type classification (freelance vs remote)
- Domain-specific profiles (no generic AI spam)
- Anti-hallucination constraints
- Humanity scoring on all outputs
- Full audit logging
