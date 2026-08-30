/* ===========================================================
   나의 여가 — 알아보GO! (나의 여가 탐험 지도)
   가운데에 나의 캐릭터, 둘레에 실내·실외 활동이 섬처럼 펼쳐집니다.
   상태는 아이콘과 글자를 함께 보여 주며, 색만으로 구분하지 않습니다.
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect,
      useMemo = React.useMemo, useLayoutEffect = React.useLayoutEffect;

  /* -----------------------------------------------------------------
     여가 탐험 지도의 자리 잡기
     · 가운데에 학생 캐릭터
     · 양옆(또는 위아래)으로 '여가 섬(실내)' 과 '여가 섬(실외)'
     · 화면 크기에 맞추어 카드 크기를 스스로 정하므로 글씨가 작아지지 않습니다
     ----------------------------------------------------------------- */
  /* 섬 이름 바는 섬 칸 안이 아니라 '나' 칸 양옆(같은 높이)에 놓습니다.
     TOP_H 는 이름 자리는 아니지만 섬 칸 위쪽 여백으로 그대로 남겨 둡니다.
     ※ 0 으로 줄이면 활동 카드가 175 → 231px 로 커져 지도 느낌이 달라집니다. */
  /* LABEL_H 52 → 2 · NAV_H 52 → 10 (2026-08-26) : 이름 바·아래 줄이 없어져
     여백을 더 걷어냈습니다 — 카드가 10%쯤 더 커집니다 (선생님 말씀).
     아래 큰 점은 absolute 라 자리를 먹지 않습니다. */
  var PAD = 4, GAP = 8, LABEL_H = 2, NAV_H = 10;
  /* 진행 막대 앞에 붙는 그림 — '해봤어요' 표시와 같은 그림을 씁니다 */
  var footImg = App.uiImage('tried');                 // images/해봤어요.png (없으면 null)
  var COLS = 2, ROWS = 2;              // 한 섬에 2줄 × 2칸 = 4장씩
  var PER = COLS * ROWS;

  /* 섬 한 곳에 들어갔을 때 어떻게 놓을지.
     ⚠ 칸 수를 못박으면 안 됩니다. 4칸 × 2줄로 두었더니 **높이에 걸려**
       카드가 175 → 89px 로 오히려 작아졌습니다. 지도 칸은 옆으로 넓고
       위아래로 낮아서, 줄을 늘리면 카드가 바로 쪼그라듭니다.
     ▸ 그래서 아래 짜임 가운데 **카드가 가장 커지는 것**을 그때그때 고릅니다.
       카드 크기가 거의 같으면(5% 안) 한 쪽에 더 많이 담기는 쪽을 씁니다. */
  /* ★ 한 쪽에 **4칸 × 2줄 = 8장** (2026-08-26 · 선생님 말씀).
       카드 크기는 bestPlan 이 칸에 맞춰 재므로 스크롤이 생기지 않습니다.
       15가지 활동이 두 쪽에 다 담겨 쪽 넘김이 절반으로 줍니다. */
  var F_PLANS = [[4, 2]];

  function bestPlan(region) {
    var best = null;
    F_PLANS.forEach(function (pl) {
      var cols = pl[0], rows = pl[1];
      var innerW = region.w - PAD * 2;
      var innerH = region.h - LABEL_H - NAV_H;
      var cw = Math.max(60, Math.min(
        (innerW - GAP * (cols - 1)) / cols,
        (innerH - GAP * (rows - 1)) / rows));
      var per = cols * rows;
      if (!best || cw > best.cw * 1.05 || (cw > best.cw * 0.95 && per > best.per)) {
        best = { cols: cols, rows: rows, per: per, cw: cw };
      }
    });
    return best;
  }

  /* 칸 안에 카드를 가장 크게 놓기 (아래 화살표 자리는 빼고) */
  function gridFor(region, list, cols, rows) {
    cols = cols || COLS; rows = rows || ROWS;
    var innerW = region.w - PAD * 2;
    var innerH = region.h - LABEL_H - NAV_H;
    var cellW = (innerW - GAP * (cols - 1)) / cols;
    var cellH = (innerH - GAP * (rows - 1)) / rows;
    var cw = Math.max(60, Math.min(cellW, cellH));   // 정사각형
    var totalW = cols * cw + (cols - 1) * GAP;
    var totalH = rows * cw + (rows - 1) * GAP;
    var x0 = region.x + (region.w - totalW) / 2;
    var y0 = region.y + LABEL_H + Math.max(0, (innerH - totalH) / 2);
    return list.map(function (card, i) {
      var r = Math.floor(i / cols), c = i % cols;
      /* ★ 마지막 줄이 덜 찼으면 **그 줄만 가운데로** (2026-08-26 · 선생님 말씀).
           2쪽에 3장만 남으면 왼쪽으로 쏠려 보였습니다. */
      var inRow = Math.min(cols, list.length - r * cols);
      var rowX0 = region.x + (region.w - (inRow * cw + (inRow - 1) * GAP)) / 2;
      return { card: card, x: rowX0 + c * (cw + GAP), y: y0 + r * (cw + GAP), w: cw, h: cw };
    });
  }

  /* 전체 자리 잡기.
     ★ 두 걸음으로 나눕니다.
       focus 가 없으면 → **섬 고르기** (카드를 아예 안 놓습니다)
       focus 가 'in'/'out' 이면 → **그 섬 안** (폭을 통째로 써서 카드가 커집니다)
     예전에는 한 화면에 카드 8장(섬마다 4장)이 늘 떠 있어서, 섬 그림이 거의
     다 덮이고 볼 것이 한꺼번에 너무 많았습니다. */
  /* 배경 그림의 가로세로비.
     ⚠ 여기에 숫자를 못박지 마세요. 예전에는 `1536/832` 처럼 적어 두었는데,
       배경을 세로로 긴 그림으로 바꾸자 자리 잡기가 통째로 어긋났습니다.
     ▸ 이제 **그림을 불러와서 실제 크기를 재어** 씁니다 (아래 useBgRatio).
       아래 값은 그림을 아직 못 받았을 때만 잠깐 쓰는 대비책입니다. */
  var BG_FALLBACK = { map: 1.5, island: 1.85 };

  /* 배경을 `contain` 으로 깔면 그림이 칸 **한가운데에** 놓이고 둘레가 남습니다.
     그 **그려진 자리**를 재서 돌려줍니다. 섬 이름·단추·카드를 이 안에 놓아야
     그림 위 제자리에 앉습니다 (칸 전체에 놓으면 바다 위로 삐져나갑니다). */
  function fitBox(w, h, ratio) {
    var iw = w, ih = w / ratio;
    if (ih > h) { ih = h; iw = h * ratio; }
    return { x: (w - iw) / 2, y: (h - ih) / 2, w: iw, h: ih };
  }

  function layoutOf(box, indoor, outdoor, pageIn, pageOut, focus, bgRatio) {
    var W0 = Math.max(320, box.w), H0 = Math.max(240, box.h);
    /* 그림이 실제로 그려진 자리 안에서만 자리를 잡습니다 */
    var art = fitBox(W0, H0,
      bgRatio || (focus ? BG_FALLBACK.island : BG_FALLBACK.map));
    /* ★ **섬 안에서는 세로로 긴 화면이면 칸을 통째로 씁니다** (2026-08-23).
         섬 그림은 가로로 깁니다(1.85 : 1). 세로로 세운 태블릿에서 그 비율을
         그대로 지키면, 564×846 칸에 그림판이 564×**306** 밖에 안 잡혀서
         위 454px · 아래 297px 이 통째로 놀았습니다. 활동 그림은 60×60 으로
         쪼그라들어 한가운데 모여 있었습니다 (재어 확인).
       ▸ 칸을 다 쓰면 활동 그림이 두 배 넘게 커집니다. 대신 섬 그림은 좌우가
         조금 잘리므로, 그때는 배경도 **채우기(cover)** 로 바꿉니다
         (아래 `fillBg` → `.map-wrap.fill-bg`).
       ⚠ 섬 **고르기** 화면(focus 없음)에는 넣지 않습니다. 거기는 섬 두 개가
         좌우로 놓인 그림 자체를 보는 곳이라, 잘리면 섬이 안 보입니다. */
    var fillBg = false;
    if (focus && art.h < H0 * 0.8) {
      art = { x: 0, y: 0, w: W0, h: H0 };
      fillBg = true;
    }
    var w = art.w, h = art.h;
    /* '나' 는 맨 위 가운데, 그 아래 왼쪽에 실내 섬 · 오른쪽에 실외 섬 */
    var cs = Math.max(110, Math.min(170, Math.min(w * 0.17, h * 0.26)));
    var top = PAD + cs + 26;                        // 발자국 길 자리까지 포함
    var islandW = (w - PAD * 3) / 2;
    var islandH = h - top - PAD;
    var center = { x: (w - cs) / 2, y: PAD, w: cs, h: cs };
    var regionIn = { x: PAD, y: top, w: islandW, h: islandH };
    var regionOut = { x: PAD * 2 + islandW, y: top, w: islandW, h: islandH };
    var side = true;

    /* 섬 하나에 들어갔으면 그 섬이 화면 폭을 통째로 씁니다 */
    var full = { x: PAD, y: top, w: w - PAD * 2, h: islandH };
    if (focus) {
      var list = (focus === 'in') ? indoor : outdoor;
      var plan = bestPlan(full);
      var fPages = Math.max(1, Math.ceil(list.length / plan.per));
      var fp = Math.min(focus === 'in' ? pageIn : pageOut, fPages - 1);
      var fPlaced = gridFor(full, list.slice(fp * plan.per, fp * plan.per + plan.per),
          plan.cols, plan.rows)
        .map(function (q) { return Object.assign(q, { island: focus }); });
      var fTop = fPlaced.length
        ? Math.min.apply(null, fPlaced.map(function (q) { return q.y; }))
        : top + LABEL_H;
      return {
        W: w, H: h, side: side, placed: fPlaced, center: center, fillBg: fillBg,
        labelTop: fTop - 11, focus: focus,
        pagesIn: focus === 'in' ? fPages : 1, pagesOut: focus === 'out' ? fPages : 1,
        pageIn: focus === 'in' ? fp : 0, pageOut: focus === 'out' ? fp : 0,
        islands: [{
          key: focus,
          label: focus === 'in' ? '여가 섬(실내)' : '여가 섬(실외)',
          region: full, labelBox: { x: full.x, w: full.w },
          tone: focus === 'in' ? '#c9a87f' : '#8fbb85',
          page: fp, pages: fPages
        }]
      };
    }

    var pagesIn = Math.max(1, Math.ceil(indoor.length / PER));
    var pagesOut = Math.max(1, Math.ceil(outdoor.length / PER));
    var pi = Math.min(pageIn, pagesIn - 1), po = Math.min(pageOut, pagesOut - 1);
    /* 섬 고르기 화면에서는 **카드를 놓지 않습니다** (섬 그림이 다 보이게) */
    var placed = [];

    /* 섬 이름 바는 **활동 카드 바로 위**에 붙입니다.
       카드는 남는 자리에 따라 위아래로 조금씩 움직이므로, 섬 칸 맨 위가 아니라
       '첫 줄 카드' 를 기준으로 잡아야 어느 화면에서나 카드에 딱 붙습니다.
       여기서 정하는 값은 이름 바의 **아랫변** 자리입니다.
       (CSS 의 `.island-head{ transform:translateY(-100%) }` 가 위로 매달아 줍니다.
        글자 크기가 화면 폭에 따라 커져도 카드와의 사이가 늘 같습니다)
       ★ 위아래로 옮기려면 LABEL_NUDGE 숫자(px)만 고치세요. 음수면 더 위로. */
    var BAR_GAP = 11, LABEL_NUDGE = 0;
    var cardTop = placed.length
      ? Math.min.apply(null, placed.map(function (q) { return q.y; }))
      : top + LABEL_H;
    var labelTop = cardTop - BAR_GAP + LABEL_NUDGE;

    /* 좌우로도 **바깥쪽으로** 밀어 둡니다.
       바탕 그림의 발자국 길이 두 섬 **안쪽(다리 쪽)** 에 있어서, 이름 바를
       한가운데 두면 발자국을 덮어 버립니다.
       실내 섬은 왼쪽으로, 실외 섬은 오른쪽으로 각각 섬 폭의 14% 만큼 옮깁니다.
       ★ 더/덜 밀려면 아래 숫자만 고치세요 (0 이면 한가운데).
       　 px 가 아니라 **비율**이라 화면 크기가 달라져도 같은 자리에 옵니다.
       가운데로 모으는 방식이라 이름 바가 섬 칸 밖으로 나가지 않습니다. */
    var LABEL_OUT = 0.14;
    function labelBox(r, dir) {              // dir: -1 왼쪽(실내) · +1 오른쪽(실외)
      var shift = r.w * LABEL_OUT * 2;       // 가운데는 이 값의 절반만큼 움직입니다
      return { x: dir > 0 ? r.x + shift : r.x, w: Math.max(120, r.w - shift) };
    }

    return {
      W: w, H: h, side: side, placed: placed, center: center,
      labelTop: labelTop,
      pagesIn: pagesIn, pagesOut: pagesOut, pageIn: pi, pageOut: po,
      islands: [
        { key: 'in', label: '여가 섬(실내)', region: regionIn, tone: '#c9a87f',
          labelBox: labelBox(regionIn, -1), page: pi, pages: pagesIn },
        { key: 'out', label: '여가 섬(실외)', region: regionOut, tone: '#8fbb85',
          labelBox: labelBox(regionOut, 1), page: po, pages: pagesOut }
      ]
    };
  }

  C.MapScreen = function (p) {
    App.useStore();
    var student = App.store.current();
    var wrapRef = useRef(null);
    var box = useState({ w: 900, h: 500 });
    var view = useState({ zoom: 1, px: 0, py: 0 });
    var filter = useState('all');
    var openCard = useState(null);
    var helpS = useState(false);
    var toolsS = useState(false);      // 찾아보기 도구를 펼쳤는지

    var cards = useMemo(function () { return App.visibleCards(student); }, [student]);
    var indoor = cards.filter(function (c) { return c.area === 'indoor'; });
    var outdoor = cards.filter(function (c) { return c.area === 'outdoor'; });

    var pIn = useState(0), pOut = useState(0);   // 섬마다 따로 넘깁니다
    /* 어느 섬에 들어가 있는지 (null 이면 섬 고르기 화면).
       모아보기에서 `여가 섬(실내)으로!` 처럼 섬을 안고 들어올 수 있습니다. */
    var islandS = useState(function () {
      var want = p.params && p.params.island;
      return (want === 'in' || want === 'out') ? want : null;
    });
    /* 섬마다 다른 배경 그림 (없으면 지도 배경을 그대로 씁니다).
       ⚠ 주소를 **문서 기준 절대 주소**로 바꿔서 넣어야 합니다.
         CSS 변수(--island-bg) 안의 상대 주소는 그 값을 쓰는 **스타일시트
         (css/app.css) 자리**를 기준으로 풀립니다. 그대로 두면
         `css/images/지도/실내섬.png` 를 찾다가 못 찾습니다.
         (app.js 의 --wallpaper · --mapbg 도 같은 까닭으로 이렇게 합니다) */
    var islandBg = islandS[0]
      ? App.uiImage(islandS[0] === 'in' ? 'islandIn' : 'islandOut')
      : null;
    if (islandBg) {
      try { islandBg = new URL(islandBg, document.baseURI).href; } catch (e) {}
    }
    /* 그림 둘레를 메우는 색 — **섬마다 다릅니다.**
       그림 가장자리 색을 재서 맞춘 값입니다. 색이 이어지면 남는 자리가
       `빈 곳` 이 아니라 `그 섬이 더 넓은 것` 으로 보입니다.
         실내섬 #FFFBE6 (파스텔 노랑 — 방 안 바닥)
         실외섬 #EBF6FC (하늘색 — 바깥 하늘)
       ★ 배경을 새로 그리면 가장자리 색도 다시 재어 여기를 고치세요. */
    var islandSea = islandS[0] === 'in' ? '#fefdfb'
                  : (islandS[0] === 'out' ? '#f9fbfe' : null);
    /* 지금 깔린 배경 그림의 **실제 가로세로비**를 재어 둡니다.
       그림을 세로로 긴 것으로 바꾸든 가로로 넓은 것으로 바꾸든,
       섬 이름·단추·카드가 늘 그림 안에 제대로 앉습니다. */
    var bgRatioS = useState(null);
    useEffect(function () {
      var url = islandBg || App.imgUrl(App.IMAGE_BASE.mapbg);
      if (!url) { bgRatioS[1](null); return; }
      var im = new Image();
      im.onload = function () {
        if (im.naturalWidth && im.naturalHeight) {
          bgRatioS[1](im.naturalWidth / im.naturalHeight);
        }
      };
      im.src = url;
    }, [islandBg]);

    var L = useMemo(function () {
      return layoutOf(box[0], indoor, outdoor, pIn[0], pOut[0], islandS[0], bgRatioS[0]);
    }, [cards.map(function (c) { return c.id; }).join(','),
        Math.round(box[0].w), Math.round(box[0].h), pIn[0], pOut[0], islandS[0], bgRatioS[0]]);
    function turn(key, d) {
      var s = key === 'in' ? pIn : pOut;
      var max = (key === 'in' ? L.pagesIn : L.pagesOut) - 1;
      s[1](function (n) { return Math.max(0, Math.min(max, n + d)); });
    }
    var W = L.W, H = L.H;
    var placed = L.placed;
    var CX = L.center.x + L.center.w / 2, CY = L.center.y + L.center.h / 2;

    /* 화면 크기 재기 */
    useLayoutEffect(function () {
      function measure() {
        var el = wrapRef.current; if (!el) return;
        var r = el.getBoundingClientRect();
        box[1](function (prev) {
          return (Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1)
            ? prev : { w: r.width, h: r.height };
        });
      }
      measure();
      var ro = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
      if (ro && wrapRef.current) ro.observe(wrapRef.current);
      window.addEventListener('resize', measure);
      return function () { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    /* 자리 잡기가 이미 화면 크기에 맞추어 계산되므로 기본 배율은 1입니다.
       ＋ 크게 를 누르면 커지고, 넘치는 만큼은 방향키로 움직입니다. */
    var scale = view[0].zoom;
    var offX = (box[0].w - W * scale) / 2 + view[0].px;
    var offY = (box[0].h - H * scale) / 2 + view[0].py;
    var overflowX = W * scale - box[0].w;
    var overflowY = H * scale - box[0].h;

    /* 좌우 방향키로 지도 쪽을 넘깁니다 */
    useEffect(function () {
      function onKey(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (document.querySelector('.mask')) return;
        var t = e.target;
        if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); turn('in', 1); turn('out', 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); turn('in', -1); turn('out', -1); }
      }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [L.pagesIn, L.pagesOut]);

    var statusMap = App.store.mapOf(student && student.id);
    function statusOf(id) { return statusMap[id] || { tried: false, like: false, challenge: false, unsure: false }; }

    function matches(cardId) {
      var st = statusOf(cardId);
      switch (filter[0]) {
        case 'tried': return !!st.tried;
        case 'like': return !!st.like;
        case 'challenge': return !!st.challenge;
        case 'none': return !st.tried;
        default: return true;
      }
    }

    var FILTERS = [
      { id: 'all', name: '모두 보기', icon: 'eye' },
      { id: 'tried', name: '해봤어요', icon: 'foot' },
      { id: 'like', name: '좋아해요', icon: 'heart' },
      { id: 'challenge', name: '도전하고 싶어요', icon: 'star' },
      /* `아직 안 해봤어요` 와 `아직 잘 모르겠어요` 는 학생에게 같은 뜻이라
         말과 그림을 하나로 묶었습니다 (options.js 의 notTried 주석 참고) */
      { id: 'none', name: App.DATA.notTried.name, icon: App.DATA.notTried.icon }
    ];

    var summary = App.sentences.mapSummary(statusMap, cards);
    var shownCount = placed.filter(function (q) { return matches(q.card.id); }).length;

    /* ================= 나의 여가 도장판 =================
       ★ 예전에는 진행 막대 하나뿐이라 **40개를 다 해야** 뭔가 되는 구조였습니다.
         너무 멀어서 학생이 목표를 느끼지 못했습니다.
         이제 **5개마다 도장 1개**를 찍습니다 (40개 = 도장 8개).
         가까운 목표가 눈앞에 계속 보입니다.

       도장을 누르면 **그때까지 해본 활동과 날짜**가 나옵니다.
       문구마켓의 `참잘했어요` 도장처럼 날짜가 남는 것이 핵심입니다. */
    var PER_STAMP = 5;

    /* '해봤어요' 로 표시한 활동을 **처음 표시한 날짜 순서**로 모읍니다.
       날짜는 그 활동으로 쓴 일기 가운데 가장 이른 날을 씁니다
       (지도 표시만 눌렀고 일기가 없으면 날짜를 비워 둡니다). */
    var triedList = (function () {
      var diaries = App.store.diaries(student.id) || [];
      var firstDate = {};
      diaries.forEach(function (d) {
        var cid = d.cardId || App.cardIdOf(d.activityId);
        if (!cid) return;
        if (!firstDate[cid] || d.date < firstDate[cid]) firstDate[cid] = d.date;
      });
      return cards
        .filter(function (c) { return statusOf(c.id).tried; })
        .map(function (c) { return { id: c.id, name: c.name, date: firstDate[c.id] || '' }; })
        .sort(function (a, b) {
          if (a.date && b.date) return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        });
    })();

    var triedCount = triedList.length;
    var stampTotal = Math.ceil(cards.length / PER_STAMP);       // 40개 → 8칸
    var stamps = [];
    for (var si = 0; si < stampTotal; si++) {
      var need = Math.min((si + 1) * PER_STAMP, cards.length);
      var got = triedCount >= need;
      var group = triedList.slice(si * PER_STAMP, si * PER_STAMP + PER_STAMP);
      stamps.push({
        no: si + 1, need: need, done: got, group: group,
        /* 도장 찍은 날 = 그 묶음의 마지막 활동을 한 날 */
        date: got && group.length ? (group[group.length - 1].date || '') : '',
        next: !got && triedCount >= si * PER_STAMP    // 지금 채우고 있는 칸
      });
    }
    var stampS = useState(null);      // 눌러서 열어 본 도장

    /* ---------- 도장 하나를 다 채우면 폭죽을 터뜨립니다 ----------
       5개를 채운 그 순간을 그냥 지나가게 두면 도장판이 그저 표가 됩니다.
       **몇 번째 도장까지 축하했는지**를 학생 기록에 적어 두고
       (`stampCheered`), 그보다 도장이 늘어나 있으면 축하합니다.
       ▸ 축하는 **한 번만** : 지도를 다시 열어도 또 터지지 않습니다.
       ▸ 일기를 쓰고 나면 지도에 저절로 표시되므로, 도장을 채운 학생은
         다음에 지도를 열었을 때 폭죽을 보게 됩니다. */
    var doneStamps = stamps.filter(function (s) { return s.done; }).length;
    var cheerS = useState(null);        // 지금 축하하는 도장 (없으면 null)
    useEffect(function () {
      var seen = student.stampCheered || 0;
      if (doneStamps > seen) {
        var got = stamps.filter(function (s) { return s.done; })[doneStamps - 1];
        cheerS[1](got);
        App.store.updateStudent(student.id, { stampCheered: doneStamps });
        App.speakFor(student, got.need + '개를 해봤어요. 도장을 받았어요. 축하해요!');
      }
    }, [doneStamps, student.id]);

    function toggle(cardId, key) {
      App.store.toggleMapState(student.id, cardId, key);
      var st = App.store.statusOf(student.id, cardId);
      var s = App.DATA.mapStates.filter(function (m) { return m.id === key; })[0];
      App.speakFor(student, s.name + (st[key] ? ' 선택했어요' : ' 선택을 지웠어요'));
    }

    return html`<div class="app" data-corner="map">
      <!-- ★ 파란 화살표가 **한 걸음씩** 되짚습니다.
             섬 안이면 → 큰 지도(섬 고르기)
             섬 고르기면 → 앞 화면(보통 나의 여가)
           그래서 지도 안에 있던 지도로 알약을 지웠습니다 — 화살표와 같은
           일을 하는데 자리만 둘이었습니다. -->
      <${C.TopBar} title="여가 지도"
        onBack=${function () {
          if (islandS[0]) {
            /* 섬을 나올 때는 찾아보기도 처음으로 되돌립니다 */
            filter[1]('all'); toolsS[1](false); islandS[1](null); return;
          }
          /* ⚠ 여기서는 `지나온 길`(p.back)을 쓰지 않습니다.
               지도 ↔ 모아보기를 오간 것이 길에 쌓여 있어서, 큰 지도에서
               화살표를 누르면 홈이 아니라 **모아보기로 되돌아갔습니다.**
               큰 지도는 코너의 첫 화면이므로 늘 홈으로 나갑니다. */
          p.nav('home');
        }}
        backLabel=${islandS[0] ? '여가 지도로' : '나의 여가로'}
        onTitle=${function () { p.nav("home"); }}>
        <!-- '일기 쓰기' 는 두지 않습니다. 여기는 지도를 보는 곳이고,
             일기는 홈의 계획 카드나 기록하GO! 에서 씁니다 (규칙 7 — 중복 금지) -->
        <!-- ★ 나가는 길은 **맨 위 줄**에 둡니다 (2026-08-23).
               예전에는 지도 아래에 큰 띠로 있어서 그만큼 지도가 눌렸습니다.
               맨 위로 올리니 지도가 그 높이를 그대로 씁니다.
             ▸ 안내 한 줄은 반대로 **지도 칸 안**으로 내려갔습니다.
               맨 위에 있을 때는 화면이 좁으면 통째로 숨어서, 세로로 세운
               태블릿에서는 아무에게도 보이지 않았습니다. -->
        <!-- 「나의 여가로 돌아가기」는 없앴습니다 (2026-08-26) — 맨 위 줄의
             「나의 여가」·홈 단추가 그 일을 합니다. -->
        <!-- ⛔ 읽어주기는 **지금 보이는 화면**을 말해야 합니다 (2026-08-26 ·
               선생님 말씀). 섬 안에 들어와도 「나의 여가 탐험 지도」와 전체
               요약을 그대로 읽어서, 학생이 어느 섬에 있는지 알 수 없었습니다.
             ▸ 섬 밖(섬 고르기) : 두 섬을 눌러 보라고 말합니다.
             ▸ 섬 안 : **그 섬 이름**과 **그 섬에서 해 본 수**를 말합니다. -->
        <${C.Speak} text=${(function () {
          if (!islandS[0]) {
            return '나의 여가 탐험 지도. 여가 섬(실내)과 여가 섬(실외)을 눌러 여가 탐험을 시작해요. '
              + summary.join(' ');
          }
          var 안 = islandS[0] === 'in';
          var 목록 = 안 ? indoor : outdoor;
          var 해봄 = 목록.filter(function (c) {
            return App.store.statusOf(student.id, c.id).tried;
          }).length;
          return '여가 섬(' + (안 ? '실내' : '실외') + ')이에요. '
            + '활동 ' + 목록.length + '가지 가운데 ' + 해봄 + '가지를 해봤어요. '
            + '활동을 눌러 표시해 보세요.';
        })()} />
      <//>

      <!-- full : 지도는 흰 칸 높이 통일(85%) 규칙의 **예외**입니다 —
           지도가 주인공이라 남는 높이를 다 씁니다 (2026-08-26 · 인수인계 29). -->
      <div class="stage full">
        <!-- 폭은 다른 화면과 같게(가운데 기둥), 높이만 남는 만큼 씁니다.
             ※ flex:1 1 auto 를 주면 '가로로도' 늘어나 다른 화면보다 넓어집니다. -->
        <div class="panel" style=${{ alignSelf: 'stretch' }}>
        <div class="stage-fit" style=${{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>

          <!-- 나의 여가 도장판 : 5개마다 발자국 도장 하나.
               ★ **섬 고르기 화면에서만** 보여 줍니다. 섬 안에서는 활동에만
                 마음을 쓰게 두는 것이 좋습니다 (한꺼번에 보이는 것 줄이기). -->
          ${!L.focus && html`
          <div class="stampcard"
              role="group" aria-label=${'나의 여가 도장판. 모두 ' + cards.length + '개 가운데 ' + triedCount + '개를 해봤어요.'}>
            <span class="stampcard-lab">나의 여가 도장판
              <b>${triedCount} / ${cards.length}개</b></span>
            <div class="stamps">
              ${stamps.map(function (s) {
                var cls = 'stamp' + (s.done ? ' on' : '') + (s.next ? ' next' : '');
                return html`<button key=${s.no} type="button" class=${cls}
                    disabled=${!s.done}
                    aria-label=${s.need + '개 도장' + (s.done ? ' 받았어요' : ' 아직이에요')}
                    title=${s.done ? '눌러서 해본 활동 보기' : s.need + '개를 해보면 도장을 받아요'}
                    onClick=${function () { if (s.done) stampS[1](s); }}>
                  <span class="stamp-ink" aria-hidden="true">
                    ${footImg ? html`<img src=${footImg} alt="" />`
                              : html`<span dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />`}
                  </span>
                  <!-- 오른쪽 : 몇 곳인지 · 완성했는지 (발자국 옆에 두 줄로) -->
                  <span class="stamp-txt">
                    <span class="stamp-need">${s.need}개</span>
                    <span class="stamp-date">${s.done ? (s.date ? App.fmtDateShort(s.date) : '성공') : ''}</span>
                  </span>
                </button>`;
              })}
            </div>
          </div>`}

          <!-- 찾아보기 · 지도 도움말 한 줄 — 도장판 바로 아래, 왼쪽 찾아보기 · 오른쪽 도움말.
               ★ 맨 위 줄(집 단추 · 스피커 · 이름표)에 두었더니 그 줄이 빽빽해
                 답답해 보였습니다. 도장판 아래는 원래 비어 있던 자리라
                 지도를 줄이지 않고도 둘 곳이 생깁니다.
               ★ 섬 안에서는 **늘 보입니다.** 예전에는 선생님이 켤 때에만 나왔는데
                 (student.mapTools), 켜는 곳을 모르면 학생도 선생님도 이 두 가지를
                 아예 쓸 수 없었습니다. 활동 카드가 4쪽까지 있어서 찾아보기가 없으면
                 원하는 활동을 찾기 어렵고, 도움말은 도장 네 가지 뜻을 알려 주는
                 유일한 자리입니다. 둘 다 **숨길 이유가 없는 것**이었습니다.
               ★ 섬 고르기 화면(1층)에는 **두지 않습니다.**
                 여기서 할 일은 '어느 섬에 갈까?' 하나뿐인데, 찾아보기와
                 도움말이 함께 있으면 고를 것이 셋으로 늘어납니다.
                 둘 다 활동 카드를 볼 때 쓰는 것이라 섬 안(2층)에만 둡니다. -->
          <!-- ★ 도구 줄 = **가운데 토글바 하나** (2026-08-26 · 선생님 말씀).
                 [여가 섬(실내) | 여가 섬(실외) | 모아보기] 세 칸 슬라이드 메뉴.
                 찾아보기는 없앴고, 지도 도움말만 오른쪽 끝에 남습니다.
               ⚠ L.islands 는 섬 안에서 들어온 섬 하나만 담습니다 —
                 토글바는 고정 목록으로 그립니다. -->
          ${L.focus && html`<div class="map-toolrow center">
            <div class="isl-seg" role="tablist" aria-label="여가 섬 고르기">
              ${[['in', '여가 섬(실내)'], ['out', '여가 섬(실외)']].map(function (sw) {
                var cur = L.focus === sw[0];
                return html`<button key=${'sw' + sw[0]} type="button" role="tab"
                  class=${'seg ' + sw[0] + (cur ? ' on' : '')}
                  aria-selected=${cur ? 'true' : 'false'}
                  onClick=${function () {
                    if (!cur) { islandS[1](sw[0]); App.speakFor(student, sw[1] + '에 가요'); }
                  }}>${sw[1]}</button>`;
              })}
              <button type="button" role="tab" class="seg collect" aria-selected="false"
                onClick=${function () { p.nav('mymap', { island: L.focus }); }}
                aria-label=${(L.focus === 'in' ? '실내' : '실외') + ' 여가 섬에서 내가 표시한 활동 모아보기'}>
                모아보기 ▶</button>
            </div>
            <${C.Btn} size="small" icon="question" className="map-help"
              onClick=${function () { helpS[1](true); }}>지도 도움말<//>
          </div>`}


          <!-- ★ 선생님 도구(찾아보기 · 지도 도움말)는 **지도 아래로 내렸습니다.**
                 지도 위에 있으면 그만큼 지도와 활동 그림이 눌려서 작아졌습니다.
                 지도가 이 화면의 주인공이니 위쪽 자리를 모두 지도에 줍니다.
                 (도구 자체는 선생님이 켤 때에만 나옵니다 — 학생 화면에는 지도만.)
                 모아보기는 지도 칸 오른쪽 위(map-collect)에 있습니다.
                 ※ 이 주석은 html 템플릿 안이라 백틱을 쓰면 템플릿이 끊깁니다. -->

          <!-- 섬 안에서는 그 섬만의 배경 그림을 씁니다
               (images/지도/실내섬.png · 실외섬.png — 없으면 지도 배경 그대로) -->
          <div class=${'map-wrap grow' + (L.focus ? ' in-island' : '') + (L.fillBg ? ' fill-bg' : '')} ref=${wrapRef}
              style=${(islandBg || islandSea) ? {
                '--island-bg': islandBg ? 'url("' + islandBg + '")' : null,
                '--island-sea': islandSea || null
              } : null}>

            <!-- ★ 무엇을 하는 곳인지 한 줄 — **지도 칸 안 맨 위** (2026-08-23).
                   처음 들어온 학생은 지도를 보고도 무엇을 눌러야 하는지 몰라
                   그냥 나가 버렸습니다. 섬을 누르라고 적어 두면 바로 시작합니다.
                 ▸ 예전에는 맨 위 줄에 있었는데, 화면이 좁으면 통째로 숨어서
                   **세로로 세운 태블릿에서는 아무에게도 안 보였습니다.**
                   지도 칸 안으로 들여놓으니 어느 화면에서나 보입니다.
                 ▸ 섬 안에서는 넣지 않습니다 — 이미 들어와 있으니 할 말이 다릅니다. -->
            ${!L.focus && html`<span class="map-say">
              여가 섬(실내)과 여가 섬(실외)을 눌러 여가 탐험을 시작해요!</span>`}

            <!-- 「실내외 여가 섬으로」 알약은 없앴습니다 (2026-08-26) —
                 위 도구 줄의 섬 전환 알약(여가 섬(실내)/(실외))이 그 일을 하고,
                 섬 고르기 화면은 맨 위 파란 화살표로 갑니다. -->

            <div class="map-canvas" style=${{ width: W + 'px', height: H + 'px',
                transform: 'translate(' + offX + 'px,' + offY + 'px) scale(' + scale + ')' }}>

              <!-- 섬 안의 섬 이름 바는 없앴습니다 (2026-08-26 · 선생님 말씀) —
                   위 도구 줄 토글바에 같은 이름이 이미 켜져 있어 중복입니다.
                   (섬 고르기 화면의 이름은 island-gate 안 gate-name 이 그대로 씁니다) -->

              <!-- ★ 섬 고르기 — 카드 대신 **섬 두 개만**.
                     한 화면에 카드 8장이 늘 떠 있어서 섬 그림이 거의 다 덮이고,
                     볼 것이 한꺼번에 너무 많았습니다.
                     여기서는 어느 섬에 갈지부터 학생이 정합니다. -->
              ${!L.focus && L.islands.map(function (is) {
                var r = is.region;
                var list = is.key === 'in' ? indoor : outdoor;
                var done = list.filter(function (c) { return statusOf(c.id).tried; }).length;
                /* ★ 섬 고르기 화면에서는 칸을 **그림 꼭대기 가까이까지** 늘립니다.
                     원래 칸(region)은 나 카드 아래에서 시작하는데, 섬은 그
                     카드 양옆에 있어서 더 위까지 쓸 수 있습니다.
                     그래야 섬 이름이 섬 꼭대기(구름 자리)에 앉습니다.
                   ▸ 위아래 자리는 css 의 .island-gate padding 이 정합니다. */
                var gy = L.H * 0.02;
                var gh = (r.y + r.h) - gy;
                return html`<button key=${'gate' + is.key} type="button"
                    class=${'island-gate ' + is.key}
                    style=${{ left: r.x + 'px', top: gy + 'px', width: r.w + 'px', height: gh + 'px' }}
                    onClick=${function () { islandS[1](is.key); App.speakFor(student, is.label + '에 가요'); }}
                    aria-label=${is.label + '. ' + list.length + '개 가운데 ' + done + '개를 해봤어요. 눌러서 들어가요.'}>
                  <!-- 위 : 섬 이름 (섬 꼭대기 하늘 자리) -->
                  <span class="gate-name">${is.label}</span>
                  <!-- 아래 : 발자국 수 + 들어가기 (탐험의 시작 팻말 옆 자리).
                       둘을 갈라 놓아야 섬 그림 가운데(집·자전거·돗자리 …)를
                       가리지 않습니다. -->
                  <!-- 아래 : 발자국 수만. 들어가기 단추는 없앴습니다 —
                       섬 어디를 눌러도 들어가므로 같은 말을 또 할 까닭이 없고,
                       그만큼 섬 그림을 덜 가립니다. -->
                  <span class="gate-foot">
                    <span class="gate-count">
                      ${footImg ? html`<img src=${footImg} alt="" />` : null}
                      <b>${done}</b> / ${list.length} 개
                    </span>
                  </span>
                </button>`;
              })}


              <!-- ★ 가운데 학생 카드(map-me)는 없앴습니다 (2026-08-26 · 선생님 말씀).
                     맨 위 줄 오른쪽에 학생 이름표가 늘 있어서 같은 말이 두 번이었고,
                     지도 한가운데를 가렸습니다. -->

              ${placed.map(function (q) {
                var st = statusOf(q.card.id);
                var on = App.DATA.mapStates.filter(function (m) { return st[m.id]; });
                var words = on.map(function (m) { return m.name; }).join(' · ');
                var show = matches(q.card.id);
                return html`<button key=${q.card.id} type="button"
                    class=${'mapcard ' + (q.card.area === 'indoor' ? 'indoor' : 'outdoor') +
                            (st.tried ? ' tried' : '') + (show ? '' : ' dim')}
                    style=${{ left: q.x + 'px', top: q.y + 'px', width: q.w + 'px', height: q.h + 'px',
                              '--cw': q.w + 'px' }}
                    tabIndex=${show ? 0 : -1}
                    aria-hidden=${show ? null : 'true'}
                    onClick=${function () { if (show) { openCard[1](q.card); App.speakFor(student, q.card.speechName); } }}
                    aria-label=${q.card.name + '. ' + (words || App.DATA.notTried.name)}>
                  <span class="mi"><${C.ActivityArt} activity=${q.card} /></span>
                  <span class="mn">${q.card.name}</span>
                  ${on.length ? html`<span class="mb">${on.map(function (m) {
                    return html`<i key=${m.id} class=${m.id} title=${m.name} aria-hidden="true">
                      <${C.StateArt} state=${m} /></i>`;
                  })}</span>` : null}
                </button>`;
              })}

              <!-- 아래 줄 「이전 · 1/4 쪽 · 다음」 은 없앴습니다 (2026-08-26 ·
                   선생님 말씀) — 쪽 넘김은 카드 양옆 화살표 + 아래 큰 점입니다
                   (map-canvas 밖, map-wrap 에 붙어 있습니다). -->
            </div>

            <!-- 되돌아가는 길은 맨 위 파란 화살표가 맡습니다.
                 여기 있던 지도로 알약은 지웠습니다 (같은 일을 하는 길이 둘). -->

            <!-- 모아보기 알약은 위 도구 줄(지도 도움말 왼쪽)로 올렸습니다 (2026-08-26). -->

            <!-- ★ 쪽 넘김 = 카드 **양옆 화살표** + 아래 큰 점 (2026-08-26 · 선생님 말씀).
                   아래 줄의 「이전 · 1/4 쪽 · 다음」 을 걷어내고, 홈·포트폴리오의
                   화살표(flow-arrow)와 같은 모양으로 맞췄습니다. -->
            ${L.focus && (function () {
              var is = L.islands.filter(function (x) { return x.key === L.focus; })[0];
              if (!is || is.pages <= 1) return null;
              return html`<${React.Fragment}>
                <button type="button" class="flow-arrow isl-arrow left"
                  aria-label=${is.label + ' 앞 활동 보기'}
                  disabled=${is.page === 0} onClick=${function () { turn(is.key, -1); }}>
                  <span class="ico" aria-hidden="true"
                    dangerouslySetInnerHTML=${{ __html: App.icon('back') }} />
                </button>
                <button type="button" class="flow-arrow isl-arrow right"
                  aria-label=${is.label + ' 활동 더 보기'}
                  disabled=${is.page >= is.pages - 1} onClick=${function () { turn(is.key, 1); }}>
                  <span class="ico" aria-hidden="true"
                    dangerouslySetInnerHTML=${{ __html: App.icon('next') }} />
                </button>
                <span class="isl-dots-big" role="status"
                  aria-label=${'모두 ' + is.pages + '쪽 가운데 ' + (is.page + 1) + '쪽'}>
                  ${Array.apply(null, { length: is.pages }).map(function (_, i) {
                    return html`<i key=${i} class=${i === is.page ? 'on' : ''}></i>`;
                  })}
                </span>
              <//>`;
            })()}

          </div>

          <!-- ★ '나는 10가지 여가활동을 해봤어요.' 흰 바를 없앴습니다.
               바로 위 도장판이 이미 '10 / 30곳' 이라고 같은 것을 말하고 있어서
               한 화면에서 같은 소식을 두 번 하고 있었습니다 (규칙 7 — 중복 금지).
               요약 문장은 그대로 살아 있습니다 — 맨 위 읽어주기와
               지도 도움말 창에서 다섯 줄을 다 들려주고 보여 줍니다. -->

          <!-- 찾아보기(거르기·배율 상자)는 **없앴습니다** (2026-08-26 · 선생님 말씀).
               한 쪽 8장이 되면서 걸러 볼 만큼 카드가 많지 않습니다.
               되살리려면 _이전버전/20260826_지도도장판외이전 을 보세요. -->

          <!-- 맨 아래는 학생이 쓰는 큰 단추 하나만. 가운데입니다.
               선생님 도구는 맨 위 줄로 올렸습니다 (위 TopBar 를 보세요). -->
          <!-- 모아보기는 지도 칸 **오른쪽 위**에 있습니다 (아래 map-wrap 안).
               맨 아래에 큰 띠로 두었더니 지도가 그만큼 눌렸고, 학생이 할 일인
               '섬에 들어가기' 보다 더 커 보였습니다.
               왼쪽 위 지도로 와 짝이 되어, 지도 칸 두 귀퉁이가 길이 됩니다. -->
        </div>
        <!-- ★ 나가는 길 — **섬 고르기 화면(1층)에서만** 나옵니다.
               여기가 이 코너의 첫 화면이자 마지막 화면이라, 다 보았으면
               바로 나의 여가로 갑니다.
             ⚠ 섬 안(2층)에는 두지 않습니다. 거기서 나가는 길은 왼쪽 위
               「지도로」이고, 홈으로 곧장 나가는 단추를 함께 두면
               나가는 길이 둘이 되어 헷갈립니다.
             ⛔ 이 주석 안에 백틱을 쓰면 템플릿이 끊깁니다 (인수인계 2-3).
             ▸ 계획하GO! 마지막 화면 · 나의 일기 모음과 **같은 모양**입니다. -->
        <!-- ⛔ 여기 있던 「나의 여가로 돌아가기」 큰 띠는 **맨 위 줄로 올렸습니다**
               (2026-08-23). 아래에 두면 그 높이만큼 지도가 눌립니다. -->

        </div>
      </div>


      <!-- ★ '지도 표시 뜻' 만 남깁니다.
             요약 다섯 줄(나는 15가지 여가활동을 해봤어요 …)은 뺐습니다.
             표시 뜻을 알려 주는 창인데 긴 문장이 그것을 덮었고, 같은 내용이
             도장판과 모아보기에 이미 있습니다 (규칙 7 — 중복 금지).
             요약은 읽어주기로 그대로 들려줍니다. -->
      ${helpS[0] && html`<${C.Modal} title="지도 표시 뜻" onClose=${function () { helpS[1](false); }}
        speakText=${summary.join(' ')}
        style=${{ width: 'auto', maxWidth: 'min(520px, 100%)' }}
        actions=${html`<${C.Btn} kind="ok" onClick=${function () { helpS[1](false); }}>닫기<//>`}>
        <ul class="help-marks">
          ${App.DATA.mapStates.map(function (m) {
            return html`<li key=${m.id}>
              <span class="hm-art" aria-hidden="true"><${C.StateArt} state=${m} /></span>
              <span class="hm-txt"><b>${m.name}</b><span class="hm-help">${m.help}</span></span>
            </li>`;
          })}
        </ul>
        <p class="small muted" style=${{ textAlign: 'center', marginTop: '.6rem' }}>
          활동카드를 누르면 표시를 고를 수 있어요.</p>
      <//>`}

      <!-- 도장을 누르면 그때까지 해본 활동과 날짜가 나옵니다.
           문구마켓의 '참잘했어요' 도장처럼 날짜가 남는 것이 핵심입니다. -->
      <!-- ★ wide(넓은 창) 를 뺐습니다. 활동 이름 다섯 줄뿐인데 창이 화면 끝까지
             넓어서 글자와 날짜 사이가 텅 비고, 한눈에 들어오지 않았습니다.
             폭을 반으로 줄이면 발자국 · 이름 · 날짜가 한 덩어리로 보입니다. -->
      ${stampS[0] && html`<${C.Modal}
        title=${stampS[0].need + '개 도장' + (stampS[0].date ? ' · ' + App.fmtDateShort(stampS[0].date) : '')}
        speakText=${'도장을 받은 활동이에요. ' + stampS[0].group.map(function (g) { return g.name; }).join(', ')}
        onClose=${function () { stampS[1](null); }}
        style=${{ width: 'auto', maxWidth: 'min(560px, 100%)' }}
        actions=${html`<${C.Btn} kind="ok" onClick=${function () { stampS[1](null); }}>닫기<//>`}>
        <!-- ★ 왼쪽에 도장, 오른쪽에 활동 목록으로 **좌우로 나눕니다.**
               위아래로 쌓으면 도장이 목록을 아래로 밀어내서, 정작 봐야 할
               '무엇을 해봤는지' 가 한눈에 안 들어왔습니다. -->
        <div class="stamp-2col">
          <div class="stamp-left">
            <div class="stamp-big" aria-hidden="true">
              ${footImg ? html`<img src=${footImg} alt="" />`
                        : html`<span dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />`}
            </div>
            <p class="stamp-cap">이때까지<br />해본 활동이에요</p>
          </div>
          <ol class="stamp-list">
            ${stampS[0].group.map(function (g, i) {
              return html`<li key=${g.id}>
                <span class="sl-no">${(stampS[0].no - 1) * PER_STAMP + i + 1}</span>
                <span class="sl-name">${g.name}</span>
                <span class="sl-date">${g.date ? App.fmtDateShort(g.date) : ''}</span>
              </li>`;
            })}
          </ol>
        </div>
      <//>`}

      <!-- 도장 하나를 다 채운 순간의 축하 : 폭죽 + 칭찬 한 마디.
           '어떤 활동인지 보기' 를 누르면 방금 받은 도장 속 활동 목록으로 이어집니다. -->
      ${cheerS[0] && html`<${React.Fragment}>
        <${C.Fireworks} />
        <${C.Modal} title=${'축하해요! ' + cheerS[0].need + '개 도장을 받았어요'}
          speakText=${cheerS[0].need + '개를 해봤어요. 도장을 받았어요. 축하해요!'}
          onClose=${function () { cheerS[1](null); }}
          actions=${html`<${React.Fragment}>
            <${C.Btn} kind="ok" onClick=${function () {
              var got = cheerS[0]; cheerS[1](null); stampS[1](got); }}>어떤 활동인지 보기<//>
            <${C.Btn} onClick=${function () { cheerS[1](null); }}>닫기<//>
          <//>`}>
          <div class="stamp-big">
            ${footImg ? html`<img src=${footImg} alt="" />`
                      : html`<span dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />`}
          </div>
          <p class="stamp-cap">${cards.length}개 가운데 ${triedCount}개를 해봤어요</p>
        <//>
      <//>`}

      ${openCard[0] && html`<${C.MapCardPanel} card=${openCard[0]} student=${student}
        status=${statusOf(openCard[0].id)}
        onToggle=${function (k) { toggle(openCard[0].id, k); }}
        onClose=${function () { openCard[1](null); }}
        onPlan=${function () { openCard[1](null); p.nav('plan'); }} />`}
    </div>`;
  };

  /* ------------------------- 활동 상태 고르기 팝업 ------------------------- */
  C.MapCardPanel = function (p) {
    var st = p.status;
    var q = '이 활동은 나에게 어떤 여가인가요?';
    /* ★ 넓은 창을 씁니다 (2026-08-26 · 선생님 말씀 — 「안의 글자들이 한 줄로
         나열되도록 창 폭을 넓히기」). 760px 에서는 네 칸 가운데 두 개
         (「도전하고 싶어요」 · 「잘 모르겠어요」)가 두 줄로 접혀, 칸마다
         글자 줄 수가 달라 들쭉날쭉해 보였습니다.
       ⛔ 칸 수(4)를 줄여 해결하지 마세요 — 네 표시는 **늘 한 줄에 넷**이
          나란히 있어야 서로 견주어 고릅니다. */
    return html`<${C.Modal} title=${q} onClose=${p.onClose} wide=${true}
      speakText=${p.card.name + '. ' + q}
      actions=${html`<${C.Btn} kind="ok" icon="check" onClick=${p.onClose}>다 골랐어요<//>`}>
      <div class="row" style=${{ marginBottom: '.5rem' }}>
        <span style=${{ width: 56, height: 56, flex: '0 0 auto' }}><${C.ActivityArt} activity=${p.card} /></span>
        <b style=${{ fontSize: '1.25rem' }}>${p.card.name}</b>
      </div>
      <${C.PickGrid} cols=${4} label="활동 상태">
        ${App.DATA.mapStates.map(function (m) {
          return html`<${C.Pick} key=${m.id} selected=${!!st[m.id]}
            label=${m.name} speakText=${m.name}
            onClick=${function () { p.onToggle(m.id); }}
            art=${html`<${C.StateArt} state=${m} />`} />`;
        })}
      <//>
    <//>`;
  };

  /* ==================== 나의 여가 모아보기 (지도 다음 화면) ====================
     지도는 30장을 한눈에 보여 주지만, **내가 어떻게 표시했는지**는
     카드마다 눌러 봐야 알 수 있었습니다.
     그래서 `해봤어요 · 좋아해요 · 도전하고 싶어요 · 아직 잘 모르겠어요`
     네 가지를 2줄 2칸으로 두고, 누르면 그 표시를 한 활동만 모아 보여 줍니다.

     ★ 아직 아무것도 없을 때 **빈 창으로 두지 않습니다.**
       '활동을 열심히 시작해 보아요!' 처럼 다음에 할 일을 알려 줍니다.
     ★ 다 보고 나면 **일기가 아니라 홈**으로 갑니다 —
       여기는 확인하는 곳이고, 일기는 활동을 마친 뒤에 씁니다. */
  var EMPTY_WORD = {
    tried:     { line: '아직 해본 활동이 없어요.',       tip: '활동을 열심히 시작해 보아요!' },
    like:      { line: '아직 좋아하는 활동이 없어요.',   tip: '여러 가지를 해보고 마음에 드는 것을 골라 보아요!' },
    challenge: { line: '아직 도전할 활동을 안 골랐어요.', tip: '해보고 싶은 활동을 하나 골라 보아요!' },
    unsure:    { line: '아직 잘 모르겠다고 한 활동이 없어요.', tip: '해보고 나서 정해도 괜찮아요!' }
  };

  C.MyMapScreen = function (p) {
    App.useStore();
    var student = App.store.current();
    var openS = useState(null);            // 열어 본 표시 (null 이면 네 칸 화면)
    var myPageS = useState(0);          // 목록을 3장씩 나누어 봅니다
    /* ★ 넷 → **셋**입니다 (2026-08-30 · 선생님 : 「여가 모으기도 상자를 넣고
         빼고의 차이가 없는 것 같은데 3개씩 나열하고 글자와 그림을 키워줘」
         「3개 기기에서 스크롤 없이 최대한 키우기」).
       ▸ 한 줄에 셋이면 카드가 넷일 때보다 **한 장당 폭이 1/3 넓어집니다.**
         그 폭이 그대로 그림 크기가 됩니다 (카드는 정사각형이라 폭 = 높이).
       ⚠ 여기 숫자와 css 의 repeat(3, …) 는 **함께** 고쳐야 합니다.
         하나만 고치면 셋만 보이는데 칸은 넷이라 오른쪽이 비거나,
         넷이 들어오는데 칸이 셋이라 한 장이 다음 줄로 내려갑니다. */
    var MY_PER = 3;
    if (!student) return null;

    /* ★ 모아보기는 **들어온 섬 것만** 보여 줍니다.
         여가 섬(실외)에서 들어오면 실외 활동만, 실내에서 들어오면 실내만.
         섬 안에서 하던 일을 그대로 이어 보는 것이라, 갑자기 다른 섬 활동까지
         섞여 나오면 '여기가 어디지?' 가 됩니다.
       ▸ 나가는 단추도 그 섬 하나뿐입니다 (아래 backTo). */
    var island = (p.params && p.params.island) || null;   // 'in' | 'out' | null
    var area = island === 'in' ? 'indoor' : (island === 'out' ? 'outdoor' : null);
    var islandName = island === 'in' ? '여가 섬(실내)' : (island === 'out' ? '여가 섬(실외)' : null);

    var cards = App.visibleCards(student, area);
    var statusMap = App.store.mapOf(student.id);
    function statusOf(id) { return (statusMap && statusMap[id]) || {}; }

    /* 활동마다 '처음 한 날' 을 일기에서 찾아 둡니다 */
    var firstDate = (function () {
      var m = {};
      (App.store.diaries(student.id) || []).forEach(function (d) {
        var cid = d.cardId || App.cardIdOf(d.activityId);
        if (!cid) return;
        if (!m[cid] || d.date < m[cid]) m[cid] = d.date;
      });
      return m;
    })();

    function listOf(key) {
      return cards.filter(function (c) { return statusOf(c.id)[key]; })
        .map(function (c) { return { card: c, date: firstDate[c.id] || '' }; });
    }

    var open = openS[0];
    var body;

    if (!open) {
      body = html`<${React.Fragment}>
        <!-- ★ 여기도 섬 화면과 **같은 토글바** (2026-08-26 · 선생님 말씀).
               [여가 섬(실내)|여가 섬(실외)|모아보기] — 모아보기가 켜져 있고,
               섬 칸을 누르면 그 섬으로 돌아갑니다. 왼쪽 「◀ 섬으로」 알약과
               분홍 질문 바는 걷어냈습니다 — 안내는 박스 없는 글 한 줄로. -->
        <div class="map-toolrow center" style=${{ marginBottom: '.5rem' }}>
          <div class="isl-seg" role="tablist" aria-label="여가 섬 고르기">
            ${[['in', '여가 섬(실내)'], ['out', '여가 섬(실외)']].map(function (sw) {
              return html`<button key=${'sw' + sw[0]} type="button" role="tab"
                class=${'seg ' + sw[0]} aria-selected="false"
                onClick=${function () { p.nav('map', { island: sw[0] }); }}>${sw[1]}</button>`;
            })}
            <button type="button" role="tab" class="seg collect on"
              aria-selected="true">모아보기 ▶</button>
          </div>
        </div>
        <div class="mymap-say">
          내가 표시한 활동을 모아 볼까요?
          <${C.Speak}
            text=${(islandName ? islandName + '에서 ' : '') + '내가 표시한 활동을 모아 볼 수 있어요. 보고 싶은 것을 눌러 보세요.'} />
        </div>
        <!-- 네 칸을 **한 줄(4×1)** 로 (2026-08-26 · 선생님 말씀) -->
        <div class="mymap-grid row4">
          ${App.DATA.mapStates.map(function (m) {
            var n = listOf(m.id).length;
            return html`<button key=${m.id} type="button" class=${'mymap-card' + (n ? '' : ' empty')}
                onClick=${function () { openS[1](m); App.speakFor(student, m.name); }}>
              <span class="mymap-art"><${C.StateArt} state=${m} /></span>
              <span class="mymap-txt">
                <b>${m.name}</b>
                <span class="mymap-num">${n ? n + '가지' : '아직 없어요'}</span>
              </span>
            </button>`;
          })}
        </div>
      <//>`;
    } else {
      var list = listOf(open.id);
    var myPages = Math.max(1, Math.ceil(list.length / MY_PER));
    var myPage = Math.min(myPageS[0], myPages - 1);
    var shown = list.slice(myPage * MY_PER, myPage * MY_PER + MY_PER);
      var e = EMPTY_WORD[open.id] || { line: '아직 없어요.', tip: '활동을 시작해 보아요!' };
      body = html`<${React.Fragment}>
        <!-- ★ 분류 안에서도 **같은 토글바** (2026-08-26 · 선생님 말씀).
               [해봤어요|좋아해요|도전하고 싶어요|잘 모르겠어요] 네 칸 —
               지금 보는 것이 켜져 있고, 다른 칸을 누르면 바로 건너갑니다.
               「◀ 내가 표시한 활동」 알약과 분홍 질문 바는 걷어냈습니다.
               네 칸 화면으로는 맨 위 파란 화살표가 갑니다. -->
        <div class="map-toolrow center" style=${{ marginBottom: '.5rem' }}>
          <div class="isl-seg" role="tablist" aria-label="표시 고르기">
            ${App.DATA.mapStates.map(function (m) {
              var cur = open.id === m.id;
              return html`<button key=${m.id} type="button" role="tab"
                class=${'seg mark' + (cur ? ' on' : '')}
                aria-selected=${cur ? 'true' : 'false'}
                onClick=${function () {
                  if (!cur) { openS[1](m); myPageS[1](0); App.speakFor(student, m.name); }
                }}>
                <span class="seg-art" aria-hidden="true"><${C.StateArt} state=${m} /></span>
                ${m.name}</button>`;
            })}
          </div>
        </div>
        ${list.length
          ? html`<${React.Fragment}>
              <!-- ★ 긴 가로 바를 죽 늘어놓던 것을 **네모 카드 4장씩**으로
                     바꿨습니다 (선생님 제안). 바가 길면 그림과 글자가
                     한쪽에 작게 몰려서 무엇인지 알아보기 어려웠습니다.
                     카드로 만들면 그림이 크고, 몇 개인지도 한눈에 보입니다. -->
              <div class="mymap-cards">
                ${shown.map(function (x, i) {
                  return html`<div key=${x.card.id} class="mymap-item">
                    <span class="mymap-no">${myPage * MY_PER + i + 1}</span>
                    <span class="mymap-art"><${C.ActivityArt} activity=${x.card} /></span>
                    <b class="mymap-name">${x.card.name}</b>
                    <span class="mymap-date">${x.date ? App.fmtDateShort(x.date) : ''}</span>
                  </div>`;
                })}
              </div>
              ${myPages > 1 && html`<div class="wrap" style=${{ marginTop: '.7rem', justifyContent: 'center' }}>
                <${C.Btn} icon="back" disabled=${myPage === 0}
                  onClick=${function () { myPageS[1](myPage - 1); }}>앞으로<//>
                <span class="chip">${myPage + 1} / ${myPages} 쪽</span>
                <${C.Btn} icon="next" disabled=${myPage >= myPages - 1}
                  onClick=${function () { myPageS[1](myPage + 1); }}>더 보기<//>
              </div>`}
            <//>`
          : html`<div class="mymap-empty">
              <span class="mymap-empty-art"><${C.StateArt} state=${open} /></span>
              <b>${e.line}</b>
              <span>${e.tip}</span>
            </div>`}
      <//>`;
    }

    return html`<div class="app" data-corner="map">
      <!-- ★ 파란 화살표 하나로 **한 걸음씩 되짚습니다.**
             표시 하나를 열어 보고 있으면 → 네 가지 표시로
             네 가지 표시 화면이면      → 들어온 섬으로
           그래서 위쪽 알약과 아래 초록 바를 지웠습니다.
           같은 일을 하는 길이 셋이나 있었습니다 (규칙 7 — 중복 금지). -->
      <${C.TopBar} title="나의 여가 모아보기"
        onBack=${function () {
          if (openS[0]) { openS[1](null); return; }
          if (island) { p.nav('map', { island: island }); return; }
          p.nav('map');   /* 섬 없이 들어왔으면 큰 지도로 (같은 까닭으로 p.back 을 안 씁니다) */
        }}
        backLabel=${openS[0] ? '네 가지 표시로' : (islandName ? islandName + '으로' : '여가 지도로')}
        onTitle=${function () { p.nav("home"); }}>
        <${C.Speak} text=${open ? open.name + '. ' + open.help : '내가 표시한 활동을 모아 볼 수 있어요.'} />
      <//>

      <!-- 되짚는 길은 맨 위 파란 화살표와 왼쪽 알약이 맡습니다.
           ⚠ 여기에는 「나의 여가로 돌아가기」를 두지 않습니다.
             모아보기에서 나가는 길은 **다시 실내섬 · 실외섬으로** 가는 것입니다.
             홈으로 곧장 나가는 단추를 함께 두면 그 흐름이 끊깁니다.
             (여가 지도 첫 화면에는 있습니다 — 거기가 이 코너의 나가는 자리입니다) -->
      <${C.Stage} bare=${true}>
        ${body}
      <//>
    </div>`;
  };
})();
