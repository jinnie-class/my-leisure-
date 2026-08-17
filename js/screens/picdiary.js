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
    1: [
      { id: 'text',  name: '글자',        desc: '완성된 글이 칸에 모두 나와요 — 보고 읽어요' }
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
             (활동 · 함께한 사람 · 기분 · 장소) */
          : html`<div class="pd-art">
              <div class="pd-art-main">
                <${C.ActivityArt} activity=${a} size=${200} />
                <div class="pd-art-name">${a ? a.name : '한 활동'}</div>
              </div>
              <div class="pd-art-row">
                ${partner && html`<span class="pd-art-item">
                  <span class="pd-art-thumb"><${C.PartnerArt} partner=${partner} student=${student} /></span>
                  <span class="pd-art-cap">${partner.name}</span>
                </span>`}
                ${(d.moodIds || []).map(function (m) {
                  var mo = App.mood(m); if (!mo) return null;
                  return html`<span key=${m} class="pd-art-item">
                    <span class="pd-art-thumb"><${C.MoodArt} mood=${mo} /></span>
                    <span class="pd-art-cap">${mo.name}</span>
                  </span>`;
                })}
                ${d.place && html`<span class="pd-art-item">
                  <span class="pd-art-thumb">
                    <${C.PickArt} kind="place" word=${d.place} iconKey="map" />
                  </span>
                  <span class="pd-art-cap">${d.place}</span>
                </span>`}
              </div>
              <div class="pd-art-note">사진이나 내가 그린 그림을 넣으면 여기에 나와요</div>
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
    var modeBar = html`<div class="wrap" style=${{ gap: '.25rem', justifyContent: 'center' }}>
      <span class="pd-lv" title=${LEVEL_INFO[lv].sub}>
        <b>${lv}단계</b> ${LEVEL_INFO[lv].name}</span>
      ${myModes.length > 1 && html`<span class="small" style=${{ fontWeight: 900 }}>인쇄 모양</span>`}
      ${myModes.map(function (m) {
        var on = traceS[0] === m.id;
        return html`<button key=${m.id} type="button" class=${'tab' + (on ? ' on' : '')}
          style=${{ minHeight: '40px', padding: '.1rem .7rem', fontSize: '.85rem' }}
          aria-pressed=${on ? 'true' : 'false'} title=${m.desc}
          onClick=${function () { traceS[1](m.id); }}>${m.name}<//>`;
      })}
    </div>`;

    return html`<div class="app pd-app" data-corner="diary">
      <${C.TopBar} title="그림일기"
        left=${html`<${React.Fragment}>
          <${C.IconBtn} uiKey="home" icon="home" label="홈으로 가기"
            onClick=${function () { p.nav('home'); }} />
          ${d && html`<${C.Btn} size="small" icon="pencil"
            onClick=${function () { p.nav('diary', { diaryId: d.id }); }}>일기 고치기<//>`}
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
          </div>
        </div>
      </div>
    </div>`;
  };
})();
