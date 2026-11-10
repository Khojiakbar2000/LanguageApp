export type LessonStage =
  'introduction' | 'vocabulary' | 'expressions' | 'grammar' | 'practice' | 'ready';
export type VocabularyItem = { korean: string; english: string; romanization: string };
export type LessonExpression = VocabularyItem;
export type Exercise =
  | { id: string; type: 'choice'; prompt: string; options: string[]; answer: string; hint: string }
  | { id: string; type: 'blank'; prompt: string; answer: string; hint: string }
  | { id: string; type: 'arrange'; prompt: string; words: string[]; answer: string; hint: string };
export type PreConversationLesson = {
  id: string;
  title: string;
  koreanTitle: string;
  category: string;
  description: string;
  level: 'Beginner';
  cefr: 'A1';
  topik: '1';
  durationMinutes: number;
  objectives: string[];
  vocabulary: VocabularyItem[];
  expressions: LessonExpression[];
  grammar: {
    pattern: string;
    when: string;
    changes: string;
    examples: { korean: string; english: string }[];
  };
  exercises: [Exercise, Exercise];
  scenario: string;
  conversationInvite: string;
  objective: string;
  role: string;
  completionRequirements: LessonStage[];
};

const id = (n: number) => `a1000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const word = (korean: string, english: string, romanization: string): VocabularyItem => ({
  korean,
  english,
  romanization,
});
const choice = (
  id: string,
  prompt: string,
  options: string[],
  answer: string,
  hint: string,
): Exercise => ({ type: 'choice', id, prompt, options, answer, hint });
const blank = (id: string, prompt: string, answer: string, hint: string): Exercise => ({
  type: 'blank',
  id,
  prompt,
  answer,
  hint,
});
const arrange = (
  id: string,
  prompt: string,
  words: string[],
  answer: string,
  hint: string,
): Exercise => ({ type: 'arrange', id, prompt, words, answer, hint });

export const preConversationLessons: PreConversationLesson[] = [
  {
    id: id(1),
    title: 'Meeting Someone',
    koreanTitle: '처음 만났어요',
    category: 'Everyday',
    description: 'Meet someone new, share your name, and ask theirs.',
    level: 'Beginner',
    cefr: 'A1',
    topik: '1',
    durationMinutes: 4,
    objectives: ['Greet someone politely', 'Introduce yourself and ask their name'],
    vocabulary: [
      word('안녕하세요', 'Hello', 'annyeonghaseyo'),
      word('이름', 'Name', 'ireum'),
      word('저', 'I (polite)', 'jeo'),
      word('학생', 'Student', 'haksaeng'),
      word('반갑습니다', 'Nice to meet you', 'bangapseumnida'),
    ],
    expressions: [
      word('안녕하세요.', 'Hello.', 'annyeonghaseyo'),
      word('저는 민수예요.', 'I’m Minsu.', 'jeoneun minsuyeyo'),
      word('이름이 뭐예요?', 'What’s your name?', 'ireumi mwoyeyo'),
    ],
    grammar: {
      pattern: '저는 + [Name] + 이에요/예요',
      when: 'Use this polite pattern to say who you are.',
      changes: 'Use 이에요 after a consonant; use 예요 after a vowel.',
      examples: [
        { korean: '저는 학생이에요.', english: 'I’m a student.' },
        { korean: '저는 민수예요.', english: 'I’m Minsu.' },
      ],
    },
    exercises: [
      choice(
        'meet-greet',
        'Which phrase is a polite greeting?',
        ['안녕하세요', '이름', '학생'],
        '안녕하세요',
        '안녕하세요 is the polite everyday greeting.',
      ),
      blank(
        'meet-name',
        '저는 민수___요. (I’m Minsu.)',
        '예',
        '민수 ends in a vowel, so use 예요.',
      ),
    ],
    scenario: 'Panda meets the learner for the first time and asks their name.',
    conversationInvite: 'You’re ready! Let’s meet someone new.',
    objective: 'Introduce yourself and ask Panda’s name.',
    role: 'Panda is meeting you for the first time.',
    completionRequirements: ['introduction', 'vocabulary', 'expressions', 'grammar', 'practice'],
  },
  {
    id: id(2),
    title: 'Ordering Coffee',
    koreanTitle: '카페에서 주문해요',
    category: 'Everyday',
    description: 'Order a hot or iced drink with confidence.',
    level: 'Beginner',
    cefr: 'A1',
    topik: '1',
    durationMinutes: 4,
    objectives: ['Choose a drink', 'Order politely'],
    vocabulary: [
      word('커피', 'Coffee', 'keopi'),
      word('아메리카노', 'Americano', 'amerikano'),
      word('아이스', 'Iced', 'aiseu'),
      word('따뜻한', 'Warm', 'ttatteuthan'),
      word('하나', 'One', 'hana'),
      word('주세요', 'Please give me', 'juseyo'),
    ],
    expressions: [
      word(
        '아이스 아메리카노 하나 주세요.',
        'An iced Americano, please.',
        'aiseu amerikano hana juseyo',
      ),
      word('따뜻한 커피 주세요.', 'A warm coffee, please.', 'ttatteuthan keopi juseyo'),
      word('감사합니다.', 'Thank you.', 'gamsahamnida'),
    ],
    grammar: {
      pattern: '[Item] + 주세요',
      when: 'Use this polite request when ordering or asking for something.',
      changes:
        'Put the item first, then 주세요. Add a number and counter after the item when needed.',
      examples: [
        { korean: '커피 주세요.', english: 'Coffee, please.' },
        { korean: '아메리카노 하나 주세요.', english: 'One Americano, please.' },
      ],
    },
    exercises: [
      choice(
        'coffee-one',
        'How do you politely ask for one Americano?',
        ['아메리카노 하나 주세요.', '하나 아메리카노예요.', '주세요 아메리카노.'],
        '아메리카노 하나 주세요.',
        'Say the item, the amount, then 주세요.',
      ),
      arrange(
        'coffee-arrange',
        'Arrange the order: “A warm coffee, please.”',
        ['주세요.', '커피', '따뜻한'],
        '따뜻한 커피 주세요.',
        'Describe the drink before 커피, then add 주세요.',
      ),
    ],
    scenario: 'Panda is a café employee ready to take your order.',
    conversationInvite: 'You’re ready! Let’s order coffee together.',
    objective: 'Order a drink politely.',
    role: 'Panda is the café employee.',
    completionRequirements: ['introduction', 'vocabulary', 'expressions', 'grammar', 'practice'],
  },
  {
    id: id(3),
    title: 'Talking About Yourself',
    koreanTitle: '어디에서 왔어요?',
    category: 'People',
    description: 'Share where you come from and where you live.',
    level: 'Beginner',
    cefr: 'A1',
    topik: '1',
    durationMinutes: 4,
    objectives: ['Ask where someone is from', 'Say where you live'],
    vocabulary: [
      word('어디', 'Where', 'eodi'),
      word('나라', 'Country', 'nara'),
      word('한국', 'Korea', 'hanguk'),
      word('미국', 'United States', 'miguk'),
      word('살다', 'To live', 'salda'),
      word('사람', 'Person', 'saram'),
    ],
    expressions: [
      word('어디에서 왔어요?', 'Where are you from?', 'eodieseo wasseoyo'),
      word('저는 미국에서 왔어요.', 'I’m from the United States.', 'jeoneun migugeseo wasseoyo'),
      word('저는 서울에 살아요.', 'I live in Seoul.', 'jeoneun seoure sarayo'),
    ],
    grammar: {
      pattern: '[Place] + 에 살아요',
      when: 'Use 에 살아요 to tell someone where you live.',
      changes: 'Add 에 to the place, then use 살아요, the polite form of 살다.',
      examples: [
        { korean: '서울에 살아요.', english: 'I live in Seoul.' },
        { korean: '한국에 살아요.', english: 'I live in Korea.' },
      ],
    },
    exercises: [
      choice(
        'place-live',
        'Which ending means “live in”?',
        ['에 살아요', '에서 왔어요', '이름이에요'],
        '에 살아요',
        'Use 에 살아요 for the place where you live.',
      ),
      blank('place-blank', '저는 서울___ 살아요.', '에', 'Attach 에 to 서울 before 살아요.'),
    ],
    scenario: 'Panda meets you at a social gathering and asks where you are from.',
    conversationInvite: 'You’re ready! Let’s talk about where you’re from.',
    objective: 'Say where you are from and where you live.',
    role: 'Panda is a new acquaintance at a gathering.',
    completionRequirements: ['introduction', 'vocabulary', 'expressions', 'grammar', 'practice'],
  },
  {
    id: id(4),
    title: 'Talking About Food',
    koreanTitle: '음식을 좋아해요',
    category: 'Food',
    description: 'Share a favorite dish and ask what someone likes.',
    level: 'Beginner',
    cefr: 'A1',
    topik: '1',
    durationMinutes: 4,
    objectives: ['Name Korean foods', 'Say what you like and ask about preferences'],
    vocabulary: [
      word('음식', 'Food', 'eumsik'),
      word('좋아하다', 'To like', 'joahada'),
      word('김치', 'Kimchi', 'gimchi'),
      word('비빔밥', 'Bibimbap', 'bibimbap'),
      word('맛있어요', 'Delicious', 'masisseoyo'),
      word('매워요', 'Spicy', 'maewoyo'),
    ],
    expressions: [
      word('저는 김치를 좋아해요.', 'I like kimchi.', 'jeoneun gimchireul joahaeyo'),
      word('비빔밥이 맛있어요.', 'Bibimbap is delicious.', 'bibimbabi masisseoyo'),
      word('매운 음식을 좋아해요?', 'Do you like spicy food?', 'maeun eumsigeul joahaeyo'),
    ],
    grammar: {
      pattern: '[Noun] + 을/를 좋아해요',
      when: 'Use this pattern to say that you like something.',
      changes:
        'Use 을 after a consonant (김치를 uses 를 because 김치 ends in a vowel); use 를 after a vowel.',
      examples: [
        { korean: '김치를 좋아해요.', english: 'I like kimchi.' },
        { korean: '빵을 좋아해요.', english: 'I like bread.' },
      ],
    },
    exercises: [
      choice(
        'food-like',
        'Choose “I like kimchi.”',
        ['김치를 좋아해요.', '김치가 어디예요?', '김치에 살아요.'],
        '김치를 좋아해요.',
        '좋아해요 means “like”; 김치를 is the thing you like.',
      ),
      blank('food-blank', '빵___ 좋아해요.', '을', '빵 ends in a consonant, so use 을.'),
    ],
    scenario: 'Panda chats with you about favorite Korean foods.',
    conversationInvite: 'You’re ready! Let’s talk about food.',
    objective: 'Say which food you like and ask Panda about a preference.',
    role: 'Panda is chatting about favorite foods.',
    completionRequirements: ['introduction', 'vocabulary', 'expressions', 'grammar', 'practice'],
  },
  {
    id: id(5),
    title: 'Making Plans',
    koreanTitle: '같이 만날까요?',
    category: 'Everyday',
    description: 'Check if someone is free and suggest meeting up.',
    level: 'Beginner',
    cefr: 'A1',
    topik: '1',
    durationMinutes: 4,
    objectives: ['Ask about someone’s availability', 'Suggest doing something together'],
    vocabulary: [
      word('오늘', 'Today', 'oneul'),
      word('내일', 'Tomorrow', 'naeil'),
      word('주말', 'Weekend', 'jumal'),
      word('시간', 'Time', 'sigan'),
      word('같이', 'Together', 'gachi'),
      word('만나다', 'To meet', 'mannada'),
    ],
    expressions: [
      word('내일 시간 있어요?', 'Are you free tomorrow?', 'naeil sigan isseoyo'),
      word('주말에 뭐 해요?', 'What are you doing this weekend?', 'jumare mwo haeyo'),
      word('같이 커피 마실까요?', 'Shall we have coffee together?', 'gachi keopi masilkkayo'),
    ],
    grammar: {
      pattern: '[Verb stem] + (으)ㄹ까요?',
      when: 'Use this polite ending to suggest doing something together.',
      changes:
        'Use 을까요 after a consonant stem; use ㄹ까요 after a vowel stem. 마시다 becomes 마실까요?',
      examples: [
        { korean: '같이 만날까요?', english: 'Shall we meet together?' },
        { korean: '커피 마실까요?', english: 'Shall we have coffee?' },
      ],
    },
    exercises: [
      choice(
        'plans-suggest',
        'Which phrase suggests having coffee together?',
        ['같이 커피 마실까요?', '내일 시간이에요.', '주말에 만나다.'],
        '같이 커피 마실까요?',
        '마실까요? makes a gentle suggestion: “Shall we drink?”',
      ),
      arrange(
        'plans-arrange',
        'Arrange: “Are you free tomorrow?”',
        ['있어요?', '시간', '내일'],
        '내일 시간 있어요?',
        'Start with when, then ask about time.',
      ),
    ],
    scenario: 'Panda is a friend checking your availability for the weekend.',
    conversationInvite: 'You’re ready! Let’s make plans together.',
    objective: 'Ask if Panda is free and suggest meeting.',
    role: 'Panda is a friend making weekend plans.',
    completionRequirements: ['introduction', 'vocabulary', 'expressions', 'grammar', 'practice'],
  },
];
