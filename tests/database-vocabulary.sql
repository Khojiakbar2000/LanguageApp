\set ON_ERROR_STOP on
set role service_role;
insert into public.vocabulary_entries(source_entry_id,word,dictionary_grade,difficulty_level)
values('vocab-test-1','사랑','초급','beginner');
insert into public.vocabulary_entries(source_entry_id,word,dictionary_grade,difficulty_level)
values('vocab-test-1','사랑','초급','beginner') on conflict(source_entry_id) do update set word=excluded.word;
insert into public.vocabulary_meanings(vocabulary_id,definition,translation,sense_order)
select id,'아끼고 소중히 여기는 마음.','love',1 from public.vocabulary_entries where source_entry_id='vocab-test-1';
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $$
declare session_id uuid; word_id uuid; answer_no integer; answer_uuid uuid;
begin
  select id into word_id from public.vocabulary_entries where source_entry_id='vocab-test-1';
  if (select count(*) from public.vocabulary_entries where source_entry_id='vocab-test-1')<>1 then raise exception 'Source entry duplicate was created'; end if;
  if (select count(*) from public.search_vocabulary('사랑',null,null,60,0))<>1 then raise exception 'Unicode vocabulary search failed'; end if;
  session_id := public.start_vocabulary_review_session();
  for answer_no in 1..3 loop
    answer_uuid := ('c1000000-0000-4000-8000-' || lpad(answer_no::text,12,'0'))::uuid;
    perform public.record_vocabulary_review_answer(
      answer_uuid,
      session_id,word_id,true);
  end loop;
  perform public.record_vocabulary_review_answer(answer_uuid,session_id,word_id,false);
  if (select familiarity from public.user_vocabulary_progress where user_id=auth.uid() and vocabulary_id=word_id)<>3 then
    raise exception 'Review answers did not persist familiarity';
  end if;
  if (select incorrect_count from public.user_vocabulary_progress where user_id=auth.uid() and vocabulary_id=word_id)<>0 then
    raise exception 'Duplicate review request changed progress';
  end if;
  if (select next_review_at from public.user_vocabulary_progress where user_id=auth.uid() and vocabulary_id=word_id)<now()+interval '23 hours' then
    raise exception 'Correct response did not schedule review';
  end if;
  if not public.complete_vocabulary_review_session(session_id) then raise exception 'Three-answer session did not complete'; end if;
  if not exists(select 1 from public.learning_events where user_id=auth.uid() and activity_type='vocabulary_review' and source_activity_id=session_id) then
    raise exception 'Completed vocabulary review did not qualify via streak pipeline';
  end if;
  if public.complete_vocabulary_review_session(session_id) is distinct from true then raise exception 'Review completion was not idempotent'; end if;
  if (select learned from jsonb_to_record(public.get_vocabulary_progress_summary()->'beginner') as summary(learned integer))<>1 then
    raise exception 'Per-level progress summary is incorrect';
  end if;
  begin insert into public.user_vocabulary_progress(user_id,vocabulary_id) values(auth.uid(),word_id); raise exception 'Direct user progress write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $$ begin
  if (select count(*) from public.user_vocabulary_progress)<>0 then raise exception 'Cross-user vocabulary progress leak'; end if;
  if (select count(*) from public.vocabulary_entries where source_entry_id='vocab-test-1')<>1 then raise exception 'Dictionary entry should be shared'; end if;
end $$;
reset role;
select 'Vocabulary review, progress, and RLS tests passed' as result;
