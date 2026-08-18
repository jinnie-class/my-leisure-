/* ===========================================================
   나의 여가 — 그림일기 (A4 한 장)

   일기 하나를 A4 한 장짜리 그림일기로 보여 주고 인쇄합니다.
   - 위 : 날짜 · 이름 · 활동 · 기분
   - 가운데 : 사진 또는 학생이 그린 그림 (사진이 없으면 활동 그림)
   - 아래 : 완성된 문장을 원고지 칸에 한 글자씩 (노란 칸에서 고쳐 쓴 문장 그대로)

   '따라쓰기' 로 바꾸면 글자가 연한 회색으로 나와서, 인쇄해 그 위에 직접 써 볼 수 있습니다.

   화면에서는 종이를 축소해서 통째로 보여 주므로 스크롤이 생기지 않습니다.
   인쇄하면 A4 실제 크기로 나옵니다.
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useRef = React.useRef, useLayoutEffect = React.useLayoutEffect;

  /* A4 세로 : 210 × 297 mm. 화면에서는 px 로 그리고 비율만 맞춥니다. */
  var A4_W = 794, A4_H = 1123;      // 96dpi 기준 A4

  /* ------------------------- 원고지 칸 나누기 -------------------------
     한 칸에 한 글자. 띄어쓰기도 한 칸을 차지하고, 문단 첫 칸은 비웁니다.
     문장이 길면 칸을 늘려(글자를 줄여) 종이 한 장에 들어가게 맞춥니다. */
  var COL_OPTIONS = [10, 12, 14, 16, 20];      // 보통 그림일기는 10칸
  /* 줄 수 : 짧게 써도 서식이 비어 보이지 않게 최소 5줄,
     3단계(자유쓰기)처럼 길어질 때를 위해 최대 7줄까지 늘립니다.
     7줄을 넘으면 칸 수를 늘려(글자를 줄여) 한 장에 맞춥니다. */
  /* 원고지 줄 수.
     ★ MAX_ROWS 를 7 에서 **8** 로 올렸습니다.
       7줄에서 넘치면 다음 칸수(12칸)로 떨어져 **칸이 오히려 작아졌습니다.**
       8줄까지 허용하면 글이 길어도 10칸(칸 79px)을 지킵니다.
       8줄일 때 원고지는 8 × 79 = 632px, 그림칸은 909 − 632 = 277px 남습니다
       (그림칸 최소 180px 보다 넉넉합니다). 이보다 더 올리면 그림칸이 찌그러집니다. */
  var MIN_ROWS = 5, MAX_ROWS = 8;

  /* 칸 안 글자가 칸을 얼마나 채우는지.
     ★ 0.58 → **0.70** 으로 올렸습니다. 칸 크기(79px)는 그대로인데 글자만
       46px → 55px 로 커집니다. **그림칸을 한 픽셀도 줄이지 않고** 시원해 보입니다.
       0.75 를 넘으면 받침 있는 글자(`쌓`)가 칸 선에 닿습니다. */
  var GLYPH_FILL = 0.70;

  /* 날씨 그림은 `js/data/options.js` 의 `App.DATA.weathers` 한 곳에 모았습니다.
     기록하GO! 에서 고르는 그림과 이 종이에 찍히는 그림이 같아야 하기 때문입니다. */

  /* ============== 「나의 여가 일기」 3단계 수준별 구성 ★고정 규칙★ ==============
     단계가 올라갈수록 **글의 양**이 아니라 **학생이 스스로 하는 정도**가 늘어납니다.
       보고 쓰기  →  따라 쓰거나 스스로 쓰기  →  자유롭게 일기 쓰기

     | 단계 | 글쓰기 양식 | 글 제공 | 학생이 하는 일 |
     |------|------------|---------|----------------|
     | 1단계 | **칸**     | 완성된 글 전체 | 완성된 글을 보며 그림일기를 경험 |
     | 2단계 | **칸**     | 선택적       | 따라 쓰기 또는 스스로 쓰기 |
     | 3단계 | **줄**     | 주지 않음     | 자기 경험을 문장으로 자유롭게 |

     ⛔ 1·2단계의 칸을 줄로 바꾸거나, 3단계를 칸으로 바꾸지 마세요.
        자세한 조항은 `인수인계.md` 의 `2-2. 그림일기 3단계 구성 원칙` 에 있습니다. */
  var LEVEL_INFO = {
    1: { name: '보고 써요',                sub: '완성된 글을 보며 그림일기를 경험해요' },
    2: { name: '따라 쓰거나 스스로 써요',   sub: '보고 따라 쓰거나, 빈 칸에 직접 써요' },
    3: { name: '나의 일기를 써요',          sub: '내 경험을 문장으로 자유롭게 써요' }
  };

  /* 인쇄 모양 — **단계마다 고를 수 있는 것이 다릅니다.**
     같은 기능(t-text / t-trace / t-empty)을 쓰지만, 단계에 맞는 것만 내놓고
     이름도 그 단계의 말로 바꿉니다. */
  var MODES_BY_LEVEL = {
    /* 1단계도 **따라 쓰기**를 씁니다.
       따라쓰기는 완성된 글을 연한 글씨로 **그대로** 보여 주는 것이라,
       `1단계 = 완성된 글 전체 제공` 과 어긋나지 않습니다.
       단계 이름이 `보고 써요` 인 만큼 오히려 가장 잘 맞습니다. */
    1: [
      { id: 'text',  name: '글자',      desc: '완성된 글이 칸에 모두 나와요 — 보고 읽어요' },
      { id: 'trace', name: '따라 쓰기', desc: '연한 글씨가 칸에 나와요 — 그 위에 따라 써요' }
    ],
    2: [
      { id: 'trace', name: '따라 쓰기',   desc: '연한 글씨가 칸에 나와요 — 그 위에 따라 써요' },
      { id: 'empty', name: '스스로 쓰기', desc: '칸만 나와요 — 도움말을 보고 직접 써요' }
    ],
    3: [
      { id: 'text',  name: '내가 쓴 글',  desc: '내가 쓴 일기가 줄에 나와요' },
      { id: 'empty', name: '빈 줄',       desc: '줄만 나와요 — 생각 질문을 보고 직접 써요' }
    ]
  };

  function levelOf(d, student) {
    var lv = (d && d.level) || (student && student.diaryLevel) || 1;
    return (lv === 2 || lv === 3) ? lv : 1;
  }
  function modesFor(lv) { return MODES_BY_LEVEL[lv] || MODES_BY_LEVEL[1]; }
  function defaultModeFor(lv) { return modesFor(lv)[0].id; }

  /* ==================== 「나의 여가 일기 — 원고지 작성 규칙」 ====================
     ★ 이 규칙은 앱의 고정 규칙입니다. 원고지 화면을 고칠 때 반드시 지켜 주세요.
       자세한 조항은 `인수인계.md` 의 `5-1-1. 원고지 작성 규칙` 에 있습니다.

     ※ 절대 하지 말 것 — 글자를 한 글자씩 잘라 칸에 순서대로 넣기.
       그렇게 하면 아래 4가지가 모두 틀립니다.
         ① 문단 첫 칸 비우기        ② 자동 줄바꿈은 첫 칸부터
         ③ 줄 첫 칸에 마침표 금지    ④ 줄바꿈으로 생긴 띄어쓰기 버리기
       그래서 칸 번호·줄 번호·문단 시작 여부를 **판단하며** 놓는 함수로 만들었습니다. */

  /* 줄 첫 칸에 혼자 올 수 없는 문장부호 (원고지 '행두 금칙').
     이런 글자가 줄 첫 칸에 오게 되면 앞 줄 마지막 칸에 함께 넣습니다.
     닫는 따옴표·닫는 괄호도 포함합니다 (규칙 6). */
  var NO_LINE_START = /[.,!?…‥·:;”’'")\]}〉》」』>]/;

  /* 뒤에 문장이 이어지면 한 칸을 비우는 문장부호 (규칙 5) */
  var GAP_AFTER = /[!?]/;

  /* lines : 문단 배열. 한 칸(원소)이 한 문단입니다.
     cols  : 한 줄의 칸 수 */
  function gridRows(lines, cols) {
    var rows = [];

    (lines || []).forEach(function (para) {
      /* 문단 끝의 군더더기 공백만 떼어 냅니다 (글자는 건드리지 않습니다) */
      var chars = String(para == null ? '' : para).replace(/\s+$/, '').split('');

      /* ── 규칙 2 : 새 문단은 첫 칸을 비우고 두 번째 칸부터 ── */
      var row = [''];

      /* 줄을 끝내고 다음 줄로 (규칙 7 : 자동 줄바꿈은 다음 줄 **첫 칸부터**) */
      function nextLine() {
        while (row.length < cols) row.push('');
        rows.push(row);
        row = [];
      }

      for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        var isSpace = (ch === ' ');
        var atLineEnd = (row.length >= cols);          // 이미 꽉 찼다 = 다음은 새 줄 첫 칸

        if (atLineEnd) {
          /* ── 규칙 4 · 6 · 7 : 마침표·쉼표·닫는따옴표가 줄 첫 칸에 혼자 오면 안 됩니다.
                앞 줄 마지막 칸에 글자와 **함께** 넣습니다 ── */
          if (NO_LINE_START.test(ch)) { row[cols - 1] += ch; continue; }

          nextLine();

          /* ── 규칙 3 · 7 : 줄이 바뀌어 생긴 띄어쓰기는 버립니다.
                (새 줄 첫 칸을 띄어쓰기로 비우지 않습니다) ── */
          if (isSpace) continue;
        }

        /* 띄어쓰기가 줄의 마지막 칸에 놓이려 하면, 그 칸을 쓰지 않고 줄을 끝냅니다.
           줄바꿈 자체가 낱말을 갈라 주므로 빈 칸을 하나 낭비할 필요가 없습니다. */
        if (isSpace && row.length === cols - 1) { nextLine(); continue; }

        row.push(ch);                                   // ── 규칙 1 : 한 칸에 한 글자 ──

        /* ── 규칙 5 : ? ! 뒤에 문장이 이어지면 한 칸 비웁니다 ──
           학생이 `재미있었어?그리고` 처럼 붙여 써도 원고지에서는 띄웁니다. */
        if (GAP_AFTER.test(ch)) {
          var nx = chars[i + 1];
          if (nx && nx !== ' ' && !NO_LINE_START.test(nx) && row.length < cols) row.push('');
        }
      }

      nextLine();                                       // 문단 마지막 줄 마감
    });

    return rows;
  }

  /* ── 규칙 13 : 내놓기 전에 스스로 검사합니다 ──
     글자가 빠지거나 겹치거나 순서가 바뀌지 않았는지 확인합니다.
     띄어쓰기는 줄바꿈이 대신하기도 하므로 **공백을 뺀 글자**로 견줍니다. */
  function verifyGrid(lines, rows) {
    var want = (lines || []).join('').replace(/\s+/g, '');
    var got = rows.map(function (r) { return r.join(''); }).join('').replace(/\s+/g, '');
    if (want !== got && window.console) {
      console.warn('[원고지] 글자가 어긋났습니다.\n원문:', want, '\n원고지:', got);
    }
    return want === got;
  }
  /* 점검용으로 밖에서도 부를 수 있게 내놓습니다.
     브라우저 콘솔에서 `App.manuscriptRows(['오늘은 공원에 갔다.'], 10)` 처럼
     원고지 배치를 바로 확인할 수 있습니다. */
  App.manuscriptRows = gridRows;
  App.verifyManuscript = verifyGrid;

  /* 줄 수가 MAX_ROWS 를 넘지 않는 가장 큰 글씨(= 가장 적은 칸 수)를 고릅니다.
     모자라면 빈 줄을 채워 늘 5줄 이상 보이게 합니다. */
  function fitGrid(lines) {
    for (var i = 0; i < COL_OPTIONS.length; i++) {
      var cols = COL_OPTIONS[i];
      var rows = gridRows(lines, cols);
      if (rows.length <= MAX_ROWS || i === COL_OPTIONS.length - 1) {
        verifyGrid(lines, rows);                         // 규칙 13 : 스스로 검사
        while (rows.length < MIN_ROWS) {
          var blank = [];
          for (var c = 0; c < cols; c++) blank.push('');
          rows.push(blank);
        }
        /* ※ 넘쳐도 **줄을 자르지 않습니다.** 자르면 학생이 쓴 글이 사라집니다
           (원고지 규칙 13 — 글자 누락 금지). 가장 촘촘한 20칸에서도 넘치면
           그림칸이 최소 높이까지 줄어들며 버티고, 콘솔에 알려 줍니다. */
        if (rows.length > MAX_ROWS && window.console) {
          console.warn('[원고지] 글이 ' + rows.length + '줄이라 한 장을 넘습니다. (최대 ' + MAX_ROWS + '줄)');
        }
        return { cols: cols, rows: rows };
      }
    }
    return { cols: 20, rows: [] };
  }

  /* ------------------------- 종이 한 장 ------------------------- */
  C.PicDiarySheet = function (p) {
    var d = p.diary;
    if (!d) return null;
    var student = p.student || App.store.student(d.studentId);
    var a = App.act(d.activityId);
    var partner = App.partner(d.partnerId);
    /* 장소 그림을 **그림칸 배경**으로 깝니다 (없으면 배경 없이 그림만).
       장소가 배경이 되면 '어디에서 했는지' 가 한눈에 보이고,
       그 안에 누구와 → 활동 → 기분을 나란히 놓으면 문장 차례와 같아집니다. */
    var placeBg = d.place ? App.pickImage('place', d.place) : null;
    /* 그림칸에는 그림 한 장만 들어갑니다.
         'app'   아무것도 안 골라도 되는 기본값 — 고른 활동·사람·기분·장소를 그림으로
         'photo' 넣은 사진 (여러 장이면 mainPhotoId 로 고른 한 장)
         'draw'  직접 그린 그림
       예전 기록에는 picKind 가 없으므로 사진이 있으면 사진으로 봅니다. */
    var ids = d.photoIds || [];
    var pickId = (d.mainPhotoId && ids.indexOf(d.mainPhotoId) >= 0) ? d.mainPhotoId : ids[0];
    var kind = d.picKind || (ids.length ? 'photo' : 'app');
    var pic = null;
    if (kind === 'draw' && d.drawPhotoId) pic = App.photos.url(d.drawPhotoId);
    else if (kind === 'photo' && pickId) pic = App.photos.url(pickId);
    var lines = App.sentences.diaryShown(d).split('\n')
      .concat(d.text ? [d.text] : []).filter(function (s) { return s && s.trim(); });
    if (!lines.length) lines = [App.sentences.diaryBody(d)].filter(Boolean);

    /* ★ 고정 규칙 : 1·2단계는 **칸**, 3단계는 **줄**. 절대 바꾸지 마세요.
       3단계는 학생이 자유롭게 써서 글이 길고, 칸에 다 담기지 않습니다. */
    var lv = levelOf(d, p.student);
    var useLines = (lv === 3);
    /* 3단계가 손글씨로 쓴 일기 (없으면 null) */
    var handwriting = (lv === 3 && d.writeWay === 'hand' && d.writePhotoId)
      ? App.photos.url(d.writePhotoId) : null;
    var g = useLines ? { cols: 0, rows: [] } : fitGrid(lines);

    /* ── 그림칸에 놓을 그림들 ──────────────────────────────────────
       장소는 배경으로 깔고, 그 위에 **누구와 · 활동 · 기분** 을 놓습니다.
       처음 자리는 **아래쪽에 나란히** 입니다. 배경 그림(장소)의 위쪽을
       가리지 않아서, 어디에서 무엇을 했는지가 함께 보입니다.
       자리는 `d.artLayout` 에 **칸의 몇 % 지점인지**로 적어 둡니다.
       퍼센트로 적어 두면 종이를 크게 보든 작게 보든 같은 자리에 놓입니다. */
    var artItems = [];
    if (partner) artItems.push({ key: 'partner', label: partner.name,
      art: html`<${C.PartnerArt} partner=${partner} student=${student} />` });
    artItems.push({ key: 'act', label: a ? a.name : '한 활동',
      art: html`<${C.ActivityArt} activity=${a} />` });
    (d.moodIds || []).forEach(function (m) {
      var mo = App.mood(m); if (!mo) return;
      artItems.push({ key: 'mood:' + m, label: mo.name, art: html`<${C.MoodArt} mood=${mo} />` });
    });
    var layout = d.artLayout || {};
    function posOf(key, i) {
      var saved = layout[key];
      if (saved && typeof saved.x === 'number') return saved;
      /* 처음 자리 : 아래쪽 한 줄에 고르게 */
      return { x: (i + 0.5) / Math.max(1, artItems.length) * 100, y: 72 };
    }

    var artRef = useRef(null);
    /* 마우스(또는 손가락)로 끌어 옮기기.
       ⚠ 종이는 통째로 줄여서(transform:scale) 보여 주므로, 자리를 px 로 재면
         줄인 만큼 어긋납니다. getBoundingClientRect 로 잰 **줄어든 칸 크기**에
         대고 퍼센트로 셈해야 어디서 보든 손끝과 그림이 같이 움직입니다. */
    function startDrag(e, key) {
      var box = artRef.current; if (!box) return;
      e.preventDefault();
      var el = e.currentTarget, last = null;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      function move(ev) {
        var r = box.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var x = Math.max(9, Math.min(91, (ev.clientX - r.left) / r.width * 100));
        var y = Math.max(9, Math.min(91, (ev.clientY - r.top) / r.height * 100));
        el.style.left = x + '%'; el.style.top = y + '%';
        last = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
      }
      function up() {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        if (last && p.onMoveArt) p.onMoveArt(key, last);
      }
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    }

    var dt = App.parseKey(d.date);
    var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
    /* 단계에 없는 모양이 넘어오면 그 단계의 기본 모양으로 되돌립니다 */
    var mode = p.trace || defaultModeFor(lv);
    if (!modesFor(lv).some(function (m) { return m.id === mode; })) mode = defaultModeFor(lv);

    /* ── 생각 도움말 (빈 칸·빈 줄로 인쇄할 때만) ────────────────────
       빈 칸만 주면 학생이 막막해집니다. 그래서 **스스로 쓰는 모양일 때만**
       도움말 한 줄을 칸 바로 위에 놓습니다.
         2단계 `스스로 쓰기` → 학생이 **고른 내용**을 그대로 보여 줍니다
         3단계 `빈 줄`      → **생각 질문**을 보여 줍니다 (고른 내용을 주지 않습니다)
       글이 이미 칸에 나오는 모양(`글자`·`따라 쓰기`)에서는 도움말이 필요 없어서 안 냅니다.
       도움말이 나오면 종이 맨 아래 칩은 **감춥니다** (같은 내용이라 겹칩니다). */
    var HELP_Q = ['언제?', '누구와?', '어디에?', '무엇을?',
                  '가장 기억에 남는 것?', '어떤 기분?', '왜 그렇게 느꼈나?'];
    var hint = null;
    if (mode === 'empty') {
      if (useLines) {
        hint = html`<div class="pd-hint">
          <span class="pd-hint-lab">생각해 보아요</span>
          ${HELP_Q.map(function (q) { return html`<span key=${q} class="pd-hint-q">${q}</span>`; })}
        </div>`;
      } else {
        /* 학생이 고른 것들 — 규칙의 공통 내용 구조 ①언제 ②누구와 ③어디에서 ④무엇을 ⑤기분 */
        var picked = [];
        /* 일기에는 시간대가 없습니다. 계획에서 온 일기면 그 계획의 시간대를 가져옵니다 */
        var pl = d.planId ? App.store.plan(d.planId) : null;
        var tw = App.timeWord(pl && pl.time);
        if (tw) picked.push(tw);
        if (partner) picked.push(partner.name);
        if (a) picked.push(a.name);
        /* 장소가 활동 이름에 이미 들어 있으면 두 번 쓰지 않습니다
           (`공원 가기` + 장소 `공원` → `공원` 만 빼기) */
        if (d.place && !(a && a.name.indexOf(d.place) >= 0)) picked.push(d.place);
        (d.moodIds || []).forEach(function (m) {
          var mo = App.mood(m); if (mo) picked.push(mo.name);
        });
        if (picked.length) {
          hint = html`<div class="pd-hint">
            <span class="pd-hint-lab">무엇을 쓸까?</span>
            ${picked.map(function (w, i) { return html`<span key=${i} class="pd-hint-q">${w}</span>`; })}
          </div>`;
        }
      }
    }

    /* 보통의 그림일기 양식 :
       날짜·날씨 줄 → 일어난·잠드는 시간 줄 → 그림 칸 → 제목 줄 → (도움말) → 원고지 칸 */
    return html`<div class=${'pd-sheet t-' + mode + ' lv-' + lv}>

      <div class="pd-line pd-datebar">
        <span class="pd-date">
          <b class="pd-val">${dt.getFullYear()}</b> 년
          <b class="pd-val">${dt.getMonth() + 1}</b> 월
          <b class="pd-val">${dt.getDate()}</b> 일
          <b class="pd-val">${WEEK[dt.getDay()]}</b> 요일
        </span>
        <span class="pd-weather">날씨
          ${(App.DATA.weathers || []).map(function (w) {
            /* 학생이 고른 날씨에 **동그라미**를 쳐 줍니다.
               아직 안 골랐으면 넷 다 연하게 나와서, 인쇄한 종이에 손으로 칠 수 있습니다. */
            var on = d.weather === w.id;
            var none = !d.weather;
            return html`<span key=${w.id}
                class=${'pd-wi' + (on ? ' on' : '') + (none ? '' : (on ? '' : ' off'))}
                role="img" aria-label=${w.name + (on ? ' (고른 날씨)' : '')} title=${w.name}
                dangerouslySetInnerHTML=${{ __html: App.weatherSvg(w) }} />`;
          })}
        </span>
      </div>


      <div class="pd-draw">
        ${pic
          ? html`<div class="pd-photo"><img src=${pic} alt="사진 또는 내가 그린 그림" /></div>`
          /* 사진이나 그린 그림이 없으면 학생이 고른 것들을 그림으로 보여 줍니다.
             (활동 · 함께한 사람 · 기분 · 장소)
             ★ **그림만** 넣습니다. 이름표·안내 글은 넣지 않습니다.
               여기는 그림일기의 **그림 자리**입니다. 글은 아래 원고지에 쓰는데
               같은 말이 그림 밑에도 붙으면 종이가 글자로 빽빽해집니다.
               읽어주기와 화면 낭독(`aria-label`)으로는 그대로 전해집니다. */
          : html`<div class=${'pd-art' + (placeBg ? ' has-bg' : '') + (p.arrange ? ' arranging' : '')}
                 ref=${artRef}
                 style=${placeBg ? { backgroundImage: 'url(' + placeBg + ')' } : null}>
              <!-- ★ 짜임새 : 장소는 배경, 그 위에 누구와 · 활동 · 기분을 놓습니다.
                     처음 자리는 아래쪽에 나란히 (배경 그림을 가리지 않게).
                     일기 고치기에서 그림 재배열하기를 켜면 마우스로 끌어 옮깁니다.
                   ※ 그림만 넣습니다. 이름표·안내 글은 넣지 않습니다 —
                     여기는 그림 자리이고 글은 아래 원고지에 씁니다.
                     읽어주기와 화면 낭독(aria-label)으로는 그대로 전해집니다. -->
              ${artItems.map(function (it, i) {
                var pos = posOf(it.key, i);
                return html`<span key=${it.key} class="pd-art-item" role="img" aria-label=${it.label}
                    style=${{ left: pos.x + '%', top: pos.y + '%' }}
                    onPointerDown=${p.arrange ? function (e) { startDrag(e, it.key); } : null}>
                  <span class="pd-art-thumb">${it.art}</span>
                </span>`;
              })}
            </div>`}
      </div>

      <div class="pd-line pd-titlebar">
        <span class="pd-lab">제 목:</span>
        <span class="pd-ch">${d.title || (a ? a.name : '')}</span>
      </div>

      ${hint}

      ${useLines
        /* 3단계(자유쓰기)는 칸이 아니라 밑줄에 씁니다.
           글이 길어져도 한 장에 다 담기고, 칸에 맞춰 쓰는 부담도 없습니다.
           ★ 손글씨로 쓴 일기가 있으면 **그 손글씨를 그대로** 넣습니다.
             손글씨 판에 이미 줄이 그려져 있어서 줄공책처럼 보입니다.
             `빈 줄` 로 인쇄할 때는 손글씨를 빼고 줄만 냅니다 (종이에 쓰는 길). */
        ? (handwriting && mode !== 'empty'
            ? html`<div class="pd-lines pd-hw">
                <img src=${handwriting} alt="손으로 쓴 일기" />
              </div>`
            : html`<div class="pd-lines">
                ${lines.map(function (s, i) {
                  return html`<p key=${i} class="pd-ln pd-ch">${s}</p>`;
                })}
              </div>`)
        /* 1·2단계는 원고지 칸에 한 글자씩 */
        : html`<div class="pd-grid" style=${{ gridTemplateColumns: 'repeat(' + g.cols + ', 1fr)',
            fontSize: Math.round(790 / g.cols * GLYPH_FILL) + 'px' }}>
          ${g.rows.map(function (row, r) {
            return row.map(function (ch, c) {
              /* 한 칸에 글자+마침표가 함께 들어간 칸(원고지 규칙 4)은
                 글자를 조금 줄여야 칸 선을 넘지 않습니다 */
              var two = String(ch).length > 1;
              return html`<span key=${r + '-' + c} class="pd-box">
                <span class=${'pd-ch' + (two ? ' two' : '')}>${ch}</span></span>`;
            });
          })}
        </div>`}

      <div class="pd-foot">
        ${(d.moodIds || []).map(function (m) {
          var mo = App.mood(m); if (!mo) return null;
          return html`<span key=${m} class="pd-chip">
            <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon(mo.icon) }} />${mo.name}</span>`;
        })}
        ${partner && html`<span class="pd-chip">${partner.name}와 함께</span>`}
        ${d.place && html`<span class="pd-chip">${d.place}</span>`}
      </div>
    </div>`;
  };

  /* ------------------------- 그림일기 화면 -------------------------
     종이를 남는 자리에 맞추어 축소해서 통째로 보여 줍니다. */
  /* ------------------- 완성 미리보기 (기록하GO! 마지막 화면) -------------------
     저장하기 전에 **완성된 그림일기를 작게 그대로** 보여 줍니다.
     예전에는 노란 문장 칸만 있어서, 학생이 자기 일기가 어떻게 됐는지 모르고
     저장했습니다. 완성품은 저장 뒤 여러 창을 지나서야 나왔습니다.
     눌러서 크게 볼 수도 있습니다 — 작은 그림만으로는 글자를 읽기 어렵습니다.
     `draft` 는 아직 저장 안 된 일기지만 모양이 같아서 그대로 넣을 수 있습니다. */
  C.DiaryPreview = function (p) {
    var bigS = useState(false);
    var d = p.draft;
    if (!d || !d.activityId) return null;
    var sheet = html`<${C.PicDiarySheet} diary=${d} student=${p.student} trace="text" />`;
    /* ★ 짜임새 : **바 | 그림일기 | 바**.
         전에는 위에 `날짜·사람·장소 바꾸기`, 아래에 `눌러서 크게 보기` 가
         한 줄씩 차지해서, 그 두 줄만큼 그림일기를 작게 보여 줄 수밖에
         없었습니다. 두 줄을 양옆으로 세우면 그 높이가 통째로 그림일기 몫이
         됩니다 (0.30 → 0.46 배). */
    return html`<div class="dv-row">
      <span class="dv-side">${p.left}</span>
      <button type="button" class="dv" aria-label="완성된 그림일기 — 눌러서 크게 보기"
          onClick=${function () { bigS[1](true); }}>
        <span class="dv-paper">${sheet}</span>
      </button>
      <span class="dv-side">
        <${C.Btn} size="small" icon="expand" className="pastel-yellow"
          onClick=${function () { bigS[1](true); }}>눌러서 크게 보기<//>
      </span>
      ${bigS[0] && html`<${C.Modal} title="완성된 그림일기" wide=${true}
        onClose=${function () { bigS[1](false); }}
        actions=${html`<${C.Btn} kind="ok" onClick=${function () { bigS[1](false); }}>다 봤어요<//>`}>
        <div class="dv-big">${sheet}</div>
      <//>`}
    </div>`;
  };

  C.PicDiaryScreen = function (p) {
    App.useStore();
    var params = p.params || {};
    var d = params.diaryId ? App.store.diary(params.diaryId) : null;
    var student = d ? App.store.student(d.studentId) : App.store.current();
    var boxRef = useRef(null);
    var fit = useState(0.5);
    /* 인쇄 모양은 **단계마다 다릅니다** (위 MODES_BY_LEVEL).
       처음 열 때는 그 단계의 첫 번째 모양으로 시작합니다. */
    var lv = levelOf(d, student);
    var traceS = useState(function () { return defaultModeFor(lv); });
    /* 다른 학생(다른 단계)의 일기로 넘어가면 그 단계의 기본 모양으로 돌립니다 */
    var lvRef = useRef(lv);
    if (lvRef.current !== lv) { lvRef.current = lv; traceS[1](defaultModeFor(lv)); }

    useLayoutEffect(function () {
      function measure() {
        var el = boxRef.current; if (!el) return;
        var r = el.getBoundingClientRect();
        var s = Math.min(r.width / A4_W, r.height / A4_H);
        if (!(s > 0)) return;
        fit[1](function (prev) { return Math.abs(prev - s) < 0.002 ? prev : s; });
      }
      measure();
      var ro = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
      if (ro && boxRef.current) ro.observe(boxRef.current);
      window.addEventListener('resize', measure);
      return function () { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    var sheet = html`<${C.PicDiarySheet} diary=${d} student=${student} trace=${traceS[0]} />`;

    /* 인쇄 모양 단추는 제목·단추와 한 줄에 두면 서로 밀려 제목이 잘립니다 → 아랫줄로.
       단추는 **그 학생의 단계에 있는 것만** 나옵니다 (1단계는 하나뿐). */
    var myModes = modesFor(lv);
    var modeBar = html`<div class="pd-modebar">
      <!-- 왼쪽 끝 : 이 학생이 몇 단계인지. 늘 같은 자리에 있어야 눈에 익습니다. -->
      <span class="pd-lv" title=${LEVEL_INFO[lv].sub}>
        <b>${lv}단계</b> ${LEVEL_INFO[lv].name}</span>
      <!-- 가운데 : 눌러서 고르는 인쇄 모양 -->
      <span class="pd-modes">
        ${myModes.length > 1 && html`<span class="small" style=${{ fontWeight: 900 }}>인쇄 모양</span>`}
        ${myModes.map(function (m) {
          var on = traceS[0] === m.id;
          return html`<button key=${m.id} type="button" class=${'tab' + (on ? ' on' : '')}
            style=${{ minHeight: '40px', padding: '.1rem .7rem', fontSize: '.85rem' }}
            aria-pressed=${on ? 'true' : 'false'} title=${m.desc}
            onClick=${function () { traceS[1](m.id); }}>${m.name}<//>`;
        })}
      </span>
    </div>`;

    return html`<div class="app pd-app" data-corner="diary">
      <${C.TopBar} title="그림일기"
        onBack=${function () { p.back("home"); }}
        onTitle=${function () { p.nav("home"); }}
        left=${html`<${React.Fragment}>
          <!-- 고치는 일은 **좌우 2단 화면**에서 합니다.
               처음부터 다시 고르는 것이 아니라, 그림과 문장만 바로 고칩니다. -->
          ${d && html`<${C.Btn} size="small" icon="pencil" className="pastel-yellow"
            onClick=${function () { p.nav('fixdiary', { diaryId: d.id }); }}>일기 고치기<//>`}
        <//>`}
        below=${modeBar}>
        <${C.Speak} text=${d ? App.sentences.diaryBody(d) : '일기를 찾을 수 없어요.'} />
        <${C.WhoChip} student=${student} />
      <//>

      <div class="stage">
        <div class="panel" style=${{ alignSelf: 'stretch' }}>
          <div class="stage-fit" style=${{ display: 'flex', flexDirection: 'column' }}>
            ${d ? html`<div class="pd-fit grow" ref=${boxRef}>
              <div class="pd-scale" style=${{ width: A4_W + 'px', height: A4_H + 'px',
                  transform: 'scale(' + fit[0] + ')' }}>${sheet}</div>
            </div>` : html`<${C.Banner} icon="question">일기를 찾을 수 없어요.<//>`}
          </div>

          <div class="panel-action">
            <${C.Btn} kind="primary" icon="print"
              onClick=${function () { App.printNode(html`<div class="pd-print">${sheet}</div>`); }}>
              A4로 인쇄하기<//>
            <!-- 모아 둔 일기를 보러 가는 길은 **완성된 그림일기 옆**에 둡니다.
                 고치는 화면이 아니라 다 만든 화면에서 찾게 되는 것이라서요. -->
            <${C.Btn} icon="book" className="pastel-yellow"
              onClick=${function () { p.nav('journal', { studentId: student.id }); }}>
              나의 일기 모음 보기<//>
          </div>
        </div>
      </div>
    </div>`;
  };

  /* ==================== 일기 고치기 (좌우 2단) ====================
     ★ 왼쪽에서 고치면 **오른쪽 그림일기에 바로 보입니다.**
       예전에는 `일기 고치기` 가 기록하GO! 처음으로 되돌아가서,
       언제·누구와·무엇을 부터 다시 골라야 했습니다. 번거롭습니다.
       고칠 것은 **그림**과 **문장** 둘뿐이니 그 둘만 바로 고칩니다.

     다 고치면 A4 로 인쇄하면서 **일기 모음에 날짜별로 쌓입니다.** */
  C.FixDiaryScreen = function (p) {
    App.useStore();
    var params = p.params || {};
    var d = params.diaryId ? App.store.diary(params.diaryId) : null;
    var student = d ? App.store.student(d.studentId) : App.store.current();
    var drawS = useState(false);       // 그림판이 열려 있는지
    var madeS = useState(null);        // 방금 그린 그림 (확인 창)
    var textS = useState(false);       // 문장 고치는 칸을 펼쳤는지
    var moveS = useState(false);       // 그림 자리를 옮기는 중인지

    /* 오른쪽 그림일기를 **화면에 들어가는 만큼 가장 크게** 보여 줍니다.
       비율을 .34 처럼 못박아 두면 큰 화면에서 종이가 작게 남습니다.
       화면 크기에서 맨 위 줄·아래 단추(250px)와 왼쪽 단추 칸(420px)을 빼고 셈합니다.
       셋 가운데 가장 작은 값을 쓰므로 어느 쪽으로도 안 넘칩니다. */
    function fitScale() {
      return Math.max(0.18, Math.min(0.62,
        (window.innerHeight - 250) / A4_H,
        (window.innerWidth - 420) / A4_W));
    }
    var fxS = useState(fitScale);
    useLayoutEffect(function () {
      function onResize() {
        var s = fitScale();
        fxS[1](function (prev) { return Math.abs(prev - s) < 0.004 ? prev : s; });
      }
      onResize();
      window.addEventListener('resize', onResize);
      return function () { window.removeEventListener('resize', onResize); };
    }, []);

    if (!d) {
      return html`<div class="app" data-corner="diary">
        <${C.TopBar} title="일기 고치기"
          onBack=${function () { p.back("home"); }}
          onTitle=${function () { p.nav("home"); }} />
        <div class="stage"><div class="panel">
          <${C.Banner} icon="question">일기를 찾을 수 없어요.<//>
        </div></div>
      </div>`;
    }

    var lv = (d.level === 2 || d.level === 3) ? d.level : 1;
    /* 오른쪽에 보이는 그림일기. 그림 재배열하기를 켜면 끌어 옮길 수 있게 됩니다.
       옮긴 자리는 바로 저장해서, 인쇄할 때도 그 자리 그대로 나옵니다. */
    function moveArt(key, pos) {
      var next = {};
      var cur = d.artLayout || {};
      for (var k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) next[k] = cur[k];
      next[key] = pos;
      App.store.updateDiary(d.id, { artLayout: next });
    }
    var sheet = html`<${C.PicDiarySheet} diary=${d} student=${student} trace="text" />`;
    var editSheet = html`<${C.PicDiarySheet} diary=${d} student=${student} trace="text"
      arrange=${moveS[0]} onMoveArt=${moveArt} />`;
    /* 지금 그림일기에 보이는 문장 (고쳐 쓴 것이 있으면 그것) */
    var shown = App.sentences.diaryShown(d);

    return html`<div class="app" data-corner="diary">
      <${C.TopBar} title="일기 고치기"
        onBack=${function () { p.back("picdiary"); }}
        backLabel="그림일기로"
        onTitle=${function () { p.nav("home"); }}>
        <!-- 그림일기로 알약을 없앴습니다. 바로 왼쪽 파란 화살표가 같은 일을
             하므로, 같은 뜻의 단추가 둘이면 어느 것을 눌러야 할지 헷갈립니다.
             ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
        <${C.Speak} text=${'일기를 고쳐요. 그림을 고칠까요, 글을 고칠까요?'} />
        <${C.WhoChip} student=${student} />
      <//>

      <!-- 맨 아래 : 인쇄와 담기를 **따로** 둡니다.
             인쇄는 안 하고 모아 두기만 할 때가 있어서, 하나로 묶으면
             종이를 쓰지 않고는 모을 길이 없었습니다. -->
      <${C.Stage} action=${html`<div class="fix-acts">
        <${C.Btn} kind="primary" icon="print"
          onClick=${function () { App.printNode(html`<div class="pd-print">${sheet}</div>`); }}>
          A4 인쇄하기<//>
        <${C.Btn} kind="ok" icon="book"
          onClick=${function () {
            App.store.updateDiary(d.id, { inJournal: true, printedAt: Date.now() });
            App.ui.toast('나의 일기모음에 담았어요.');
          }}>나의 일기모음에 담기<//>
      </div>`}>

        <div class="fix-2col">
          <!-- 왼쪽 : 고치는 길 세 가지 -->
          <div class="fix-left">
            ${lv === 1 && html`<${C.Banner} tone="info" icon="people">
              <b>선생님이 도와주세요.</b>
              <div class="small">글을 고칠 때 선생님과 함께 읽어 보아요.</div>
            <//>`}

            <${C.Btn} size="big" className=${'pastel-green fix-go' + (moveS[0] ? ' on' : '')} icon="expand"
              onClick=${function () { moveS[1](!moveS[0]); }}>
              ${moveS[0] ? '자리 옮기기 끝내기' : '그림 재배열하기'}<//>

            <${C.Btn} size="big" className="pastel-red fix-go" icon="pencil"
              onClick=${function () { drawS[1](true); }}>그림 그리기 수정하기<//>

            <${C.Btn} size="big" className="pastel-blue fix-go" icon="edit"
              onClick=${function () { textS[1](!textS[0]); }}>
              ${textS[0] ? '글 고치기 닫기' : '일기 내용 수정하기'}<//>

            ${moveS[0] && html`<${C.Banner} tone="info" icon="expand"
              speakText="그림을 손가락이나 마우스로 끌어서 자리를 옮겨 보아요.">
              <b>그림을 끌어서 옮겨요.</b>
              <div class="small">오른쪽 그림일기에서 그림을 잡고 끌면 자리가 바뀌어요.</div>
              <div class="wrap" style=${{ justifyContent: 'center', marginTop: '.4rem' }}>
                <${C.Btn} size="small" onClick=${function () {
                  App.store.updateDiary(d.id, { artLayout: null });
                }}>처음 자리로 되돌리기<//>
              </div>
            <//>`}

            ${textS[0] && html`<div class="fix-text">
              <span class="lab">일기 내용</span>
              <${C.Area} rows=${5} value=${d.bodyEdit == null ? shown : d.bodyEdit}
                placeholder="여기에 고쳐 써요."
                onChange=${function (v) { App.store.updateDiary(d.id, { bodyEdit: v }); }} />
              <div class="wrap" style=${{ justifyContent: 'center' }}>
                <${C.Btn} size="small" onClick=${function () {
                  App.store.updateDiary(d.id, { bodyEdit: null });
                }}>처음 문장으로 되돌리기<//>
              </div>
            </div>`}
          </div>

          <!-- 오른쪽 : 고친 것이 바로 보이는 그림일기.
                 이름표(완성된 그림일기)를 없앴습니다. 무엇인지 보면 알고,
                 그 한 줄만큼 종이를 더 크게 보여 줄 수 있습니다. -->
          <div class="fix-right">
            <div class="fix-paper" style=${{ '--fx': fxS[0] }}>${editSheet}</div>
          </div>
        </div>
      <//>

      ${drawS[0] && html`<${C.Modal} title="그림을 고쳐 그려요" wide=${true}
        onClose=${function () { drawS[1](false); }}>
        <${C.DrawPad} startFrom=${d.drawPhotoId ? App.photos.url(d.drawPhotoId) : null}
          onCancel=${function () { drawS[1](false); }}
          onDone=${function (url) { drawS[1](false); madeS[1](url); }} />
      <//>`}

      ${madeS[0] && html`<${C.Modal} title="그림이 완성되었어요!" wide=${true}
        speakText="그림이 완성되었어요. 이 그림으로 할까요?"
        onClose=${function () { madeS[1](null); }}
        actions=${html`<${React.Fragment}>
          <${C.Btn} kind="ok" size="big" icon="check" onClick=${function () {
            App.photos.addDataUrl(madeS[0], student.id, 'draw').then(function (id) {
              var old = d.drawPhotoId;
              App.store.updateDiary(d.id, { drawPhotoId: id, picKind: 'draw' });
              if (old) App.photos.remove(old);
              madeS[1](null);
              App.ui.toast('그림을 고쳤어요.');
            })['catch'](function (err) {
              App.ui.toast(err && err.message ? err.message : '그림을 저장하지 못했어요.');
            });
          }}>이 그림으로 할래요<//>
          <${C.Btn} className="pastel-yellow" icon="pencil"
            onClick=${function () { madeS[1](null); drawS[1](true); }}>다시 그릴래요<//>
        <//>`}>
        <img src=${madeS[0]} alt="내가 그린 그림" class="made-shot" />
      <//>`}
    </div>`;
  };

  /* ==================== 나의 일기 모음 ====================
     ★ 인쇄한 그림일기가 **날짜별로 차곡차곡** 쌓이는 곳입니다.
       많이 모이면 **책으로 한 번에 인쇄**할 수 있습니다.
       (문구마켓처럼 하루하루 모여 기록장이 되는 것이 목표입니다)

     따로 저장하지 않습니다 — 일기에 이미 날짜가 있어서 그것을 그대로 씁니다.
     인쇄한 일기는 `inJournal` 로 표시해 두고, 표시가 없어도 쓴 일기는
     모두 보여 줍니다 (인쇄를 안 했다고 빼면 학생이 서운합니다). */
  C.JournalScreen = function (p) {
    App.useStore();
    var params = p.params || {};
    var student = params.studentId ? App.store.student(params.studentId) : App.store.current();
    var openS = useState(null);        // 크게 열어 본 일기
    if (!student) return null;

    /* 날짜가 이른 것부터 — 책으로 묶으면 앞에서 뒤로 넘어갑니다 */
    var list = (App.store.diaries(student.id) || []).slice().sort(function (a, b) {
      return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
    });

    function printBook() {
      if (!list.length) { App.ui.toast('아직 모인 일기가 없어요.'); return; }
      App.printNode(html`<div class="pd-book">
        ${list.map(function (x) {
          return html`<div key=${x.id} class="pd-page">
            <${C.PicDiarySheet} diary=${x} student=${student} trace="text" />
          </div>`;
        })}
      </div>`);
    }

    var open = openS[0] ? App.store.diary(openS[0]) : null;

    return html`<div class="app" data-corner="diary">
      <${C.TopBar} title="나의 일기 모음"
        onBack=${function () { p.back("home"); }}
        onTitle=${function () { p.nav("home"); }}>
        <${C.Speak} text=${list.length
          ? '지금까지 쓴 일기가 ' + list.length + '장 모였어요.'
          : '아직 모인 일기가 없어요. 여가 일기를 써 보아요.'} />
        <${C.WhoChip} student=${student} />
      <//>

      <${C.Stage}
        action=${html`<${C.Btn} kind="primary" icon="print" disabled=${!list.length}
          onClick=${printBook}>일기 모음을 책으로 인쇄하기<//>`}>
        <${C.Question} bar=${true}
          speakText=${'나의 일기 모음. 모두 ' + list.length + '장이에요.'}>
          나의 일기 모음 · ${list.length}장<//>

        ${list.length
          ? html`<div class="jr-grid">
              ${list.map(function (x, i) {
                var a = App.act(x.activityId);
                return html`<button key=${x.id} type="button" class="jr-card"
                    onClick=${function () { openS[1](x.id); }}
                    aria-label=${App.fmtDateLong(x.date) + ' ' + (a ? a.name : '')}>
                  <span class="jr-no">${i + 1}</span>
                  <span class="jr-paper"><${C.PicDiarySheet} diary=${x} student=${student} trace="text" /></span>
                  <span class="jr-date">${App.fmtDateShort(x.date)}</span>
                  <span class="jr-name">${x.title || (a ? a.name : '')}</span>
                </button>`;
              })}
            </div>`
          : html`<div class="mymap-empty">
              <span class="mymap-empty-art"><${C.Art} iconKey="book" /></span>
              <b>아직 모인 일기가 없어요.</b>
              <span>여가 일기를 쓰면 여기에 한 장씩 쌓여요!</span>
            </div>`}
      <//>

      ${open && html`<${C.Modal} wide=${true}
        title=${App.fmtDateLong(open.date)}
        onClose=${function () { openS[1](null); }}
        actions=${html`<${React.Fragment}>
          <${C.Btn} kind="primary" icon="print" onClick=${function () {
            App.printNode(html`<div class="pd-print">
              <${C.PicDiarySheet} diary=${open} student=${student} trace="text" />
            </div>`);
          }}>이 일기만 인쇄<//>
          <${C.Btn} icon="pencil" className="pastel-yellow"
            onClick=${function () { p.nav('fixdiary', { diaryId: open.id }); }}>고치기<//>
          <${C.Btn} onClick=${function () { openS[1](null); }}>닫기<//>
        <//>`}>
        <div class="jr-big"><${C.PicDiarySheet} diary=${open} student=${student} trace="text" /></div>
      <//>`}
    </div>`;
  };
})();
