\set ON_ERROR_STOP on
insert into auth.users(id,raw_user_meta_data) values
('b1000000-0000-4000-8000-000000000001','{"display_name":"Learner A","level":"Beginner"}'),
('b1000000-0000-4000-8000-000000000002','{"display_name":"Learner B","level":"Hacked"}');
insert into storage.objects(bucket_id,name) values
('tutor-audio','b1000000-0000-4000-8000-000000000001/session/a.mp3'),
('tutor-audio','b1000000-0000-4000-8000-000000000002/session/b.mp3');
do $$ begin
  if (select level from public.profiles where id='b1000000-0000-4000-8000-000000000002')<>'Beginner' then raise exception 'Unsafe profile metadata'; end if;
end $$;
set role anon;
do $$ begin
 if (select count(*) from public.lessons)<>20 then raise exception 'Seed incomplete'; end if;
 begin perform * from public.profiles; raise exception 'Anon can read profiles'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $$ begin
 if (select count(*) from public.profiles)<>1 then raise exception 'Cross-user profile leak'; end if;
 if (select daily_reminders_enabled from public.profiles where id=auth.uid()) then raise exception 'Reminder preference default is not off'; end if;
 if (select count(*) from storage.objects)<>1 then raise exception 'Cross-user audio metadata leak'; end if;
 update public.profiles set display_name='Changed' where id=auth.uid();
 update public.profiles set daily_reminders_enabled=true where id=auth.uid();
 if not (select daily_reminders_enabled from public.profiles where id=auth.uid()) then raise exception 'Reminder preference did not persist'; end if;
 begin update public.profiles set id='b1000000-0000-4000-8000-000000000003' where id=auth.uid(); raise exception 'Can change profile identity'; exception when insufficient_privilege then null; end;
 begin insert into public.saved_expressions(user_id,korean) values('b1000000-0000-4000-8000-000000000002','안녕하세요'); raise exception 'Cross-user save allowed'; exception when insufficient_privilege then null; end;
 insert into public.saved_expressions(user_id,korean) values(auth.uid(),'안녕하세요');
 begin update public.learning_stats set total_turns=100; raise exception 'Client can forge stats'; exception when insufficient_privilege then null; end;
 begin perform public.reserve_usage(auth.uid(),'chat',1); raise exception 'Client can call quota RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $$ begin
 if (select count(*) from public.saved_expressions)<>0 then raise exception 'Cross-user review leak'; end if;
end $$;
reset role;
set role service_role;
insert into public.conversations(id,user_id,title,level,lesson_id) values('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Test','Beginner','a1000000-0000-4000-8000-000000000001');
do $$ declare c jsonb; r jsonb; n integer; begin
 c:=public.claim_turn('d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','커피을 좋아해요.');
 if c->>'state'<>'claimed' then raise exception 'Could not claim turn'; end if;
 c:=public.claim_turn('d1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','다른 말');
 if c->>'state'<>'busy' then raise exception 'Concurrent turn allowed'; end if;
 r:=public.commit_turn('d1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','{"korean":"어떤 커피를 좋아해요?","english":"What coffee do you like?","encouragement":"","corrections":[{"original":"커피을","corrected":"커피를","explanation":"Use 를.","category":"grammar"}]}');
 if jsonb_array_length(r->'corrections')<>1 then raise exception 'Corrections not committed'; end if;
 perform public.commit_turn('d1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','{}');
 if (select count(*) from public.messages)<>2 then raise exception 'Duplicate turn committed'; end if;
 if (select total_turns from public.learning_stats where user_id='b1000000-0000-4000-8000-000000000001')<>1 then raise exception 'Stats updated twice'; end if;
 if (select current_streak from public.learning_stats where user_id='b1000000-0000-4000-8000-000000000001')<>0 then raise exception 'An unfinished reply earned a streak'; end if;
 c:=public.claim_turn('d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','커피을 좋아해요.');
 if c->>'state'<>'completed' then raise exception 'Idempotency result unavailable'; end if;
 for n in 1..60 loop if not public.reserve_usage('b1000000-0000-4000-8000-000000000001','chat',1) then raise exception 'Premature limit'; end if; end loop;
 if public.reserve_usage('b1000000-0000-4000-8000-000000000001','chat',1) then raise exception 'Quota exceeded'; end if;
 for n in 1..20 loop if not public.reserve_usage('b1000000-0000-4000-8000-000000000002','start',1) then raise exception 'Premature session-start limit'; end if; end loop;
 if public.reserve_usage('b1000000-0000-4000-8000-000000000002','start',1) then raise exception 'Session-start quota exceeded'; end if;
end $$;
insert into public.messages(conversation_id,user_id,role,content,turn_request_id) values
('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','user','저는 커피를 좋아해요.','d1000000-0000-4000-8000-000000000003'),
('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','user','아이스 커피 주세요.','d1000000-0000-4000-8000-000000000004');
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',false);
set role authenticated;
select public.complete_conversation('c1000000-0000-4000-8000-000000000001');
select public.complete_conversation('c1000000-0000-4000-8000-000000000001');
do $$ begin
 if (select completed_sessions from public.learning_stats)<>1 then raise exception 'Completion is not idempotent'; end if;
 if (select completed_count from public.lesson_progress)<>1 then raise exception 'Lesson completion duplicated'; end if;
 if (select count(*) from public.learning_events where user_id=auth.uid())<>1 then raise exception 'Qualifying event missing or duplicated'; end if;
 if (select total_xp from public.learning_stats where user_id=auth.uid())<>15 then raise exception 'XP award incorrect'; end if;
 if (select current_streak from public.learning_stats where user_id=auth.uid())<>1 then raise exception 'First streak day incorrect'; end if;
 begin update public.learning_stats set current_streak=99; raise exception 'Client forged streak'; exception when insufficient_privilege then null; end;
 begin perform public.record_learning_activity(auth.uid(),'conversation','e1000000-0000-4000-8000-000000000001'); raise exception 'Client forged learning event'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
insert into public.conversations(id,user_id,title,level) values
('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Short test','Beginner');
insert into public.messages(conversation_id,user_id,role,content,turn_request_id) values
('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','user','네','d1000000-0000-4000-8000-000000000005');
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $$ begin
 if (select count(*) from public.messages where user_id='b1000000-0000-4000-8000-000000000001')<>0 then raise exception 'Cross-user transcript leak'; end if;
 if (select count(*) from public.messages where user_id=auth.uid())<>1 then raise exception 'Own transcript is unavailable'; end if;
 if (select count(*) from public.corrections)<>0 then raise exception 'Cross-user correction leak'; end if;
 begin perform public.complete_conversation('c1000000-0000-4000-8000-000000000002'); raise exception 'One reply incorrectly qualified'; exception when raise_exception then if SQLERRM<>'Practice at least three meaningful replies before finishing' then raise; end if; end;
 if (select status from public.conversations where id='c1000000-0000-4000-8000-000000000002')<>'active' then raise exception 'Short session was completed'; end if;
 if exists(select 1 from public.learning_events where user_id=auth.uid()) then raise exception 'Short session earned a qualifying event'; end if;
 begin perform public.complete_conversation('c1000000-0000-4000-8000-000000000001'); raise exception 'Foreign completion allowed'; exception when raise_exception then if SQLERRM<>'Conversation unavailable' then raise; end if; end;
end $$;
reset role;
select 'Database security and transaction tests passed' as result;
