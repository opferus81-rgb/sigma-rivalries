-- Sigma Rivalries: Datenbank. Im Supabase "SQL Editor" komplett einfügen und "Run" klicken.
create table profiles(id uuid primary key references auth.users on delete cascade,username text unique not null check(username ~ '^[A-Za-z0-9_]{3,16}$'),bio text not null default '' check(char_length(bio)<=200),role text not null default 'user' check(role in('user','mod','admin')),banned boolean not null default false,created_at timestamptz not null default now(),last_seen timestamptz not null default now());
create table messages(id bigint generated always as identity primary key,user_id uuid not null references profiles(id) on delete cascade,body text not null check(char_length(body) between 1 and 300),created_at timestamptz not null default now());
create table scores(id bigint generated always as identity primary key,user_id uuid not null references profiles(id) on delete cascade,category text not null check(char_length(category) between 1 and 30),points int not null check(points between 1 and 1000),created_at timestamptz not null default now());
create index on messages(created_at desc);create index on scores(category,created_at);

create function is_admin() returns boolean language sql security definer stable set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role='admin' and not banned)$$;
create function is_staff() returns boolean language sql security definer stable set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role in('admin','mod') and not banned)$$;
create function is_banned() returns boolean language sql security definer stable set search_path=public as $$select coalesce((select banned from profiles where id=auth.uid()),true)$$;

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(id,username) values(new.id,new.raw_user_meta_data->>'username');return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Nutzer dürfen weder Rolle noch Bann selbst ändern (SQL Editor / Admins schon)
create function guard_profile() returns trigger language plpgsql as $$begin
 if auth.uid() is not null and not is_admin() and (new.role<>old.role or new.banned<>old.banned or new.username<>old.username) then raise exception 'nicht erlaubt';end if;return new;end$$;
create trigger guard_profile before update on profiles for each row execute function guard_profile();

-- Spam-Schutz: max. 1 Eintrag pro 1,5 s, keine Einträge von gebannten Nutzern
create function rate_limit() returns trigger language plpgsql security definer set search_path=public as $$declare t timestamptz;begin
 if is_banned() then raise exception 'gebannt';end if;
 execute format('select max(created_at) from %I where user_id=$1',tg_table_name) into t using new.user_id;
 if t is not null and now()-t<interval '1.5 seconds' then raise exception 'zu schnell';end if;return new;end$$;
create trigger rl_msg before insert on messages for each row execute function rate_limit();
create trigger rl_score before insert on scores for each row execute function rate_limit();

alter table profiles enable row level security;alter table messages enable row level security;alter table scores enable row level security;
create policy p_sel on profiles for select using(true);
create policy p_upd on profiles for update using(id=auth.uid() or is_admin());
create policy m_sel on messages for select using(true);
create policy m_ins on messages for insert with check(user_id=auth.uid());
create policy m_del on messages for delete using(user_id=auth.uid() or is_staff());
create policy s_sel on scores for select using(true);
create policy s_ins on scores for insert with check(user_id=auth.uid());
create policy s_del on scores for delete using(is_admin());

create function leaderboard(period text,cat text default null) returns table(username text,total bigint,games bigint) language sql stable as $$
 select p.username,sum(s.points)::bigint,count(*)::bigint from scores s join profiles p on p.id=s.user_id
 where not p.banned and (cat is null or s.category=cat) and s.created_at>=case period when 'day' then now()-interval '1 day' when 'week' then now()-interval '7 days' else '-infinity' end
 group by p.username order by 2 desc limit 50$$;
alter publication supabase_realtime add table messages;
