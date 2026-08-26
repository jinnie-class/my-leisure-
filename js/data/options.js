/* ===========================================================
   나의 여가 — 선택지 데이터
   (함께하는 사람 · 기분 · 다시 하기 · 준비물 · 캐릭터 · 코너)
   교사 설정에서 켜고 끌 수 있는 항목들의 원본 목록입니다.
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});
  var D = (App.DATA = App.DATA || {});

  /* ------------------------- 함께하는 사람 ------------------------- */
  /* phrase   : 문장에 그대로 들어가는 형태 ("친구와", "혼자")
     imageKey : images/avatars/<imageKey>.png
     variants : 남녀 그림이 둘 다 있는 경우. 학생마다 어느 쪽을 쓸지 고를 수 있습니다.
                (문장은 어느 쪽이든 똑같이 "친구와" 로 만들어집니다) */
  D.partners = [
    { id: 'alone',   name: '혼자',   phrase: '혼자',     icon: 'pAlone',
      variants: [{ id: 'm', name: '남', imageKey: '혼자 남학생' },
                 { id: 'f', name: '여', imageKey: '혼자 여학생' }] },
    { id: 'family',  name: '가족',   phrase: '가족과',   icon: 'pFamily',
      variants: [{ id: 'm', name: '남', imageKey: '가족 남자아이' },
                 { id: 'f', name: '여', imageKey: '가족 여자아이' }] },
    { id: 'mom',     name: '엄마',   phrase: '엄마와',   icon: 'pMom',     imageKey: '엄마' },
    { id: 'dad',     name: '아빠',   phrase: '아빠와',   icon: 'pDad',     imageKey: '아빠' },
    { id: 'grandma', name: '할머니',   phrase: '할머니와',   icon: 'pMom',     imageKey: '할머니' },
    { id: 'grandpa', name: '할아버지', phrase: '할아버지와', icon: 'pDad',     imageKey: '할아버지' },
    { id: 'uncle',   name: '삼촌',     phrase: '삼촌과',     icon: 'pDad',     imageKey: '삼촌' },
    { id: 'gomo',    name: '고모',     phrase: '고모와',     icon: 'pMom',     imageKey: '고모' },
    { id: 'imo',     name: '이모',     phrase: '이모와',     icon: 'pMom',     imageKey: '이모' },
    /* ★ 손위 형제는 **부르는 이름이 넷**입니다 (2026-08-24 · 선생님 말씀).
         남학생은 누나 · 형, 여학생은 언니 · 오빠라 부릅니다. 하나로 묶으면
         어느 쪽 학생에게든 어색해서, 넷을 따로 두고 선생님이 그 학생에게
         맞는 것만 켜 주도록 했습니다 (설정 7. 함께하는 사람 선택지).
       ⛔ 「누나(언니)」 처럼 묶어 적지 마세요. 그대로 문장에 들어가면
          「나는 누나(언니)와 함께…」 가 됩니다. */
    { id: 'sisEl',   name: '언니',     phrase: '언니와',     icon: 'pSibling', imageKey: '언니' },
    { id: 'nuna',    name: '누나',     phrase: '누나와',     icon: 'pSibling', imageKey: '누나' },
    { id: 'hyeong',  name: '형',       phrase: '형과',       icon: 'pSibling', imageKey: '형' },
    { id: 'oppa',    name: '오빠',     phrase: '오빠와',     icon: 'pSibling', imageKey: '오빠' },
    /* ⚠ imageKey 는 **그림 파일 이름 그대로**여야 합니다.
         `images/avatars/<imageKey>.png` 를 찾습니다. 파일은 「남동생 · 여동생」
         이라 그렇게 적습니다 (「동생 남」 으로 적으면 그림이 안 나옵니다). */
    { id: 'younger', name: '동생',     phrase: '동생과',     icon: 'pSibling',
      variants: [{ id: 'm', name: '남', imageKey: '남동생' },
                 { id: 'f', name: '여', imageKey: '여동생' }] },
    /* ⛔ 「형제자매」는 **지우지 않고 감춥니다.** 예전 일기·계획이 이 이름을
         가리키고 있어서, 목록에서 없애면 그 기록의 사람이 통째로 사라집니다.
         감춰 두면 새로 고를 수는 없고 예전 기록은 그대로 읽힙니다. */
    { id: 'sibling', name: '형제자매', phrase: '형제자매와', icon: 'pSibling', hidden: true,
      variants: [{ id: 'm', name: '남', imageKey: '형제자매 남' },
                 { id: 'f', name: '여', imageKey: '형제자매 여' }] },
    { id: 'friend',  name: '친구',   phrase: '친구와',   icon: 'pFriend',
      variants: [{ id: 'm', name: '남', imageKey: '친구-남' },
                 { id: 'f', name: '여', imageKey: '친구-여' }] },
    { id: 'teacher', name: '선생님', phrase: '선생님과', icon: 'pTeacher',
      variants: [{ id: 'm', name: '남', imageKey: '선생님 남' },
                 { id: 'f', name: '여', imageKey: '선생님 여' }] }
  ];

  /* ------------------------- 기분 ------------------------- */
  /* past : "활동을 하니 ___" · "기분이 ___" 에 그대로 들어가는 끝맺은 꼴
     conn : 기분을 두 개 이상 골랐을 때 이어 주는 표현 ("신나고 뿌듯했어요")
     pre  : 이름 앞에 붙는 꼴 — 일기 제목에 씁니다 ("재미있는 곤충 키우기")
     stem : 예전 기록에만 남아 있는 줄기. App.moodWord() 가 past 로 바꿔 읽습니다 */
  D.moods = [
    { id: 'excited', name: '신나요',     past: '신났어요',     conn: '신나고',   stem: '신나',     pre: '신나는',   icon: 'moodExcited', imageKey: '신났어요' },
    { id: 'fun',     name: '재미있어요', past: '재미있었어요', conn: '재미있고', stem: '재미있',   pre: '재미있는', icon: 'moodFun',     imageKey: '재미있었어요' },
    { id: 'calm',    name: '편안해요',   past: '편안했어요',   conn: '편안하고', stem: '편안',     pre: '편안한',   icon: 'moodCalm',    imageKey: '편안했어요' },
    { id: 'proud',   name: '뿌듯해요',   past: '뿌듯했어요',   conn: '뿌듯하고', stem: '뿌듯',     pre: '뿌듯한',   icon: 'moodProud',   imageKey: '뿌듯했어요' },
    { id: 'sorry',   name: '아쉬워요',   past: '아쉬웠어요',   conn: '아쉽고',   stem: '아쉬웠',   pre: '아쉬운',   icon: 'moodSorry',   imageKey: '아쉬웠어요' },
    { id: 'tired',   name: '힘들어요',   past: '힘들었어요',   conn: '힘들고',   stem: '힘들었',   pre: '힘든',     icon: 'moodTired',   imageKey: '힘들었어요' },
    { id: 'sad',     name: '속상해요',   past: '속상했어요',   conn: '속상하고', stem: '속상',     pre: '속상한',   icon: 'moodSad',     imageKey: '속상했어요' },
    { id: 'angry',   name: '화나요',     past: '화났어요',     conn: '화나고',   stem: '화났',     pre: '화난',     icon: 'moodAngry',   imageKey: '화났어요' }
  ];

  /* ------------------------- 또 하고 싶나요? ------------------------- */
  D.agains = [
    { id: 'again',  name: '또 하고 싶어요',                 sentence: '다음에 또 하고 싶어요',                 icon: 'heart' },
    /* ★ 단추 글씨와 일기 문장을 **같은 말**로 맞추고, 더 짧게 다듬었습니다.
         `다음에는 다른 활동을 하고 싶어요` → `다른 것도 하고 싶어요`.
         단추에 두 줄로 접히지 않고, 학생이 한눈에 읽습니다.
       ※ `예 / 아니요` 로 줄이지 않은 까닭 —
         '다른 것도 하고 싶다' 는 **싫다는 뜻이 아니라** '다양하게 해보고 싶다' 는
         긍정적인 답입니다. 여가 교육에서 중요한 답이라 따로 남겨 둡니다.
         그림 파일 이름도 이 말을 그대로 따릅니다. */
    { id: 'other',  name: '다른 것도 하고 싶어요',          sentence: '다른 것도 하고 싶어요',                 icon: 'star' },
    { id: 'unsure', name: '잘 모르겠어요',                   sentence: '다음에 또 할지는 잘 모르겠어요',         icon: 'question' }
  ];

  /* ------------------------- 기본 준비물 그림카드 ------------------------- */
  /* ------------------------- 장소 -------------------------
     `어느 곳에서 할까요?` 에서 나옵니다.
     ★ 예전에는 코드 안에 `교실 · 집 · 학교 · 공원 · 운동장` **다섯 곳만**
       적혀 있었습니다. 그런데 `images/장소/` 에는 그림이 19장 있어서,
       그려 둔 그림 14장이 화면에 나오지도 못하고 있었습니다.
     ▸ 그림 파일 이름과 **똑같은 이름**을 씁니다 (`images/장소/교실.png`).
     ▸ 순서는 학생이 자주 가는 곳부터 : 학교 안 → 동네 → 나들이.
     ▸ 여기에 이름을 더하려면 **같은 이름의 그림도 함께** 넣어야
       그림이 붙습니다 (없으면 코드로 그린 지도 그림이 나옵니다). */
  D.places = [
    '교실', '학교', '강당', '조리실', '운동장', '텃밭', '학교 화단',
    '집', '동네', '놀이터', '공원',
    '도서관', '문구점', '미술관', '박물관',
    '음식점', '카페', '노래방', '영화관', '캠핑장'
  ];

  D.supplies = [
    { id: 's-bag',    name: '가방',   icon: 'bag' },
    { id: 's-bottle', name: '물통',   icon: 'bottle' },
    { id: 's-towel',  name: '수건',   icon: 'towel' },
    { id: 's-apron',  name: '앞치마', icon: 'apron' },
    { id: 's-hat',    name: '모자',   icon: 'hat' },
    { id: 's-money',  name: '용돈',   icon: 'money' },
    { id: 's-camera', name: '사진기', icon: 'camera' },
    { id: 's-book',   name: '책',     icon: 'book' }
  ];

  /* ------------------------- 이름 옆 표시 -------------------------
     글자를 못 읽는 학생이 자기 칸을 찾을 수 있게 이름 앞에 붙이는 그림입니다. */
  D.marks = ['🌸', '⚽', '🐣', '🚀', '🍓', '🎵', '🐳', '🌈',
             '🍀', '⭐', '🦕', '🎈', '🍎', '🐰', '🎨', '🚗'];

  /* ------------------------- 학생 캐릭터 ------------------------- */
  /* imageKey : images/avatars/<imageKey>.png
     icon     : 그림 파일이 없을 때 대신 나오는 기본 SVG 그림

     ★ 여덟 개만 둡니다 (2026-08-26 · 선생님 말씀 「너무 많은 선택권을 준 것
       같아 … 군더더기는 덜어내려고」).
       예전에는 38개를 갈래 넷(친구·동물·곤충·바다)으로 나눠 **네 쪽에 걸쳐**
       보여 주었습니다. 고르기 전에 넘기는 일부터 배워야 했습니다.
     ▸ 남자아이 · 여자아이 · 동물 여섯 = 여덟. 여기에 「사진 찍기」 한 칸을
       더해 **3칸 × 3줄 = 아홉**, 한 화면에 다 들어옵니다 (profiles.js).
     ⛔ 여기에 캐릭터를 더하면 아홉 칸이 깨져 쪽 넘김이 되살아납니다.
        더하려면 profiles.js 의 칸 배열도 함께 보세요.
     ▸ 동물 여섯은 집에서 보는 둘(강아지·고양이) · 작고 귀여운 둘(토끼·곰) ·
       큰 동물 둘(사자·코끼리)로 갈래가 고르게 섞이도록 골랐습니다.
       생김새가 비슷한 곰·판다·여우가 함께 있으면 글자를 못 읽는 학생이
       헷갈립니다. */
  function AV(id, name, icon) {
    return { id: id, name: name, icon: icon || 'avBear', imageKey: name };
  }
  D.avatars = [
    AV('boy',      '남자아이', 'avStar'),
    AV('girl',     '여자아이', 'avStar'),

    AV('dog',      '강아지',   'avFox'),
    AV('cat',      '고양이',   'avCat'),
    AV('rabbit',   '토끼',     'avRabbit'),
    AV('bear',     '곰',       'avBear'),
    AV('lion',     '사자',     'avFox'),
    AV('elephant', '코끼리',   'avBear')
  ];

  /* ------------------------- 일기 수준 ------------------------- */
  /* note = 질문 줄 오른쪽에 늘 보이는 **한 줄 설명**.
     ★ 예전에는 desc 가 `title=` 툴팁에만 있어서, 마우스를 올려야 보였습니다.
       태블릿·전자칠판에서는 올릴 마우스가 없어 **아무도 못 보는 설명**이었습니다.
     ▸ `무엇을 하는지` 로 적습니다 — 누구에게 맞는지가 아니라, 지금 이 단계에서
       학생이 **하게 되는 일**을 적어야 골라 놓고도 무엇을 하는 중인지 압니다. */
  D.diaryLevels = [
    { id: 1, name: '1단계', desc: '그림으로 골라 쓰기', guide: '질문 하나씩 그림으로 골라요.',
      note: '그림을 골라 문장을 만들어요' },
    { id: 2, name: '2단계', desc: '문장 틀 완성하기', guide: '빈칸을 채워 문장을 완성해요.',
      note: '빈칸을 채워 문장을 완성해요' },
    { id: 3, name: '3단계', desc: '자유롭게 쓰기', guide: '내 마음대로 일기를 써요.',
      note: '틀 없이 내 말로 써요' }
  ];

  /* ------------------------- 계획 수준 ------------------------- */
  /* 두 수준은 **묻는 내용이 다른 것이 아니라, 얼마나 자세히 적는가**가 다릅니다.
     장소는 일기에서도 묻는 것이라 쉬운 계획에서도 빠뜨리지 않습니다 — 빠뜨리면
     계획에는 없는데 일기에는 있어서 같은 활동을 두 번 다르게 적게 됩니다. */
  D.planLevels = [
    { id: 'easy',   name: '쉬운 계획',   desc: '활동 · 함께하는 사람 · 날짜 · 장소' },
    { id: 'detail', name: '자세한 계획', desc: '시간 · 준비물 · 메모까지' }
  ];

  /* ------------------------- 여가지도 상태 ------------------------- */
  D.mapStates = [
    { id: 'tried',     name: '해봤어요',       icon: 'foot',     help: '한 번이라도 해본 활동이에요.' },
    { id: 'like',      name: '좋아해요',       icon: 'heart',    help: '내가 좋아하는 활동이에요.' },
    { id: 'challenge', name: '도전하고 싶어요', icon: 'star',    help: '다음에 해보고 싶은 활동이에요.' },
    { id: 'unsure',    name: '잘 모르겠어요', icon: 'question', help: '더 해보고 정하고 싶어요.' }
  ];
  /* ★ '아직 안 해봤어요' 와 '아직 잘 모르겠어요' 는 학생에게 같은 뜻입니다.
     말과 그림을 **하나로** 묶었습니다 — 물음표 + 잘 모르겠어요.
     둘을 갈라 두면 물음표와 줄표 두 가지를 따로 익혀야 합니다. */
  D.notTried = { id: 'none', name: '잘 모르겠어요', icon: 'question' };

  /* ------------------------- 첫 화면 코너 ------------------------- */
  D.corners = [
    { id: 'plan',      route: 'plan',      name: '계획하GO!', desc: '여가 계획하기',
      guide: '오늘 하고 싶은 여가를 골라요.', icon: 'cornerPlan',  color: '#5ec8f2' },
    { id: 'map',       route: 'map',       name: '알아보GO!', desc: '여가 지도',
      guide: '내가 좋아하는 여가를 알아봐요.', icon: 'cornerMap',   color: '#4ecdc4' },
    { id: 'diary',     route: 'diary',     name: '기록하GO!', desc: '여가 일기',
      guide: '오늘 한 활동과 기분을 기록해요.', icon: 'cornerDiary', color: '#b39ddb' },
    { id: 'portfolio', route: 'portfolio', name: '모아보GO!', desc: '여가 포트폴리오',
      guide: '나의 여가 기록을 모아 전시해요.', icon: 'cornerFolio', color: '#f5a86a' }
  ];

  /* ------------------------- 2단계 일기 문장 틀 ------------------------- */
  D.frames = [
    { id: 'f1', before: '나는 ', mid: '와 함께 ', after: '을 했어요.', slots: ['partner', 'activity'] },
    { id: 'f2', before: '활동을 하니 ', mid: '', after: '했어요.', slots: ['mood'] },
    { id: 'f3', before: '가장 기억에 남는 것은 ', mid: '', after: '이에요.', slots: ['free'] },
    { id: 'f4', before: '다음에는 ', mid: '', after: '하고 싶어요.', slots: ['free'] }
  ];

  /* ------------------------- 3단계 문장 도움말 ------------------------- */
  D.writingHelp = [
    '오늘 나는 ○○과 함께 ○○을 했어요.',
    '○○에서 활동을 했어요.',
    '가장 재미있었던 것은 ○○이에요.',
    '조금 어려웠던 것은 ○○이에요.',
    '활동을 하고 나서 기분이 ○○했어요.',
    '다음에는 ○○을 해보고 싶어요.'
  ];

  /* ------------------------- 포트폴리오 기간 ------------------------- */
  D.ranges = [
    { id: 'm1',   name: '최근 한 달',  months: 1 },
    { id: 'm2',   name: '최근 두 달',  months: 2 },
    { id: 'term', name: '한 학기',     months: null },   // 시작일·종료일 직접 지정
    { id: 'y1',   name: '일 년',       months: 12 },
    { id: 'custom', name: '날짜 직접 선택', months: null }
  ];

  /* ------------------------- 마지막 돌아보기 문장 틀 -------------------------
     ★ 조사는 `after` 에 글자로 적지 않고 **`josa` 로 따로** 둡니다 (2026-08-22).
       예전에는 `을 좋아해요.` 처럼 못박아 두어서, 받침 없는 말이 들어가면
       **`나는 만들기을 좋아해요.`** 처럼 틀린 문장이 되었습니다.
       이제 App.josa 가 넣는 말에 맞춰 을/를 · 이에요/예요 를 고릅니다.
     ▸ `josa` 가 없는 틀은 조사를 붙이지 않습니다.
     ▸ `에` 처럼 받침과 상관없는 조사는 그대로 한 글자만 적습니다. */
  /* ⛔ `minLv` — **그 단계부터** 나오는 줄입니다 (2026-08-24 · 선생님 말씀).
       1단계 학생에게는 「좋아해요 · 도전했어요」 두 줄이면 넉넉합니다.
       「가장 기억에 남는 · 다음에는」까지 네 줄이면, 그림만 고르는 학생에게는
       비슷한 물음이 자꾸 이어져 무엇을 묻는지 흐려집니다.
     ▸ 일기 쪽도 같습니다 — 1단계는 뼈대 다섯만 묻습니다 (diary.js 의 L1). */
  D.reviewFrames = [
    { id: 'r1', before: '나는 ',                  josa: '을/를',       after: ' 좋아해요.' },
    { id: 'r2', before: '나는 새롭게 ',           josa: '에',          after: ' 도전했어요.' },
    { id: 'r3', before: '가장 기억에 남는 활동은 ', josa: '이에요/예요', after: '.', minLv: 2 },
    { id: 'r4', before: '다음에는 ',              josa: '을/를',       after: ' 해보고 싶어요.', minLv: 2 }
  ];
  /* 그 단계에서 쓰는 돌아보기 줄만 골라 냅니다.
     ⛔ `rv`(이미 쓴 것)를 함께 넘기세요. 예전에 1단계로 써 둔 줄이 있으면
        **그것은 그대로 보여 줍니다** — 목록에서 빼면 학생이 쓴 글이
        화면과 인쇄에서 통째로 사라집니다. */
  App.reviewFramesFor = function (lv, rv) {
    var n = lv || 1;
    return D.reviewFrames.filter(function (f) {
      if (!f.minLv || n >= f.minLv) return true;
      return !!(rv && String(rv[f.id] || '').trim());
    });
  };
  /* 돌아보기 한 줄을 **글자로** 만들어 줍니다 (빈칸이면 밑줄 자리만).
     화면 · 전시판형 · 책자형이 모두 이 하나를 씁니다 — 따로 만들면 어긋납니다. */
  App.reviewLine = function (f, v) {
    var w = String(v == null ? '' : v).trim();
    if (!w) return null;
    var mid = f.josa ? (f.josa.indexOf('/') >= 0 ? App.josa(w, f.josa) : (w + f.josa)) : w;
    return f.before + mid + f.after;
  };

  /* ------------------------- 조회 도우미 ------------------------- */
  /* ------------------------- 날씨 -------------------------
     ★ 그림일기의 기본 항목이라 **학생이 앱에서 눌러 고릅니다.**
       예전에는 인쇄한 종이에 손으로 동그라미 치는 방식이라 기록으로 남지 않았습니다.
     글자를 못 읽는 학생도 알아볼 수 있게 모양을 뚜렷하게 그렸습니다
     (비는 우산, 눈은 눈사람 — 구름만 그리면 서로 헷갈립니다). */
  var CLOUD_LO = 'M15 34a8 8 0 01.8-15.9 11 11 0 0120.6-2.4A8 8 0 0134 34z';
  D.weathers = [
    { id: 'sun', name: '맑음', svg:
      '<g stroke="#333" stroke-width="3" stroke-linecap="round">' +
      '<path d="M24 3v6M24 39v6M3 24h6M39 24h6M9.2 9.2l4.3 4.3M34.5 34.5l4.3 4.3' +
      'M38.8 9.2l-4.3 4.3M13.5 34.5l-4.3 4.3"/></g>' +
      '<circle cx="24" cy="24" r="10" fill="#FFD75E" stroke="#333" stroke-width="3"/>' },

    { id: 'cloud', name: '흐림', svg:
      '<path d="' + CLOUD_LO + '" fill="#E3ECF5" stroke="#333" stroke-width="3" stroke-linejoin="round"/>' },

    /* 비 : 우산 — 구름보다 한눈에 알아보기 쉽습니다 */
    { id: 'rain', name: '비', svg:
      '<path d="M22 9a17 17 0 0117 17H5A17 17 0 0122 9z" fill="#5AA9E6" ' +
      'stroke="#333" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M22 5v4" stroke="#333" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M22 26v13a4.5 4.5 0 01-9 0" stroke="#333" stroke-width="3" ' +
      'fill="none" stroke-linecap="round"/>' +
      '<g fill="#7FC4EE" stroke="#333" stroke-width="2" stroke-linejoin="round">' +
      '<path d="M40 28c1.6 2.4 2.5 3.8 2.5 4.7a2.5 2.5 0 01-5 0c0-.9.9-2.3 2.5-4.7z"/>' +
      '<path d="M33 36c1.6 2.4 2.5 3.8 2.5 4.7a2.5 2.5 0 01-5 0c0-.9.9-2.3 2.5-4.7z"/></g>' },

    /* 눈 : 눈사람 */
    { id: 'snow', name: '눈', svg:
      '<path d="M12 31l-6-4M36 31l6-4" stroke="#333" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="24" cy="34" r="11" fill="#fff" stroke="#333" stroke-width="3"/>' +
      '<circle cx="24" cy="16" r="8.5" fill="#fff" stroke="#333" stroke-width="3"/>' +
      '<circle cx="24" cy="31" r="1.6" fill="#333"/><circle cx="24" cy="38" r="1.6" fill="#333"/>' +
      '<circle cx="20.8" cy="14.5" r="1.5" fill="#333"/>' +
      '<circle cx="27.2" cy="14.5" r="1.5" fill="#333"/>' +
      '<path d="M24 17.6l4.6 1.9-4.6 1.6z" fill="#F59B4B" stroke="#333" stroke-width="1.4" ' +
      'stroke-linejoin="round"/>' }
  ];
  /* 날씨 그림 한 장을 SVG 문자열로 돌려줍니다 (화면·인쇄가 같은 그림을 씁니다) */
  App.weatherSvg = function (w) {
    if (!w) return '';
    return '<svg viewBox="0 0 48 48" fill="none">' + w.svg + '</svg>';
  };

  function finder(list) {
    return function (id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    };
  }
  App.partner = finder(D.partners);
  App.mood = finder(D.moods);
  App.again = finder(D.agains);
  App.avatar = finder(D.avatars);
  App.corner = finder(D.corners);
  App.state = finder(D.mapStates);     // 해봤어요 · 좋아해요 · 도전하고 싶어요 · 아직 잘 모르겠어요
  App.weather = finder(D.weathers);    // 맑음 · 흐림 · 비 · 눈

  /* 학생 설정에 맞춰 걸러낸 선택지 */
  /* ⛔ `hidden` 인 사람은 **고를 수 없습니다** (예 : 형제자매 — 언니 · 누나 ·
       형 · 오빠 · 동생으로 나뉘었습니다). 목록에는 남아 있어서 예전 일기와
       계획은 그대로 읽히지만, 새로 고르는 자리에는 나오지 않습니다.
     ▸ 선생님이 예전에 켜 두었던 목록(partnerIds)에 들어 있어도 감춥니다. */
  App.partnersFor = function (s) {
    var on = s && s.partnerIds;
    return D.partners.filter(function (p) {
      return !p.hidden && (!on || on.indexOf(p.id) >= 0);
    });
  };
  App.moodsFor = function (s) {
    var on = s && s.moodIds;
    return D.moods.filter(function (m) { return !on || on.indexOf(m.id) >= 0; });
  };

  /* ═══════ 선생님이 더한 사람 · 기분 ═══════
     `우리 반 활동 더하기` 와 **같은 방식**입니다 (activities.js 의 setCustomActivities).
     ▸ 기본 목록은 그대로 두고, 더한 것을 **뒤에 붙입니다.**
       기본을 건드리면 예전 기록이 가리키던 것이 사라집니다.
     ▸ 문장에 쓸 말은 선생님이 안 쓰면 **이름에서 자동으로** 만듭니다.
       조사는 손으로 붙이지 않고 App.waGwa 를 씁니다 (가족과 · 엄마와). */
  var BASE_PARTNERS = D.partners.slice();
  var BASE_MOODS = D.moods.slice();

  /* ⛔ 목록을 **새 배열로 갈아 끼우면 안 됩니다.**
       App.partner · App.mood 는 `finder(D.partners)` 로 만들어져
       **그때의 배열을 붙잡고** 있습니다. 새 배열을 대입하면 고르는 칸에는
       나오는데 `App.mood(id)` 는 못 찾아서, 문장이 통째로 빈 채로 나옵니다.
     ▸ 그래서 **제자리에서** 비우고 다시 채웁니다 (배열 자체는 그대로). */
  function refill(arr, items) {
    arr.length = 0;
    items.forEach(function (x) { arr.push(x); });
    return arr;
  }

  App.setCustomPartners = function (list) {
    refill(D.partners, BASE_PARTNERS.concat((list || []).map(function (o) {
      var name = String(o.name || '').trim();
      return {
        id: o.id, name: name,
        /* `가족과` 처럼 조사까지 붙인 꼴. 혼자 같은 예외는 기본 목록에만 있습니다 */
        phrase: o.phrase || (App.waGwa ? App.waGwa(name) : name + '와'),
        icon: o.icon || 'pFriend',
        imageKey: o.imageKey || name,      // images/avatars/<이름>.png 가 있으면 씁니다
        custom: true
      };
    })));
  };

  App.setCustomMoods = function (list) {
    refill(D.moods, BASE_MOODS.concat((list || []).map(function (o) {
      var name = String(o.name || '').trim();
      /* `설레요` → 어간 `설레` : 끝의 `요` · `어요` · `해요` 를 떼어 씁니다.
         정확한 활용은 한국어라 어려우므로, 선생님이 `일기에 쓸 말` 을 직접 쓰면
         그것을 그대로 씁니다 (아래 past). */
      var past = o.past || name;
      return {
        id: o.id, name: name,
        past: past,                       // 일기 문장 : 기분이 **설렜어요**.
        conn: o.conn || name,             // 여럿일 때 잇는 말
        stem: o.stem || name,
        pre: o.pre || name,
        icon: o.icon || 'moodFun',
        imageKey: o.imageKey || past,     // images/얼굴표정/<일기에 쓸 말>.png
        custom: true
      };
    })));
  };
  App.isCustomPartner = function (id) {
    var p = D.partners.filter(function (x) { return x.id === id; })[0];
    return !!(p && p.custom);
  };
  App.isCustomMood = function (id) {
    var m = D.moods.filter(function (x) { return x.id === id; })[0];
    return !!(m && m.custom);
  };
})();
