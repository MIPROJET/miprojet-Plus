
alter table public.mp_projects
  add column if not exists profile_kind text not null default 'pme'
    check (profile_kind in ('micro','pme','startup')),
  add column if not exists journey text not null default 'existing'
    check (journey in ('existing','project')),
  add column if not exists complexity_level text not null default 'simple'
    check (complexity_level in ('simple','intermediate','advanced'));
