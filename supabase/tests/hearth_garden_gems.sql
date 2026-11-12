-- Transactional integration test; never retain fixture accounts or events.
BEGIN;
DO $$
declare u uuid:=gen_random_uuid(); d date:=(now() at time zone 'Asia/Shanghai')::date; w date; r jsonb; n integer;
begin
 w:=d-extract(dow from d)::integer;
 insert into auth.users(id) values(u);
 insert into public.garden_profiles(user_id,started_at) values(u,now()-interval '500 days');
 -- Exactly one weekly award, including offline historical weeks and no missed-week gaps.
 insert into public.garden_prayers(user_id,id,credit_day,recorded_at) select u,'p'||i,d,now() from generate_series(1,7) i;
 insert into public.garden_prayers(user_id,id,credit_day,recorded_at) select u,'old'||i,w-14,now()-interval '14 days' from generate_series(1,7) i;
 insert into public.review_events(user_id,event_id,event_data,"timestamp") select u,'e'||i,jsonb_build_object('source','game','type','complete','sessionId','attempt'||i),now() from generate_series(1,9) i;
 -- A duplicate event with the same attempt does not count.
 insert into public.review_events values(u,'duplicate',jsonb_build_object('source','game','type','complete','sessionId','attempt1'),now());
 r:=public.garden_sync(u,'[]');
 assert (r#>>'{state,gp}')::int=2,'prayer gems across nonconsecutive weeks';
 assert (r#>>'{state,ge}')::int=1,'one Chinese gem per week';
 assert (r#>>'{state,episodeWeekTotal}')::int=9,'episode overflow counts unique attempts';
 assert (r#>>'{state,ew}')::int=7,'old client remains capped';
 r:=public.garden_sync(u,'[]');assert (r#>>'{state,gp}')::int=2,'sync retry duplicated award';
 update public.garden_prayers set active=false where user_id=u and id='p7';
 r:=public.garden_sync(u,'[]');assert (r#>>'{state,gp}')::int=2,'earned gems survive correction';
 assert (r#>>'{state,pw}')::int=6,'weekly count still corrects';
 -- Fill beyond one border; the first completed border persists at exactly 52.
 insert into public.garden_prayers(user_id,id,credit_day,recorded_at)
 select u,'history-'||a||'-'||b,w-a*7,now()-a*interval '7 days' from generate_series(3,60) a cross join generate_series(1,7) b;
 r:=public.garden_sync(u,'[]');assert (r#>>'{state,gp}')::int=52,'border caps at 52 independent rewards';
 assert (r#>>'{state,ge}')::int=1,'prayer must not award Chinese';
 assert jsonb_array_length(r#>'{state,gemWeeks}')=53,'backup contains award ledger';
 assert not has_table_privilege('anon','public.garden_gems','SELECT'),'anonymous table access';
 assert not has_table_privilege('authenticated','public.garden_gems','INSERT'),'direct client write access';
 assert not has_function_privilege('anon','public.garden_sync(uuid,jsonb)','EXECUTE'),'anonymous RPC access';
end $$;
select 'PASS: gem awards, gaps, retries, corrections, overflow, cap, independent tracks, backup and permissions' as test_result;

ROLLBACK;
