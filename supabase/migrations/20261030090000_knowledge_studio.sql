-- Knowledge Studio (docs/knowledge-studio.md). The Markdown notes in the repository (houcine-world-brain/) stay the
-- source of truth; these tables hold only work in progress and history: the owner's drafts, publication jobs, the
-- activity log and playground feedback. No knowledge is published from here: a publication commits Markdown to the
-- repository and the AI's index is rebuilt from it.
--
-- Access: ONLY the knowledge-studio Edge Function, with the service role, after it has checked is_super_admin() for
-- the caller. Row level security is on with no policy, and anon/authenticated have no grants: the browser cannot read
-- or write these tables directly.

create table public.knowledge_publications (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('committing', 'deploying', 'live', 'failed')),
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  deploy_started_at timestamptz,
  finished_at timestamptz,
  paths text[] not null default '{}',
  commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{40}$'),
  expected_fingerprint text check (expected_fingerprint is null or expected_fingerprint ~ '^[0-9a-f]{16}$'),
  error_code text check (error_code is null or error_code ~ '^[a-z_]{1,40}$'),
  attempts integer not null default 1 check (attempts between 1 and 20)
);
-- At most one publication in flight: two clicks, two tabs or two admins can never start two at once.
create unique index knowledge_publications_one_in_flight on public.knowledge_publications ((true))
  where status in ('committing', 'deploying');
create index knowledge_publications_requested_at on public.knowledge_publications (requested_at desc);

create table public.knowledge_drafts (
  path text primary key
    check (path ~ '^[a-z0-9][a-z0-9/_-]*\.md$' and path !~ '\.\.' and path !~ '//' and length(path) <= 200),
  operation text not null check (operation in ('upsert', 'archive', 'restore')),
  content text check (content is null or length(content) <= 100000),
  target_path text
    check (target_path is null or (target_path ~ '^[a-z0-9][a-z0-9/_-]*\.md$' and target_path !~ '\.\.' and length(target_path) <= 200)),
  base_sha text check (base_sha is null or base_sha ~ '^[0-9a-f]{40}$'),
  original_input text check (original_input is null or length(original_input) <= 20000),
  version integer not null default 1 check (version >= 1),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((operation = 'upsert' and content is not null) or (operation <> 'upsert' and target_path is not null))
);

create table public.knowledge_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references auth.users (id) on delete set null,
  actor_email text,
  kind text not null check (kind in (
    'draft_saved', 'draft_discarded', 'publish_requested', 'validation_failed', 'published_commit', 'index_live',
    'publish_failed', 'sync_retried', 'feedback', 'review_resolved', 'access_changed'
  )),
  path text,
  publication_id uuid references public.knowledge_publications (id) on delete set null,
  detail jsonb not null default '{}'::jsonb check (pg_column_size(detail) <= 20000)
);
create index knowledge_events_at on public.knowledge_events (at desc);
create index knowledge_events_path on public.knowledge_events (path, at desc);

-- The activity log is append-only: never edited, never deleted.
create or replace function public.knowledge_events_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'knowledge_events is append-only';
end;
$$;
create trigger knowledge_events_no_update before update or delete on public.knowledge_events
  for each row execute function public.knowledge_events_append_only();

create table public.knowledge_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text,
  rating text not null check (rating in ('correct', 'incomplete', 'incorrect', 'missing', 'outdated')),
  question text not null check (length(question) between 1 and 2000),
  answer text check (answer is null or length(answer) <= 8000),
  comment text check (comment is null or length(comment) <= 2000),
  sources jsonb not null default '[]'::jsonb check (pg_column_size(sources) <= 20000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolution text check (resolution is null or length(resolution) <= 2000)
);
create index knowledge_feedback_open on public.knowledge_feedback (created_at desc) where status = 'open';

alter table public.knowledge_publications enable row level security;
alter table public.knowledge_drafts enable row level security;
alter table public.knowledge_events enable row level security;
alter table public.knowledge_feedback enable row level security;
revoke all on public.knowledge_publications, public.knowledge_drafts, public.knowledge_events, public.knowledge_feedback
  from anon, authenticated;
