-- ─────────────────────────────────────────────────────────────
-- AXIOM — Supabase Database Migration
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- Enable pgvector extension
create extension if not exists vector;

-- ── Tables ────────────────────────────────────────────────────

-- User sessions
create table if not exists axiom_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'
);

-- Messages per session
create table if not exists axiom_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references axiom_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'agent', 'system')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Long-term memory with vector embeddings
create table if not exists axiom_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  embedding vector(384),   -- all-MiniLM-L6-v2 dimensions
  memory_type text not null default 'conversation'
    check (memory_type in ('conversation', 'fact', 'preference', 'task')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Agent run logs
create table if not exists axiom_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references axiom_sessions(id) on delete set null,
  agents_used text[] default '{}',
  input_text text not null,
  output_text text not null,
  tokens_used integer default 0,
  duration_ms integer default 0,
  created_at timestamptz default now()
);

-- Dynamic tool registry (persisted)
create table if not exists axiom_tools (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text not null,
  domain text not null,
  parameters jsonb default '{}',
  enabled boolean default true,
  version text default '1.0.0',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────

create index if not exists axiom_messages_session_idx
  on axiom_messages(session_id);

create index if not exists axiom_messages_user_idx
  on axiom_messages(user_id);

create index if not exists axiom_memories_user_idx
  on axiom_memories(user_id);

-- pgvector HNSW index for fast ANN search
create index if not exists axiom_memories_embedding_idx
  on axiom_memories using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists axiom_runs_user_idx
  on axiom_runs(user_id);

-- ── Vector Search Function ─────────────────────────────────────

create or replace function search_memories(
  query_embedding vector(384),
  match_user_id uuid,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  memory_type text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    axiom_memories.id,
    axiom_memories.content,
    axiom_memories.memory_type,
    axiom_memories.metadata,
    1 - (axiom_memories.embedding <=> query_embedding) as similarity,
    axiom_memories.created_at
  from axiom_memories
  where
    axiom_memories.user_id = match_user_id
    and 1 - (axiom_memories.embedding <=> query_embedding) > match_threshold
  order by axiom_memories.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ── Row Level Security ─────────────────────────────────────────

alter table axiom_sessions enable row level security;
alter table axiom_messages enable row level security;
alter table axiom_memories enable row level security;
alter table axiom_runs enable row level security;

-- Users can only access their own data
create policy "Users own their sessions"
  on axiom_sessions for all
  using (auth.uid() = user_id);

create policy "Users own their messages"
  on axiom_messages for all
  using (auth.uid() = user_id);

create policy "Users own their memories"
  on axiom_memories for all
  using (auth.uid() = user_id);

create policy "Users own their runs"
  on axiom_runs for all
  using (auth.uid() = user_id);

-- Tools are read-only for all authenticated users
alter table axiom_tools enable row level security;
create policy "Authenticated users can read tools"
  on axiom_tools for select
  using (auth.role() = 'authenticated');

-- ── Seed: Default Tool Registry ────────────────────────────────

insert into axiom_tools (name, description, domain, parameters) values
  ('web_search', 'Search the web for current information', 'web', '{"query": "string"}'),
  ('scrape_url', 'Extract content from a URL', 'web', '{"url": "string"}'),
  ('get_stock_price', 'Fetch real-time stock price', 'finance', '{"ticker": "string"}'),
  ('get_crypto_price', 'Fetch cryptocurrency price', 'finance', '{"symbol": "string"}'),
  ('run_python', 'Execute Python code snippet', 'code', '{"code": "string"}'),
  ('search_github', 'Search GitHub repositories and code', 'code', '{"query": "string"}'),
  ('search_arxiv', 'Search academic papers on arXiv', 'research', '{"query": "string"}'),
  ('summarize_pdf', 'Summarize a PDF document from URL', 'research', '{"url": "string"}')
on conflict (name) do nothing;
