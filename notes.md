Repo live: https://github.com/t2ac32/ks-shunka

  Next: Deploy to Vercel

  To get your live URL, you have two options:

  A) Via Vercel dashboard (easiest):
  1. Go to vercel.com → New Project → Import t2ac32/ks-shunka
  2. Framework preset: Vite (auto-detected)
  3. Add environment variables:
    - VITE_SUPABASE_URL — from your Supabase project settings
    - VITE_SUPABASE_ANON_KEY — from your Supabase project settings
  4. Deploy → you'll get https://ks-shunka.vercel.app (or similar)

  B) Via Vercel CLI:
  npm i -g vercel
  vercel --prod

  Also needed: Supabase setup

  Run these two SQL statements in your Supabase SQL editor:

  create table registrations (
    id uuid primary key default gen_random_uuid(),
    tournament_code text not null,
    full_name text not null,
    nickname text,
    decks jsonb not null default '[]',
    status text not null default 'pending',
    submitted_at timestamptz not null default now(),
    unique(tournament_code, full_name)
  );
  alter table registrations enable row level security;
  create policy "public insert" on registrations for insert with check (true);
  create policy "public update" on registrations for update using (true);
  create policy "select by code" on registrations for select using (true);

  create table tournaments (
    code text primary key,
    name text not null,
    created_at timestamptz default now()
  );
  alter table tournaments enable row level security;
  create policy "public read" on tournaments for select using (true);
  create policy "public upsert" on tournaments for insert with check (true);
  create policy "public update" on tournaments for update using (true);

  Once Vercel is connected and Supabase env vars are set, the app will be fully live — organizer at /, players registering at
   /registro/YOUR_CODE.
