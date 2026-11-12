-- One immutable reward per activity/week. Only the scoped server bridge can use it.
create table public.garden_gems (
 user_id uuid not null references public.garden_profiles(user_id) on delete cascade,
 activity text not null check(activity in ('prayer','chinese')),
 week_start date not null,
 awarded_at timestamptz not null default now(),
 primary key(user_id,activity,week_start)
);
alter table public.garden_gems enable row level security;
revoke all on public.garden_gems from public,anon,authenticated;
grant all on public.garden_gems to service_role;
-- Preserve v1 actions and receipt validation, including old-client compatibility.
alter function public.garden_sync(uuid,jsonb) rename to garden_sync_v1;
create function public.garden_sync(owner uuid, actions jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 result jsonb; p public.garden_profiles%rowtype; gp integer; ge integer; ew integer;
 day_now date:=(now() at time zone 'Asia/Shanghai')::date;
 week_now date:=day_now-extract(dow from day_now)::integer;
 awards jsonb;
begin
 -- v1 locks this owner's profile for the whole transaction, serializing awards.
 result:=public.garden_sync_v1(owner,actions);
 select * into strict p from public.garden_profiles where user_id=owner;
 select count(*) into gp from public.garden_gems where user_id=owner and activity='prayer';
 insert into public.garden_gems(user_id,activity,week_start)
 select owner,'prayer',w from (
  select credit_day-extract(dow from credit_day)::integer w
  from public.garden_prayers where user_id=owner and active
  group by 1 having count(*)>=7
 ) q where not exists(select 1 from public.garden_gems g where g.user_id=owner and g.activity='prayer' and g.week_start=q.w)
 order by w limit greatest(0,52-gp) on conflict do nothing;
 select count(*) into ge from public.garden_gems where user_id=owner and activity='chinese';
 with completions as (
  select distinct on(coalesce(nullif(event_data->>'sessionId',''),event_id)) ("timestamp" at time zone 'Asia/Shanghai')::date d
  from public.review_events where user_id=owner and "timestamp">=p.started_at and "timestamp"<=now()+interval '5 minutes'
   and event_data->>'source'='game' and event_data->>'type'='complete'
  order by coalesce(nullif(event_data->>'sessionId',''),event_id),"timestamp"
 ), qualified as (select d-extract(dow from d)::integer w from completions group by 1 having count(*)>=7)
 insert into public.garden_gems(user_id,activity,week_start)
 select owner,'chinese',w from qualified q
 where not exists(select 1 from public.garden_gems g where g.user_id=owner and g.activity='chinese' and g.week_start=q.w)
 order by w limit greatest(0,52-ge) on conflict do nothing;
 with completions as (
  select distinct on(coalesce(nullif(event_data->>'sessionId',''),event_id)) ("timestamp" at time zone 'Asia/Shanghai')::date d
  from public.review_events where user_id=owner and "timestamp">=p.started_at and "timestamp"<=now()+interval '5 minutes'
   and event_data->>'source'='game' and event_data->>'type'='complete'
  order by coalesce(nullif(event_data->>'sessionId',''),event_id),"timestamp"
 ) select count(*) into ew from completions where d>=week_now and d<week_now+7;
 select count(*) filter(where activity='prayer'),count(*) filter(where activity='chinese') into gp,ge from public.garden_gems where user_id=owner;
 select coalesce(jsonb_agg(jsonb_build_object('activity',activity,'week',week_start,'awardedAt',awarded_at) order by week_start,activity),'[]') into awards from public.garden_gems where user_id=owner;
 return jsonb_set(result,'{state}',(result->'state')||jsonb_build_object('gp',gp,'ge',ge,'episodeWeekTotal',ew,'gemWeeks',awards,'startedAt',extract(epoch from p.started_at)::bigint));
end $$;
revoke all on function public.garden_sync(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.garden_sync(uuid,jsonb) to service_role;
