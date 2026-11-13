-- Manual equivalents are private garden credits, never fake study review events.
create table public.garden_chinese (
 user_id uuid not null references public.garden_profiles(user_id) on delete cascade,
 id text not null, credit_day date not null, recorded_at timestamptz not null,
 active boolean not null default true, primary key(user_id,id)
);
create index garden_chinese_day on public.garden_chinese(user_id,credit_day) where active;
alter table public.garden_chinese enable row level security;
revoke all on public.garden_chinese from public,anon,authenticated;
grant all on public.garden_chinese to service_role;

create function public.garden_completion_days(owner uuid, since timestamptz)
returns table(d date) language sql stable security invoker set search_path=public,pg_temp as $$
 select (t at time zone 'Asia/Shanghai')::date from (
  select distinct on(coalesce(nullif(event_data->>'sessionId',''),event_id)) "timestamp" t
  from public.review_events where user_id=owner and "timestamp">=since and "timestamp"<=now()+interval '5 minutes'
   and event_data->>'source'='game' and event_data->>'type'='complete'
  order by coalesce(nullif(event_data->>'sessionId',''),event_id),"timestamp"
 ) automatic
 union all select credit_day from public.garden_chinese where user_id=owner and active;
$$;
revoke all on function public.garden_completion_days(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.garden_completion_days(uuid,timestamptz) to service_role;

create or replace function public.garden_sync_v1(owner uuid, actions jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 p public.garden_profiles%rowtype;
 op jsonb; receipt public.garden_receipts%rowtype;
 day_now date := (now() at time zone 'Asia/Shanghai')::date;
 week_now date := day_now-extract(dow from day_now)::integer;
 credit date; recorded timestamptz; recorded_day date; recorded_week date;
 err text; cnt integer; pw integer; ew integer; total_p integer; total_e integer;
 pt integer; et integer; ps integer; es integer; mask integer:=1; chosen integer;
 acks jsonb:='[]'; rejected jsonb:='[]'; counts jsonb; history jsonb;
begin
 if jsonb_typeof(actions)<>'array' or jsonb_array_length(actions)>32 then raise exception 'Invalid action batch'; end if;
 select * into p from public.garden_profiles where user_id=owner for update;
 if not found then raise exception 'Pair the world first'; end if;
 for op in select value from jsonb_array_elements(actions) loop
  if coalesce(op->>'id','') !~ '^[a-zA-Z0-9:_-]{1,100}$' then raise exception 'Invalid action ID'; end if;
  select * into receipt from public.garden_receipts where user_id=owner and id=op->>'id';
  if found then
   acks:=acks||jsonb_build_array(op->>'id');
   if not receipt.accepted then rejected:=rejected||jsonb_build_array(jsonb_build_object('id',op->>'id','reason',receipt.reason)); end if;
   continue;
  end if;
  err:='';
  begin
   recorded:=to_timestamp((op->>'occurred')::bigint);
   recorded_day:=(recorded at time zone 'Asia/Shanghai')::date;
   recorded_week:=recorded_day-extract(dow from recorded_day)::integer;
   if recorded>now()+interval '5 minutes' or recorded<p.started_at-interval '7 days' then err:='Check watch date and time';
   elsif op->>'kind'='add' then
    credit:=date '1970-01-01'+(op->>'day')::integer;
    if credit<recorded_week or credit>recorded_day then err:='Choose today or an earlier day in that week';
    else
     select count(*) into cnt from public.garden_prayers where user_id=owner and active and credit_day>=recorded_week and credit_day<recorded_week+7;
     if cnt>=7 then err:='This week already has seven prayers';
     else insert into public.garden_prayers(user_id,id,credit_day,recorded_at) values(owner,op->>'id',credit,recorded) on conflict do nothing;
     end if;
    end if;
   elsif op->>'kind'='undo' then
    update public.garden_prayers set active=false where user_id=owner and id=op->>'target' and active and credit_day>=recorded_week and credit_day<recorded_week+7;
    if not found then err:='That prayer is not available to undo this week'; end if;
   elsif op->>'kind'='undo_day' then
    credit:=date '1970-01-01'+(op->>'day')::integer;
    if credit<recorded_week or credit>recorded_day then err:='Choose a day in this week';
    else
     update public.garden_prayers set active=false where user_id=owner and id=(select id from public.garden_prayers where user_id=owner and credit_day=credit and active order by recorded_at desc,id desc limit 1);
     if not found then err:='No prayer recorded on that day'; end if;
    end if;
   elsif op->>'kind' in ('chinese_add','chinese_undo_day') then
    credit:=date '1970-01-01'+(op->>'day')::integer;
    if credit<recorded_week or credit>recorded_day then err:='Choose today or an earlier day in that week';
    elsif op->>'kind'='chinese_add' then
     insert into public.garden_chinese(user_id,id,credit_day,recorded_at) values(owner,op->>'id',credit,recorded) on conflict do nothing;
    else
     update public.garden_chinese set active=false where user_id=owner and id=(select id from public.garden_chinese where user_id=owner and credit_day=credit and active order by recorded_at desc,id desc limit 1);
     if not found then err:='No manual Chinese entry on that day';end if;
    end if;
   elsif op->>'kind'='view' then
    chosen:=(op->>'view')::integer;
    if chosen not between -1 and 3 or (chosen=1 and p.prayer_stage<2) or (chosen=2 and p.episode_stage<2) or (chosen=3 and p.episode_stage<4) then err:='That view is not unlocked';
    else update public.garden_profiles set selected_view=chosen where user_id=owner;p.selected_view:=chosen;end if;
   else err:='Unknown action';end if;
  exception when others then err:='Invalid action';end;
  insert into public.garden_receipts values(owner,op->>'id',err='',err);
  acks:=acks||jsonb_build_array(op->>'id');
  if err<>'' then rejected:=rejected||jsonb_build_array(jsonb_build_object('id',op->>'id','reason',err));end if;
 end loop;
 select count(*),count(*) filter(where credit_day>=week_now and credit_day<week_now+7),count(*) filter(where credit_day=day_now)
 into total_p,pw,pt from public.garden_prayers where user_id=owner and active;
 with completions as (
  select (d::timestamp at time zone 'Asia/Shanghai') t from public.garden_completion_days(owner,p.started_at)
 ) select count(*),count(*) filter(where (t at time zone 'Asia/Shanghai')::date>=week_now and (t at time zone 'Asia/Shanghai')::date<week_now+7),count(*) filter(where (t at time zone 'Asia/Shanghai')::date=day_now)
 into total_e,ew,et from completions;
 select count(*) into ps from unnest(array[1,3,7,14,28,56,112,224]) n where n<=total_p;
 select count(*) into es from unnest(array[1,3,7,14,28,56,112,224]) n where n<=total_e;
 if ps>p.prayer_stage and ps>=2 then p.auto_view:=1;end if;
 if es>p.episode_stage and es>=2 then p.auto_view:=case when es>=4 then 3 else 2 end;end if;
 p.prayer_stage:=greatest(p.prayer_stage,ps);p.episode_stage:=greatest(p.episode_stage,es);
 update public.garden_profiles set prayer_stage=p.prayer_stage,episode_stage=p.episode_stage,auto_view=p.auto_view where user_id=owner;
 if p.prayer_stage>=2 then mask:=mask|2;end if;
 if p.episode_stage>=2 then mask:=mask|4;end if;
 if p.episode_stage>=4 then mask:=mask|8;end if;
 select jsonb_agg((select count(*) from public.garden_prayers where user_id=owner and active and credit_day=week_now+i) order by i) into counts from generate_series(0,6) i;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'day',credit_day-date '1970-01-01') order by recorded_at desc),'[]') into history from public.garden_prayers where user_id=owner and active and credit_day>=week_now and credit_day<week_now+7;
 return jsonb_build_object('acked',acks,'rejected',rejected,'state',jsonb_build_object(
  'day',day_now-date '1970-01-01','week',week_now-date '1970-01-01','pw',pw,'ew',least(7,ew),'pt',least(1,pt),'et',least(1,et),
  'ps',p.prayer_stage,'es',p.episode_stage,'view',case when p.selected_view=-1 then p.auto_view else p.selected_view end,'selected',p.selected_view,
  'mask',mask,'syncedAt',extract(epoch from now())::bigint,'prayerDays',counts,'prayers',history,'totalPrayers',total_p,'totalEpisodes',total_e));
end $$;
revoke all on function public.garden_sync_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.garden_sync_v1(uuid,jsonb) to service_role;

create or replace function public.garden_sync(owner uuid, actions jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 result jsonb; p public.garden_profiles%rowtype; gp integer; ge integer; ew integer;
 day_now date:=(now() at time zone 'Asia/Shanghai')::date;
 week_now date:=day_now-extract(dow from day_now)::integer;
 awards jsonb; manual_days jsonb; manual_history jsonb;
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
  select d from public.garden_completion_days(owner,p.started_at)
 ), qualified as (select d-extract(dow from d)::integer w from completions group by 1 having count(*)>=7)
 insert into public.garden_gems(user_id,activity,week_start)
 select owner,'chinese',w from qualified q
 where not exists(select 1 from public.garden_gems g where g.user_id=owner and g.activity='chinese' and g.week_start=q.w)
 order by w limit greatest(0,52-ge) on conflict do nothing;
 with completions as (
  select d from public.garden_completion_days(owner,p.started_at)
 ) select count(*) into ew from completions where d>=week_now and d<week_now+7;
 select count(*) filter(where activity='prayer'),count(*) filter(where activity='chinese') into gp,ge from public.garden_gems where user_id=owner;
 select coalesce(jsonb_agg(jsonb_build_object('activity',activity,'week',week_start,'awardedAt',awarded_at) order by week_start,activity),'[]') into awards from public.garden_gems where user_id=owner;
 select jsonb_agg((select count(*) from public.garden_chinese where user_id=owner and active and credit_day=week_now+i) order by i) into manual_days from generate_series(0,6) i;
 select coalesce(jsonb_agg(jsonb_build_object('day',d,'count',n) order by d),'[]') into manual_history from (select credit_day d,count(*) n from public.garden_chinese where user_id=owner and active group by credit_day) q;
 return jsonb_set(result,'{state}',(result->'state')||jsonb_build_object('manualChineseDays',manual_days,'manualChineseHistory',manual_history,'gp',gp,'ge',ge,'episodeWeekTotal',ew,'gemWeeks',awards,'startedAt',extract(epoch from p.started_at)::bigint));
end $$;
revoke all on function public.garden_sync(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.garden_sync(uuid,jsonb) to service_role;
