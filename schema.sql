-- FDE Database Schema
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source TEXT,
  title TEXT,
  description TEXT,
  url TEXT,
  budget_max REAL,
  budget_type TEXT DEFAULT 'fixed',
  skills TEXT,
  match_score REAL DEFAULT 0,
  status TEXT DEFAULT 'new',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  content TEXT,
  price REAL,
  humanity_score REAL,
  domain TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
