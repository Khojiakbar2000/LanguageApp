alter table public.lesson_progress
  add column stage_progress text[] not null default '{}',
  add column exercise_attempts jsonb not null default '{"attempts":{},"correct":[]}'::jsonb,
  add column completed_at timestamptz;

create policy own_progress_insert on public.lesson_progress
  for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_progress_update on public.lesson_progress
  for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant insert,update on public.lesson_progress to authenticated;

alter table public.lessons add column lesson_context jsonb not null default '{}'::jsonb;

update public.lessons set title='Meeting Someone', korean_title='처음 만났어요', category='Everyday', duration_minutes=4,
  objectives='["Greet someone politely","Introduce yourself and ask their name"]'::jsonb,
  expressions='[{"korean":"안녕하세요.","english":"Hello."},{"korean":"저는 민수예요.","english":"I’m Minsu."},{"korean":"이름이 뭐예요?","english":"What’s your name?"}]'::jsonb,
  scenario='Panda meets the learner for the first time. Introduce yourself and ask the learner their name. Use beginner-friendly polite Korean.',
  lesson_context='{"vocabulary":["안녕하세요 — Hello","이름 — Name","저 — I (polite)","학생 — Student","반갑습니다 — Nice to meet you"],"objective":"Introduce yourself and ask Panda’s name.","grammar":"저는 + [Name] + 이에요/예요"}'::jsonb
where id='a1000000-0000-4000-8000-000000000001';
update public.lessons set title='Ordering Coffee', korean_title='카페에서 주문해요', category='Everyday', duration_minutes=4,
  objectives='["Choose a drink","Order politely"]'::jsonb,
  expressions='[{"korean":"아이스 아메리카노 하나 주세요.","english":"An iced Americano, please."},{"korean":"따뜻한 커피 주세요.","english":"A warm coffee, please."},{"korean":"감사합니다.","english":"Thank you."}]'::jsonb,
  scenario='Panda is a café employee ready to take the learner’s order. Help them order one drink politely using beginner-friendly Korean.',
  lesson_context='{"vocabulary":["커피 — Coffee","아메리카노 — Americano","아이스 — Iced","따뜻한 — Warm","하나 — One","주세요 — Please give me"],"objective":"Order a drink politely.","grammar":"[Item] + 주세요"}'::jsonb
where id='a1000000-0000-4000-8000-000000000002';
update public.lessons set title='Talking About Yourself', korean_title='어디에서 왔어요?', category='People', duration_minutes=4,
  objectives='["Ask where someone is from","Say where you live"]'::jsonb,
  expressions='[{"korean":"어디에서 왔어요?","english":"Where are you from?"},{"korean":"저는 미국에서 왔어요.","english":"I’m from the United States."},{"korean":"저는 서울에 살아요.","english":"I live in Seoul."}]'::jsonb,
  scenario='Panda meets the learner at a social gathering and asks where they are from. Ask where the learner lives too.',
  lesson_context='{"vocabulary":["어디 — Where","나라 — Country","한국 — Korea","미국 — United States","살다 — To live","사람 — Person"],"objective":"Say where you are from and where you live.","grammar":"[Place] + 에 살아요"}'::jsonb
where id='a1000000-0000-4000-8000-000000000003';
update public.lessons set title='Talking About Food', korean_title='음식을 좋아해요', category='Food', duration_minutes=4,
  objectives='["Name Korean foods","Say what you like and ask about preferences"]'::jsonb,
  expressions='[{"korean":"저는 김치를 좋아해요.","english":"I like kimchi."},{"korean":"비빔밥이 맛있어요.","english":"Bibimbap is delicious."},{"korean":"매운 음식을 좋아해요?","english":"Do you like spicy food?"}]'::jsonb,
  scenario='Panda chats with the learner about favorite Korean foods. Ask what the learner likes and share a favorite.',
  lesson_context='{"vocabulary":["음식 — Food","좋아하다 — To like","김치 — Kimchi","비빔밥 — Bibimbap","맛있어요 — Delicious","매워요 — Spicy"],"objective":"Say which food you like and ask about a preference.","grammar":"[Noun] + 을/를 좋아해요"}'::jsonb
where id='a1000000-0000-4000-8000-000000000004';
update public.lessons set title='Making Plans', korean_title='같이 만날까요?', category='Everyday', duration_minutes=4,
  objectives='["Ask about someone’s availability","Suggest doing something together"]'::jsonb,
  expressions='[{"korean":"내일 시간 있어요?","english":"Are you free tomorrow?"},{"korean":"주말에 뭐 해요?","english":"What are you doing this weekend?"},{"korean":"같이 커피 마실까요?","english":"Shall we have coffee together?"}]'::jsonb,
  scenario='Panda is a friend checking the learner’s availability for the weekend. Make a simple plan together.',
  lesson_context='{"vocabulary":["오늘 — Today","내일 — Tomorrow","주말 — Weekend","시간 — Time","같이 — Together","만나다 — To meet"],"objective":"Ask if Panda is free and suggest meeting.","grammar":"[Verb stem] + (으)ㄹ까요?"}'::jsonb
where id='a1000000-0000-4000-8000-000000000005';

insert into public.lessons (id,title,korean_title,category,level,duration_minutes,objectives,expressions,scenario,sort_order,lesson_context) values
('a1000000-0000-4000-8000-000000000001','Meeting Someone','처음 만났어요','Everyday','Beginner',4,'["Greet someone politely","Introduce yourself and ask their name"]'::jsonb,'[{"korean":"안녕하세요.","english":"Hello."},{"korean":"저는 민수예요.","english":"I’m Minsu."},{"korean":"이름이 뭐예요?","english":"What’s your name?"}]'::jsonb,'Panda meets the learner for the first time. Introduce yourself and ask the learner their name. Use beginner-friendly polite Korean.',1,'{"vocabulary":["안녕하세요 — Hello","이름 — Name","저 — I (polite)","학생 — Student","반갑습니다 — Nice to meet you"],"objective":"Introduce yourself and ask Panda’s name.","grammar":"저는 + [Name] + 이에요/예요"}'::jsonb),
('a1000000-0000-4000-8000-000000000002','Ordering Coffee','카페에서 주문해요','Everyday','Beginner',4,'["Choose a drink","Order politely"]'::jsonb,'[{"korean":"아이스 아메리카노 하나 주세요.","english":"An iced Americano, please."},{"korean":"따뜻한 커피 주세요.","english":"A warm coffee, please."},{"korean":"감사합니다.","english":"Thank you."}]'::jsonb,'Panda is a café employee ready to take the learner’s order. Help them order one drink politely using beginner-friendly Korean.',2,'{"vocabulary":["커피 — Coffee","아메리카노 — Americano","아이스 — Iced","따뜻한 — Warm","하나 — One","주세요 — Please give me"],"objective":"Order a drink politely.","grammar":"[Item] + 주세요"}'::jsonb),
('a1000000-0000-4000-8000-000000000003','Talking About Yourself','어디에서 왔어요?','People','Beginner',4,'["Ask where someone is from","Say where you live"]'::jsonb,'[{"korean":"어디에서 왔어요?","english":"Where are you from?"},{"korean":"저는 미국에서 왔어요.","english":"I’m from the United States."},{"korean":"저는 서울에 살아요.","english":"I live in Seoul."}]'::jsonb,'Panda meets the learner at a social gathering and asks where they are from. Ask where the learner lives too.',3,'{"vocabulary":["어디 — Where","나라 — Country","한국 — Korea","미국 — United States","살다 — To live","사람 — Person"],"objective":"Say where you are from and where you live.","grammar":"[Place] + 에 살아요"}'::jsonb),
('a1000000-0000-4000-8000-000000000004','Talking About Food','음식을 좋아해요','Food','Beginner',4,'["Name Korean foods","Say what you like and ask about preferences"]'::jsonb,'[{"korean":"저는 김치를 좋아해요.","english":"I like kimchi."},{"korean":"비빔밥이 맛있어요.","english":"Bibimbap is delicious."},{"korean":"매운 음식을 좋아해요?","english":"Do you like spicy food?"}]'::jsonb,'Panda chats with the learner about favorite Korean foods. Ask what the learner likes and share a favorite.',4,'{"vocabulary":["음식 — Food","좋아하다 — To like","김치 — Kimchi","비빔밥 — Bibimbap","맛있어요 — Delicious","매워요 — Spicy"],"objective":"Say which food you like and ask about a preference.","grammar":"[Noun] + 을/를 좋아해요"}'::jsonb),
('a1000000-0000-4000-8000-000000000005','Making Plans','같이 만날까요?','Everyday','Beginner',4,'["Ask about someone’s availability","Suggest doing something together"]'::jsonb,'[{"korean":"내일 시간 있어요?","english":"Are you free tomorrow?"},{"korean":"주말에 뭐 해요?","english":"What are you doing this weekend?"},{"korean":"같이 커피 마실까요?","english":"Shall we have coffee together?"}]'::jsonb,'Panda is a friend checking the learner’s availability for the weekend. Make a simple plan together.',5,'{"vocabulary":["오늘 — Today","내일 — Tomorrow","주말 — Weekend","시간 — Time","같이 — Together","만나다 — To meet"],"objective":"Ask if Panda is free and suggest meeting.","grammar":"[Verb stem] + (으)ㄹ까요?"}'::jsonb)
on conflict (id) do update set title=excluded.title,korean_title=excluded.korean_title,category=excluded.category,level=excluded.level,duration_minutes=excluded.duration_minutes,objectives=excluded.objectives,expressions=excluded.expressions,scenario=excluded.scenario,sort_order=excluded.sort_order,lesson_context=excluded.lesson_context;
