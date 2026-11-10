\set ON_ERROR_STOP on
insert into auth.users(id,raw_user_meta_data) values
 ('b1000000-0000-4000-8000-000000000004','{"panda_outfit":"pink","panda_accessory":"glasses"}'),
 ('b1000000-0000-4000-8000-000000000005','{"panda_outfit":"bad","panda_accessory":"bad"}');
do $$ begin
 if not exists(select 1 from public.profiles where id='b1000000-0000-4000-8000-000000000004' and panda_outfit='pink' and panda_accessory='glasses') then raise exception 'Panda signup metadata not seeded'; end if;
 if not exists(select 1 from public.profiles where id='b1000000-0000-4000-8000-000000000005' and panda_outfit='original' and panda_accessory='none') then raise exception 'Invalid panda metadata not normalized'; end if;
end $$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $$ declare n integer; begin
 update public.profiles set panda_outfit='pink',panda_accessory='hat' where id=auth.uid();
 if not exists(select 1 from public.profiles where panda_outfit='pink' and panda_accessory='hat') then raise exception 'Owned panda preference update failed'; end if;
 begin update public.profiles set panda_outfit='bad' where id=auth.uid(); raise exception 'Invalid outfit accepted'; exception when check_violation then null; end;
 begin update public.profiles set panda_accessory='bad' where id=auth.uid(); raise exception 'Invalid accessory accepted'; exception when check_violation then null; end;
 update public.profiles set panda_outfit='blue' where id='b1000000-0000-4000-8000-000000000004';get diagnostics n=row_count;
 if n<>0 then raise exception 'Foreign panda update allowed'; end if;
 update public.profiles set panda_outfit='original',panda_accessory='none' where id=auth.uid();
 update public.profiles set display_name='Legacy update still works' where id=auth.uid();
end $$;
reset role;
select 'Panda defaults, signup, ownership and validation tests passed' as result;
