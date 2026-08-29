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

  /* ★★ 그림칸이 **먼저**, 원고지가 남은 자리에 맞춥니다 ★★

     ⚠ 예전에는 거꾸로였습니다. 원고지가 `글자를 되도록 크게` 를 앞세워
       제 몫을 먼저 가져가고, 그림칸은 `flex:1` 로 **남는 자리**를 받았습니다.
       그래서 글이 길수록 그림칸이 눌렸습니다.

         이어 쓴 글  10칸 8줄 → 원고지 633px, 그림칸 320px (가로세로 2.47)
         줄바꿈한 글 14칸 7줄 → 원고지 396px, 그림칸 557px (가로세로 1.42)

       그림일기인데 **글을 어떻게 쓰느냐에 따라 그림 크기가 널뛰었고**,
       납작해진 칸에서는 장소 배경 그림의 위아래가 잘려 나갔습니다.

     ▸ 이제 그림칸을 **3:2 로 못박습니다.** 장소 그림 19장이 모두 512x341
       (=1.501) 이라, 칸을 3:2 로 두면 `background-size:cover` 로 깔아도
       **한 픽셀도 잘리지 않습니다.**
     ▸ 원고지는 남은 높이(GRID_BUDGET) 안에 들어가는 **가장 적은 칸 수**를
       고릅니다. 줄 수가 아니라 **높이**로 재야 합니다 — 칸 수가 다르면
       한 줄 높이도 달라서, 줄 수만 세면 서로 견줄 수 없습니다.

     높이 셈 (종이 1123, 테두리 위아래 2+2)
       속 높이            1123 - 4        = 1119
       날짜 줄                            =   64
       그림칸(3:2) + 여백 + 밑줄
                          770/1.501 + 22   =  535
       제목 줄                            =   52
       맨 아래 알약 줄 (.pd-foot)          =   54
       ---------------------------------------------
       원고지가 쓸 수 있는 높이            =  414
     ⚠ `.pd-foot`(신나요 · 혼자 · 학교 알약 줄)을 빠뜨렸다가 그림칸이 42px
       눌렸습니다. **종이의 모든 줄을 빠짐없이** 세어야 합니다.
     ※ 그림칸 속 너비 770 = 794 - 테두리 4 - 안쪽 여백 20 */
  var SHEET_INNER = A4_H - 4;          // 1119  (종이 속 높이)
  /* ⚠ 아래 값들은 모두 **테두리를 포함한 겉높이**입니다 (box-sizing:border-box).
       처음에 테두리를 따로 더했다가 실제와 어긋났습니다. 브라우저에서
       재어 맞춘 값입니다 — 고칠 때도 재서 맞추세요. */
  var DATE_H = 64;                     //   64  날짜·날씨 줄
  var FOOT_H = 54;                     //   54  맨 아래 알약 줄 (.pd-foot, 잰 값 51.6)
  var ART_INNER_W = A4_W - 4 - 20;     //  770  그림칸 속 너비 (테두리 4 · 여백 20 뺌)
  var ART_RATIO = 1.501;               //       장소 그림 512x341 과 **똑같은** 비율
  /* ★ 그림칸을 조금 줄여 그 자리를 **원고지에 돌려줍니다** (2026-08-23).
       칸이 커지면 칸 안 글자도 그만큼 커집니다 — 인쇄해서 손으로 쓰는 종이라
       글자 칸이 넉넉한 편이 낫습니다.
     ⚠ 더 줄이지 마세요. 장소 배경은 `object-fit:cover` 라, 줄인 만큼
       위아래가 잘립니다. 0.86 이면 눈에 띄지 않습니다. */
  var ART_SHRINK = 0.86;
  var ART_H = Math.round(ART_INNER_W / ART_RATIO * ART_SHRINK) + 20 + 2;   // 441 + 22 = 463
  /* ★ **제목 줄도 원고지 한 줄**입니다 (2026-08-23).
       예전에는 제목이 따로 놀아서 글자 크기를 손으로 맞춰야 했습니다.
       같은 격자에 넣으면 칸 크기도 글자 크기도 저절로 같아집니다.
     ▸ 그래서 여기서 TITLE_H 를 따로 빼지 않습니다. 아래 fitGrid 가
       **줄 수에 1(제목 줄)을 더해** 셈합니다. */
  var GRID_BUDGET = SHEET_INNER - DATE_H - ART_H - FOOT_H;   // 538

  /* 힌트 보기(그림칸에 뜨는 원고지)가 쓸 수 있는 속 크기.
     그림칸 속(770 × 513)에서 노란 상자의 테두리·여백과 `보고 써요` 딱지를 뺀 값입니다.
       가로 : 770 - 여백 22*2 - 테두리 3*2 = 720
       세로 : 513 - 여백 14*2 - 테두리 3*2 - 딱지 26 - 사이 8 = 445
     ⚠ css 의 `.pd-hintbig` 여백·테두리를 고치면 이 값도 같이 고쳐야 합니다. */
  var HINT_INNER_W = ART_INNER_W - 22 * 2 - 3 * 2;   // 720
  var HINT_INNER_H = Math.round(ART_INNER_W / ART_RATIO) - 14 * 2 - 3 * 2 - 26 - 8;  // 445
  /* 힌트 안의 **제목 줄**이 쓰는 높이 (2026-08-28 · 선생님 말씀 — 「제목 힌트가 없어」).
     글자 34px + 위아래 여백 + 아래 사이 = 넉넉히 48px.
     ⚠ css 의 `.pd-hintbig-title` 크기를 고치면 이 값도 같이 고치세요 —
       안 맞추면 힌트 원고지가 상자를 넘쳐 아래 줄이 잘립니다. */
  var HINT_TITLE_H = 48;

  /* 짧게 써도 서식이 비어 보이지 않게 최소 5줄.
     5줄은 10칸에서 5 x 79 = 395px 라 GRID_BUDGET(464) 안에 넉넉히 들어갑니다.
     → 글이 짧은 학생은 **가장 큰 글씨(10칸)** 를 그대로 씁니다. */
  var MIN_ROWS = 5;
  /* 20칸에서도 넘칠 만큼 글이 길면 더 줄일 수가 없습니다.
     그때는 그림칸이 조금 양보합니다 (css 의 `flex-shrink`, 최소 180px). */

  /* 칸 안 글자가 칸을 얼마나 채우는지.
     ★ 0.58 → **0.70** 으로 올렸습니다. 칸 크기(79px)는 그대로인데 글자만
       46px → 55px 로 커집니다. **그림칸을 한 픽셀도 줄이지 않고** 시원해 보입니다.
       0.75 를 넘으면 받침 있는 글자(`쌓`)가 칸 선에 닿습니다. */
  var GLYPH_FILL = 0.70;

  /* 날씨 그림은 `js/data/options.js` 의 `App.DATA.weathers` 한 곳에 모았습니다.
     기록하GO! 에서 고르는 그림과 이 종이에 찍히는 그림이 같아야 하기 때문입니다. */

  /* ============== 「나의 여가 일기」 3단계 수준별 구성 ★고정 규칙★ ==============
     단계가 올라갈수록 **글의 양**이 아니라 **학생이 스스로 하는 정도**가 늘어납니다.
       보고 쓰기  →  따라 쓰거나 힌트 보고 쓰기  →  자유롭게 일기 쓰기

     | 단계 | 글쓰기 양식 | 글 제공 | 학생이 하는 일 |
     |------|------------|---------|----------------|
     | 1단계 | **칸**     | 완성된 글 전체 | 완성된 글을 보며 그림일기를 경험 |
     | 2단계 | **칸**     | 선택적       | 따라 쓰기 또는 힌트 보고 쓰기 |
     | 3단계 | **줄**     | 주지 않음     | 자기 경험을 문장으로 자유롭게 |

     ⛔ 1·2단계의 칸을 줄로 바꾸거나, 3단계를 칸으로 바꾸지 마세요.
        자세한 조항은 `인수인계.md` 의 `2-2. 그림일기 3단계 구성 원칙` 에 있습니다. */
  var LEVEL_INFO = {
    1: { name: '보고 따라 써요',           sub: '완성된 글을 보며 그림일기를 경험해요' },
    2: { name: '따라 쓰거나 보고 써요',   sub: '보고 따라 쓰거나, 힌트를 보고 빈 칸에 써요' },
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
      /* ⚠ `스스로 쓰기` 였습니다. 실제로는 **힌트를 보고** 쓰는 것이라
         이름과 하는 일이 달랐습니다. 힌트 보기 단추도 이 모양에서만 나옵니다. */
      { id: 'empty', name: '힌트 보고 쓰기', desc: '칸만 나와요 — 힌트를 보고 써요' }
    ],
    3: [
      { id: 'text',  name: '내가 쓴 글',  desc: '내가 쓴 일기가 줄에 나와요' },
      { id: 'empty', name: '빈 줄',       desc: '줄만 나와요 — 생각 질문을 보고 직접 써요' }
    ]
  };

  /* 종이 위에 바로 쓸 때 쓰는 펜 (2026-08-26).
     ⛔ 그림판(C.DrawPad)의 색·굵기와 **같은 값**으로 둡니다 — 두 곳에서 쓴
        글씨의 굵기가 다르면 한 장 안에서 어긋나 보입니다. */
  var PEN_COLORS = ['#2f2f38', '#d23b3b', '#e08b28', '#e5c126', '#2e9e5b', '#2b7de9', '#8b5cf6', '#8a5a2b'];
  var PEN_SIZES = [{ name: '가늘게', v: 4 }, { name: '보통', v: 8 }, { name: '굵게', v: 14 }];

  function levelOf(d, student) {
    var lv = (d && d.level) || (student && student.diaryLevel) || 1;
    return (lv === 2 || lv === 3) ? lv : 1;
  }
  function modesFor(lv) { return MODES_BY_LEVEL[lv] || MODES_BY_LEVEL[1]; }
  function defaultModeFor(lv) { return modesFor(lv)[0].id; }
  /* 다른 화면(포트폴리오의 일기장 모아 인쇄)도 **같은 목록**을 씁니다.
     ⛔ 인쇄 모양을 그쪽에 따로 적지 마세요 — 단계마다 고를 수 있는 것이
        다른데 둘로 나뉘면 언젠가 어긋납니다. 여기 한 곳에서만 정합니다. */
  App.diaryPrintModes = modesFor;

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

  /* ── 3단계 밑줄 : 줄 간격과 글자 크기 고르기 ────────────────────────
     ★ 예전에는 줄 간격 46px · 글자 22px 로 **못박아** 두고 7줄을 그렸습니다.
       줄이 많고 글자가 작아서, 자유롭게 쓴 일기가 빽빽해 보였습니다.
       또 줄무늬를 13px 위로 올려 두어 글자가 줄에 **붙어** 있었습니다.
     ▸ 이제 **기본 5줄**로 시원하게 두고, 글이 길면 원고지(fitGrid)처럼
       한 단계씩 작게 내려가며 한 장에 맞춥니다.
     ▸ 글자는 줄 사이 **가운데**에 놓입니다 (줄무늬를 올리지 않습니다).
     cpl = 한 줄에 들어가는 글자 수 (종이 안쪽 762px ÷ 글자 크기) */
  /* ★ **한 장 안에서 글자 크기를 들쭉날쭉하게 두지 않습니다**
       (2026-08-24 · 선생님 말씀 — 「보통 같은 크기로 쓰지 이렇게 들쑥날쑥하지
       않지?」). 종이 위 글자는 **제목 · 본문 · 날짜가 모두 34px 언저리**입니다.
     ⚠ 잠깐 46px 까지 키워 보았는데, 본문만 유난히 커서 제목·날짜와 어긋나고
       왼쪽 「완성된 일기」 칸보다도 커 보였습니다. 34px 로 되돌립니다. */
  var LINE_SIZES = [
    { fs: 34, lh: 82 }, { fs: 30, lh: 74 }, { fs: 26, lh: 66 },
    { fs: 22, lh: 58 }, { fs: 19, lh: 52 }
  ];
  /* 짧게 써도 이만큼은 줄이 보입니다.
     ⛔ 5로 두면 **큰 글자가 아예 못 뽑힙니다.** 짧은 글에도 5줄을 강제하니
        46px(5×106=530) · 40px(470) 이 모두 자리(459px)를 넘어 탈락했습니다.
        4로 낮추니 46px 이 424px 로 들어옵니다 — 재어서 정한 값입니다. */
  var LINE_MIN_ROWS = 4;
  /* 3단계(밑줄)도 원고지와 **같은 높이**를 씁니다.
     그래야 1·2단계와 3단계의 그림칸이 같아집니다 — 단계가 달라도 같은 서식입니다.
     ⚠ 640(옛 8줄 x 79px) 그대로 두면 3단계만 그림칸이 176px 작아집니다. */
  /* 3단계도 제목이 **원고지 한 줄**을 씁니다 (1·2단계와 같은 모습).
     제목 칸은 10칸으로 두므로 그 높이(790/10 = 79px)를 미리 빼 둡니다. */
  var TITLE_COLS_LINE = 10;
  var TITLE_ROW_H = Math.round((A4_W - 4) / TITLE_COLS_LINE);   // 79
  var LINE_BUDGET = GRID_BUDGET - TITLE_ROW_H;

  function fitLines(lines) {
    for (var i = 0; i < LINE_SIZES.length; i++) {
      var s = LINE_SIZES[i];
      var cpl = Math.max(8, Math.floor(762 / s.fs));
      var rows = 0;
      (lines || []).forEach(function (t) {
        rows += Math.max(1, Math.ceil((String(t || '').length + 1) / cpl));
      });
      rows = Math.max(LINE_MIN_ROWS, rows);
      if (rows * s.lh <= LINE_BUDGET || i === LINE_SIZES.length - 1) {
        return { fs: s.fs, lh: s.lh, rows: rows };
      }
    }
  }

  /* 한 칸의 크기 (칸은 정사각형이라 높이 = 너비).
     원고지는 종이 속 너비(790)를 칸 수로 나눠 씁니다. */
  function cellSize(cols) { return (A4_W - 4) / cols; }

  /* 원고지가 GRID_BUDGET 안에 들어가는 **가장 적은 칸 수**(= 가장 큰 글씨)를 고릅니다.
     ⚠ 줄 수로 재면 안 됩니다. 칸 수가 다르면 한 줄 높이도 달라서
       `8줄` 이 10칸에서는 632px, 14칸에서는 451px 입니다 — 서로 견줄 수 없습니다.
       **높이(줄 수 x 칸 크기)** 로 재야 그림칸을 지킬 수 있습니다.
     모자라면 빈 줄을 채워 늘 5줄 이상 보이게 합니다. */
  function fitGrid(lines) {
    for (var i = 0; i < COL_OPTIONS.length; i++) {
      var cols = COL_OPTIONS[i];
      var rows = gridRows(lines, cols);
      /* +1 은 **제목 줄** 입니다 — 제목도 원고지 한 줄을 씁니다 */
      var need = (Math.max(rows.length, MIN_ROWS) + 1) * cellSize(cols);
      if (need <= GRID_BUDGET || i === COL_OPTIONS.length - 1) {
        verifyGrid(lines, rows);                         // 규칙 13 : 스스로 검사
        while (rows.length < MIN_ROWS) {
          var blank = [];
          for (var c = 0; c < cols; c++) blank.push('');
          rows.push(blank);
        }
        /* ※ 넘쳐도 **줄을 자르지 않습니다.** 자르면 학생이 쓴 글이 사라집니다
           (원고지 규칙 13 — 글자 누락 금지). 가장 촘촘한 20칸에서도 넘치면
           그림칸이 최소 높이까지 줄어들며 버티고, 콘솔에 알려 줍니다. */
        if (need > GRID_BUDGET && window.console) {
          console.warn('[원고지] 글이 길어 원고지가 ' + Math.round(need) + 'px 입니다. '
            + '(그림칸을 지키려면 ' + GRID_BUDGET + 'px 안이어야 합니다 — 그림칸이 그만큼 줄어듭니다)');
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
    /* 원고지에 놓을 **문단** 배열입니다. 한 칸(원소)이 한 문단입니다.
       ★ 저절로 만들어진 문장은 한 칸 띄워 죽 이어지므로 보통 **한 문단**입니다.
         학생이 노란 칸에서 손수 줄을 바꾸었을 때만 문단이 여럿이 됩니다.
       ▸ d.text(더 쓴 글)도 새 문단으로 떼지 않고 **마지막 문단에 이어 붙입니다.**
         떼어 놓으면 그것만 첫 칸이 비어서, 학생 눈에는 까닭 없이 들여쓴
         한 줄이 됩니다. */
    var lines = App.sentences.diaryShown(d).split('\n')
      .map(function (s) { return String(s || '').trim(); })
      .filter(function (s) { return s; });
    if (d.text && String(d.text).trim()) {
      var extra = String(d.text).trim();
      if (lines.length) lines[lines.length - 1] += ' ' + extra;
      else lines = [extra];
    }
    if (!lines.length) lines = [App.sentences.diaryBody(d)].filter(Boolean);

    /* ★ 고정 규칙 : 1·2단계는 **칸**, 3단계는 **줄**. 절대 바꾸지 마세요.
       3단계는 학생이 자유롭게 써서 글이 길고, 칸에 다 담기지 않습니다. */
    var lv = levelOf(d, p.student);
    var useLines = (lv === 3);
    /* 3단계가 손글씨로 쓴 일기 (없으면 null) */
    var handwriting = (lv === 3 && d.writeWay === 'hand' && d.writePhotoId)
      ? App.photos.url(d.writePhotoId) : null;
    var g = useLines ? { cols: 0, rows: [] } : fitGrid(lines);
    /* 3단계 밑줄의 줄 간격·글자 크기 (글이 길면 한 단계씩 작아집니다) */
    var lineFit = useLines ? fitLines(lines) : null;

    /* ── 종이 위에 바로 쓴 글씨 (2026-08-26) ───────────────────────
       writeInk : 저장해 둔 **투명한 글씨 한 겹**. 화면·인쇄·일기 모음·
                  포트폴리오 어디에서 종이를 그리든 늘 함께 나옵니다.
       writing  : 지금 쓰는 중일 때만 그림판 칸을 얹습니다 (그림일기 화면에서만).
       gridPx   : 원고지 칸 전체의 **종이 좌표 크기**. 칸은 정사각형이라
                  높이 = 줄 수 x 한 칸 크기입니다. 그림판 칸을 이 크기로
                  잡아야 글씨가 칸과 어긋나지 않습니다.
       ⛔ 여기 숫자를 눈대중으로 바꾸지 마세요 — cellSize 와 같은 셈이라야
          화면에서 쓴 자리와 인쇄된 자리가 맞습니다. */
    var writeInk = (!useLines && d.writeInkId) ? App.photos.url(d.writeInkId) : null;
    var writing = !!p.writing && !useLines;
    var padRef = p.padRef;
    var gridPx = { w: Math.round(A4_W - 4),
                   h: Math.round((g.rows.length || 1) * cellSize(g.cols || 10)) };
    /* ★★ 제목은 **짧으면 칸, 길면 줄글**입니다 (2026-08-26 · 선생님 말씀).
       ▸ 짧은 제목은 원고지 칸에 넣습니다. 그러면 제목 글자와 본문 칸 글자가
         **정확히 같은 크기**가 되어, 한 장 안에서 크기가 어긋나 보이지 않습니다.
       ▸ 긴 제목은 칸 없이 한 줄로 씁니다. 칸에 넣으면 앞 두 칸을 「제목」 딱지가
         쓰고 남은 `칸수-2` 개만 글자를 받아서 **뒤가 잘려 사라집니다**
         (「가족, 친구와 함께 보드게임」 → 열 칸이면 여덟 글자에서 끊김.
          원고지 규칙 13 — 글자 누락 금지).
       ⛔ 3단계(밑줄)에는 본문 칸이 없으므로 늘 줄글입니다.
       ⛔ 줄 높이는 어느 쪽이든 그 단계의 **원고지 한 줄과 똑같아야** 합니다.
          다르면 fitGrid 의 `+1`(제목 줄) 셈이 어긋나 종이가 한 장을 넘습니다. */
    var titleRowH = useLines ? TITLE_ROW_H : Math.round((A4_W - 4) / g.cols);
    /* ⛔ 제목 글자는 **본문과 같은 크기**입니다 (2026-08-24 · 선생님 말씀 —
         「제목과 내용 글자 크기 동일」). 1·2단계는 원고지 칸 글자,
         3단계는 밑줄 글자를 따라갑니다. */
    var titleFs = useLines
      ? lineFit.fs
      : Math.round((A4_W - 4) / g.cols * GLYPH_FILL);
    /* 제목이 길면 **줄 안에서 글자를 줄여** 다 담습니다.
       ⛔ 「…」로 잘라 내지 않습니다 — 잘라 내면 칸에서 잘리던 것과 똑같습니다.
       ▸ 쓸 수 있는 폭 700 = 종이 속 790 - 「제목」 딱지·여백 90 (재어 맞춘 값).
         한글 한 글자는 대략 글자 크기만큼 폭을 씁니다.
       ▸ 18px 아래로는 안 줄입니다. 그보다 긴 제목은 학생이 읽기 어렵습니다. */
    var titleText = String(d.title || (a ? a.name : '') || '');
    /* ⛔ 700 → **636** (2026-08-28). 제목 줄에 자간 `.1em` 을 주었기 때문입니다
         (css 의 `.pd-titletext`). 한 글자가 이제 1em 이 아니라 **1.1em** 을
         쓰므로, 쓸 수 있는 폭을 1.1 로 나눠 두어야 합니다 (700 / 1.1 ≒ 636).
       ⚠ 자간을 고치면 **이 숫자도 같이** 고치세요. 안 고치면 긴 제목의
         뒤가 「…」로 잘립니다 (원고지 규칙 13 — 글자 누락 금지). */
    var titleFsFit = titleText.length
      ? Math.max(18, Math.min(titleFs, Math.floor(636 / titleText.length)))
      : titleFs;
    /* ★ 가르는 자리 — 「제목」 딱지가 앞 두 칸을 쓰므로 **칸수-2** 글자까지만
         칸에 담깁니다. 한 글자라도 넘치면 줄글로 갑니다 (잘리지 않게).
       ⛔ 여기 숫자를 늘리지 마세요 — 딱지가 두 칸이라는 사실에서 나온 값입니다
          (css 의 `.pd-box.pd-titlelab{grid-column:span 2}`). */
    var titleCells = Math.max(0, (g.cols || 0) - 2);
    var titleFits = !useLines && titleText.length > 0 && titleText.length <= titleCells;
    /* 힌트 보기에 쓸 문장 — 학생이 아래 빈 칸에 보고 쓸 내용입니다 */
    var hintLines = lines;

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
      /* 처음 자리 : 아래쪽 한 줄에 고르게, 크기는 1배 */
      var base = { x: (i + 0.5) / Math.max(1, artItems.length) * 100, y: 72, s: 1 };
      var saved = layout[key] || {};
      /* ⚠ 적어 둔 것만 하나씩 덮어씁니다.
           예전에는 `자리(x)가 적혀 있을 때만` 적어 둔 값을 썼습니다. 그래서
           **옮기지 않고 크기만 바꾸면** 크기까지 버려져서, 저장은 되는데
           화면에는 안 나왔습니다. */
      return {
        x: typeof saved.x === 'number' ? saved.x : base.x,
        y: typeof saved.y === 'number' ? saved.y : base.y,
        s: typeof saved.s === 'number' ? saved.s : base.s
      };
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
        last = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10,
                 s: (layout[key] && layout[key].s) || 1 };
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
    /* ⛔⛔ **모양을 「그 일기의 단계」로 다시 걸러내지 않습니다** (2026-08-28).
         예전에는 `modesFor(lv)` 에 없는 모양이면 그 단계의 기본값으로
         되돌렸습니다. 그런데 일기 모음을 **책으로** 뽑을 때 탈이 났습니다 :

           학생은 지금 2단계 → 단추는 「따라 쓰기 · 힌트 보고 쓰기」
           그런데 지난 일기는 level 1 로 저장돼 있음
           → 1단계에 `empty` 가 없으니 **말없이 `text` 로 바뀌어** 인쇄됨
              (고른 것과 정반대로, 글이 다 채워진 종이가 나왔습니다)

       ▸ **무엇을 내놓을지는 화면이 정하고**(단계별 단추 — modesFor),
         **종이는 시킨 대로 그립니다.** 세 모양은 어느 단계에서나 그릴 수
         있습니다 (칸이든 줄이든 `t-text·t-trace·t-empty` 규칙이 다 있습니다).
       ⚠ 아는 모양이 아닐 때만 그 단계의 기본값으로 되돌립니다 (안전장치). */
    var mode = p.trace || defaultModeFor(lv);
    if (['text', 'trace', 'empty'].indexOf(mode) < 0) mode = defaultModeFor(lv);
    /* ★ 원고지에 **손으로 따라 쓴 것** (1·2단계). 있으면 칸 대신 이것을 넣습니다.
       ⛔ `글자` 로 낼 때에만 씁니다. 따라 쓰기 · 힌트 · 빈 칸으로 인쇄할 때는
          학생이 **새로 쓸 자리**를 내주어야 하므로 원래 칸을 그립니다.
       ⛔ `mode` 가 정해진 **뒤에** 셈해야 합니다. 위쪽에 두었더니 mode 가 아직
          undefined 라, 따라쓰기 판으로 인쇄해도 손글씨가 나왔습니다. */
    var paperwriting = (!useLines && d.paperPhotoId && mode === 'text')
      ? App.photos.url(d.paperPhotoId) : null;

    /* ── 생각 도움말 (빈 칸·빈 줄로 인쇄할 때만) ────────────────────
       빈 칸만 주면 학생이 막막해집니다. 그래서 **스스로 쓰는 모양일 때만**
       도움말 한 줄을 칸 바로 위에 놓습니다.
         2단계 `힌트 보고 쓰기` → 학생이 **고른 내용**을 그대로 보여 줍니다
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
        ${(p.showHint && mode === 'empty' && hintLines.length)
          /* ★ 힌트 보고 쓰기(빈 칸·빈 줄)에서 **힌트 보기**를 켜면, 그림 자리에
               완성된 문장이 크게 나타납니다. 학생은 그것을 보고 아래 빈 칸에
               따라 씁니다. 혼자 쓰기 어려운 학생이 막히지 않게 하는 길입니다.
             ▸ 인쇄해도 그대로 나오므로, 종이에 쓸 때에도 보고 쓸 수 있습니다.
             ▸ 힌트를 끄면 다시 그림이 나옵니다. */
          ? html`<div class="pd-hintbig">
              <span class="pd-hintbig-lab">보고 써요</span>
              <!-- ★ **제목도 힌트에 넣습니다** (2026-08-28 · 선생님 말씀 —
                     「제목 힌트가 없어」). 아래 종이에는 제목 칸이 비어 있는데
                     힌트에는 본문만 있어서, 학생이 **제목에 무엇을 쓸지 알
                     길이 없었습니다.** 보고 쓰기는 볼 것이 다 있어야 합니다.
                   ▸ 아래 종이의 제목 줄과 **같은 차림**(제목 딱지 + 글)입니다.
                   ⛔ 이 줄이 자리를 먹으므로, 아래 칸 크기를 셈할 때
                     그 높이(HINT_TITLE_H)를 **빼야** 합니다. -->
              ${titleText && html`<div class="pd-hintbig-title">
                <span class="pd-hintbig-titlelab">제목</span>
                <span class="pd-hintbig-titletext">${titleText}</span>
              </div>`}
              ${useLines
                /* 3단계는 밑줄에 쓰므로 원고지가 없습니다 — 문장 그대로 보여 줍니다 */
                ? hintLines.map(function (s, i) {
                    return html`<p key=${i} class="pd-hintbig-ln">${s}</p>`;
                  })
                /* ★ 1·2단계는 **아래 원고지와 똑같은 칸 모양**으로 보여 줍니다.
                     글자만 줄글로 보여 주면 학생이 「어느 칸에 무엇을 쓰는지」를
                     스스로 옮겨 놓아야 합니다. 띄어쓰기 한 칸, 문장부호가 들어갈
                     칸까지 **눈으로 그대로 베낄 수 있어야** 보고 쓰기가 됩니다.
                   ▸ 칸 수(g.cols)와 줄(g.rows)은 아래 원고지와 **같은 것을 씁니다.**
                     따로 계산하면 언젠가 둘이 어긋납니다. */
                : (function () {
                    var rows = g.rows.filter(function (r) {
                      return r.some(function (ch) { return String(ch).trim() !== ''; });
                    });
                    if (!rows.length) rows = g.rows.slice(0, 1);
                    /* 힌트 상자 속에 들어갈 칸 한 변 — 폭과 높이 가운데 작은 쪽에 맞춥니다.
                       ⛔ 제목 줄이 있으면 그 높이를 **빼고** 셈해야 합니다.
                          안 빼면 힌트가 상자를 넘쳐 아래 줄이 잘립니다. */
                    var 남는높이 = HINT_INNER_H - (titleText ? HINT_TITLE_H : 0);
                    var cell = Math.min(HINT_INNER_W / g.cols, 남는높이 / rows.length);
                    return html`<div class="pd-hintgrid"
                      style=${{ gridTemplateColumns: 'repeat(' + g.cols + ', ' + cell + 'px)',
                                fontSize: Math.round(cell * GLYPH_FILL) + 'px' }}>
                      ${rows.map(function (row, r) {
                        return row.map(function (ch, c) {
                          var two = String(ch).length > 1;
                          return html`<span key=${r + '-' + c} class="pd-hintbox"
                            style=${{ height: cell + 'px' }}>
                            <span class=${'pd-ch' + (two ? ' two' : '')}>${ch}</span></span>`;
                        });
                      })}
                    </div>`;
                  })()}
            </div>`
          : pic
          ? html`<div class="pd-photo"><img src=${pic} alt="사진 또는 내가 그린 그림" /></div>`
          /* 사진이나 그린 그림이 없으면 학생이 고른 것들을 그림으로 보여 줍니다.
             (활동 · 함께한 사람 · 기분 · 장소)
             ★ **그림만** 넣습니다. 이름표·안내 글은 넣지 않습니다.
               여기는 그림일기의 **그림 자리**입니다. 글은 아래 원고지에 쓰는데
               같은 말이 그림 밑에도 붙으면 종이가 글자로 빽빽해집니다.
               읽어주기와 화면 낭독(`aria-label`)으로는 그대로 전해집니다. */
          : html`<div class=${'pd-art' + (placeBg ? ' has-bg' : '') + (p.arrange ? ' arranging' : '')}
                 ref=${artRef}>
              <!-- ★ 장소 배경은 **진짜 그림(img)** 으로 넣습니다 (2026-08-22).
                     예전에는 css 의 background-image 였습니다. 화면에서는 잘
                     보였지만 **인쇄하면 장소가 통째로 빠졌습니다.**
                     브라우저 인쇄에서 「배경 그래픽」 은 기본이 꺼짐이라
                     css 배경은 안 나오고, img 만 나옵니다.
                     (print.css 의 print-color-adjust 로도 막지 못했습니다)
                   ⛔ 다시 css 배경으로 되돌리지 마세요. 그림일기는 **인쇄해서
                     쓰는 종이**라, 화면에만 보이는 것은 없는 것과 같습니다. -->
              ${placeBg && html`<img class="pd-art-bg" src=${placeBg} alt="" />`}
              <!-- ★ 짜임새 : 장소는 배경, 그 위에 누구와 · 활동 · 기분을 놓습니다.
                     처음 자리는 아래쪽에 나란히 (배경 그림을 가리지 않게).
                     일기 고치기에서 그림 재배열하기를 켜면 마우스로 끌어 옮깁니다.
                   ※ 그림만 넣습니다. 이름표·안내 글은 넣지 않습니다 —
                     여기는 그림 자리이고 글은 아래 원고지에 씁니다.
                     읽어주기와 화면 낭독(aria-label)으로는 그대로 전해집니다. -->
              ${artItems.map(function (it, i) {
                var pos = posOf(it.key, i);
                var on = p.arrange && p.picked === it.key;
                return html`<span key=${it.key} class=${'pd-art-item' + (on ? ' picked' : '')}
                    role="img" aria-label=${it.label}
                    style=${{ left: pos.x + '%', top: pos.y + '%',
                              transform: 'translate(-50%,-50%) scale(' + pos.s + ')' }}
                    onPointerDown=${p.arrange ? function (e) {
                      if (p.onPickArt) p.onPickArt(it.key);
                      startDrag(e, it.key);
                    } : null}>
                  <span class="pd-art-thumb">${it.art}</span>
                </span>`;
              })}
            </div>`}
      </div>

      <!-- ★ 제목 = **칸 없는 한 줄** (세 단계 모두 · 2026-08-26).
             글자 크기는 본문과 같고, 높이는 그 단계의 원고지 한 줄과 같습니다.
             까닭과 ⛔ 는 위 titleRowH 를 정하는 곳에 적어 두었습니다.
           ⛔ 이 주석은 html 안입니다. 여는 것과 닫는 것을 **짝 맞춰** 쓰세요.
             js 주석 닫기(별표+빗금)로 닫으면 주석이 안 닫혀서 뒤 마크업이
             통째로 먹히고 화면이 아예 안 뜹니다. 백틱도 쓰지 마세요. -->
      ${titleFits
        ? html`<div class="pd-grid pd-titlegrid"
             style=${{ gridTemplateColumns: 'repeat(' + g.cols + ', 1fr)',
                       fontSize: titleFs + 'px' }}>
            <span class="pd-box pd-titlelab">제목</span>
            ${(function () {
              var cells = [];
              for (var i = 0; i < titleCells; i++) cells.push(titleText.charAt(i) || '');
              return cells.map(function (ch, i) {
                return html`<span key=${i} class="pd-box"><span class="pd-ch">${ch}</span></span>`;
              });
            })()}
          </div>`
        : html`<div class="pd-titleline"
             style=${{ fontSize: titleFsFit + 'px', height: titleRowH + 'px' }}>
            <span class="pd-titlelab-line">제목</span>
            <span class="pd-titletext">${titleText}</span>
          </div>`}

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
            : html`<div class="pd-lines"
                 style=${{ '--lh': lineFit.lh + 'px', '--rows': lineFit.rows,
                           '--fs': lineFit.fs + 'px' }}>
                <!-- ⛔⛔ 줄은 **진짜 선 하나하나**로 그립니다 (2026-08-28 ·
                       선생님 말씀 — 「밑줄의 칸줄의 굵기가 달라. 수정」).
                       예전에는 배경 무늬(repeating-linear-gradient)로 그렸는데,
                       인쇄는 화면보다 촘촘해서 3px 짜리 줄이 **어떤 줄은 2px,
                       어떤 줄은 3px** 로 반올림됐습니다. 줄마다 굵기가 달랐습니다.
                     ▸ 선을 요소로 두면 브라우저가 **줄마다 같은 값**으로
                       그려서 굵기가 고릅니다 (학습지의 ws-lines 와 같은 방식).
                     ⛔ 배경 무늬로 되돌리지 마세요.
                     ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
                <span class="pd-rules" aria-hidden="true">
                  ${(function () {
                    var out = [];
                    for (var r = 0; r < lineFit.rows; r++) out.push(html`<i key=${r}></i>`);
                    return out;
                  })()}
                </span>
                ${lines.map(function (s, i) {
                  return html`<p key=${i} class="pd-ln pd-ch">${s}</p>`;
                })}
              </div>`)
        /* 1·2단계는 원고지 칸에 한 글자씩.
           ★ 손으로 따라 쓴 원고지가 있으면 **그것을 그대로** 넣습니다. */
        : paperwriting
        ? html`<div class="pd-paperimg"><img src=${paperwriting} alt="손으로 쓴 원고지" /></div>`
        /* ★★ 원고지 칸 + 그 **위에 겹치는 손글씨** (2026-08-26 · 선생님 말씀 —
                「이 화면에 그대로 위에 쓸 수 있게」).
              예전에는 「원고지에 손으로 쓰기」가 팝업 그림판을 열었습니다.
              선생님이 바라신 것은 팝업이 아니라 **보고 있는 이 종이 위에**
              그대로 쓰는 것이었습니다.
            ▸ 칸은 그대로 두고 글씨만 **투명한 한 겹**으로 얹습니다. 그래서
              인쇄해도 칸은 또렷한 선 그대로고 글씨만 위에 앉습니다.
            ⛔ 글씨를 칸과 **한 장으로 합쳐 저장하지 마세요** — 칸이 그림이
               되어 인쇄가 흐려지고, 글자 크기를 바꾸면 칸과 어긋납니다. */
        : html`<div class="pd-writewrap">
          <div class="pd-grid" style=${{ gridTemplateColumns: 'repeat(' + g.cols + ', 1fr)',
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
          </div>
          ${writeInk && !writing && html`<img class="pd-writeink" src=${writeInk} alt="손으로 쓴 글씨" />`}
          ${writing && html`<canvas class="pd-writepad" ref=${padRef}
            width=${gridPx.w} height=${gridPx.h}
            onPointerDown=${p.onPenDown} onPointerMove=${p.onPenMove}
            onPointerUp=${p.onPenUp} onPointerCancel=${p.onPenUp}
            onPointerLeave=${p.onPenUp} />`}
        </div>`}

      <div class="pd-foot">
        ${(d.moodIds || []).map(function (m) {
          var mo = App.mood(m); if (!mo) return null;
          return html`<span key=${m} class="pd-chip">
            <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon(mo.icon) }} />${mo.name}</span>`;
        })}
        <!-- 조사는 손으로 붙이지 않습니다. 와 를 못박아 두어서 '가족와 함께' 가
             나왔고, 혼자 일 때는 '혼자와 함께' 가 되었습니다.
             App.partnerWith 가 받침과 혼자 를 함께 다룹니다.
             ⛔ 이 주석 안에 백틱을 쓰면 템플릿이 끊깁니다 (인수인계 2-3). -->
        ${partner && html`<span class="pd-chip">${App.partnerWith(d.partnerId, d.partnerIds)}</span>`}
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
  /* ══════════ 1단계 크게 보기 (그림과 문장만) ══════════
     ★ 1단계 학생은 **글자를 못 읽습니다.** 그림이 핵심이고 문장은 읽어주기로 듣습니다.
       그런데 예전에는 **인쇄용 A4 종이를 통째로 줄여** 보여 주어서,
       정작 봐야 할 그림과 문장이 가장 작아졌습니다.

       1280x720 에서 잰 값 : 종이 226x320 (배율 0.285), 원고지 글자가 화면에서 13px.
       가로는 490px 이나 남는데 **세로가 모자라** 폭까지 눌린 것입니다
       (A4 는 세로로 길어서 높이가 모자라면 폭도 못 늘립니다).

     ▸ 그래서 종이의 **그림 부분(날짜줄 + 그림칸)까지만** 크게 잘라 보여 주고,
       문장은 그 아래에 **큰 글씨**로 따로 씁니다.
       인쇄 모양 전체는 `인쇄 모양 보기` 로 언제든 볼 수 있습니다.
     ▸ 종이를 그대로 쓰므로 **사진 · 내가 그린 그림 · 조립 그림이 모두 그대로** 나옵니다.
       따로 그리면 둘이 언젠가 어긋납니다.
     ⛔ 스크롤이 생기면 안 됩니다 (규칙 10). 그래서 크기를 **재서** 정합니다. */
  var LOOK_TOP_H = DATE_H + ART_H;          // 599 — 종이 위에서 그림칸 끝까지

  C.BigLook = function (p) {
    var d = p.draft;
    if (!d || !d.activityId) return null;
    var bigS = useState(false);
    var boxRef = useRef(null);
    var fitS = useState({ s: 0.4, side: true });

    /* 배율을 **창 크기로** 잽니다.
       ⚠ 제 칸(.look-row)을 재면 안 됩니다. 그 칸은 내용만큼 커지는 칸이라,
         자기 크기를 재서 자기 자식 크기를 정하는 **돌림**이 됩니다.
         (그렇게 했더니 그림이 처음 값 그대로 351px 에서 꿈쩍하지 않았습니다.)
       ▸ 250 은 맨 위 줄 · 질문 줄 · 아래 단추 · 여백이 쓰는 높이입니다 (재서 넣은 값).
       ▸ 420 은 왼쪽 칸(문장 고치기 · 고치는 길 셋)과 사이 여백입니다.
       ★ 문장을 그림 **아래**가 아니라 **옆**에 둡니다. A4 는 세로로 길어서
         높이가 언제나 병목입니다. 문장이 세로를 먹으면 그림이 커지지 못합니다.
         가로는 늘 남으므로 옆에 두면 세로를 그림이 통째로 씁니다. */
    /* 문장을 **옆에** 둘지 **아래에** 둘지 두 가지를 다 셈해 **큰 쪽**을 고릅니다.
       ★ 넓은 화면(전자칠판·노트북)은 세로가 병목이라 **옆**이 유리하고,
         아이패드(1024x768)처럼 폭이 좁으면 **아래**가 유리합니다.
         한쪽으로 못박으면 한 기기에서 반드시 손해를 봅니다.
         (1024 에서 옆에 두면 407px, 아래에 두면 549px 였습니다) */
    useLayoutEffect(function () {
      function measure() {
        /* ★★ 창 크기로 어림잡지 않고 **흰 칸을 직접 잽니다.**
           어림값은 화면마다 맞기도 하고 안 맞기도 해서, 1366x768 에서
           이 칸이 흰 칸보다 넓어져 **좌우 4쪽**으로 갈라졌습니다.
           흰 칸(.stage-track)에서 형제(질문 줄)와 왼쪽 문장 칸이 쓰는 만큼을
           빼면 이 칸이 진짜 쓸 수 있는 자리가 나옵니다. */
        var track = document.querySelector('.stage-track');
        var availH, availW;
        if (track && track.clientHeight > 120) {
          var col = track.querySelector('.confirm-2col');
          var used = 0;
          [].forEach.call(track.children, function (c) {
            if (c !== col) used += c.getBoundingClientRect().height;
          });
          availH = track.clientHeight - used - 18;
          availW = Math.max(280, track.clientWidth - 380);   // 왼쪽 문장 칸
        } else {
          availH = window.innerHeight - 250;
          availW = Math.max(280, window.innerWidth - 420);
        }
        var sayW = Math.min(260, availW * 0.3);
        var sSide  = Math.min((availW - sayW - 16) / A4_W, (availH - 52) / LOOK_TOP_H);
        var sBelow = Math.min(availW / A4_W, (availH - 52 - 104) / LOOK_TOP_H);
        var side = sSide >= sBelow;
        var s = Math.max(0.18, Math.min(1, side ? sSide : sBelow));
        fitS[1](function (prev) {
          return (prev && Math.abs(prev.s - s) < 0.004 && prev.side === side)
            ? prev : { s: s, side: side };
        });
      }
      measure();
      /* 흰 칸은 처음 그릴 때 크기가 없을 수 있어 한 박자 뒤에 다시 잽니다 */
      var r1 = requestAnimationFrame(measure);
      var t1 = setTimeout(measure, 220);
      window.addEventListener('resize', measure);
      window.addEventListener('orientationchange', measure);
      return function () {
        cancelAnimationFrame(r1); clearTimeout(t1);
        window.removeEventListener('resize', measure);
        window.removeEventListener('orientationchange', measure);
      };
    }, []);

    var sheet = html`<${C.PicDiarySheet} diary=${d} student=${p.student} trace="text" />`;
    var live = p.arrange
      ? html`<${C.PicDiarySheet} diary=${d} student=${p.student} trace="text"
          arrange=${true} onMoveArt=${p.onMoveArt}
          picked=${p.picked} onPickArt=${p.onPickArt} />`
      : sheet;
    var s = fitS[0].s, side = fitS[0].side;
    var say = (d.bodyEdit !== undefined && d.bodyEdit !== null)
      ? d.bodyEdit : App.sentences.diaryMade(d);

    return html`<div class="look-row" ref=${boxRef}>
      <div class="look-bar">
        ${p.left}
        <${C.Btn} size="small" icon="expand" className="pastel-yellow"
          onClick=${function () { bigS[1](true); }}>인쇄 모양 보기<//>
      </div>
      <!-- 그림은 왼쪽, 문장은 오른쪽. 종이 자체를 쓰므로 사진 · 그린 그림도 그대로 나옵니다. -->
      <div class=${'look-main' + (side ? '' : ' below')}>
        <div class="look-art" style=${{ width: Math.round(A4_W * s) + 'px',
                                        height: Math.round(LOOK_TOP_H * s) + 'px' }}>
          <div class="look-clip" style=${{ transform: 'scale(' + s + ')' }}>${live}</div>
        </div>
        <!-- ⚠ 아래 배치일 때 문장칸에 폭 상한을 **픽셀로** 걸어야 합니다.
             width:100% 로만 두면 부모 폭을 따라가고, 부모는 다시 이 칸을 따라가
             서로 부풀어 오릅니다 (실제로 1285px 이 되어 무대 1257 을 넘겼고,
             완성 화면이 3쪽으로 갈라졌습니다). -->
        <div class="look-say" style=${side ? null : { maxWidth: Math.round(A4_W * s) + 'px' }}>
          <span class="look-txt">${say}</span>
          <${C.Speak} text=${say} />
        </div>
      </div>
      ${bigS[0] && html`<${C.Modal} title="인쇄 모양" wide=${true}
        onClose=${function () { bigS[1](false); }}
        actions=${html`<${C.Btn} kind="ok" onClick=${function () { bigS[1](false); }}>다 봤어요<//>`}>
        <div class="dv-big">${sheet}</div>
      <//>`}
    </div>`;
  };

  C.DiaryPreview = function (p) {
    var bigS = useState(false);

    /* ★ 미리보기 크기를 **화면에 맞게 그때그때** 셈합니다.
       ⚠ 예전에는 CSS 에서 `--dv:.60` 으로 두고 화면 높이 900px · 780px
         에서만 값을 바꿨습니다. 그러니 **그 사이 크기**(예: 940px)에서는
         종이가 674px 이나 되어 흰 칸(740px)을 넘겼고, 완성 화면이
         여러 쪽으로 갈라져 **1쪽이 텅 비어** 보였습니다.
         구간으로 끊지 말고 **재서** 정해야 어느 크기에서나 맞습니다.
       ▸ 400 은 맨 위 줄(110) · 질문 바(60) · 아래 단추(66) · 여백이 쓰는 높이입니다.
         ⚠ 질문 바를 빼먹었다가 940px 높이에서 또 갈라졌습니다.
       ▸ 560 은 왼쪽 문장 칸과 양옆 여백입니다.

       ★★ 창 크기로 어림잡던 것을 **흰 칸을 직접 재는 것**으로 바꿨습니다.
         어림값(400)은 화면마다 맞기도 하고 안 맞기도 합니다. 실제로
         1920x1080 에서 종이가 680px 이 되어 흰 칸(761px)에 질문 줄과 함께
         들어가지 못했고, `break-inside:avoid` 때문에 **본문이 통째로 2쪽으로
         밀려 1쪽에는 질문 줄만 남았습니다.**
       ▸ 흰 칸(.stage-track) 높이에서 **형제(질문 줄 등)가 쓰는 높이**를 빼면
         이 칸이 진짜로 쓸 수 있는 높이가 나옵니다.
       ▸ 흰 칸을 아직 못 찾으면(첫 그림) 예전처럼 창 크기로 어림잡습니다. */
    function fitDv() {
      var track = document.querySelector('.stage-track');
      /* ⚠ **흰 칸의 직계 자식**을 찾아야 합니다. 본문은 이제 .confirm-fit
           껍데기에 싸여 있어서(빈 쪽 막는 장치 — diary.js useFitOnePage),
           .confirm-2col 로 찾으면 그것이 형제로 잡혀 **본문 높이까지 빼버립니다.**
           그러면 자리가 확 줄어 그림이 아주 작아집니다. */
      var col = track && (track.querySelector('.confirm-fit') || track.querySelector('.confirm-2col'));
      if (track && track.clientHeight > 120) {
        var used = 0;
        [].forEach.call(track.children, function (c) {
          if (c !== col) used += c.getBoundingClientRect().height;
        });
        var availH = track.clientHeight - used - 18;      // 18 = 칸 사이 여백
        /* ★ 왼쪽(문장 칸 · 고치는 길)에 380px 을 늘 떼어 주고 있었습니다.
             그런데 1024x768 에서 왼쪽이 **720px**, 오른쪽 그림일기가 251px 로
             단추가 폭의 70% 를 먹고 있었습니다. 여기는 편집 화면이라
             **고치는 대상(그림일기)이 커야지 단추가 클 까닭이 없습니다.**
           ▸ 왼쪽에는 넉넉히 절반까지만 주고, 나머지는 그림일기가 씁니다. */
        var availW = Math.max(track.clientWidth - 330, track.clientWidth * 0.56);
        return Math.max(0.16, Math.min(0.95,
          (availH - 52) / A4_H,                           // 52 = 위 단추 줄(눌러서 크게 보기)
          availW / A4_W));
      }
      /* ⚠ 상한을 0.62 로 두었더니, 자리가 넉넉한 큰 화면에서도 **더 못 컸습니다.**
           높이가 병목이라 상한이 없어도 자리를 넘지 않습니다. */
      return Math.max(0.16, Math.min(0.95,
        (window.innerHeight - 400) / A4_H,
        (window.innerWidth - 560) / A4_W));
    }
    var dvS = useState(fitDv);
    useLayoutEffect(function () {
      function onResize() {
        var s = fitDv();
        dvS[1](function (prev) { return Math.abs(prev - s) < 0.004 ? prev : s; });
      }
      onResize();
      /* 흰 칸은 처음 그릴 때 아직 크기가 없을 수 있어 한 박자 뒤에 다시 잽니다.
         (그러지 않으면 첫 화면만 어림값으로 그려져 쪽이 갈라진 채 남습니다) */
      var r1 = requestAnimationFrame(onResize);
      var t1 = setTimeout(onResize, 220);
      var t2 = setTimeout(onResize, 700);
      window.addEventListener('resize', onResize);
      /* ⚠ **흰 칸 자체를 지켜봅니다.**
           창 크기가 그대로여도 흰 칸은 커질 수 있습니다. 완성 화면에서 무대가
           남는 높이를 다 쓰도록 켜지는 순간(.stage.tall)이 그렇습니다.
           창 resize 만 듣고 있으면 그 변화를 놓쳐, **처음 잰 작은 값 그대로**
           남습니다 (0.78 이어야 할 배율이 0.63 에 멈춰 종이가 120px 작았습니다). */
      var ro = null;
      if (window.ResizeObserver) {
        ro = new window.ResizeObserver(onResize);
        var tr = document.querySelector('.stage-track');
        if (tr) ro.observe(tr);
      }
      return function () {
        cancelAnimationFrame(r1); clearTimeout(t1); clearTimeout(t2);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', onResize);
      };
    }, []);

    var d = p.draft;
    if (!d || !d.activityId) return null;
    var sheet = html`<${C.PicDiarySheet} diary=${d} student=${p.student} trace="text" />`;
    /* 그림 자리 바꾸기를 켜면(arrange) 종이 위의 그림을 눌러 고르고 끌어 옮깁니다.
       일기 고치기 화면과 **똑같은 것**을 씁니다 — 고치는 길이 둘이면 헷갈립니다.
       ▸ 평소에는 **보기만** 합니다. 고치고 싶을 때 왼쪽에서 골라 켭니다. */
    var live = p.arrange
      ? html`<${C.PicDiarySheet} diary=${d} student=${p.student} trace="text"
          arrange=${true} onMoveArt=${p.onMoveArt}
          picked=${p.picked} onPickArt=${p.onPickArt} />`
      : sheet;
    /* ★ 짜임새 : **바 | 그림일기 | 바**.
         전에는 위에 `날짜·사람·장소 바꾸기`, 아래에 `눌러서 크게 보기` 가
         한 줄씩 차지해서, 그 두 줄만큼 그림일기를 작게 보여 줄 수밖에
         없었습니다. 두 줄을 양옆으로 세우면 그 높이가 통째로 그림일기 몫이
         됩니다 (0.30 → 0.46 배). */
    return html`<div class="dv-row">
      <!-- 단추 둘을 그림일기 **위에 한 줄로** 나란히 놓습니다.
           양옆에 세워 두면 좌우 폭을 먹어서 그림일기가 그만큼 작아집니다.
           위에 한 줄이면 폭을 통째로 그림일기가 씁니다. -->
      <div class="dv-bar">
        ${p.left}
        <${C.Btn} size="small" icon="expand" className="pastel-yellow"
          onClick=${function () { bigS[1](true); }}>눌러서 크게 보기<//>
      </div>
      <!-- 크기는 위 fitDv 가 화면에 맞게 재어 넣어 줍니다 (CSS 의 --dv 를 덮어씀) -->
      <!-- 자리 바꾸는 동안에는 **누르면 커지는 것**을 끕니다.
           그림을 잡으려고 눌렀는데 큰 창이 떠 버리면 옮길 수가 없습니다. -->
      <!-- ⚠ 종이 전체를 단추로 두지 않습니다. 그러면 그림을 누를 때마다
             큰 창이 떠서 **그림 하나하나를 고를 수가 없습니다.** -->
      <div class="dv dv-arrange" style=${{ '--dv': dvS[0] }}>
        <span class="dv-paper">${live}</span>
      </div>
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
    var useLines = (lv === 3);         // 3단계는 칸이 아니라 밑줄이라 원고지 판을 안 씁니다

    /* ── 종이 위에 바로 쓰기 (2026-08-26) ────────────────────────────
       writing  : 지금 쓰는 중인지. 켜지면 아래 단추 줄·인쇄 모양 줄을 접고
                  종이를 화면 가득 키웁니다 (선생님 결정 — 칸이 41 → 50px).
       writeInk : 저장해 둔 **투명한 글씨 한 겹**. 칸 위에 그대로 얹습니다. */
    var writeS = useState(false);
    var padRef = useRef(null);
    var penS = useState(PEN_COLORS[0]);
    var thickS = useState(PEN_SIZES[1].v);
    var eraseS = useState(false);
    var writing = writeS[0];

    /* 쓰기를 켜면 저장해 둔 글씨를 판 위에 **먼저 깔아** 이어서 쓰게 합니다.
       ⛔ 판은 투명하게 둡니다 — 흰색을 칠하면 아래 원고지 칸이 가려집니다. */
    useLayoutEffect(function () {
      if (!writing) return;
      var cv = padRef.current; if (!cv) return;
      var g2 = cv.getContext('2d');
      g2.clearRect(0, 0, cv.width, cv.height);
      if (d && d.writeInkId) {
        var img = new window.Image();
        img.onload = function () { g2.drawImage(img, 0, 0, cv.width, cv.height); };
        img.src = App.photos.url(d.writeInkId);
      }
    }, [writing, d && d.writeInkId]);

    /* 화면 좌표 → 판 좌표.
       ⛔ 종이는 transform:scale 로 줄여 놓았습니다. 그래서 **잰 크기(rect)** 로
          셈해야 합니다. A4 크기(gridPx)로 직접 나누면 손끝과 그려지는 자리가
          어긋납니다 (그림판에서 한 번 겪은 고장입니다 — common.js 의 at()). */
    function padXY(e) {
      var cv = padRef.current, r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (cv.width / r.width),
               y: (e.clientY - r.top) * (cv.height / r.height) };
    }
    var drawingRef = useRef(false);
    function penDown(e) {
      var cv = padRef.current; if (!cv) return;
      drawingRef.current = true;
      if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (err) {} }
      var g2 = cv.getContext('2d'), pt = padXY(e);
      g2.lineCap = 'round'; g2.lineJoin = 'round';
      g2.beginPath(); g2.moveTo(pt.x, pt.y);
      penMove(e);
    }
    function penMove(e) {
      if (!drawingRef.current) return;
      var cv = padRef.current; if (!cv) return;
      var g2 = cv.getContext('2d'), pt = padXY(e);
      /* 지우개는 **투명하게 도려냅니다**(destination-out) — 흰색으로 덧칠하면
         아래 원고지 칸까지 하얗게 덮여 칸이 사라집니다. */
      g2.globalCompositeOperation = eraseS[0] ? 'destination-out' : 'source-over';
      g2.strokeStyle = penS[0];
      g2.lineWidth = eraseS[0] ? thickS[0] * 4 : thickS[0];
      g2.lineTo(pt.x, pt.y); g2.stroke();
      g2.beginPath(); g2.moveTo(pt.x, pt.y);
    }
    function penUp() {
      drawingRef.current = false;
      var cv = padRef.current;
      if (cv) cv.getContext('2d').globalCompositeOperation = 'source-over';
    }
    function clearPad() {
      var cv = padRef.current; if (!cv) return;
      var g2 = cv.getContext('2d');
      g2.globalCompositeOperation = 'source-over';
      g2.clearRect(0, 0, cv.width, cv.height);
    }
    function stopWriting() { writeS[1](false); }
    function saveInk() {
      var cv = padRef.current;
      if (!cv || !d) { writeS[1](false); return; }
      var url = cv.toDataURL('image/png');   // 투명한 글씨 한 겹
      App.photos.addDataUrl(url, student.id, 'ink').then(function (id) {
        var old = d.writeInkId;
        App.store.updateDiary(d.id, { writeInkId: id });
        if (old) App.photos.remove(old);
        writeS[1](false);
        App.ui.toast('종이에 쓴 글씨를 담았어요.');
      })['catch'](function () {
        App.ui.toast('글씨를 담지 못했어요.');
      });
    }

    /* ⛔ measure 를 효과(effect) **안에** 두지 마세요. 안에 두면 처음 한 번만
          매어 두게 되어, 화면이 달라져도 다시 재지 못합니다.
        ▸ 실제로 겪은 고장 (2026-08-26) : 쓰기를 켜면 인쇄 모양 줄이 접히고
          흰 칸이 가득 차서 자리가 630px 로 넓어지는데, 종이는 480px 그대로
          남았습니다 (칸 28px). 손으로 resize 를 한 번 일으키면 그제야 630 으로
          커졌습니다 — **재는 일이 안 일어난 것**이었습니다. */
    function measureSheet() {
      var el = boxRef.current; if (!el) return;
      var r = el.getBoundingClientRect();
      var s = Math.min(r.width / A4_W, r.height / A4_H);
      if (!(s > 0)) return;
      fit[1](function (prev) { return Math.abs(prev - s) < 0.002 ? prev : s; });
    }
    useLayoutEffect(function () {
      measureSheet();
      var ro = window.ResizeObserver ? new window.ResizeObserver(measureSheet) : null;
      if (ro && boxRef.current) ro.observe(boxRef.current);
      window.addEventListener('resize', measureSheet);
      return function () { if (ro) ro.disconnect(); window.removeEventListener('resize', measureSheet); };
    }, []);

    /* 힌트 보고 쓰기(빈 칸·빈 줄)에서만 쓰는 **힌트 보기**.
       혼자 쓰기 어려운 학생이 막히지 않게, 완성된 문장을 그림 자리에
       크게 띄워 보고 쓰게 합니다. */
    var hintS = useState(false);
    var canHint = (traceS[0] === 'empty');

    /* 화면 모양이 달라지는 순간마다 **다시 잽니다** — 쓰기를 켜고 끌 때,
       인쇄 모양을 바꿀 때, 힌트를 열고 닫을 때. 자리가 그때마다 바뀝니다.
       ⛔ 두 번 재도 손해가 없습니다 (같은 값이면 그대로 둡니다).
       ⛔ 이 효과를 hintS 보다 **위로 옮기지 마세요** — 아직 만들어지지 않은
          값을 딸림 목록에 적게 되어 힌트를 열어도 다시 재지 않습니다. */
    useLayoutEffect(function () {
      measureSheet();
      var t = setTimeout(measureSheet, 60);   // 접히고 나서 한 번 더
      return function () { clearTimeout(t); };
    }, [writing, traceS[0], hintS[0]]);
    /* 쓰기 판은 **종이 안에** 있어야 칸과 딱 맞습니다. 그래서 그리는 자리를
       C.PicDiarySheet 에 넘겨 줍니다 (writing · padRef · writeInk). */
    var sheet = html`<${C.PicDiarySheet} diary=${d} student=${student} trace=${traceS[0]}
      showHint=${canHint && hintS[0]}
      writing=${writing} padRef=${padRef}
      onPenDown=${penDown} onPenMove=${penMove} onPenUp=${penUp} />`;

    /* 인쇄 모양 단추는 제목·단추와 한 줄에 두면 서로 밀려 제목이 잘립니다 → 아랫줄로.
       단추는 **그 학생의 단계에 있는 것만** 나옵니다 (1단계는 하나뿐). */
    var myModes = modesFor(lv);
    var modeBar = html`<div class="pd-modebar">
      <!-- 왼쪽 끝 : 이 학생이 몇 단계인지. 늘 같은 자리에 있어야 눈에 익습니다. -->
      <span class="pd-lv" title=${LEVEL_INFO[lv].sub}>
        <b>${lv}단계</b> ${LEVEL_INFO[lv].name}</span>
      <!-- 가운데 : 눌러서 고르는 인쇄 모양.
           ★ 힌트 보기 단추는 **힌트 보고 쓰기 바로 오른쪽**에 붙입니다.
             그 모양을 골라야만 나타나는 단추라, 원인과 결과가 떨어져 있으면
             둘이 이어진 것인 줄 모릅니다. 예전에는 줄 오른쪽 끝(pd-modehint)에
             멀찍이 있어서, 눌러 볼 생각을 못 한다는 지적을 받았습니다.
           ⚠ 흰 종이 안에는 두지 않습니다 — 종이는 **인쇄되는 결과물**이라
             조작 단추가 섞이면 안 됩니다.
           ⛔ 이 주석 안에 백틱을 쓰면 템플릿이 거기서 끊깁니다 (인수인계 2-3). -->
      <span class="pd-modes">
        ${myModes.length > 1 && html`<span class="small" style=${{ fontWeight: 900 }}>인쇄 모양</span>`}
        ${myModes.map(function (m) {
          var on = traceS[0] === m.id;
          return html`<${React.Fragment} key=${m.id}>
            <button type="button" class=${'tab' + (on ? ' on' : '')}
              style=${{ minHeight: '40px', padding: '.1rem .7rem', fontSize: '.85rem' }}
              aria-pressed=${on ? 'true' : 'false'} title=${m.desc}
              onClick=${function () { traceS[1](m.id); }}>${m.name}<//>
            ${on && m.id === 'empty' && html`<${C.Btn} size="small" icon="eye"
              className=${'pastel-yellow pd-hintbtn' + (hintS[0] ? ' on' : '')}
              onClick=${function () { hintS[1](!hintS[0]); }}>
              ${hintS[0] ? '힌트 숨기기' : '힌트 보기'}<//>`}
          <//>`;
        })}
      </span>
    </div>`;

    /* ⚠ 맨 위 줄 왼쪽에 있던 '일기 고치기' 를 뺐습니다.
         바로 앞 완성 화면에서 문장 · 그림 자리 · 다시 그리기 · 날짜를
         모두 고치고 왔으므로, 같은 일을 또 권하는 셈이었습니다.
       ▸ 어제 저장한 일기는 '나의 일기 모음' 에서 열어 고칩니다 (아래 journal).
       ⚠ 이 설명을 태그 **속성 사이**에 두면 htm 이 다음 속성 이름(below=)을
         글자 그대로 화면에 찍습니다. 반드시 태그 밖에 둡니다. */
    /* ⚠ 파란 화살표가 **빈 일기 화면**으로 갔습니다.
         `p.back()` 은 지나온 길을 그대로 되짚는데, 일기를 쓸 때의 길에는
         `diary`(번호 없음) 가 쌓여 있습니다. 그리로 되돌아가면 **새 일기**가
         처음부터 열려서, 방금 쓴 일기가 사라진 것처럼 보였습니다.
       ▸ 그래서 지나온 길 대신 **어디에서 왔는지(from)** 를 받아 그 화면으로
         곧장 갑니다. 길에 무엇이 쌓였든 늘 같은 곳으로 갑니다.
           diary   일기를 막 저장하고 옴 → 그 일기의 **완성 화면**으로
           journal 나의 일기 모음에서 옴 → 모음으로
           folio   포트폴리오에서 옴     → 포트폴리오로
       ▸ `step:'last'` 는 일기 화면을 **맨 마지막 질문(완성)** 에서 엽니다.
         그러지 않으면 `언제 했나요?` 부터 다시 훑게 되어 전단계가 아닙니다. */
    function goBack() {
      var from = params.from;
      if (from === 'journal') { p.nav('journal', { studentId: student.id }); return; }
      /* ★ `tab:'diary'` 까지 넘겨야 **떠났던 칸(나의 일기장)** 으로 돌아옵니다.
           그러지 않으면 포트폴리오의 첫 칸(내가 세운 계획)이 열려서,
           바로 앞 화면이 아니라 다른 곳에 온 것처럼 보입니다. */
      if (from === 'folio') { p.nav('portfolio', { studentId: student.id, tab: 'diary' }); return; }
      if (d) { p.nav('diary', { diaryId: d.id, step: 'last' }); return; }
      p.nav('home');
    }

    return html`<div class=${'app pd-app' + (writing ? ' writing' : '')} data-corner="diary">
      <!-- ★ 포트폴리오에서 왔으면 **화살표 자리에 글자 단추**를 둡니다.
             화살표만으로는 어디로 가는지 몰라 학생이 누르지 못했습니다.
             아래에 두었더니 A4 인쇄와 나란히 서서 무엇이 나가는 길인지
             흐렸고, 그만큼 그림일기가 작아졌습니다. -->
      <${C.TopBar} title="그림일기"
        onBack=${goBack}
        backText=${params.from === 'folio' ? '나의 일기장으로 돌아가기' : null}
        onTitle=${function () { p.nav("home"); }}
        below=${modeBar}>
        <${C.Speak} text=${d ? App.sentences.diaryBody(d) : '일기를 찾을 수 없어요.'} />
      <//>

      <!-- ★ 쓰는 동안에는 흰 칸을 **가득** 씁니다 (tall · 2026-08-26).
             보통 화면은 85% 만 쓰는 것이 규칙인데(인수인계 §29-1), 종이 위에
             손으로 쓸 때만은 칸이 클수록 좋습니다. 800 높이 화면에서
             원고지 한 칸이 28 → 41px 로 커집니다. -->
      <div class=${'stage' + (writing ? ' tall' : '')}>
        <div class="panel" style=${{ alignSelf: 'stretch' }}>
          <div class="stage-fit" style=${{ display: 'flex', flexDirection: 'column' }}>
            ${d ? html`<div class="pd-fit grow" ref=${boxRef}>
              <div class="pd-scale" style=${{ width: A4_W + 'px', height: A4_H + 'px',
                  transform: 'scale(' + fit[0] + ')' }}>${sheet}</div>
            </div>` : html`<${C.Banner} icon="question">일기를 찾을 수 없어요.<//>`}
          </div>

          <!-- ★ 단추 둘을 **한 줄에 나란히**, 키도 낮춥니다.
                 위아래로 쌓으면 두 줄(약 150px)을 먹어서 그림일기가 그만큼
                 작아집니다. 한 줄이면 절반만 씁니다.
                 1·2·3단계가 같은 화면을 쓰므로 세 단계에 함께 적용됩니다. -->
          <!-- ⚠ 나가는 길을 여기에 두지 마세요. A4 인쇄와 나란히 서면
                 무엇이 나가는 길인지 흐리고, 그만큼 그림일기가 작아집니다.
                 지금은 **맨 위 줄 화살표 자리**에 글자 단추로 있습니다.
               ▸ 포트폴리오에서 왔을 때에는 「나의 일기 모음」 도 빼 둡니다 —
                 돌아갈 곳이 둘이면 어디가 앞 화면인지 흐려집니다. -->
          <!-- ★ 쓰는 중에는 도구 줄로 바뀝니다 (2026-08-26).
                 인쇄·모음 단추를 그대로 두면 쓰다가 눌러 나가 버립니다. -->
          ${writing ? html`<div class="panel-action pd-writebar">
            <span class="pd-writehint">종이에 그대로 써 보아요</span>
            <span class="pd-pens">
              ${PEN_COLORS.map(function (c) {
                return html`<button key=${c} type="button"
                  class=${'pd-pen' + (!eraseS[0] && penS[0] === c ? ' on' : '')}
                  style=${{ background: c }} aria-label="펜 색"
                  onClick=${function () { eraseS[1](false); penS[1](c); }} />`;
              })}
            </span>
            ${PEN_SIZES.map(function (s) {
              return html`<${C.Btn} key=${s.v} size="small"
                className=${!eraseS[0] && thickS[0] === s.v ? 'pastel-blue on' : ''}
                onClick=${function () { eraseS[1](false); thickS[1](s.v); }}>${s.name}<//>`;
            })}
            <${C.Btn} size="small" className=${eraseS[0] ? 'pastel-blue on' : ''}
              onClick=${function () { eraseS[1](!eraseS[0]); }}>지우개<//>
            <${C.Btn} size="small" icon="trash" onClick=${clearPad}>다 지우기<//>
            <${C.Btn} kind="primary" icon="check" onClick=${saveInk}>다 썼어요<//>
            <${C.Btn} size="small" onClick=${stopWriting}>그만두기<//>
          </div>` : html`<div class="panel-action pd-acts">
            <${C.Btn} kind="primary" icon="print"
              onClick=${function () { App.printNode(html`<div class="pd-print">${sheet}</div>`); }}>
              A4 인쇄하기<//>
            <!-- ★ **보고 있는 이 종이 위에 그대로 씁니다** (2026-08-26 · 선생님 말씀).
                   팝업을 열지 않습니다. 누르면 종이가 커지고 칸 위에 바로 씁니다.
                 ⛔ 1·2단계만 내놓습니다. 3단계는 칸이 아니라 밑줄이라
                    원고지 판이 맞지 않고, 그쪽에는 「손글씨로 쓰기」가 따로 있습니다. -->
            ${!useLines && html`<${C.Btn} icon="pencil" className="pastel-blue"
              onClick=${function () { writeS[1](true); }}>
              ${d && d.writeInkId ? '이어서 쓰기' : '원고지에 손으로 쓰기'}<//>`}
            ${d && d.writeInkId && html`<${C.Btn} size="small" icon="back"
              onClick=${function () {
                var old = d.writeInkId;
                App.store.updateDiary(d.id, { writeInkId: null });
                if (old) App.photos.remove(old);
              }}>손글씨 지우기<//>`}
            ${params.from !== 'folio' && html`<${C.Btn} icon="book" className="pastel-yellow"
              onClick=${function () { p.nav('journal', { studentId: student.id }); }}>
              나의 일기 모음 보기<//>`}
          </div>`}

          <!-- ※ 예전에는 여기에 원고지 팝업(C.Modal + C.DrawPad)이 있었습니다.
                 2026-08-26 에 걷어냈습니다 — 선생님이 바라신 것은 팝업이 아니라
                 **보고 있는 종이 위에 그대로** 쓰는 것이었습니다.
                 지금은 위 「writing」 이 켜지면 종이 안 원고지 칸 위에
                 투명한 그림판이 얹힙니다 (C.PicDiarySheet 의 .pd-writepad). -->
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
    /* ⚠ 예전의 `textS`(문장 칸을 펼쳤는지)는 없앴습니다 — 완성 화면처럼
         글 칸을 **늘 펴 두기** 때문입니다 (2026-08-28). */
    var moveS = useState(false);       // 그림 자리를 옮기는 중인지
    var pickedS = useState(null);      // 크기를 바꾸려고 고른 그림

    /* ⛔ 여기서 종이 크기를 따로 셈하지 않습니다 (2026-08-28).
         예전에는 `fitScale()` 이 왼쪽 단추 칸을 **420px 로 못박고** 남는
         자리로 종이를 셈했습니다. 그래서 완성 화면보다 왼쪽이 넓었습니다
         (선생님 말씀 — 「왼쪽 바가 더 넓게 차지하고 구성도 완전 달라」).
       ▸ 이제 완성 화면과 **같은 부품**(C.DiaryPreview)을 씁니다. 그 안의
         fitDv 가 흰 칸을 직접 재므로 두 화면의 종이 크기가 저절로 같습니다.
       ▸ 흰 칸을 넘으면 완성 화면과 같은 장치로 통째로 줄입니다. */
    var fitPair = App.useFitOnePage([params.diaryId, moveS[0], d && d.bodyEdit]);
    var fitBox = fitPair[0], fitInner = fitPair[1];

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

    /* 고른 그림의 **크기**를 한 단계씩 바꿉니다 (0.5배 ~ 2배).
       자리와 같은 곳(artLayout)에 담아 두어서, 인쇄해도 그대로 나옵니다.
       ▸ 그림을 아직 안 골랐으면 무엇을 키울지 알 수 없으니 알려 줍니다. */
    function sizeArt(dir) {
      var key = pickedS[0];
      if (!key) { App.ui.toast('크기를 바꿀 그림을 먼저 눌러 주세요.'); return; }
      var cur = d.artLayout || {};
      var now = cur[key] || {};
      var s = Math.max(0.5, Math.min(2, (now.s || 1) + dir * 0.15));
      var next = {};
      for (var k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) next[k] = cur[k];
      /* 아직 옮긴 적이 없는 그림이면 지금 보이는 자리를 함께 적어 둡니다 */
      next[key] = { x: now.x, y: now.y, s: Math.round(s * 100) / 100 };
      App.store.updateDiary(d.id, { artLayout: next });
    }
    /* 인쇄할 때 쓰는 종이 (고치는 손잡이가 없는 깨끗한 것).
       ⚠ 화면에 보이는 종이는 이제 C.DiaryPreview 가 그립니다 — 완성 화면과
         같은 부품이라 크기도 같습니다. 여기서 또 만들지 마세요. */
    var sheet = html`<${C.PicDiarySheet} diary=${d} student=${student} trace="text" />`;

    /* ★ 고치고 나면 **온 곳으로** 돌아갑니다 (2026-08-28 · 선생님 말씀 —
         「고치기를 누르고 고친다음 다시 나의 일기모음으로 가게」). */
    var fromJournal = (params.from === 'journal');
    function fixBack() {
      if (fromJournal) { p.nav('journal', { studentId: student.id }); return; }
      p.back('picdiary');
    }

    return html`<div class="app" data-corner="diary">
      <${C.TopBar} title="일기 고치기"
        onBack=${fixBack}
        backLabel=${fromJournal ? '나의 일기 모음으로' : '그림일기로'}
        backText=${fromJournal ? '나의 일기 모음으로 돌아가기' : null}
        onTitle=${function () { p.nav("home"); }}>
        <!-- 그림일기로 알약을 없앴습니다. 바로 왼쪽 파란 화살표가 같은 일을
             하므로, 같은 뜻의 단추가 둘이면 어느 것을 눌러야 할지 헷갈립니다.
             ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
        <${C.Speak} text=${'일기를 고쳐요. 그림을 고칠까요, 글을 고칠까요?'} />
      <//>

      <!-- 맨 아래 : 인쇄와 담기를 **따로** 둡니다.
             인쇄는 안 하고 모아 두기만 할 때가 있어서, 하나로 묶으면
             종이를 쓰지 않고는 모을 길이 없었습니다. -->
      <!-- ★ tall — 완성 화면과 **같게** 켭니다 (2026-08-28).
             켜지 않으면 무대가 내용만큼만 커져서 남는 높이가 여백이 되고,
             종이가 완성 화면보다 작아집니다 (291px 대 339px).
             여기도 **종이를 크게 보는 것이 목적**인 화면입니다. -->
      <${C.Stage} tall=${true} action=${html`<div class="fix-acts">
        <${C.Btn} kind="primary" icon="print"
          onClick=${function () { App.printNode(html`<div class="pd-print">${sheet}</div>`); }}>
          A4 인쇄하기<//>
        <${C.Btn} kind="ok" icon="book"
          onClick=${function () {
            App.store.updateDiary(d.id, { inJournal: true, printedAt: Date.now() });
            App.ui.toast('나의 일기모음에 담았어요.');
          }}>나의 일기모음에 담기<//>
      </div>`}>

        <!-- ★★ 여기부터는 **완성 화면(일기가 완성되었어요)과 똑같은 짜임새**입니다
                (2026-08-28 · 선생님 말씀 — 「화면 구성을 똑같이 해달라고 했지
                위치를 이동하라는건 아니었어 … 안의 구성 디자인 위치는 이렇게 동일하게」).
              ▸ 껍데기 이름까지 완성 화면 것을 그대로 씁니다
                (.confirm-fit · .confirm-2col · .confirm-left · .fix-part).
                이름이 같아야 **CSS 한 곳만 고치면 두 화면이 함께** 바뀝니다.
              ⛔ 여기에 이 화면만의 규칙(.fix-2col · .fix-left · .fix-paper)을
                다시 만들지 마세요 — 그래서 두 화면이 달라졌던 것입니다.
              ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
        <div class="confirm-fit" ref=${fitBox}>
        <div class="confirm-2col" ref=${fitInner}>
          <div class="confirm-left">
            <!-- ⚠ 「선생님이 도와주세요.」 설명 칸을 뺐습니다 (선생님 말씀).
                   완성 화면에도 없습니다 — 두 화면이 같아야 합니다. -->

            <!-- 위 = 그림칸 → 그림 고치기 둘 / 아래 = 원고지 → 글 고치기.
                 왼쪽 차례가 오른쪽 그림일기의 차례와 나란히 놓입니다. -->
            <div class="fix-part">
              <span class="fix-lab">그림</span>
              <div class="fix-body">
                <${C.Btn} size="big" className=${'pastel-green fix-go' + (moveS[0] ? ' on' : '')}
                  icon="expand" onClick=${function () { moveS[1](!moveS[0]); }}>
                  ${moveS[0] ? '자리 옮기기 끝내기' : '그림 자리 · 크기 바꾸기'}<//>
                <${C.Btn} size="big" className="pastel-red fix-go" icon="pencil"
                  onClick=${function () { drawS[1](true); }}>그림 다시 그리기<//>
              </div>
            </div>

            <!-- 내가 그린 그림(또는 사진)으로 바꾼 뒤 **되돌릴 길**.
                 그림 묶음 바로 아래에 둡니다 — 그림에 딸린 일이라
                 그림 자리에 있어야 무엇을 되돌리는지 압니다. -->
            ${(d.picKind === 'draw' || d.picKind === 'photo') && html`<div class="fix-undo">
              <${C.Btn} size="small" icon="back"
                onClick=${function () { App.store.updateDiary(d.id, { picKind: 'app' }); }}>
                고른 그림으로 되돌리기<//>
              <span class="small muted">그린 그림은 지워지지 않아요.</span>
            </div>`}

            <!-- ★ 자리 옮기기 안내는 그림 묶음과 글 묶음 **사이**에 두고,
                   **자리는 늘 잡아 둡니다**(move-slot). 켜고 끌 때마다 아래
                   칸이 밀려 올라갔다 내려갔다 하면 안 됩니다. -->
            <div class=${'move-slot' + (moveS[0] ? '' : ' off')} aria-hidden=${moveS[0] ? 'false' : 'true'}>
              <${C.Banner} tone="info" icon="expand"
                speakText="그림을 손가락이나 마우스로 끌어서 자리를 옮기고, 크기도 바꾸어 보아요.">
                <b>그림을 끌어서 옮겨요.</b>
                <div class="small">오른쪽 그림일기에서 그림을 잡고 끌면 자리가 바뀌어요.
                  그림을 한 번 누르면 크기도 바꿀 수 있어요.</div>
                <div class="wrap" style=${{ justifyContent: 'center', marginTop: '.5rem' }}>
                  <${C.Btn} size="small" className="pastel-blue"
                    onClick=${function () { sizeArt(-1); }}>고른 그림 작게<//>
                  <${C.Btn} size="small" className="pastel-blue"
                    onClick=${function () { sizeArt(1); }}>고른 그림 크게<//>
                  <${C.Btn} size="small"
                    onClick=${function () {
                      App.store.updateDiary(d.id, { artLayout: null }); pickedS[1](null);
                    }}>처음 자리로<//>
                </div>
              <//>
            </div>

            <!-- ★ 글은 **접었다 폈다 하지 않고 늘 펴 둡니다** — 완성 화면과 같게.
                   예전에는 「일기 내용 수정하기」 단추를 눌러야 칸이 나왔습니다. -->
            <div class="fix-part">
              <span class="fix-lab">글</span>
              <div class="fix-body">
                <${C.SentenceEdit}
                  made=${App.sentences.diaryMade(d)}
                  value=${d.bodyEdit === undefined ? null : d.bodyEdit}
                  placeholder="아직 고른 내용이 없어요. 여기에 직접 써도 돼요."
                  onChange=${function (v) { App.store.updateDiary(d.id, { bodyEdit: v }); }}
                  onReset=${function () { App.store.updateDiary(d.id, { bodyEdit: null }); }} />
              </div>
            </div>
          </div>

          <!-- 오른쪽 : 완성 화면과 **같은 부품**. 종이 크기를 여기서 따로
               셈하지 않으므로 두 화면의 그림일기가 늘 같은 크기입니다. -->
          <${C.DiaryPreview} draft=${d} student=${student}
            arrange=${moveS[0]} onMoveArt=${moveArt}
            picked=${pickedS[0]} onPickArt=${function (k) { pickedS[1](k); }} />
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
    /* 인쇄 모양은 **이 학생의 단계**를 따릅니다 (아래 printBook 주석).
       ⚠ 일기 한 장이 아니라 **모음 전체**를 뽑는 화면이라, 일기마다의
         단계가 아니라 지금 학생의 단계를 씁니다 — 포트폴리오의
         「일기장 모두 인쇄」와 같은 방식입니다. */
    var lv = levelOf(null, student);

    /* ★ 책 인쇄를 **두 가지**로 나눴습니다 (2026-08-28 · 선생님 말씀 —
         「일기 모음 책 인쇄하기를 두가지로 하나는 글자 있는 그대로 하나는
         따라쓰기로」).
       ⛔⛔ 두 가지가 **무엇인지는 단계마다 다릅니다** (선생님 말씀 —
            「이게 단계별로 가능한가? 1단계는 내가 쓴 글, 따라쓰기가 맞지만,
            **2단계는 따라 쓰기, 힌트 보고 쓰기**」).
              1단계  글자 · 따라 쓰기
              2단계  따라 쓰기 · 힌트 보고 쓰기
              3단계  내가 쓴 글 · 빈 줄
          제가 처음에 `text` · `trace` 로 **못박아** 두어서 2단계 학생에게
          맞지 않는 두 가지가 나왔습니다. 목록은 위 `MODES_BY_LEVEL` 한 곳에서만
          정합니다 (`modesFor`) — 화면마다 적으면 언젠가 둘이 어긋납니다.
       ▸ 포트폴리오의 「일기장 모두 인쇄」도 같은 목록을 씁니다. */
    /* ⛔⛔ **힌트 보고 쓰기로 뽑을 때는 힌트도 함께 넘겨야 합니다.**
         선생님 : 「힌트보고인쇄도 힌트창이 나오지 않고」 (2026-08-29 태블릿)
       `trace` 만 넘기고 `showHint` 를 빠뜨려서, 「힌트 보고 쓰기」로 뽑아도
       빈 칸만 나왔습니다. 화면에서는 힌트 보기 단추로 켜지지만 **인쇄에는
       그 단추가 없으므로**, 인쇄에서는 늘 켜져 있어야 합니다 — 힌트를 보고
       쓰라고 뽑는 종이인데 힌트가 없으면 아무 소용이 없습니다.
     ▸ 같은 실수가 포트폴리오의 「일기장 모두 인쇄」에도 있었습니다. */
    function printBook(mode) {
      if (!list.length) { App.ui.toast('아직 모인 일기가 없어요.'); return; }
      App.printNode(html`<div class="pd-book">
        ${list.map(function (x) {
          return html`<div key=${x.id} class="pd-page">
            <${C.PicDiarySheet} diary=${x} student=${student} trace=${mode || 'text'}
              showHint=${mode === 'empty'} />
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
      <//>

      <!-- ★ 맨 아래 줄 : 왼쪽 인쇄 · 오른쪽 나가기.
             노란 단추는 **되짚는 길이 아니라 나가는 길**입니다. 여기까지 왔으면
             이 코너에서 할 일이 끝난 자리라, 한 걸음씩 되짚지 않고 바로 갑니다.
             계획하GO! 의 마지막 화면 · 나의 여가 모아보기와 **같은 모양**입니다. -->
      <${C.Stage}
        action=${html`<div class="fix-acts">
          <!-- ★ 이 학생의 **단계에 있는 두 가지**만 나옵니다 (위 printBook 주석).
                 이름도 그 단계의 말로 나옵니다 (2단계는 「힌트 보고 쓰기」).
               ⛔ 여기에 모양을 손으로 적지 마세요 — modesFor 한 곳에서만 정합니다.
               ⛔ onClick 에 함수를 **그대로** 넘기지 마세요 — 그러면 클릭
                  이벤트가 첫 인자로 들어가 mode 자리에 앉습니다. -->
          ${modesFor(lv).map(function (m, i) {
            return html`<${C.Btn} key=${m.id} icon="print" title=${m.desc}
              kind=${i === 0 ? 'primary' : null}
              className=${i === 0 ? null : 'pastel-blue'}
              disabled=${!list.length}
              onClick=${function () { printBook(m.id); }}>책으로 인쇄 · ${m.name}<//>`;
          })}
        </div>`}>
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
          <!-- ⛔ 여기는 **fixdiary 로 그대로 둡니다** (2026-08-28 · 선생님 말씀 —
                 「고치기를 눌렀더니 일기가 완성해요로 가버렸네? 그럼 안돼지!!
                 화면 구성을 똑같이 해달라고 했지 **위치를 이동하라는건 아니었어.**
                 고치기를 누르고 고친다음 다시 나의 일기모음으로 가게」).
               ▸ 한때 완성 화면(diary step:'last')으로 보냈다가 되돌렸습니다.
                 고칠 것은 **화면 안의 짜임새**이지 가는 곳이 아닙니다.
                 고치고 나면 **나의 일기 모음으로** 돌아와야 합니다.
               ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
          <${C.Btn} icon="pencil" className="pastel-yellow"
            onClick=${function () { p.nav('fixdiary', { diaryId: open.id, from: 'journal' }); }}>고치기<//>
          <${C.Btn} onClick=${function () { openS[1](null); }}>닫기<//>
        <//>`}>
        <div class="jr-big"><${C.PicDiarySheet} diary=${open} student=${student} trace="text" /></div>
      <//>`}
    </div>`;
  };
})();
