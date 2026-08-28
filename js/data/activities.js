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
    /* 언제(날짜)와 시간대는 **같은 폴더**를 씁니다 — 둘 다 '언제' 를 묻는 그림이라
       한 곳에 모아 두는 것이 찾기 쉽습니다.
         날짜   : 어제 · 오늘 · 내일 · 날짜 고르기
         시간대 : 아침 · 낮 · 저녁 */
    when:  'images/시간/',
    time:  'images/시간/',
    place: 'images/장소/',           // 교실.png · 집.png · 부엌.png …
    again: 'images/또하기/',         // 또 하고 싶어요.png · … (일기 저장 뒤 질문)
    /* 일기 제목 고르기 칸의 그림. 제목은 활동에 따라 달라지지만(텃밭 가꾸기 …)
       그림은 **제목의 꼴**을 나타내므로 파일 이름은 늘 같습니다.
       자세한 것은 images/제목/README.md 를 보세요. */
    title: 'images/제목/',
    /* 일기에서 고르는 낱말 카드 그림 (기억에 남는 것 · 다음에는 · 넣을 그림).
       파일 이름은 **화면에 보이는 말 그대로** 입니다.
       자세한 것은 images/일기 낱말/README.md 를 보세요. */
    word: 'images/일기 낱말/',
    supply: 'images/준비물/',        // 가방.png · 물통.png · 앞치마.png …
    corner: 'images/코너명/',        // 여가 계획하기.png · 여가 지도.png · 여가 일기.png · 여가 포트폴리오.png
    ext: '.png',
    cover: 'images/표지.png',        // 첫 화면 표지
    wallpaper: 'images/벽지.jpg',    // 모든 화면의 배경 무늬
    /* 여가 지도(민트색 칸) 의 바탕 그림. 파일이 없으면 지금처럼 연한 색만 깔립니다.
       카드·캐릭터·발자국이 그 위에 올라가므로 아주 연하게 그려야 합니다. */
    mapbg: 'images/여가지도.jpg',
    /* 포트폴리오 첫 화면의 **창 다섯 안쪽**에 깔리는 바탕 그림
       (나 캐릭터 칸 + 코너 넷). 창 위에 그림과 글자가 올라가므로
       아주 연하게 깔립니다 — css 의 .folio-corner / .folio-who 를 보세요. */
    folioBg: 'images/여가 포트폴리오 배경.jpg',
    /* 「지도에 붙이기」 의 바탕 — 학생이 활동 그림을 직접 끌어다 놓는 섬 그림.
       가로로 넓은 그림입니다 (1200x676).
       ★ 투명한 곳이 없는 **사진 같은 바탕**이라 jpg 로 둡니다 — 같은 그림이
         png 로는 1971KB 였는데 jpg 로는 97KB 입니다 (20분의 1). */
    mapBoard: 'images/나의 여가 지도 완성하기.jpg',

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
      unsure: 'images/아직 잘 모르겠어요.png',
      /* 이 일기를 전시할지 고르는 두 칸.
         ⚠ 그림은 **책갈피** 입니다. 별(★)을 쓰면 여가 지도의 `도전하고 싶어요` 와
           한 모양이 두 뜻이 됩니다 (인수인계 14-12).
         ▸ 파일 이름은 `전시해요` · `전시하지 않아요` 이고, 화면에 보이는 말은
           `전시할래요` · `전시하지 않을래요` 입니다. 파일 이름은 학생에게 보이지 않습니다. */
      exhibitYes: 'images/전시해요.png',
      exhibitNo: 'images/전시하지 않아요.png',
      /* ⚠ planLine(계획표 제목 밑줄 손그림)은 **일부러 뺐습니다.**
         그림은 글자 아래에만 놓을 수 있어 글자를 덮거나 밀어냈고, 길이도
         글자와 따로 놀았습니다. 지금은 CSS(.sheet-title::after)가 **글자 길이에
         딱 맞춰** 긋습니다. 자세한 까닭은 css/app.css 의 .sheet-title 주석에. */
      /* 앞 질문으로 돌아가는 화살표 (없으면 코드로 그린 화살표가 나옵니다) */
      back: 'images/화살표.png',
      /* 캐릭터 고르기의 **아홉째 칸** — 내 사진으로 만들기 (2026-08-26).
         ⛔ 코드로 그린 카메라 아이콘을 쓰지 마세요. 나머지 여덟 칸이 모두
            그린 그림이라, 선으로 된 아이콘 하나만 결이 달라 보입니다.
         ⚠ 준비물/사진기.png(사진 같은 노란 카메라)도 결이 달라 쓰지 않습니다.
         ▸ 「일기 낱말」 폴더의 것을 씁니다 — 일기에서 사진을 넣을 때 쓰는
           그림과 **같은 그림**이라야 학생이 같은 일로 알아봅니다. */
      camera: 'images/일기 낱말/사진 넣기.png',
      /* 홈 왼쪽 위 '나의 여가' 글자 그림 — 누르면 표지로 갑니다 */
      coverWord: 'images/나의여가 표지글자.png',
      /* 포트폴리오 넷째 칸 `나의 한마디` 그림.
         나머지 셋은 코너 그림(images/코너명/)을 그대로 쓰지만, 이것은
         코너가 아니라 **여기에서 하는 일**이라 짝이 될 코너 그림이 없습니다. */
      myword: 'images/나의 한마디.png',
      /* 섬 안에 들어갔을 때 깔리는 배경 (없으면 여가지도 배경을 그대로 씁니다).
         가로로 넓은 그림입니다 — 규격은 images/지도/README.md 를 보세요. */
      islandIn: 'images/지도/실내섬.jpg',
      islandOut: 'images/지도/실외섬.jpg'
    },
    /* 그림에 동그라미가 없어서 흰 동그라미 단추 **안에** 넣어야 하는 것들 */
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

  /* 지금 돌고 있는 판 번호 — 선생님 설정 맨 아래에 보여 줍니다.
     '고쳤는데 화면이 그대로' 일 때 **어느 판을 보고 있는지** 알려 줍니다.
     ▸ `20260843j` 처럼 나오면 폴더 판(index.html)이고, `index.html` 의
       `?v=` 숫자와 같아야 최신입니다. 다르면 캐시에 예전 판이 남은 것입니다.
     ▸ `한 파일 판` 으로 나오면 `single-file.html` 을 열고 있는 것입니다.
       이 파일은 **따로 만들어 두는 사본**이라, 고친 것이 바로 반영되지
       않습니다. `build-single-file.ps1` 을 다시 돌려야 새로워집니다. */
  App.buildRev = (REV || '').replace('?v=', '') || '한 파일 판';

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
      defaultPlace: '부엌', defaultSupplies: ['앞치마', '재료'],
      children: [
        A({ id: 'cook-bread', area: 'indoor', name: '식빵 요리', icon: 'bread', imageKey: '식빵 요리',
            planText: '식빵 요리를 할 거예요', diaryText: '식빵 요리를 했어요',
            defaultPlace: '부엌', defaultSupplies: ['식빵', '잼', '접시'] }),
        A({ id: 'cook-fries', area: 'indoor', name: '오지치즈후라이', icon: 'fries', imageKey: '오지치즈후라이',
            planText: '오지치즈후라이를 만들 거예요', diaryText: '오지치즈후라이를 만들었어요',
            defaultPlace: '부엌', defaultSupplies: ['감자튀김', '치즈', '앞치마'] }),
        A({ id: 'cook-brownie', area: 'indoor', name: '오레오 브라우니', icon: 'brownie', imageKey: '오레오 브라우니',
            planText: '오레오 브라우니를 만들 거예요', diaryText: '오레오 브라우니를 만들었어요',
            defaultPlace: '부엌', defaultSupplies: ['오레오', '우유', '그릇'] }),
        A({ id: 'cook-tteok', area: 'indoor', name: '로제떡볶이', icon: 'tteok', imageKey: '로제떡볶이',
            planText: '로제떡볶이를 만들 거예요', diaryText: '로제떡볶이를 만들었어요',
            defaultPlace: '부엌', defaultSupplies: ['떡', '소스', '앞치마'] }),
        A({ id: 'cook-eggrice', area: 'indoor', name: '간장계란밥', icon: 'eggrice', imageKey: '간장계란밥',
            planText: '간장계란밥을 만들 거예요', diaryText: '간장계란밥을 만들었어요',
            defaultPlace: '부엌', defaultSupplies: ['밥', '계란', '간장'] }),
        A({ id: 'cook-nofire', area: 'indoor', name: '과일 요거트', icon: 'fruit', imageKey: '과일 요거트',
            planText: '과일 요거트를 만들 거예요', diaryText: '과일 요거트를 만들었어요',
            defaultPlace: '교실', defaultSupplies: ['과일', '접시', '포크'] })
      ]
    }),
    A({ id: 'insect', area: 'indoor', name: '곤충 키우기', icon: 'bug', imageKey: '곤충 키우기',
        planText: '곤충을 키워 볼 거예요', diaryText: '곤충을 키워 보았어요',
        defaultPlace: '교실', defaultSupplies: ['사육통', '먹이'] }),
    /* ★ 자석놀이를 **블록놀이**로 바꾸었습니다 (2026-08-28 · 선생님 말씀 —
         「실내여가놀이에서 자석놀이 대신에 블록놀이를 넣기, 자석놀이 삭제」).
         자석놀이는 없어진 것이 아니라 **블록놀이 안의 한 가지**로 들어갔습니다
         (자석 블록놀이). 그래서 예전 기록도 뜻이 이어집니다.
       ▸ 예전 일기·계획이 가리키던 `magnet` 은 아래 ALIAS 가 `block-magnet`
         으로 이어 줍니다 — 그러지 않으면 지난 기록의 활동 칸이 빕니다. */
    A({
      id: 'block', area: 'indoor', name: '블록놀이', icon: 'blocks', imageKey: '블록놀이',
      speechName: '블록놀이',
      planText: '블록놀이를 할 거예요', diaryText: '블록놀이를 했어요',
      defaultPlace: '교실', defaultSupplies: ['블록'],
      children: [
        A({ id: 'block-wood', area: 'indoor', name: '나무 블록놀이', icon: 'blocks', imageKey: '나무 블록놀이',
            planText: '나무 블록놀이를 할 거예요', diaryText: '나무 블록놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['블록'] }),
        A({ id: 'block-lego', area: 'indoor', name: '레고 블록놀이', icon: 'blocks', imageKey: '레고 블록놀이',
            planText: '레고 블록놀이를 할 거예요', diaryText: '레고 블록놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['블록'] }),
        A({ id: 'block-magnet', area: 'indoor', name: '자석 블록놀이', icon: 'blocks', imageKey: '자석 블록놀이',
            planText: '자석 블록놀이를 할 거예요', diaryText: '자석 블록놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['블록'] }),
        A({ id: 'block-paper', area: 'indoor', name: '종이 블록놀이', icon: 'blocks', imageKey: '종이 블록놀이',
            planText: '종이 블록놀이를 할 거예요', diaryText: '종이 블록놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['블록'] }),
        A({ id: 'block-big', area: 'indoor', name: '큰 블록놀이', icon: 'blocks', imageKey: '큰 블록놀이',
            planText: '큰 블록놀이를 할 거예요', diaryText: '큰 블록놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['블록'] }),
        A({ id: 'block-fit', area: 'indoor', name: '끼우기 블록놀이', icon: 'blocks', imageKey: '끼우기 블록놀이',
            planText: '끼우기 블록놀이를 할 거예요', diaryText: '끼우기 블록놀이를 했어요',
            defaultPlace: '교실', defaultSupplies: ['블록'] })
      ]
    }),
    /* ★ 이름에서 「실내에서」를 뺐습니다 (2026-08-26 · 선생님 말씀 —
         활동 이름에 장소를 넣지 않는 규칙 8-18(17)과도 맞습니다).
       ⛔ imageKey 는 그림 **파일 이름 그대로**라 바꾸지 않습니다. */
    A({ id: 'pet-in', area: 'indoor', name: '반려동물과 놀기', icon: 'pet', imageKey: '반려동물과 실내에서 놀기',
        speechName: '반려동물과 놀기',
        planText: '반려동물과 놀 거예요', diaryText: '반려동물과 놀았어요',
        defaultPlace: '집', defaultSupplies: ['사료', '장난감', '간식'] }),
    A({ id: 'tv', area: 'indoor', name: 'TV 보기', icon: 'tv', imageKey: 'TV 보기', speechName: '티브이 보기',
        planText: 'TV를 볼 거예요', diaryText: 'TV를 봤어요',
        defaultPlace: '집', defaultSupplies: [] }),
    /* ★ 유튜브 보기를 **퍼즐놀이**로 바꾸었습니다 (2026-08-28 · 선생님 말씀).
         예전 기록은 아래 ALIAS 가 `puzzle` 로 이어 줍니다. */
    /* ⚠ icon 은 **그림 파일이 없을 때만** 쓰는 대신 그림입니다.
         `퍼즐` 아이콘은 icons.js 에 없어서 `blocks` 를 씁니다 (조각 맞추기라
         결이 가장 가깝습니다). 그림 파일(퍼즐놀이.png)이 있으므로 화면에는
         그 그림이 나옵니다.
       ▸ 준비물 `퍼즐` — 선생님이 images/준비물/퍼즐.png 를 넣어 주셨습니다
         (2026-08-28). 그 전에는 놀잇감을 대신 썼습니다. */
    A({ id: 'puzzle', area: 'indoor', name: '퍼즐놀이', icon: 'blocks', imageKey: '퍼즐놀이',
        speechName: '퍼즐놀이',
        planText: '퍼즐놀이를 할 거예요', diaryText: '퍼즐놀이를 했어요',
        defaultPlace: '교실', defaultSupplies: ['퍼즐'] }),
    /* ★ **책 읽기 · 노래 부르기는 실내에도 둡니다** (2026-08-28 · 선생님 말씀 —
         「노래 부르기와 책 읽기는 실내활동에도 넣어줘」).
         도서관·노래방에 가야만 할 수 있는 일이 아니라, 교실에서도 늘 합니다.
       ▸ 실외 짝(`library` · `karaoke`)은 **그대로 둡니다.** 지우면 그 활동으로
         쓴 지난 기록이 실외 섬에서 사라집니다. 두 섬에 하나씩 있는 것은
         `pet` / `pet-in`(반려동물과 놀기)에서 이미 쓰던 방식입니다.
       ▸ 이름은 실외 짝과 **똑같이** 둡니다 — 장소가 다를 뿐 같은 일이라,
         이름을 다르게 하면 학생이 다른 활동으로 봅니다
         (활동 이름에 장소를 넣지 않는 규칙 8-18).

       ⛔⛔ **이 둘은 `defaultPlace` 를 비워 둡니다** (2026-08-28 · 선생님 말씀 —
         「도서관, 노래방 장소는 바꾸지말고 **활동만** 넣어줘. 왜냐하면
         **교실에서 책읽기, 집에서 책읽기, 교실에서 노래하기가 가능하도록**」).
         `defaultPlace` 는 그냥 적어 두는 메모가 아닙니다. 두 가지 일을 합니다 :
           ① 활동을 고르는 순간 **장소 칸을 미리 채웁니다**
              (`place: draft.place || card.defaultPlace`)
           ② 장소 고르는 칸에서 그곳을 **맨 앞으로 끌어옵니다**
         그래서 `교실` 을 적어 두면 교실이 먼저 정해져 버려, 집에서 읽는
         날에도 학생이 굳이 지우고 다시 골라야 합니다.
       ▸ 비워 두면 학생이 **교실이든 집이든** 똑같이 고릅니다.
         실외 짝(`library` · `karaoke`)의 도서관·노래방은 **그대로 둡니다.**

       ⚠⚠ **그림이 아직 실내 것이 아닙니다.**
         지금은 실외 짝의 그림(도서관.png · 노래방.png)을 그대로 씁니다.
         그림에 도서관과 노래방이 그려져 있어서, 교실에서 하는 일로는
         결이 어긋납니다. 글자를 못 읽는 학생은 **그림으로 고릅니다.**
       ▸ `images/activities/` 에 아래 두 장을 넣어 주시면 바로 바뀝니다 :
             책 읽기.png       (교실·집에서 책 읽는 그림)
             노래 부르기.png   (교실에서 노래 부르는 그림)
         넣으신 뒤 imageKey 를 그 이름으로 바꾸면 됩니다. */
    A({ id: 'library-in', area: 'indoor', name: '책 읽기', icon: 'library', imageKey: '도서관',
        speechName: '책 읽기',
        planText: '책을 읽을 거예요', diaryText: '책을 읽었어요',
        defaultPlace: '', defaultSupplies: ['책'] }),
    A({ id: 'karaoke-in', area: 'indoor', name: '노래 부르기', icon: 'mic', imageKey: '노래방',
        speechName: '노래 부르기',
        planText: '노래를 부를 거예요', diaryText: '노래를 불렀어요',
        defaultPlace: '', defaultSupplies: [] }),
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
    /* ★ 활동을 30개로 맞추려고 넣었습니다 (실내 15 · 실외 15).
         30개면 여가 지도 도장판이 **5곳마다 도장 1개 = 6칸**으로 딱 나뉩니다.
         준비물이 거의 없어 누구나 할 수 있는 활동이라 골랐습니다. */
    A({ id: 'music', area: 'indoor', name: '음악 듣기', icon: 'music', imageKey: '음악 듣기',
        planText: '음악을 들을 거예요', diaryText: '음악을 들었어요',
        defaultPlace: '교실', defaultSupplies: [] }),

    /* ------------------------------ 실외 ------------------------------ */
    A({ id: 'playground', area: 'outdoor', name: '놀이 기구 타기', icon: 'slide', imageKey: '놀이터',
        planText: '놀이 기구를 탈 거예요', diaryText: '놀이 기구를 탔어요',
        defaultPlace: '놀이터', defaultSupplies: ['물통', '모자'] }),
    A({ id: 'museum', area: 'outdoor', name: '전시 구경하기', icon: 'museum', imageKey: '박물관',
        planText: '전시를 구경할 거예요', diaryText: '전시를 구경했어요',
        defaultPlace: '박물관', defaultSupplies: ['가방', '물통'] }),
    A({ id: 'artmuseum', area: 'outdoor', name: '그림 감상하기', icon: 'frame', imageKey: '미술관',
        planText: '그림을 감상할 거예요', diaryText: '그림을 감상했어요',
        defaultPlace: '미술관', defaultSupplies: ['가방'] }),
    A({ id: 'library', area: 'outdoor', name: '책 읽기', icon: 'library', imageKey: '도서관',
        planText: '책을 읽을 거예요', diaryText: '책을 읽었어요',
        defaultPlace: '도서관', defaultSupplies: ['가방', '대출증'] }),
    A({ id: 'stationery', area: 'outdoor', name: '문구 사기', icon: 'store', imageKey: '문구점',
        planText: '문구를 살 거예요', diaryText: '문구를 샀어요',
        defaultPlace: '문구점', defaultSupplies: ['용돈', '가방'] }),
    A({ id: 'karaoke', area: 'outdoor', name: '노래 부르기', icon: 'mic', imageKey: '노래방',
        planText: '노래를 부를 거예요', diaryText: '노래를 불렀어요',
        defaultPlace: '노래방', defaultSupplies: ['용돈'] }),
    A({ id: 'cinema', area: 'outdoor', name: '영화 보기', icon: 'film', imageKey: '영화관',
        planText: '영화를 볼 거예요', diaryText: '영화를 봤어요',
        defaultPlace: '영화관', defaultSupplies: ['용돈'] }),
    A({ id: 'park', area: 'outdoor', name: '나들이하기', icon: 'park', imageKey: '공원',
        planText: '나들이를 할 거예요', diaryText: '나들이를 했어요',
        defaultPlace: '공원', defaultSupplies: ['물통', '모자'] }),
    A({ id: 'camping', area: 'outdoor', name: '캠핑하기', icon: 'tent', imageKey: '캠핑',
        planText: '텐트를 치고 놀 거예요', diaryText: '텐트를 치고 놀았어요',
        defaultPlace: '캠핑장', defaultSupplies: ['텐트', '돗자리', '물통'] }),
    A({ id: 'restaurant', area: 'outdoor', name: '맛있는 음식 먹기', icon: 'food', imageKey: '맛집 탐방',
        speechName: '맛있는 음식 먹기',
        planText: '맛있는 음식을 먹을 거예요', diaryText: '맛있는 음식을 먹었어요',
        defaultPlace: '음식점', defaultSupplies: ['용돈'] }),
    A({ id: 'cafe', area: 'outdoor', name: '음료 마시기', icon: 'food', imageKey: '카페',
        planText: '음료를 마실 거예요', diaryText: '음료를 마셨어요',
        defaultPlace: '카페', defaultSupplies: ['용돈'] }),
    A({ id: 'pet-out', area: 'outdoor', name: '반려동물과 산책하기', icon: 'pet', imageKey: '반려동물과 산책하기',
        planText: '반려동물과 놀 거예요', diaryText: '반려동물과 놀았어요',
        defaultPlace: '공원', defaultSupplies: ['목줄', '사료', '간식', '배변봉투'] }),
    A({ id: 'walk', area: 'outdoor', name: '산책하기', icon: 'shoe', imageKey: '산책하기',
        planText: '산책을 할 거예요', diaryText: '산책을 했어요',
        defaultPlace: '동네', defaultSupplies: ['운동화', '물통'] }),
    A({ id: 'bike', area: 'outdoor', name: '자전거 타기', icon: 'bike', imageKey: '자전거 타기',
        planText: '자전거를 탈 거예요', diaryText: '자전거를 탔어요',
        defaultPlace: '공원', defaultSupplies: ['자전거', '헬멧'] }),
    A({ id: 'garden', area: 'outdoor', name: '식물 돌보기', icon: 'leaf', imageKey: '텃밭 가꾸기',
        planText: '식물을 돌볼 거예요', diaryText: '식물을 돌봤어요',
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

  reindex();

  /* ------------------------- 없어진 활동 이어 주기 -------------------------
     활동을 지우거나 이름을 바꾸면 **이미 저장된 계획·일기·지도 표시**가
     사라진 id 를 가리킨 채 남습니다. 그러면 지난 기록의 활동 칸이 통째로
     비고, 학생은 자기가 쓴 일기가 망가진 것으로 봅니다.
   ▸ 그래서 지울 때는 여기에 **새 자리를 적어 둡니다.** 한 줄이면 됩니다.
   ⛔ 줄을 지우지 마세요 — 지우면 그 기록이 그때 빕니다. */
  var ALIAS = {
    magnet: 'block-magnet',     // 자석놀이 → 블록놀이 안의 자석 블록놀이 (2026-08-28)
    youtube: 'puzzle'           // 유튜브 보기 → 퍼즐놀이 (2026-08-28)
  };
  function realId(id) { return (BY_ID[id] ? id : ALIAS[id]) || id; }

  App.act = function (id) { return BY_ID[realId(id)] || null; };
  App.cardIdOf = function (id) { id = realId(id); return CARD_OF[id] || id; };
  App.cardOf = function (id) { return BY_ID[App.cardIdOf(id)] || null; };
  App.allActivities = function () { return Object.keys(BY_ID).map(function (k) { return BY_ID[k]; }); };
  App.topCards = function (area) {
    return ALL.filter(function (a) { return !area || a.area === area; });
  };
  /* 학생 설정에서 숨긴 활동을 제외한 대표 카드.
     ⛔ **하나도 안 남는 일은 없어야 합니다.**
        활동이 0가지가 되면 계획·지도·일기가 모두 고를 것이 없어져,
        홈 화면이 네 코너만 남고 아래가 통째로 빈 채로 보입니다.
        선생님은 무엇이 잘못됐는지 알 길이 없습니다 (실제로 겪었습니다).
      ▸ 지금은 선생님 설정에서 마지막 하나를 숨기지 못하게 막았지만,
        **예전에 만든 자료나 백업**에는 이미 전부 숨겨진 것이 있을 수 있습니다.
        그런 자료는 숨김 목록을 **통째로 무시하고** 다 보여 줍니다 —
        빈 화면보다 다 보이는 편이 낫고, 선생님이 다시 숨기면 됩니다.
      ▸ 섬(area)별로는 비어도 그대로 둡니다. 실내만 쓰는 학급도 있습니다. */
  App.visibleCards = function (student, area) {
    var hidden = (student && student.hiddenActivityIds) || [];
    function keep(list) {
      return list.filter(function (a) {
        return !a.hidden && hidden.indexOf(a.id) === -1;
      });
    }
    if (hidden.length && !keep(App.topCards()).length) hidden = [];   // 되살리기
    return keep(App.topCards(area));
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

  /* 또 하기 그림 — `또 하고 싶어요` · `다른 것도 하고 싶어요` · `잘 모르겠어요`.
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
