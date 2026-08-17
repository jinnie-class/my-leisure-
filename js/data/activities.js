/* ===========================================================
   나의 여가 — 활동 데이터
   -----------------------------------------------------------
   ★ 활동을 추가·수정하거나 그림(PNG)을 교체할 때에는 이 파일만 고치면 됩니다.
     imageKey : images/activities/<imageKey>.png  파일을 찾습니다.
                파일이 없으면 icon 의 기본 SVG 그림이 대신 나옵니다.
     planText : "나는 오늘 친구와 " + planText  → 자연스러운 계획 문장
     diaryText: "나는 오늘 친구와 " + diaryText → 자연스러운 과거형 일기 문장
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});

  /* 그림 파일 위치 (여기 한 곳에서 관리)
     · 경로는 index.html 이 있는 폴더를 기준으로 합니다.
     · 파일 이름에 한글·띄어쓰기가 있어도 됩니다. */
  App.IMAGE_BASE = {
    activity: 'images/activities/',
    avatar: 'images/avatars/',
    partner: 'images/avatars/',      // 함께하는 사람 그림 (엄마·아빠·친구·선생님 …)
    mood: 'images/얼굴표정/',        // 기분 얼굴 그림 (파일 이름은 '재미있었어요.png' 처럼)
    /* 계획하GO! 에서 고르는 것들. 파일 이름은 **화면에 보이는 말 그대로** 씁니다.
       그림이 아직 없으면 코드로 그린 SVG 가 대신 나오므로, 하나씩 넣어도 됩니다. */
    when:  'images/',                // 오늘.png · 내일.png · 날짜 고르기.png
    time:  'images/시간/',           // 아침.png · 낮.png · 저녁.png
    place: 'images/장소/',           // 교실.png · 집.png · 조리실.png …
    again: 'images/또하기/',         // 또 하고 싶어요.png · … (일기 저장 뒤 질문)
    corner: 'images/코너명/',        // 여가 계획하기.png · 여가 지도.png · 여가 일기.png · 여가 포트폴리오.png
    ext: '.png',
    cover: 'images/표지.png',        // 첫 화면 표지
    wallpaper: 'images/벽지.jpg',    // 모든 화면의 배경 무늬
    /* 여가 지도(민트색 칸) 의 바탕 그림. 파일이 없으면 지금처럼 연한 색만 깔립니다.
       카드·캐릭터·발자국이 그 위에 올라가므로 아주 연하게 그려야 합니다. */
    mapbg: 'images/여가지도.png',

    /* 조작 단추 그림 — 동그란 단추 모양까지 그려져 있는 그림입니다.
       파일이 없으면 코드로 그린 선 아이콘이 대신 나옵니다. */
    ui: {
      speaker: 'images/소리이모지.png',
      fullscreen: 'images/전체화면이모지.png',
      gear: 'images/톱니바퀴이모지.png',
      /* 이 그림은 동그라미 없이 선만 있어서, 흰 동그라미 단추 '안에' 넣습니다 */
      home: 'images/home_icon_transparent.png',
      /* 계획하GO! · 기록하GO! 의 '실내에서 / 실외에서' 고르는 카드 그림 */
      indoor: 'images/실내에서 해요.png',
      outdoor: 'images/실외에서 해요.png',
      /* 여가 지도의 활동 표시 그림 (파일 이름 = 표시 이름) */
      tried: 'images/해봤어요.png',
      like: 'images/좋아해요.png',
      challenge: 'images/도전하고 싶어요.png',
      unsure: 'images/아직 잘 모르겠어요.png'
    },
    /* 동그라미가 그려져 있지 않아 단추 안쪽에 넣어야 하는 그림 */
    uiInset: { home: true }
  };

  /* ------------------------- 그림 주소 만들기 -------------------------
     그림 파일을 같은 이름으로 바꿔 넣으면 브라우저가 예전 그림을 계속 씁니다.
     그래서 index.html 의 `?v=...` 를 그림 주소에도 그대로 붙입니다.
     → 그림을 바꿨을 때 index.html 의 숫자만 올리면 모두 새로 불러옵니다.
     (한 파일 판에서는 그림이 data: 주소라 붙이지 않습니다) */
  var REV = (function () {
    try {
      var s = document.currentScript && document.currentScript.src;
      var m = s && s.match(/\?v=([^&]+)/);
      return m ? '?v=' + m[1] : '';
    } catch (e) { return ''; }
  })();

  function imgUrl(path) {
    if (!path) return null;
    if (path.indexOf('data:') === 0) return path;      // 한 파일 판
    return encodeURI(path) + REV;
  }
  App.imgUrl = imgUrl;

  /* 조작 단추 그림 경로 (없으면 null) */
  App.uiImage = function (key) {
    var m = App.IMAGE_BASE.ui || {};
    return m[key] ? imgUrl(m[key]) : null;
  };

  function A(o) {
    return {
      id: o.id,
      area: o.area,                                  // 'indoor' | 'outdoor'
      name: o.name,                                  // 화면에 보이는 활동 이름
      children: o.children || [],                    // 하위 활동
      imageKey: o.imageKey || o.id,                  // 그림 파일 키
      icon: o.icon || 'question',                    // 기본 SVG 그림
      speechName: o.speechName || o.name,            // 음성으로 읽어줄 이름
      planText: o.planText,                          // 계획 문장 (미래)
      diaryText: o.diaryText,                        // 일기 문장 (과거)
      defaultPlace: o.defaultPlace || '',            // 기본 장소
      defaultSupplies: o.defaultSupplies || [],      // 기본 준비물
      hidden: !!o.hidden,                            // 숨김 여부
      custom: !!o.custom                             // 선생님이 더한 '우리 반 활동'
    };
  }

  var ACTIVITIES = [
    /* ------------------------------ 실내 ------------------------------ */
    A({
      id: 'collect', area: 'indoor', name: '수집하기', icon: 'box', imageKey: '수집하기',
      planText: '물건을 모을 거예요', diaryText: '물건을 모았어요',
      defaultPlace: '교실', defaultSupplies: ['상자', '봉투'],
      children: [
        A({ id: 'collect-treasure', area: 'indoor', name: '보물상자', icon: 'box', imageKey: '보물상자',
            planText: '보물상자를 만들 거예요', diaryText: '보물상자를 만들었어요',
            defaultPlace: '교실', defaultSupplies: ['상자', '색종이', '풀'] }),
        A({ id: 'collect-leaf', area: 'indoor', name: '나뭇잎 모으기', icon: 'leaf', imageKey: '나뭇잎 모으기',
            planText: '나뭇잎을 모을 거예요', diaryText: '나뭇잎을 모았어요',
            defaultPlace: '학교 화단', defaultSupplies: ['봉투'] }),
        A({ id: 'collect-stone', area: 'indoor', name: '돌멩이 모으기', icon: 'stone', imageKey: '돌멩이 모으기',
            planText: '돌멩이를 모을 거예요', diaryText: '돌멩이를 모았어요',
            defaultPlace: '운동장', defaultSupplies: ['바구니'] }),
        A({ id: 'collect-nature', area: 'indoor', name: '자연물 모으기', icon: 'nature', imageKey: '자연물 모으기',
            planText: '자연물을 모을 거예요', diaryText: '자연물을 모았어요',
            defaultPlace: '공원', defaultSupplies: ['봉투', '장갑'] })
      ]
    }),
    A({
      id: 'make', area: 'indoor', name: '만들기', icon: 'blocks', imageKey: '만들기 대표',
      planText: '무언가를 만들 거예요', diaryText: '무언가를 만들었어요',
      defaultPlace: '교실', defaultSupplies: ['가위', '풀', '색종이'],
      children: [
        A({ id: 'make-playground', area: 'indoor', name: '놀이터 만들기', icon: 'slide', imageKey: '놀이터 만들기',
            planText: '놀이터를 만들 거예요', diaryText: '놀이터를 만들었어요',
            defaultPlace: '교실', defaultSupplies: ['상자', '블록', '테이프'] }),
        A({ id: 'make-stickerbook', area: 'indoor', name: '스티커북 만들기', icon: 'book', imageKey: '스티커북 만들기',
            planText: '스티커북을 만들 거예요', diaryText: '스티커북을 만들었어요',
            defaultPlace: '교실', defaultSupplies: ['스티커', '공책', '색연필'] })
      ]
    }),
    A({
      id: 'toy', area: 'indoor', name: '놀잇감 활동', icon: 'slime', imageKey: '놀잇감 만들기',
      planText: '놀잇감을 가지고 놀 거예요', diaryText: '놀잇감을 가지고 놀았어요',
      defaultPlace: '교실', defaultSupplies: ['놀잇감'],
      children: [
        A({ id: 'toy-slime', area: 'indoor', name: '슬라임 놀이', icon: 'slime', imageKey: '슬라임 놀이',
            planText: '슬라임 놀이를 할 거예요', diaryText: '슬라임 놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['슬라임', '물티슈'] }),
        A({ id: 'toy-squishy', area: 'indoor', name: '말랑이 놀이', icon: 'squishy', imageKey: '말랑이 놀이',
            planText: '말랑이 놀이를 할 거예요', diaryText: '말랑이 놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['말랑이'] }),
        A({ id: 'toy-paper-squishy', area: 'indoor', name: '종이 스퀴시 만들기', icon: 'paper', imageKey: '종이 스퀴시 만들기',
            planText: '종이 스퀴시를 만들 거예요', diaryText: '종이 스퀴시를 만들었어요',
            defaultPlace: '교실', defaultSupplies: ['종이', '색연필', '가위', '테이프'] }),
        A({ id: 'toy-papercup', area: 'indoor', name: '종이컵 놀이', icon: 'cup', imageKey: '종이컵 놀이',
            planText: '종이컵 놀이를 할 거예요', diaryText: '종이컵 놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['종이컵'] })
      ]
    }),
    A({
      id: 'cook', area: 'indoor', name: '요리하기', icon: 'pot', imageKey: '요리하기',
      planText: '요리를 할 거예요', diaryText: '요리를 했어요',
      defaultPlace: '조리실', defaultSupplies: ['앞치마', '재료'],
      children: [
        A({ id: 'cook-bread', area: 'indoor', name: '식빵 요리', icon: 'bread', imageKey: '식빵 요리',
            planText: '식빵 요리를 할 거예요', diaryText: '식빵 요리를 했어요',
            defaultPlace: '조리실', defaultSupplies: ['식빵', '잼', '접시'] }),
        A({ id: 'cook-fries', area: 'indoor', name: '오지치즈후라이', icon: 'fries', imageKey: '오지치즈후라이',
            planText: '오지치즈후라이를 만들 거예요', diaryText: '오지치즈후라이를 만들었어요',
            defaultPlace: '조리실', defaultSupplies: ['감자튀김', '치즈', '앞치마'] }),
        A({ id: 'cook-brownie', area: 'indoor', name: '오레오 브라우니', icon: 'brownie', imageKey: '오레오 브라우니',
            planText: '오레오 브라우니를 만들 거예요', diaryText: '오레오 브라우니를 만들었어요',
            defaultPlace: '조리실', defaultSupplies: ['오레오', '우유', '그릇'] }),
        A({ id: 'cook-tteok', area: 'indoor', name: '로제떡볶이', icon: 'tteok', imageKey: '로제떡볶이',
            planText: '로제떡볶이를 만들 거예요', diaryText: '로제떡볶이를 만들었어요',
            defaultPlace: '조리실', defaultSupplies: ['떡', '소스', '앞치마'] }),
        A({ id: 'cook-eggrice', area: 'indoor', name: '간장계란밥', icon: 'eggrice', imageKey: '간장계란밥',
            planText: '간장계란밥을 만들 거예요', diaryText: '간장계란밥을 만들었어요',
            defaultPlace: '조리실', defaultSupplies: ['밥', '계란', '간장'] }),
        A({ id: 'cook-nofire', area: 'indoor', name: '불을 사용하지 않는 요리', icon: 'fruit', imageKey: '불을 사용하지 않는 요리',
            planText: '불을 사용하지 않는 요리를 할 거예요', diaryText: '불을 사용하지 않는 요리를 했어요',
            defaultPlace: '교실', defaultSupplies: ['과일', '접시', '포크'] })
      ]
    }),
    A({ id: 'insect', area: 'indoor', name: '곤충 키우기', icon: 'bug', imageKey: '곤충 키우기',
        planText: '곤충을 키워 볼 거예요', diaryText: '곤충을 키워 보았어요',
        defaultPlace: '교실', defaultSupplies: ['사육통', '먹이'] }),
    A({ id: 'magnet', area: 'indoor', name: '자석을 이용한 놀이', icon: 'magnet', imageKey: '자석 놀이',
        speechName: '자석 놀이',
        planText: '자석 놀이를 할 거예요', diaryText: '자석 놀이를 했어요',
        defaultPlace: '교실', defaultSupplies: ['자석', '클립'] }),
    A({ id: 'pet-in', area: 'indoor', name: '반려동물과 실내에서 놀기', icon: 'pet', imageKey: '반려동물과 실내에서 놀기',
        speechName: '반려동물과 실내에서 놀기',
        planText: '반려동물과 실내에서 놀 거예요', diaryText: '반려동물과 실내에서 놀았어요',
        defaultPlace: '집', defaultSupplies: ['장난감', '간식'] }),
    A({ id: 'tv', area: 'indoor', name: 'TV 보기', icon: 'tv', imageKey: 'TV 보기', speechName: '티브이 보기',
        planText: 'TV를 볼 거예요', diaryText: 'TV를 봤어요',
        defaultPlace: '집', defaultSupplies: [] }),
    A({ id: 'youtube', area: 'indoor', name: '유튜브 보기', icon: 'tv', imageKey: '유튜브 보기',
        speechName: '유튜브 보기',
        planText: '유튜브를 볼 거예요', diaryText: '유튜브를 봤어요',
        defaultPlace: '집', defaultSupplies: [] }),
    A({ id: 'game', area: 'indoor', name: '게임하기', icon: 'gamepad', imageKey: '게임하기',
        planText: '게임을 할 거예요', diaryText: '게임을 했어요',
        defaultPlace: '집', defaultSupplies: [] }),
    A({ id: 'boardgame', area: 'indoor', name: '보드게임하기', icon: 'dice', imageKey: '보드게임',
        planText: '보드게임을 할 거예요', diaryText: '보드게임을 했어요',
        defaultPlace: '교실', defaultSupplies: ['보드게임'] }),
    A({ id: 'marble', area: 'indoor', name: '구슬치기', icon: 'marble', imageKey: '구슬치기',
        planText: '구슬치기를 할 거예요', diaryText: '구슬치기를 했어요',
        defaultPlace: '교실', defaultSupplies: ['구슬'] }),
    A({ id: 'yoga', area: 'indoor', name: '요가하기', icon: 'yoga', imageKey: '요가하기',
        planText: '요가를 할 거예요', diaryText: '요가를 했어요',
        defaultPlace: '교실', defaultSupplies: ['매트', '편한 옷'] }),
    A({ id: 'gymnastics', area: 'indoor', name: '체조하기', icon: 'gym', imageKey: '체조하기',
        planText: '체조를 할 거예요', diaryText: '체조를 했어요',
        defaultPlace: '강당', defaultSupplies: ['편한 옷', '물통'] }),

    /* ------------------------------ 실외 ------------------------------ */
    A({ id: 'playground', area: 'outdoor', name: '놀이터 가기', icon: 'slide', imageKey: '놀이터',
        planText: '놀이터에 갈 거예요', diaryText: '놀이터에 갔어요',
        defaultPlace: '놀이터', defaultSupplies: ['물통', '모자'] }),
    A({ id: 'museum', area: 'outdoor', name: '박물관 가기', icon: 'museum', imageKey: '박물관',
        planText: '박물관에 갈 거예요', diaryText: '박물관에 갔어요',
        defaultPlace: '박물관', defaultSupplies: ['가방', '물통'] }),
    A({ id: 'artmuseum', area: 'outdoor', name: '미술관 가기', icon: 'frame', imageKey: '미술관',
        planText: '미술관에 갈 거예요', diaryText: '미술관에 갔어요',
        defaultPlace: '미술관', defaultSupplies: ['가방'] }),
    A({ id: 'library', area: 'outdoor', name: '도서관 가기', icon: 'library', imageKey: '도서관',
        planText: '도서관에 갈 거예요', diaryText: '도서관에 갔어요',
        defaultPlace: '도서관', defaultSupplies: ['가방', '대출증'] }),
    A({ id: 'stationery', area: 'outdoor', name: '문구점 가기', icon: 'store', imageKey: '문구점',
        planText: '문구점에 갈 거예요', diaryText: '문구점에 갔어요',
        defaultPlace: '문구점', defaultSupplies: ['용돈', '가방'] }),
    A({ id: 'karaoke', area: 'outdoor', name: '노래방 가기', icon: 'mic', imageKey: '노래방',
        planText: '노래방에서 노래를 부를 거예요', diaryText: '노래방에서 노래를 불렀어요',
        defaultPlace: '노래방', defaultSupplies: ['용돈'] }),
    A({ id: 'cinema', area: 'outdoor', name: '영화관 가기', icon: 'film', imageKey: '영화관',
        planText: '영화관에서 영화를 볼 거예요', diaryText: '영화관에서 영화를 봤어요',
        defaultPlace: '영화관', defaultSupplies: ['용돈'] }),
    A({ id: 'park', area: 'outdoor', name: '공원 가기', icon: 'park', imageKey: '공원',
        planText: '공원에서 산책할 거예요', diaryText: '공원에서 산책했어요',
        defaultPlace: '공원', defaultSupplies: ['물통', '모자'] }),
    A({ id: 'camping', area: 'outdoor', name: '캠핑하기', icon: 'tent', imageKey: '캠핑',
        planText: '캠핑을 할 거예요', diaryText: '캠핑을 했어요',
        defaultPlace: '캠핑장', defaultSupplies: ['텐트', '돗자리', '물통'] }),
    A({ id: 'restaurant', area: 'outdoor', name: '맛집 탐방하기', icon: 'food', imageKey: '맛집 탐방',
        speechName: '맛집 탐방하기',
        planText: '맛집에 가서 음식을 먹을 거예요', diaryText: '맛집에 가서 음식을 먹었어요',
        defaultPlace: '음식점', defaultSupplies: ['용돈'] }),
    A({ id: 'cafe', area: 'outdoor', name: '카페 가기', icon: 'food', imageKey: '카페',
        planText: '카페에 갈 거예요', diaryText: '카페에 갔어요',
        defaultPlace: '카페', defaultSupplies: ['용돈'] }),
    A({ id: 'pet-out', area: 'outdoor', name: '반려동물과 실외에서 놀기', icon: 'pet', imageKey: '반려동물과 산책하기',
        planText: '반려동물과 밖에서 놀 거예요', diaryText: '반려동물과 밖에서 놀았어요',
        defaultPlace: '공원', defaultSupplies: ['목줄', '간식', '배변봉투'] }),
    A({ id: 'walk', area: 'outdoor', name: '산책하기', icon: 'shoe', imageKey: '산책하기',
        planText: '산책을 할 거예요', diaryText: '산책을 했어요',
        defaultPlace: '동네', defaultSupplies: ['운동화', '물통'] }),
    A({ id: 'bike', area: 'outdoor', name: '자전거 타기', icon: 'bike', imageKey: '자전거 타기',
        planText: '자전거를 탈 거예요', diaryText: '자전거를 탔어요',
        defaultPlace: '공원', defaultSupplies: ['자전거', '헬멧'] }),
    A({ id: 'garden', area: 'outdoor', name: '텃밭 가꾸기', icon: 'leaf', imageKey: '텃밭 가꾸기',
        planText: '텃밭을 가꿀 거예요', diaryText: '텃밭을 가꾸었어요',
        defaultPlace: '텃밭', defaultSupplies: ['모종삽', '물뿌리개', '장갑'] })
  ];

  /* ------------------------- 우리 반 활동 -------------------------
     선생님 설정에서 학급 특성에 맞게 더한 활동입니다.
     `App.store` 에 저장되어 있고, 앱이 켜질 때·바뀔 때 여기로 넘겨 줍니다.
     기본 활동(위 목록)은 건드리지 않고 뒤에 이어 붙입니다. */
  var BUILTIN = ACTIVITIES;
  var CUSTOM = [];
  var ALL = BUILTIN;

  /* ------------------------- 빠른 조회용 색인 ------------------------- */
  var BY_ID = {};       // 모든 활동(대표 + 하위)
  var CARD_OF = {};     // 활동 id → 지도에 표시되는 대표 카드 id

  function reindex() {
    ALL = BUILTIN.concat(CUSTOM);
    BY_ID = {}; CARD_OF = {};
    ALL.forEach(function (a) {
      BY_ID[a.id] = a;
      CARD_OF[a.id] = a.id;
      (a.children || []).forEach(function (c) {
        BY_ID[c.id] = c;
        CARD_OF[c.id] = a.id;
      });
    });
    App.DATA.activities = ALL;
  }

  App.DATA = App.DATA || {};

  /* 우리 반 활동을 다시 읽어 들입니다 (선생님 설정에서 더하거나 지울 때마다) */
  App.setCustomActivities = function (list) {
    CUSTOM = (list || []).map(function (o) {
      var name = String(o.name || '').trim();
      return A({
        id: o.id, area: o.area === 'outdoor' ? 'outdoor' : 'indoor', name: name,
        icon: o.icon || 'star',
        imageKey: o.imageKey || name,          // images/activities/<이름>.png 가 있으면 씁니다
        /* 문장은 선생님이 따로 안 쓰면 이름에서 자동으로 만듭니다 */
        planText: o.planText || (App.eulReul ? App.eulReul(name) + ' 할 거예요' : name + ' 할 거예요'),
        diaryText: o.diaryText || (App.eulReul ? App.eulReul(name) + ' 했어요' : name + ' 했어요'),
        defaultPlace: o.defaultPlace || '',
        defaultSupplies: o.defaultSupplies || [],
        custom: true
      });
    });
    reindex();
  };
  App.isCustomActivity = function (id) {
    var a = BY_ID[id];
    return !!(a && a.custom);
  };

  reindex();

  App.act = function (id) { return BY_ID[id] || null; };
  App.cardIdOf = function (id) { return CARD_OF[id] || id; };
  App.cardOf = function (id) { return BY_ID[CARD_OF[id]] || null; };
  App.allActivities = function () { return Object.keys(BY_ID).map(function (k) { return BY_ID[k]; }); };
  App.topCards = function (area) {
    return ALL.filter(function (a) { return !area || a.area === area; });
  };
  /* 학생 설정에서 숨긴 활동을 제외한 대표 카드 */
  App.visibleCards = function (student, area) {
    var hidden = (student && student.hiddenActivityIds) || [];
    return App.topCards(area).filter(function (a) {
      return !a.hidden && hidden.indexOf(a.id) === -1;
    });
  };
  App.visibleChildren = function (student, card) {
    var hidden = (student && student.hiddenActivityIds) || [];
    return (card.children || []).filter(function (c) {
      return !c.hidden && hidden.indexOf(c.id) === -1;
    });
  };
  /* 그림 파일 경로 (PNG 로 교체할 때 사용)
     한글·띄어쓰기가 있는 파일 이름도 안전하게 처리합니다. */
  App.activityImage = function (a) {
    if (!a || !a.imageKey) return null;
    return imgUrl(App.IMAGE_BASE.activity + a.imageKey + App.IMAGE_BASE.ext);
  };
  App.avatarImage = function (av) {
    if (!av || !av.imageKey) return null;
    return imgUrl(App.IMAGE_BASE.avatar + av.imageKey + App.IMAGE_BASE.ext);
  };
  /* 기분 얼굴 그림 — 파일 이름은 끝맺은 꼴(`재미있었어요.png`) 을 씁니다.
     파일이 없으면 코드로 그린 SVG 얼굴이 대신 나옵니다. */
  App.moodImage = function (m) {
    if (!m) return null;
    return imgUrl(App.IMAGE_BASE.mood + (m.imageKey || m.past || m.name) + App.IMAGE_BASE.ext);
  };
  /* 함께하는 사람 그림.
     혼자·가족·친구·선생님·형제자매처럼 남녀 그림이 둘 다 있는 경우,
     ① 학생별 설정(선생님 설정 → 선택지)에서 고른 쪽이 있으면 그것을,
     ② 없으면 그 학생의 성별에 맞는 쪽을 씁니다.
        ('혼자' 는 학생 자신이라서 성별이 맞아야 자기 그림으로 알아봅니다) */
  App.partnerVariant = function (p, student) {
    if (!p || !p.variants || !p.variants.length) return null;
    var picked = student && student.partnerVariants && student.partnerVariants[p.id];
    var want = picked || ((student && student.gender === 'boy') ? 'm' : 'f');
    var hit = p.variants.filter(function (v) { return v.id === want; })[0];
    return hit || p.variants[0];
  };
  /* 계획하GO! 에서 고르는 것들의 그림 — `언제 · 시간 · 장소 · 또하기`.
     보이는 말을 그대로 파일 이름으로 씁니다 (`낮` → `images/시간/낮.png`).
     파일이 없으면 `null` 이 나오고, 화면은 코드로 그린 SVG 를 대신 씁니다.
     그래서 **그림을 한 장씩 넣어도** 넣은 것부터 바로 나옵니다. */
  App.pickImage = function (kind, word) {
    var base = App.IMAGE_BASE[kind];
    if (!base || !word) return null;
    return imgUrl(base + word + App.IMAGE_BASE.ext);
  };

  /* 또 하기 그림 — `또 하고 싶어요` · `다음에는 다른 활동을 하고 싶어요` · `잘 모르겠어요`.
     ★ `잘 모르겠어요` 는 지도의 **`아직 잘 모르겠어요.png` 를 그대로 씁니다.**
       뜻이 똑같은데 그림을 두 장 그리면 학생이 헷갈립니다.
       `images/또하기/잘 모르겠어요.png` 를 따로 넣으면 그 파일이 먼저입니다.
     ※ 하트·별 모양은 쓰지 마세요. 지도에서 **좋아해요·도전하고 싶어요**를 뜻해서
       같은 그림이 서로 다른 뜻으로 두 번 보이게 됩니다. */
  App.againImage = function (ag) {
    if (!ag) return null;
    if (ag.id === 'unsure') return App.uiImage('unsure');   // images/아직 잘 모르겠어요.png
    return App.pickImage('again', ag.name);
  };

  App.partnerImage = function (p, student) {
    if (!p) return null;
    var v = App.partnerVariant(p, student);
    var key = v ? v.imageKey : p.imageKey;
    if (!key) return null;
    return imgUrl(App.IMAGE_BASE.partner + key + App.IMAGE_BASE.ext);
  };
})();
