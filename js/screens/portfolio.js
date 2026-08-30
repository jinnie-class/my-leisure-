/* ===========================================================
   나의 여가 — 모아보GO! (나의 여가 포트폴리오 · 나의 여가 전시관)

   ★ 전시할 일기는 **학생이 고릅니다.** 무엇을 남에게 보일지 고르는 것은
     학생이 배울 몫입니다. `전시` 라는 말도 학교에서 늘 쓰는 구체적인 말이라
     그대로 익히게 둡니다 (한때 `중요 표시` 로 바꿔 보았으나, `중요` 는
     눈에 보이지 않는 추상어라 오히려 어려워 되돌렸습니다).
   ⛔ 다만 표시 그림은 별(★)이 아니라 **책갈피**입니다.
     지도에서 별은 `도전하고 싶어요` 를 뜻해서, 한 모양이 두 뜻이 됩니다.
   계획 · 일기 · 사진 · 작품 · 여가지도를 기간별로 모아 보여 주고
   전시판형 / 책자형으로 인쇄하거나 PDF 로 저장할 수 있습니다.
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useMemo = React.useMemo,
      useEffect = React.useEffect, useRef = React.useRef,
      useLayoutEffect = React.useLayoutEffect;

  /* ------------------------- 교실 TV 전시 모드 -------------------------
     전시하기로 고른 기록을 한 장씩 크게 띄우고 저절로 넘깁니다.
     교실 TV·전자칠판에 띄워 두면 친구들 기록을 함께 보게 됩니다.
     ← → 로 넘기고, 가운데 단추로 멈췄다 다시 시작합니다. */
  var SHOW_SECONDS = 8;

  C.ShowMode = function (p) {
    var list = p.diaries || [];
    var idxS = useState(0);
    var playS = useState(true);
    var boxRef = useRef(null);
    var fit = useState(0.5);
    var A4_W = 794, A4_H = 1123;

    var n = list.length;
    var i = Math.min(idxS[0], Math.max(0, n - 1));

    function go(d) { idxS[1](function (v) { return n ? (v + d + n) % n : 0; }); }

    /* 저절로 넘기기 */
    useEffect(function () {
      if (!playS[0] || n < 2) return;
      var t = setInterval(function () { go(1); }, SHOW_SECONDS * 1000);
      return function () { clearInterval(t); };
    }, [playS[0], n]);

    /* ← → 로 넘기고 Esc 로 나갑니다 */
    useEffect(function () {
      function onKey(e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'Escape') { p.onClose(); }
        else if (e.key === ' ') { e.preventDefault(); playS[1](!playS[0]); }
      }
      window.addEventListener('keydown', onKey, true);
      return function () { window.removeEventListener('keydown', onKey, true); };
    }, [playS[0], n]);

    /* 종이를 화면에 꽉 차게 맞춥니다 */
    useLayoutEffect(function () {
      function measure() {
        var el = boxRef.current; if (!el) return;
        var r = el.getBoundingClientRect();
        var s = Math.min(r.width / A4_W, r.height / A4_H);
        if (s > 0) fit[1](function (prev) { return Math.abs(prev - s) < 0.002 ? prev : s; });
      }
      measure();
      var ro = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
      if (ro && boxRef.current) ro.observe(boxRef.current);
      window.addEventListener('resize', measure);
      return function () { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    var d = list[i];
    return html`<div class="tvshow" role="dialog" aria-modal="true" aria-label="교실 전시">
      <div class="tv-head">
        <b class="tv-title">${(p.student ? p.student.name + ' 학생의 ' : '') + '여가 전시관'}</b>
        <span class="tv-count">${n ? (i + 1) + ' / ' + n : '0 / 0'}</span>
        <div class="grow"></div>
        <${C.Btn} size="small" icon="back" onClick=${function () { go(-1); }}>이전<//>
        <${C.Btn} size="small" kind=${playS[0] ? 'ok' : 'primary'}
          onClick=${function () { playS[1](!playS[0]); }}>${playS[0] ? '⏸ 멈춤' : '▶ 시작'}<//>
        <${C.Btn} size="small" icon="next" onClick=${function () { go(1); }}>다음<//>
        <${C.Btn} size="small" onClick=${p.onClose}>나가기<//>
      </div>

      <div class="tv-stage" ref=${boxRef}>
        ${d ? html`<div class="pd-scale" style=${{ width: A4_W + 'px', height: A4_H + 'px',
              transform: 'scale(' + fit[0] + ')' }}>
            <${C.PicDiarySheet} diary=${d} student=${p.student} trace="text" />
          </div>`
          : html`<p class="tv-empty">전시하기로 고른 일기가 아직 없어요.</p>`}
      </div>

      <div class="tv-dots" aria-hidden="true">
        ${list.map(function (x, k) {
          return html`<i key=${x.id} class=${k === i ? 'on' : ''}></i>`;
        })}
      </div>
    </div>`;
  };

  /* ------------------------- 작은 여가 탐험 지도 ------------------------- */
  var MW = 660, MH = 360, MCX = 330, MCY = 180;
  function miniRing(a, b, n, start) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = start + (i / n) * Math.PI * 2;
      out.push({ x: MCX + a * Math.cos(t), y: MCY + b * Math.sin(t) });
    }
    return out;
  }

  C.MiniMap = function (p) {
    var student = p.student;
    var statusMap = App.store.mapOf(student.id);
    var cards = App.visibleCards(student).filter(function (c) {
      var s = statusMap[c.id];
      return s && (s.tried || s.like || s.challenge || s.unsure);
    });
    var inner = cards.filter(function (c) { return c.area === 'indoor'; });
    var outer = cards.filter(function (c) { return c.area === 'outdoor'; });
    var pi = miniRing(118, 74, inner.length, -Math.PI / 2);
    var po = miniRing(255, 140, outer.length, -Math.PI / 2 + 0.2);

    function chip(c, pt, key) {
      var s = statusMap[c.id] || {};
      var on = App.DATA.mapStates.filter(function (m) { return s[m.id]; });
      return html`<div key=${key} style=${{ position: 'absolute', left: pt.x + 'px', top: pt.y + 'px',
          transform: 'translate(-50%,-50%)', width: '86px', textAlign: 'center',
          background: '#fffdf6', border: '2px solid #8a6a4e', borderRadius: '12px', padding: '3px 2px' }}>
        <div style=${{ width: 26, height: 26, margin: '0 auto' }}><${C.ActivityArt} activity=${c} /></div>
        <div style=${{ fontSize: '9.5px', fontWeight: 900, lineHeight: 1.1 }}>${App.shortName(c)}</div>
        <div style=${{ display: 'flex', gap: '1px', justifyContent: 'center' }}>
          ${on.map(function (m) {
            return html`<span key=${m.id} style=${{ width: 13, height: 13, display: 'block' }} aria-hidden="true"
              dangerouslySetInnerHTML=${{ __html: App.icon(m.icon) }} />`;
          })}
        </div>
      </div>`;
    }

    var scale = p.scale || 1;
    return html`<div style=${{ width: (MW * scale) + 'px', height: (MH * scale) + 'px', position: 'relative', overflow: 'hidden' }}>
      <div style=${{ width: MW + 'px', height: MH + 'px', position: 'absolute', top: 0, left: 0,
          transformOrigin: '0 0', transform: 'scale(' + scale + ')' }}>
        <svg width=${MW} height=${MH} style=${{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <ellipse cx=${MCX} cy=${MCY} rx="118" ry="74" fill="none" stroke="#c3ab8e" stroke-width="2.5" stroke-dasharray="7 6" />
          <ellipse cx=${MCX} cy=${MCY} rx="255" ry="140" fill="none" stroke="#a6cba0" stroke-width="2.5" stroke-dasharray="7 6" />
        </svg>
        <div style=${{ position: 'absolute', left: MCX + 'px', top: MCY + 'px', transform: 'translate(-50%,-50%)',
            width: '92px', textAlign: 'center', background: '#fffdf3', border: '3px solid #8a6a4e',
            borderRadius: '16px', padding: '5px' }}>
          <div style=${{ width: 40, height: 40, margin: '0 auto', borderRadius: '999px', overflow: 'hidden',
              border: '2px solid #8a6a4e' }}>
            <${C.AvatarArt} student=${student} /></div>
          <div style=${{ fontSize: '11px', fontWeight: 900 }}>${student.name}</div>
        </div>
        ${inner.map(function (c, i) { return chip(c, pi[i], 'i' + c.id); })}
        ${outer.map(function (c, i) { return chip(c, po[i], 'o' + c.id); })}
      </div>
      ${!cards.length && html`<div class="muted small"
        style=${{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        아직 지도에 표시한 활동이 없어요.</div>`}
    </div>`;
  };

  /* ------------------------- 모음 셋 -------------------------
     포트폴리오는 세 코너에서 만든 것을 한곳에 모아 두는 곳입니다.
     한 번에 하나만 보여 주고, 무엇을 볼지는 학생이 고릅니다. */
  /* ★ 한 번에 **하나만** 봅니다. 다 펼치면 좌우 여러 쪽이 되어 넘겨야 하고,
       무엇부터 볼지 학생이 정할 수 없습니다.
     ⚠ `나의 한마디`(한마디 + 돌아보기)도 넷째 칸으로 넣었습니다.
       예전에는 모음 아래에 **늘 붙어 있어서**, 일기장을 고르면 4쪽까지 갈라졌습니다. */
  /* ★ 네 칸의 그림은 **그 코너에서 쓰는 그림 그대로**입니다 (2026-08-22).
       예전에는 여기만 코드로 그린 SVG 를 써서, 홈의 코너 그림과 달랐습니다.
       같은 곳을 가리키는데 그림이 둘이면 학생은 다른 것으로 봅니다.
         내가 세운 계획 → images/코너명/여가 계획하기.png
         나의 여가지도  → images/코너명/여가 지도.png
         나의 일기장    → images/코너명/여가 일기.png
       ▸ `나의 한마디` 는 코너가 아니라 **여기에서 하는 일**이라 짝이 될 코너
         그림이 없습니다. 그래서 그림을 따로 그렸습니다 :
           나의 한마디 → images/나의 한마디.png (App.uiImage 의 `myword`)
         (한때 `직접 쓰기` + `내가 그리기` 두 장을 나란히 놓았습니다. 넷 가운데
          하나만 그림이 둘이라 줄이 어긋나 보였습니다 — 한 장으로 되돌립니다) */
  var FOLIO_TABS = [
    /* 네 탭이 **같은 꼴**로 셉니다. 아무것도 없을 때는 `0장` 대신 `아직 없어요`.
       숫자 0 은 못했다는 표시처럼 보입니다 — 앱이 모아보기에서 쓰는 말과 맞췄습니다. */
    { id: 'plan',  name: '내가 세운 계획', icon: 'cornerPlan',
      art: function () { return html`<${C.PickArt} kind="corner" word="여가 계획하기" iconKey="cornerPlan" />`; },
      count: function (d) { return d.plans.length ? (d.plans.length + '장') : '아직 없어요'; } },
    { id: 'map',   name: '나의 여가지도',  icon: 'cornerMap',
      art: function () { return html`<${C.PickArt} kind="corner" word="여가 지도" iconKey="cornerMap" />`; },
      count: function (d) { return d.tried.length ? (d.tried.length + '가지') : '아직 없어요'; } },
    { id: 'diary', name: '나의 일기장',    icon: 'cornerDiary',
      art: function () { return html`<${C.PickArt} kind="corner" word="여가 일기" iconKey="cornerDiary" />`; },
      count: function (d) { return d.diaries.length ? (d.diaries.length + '장') : '아직 없어요'; } },
    /* ⚠ 여기만 `0 / 5` 처럼 **분수로** 세고 있었습니다.
         · 다른 세 탭은 `1장` · `3가지` · `3장` 인데 혼자 꼴이 달라 어수선했습니다.
         · 무엇보다 `0 / 5` 는 학생에게 **5개 중 0개 = 0점**처럼 읽힙니다.
           아직 안 쓴 것이 잘못한 것처럼 보이면 안 됩니다.
       ★ 다른 탭과 **같은 꼴**로 쓴 만큼만 셉니다. 못 채운 칸은 세지 않습니다. */
    { id: 'me',    name: '나의 한마디',    icon: 'pencil',
      art: function () { return html`<${C.Art} src=${App.uiImage('myword')} iconKey="pencil" />`; },
      count: function (d, st) {
        if (!st) return '';
        var n = (st.word ? 1 : 0);
        var rv = st.review || {};
        App.reviewFramesFor(st.diaryLevel, rv).forEach(function (f) { if (rv[f.id]) n++; });
        return n ? (n + '줄') : '아직 없어요';
      } }
  ];

  /* ═══════ 4개씩 2줄로 끊어 보여 주고, 넘치면 **양쪽 화살표**로 넘기기 ═══════
     ★ 이 앱은 학생 화면에 **스크롤을 만들지 않습니다.** 고를 것이 많다고
       칸을 늘리면 흰 칸을 넘겨 좌우 여러 쪽으로 갈라지고, 학생은 제 것을
       다 보려면 화면을 넘겨야 합니다.
     ▸ 한 쪽에 **여섯 개(3 x 2)** 씩만 놓고, 남은 것은 화살표로 넘깁니다.
       칸 수가 몇이든 화면 높이가 늘 같아서 쪽이 갈라지지 않습니다.
     ▸ 화살표는 되돌아가기와 **같은 채워진 삼각형**입니다 (인수인계 15-10).
     ★ 한 줄에 **셋**입니다. 넷씩 놓았더니 그림이 작아 보기 힘들고, 한 번에
       여덟 개가 쏟아져 학생이 무엇을 볼지 헤맸습니다. 셋이면 칸이 넓어
       그림이 크고, 한 쪽에 여섯이라 한눈에 담깁니다. */
  /* ★ pageOf · flowBox 는 **common.js 로 옮겼습니다** (2026-08-26 · 인수인계 19-3).
       화면 파일(여기)에 공용 헬퍼를 두면, 그것을 쓰는 home.js 가
       **불러오는 차례** 덕분에 우연히 돌아가는 층위 역전이었습니다.
     ⛔ 여기 도로 만들지 마세요 — App.pageOf · App.flowBox 를 그대로 쓰면 됩니다.
     ▸ 이 파일 안의 옛 호출(pageOf(...))이 그대로 돌도록 별칭만 둡니다. */
  var pageOf = App.pageOf, flowBox = App.flowBox;

  /* ------------------------- 기간 계산 ------------------------- */
  function rangeOf(student) {
    var pf = student.portfolio || { rangeId: 'm1' };
    var today = App.todayKey();
    if (pf.rangeId === 'term' || pf.rangeId === 'custom') {
      return { from: pf.start || App.addMonths(today, -4), to: pf.end || today };
    }
    var r = App.DATA.ranges.filter(function (x) { return x.id === pf.rangeId; })[0] || App.DATA.ranges[0];
    return { from: App.addMonths(today, -(r.months || 1)), to: today };
  }
  App.portfolioRange = rangeOf;

  /* ------------------------- 전시판형 ------------------------- */
  C.BoardSheet = function (p) {
    var s = p.student, d = p.data;
    return html`<div class="sheet" style=${{ padding: '20px 22px' }}>
      <div class="row" style=${{ alignItems: 'flex-start' }}>
        <div style=${{ width: 62, height: 62, borderRadius: '999px', border: '3px solid #8a6a4e', overflow: 'hidden', flex: '0 0 auto' }}>
          <${C.AvatarArt} student=${s} /></div>
        <div class="grow">
          <div class="sheet-title">나의 여가</div>
          <div class="sheet-meta">${s.name} · ${App.fmtDateShort(d.from)} ~ ${App.fmtDateShort(d.to)}</div>
        </div>
        <div class="star-badge">전시할 일기 ${d.exhibited.length}개</div>
      </div>

      <div style=${{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: '12px', marginTop: '12px' }}>
        <div class="stack">
          <div>
            <h3 style=${{ fontSize: '1rem', fontWeight: 900, marginBottom: '.3rem' }}>대표 활동 사진</h3>
            <div class="exh-grid" style=${{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              ${d.photoIds.slice(0, 6).map(function (id) {
                return html`<${C.PhotoBox} key=${id} photoId=${id} />`;
              })}
              ${!d.photoIds.length && html`<div class="photo empty">사진이 아직 없어요</div>`}
            </div>
          </div>
          <div>
            <h3 style=${{ fontSize: '1rem', fontWeight: 900, marginBottom: '.3rem' }}>나의 일기 · 한마디</h3>
            <!-- ★ **학생이 쓴 글은 나눔바른펜** (2026-08-29 · 선생님 말씀 —
                   「전시판형에서 출력할 때도 나눔바른펜이 설정된 부분은
                   나눔바른펜으로 인쇄 다 되도록, 다른 인쇄창과 동일하게」).
                   여기만 그냥 「small」 이라 기본 글꼴로 나왔습니다.
                 ▸ 「say」 를 붙이면 다른 인쇄와 같은 글꼴이 됩니다
                   (css 의 나눔바른펜 규칙에 이 이름이 함께 걸려 있습니다).
                 ⛔ 날짜·활동 이름(굵은 줄)에는 붙이지 마세요 — 그것은
                   **이름표**이지 학생이 쓴 글이 아닙니다. -->
            ${d.exhibited.slice(0, 2).map(function (dy) {
              return html`<div key=${dy.id} class="banner" style=${{ marginBottom: '.4rem' }}>
                <b>${App.fmtDateShort(dy.date)} · ${(App.act(dy.activityId) || {}).name || ''}</b>
                <div class="small say" style=${{ marginTop: '.2rem' }}>${App.sentences.diaryBody(dy)}</div>
              </div>`;
            })}
            ${!d.exhibited.length && html`<div class="banner small">전시할 일기를 골라 주세요.</div>`}
            ${s.word && html`<div class="sentence" style=${{ fontSize: '1.05rem' }}>“${s.word}”</div>`}
          </div>
        </div>

        <div class="stack">
          <div>
            <h3 style=${{ fontSize: '1rem', fontWeight: 900, marginBottom: '.3rem' }}>좋아하는 활동</h3>
            <div class="wrap">
              ${d.likes.length ? d.likes.map(function (c) {
                return html`<span key=${c.id} class="chip like">
                  <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('heart') }} />${c.name}</span>`;
              }) : html`<span class="chip none">아직 없어요</span>`}
            </div>
          </div>
          <div>
            <h3 style=${{ fontSize: '1rem', fontWeight: 900, marginBottom: '.3rem' }}>새롭게 도전한 활동</h3>
            <div class="wrap">
              ${d.newTried.length ? d.newTried.map(function (c) {
                return html`<span key=${c.id} class="chip tried">
                  <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />${c.name}</span>`;
              }) : html`<span class="chip none">아직 없어요</span>`}
            </div>
          </div>
          <div>
            <h3 style=${{ fontSize: '1rem', fontWeight: 900, marginBottom: '.3rem' }}>나의 여가 탐험 지도</h3>
            <${C.MiniMap} student=${s} scale=${0.52} />
          </div>
        </div>
      </div>
    </div>`;
  };

  /* ------------------------- 책자형 ------------------------- */
  C.BookSheets = function (p) {
    var s = p.student, d = p.data;
    var rv = s.review || {};
    return html`<${React.Fragment}>
      <div class="book-page" style=${{ textAlign: 'center' }}>
        <div style=${{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-.05em', marginTop: '18px' }}>나의 여가</div>
        <div style=${{ fontSize: '1.1rem', fontWeight: 800, color: '#6b543f', marginTop: '.3rem' }}>
          내가 좋아하는 여가를 찾아보아요.</div>
        <div style=${{ width: 130, height: 130, margin: '18px auto', borderRadius: '999px',
            border: '4px solid #8a6a4e', overflow: 'hidden' }}>
          <${C.AvatarArt} student=${s} /></div>
        <div style=${{ fontSize: '1.6rem', fontWeight: 900 }}>${s.name}</div>
        <div class="sheet-meta" style=${{ marginTop: '.4rem' }}>
          ${App.fmtDateLong(d.from)} ~ ${App.fmtDateLong(d.to)}</div>
      </div>

      <div class="book-page">
        <div class="sheet-title" style=${{ fontSize: '1.4rem' }}>학생 소개</div>
        <div class="rows" style=${{ marginTop: '.6rem' }}>
          <div class="row"><span class="k">이름 · 별명</span><b>${s.name}</b></div>
          <div class="row"><span class="k">일기 단계</span><b>${s.diaryLevel}단계</b></div>
          <div class="row"><span class="k">기록한 일기</span><b>${d.diaries.length}개</b></div>
          <div class="row"><span class="k">세운 계획</span><b>${d.plans.length}개</b></div>
          <div class="row"><span class="k">해본 활동</span><b>${d.tried.length}가지</b></div>
        </div>
        ${s.word && html`<div class="sentence" style=${{ marginTop: '.7rem' }}>“${s.word}”</div>`}
      </div>

      <div class="book-page">
        <div class="sheet-title" style=${{ fontSize: '1.4rem' }}>기간 동안의 활동 기록</div>
        <table class="tbl" style=${{ marginTop: '.6rem' }}>
          <thead><tr><th>날짜</th><th>활동</th><th>함께한 사람</th><th>기분</th><th>전시</th></tr></thead>
          <tbody>
            ${d.diaries.map(function (dy) {
              var a = App.act(dy.activityId), pt = App.partner(dy.partnerId);
              return html`<tr key=${dy.id}>
                <td>${App.fmtDateShort(dy.date)}</td>
                <td>${a ? a.name : ''}</td>
                <td>${pt ? pt.name : ''}</td>
                <td>${dy.moodIds.map(function (m) { return (App.mood(m) || {}).name; }).join(', ')}</td>
                <td>${dy.exhibit ? '전시' : ''}</td>
              </tr>`;
            })}
            ${!d.diaries.length && html`<tr><td colspan="5">이 기간에 쓴 일기가 없어요.</td></tr>`}
          </tbody>
        </table>
        ${d.plans.length ? html`<div style=${{ marginTop: '.7rem' }}>
          <h3 style=${{ fontSize: '1rem', fontWeight: 900 }}>내가 세운 여가 계획</h3>
          <ul style=${{ marginTop: '.3rem' }}>
            ${d.plans.map(function (pl) {
              return html`<li key=${pl.id} style=${{ fontWeight: 700, padding: '2px 0' }}>· ${App.sentences.plan(pl)}</li>`;
            })}
          </ul>
        </div>` : null}
      </div>

      ${d.exhibited.map(function (dy) {
        var a = App.act(dy.activityId), pt = App.partner(dy.partnerId);
        return html`<div key=${dy.id} class="book-page">
          <div class="row">
            <div class="grow">
              <div class="sheet-title" style=${{ fontSize: '1.3rem' }}>${dy.title || (a ? a.name : '여가 일기')}</div>
              <div class="sheet-meta">${App.fmtDateLong(dy.date)} · ${pt ? pt.name : ''} ${dy.place ? '· ' + dy.place : ''}</div>
            </div>
            <span class="star-badge">전시하고 싶은 일기</span>
          </div>
          ${dy.photoIds && dy.photoIds.length ? html`<div class="exh-grid" style=${{ marginTop: '.6rem',
              gridTemplateColumns: 'repeat(' + Math.min(3, dy.photoIds.length) + ',1fr)' }}>
            ${dy.photoIds.slice(0, 3).map(function (id) { return html`<${C.PhotoBox} key=${id} photoId=${id} />`; })}
          </div>` : null}
          <div class="sentence" style=${{ marginTop: '.6rem' }}>${App.sentences.diaryBody(dy)}</div>
          <div class="wrap" style=${{ marginTop: '.5rem' }}>
            ${dy.moodIds.map(function (m) {
              var mo = App.mood(m); if (!mo) return null;
              return html`<span key=${m} class="chip">
                <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon(mo.icon) }} />${mo.name}</span>`;
            })}
          </div>
        </div>`;
      })}

      <div class="book-page">
        <div class="sheet-title" style=${{ fontSize: '1.4rem' }}>좋아하는 활동 · 도전한 활동</div>
        <h3 style=${{ marginTop: '.6rem', fontSize: '1.05rem', fontWeight: 900 }}>좋아하는 활동</h3>
        <div class="wrap">${d.likes.length ? d.likes.map(function (c) {
          return html`<span key=${c.id} class="chip like">
            <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('heart') }} />${c.name}</span>`;
        }) : html`<span class="chip none">아직 없어요</span>`}</div>
        <h3 style=${{ marginTop: '.7rem', fontSize: '1.05rem', fontWeight: 900 }}>새롭게 도전한 활동</h3>
        <div class="wrap">${d.newTried.length ? d.newTried.map(function (c) {
          return html`<span key=${c.id} class="chip tried">
            <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />${c.name}</span>`;
        }) : html`<span class="chip none">아직 없어요</span>`}</div>
        <h3 style=${{ marginTop: '.7rem', fontSize: '1.05rem', fontWeight: 900 }}>도전하고 싶은 활동</h3>
        <div class="wrap">${d.challenges.length ? d.challenges.map(function (c) {
          return html`<span key=${c.id} class="chip challenge">
            <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('star') }} />${c.name}</span>`;
        }) : html`<span class="chip none">아직 없어요</span>`}</div>
        <h3 style=${{ marginTop: '.8rem', fontSize: '1.05rem', fontWeight: 900 }}>나의 여가 탐험 지도</h3>
        <${C.MiniMap} student=${s} scale=${0.72} />
      </div>

      <div class="book-page">
        <div class="sheet-title" style=${{ fontSize: '1.4rem' }}>마지막 돌아보기</div>
        <div class="stack" style=${{ marginTop: '.7rem' }}>
          <!-- 조사(을/를 · 이에요/예요)는 넣은 말에 맞춰 App.reviewLine 이 고릅니다.
               아직 안 쓴 줄은 밑줄만 남기고 조사도 붙이지 않습니다. -->
          ${App.reviewFramesFor(s.diaryLevel, rv).map(function (f) {
            var v = rv[f.id];
            return html`<div key=${f.id} class="sentence">
              ${v ? App.reviewLine(f, v)
                  : html`<${React.Fragment}>${f.before}<u style=${{ padding: '0 .4rem' }}>　　　　　　</u>${f.after}<//>`}
            </div>`;
          })}
        </div>
      </div>
    <//>`;
  };

  /* ------------------------- 포트폴리오 화면 ------------------------- */
  C.PortfolioScreen = function (p) {
    App.useStore();
    var student = App.store.current();
    var tab = useState('pick');     // pick | board | book
    /* 모음 넷 가운데 무엇을 볼지 — **학생이 고릅니다.**
       무엇을 보여 줄지 고르는 것도 발표의 한 부분이라서요.
       ★ `tab` 을 받아서 엽니다. 그림일기·일기 고치기에서 돌아올 때
         **떠났던 칸(나의 일기장)** 으로 돌아와야 앞 화면으로 느껴집니다. */
    /* ★ 아무것도 안 골랐으면(null) **첫 화면**입니다 — 큰 창 넷만 놓입니다.
         홈의 코너 화면과 같은 짜임이라, 학생이 이미 아는 모습입니다. */
    var folioTab = useState(function () { return (p.params && p.params.tab) || null; });
    /* 여가지도 칸에서 네 가지 표시 가운데 무엇을 보고 있는지 */
    var mapPick = useState('tried');   // tried | like | challenge | unsure
    var mapPageS = useState({});       // 실내·실외 창이 지금 몇 쪽을 보고 있는지
    var diaryPageS = useState(0);      // 일기장이 지금 몇 쪽을 보고 있는지
    var mapViewS = useState('list');   // 여가지도 칸 : list(모아 보기) | board(지도에 붙이기)
    var boardPickS = useState(null);   // 지도에서 지금 고른 카드 (크기 바꾸기·빼기)
    var boardPageS = useState(0);      // 아직 안 붙인 활동 서랍의 쪽
    var showS = useState(false);    // 교실 TV 전시 모드
    var planOpenS = useState(null);    // 눌러서 열어 본 계획 (계획표 창)
    var planPageS = useState(0);       // 계획 칸이 지금 몇 쪽을 보고 있는지
    /* 나의 한마디 — 일기와 **같은 세 단계**. 처음에는 그 학생의 일기 단계로 엽니다. */
    var meLvS = useState(function () { return (student && student.diaryLevel) || 1; });
    var meRowS = useState('r1');       // 돌아보기에서 지금 채우고 있는 줄
    var mePartS = useState('word');    // 보는 쪽 : word(한마디) | review(돌아보기)
    var meSlotS = useState('act');     // 한마디에서 채우는 자리 : act | mood
    var mePageS = useState({});        // 고르는 칸이 지금 몇 쪽을 보고 있는지
    var range = rangeOf(student);

    var data = useMemo(function () {
      var diaries = App.store.diariesInRange(student.id, range.from, range.to);
      /* ⛔ **앞으로 할 계획도 넣어야 합니다** (2026-08-23).
           계획의 `date` 는 **활동을 할 날**입니다. 기간은 「한 달 전 ~ 오늘」 이라,
           내일 이후로 잡은 계획은 `date > to` 가 되어 통째로 빠졌습니다.
           그래서 방금 계획을 세우고 왔는데도 포트폴리오에 「아직 없어요」 라고
           나왔습니다. (계획은 앞날을 잡는 것이니 미래 날짜가 오히려 정상입니다)
         ▸ 그래서 **세운 날**(createdAt)로도 한 번 더 봅니다.
           이 기간에 세운 계획이면 활동일이 언제든 내 기록입니다. */
      var plans = App.store.plans(student.id).filter(function (x) {
        if (x.date >= range.from && x.date <= range.to) return true;
        var made = x.createdAt ? App.dateKey(new Date(x.createdAt)) : null;
        return !!(made && made >= range.from && made <= range.to);
      });
      var statusMap = App.store.mapOf(student.id);
      var cards = App.visibleCards(student);
      var likes = cards.filter(function (c) { return (statusMap[c.id] || {}).like; });
      var challenges = cards.filter(function (c) { return (statusMap[c.id] || {}).challenge; });
      var tried = cards.filter(function (c) { return (statusMap[c.id] || {}).tried; });
      var unsure = cards.filter(function (c) { return (statusMap[c.id] || {}).unsure; });
      /* 이 기간에 처음 해본 활동 = 기간 안 일기에 나오고, 기간 이전 일기에는 없던 활동 */
      var before = {};
      App.store.diaries(student.id).forEach(function (d) {
        if (d.date < range.from) before[d.cardId] = true;
      });
      var newIds = {};
      diaries.forEach(function (d) { if (!before[d.cardId]) newIds[d.cardId] = true; });
      var newTried = cards.filter(function (c) { return newIds[c.id]; });
      var exhibited = diaries.filter(function (d) { return d.exhibit; });
      var photoIds = [];
      exhibited.concat(diaries).forEach(function (d) {
        (d.photoIds || []).forEach(function (id) { if (photoIds.indexOf(id) < 0) photoIds.push(id); });
      });
      return { from: range.from, to: range.to, diaries: diaries, plans: plans, likes: likes,
               challenges: challenges, tried: tried, unsure: unsure, newTried: newTried,
               exhibited: exhibited, photoIds: photoIds };
    }, [student, range.from, range.to, App.store.get()]);

    function setDate(k, v) {
      var pf = Object.assign({}, student.portfolio || {});
      pf[k] = v;
      App.store.updateStudent(student.id, { portfolio: pf });
    }

    /* 기간·인쇄·전시판형 — **기본이 켬**입니다.
       ★ 예전에는 기본이 숨김이라, 켜는 곳을 모르면 기간을 바꾸거나 인쇄할 길이
         아예 없었습니다. 포트폴리오는 인쇄해서 붙이는 것이 목적인데
         그 길이 막혀 있으면 화면이 무엇을 하는 곳인지 알 수 없습니다.
       ⚠ `!== false` 로 봅니다. 예전에 만든 학생 자료에는 이 값이 아예 없어서
         `!!` 로 보면 **여전히 꺼진 것으로** 읽힙니다. */
    var folioTools = !(student && student.folioTools === false);
    var view = folioTools ? tab[0] : 'pick';

    /* ★ **전시판형에도 지도를 가로 한 장으로 덧붙입니다** (2026-08-29 · 선생님 말씀 —
         「전시판형에서 나의 여가 탐험지도가 … 작아서 안 보임 … 책자 안의
          구성과 동일하게 따로 가로로 하는 건 어때?」)
       전시판형 오른쪽 칸의 작은 지도(MiniMap 0.52배)는 **어디에 무엇이 있는지
       읽히지 않습니다.** 지도는 가로로 넓어서(1671:941) 세로 쪽 한 귀퉁이에
       넣으면 늘 작아집니다.
     ▸ 그래서 전시판형 한 장 **뒤에 가로 한 장**을 더 냅니다. 벽에 나란히
       붙이면 왼쪽은 요약, 오른쪽은 지도가 됩니다.
     ▸ 붙인 활동이 하나도 없으면 덧붙이지 않습니다 — 빈 종이가 나가면 안 됩니다.
     ⛔ 쪽 크기는 print.css 의 `@page mapA4L` 이 정합니다 (A4 가로).
       낱장으로 뽑는 `내 지도`·`빈 지도` 는 그대로 A3 가로입니다. */
    /* ⚠ **함수로 둡니다 — 여기서 바로 셈하면 안 됩니다.**
         `printMapBoard()` 는 아래쪽에서 `var` 로 정하는 것들(MARK_ORDER 등)을
         씁니다. 여기서 곧바로 부르면 그 값이 아직 `undefined` 라
         **화면이 통째로 죽습니다** (「잠깐 쉬었다 할게요」 창).
       ▸ 함수로 두면 실제로 그릴 때 불리므로, 그때는 모두 정해져 있습니다.
       ⛔ 이 파일에서 위쪽에 무언가를 더할 때는 **아래 var 를 쓰는지** 보세요.
         function 선언은 끌어올려지지만 **var 의 값은 끌어올려지지 않습니다.** */
    function printableNode() {
      if (view === 'book') return html`<${C.BookSheets} student=${student} data=${data} />`;
      var boardMap = Object.keys(boardLayout()).length
        ? html`<div class="board-map">${printMapBoard()}</div>` : null;
      return html`<${React.Fragment}>
        <${C.BoardSheet} student=${student} data=${data} />
        ${boardMap}
      <//>`;
    }

    function doPrint() { App.printNode(printableNode()); }

    /* --------------- 나의 여가 일기장 ---------------
       기간 안의 그림일기를 A4 여러 쪽으로 한꺼번에 인쇄합니다.
       하루하루 쌓인 그림일기가 그대로 한 권이 됩니다. */
    var bookDiaries = data.diaries;
    /* 교실 TV 전시 : 전시하기로 고른 기록만. 아직 없으면 이 기간의 일기 전부 */
    var showList = data.exhibited.length ? data.exhibited : data.diaries;
    function printJournal(mode) {
      if (!bookDiaries.length) { App.ui.toast('이 기간에 쓴 일기가 없어요.'); return; }
      App.printNode(html`<div class="pd-book">
        ${bookDiaries.map(function (d) {
          /* ⛔ `showHint` 를 함께 넘깁니다 — 인쇄에는 힌트 보기 단추가 없으므로
               「힌트 보고 쓰기」로 뽑을 때는 늘 켜져 있어야 합니다.
               (picdiary.js 의 printBook 과 같은 규칙) */
          return html`<div key=${d.id} class="pd-page">
            <${C.PicDiarySheet} diary=${d} student=${student} trace=${mode}
              showHint=${mode === 'empty'} />
          </div>`;
        })}
      </div>`);
    }

    /* --------------- 내가 세운 계획 모음 ---------------
       이 기간의 계획표를 **한 장씩 이어** 인쇄합니다. 일기장 인쇄와 같은 방식이라
       (`.book-page` 가 쪽을 나눕니다) 묶으면 그대로 계획 모음집이 됩니다.
       ★ 계획표마다 **쓰기 학습지**가 함께 나옵니다 (2026-08-26 · 선생님 말씀 —
         「여가포트폴리오에서도 내가 세운 계획이 학습지 형태로 만들어진
          상태로 연결되어 출력되도록」). 계획하기 화면에서 뽑는 것과 같은
         것이라, 한 곳에서 고치면 두 곳이 함께 바뀝니다 (C.PlanWorksheet).
       ⛔ 학습지를 여기에 따로 만들지 마세요 — 언젠가 둘이 어긋납니다. */
    function printPlans() {
      if (!data.plans.length) { App.ui.toast('이 기간에 세운 계획이 없어요.'); return; }
      App.printNode(html`<div>
        ${data.plans.map(function (pl) {
          return html`<div key=${pl.id} class="book-page plain">
            <${C.PlanSheet} plan=${pl} student=${student} />
            <${C.PlanWorksheet} plan=${pl} student=${student} />
          </div>`;
        })}
      </div>`);
    }

    /* 계획 하나를 눌러 열어 본 창 — **내가 쓴 계획표 그대로** 보여 줍니다 */
    var openPlan = planOpenS[0] ? App.store.plan(planOpenS[0]) : null;
    var planModal = openPlan && html`<${C.Modal} title="내가 세운 계획" wide=${true}
        speakText=${App.sentences.plan(openPlan)}
        onClose=${function () { planOpenS[1](null); }}
        actions=${html`<${React.Fragment}>
          <${C.Btn} icon="print" onClick=${function () {
            /* 계획표 + 쓰기 학습지 — 다른 곳에서 뽑는 것과 **같은 한 장**입니다 */
            App.printNode(html`<${React.Fragment}>
              <${C.PlanSheet} plan=${openPlan} student=${student} />
              <${C.PlanWorksheet} plan=${openPlan} student=${student} />
            <//>`);
          }}>이 계획표 인쇄하기<//>
          <${C.Btn} kind="ok" onClick=${function () { planOpenS[1](null); }}>닫기<//>
        <//>`}>
      <${C.PlanSheet} plan=${openPlan} student=${student} />
    <//>`;

    /* ══════════════ 나의 한마디 — 일기와 **같은 세 단계** ══════════════
       ★ 예전에는 세 단계 모두 **글자를 쳐 넣는 칸**뿐이었습니다. 아직 글을
         못 쓰는 1단계 학생은 여기를 아예 쓸 수 없었습니다.
       ▸ 담기는 곳은 단계와 상관없이 **한 곳**입니다 (student.word · student.review).
         그래야 전시판형 · 책자형 인쇄가 단계를 몰라도 그대로 나옵니다.
       ▸ 단계마다 다른 것은 **고르는 방법**뿐입니다.
           1단계  그림 두 개를 골라 문장이 만들어집니다
           2단계  낱말 알약을 골라 빈칸을 채웁니다 (직접 써도 됩니다)
           3단계  내 말로 씁니다 (막히면 도움말을 봅니다)
       ▸ `돌아보기` 네 줄은 세 단계가 **같은 짜임**입니다 — 왼쪽에서 채울 줄을
         고르고 오른쪽에서 넣을 것을 고릅니다. 네 줄을 한꺼번에 펼치면
         그림이 네 벌이라 화면을 넘겨 2쪽이 됩니다. */
    var meLv = meLvS[0];

    /* 고를 거리 — 이 기간에 **해 본 활동**이 먼저입니다.
       제 기록에서 고르는 것이라 남의 말이 아니라 제 말이 됩니다.
       아직 표시가 없으면 일기에 나온 활동, 그것도 없으면 우리 반 활동 전부.
       ⚠ 여덟 개로 자르지 않습니다 — 한 쪽에 여덟씩 놓고 **화살표로 넘깁니다**
         (pageOf · flowBox). 잘라 두면 뒤쪽 활동은 아예 고를 수 없었습니다. */
    function meActs() {
      var out = data.tried.slice();
      if (!out.length) {
        var seen = {};
        data.diaries.forEach(function (dy) {
          var a = App.act(dy.activityId);
          if (a && !seen[a.id]) { seen[a.id] = 1; out.push(a); }
        });
      }
      if (!out.length) out = App.visibleCards(student);
      return out;
    }
    function saveWord(v) { App.store.updateStudent(student.id, { word: v }); }
    function saveWordPick(next) {
      var wp = Object.assign({}, student.wordPick || {}, next);
      var a = App.act(wp.actId), mo = App.mood(wp.moodId);
      /* 둘 다 골랐을 때에만 문장을 만듭니다. 하나만 골랐을 때 반쪽 문장을
         넣어 두면, 인쇄한 종이에 말이 안 되는 줄이 남습니다.
         ⚠ 활동 이름은 **줄이지 않습니다.** App.shortName 을 쓰면
           `나는 수집을 할 때` 처럼 하다 만 말이 됩니다 (수집하기 → 수집).
           조사는 App.eulReul 이 이름에 맞춰 을/를 을 고릅니다. */
      var say = (a && mo)
        ? ('나는 ' + App.eulReul(a.name) + ' 할 때 ' + mo.name + '.')
        : (student.word || '');
      App.store.updateStudent(student.id, { wordPick: wp, word: say });
    }
    /* 줄에 채워 넣은 **말로 활동을 되찾습니다.**
       담기는 것은 글자(이름)뿐이라, 그림을 보여 주려면 이름으로 찾아야 합니다.
       ★ 담는 것을 id 로 바꾸지 않은 까닭 : 학생이 **직접 쓴 말**도 들어오고
         (2·3단계 직접 쓰기), 인쇄·전시판형이 이미 글자를 그대로 씁니다. */
    function actByName(nm) {
      if (!nm) return null;
      var all = App.allActivities();
      for (var i = 0; i < all.length; i++) if (all[i].name === nm) return all[i];
      return null;
    }
    /* 기분도 **쓴 말로 찾습니다** (2026-08-28) — 2단계 한마디는 낱말을 직접
       써 넣는 단계라 고른 id 가 없습니다. 목록에 있는 말이면 그림이 붙고,
       제 말로 썼으면 못 찾아 글자만 나옵니다 (그것도 맞는 모습입니다). */
    function moodByName(nm) {
      if (!nm) return null;
      var all = App.DATA.moods || [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].name === nm || all[i].past === nm) return all[i];
      }
      return null;
    }

    /* ★ **3단계는 고른 것을 칸에 써 주지 않습니다** (2026-08-24 · 선생님 말씀).
         3단계는 제 말로 쓰는 단계라, 위에서 고르면 **줄 왼쪽에 그림만** 띄우고
         칸은 비워 둡니다. 학생이 그 그림을 보고 직접 씁니다.
       ▸ 그래서 고른 활동을 `student.reviewPick` 에 **따로** 담습니다.
         `student.review` 는 학생이 쓴 글자만 담는 자리로 그대로 둡니다. */
    function saveReviewPick(id, actId) {
      var rp = Object.assign({}, student.reviewPick || {});
      rp[id] = actId;
      App.store.updateStudent(student.id, { reviewPick: rp });
    }
    function saveReview(id, v) {
      var rv = Object.assign({}, student.review || {});
      rv[id] = v;
      App.store.updateStudent(student.id, { review: rv });
    }

    /* 돌아보기 — 왼쪽 네 줄(고를 줄) + 오른쪽 채울 거리.
       ★ 줄마다 **읽어주기**를 붙입니다. 1단계 학생은 글을 못 읽으므로,
         읽어 주지 않으면 어느 줄을 고르는지 알 수가 없습니다.
       ★ 조사는 App.reviewLine 이 넣은 말에 맞춰 고릅니다
         (`나는 만들기을 좋아해요` 처럼 되지 않게). */
    /* ═══════════ 나의 한마디 · 돌아보기 — 세 단계가 **같은 짜임** ═══════════
       ★ 화면을 왼쪽 기둥 · 오른쪽 마당으로 나눕니다.
           왼쪽  무엇을 하는 칸인지(알약) · 지금 채우는 자리(알약) · **누구의 것인지**
           오른쪽 고르는 것(4개씩 2줄 + 양쪽 화살표) · 만들어지는 문장
         세 단계가 같은 자리를 쓰므로, 단계를 옮겨도 학생이 다시 익힐 것이 없습니다.
       ▸ 다른 것은 **고르는 방법**뿐입니다 : 그림(1) · 낱말(2) · 내 말(3).
       ▸ 한마디와 돌아보기는 **한 번에 하나만** 봅니다 (맨 위 줄 작은 탭).
         3단계도 나눕니다 — 둘을 함께 두면 무엇을 하는 화면인지 흐려집니다. */

    /* 왼쪽 기둥 — 무엇을 하는 칸인지 · 지금 채우는 자리 · 누구의 것인지 */
    /* ⚠ 예전에는 왼쪽 기둥 하나(meSide)에 알약과 나 캐릭터를 함께 담았습니다.
         지금은 **바 둘**로 나뉘어, 알약은 위 바 · 나 캐릭터는 아래 바에
         각각 들어갑니다. 그래서 그 함수는 지웠습니다. */

    /* 고르는 칸 — 넘치면 양쪽 화살표.
         낱말(2·3단계) : 3개씩 2줄 = 여섯 개
         그림(1단계)   : **4개씩 한 줄** — 줄이 하나뿐이라 그림을 크게 담습니다.
                        1단계 학생에게는 그림이 크고 개수가 적어야 합니다. */
    function mePicks(key, list, render, label, per, gridCls) {
      var info = pageOf(list, mePageS[0][key], per);
      return flowBox(info, function (n) {
        var next = Object.assign({}, mePageS[0]); next[key] = n;
        mePageS[1](next);
      }, gridCls || 'me-picks', info.items.map(render), label);
    }

    /* 만들어지는 한마디 — 고를 때마다 여기서 문장이 자랍니다 */
    function meSayBar() {
      var say = student.word || '나는 　　　 할 때 　　　.';
      /* ★ **고른 그림을 문장 위에 함께** 보여 줍니다 (2026-08-24 · 선생님 말씀 —
             「돌아보기처럼 문장과 그림이 같이 나왔으면」).
           1단계 학생은 글을 못 읽습니다. 글자만 있으면 자기가 무엇을 골라
           어떤 한마디를 만들었는지 알 길이 없었습니다. 돌아보기 네 줄에는
           이미 그림이 붙어 있는데 한마디에만 없었습니다.
         ▸ 고른 것이 있을 때만 나옵니다. 3단계처럼 직접 써 넣으면 짝이 되는
           그림이 없으므로 문장만 나옵니다 (자리도 차지하지 않습니다). */
      /* ⛔ **3단계에는 그림을 넣지 않습니다** (2026-08-24 · 선생님 말씀).
           3단계는 낱말을 고르는 것이 아니라 **제 말로 직접 쓰는** 단계입니다.
           고른 낱말 그림이 위에 남아 있으면 「이대로 쓰라」는 것처럼 보여
           오히려 방해가 됩니다. 1·2단계에서만 그림이 나옵니다. */
      var lv = meLvS[0];
      var wp = student.wordPick || {};
      var act = wp.actId ? App.act(wp.actId) : null;
      var mood = wp.moodId ? App.mood(wp.moodId) : null;

      /* ★ **3단계는 「틀 없이 내 말로 써요」** 입니다 (2026-08-24 · 선생님 말씀).
           그래서 문장을 만들어 주지 않습니다. 고른 것은 **글자 알약 둘**로만
           나란히 두어 도움말 삼고, 그 아래 흰 바에 학생이 제 말로 씁니다.
         ⛔ 3단계에 노란 문장 바(만들어진 한마디)를 두지 마세요. 완성된 문장이
            눈앞에 있으면 학생이 그대로 베껴 쓰게 되어, 「내 말로」가 아닙니다.
         ⛔ 그림도 두지 않습니다 — 알약 글자만으로 충분하고, 그림까지 있으면
            「이대로 쓰라」는 것처럼 보입니다. */
      if (lv === 3) {
        return html`<div class="me-saybar me-free">
          ${(act || mood) && html`<div class="me-hintpills">
            ${act && html`<span class="me-hintpill">${act.name}</span>`}
            ${mood && html`<span class="me-hintpill">${mood.name}</span>`}
          </div>`}
        </div>`;
      }
      var artRow = (act || mood) && html`<div class="me-sayart">
        ${act && html`<span class="me-sayart-one">
          <span class="me-sayart-pic"><${C.ActivityArt} activity=${act} /></span>
          <b>${App.shortName(act) || act.name}</b></span>`}
        ${mood && html`<span class="me-sayart-one">
          <span class="me-sayart-pic"><${C.MoodArt} mood=${mood} /></span>
          <b>${mood.name}</b></span>`}
      </div>`;

      /* ★ **2단계는 「빈칸을 채워 문장을 완성해요」** 입니다 (2026-08-24).
           그래서 문장을 대신 완성해 주지 않습니다. 위 그림을 보고 학생이
           **칸에 직접 써 넣습니다.** 아래에 따로 있던 「직접 쓰기」 칸은
           같은 일을 두 번 하게 만들어 지웠습니다.
         ▸ 쓴 것은 그때그때 이어 붙여 `student.word` 로 담깁니다 —
           인쇄와 모음 화면은 그 문장을 그대로 씁니다.
         ⛔ 1단계는 골라서 저절로 만들어지는 단계라 그대로 둡니다. */
      if (lv === 2) {
        var fill = student.wordFill || {};
        function saveFill(k, v) {
          var next = Object.assign({}, fill); next[k] = v;
          /* ⛔ 조사 「을」 을 글자에 박아 두지 마세요 — 학생이 받침 없는 말을
               쓰면 「블록놀이을 할 때」 가 됩니다 (2026-08-28 선생님이 잡아 주심).
               빈칸일 때에는 예전처럼 「　　　을」 로 둡니다. */
          var actHead = next.act ? App.eulReul(next.act) : '　　　을';
          var made = (next.act || next.mood)
            ? ('나는 ' + actHead + ' 할 때 ' + (next.mood || '　　　') + '.')
            : '';
          App.store.updateStudent(student.id, { wordFill: next, word: made });
        }
        return html`<div class="me-saybar">
          ${artRow}
          <p class="me-say me-fill">
            <span>나는</span>
            <input class="field me-blank" value=${fill.act || ''} aria-label="무엇을 할 때"
              onChange=${function (e) { saveFill('act', e.target.value); }} />
            <!-- ⛔⛔ 조사 「을」 을 글자에 박아 두지 마세요 (2026-08-28 · 선생님
                   말씀 — 「조사 을/를」). 화면에 보이는 이 줄이 박혀 있어서,
                   받침 없는 말을 쓰면 「노래 부르기 **을** 할 때」 가 됐습니다.
                   저장되는 문장(saveFill)은 이미 고쳤는데 **보이는 줄만**
                   남아 있었습니다 — 같은 고장이 두 곳에 있었던 셈입니다.
                 ▸ 빈칸일 때에는 「을」 로 둡니다 (무엇이 올지 모르니까요).
                 ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
            <span>${(fill.act ? App.josa(fill.act, '을/를').slice(String(fill.act).length) : '을') + ' 할 때'}</span>
            <input class="field me-blank" value=${fill.mood || ''} aria-label="어떤 기분인가요"
              onChange=${function (e) { saveFill('mood', e.target.value); }} />
            <span>.</span>
          </p>
          <${C.Speak} text=${student.word || '나는 무엇을 할 때 어떤 기분이에요.'} />
        </div>`;
      }
      /* ★ **1단계는 노란 바 안에도 그림을 넣습니다** (2026-08-24 · 선생님 말씀).
           1단계는 글을 못 읽는 학생이 많습니다. 위쪽 그림과 아래 문장이
           따로 놀면 「이 글이 저 그림 이야기」라는 것을 잇지 못합니다.
           문장 속 낱말 자리에 그림을 함께 놓으면 글자와 그림이 한 줄에서
           만나 그림책처럼 읽힙니다.
         ⛔ 2·3단계에는 넣지 마세요 — 글자를 읽고 쓰는 단계입니다. */
      if (lv === 1 && act && mood) {
        return html`<div class="me-saybar">
          ${artRow}
          <p class="me-say me-say-art" aria-live="polite">
            <span>나는</span>
            <span class="me-inart"><${C.ActivityArt} activity=${act} /></span>
            <span>${App.eulReul(act.name)} 할 때</span>
            <span class="me-inart"><${C.MoodArt} mood=${mood} /></span>
            <span>${mood.name}.</span>
          </p>
          <${C.Speak} text=${say} />
        </div>`;
      }
      return html`<div class="me-saybar">
        ${artRow}
        <p class="me-say" aria-live="polite">${say}</p>
        <${C.Speak} text=${say} />
      </div>`;
    }

    /* 돌아보기 네 줄.
       ★ 줄마다 **읽어주기**를 붙입니다. 1단계 학생은 글을 못 읽으므로
         읽어 주지 않으면 어느 줄인지 알 수가 없습니다.
       ★ 조사는 App.reviewLine 이 넣은 말에 맞춰 고릅니다
         (`나는 만들기을 좋아해요` 처럼 되지 않게).
       ▸ writeIn 이면 줄 안에서 **바로 씁니다** (3단계). */
    function reviewRows(writeIn) {
      var frames = App.reviewFramesFor(meLvS[0], student.review || {});
      var cur = meRowS[0];
      var rv = student.review || {};
      return html`<div class="me-rows">
        ${frames.map(function (f) {
          var on = cur === f.id;
          var val = rv[f.id] || '';
          var say = val ? App.reviewLine(f, val) : (f.before + '무엇' + f.after);
          var tail = (val && f.josa)
            ? (f.josa.indexOf('/') >= 0 ? App.josa(val, f.josa).slice(val.length) : f.josa)
            : '';
          /* 3단계는 칸이 비어 있으므로 **따로 담아 둔 것**으로 그림을 찾습니다 */
          var got = actByName(val)
            || ((meLvS[0] === 3) ? App.act((student.reviewPick || {})[f.id]) : null);
          return html`<div key=${f.id} class=${'me-row' + (on ? ' on' : '')}>
            <!-- ★ 채워 넣은 활동의 **그림을 줄 맨 왼쪽에 크게**.
                   1단계 학생은 글을 못 읽습니다. 그림이 없으면 어느 줄에
                   무엇을 넣었는지 소리로 들어야만 알 수 있었습니다.
                   왼쪽에 두면 네 줄을 훑을 때 그림만 따라가면 됩니다.
                 ▸ 학생이 직접 쓴 말이면 짝이 되는 활동이 없어 그림도 없습니다.
                   그때도 줄이 어긋나지 않게 **빈 자리는 남겨 둡니다**. -->
            <span class=${'me-row-art' + (got ? '' : ' none')}
                  role=${got ? 'img' : null} aria-label=${got ? got.name : null}>
              ${got && html`<${C.ActivityArt} activity=${got} />`}</span>
            ${writeIn
              ? html`<span class="me-row-txt">
                  <span>${f.before}</span>
                  <input class="field me-row-in" value=${val}
                    onFocus=${function () { meRowS[1](f.id); }}
                    onChange=${function (e) { saveReview(f.id, e.target.value); }} />
                  <span>${tail + f.after}</span>
                </span>`
              : html`<button type="button" class="me-row-txt"
                    aria-pressed=${on ? 'true' : 'false'}
                    onClick=${function () { meRowS[1](f.id); }}>
                  <span>${f.before}</span>
                  <span class=${'blank' + (val ? ' on' : '')}>${val || '　　　'}</span>
                  <span>${tail + f.after}</span>
                <//>`}
            <${C.Speak} text=${say} />
          </div>`;
        })}
      </div>`;
    }

    /* 나의 한마디 + 돌아보기를 **한 장에 함께** 인쇄합니다.
       둘은 하나의 마무리 글이라, 따로 내면 종이가 둘로 갈라집니다. */
    function printMe() {
      var rv = student.review || {};
      /* ★ **이름·날짜가 맨 위** (2026-08-28 · 선생님이 보내 주신 차례대로).
           이름과 기간은 **종이 한 장 전체**의 것이고, 「나의 한마디」는
           「돌아보기」와 나란한 **한 묶음의 이름표**입니다. 차례가 뒤바뀌어
           있으면 「나의 한마디」가 종이 제목처럼 보여, 아래 「돌아보기」와
           층이 어긋납니다.
         ▸ 이름·날짜 → [나의 한마디] 상자 → [돌아보기] 상자 */
      return html`<div class="sheet me-sheet">
        <div class="sheet-meta">${student.name} · ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)}</div>
        <div class="sheet-title">나의 한마디</div>
        <!-- ★ **노란 바 안에 그림도 함께** (2026-08-24 · 선생님 말씀).
               글자만 있는 종이는 제 것으로 보이지 않습니다. 고른 활동 · 기분
               그림을 문장 옆에 나란히 두면, 집에 가져가서도 제 한마디를
               그림으로 알아봅니다.
             ★ **2단계도 함께** (2026-08-28 · 선생님 말씀 — 「2단계도 그림과
               같이 제시되기」). 2단계는 낱말을 **직접 써 넣는** 단계라
               고른 id 가 없습니다. 그래서 **쓴 말로 그림을 찾습니다**
               (actByName · moodByName) — 목록에 있는 말이면 그림이 붙고,
               제 말로 썼으면 글자만 나옵니다.
             ⛔ 3단계는 글자만 냅니다 — 문장을 통째로 제 말로 쓰는 단계라
               낱말 자리가 없습니다.
             ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
        <div class="sentence me-print-say">
          ${(function () {
            var lv = ((student && student.diaryLevel) || 1);
            if (lv === 3) return null;
            var a, mo;
            if (lv === 1) {
              var wp = student.wordPick || {};
              a = wp.actId ? App.act(wp.actId) : null;
              mo = wp.moodId ? App.mood(wp.moodId) : null;
            } else {
              var fl = student.wordFill || {};
              a = actByName(fl.act);
              mo = moodByName(fl.mood);
            }
            if (!a && !mo) return null;
            return html`<span class="me-print-art">
              ${a && html`<span class="me-print-pic"><${C.ActivityArt} activity=${a} /></span>`}
              ${mo && html`<span class="me-print-pic"><${C.MoodArt} mood=${mo} /></span>`}
            </span>`;
          })()}
          <span class="me-print-txt">${student.word || '　'}</span>
        </div>
        <!-- ★ **돌아보기도 나의 한마디처럼 그림과 함께** (2026-08-26 ·
               선생님 말씀 — 「1단계 돌아보기도 나의 한마디처럼 같은 구성으로」).
               화면에서는 줄마다 그림이 있었는데 **인쇄에만 빠져 있어서**,
               집에 가져간 종이는 글자뿐이었습니다. 글을 못 읽는 학생에게는
               제 기록으로 보이지 않습니다.
             ★ **2단계도 함께** (2026-08-28 · 선생님 말씀 — 「2단계도 그림과
               같이 제시되기」). 위 한마디와 **같은 규칙**입니다 — 쓴 말이
               목록에 있으면 그림이 붙고, 제 말로 썼으면 글자만 나옵니다.
             ⛔ 3단계는 글자만 냅니다 — 문장을 통째로 제 말로 쓰는 단계입니다. -->
        <!-- ⚠ 여백은 CSS(.me-sheet .sheet-title)가 잡습니다 — 여기에 인라인으로
               적어 두면 그 규칙을 이겨서, 한 장 안의 사이가 들쭉날쭉해집니다. -->
        <div class="sheet-title">돌아보기</div>
        <!-- ★ 돌아보기 네 줄을 **한 상자** 안에 넣습니다 (2026-08-28 ·
               선생님 말씀 — 「너무 박스가 많아. 돌아보기를 한박스로 두고
               그 안에서 문장들이 나오게하고 문장들 간격을 두었으면 해」).
               예전에는 줄마다 점선 상자라 한 장에 상자가 다섯이었습니다.
             ▸ 상자는 하나, 안에서 문장끼리만 사이를 띄웁니다.
             ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
        <div class="sentence me-review">
          ${App.reviewFramesFor(student.diaryLevel, rv).map(function (f) {
            var txt = App.reviewLine(f, rv[f.id]);
            /* ★ **1·2단계 모두** 그림을 붙입니다 (2026-08-28 · 선생님 말씀 —
                 「2단계도 그림과 같이 제시되기」).
                 쓴 말이 활동 목록에 있으면 그 그림이 붙고, 제 말로 썼으면
                 못 찾아 글자만 나옵니다 — 그것도 맞는 모습입니다.
               ⛔ 3단계는 글자만 냅니다 (문장을 통째로 제 말로 쓰는 단계). */
            var lvN = ((student && student.diaryLevel) || 1);
            var got = (lvN !== 3) ? (actByName(rv[f.id])
              || App.act((student.reviewPick || {})[f.id])) : null;
            return html`<div key=${f.id} class="me-review-ln">
              ${got && html`<span class="me-print-art">
                <span class="me-print-pic"><${C.ActivityArt} activity=${got} /></span>
              </span>`}
              <span class="me-print-txt">
                ${txt || html`<${React.Fragment}>${f.before}
                  <u style=${{ padding: '0 .5rem' }}>　　　　　　</u>${f.after}<//>`}
              </span>
            </div>`;
          })}
        </div>
      </div>`;
    }

    /* ══════════ 지도에 붙이기 — 학생이 **직접 놓는** 여가 탐험 지도 ══════════
       ★ 「모아 보기」 는 몇 가지 했는지 **세는** 곳이고, 여기는 그것이 내 지도
         어디에 있는지 **놓아 보는** 곳입니다. 하는 일이 달라 칸을 나눕니다.
       ▸ 끌어 옮기기 · 크기 바꾸기는 그림일기의 것과 **같은 장치**입니다
         (자리는 % 로 담습니다 — 지도를 줄여 보여 줘도 손끝과 그림이 함께 갑니다).
       ▸ 담는 곳 : student.mapLayout = { 활동id: {x, y, s} }
       ▸ 테두리 색은 **대표 표시 하나**로 정하고, 표시가 여럿이면 카드 귀퉁이에
         작은 그림을 함께 붙입니다. 테두리를 여러 색으로 나누면 무슨 뜻인지
         알아보기 어렵습니다. */
    var MARK_ORDER = ['tried', 'like', 'challenge', 'unsure'];
    function boardLayout() { return (student && student.mapLayout) || {}; }
    function saveBoard(next) { App.store.updateStudent(student.id, { mapLayout: next }); }
    function placeCard(id, pos) {
      var cur = boardLayout();
      var next = {};
      Object.keys(cur).forEach(function (k) { next[k] = cur[k]; });
      next[id] = Object.assign({}, next[id] || {}, pos);
      saveBoard(next);
    }
    function removeCard(id) {
      var cur = boardLayout();
      var next = {};
      Object.keys(cur).forEach(function (k) { if (k !== id) next[k] = cur[k]; });
      saveBoard(next);
      if (boardPickS[0] === id) boardPickS[1](null);
    }
    /* 표시한 활동만 붙일 수 있습니다 — 지도는 **내가 표시한 것**을 담는 곳입니다 */
    function boardCards() {
      var st = App.store.mapOf(student.id);
      return App.visibleCards(student).filter(function (c) {
        var s = st[c.id];
        return s && (s.tried || s.like || s.challenge || s.unsure);
      });
    }
    /* 대표 표시 하나 (해봤어요 → 좋아해요 → 도전 → 모르겠어요 차례) */
    function mainMark(cardId) {
      var s = App.store.mapOf(student.id)[cardId] || {};
      for (var i = 0; i < MARK_ORDER.length; i++) if (s[MARK_ORDER[i]]) return MARK_ORDER[i];
      return null;
    }
    function allMarks(cardId) {
      var s = App.store.mapOf(student.id)[cardId] || {};
      return App.DATA.mapStates.filter(function (m) { return s[m.id]; });
    }

    var boardRef = useRef(null);
    /* 마우스(또는 손가락)로 끌어 옮기기.
       ⚠ 자리를 px 로 재면 지도를 줄여 보여 줄 때 어긋납니다. 잰 **칸 크기**에
         대고 퍼센트로 셈해야 어디서 보든 손끝과 그림이 같이 움직입니다.
         (그림일기의 startDrag 와 같은 방법입니다 — picdiary.js) */
    function startBoardDrag(e, id) {
      var box = boardRef.current; if (!box) return;
      e.preventDefault();
      var el = e.currentTarget, last = null;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      function move(ev) {
        var r = box.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var x = Math.max(6, Math.min(94, (ev.clientX - r.left) / r.width * 100));
        var y = Math.max(8, Math.min(92, (ev.clientY - r.top) / r.height * 100));
        el.style.left = x + '%'; el.style.top = y + '%';
        last = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
      }
      function up() {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        if (last) placeCard(id, last);
      }
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    }

    /* 완성한 지도를 **A3 가로**로 냅니다.
       ★ 지도는 가로로 넓고(1671:941) 카드가 여럿 올라가므로, A4 로는 카드
         글씨가 너무 작아집니다. A3 가로면 교실 벽에 붙일 만한 크기가 됩니다.
       ▸ 쪽 크기는 print.css 의 **이름 붙인 쪽**(`@page mapA3`)이 정합니다.
       ▸ 자리는 화면과 같은 % 라서, 학생이 놓은 그대로 나옵니다. */
    function printMapBoard() {
      var layout = boardLayout();
      var mine = boardCards().filter(function (c) { return layout[c.id]; });
      return html`<div class="map-print">
        <div class="map-print-head">
          <b class="map-print-title">나만의 여가 지도</b>
          <span class="map-print-who">${student.name} · ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)}</span>
        </div>
        <div class="map-print-board">
          ${App.IMAGE_BASE.mapBoard && html`<img class="mb-bg"
            src=${App.imgUrl(App.IMAGE_BASE.mapBoard)} alt="" />`}
          <span class="mb-isle in">여가 섬(실내)</span>
          <span class="mb-isle out">여가 섬(실외)</span>
          ${mine.map(function (c) {
            var pos = layout[c.id];
            var mk = mainMark(c.id);
            return html`<span key=${c.id} class=${'mb-card mk-' + (mk || 'none')}
                style=${{ left: pos.x + '%', top: pos.y + '%', '--mbs': pos.s || 1 }}>
              <span class="mb-art"><${C.ActivityArt} activity=${c} /></span>
              <span class="mb-nm">${App.shortName(c) || c.name}</span>
              <span class="mb-marks">
                ${allMarks(c.id).map(function (m) {
                  return html`<span key=${m.id} class="mb-mark"><${C.StateArt} state=${m} /></span>`;
                })}
              </span>
            </span>`;
          })}
        </div>
        <!-- 테두리 색이 무슨 뜻인지 — 종이만 보고도 알 수 있게 -->
        <div class="map-print-legend">
          ${App.DATA.mapStates.map(function (m) {
            return html`<span key=${m.id} class=${'mpl mk-' + m.id}>
              <span class="mpl-art"><${C.StateArt} state=${m} /></span>${m.name}</span>`;
          })}
        </div>
      </div>`;
    }

    /* ══════════ 종이로 하기 — 빈 지도(A3) + 활동 라벨(A4) ══════════
       ★ 화면에서 끌어 붙이는 것과 **같은 일을 종이로** 합니다.
         빈 지도를 A3 로 뽑아 벽에 붙이고, 활동 라벨을 떼어 손으로 붙입니다.
         손으로 붙이는 일은 화면보다 오래 남고, 여럿이 함께 볼 수 있습니다.

       ▸ 라벨 규격 : **A4 · 5열 x 8줄 · 한 칸 37 x 32mm** (한 장에 40칸)
         · 활동은 40가지(실내 20 · 실외 20)라 **한 장에 딱 들어갑니다.**
         · 3열 x 5줄(111 x 160mm)이면 A3 지도의 **섬 하나(약 129 x 173mm)**
           안에 15개가 들어갑니다 — 그래서 이 크기를 골랐습니다.
         ⚠ **한 장에 다 뽑히는 것과, 섬에 다 붙는 것은 다릅니다.**
           섬 하나에는 15개쯤 붙습니다. 40개를 다 뽑아 두고 **그 가운데
           골라 붙이시면** 됩니다 — 안 뽑힌 활동은 고를 수조차 없습니다.
         · 여백은 좌우 12.5mm · 위아래 20.5mm (210-5x37)/2, (297-8x32)/2.
       ⚠ 라벨지를 사기 전에 **가지고 계신 것의 칸 크기를 꼭 맞춰** 보세요.
         칸 수만 같고 크기가 다른 제품이 많습니다.

       ⛔ 40칸은 **LS-3102**(47 x 26.9mm · 4열 x 10줄) 입니다.
          LS-3104 는 판매처마다 `27칸 · 62.7 x 30.1mm
          (바코드용)` 으로 적혀 있습니다. 그 크기로는 가로 3장이 188mm 라
          섬 하나(약 129mm)에 15개가 들어가지 않습니다.
       ▸ 그래서 **규격을 고를 수 있게** 해 두었습니다. 가지고 계신 라벨지에
         맞는 것을 고르면 그 칸에 맞춰 인쇄됩니다. */
    var LABEL_KINDS = [
      { id: 'ls3102', nm: '폼텍 LS-3102 · 40칸 · 47×26.9mm',
        note: '한 장에 40개가 딱 들어갑니다. 섬에는 3열×5줄로 15개쯤 붙습니다. (권장)',
        cols: 4, rows: 10, w: 47, h: 26.9, mx: 11, my: 14 },
      { id: 'w48', nm: '48칸 · 33×33mm',
        note: '한 장에 40개가 들어갑니다. 칸이 작은 대신 섬 안에 넉넉히 들어갑니다.',
        cols: 6, rows: 8, w: 33, h: 33, mx: 6, my: 16.5 },
      { id: 'ls3104', nm: '폼텍 LS-3104 · 27칸 · 62.7×30.1mm',
        note: '두 장에 나누어 나옵니다. 칸이 넓어 섬에는 2열까지만 붙습니다.',
        cols: 3, rows: 9, w: 62.7, h: 30.1, mx: 10.95, my: 13.05 },
      { id: 'ls3106', nm: '폼텍 LS-3106 · 24칸 · 64×34mm',
        note: '두 장에 나누어 나옵니다. 칸이 넓어 섬에는 2열까지만 붙습니다.',
        cols: 3, rows: 8, w: 64, h: 34, mx: 9, my: 12.5 }
    ];
    function labelKind() {
      var want = (student && student.labelKind) || 'ls3102';
      return LABEL_KINDS.filter(function (k) { return k.id === want; })[0] || LABEL_KINDS[0];
    }

    /* 빈 지도 — 섬 이름표만 있고 활동은 없습니다 (손으로 붙일 종이) */
    function printEmptyMap() {
      return html`<div class="map-print">
        <div class="map-print-head">
          <b class="map-print-title">나만의 여가 지도</b>
          <span class="map-print-who">이름 ______________</span>
        </div>
        <div class="map-print-board">
          ${App.IMAGE_BASE.mapBoard && html`<img class="mb-bg"
            src=${App.imgUrl(App.IMAGE_BASE.mapBoard)} alt="" />`}
          <span class="mb-isle in">여가 섬(실내)</span>
          <span class="mb-isle out">여가 섬(실외)</span>
        </div>
        <div class="map-print-legend">
          ${App.DATA.mapStates.map(function (m) {
            return html`<span key=${m.id} class=${'mpl mk-' + m.id}>
              <span class="mpl-art"><${C.StateArt} state=${m} /></span>${m.name}</span>`;
          })}
        </div>
      </div>`;
    }

    /* 활동 라벨 한 장 — 실내 15 + 실외 15, 남는 칸은 빈 칸으로 둡니다 */
    /* ★ 라벨은 **세 벌**이 이어서 나옵니다 (2026-08-26 · 선생님 말씀 —
         「그림만 있는것 1장, 두번째 장에 그림+글자 1장, 세번째 장에 글자만
          1장짜리로 구성해서 3장으로 이어지게」).
       ▸ 학생마다 붙일 수 있는 것이 다릅니다 —
           그림만   글을 아직 못 읽는 학생 (그림으로 알아봅니다)
           그림+글자 그림을 보며 글자를 익히는 학생
           글자만   글을 읽는 학생 (그림이 없어야 스스로 읽습니다)
       ⛔ 세 벌을 **한 장에 섞지** 마세요 — 라벨지는 한 장이 통째로 떼어져
          나가므로, 한 벌이 한 장을 다 차지해야 골라 쓸 수 있습니다.
       ⚠ 활동이 라벨 한 장 칸 수를 넘으면 각 벌이 여러 장이 됩니다.
          그때도 **벌 차례(그림 → 그림+글자 → 글자)** 는 그대로입니다. */
    var LABEL_FACES = [
      { id: 'art',  cls: 'only-art',  art: true,  name: false },
      { id: 'both', cls: '',          art: true,  name: true },
      { id: 'name', cls: 'only-name', art: false, name: true }
    ];

    /* ⛔ 예전에는 `.slice(0, 15)` 로 **앞에서 15개씩**만 뽑았습니다.
         활동이 실내 15 · 실외 15 이던 때의 숫자인데, 20 · 20 으로 늘리고도
         그대로 남아 **10개 활동에 라벨이 아예 안 나왔습니다** —
         보드게임하기 · 그림 그리기 · 요가하기 · 체조하기 · 춤추기 ·
         캠핑하기 · 책 읽기 · 영화 보기 · 그림 감상하기 · 전시 구경하기.
         책 읽기 · 영화 보기처럼 자주 쓰는 것까지 빠져, **종이로 하는 학생만
         고를 수 있는 활동이 좁아졌습니다.**
       ▸ 이제 **40개를 다 뽑습니다.** 기본 라벨지(폼텍 LS-3102)가 한 장에
         40칸이라 딱 들어갑니다. 칸이 적은 라벨지를 고르시면 벌마다 두 장이
         되는데, 그때도 벌 차례(그림 → 그림+글자 → 글자)는 그대로입니다.
       ⚠ **숫자를 코드에 박아 두면 활동이 늘 때 소리 없이 어긋납니다.**
         빠진 것을 알려 주는 것이 없어 선생님이 종이를 뽑아 봐야 압니다.
       ⚠ **글자만** 벌에서는 `책 읽기` 와 `노래 부르기` 가 각각 **두 장**
         똑같이 나옵니다. 실내·실외에 일부러 같은 이름을 둔 활동이라
         (그림으로만 가릅니다 · 41-7), 글자만으로는 구별되지 않습니다.
         두 장 가운데 아무 것이나 그 섬에 붙이시면 됩니다. */
    function printLabels() {
      var K = labelKind();
      var list = App.topCards('indoor').concat(App.topCards('outdoor'));
      var per = K.cols * K.rows;
      var sheets = Math.max(1, Math.ceil(list.length / per));
      var pages = [];
      LABEL_FACES.forEach(function (kind) {
        for (var s = 0; s < sheets; s++) {
          var cells = [];
          for (var i = 0; i < per; i++) cells.push(list[s * per + i] || null);
          pages.push({ kind: kind, cells: cells, key: kind.id + s });
        }
      });
      return html`<${React.Fragment}>
        ${pages.map(function (pg) {
          return html`<div key=${pg.key} class=${'lb-sheet ' + pg.kind.cls} style=${{
              paddingTop: K.my + 'mm', paddingLeft: K.mx + 'mm',
              gridTemplateColumns: 'repeat(' + K.cols + ', ' + K.w + 'mm)',
              gridAutoRows: K.h + 'mm' }}>
            ${pg.cells.map(function (c, i) {
              if (!c) return html`<span key=${'e' + i} class="lb-cell empty"></span>`;
              return html`<span key=${c.id} class=${'lb-cell ' + (c.area === 'indoor' ? 'in' : 'out')}>
                ${pg.kind.art && html`<span class="lb-art"><${C.ActivityArt} activity=${c} /></span>`}
                ${pg.kind.name && html`<span class="lb-nm">${c.name}</span>`}
              </span>`;
            })}
          </div>`;
        })}
      <//>`;
    }

    /* 지도에 붙이기 화면 한 벌 */
    function mapBoardBody() {
      var layout = boardLayout();
      var all = boardCards();
      var placed = all.filter(function (c) { return layout[c.id]; });
      var left = all.filter(function (c) { return !layout[c.id]; });
      var info = pageOf(left, boardPageS[0], 3);
      var picked = boardPickS[0];

      function card(c, pos) {
        var mk = mainMark(c.id);
        var marks = allMarks(c.id);
        var s = (pos && pos.s) || 1;
        return html`<span key=${c.id}
            class=${'mb-card mk-' + (mk || 'none') + (picked === c.id ? ' picked' : '')}
            style=${{ left: pos.x + '%', top: pos.y + '%', '--mbs': s }}
            onPointerDown=${function (e) { startBoardDrag(e, c.id); }}
            onClick=${function () { boardPickS[1](picked === c.id ? null : c.id); }}
            role="img" aria-label=${c.name + '. ' + marks.map(function (m) { return m.name; }).join(', ')}>
          <span class="mb-art"><${C.ActivityArt} activity=${c} /></span>
          <span class="mb-nm">${App.shortName(c) || c.name}</span>
          <span class="mb-marks">
            ${marks.map(function (m) {
              return html`<span key=${m.id} class="mb-mark" title=${m.name}
                ><${C.StateArt} state=${m} /></span>`;
            })}
          </span>
        </span>`;
      }

      return html`<${React.Fragment}>
        <!-- ★ 지도 — 학생이 활동을 **직접 끌어다 놓는** 곳.
               자리는 % 로 담으므로 화면 크기가 달라져도 그대로 있습니다. -->
        <div class="mb-wrap">
          <div class="mb-board" ref=${boardRef}>
            ${App.IMAGE_BASE.mapBoard && html`<img class="mb-bg"
              src=${App.imgUrl(App.IMAGE_BASE.mapBoard)} alt="" />`}
            <!-- 섬 이름표 — **하늘 자리**에 둡니다. 섬 그림을 가리지 않으면서
                 어느 쪽이 실내이고 실외인지 한눈에 알려 줍니다.
                 색은 앱이 이미 쓰는 실내=주황 · 실외=파랑 그대로입니다. -->
            <span class="mb-isle in">여가 섬(실내)</span>
            <span class="mb-isle out">여가 섬(실외)</span>
            ${placed.map(function (c) { return card(c, layout[c.id]); })}
          </div>
        </div>


        <!-- 고른 카드가 있을 때만 크기 바꾸기 · 떼어내기가 나옵니다 -->
        <div class=${'mb-tools' + (picked ? '' : ' off')} aria-hidden=${picked ? 'false' : 'true'}>
          <${C.Btn} size="small" className="pastel-blue" icon="shrink"
            onClick=${function () {
              var cur = (boardLayout()[picked] || {}).s || 1;
              placeCard(picked, { s: Math.max(0.6, Math.round((cur - 0.2) * 10) / 10) });
            }}>작게<//>
          <${C.Btn} size="small" className="pastel-blue" icon="expand"
            onClick=${function () {
              var cur = (boardLayout()[picked] || {}).s || 1;
              placeCard(picked, { s: Math.min(2, Math.round((cur + 0.2) * 10) / 10) });
            }}>크게<//>
          <${C.Btn} size="small" className="pastel-red" icon="back"
            onClick=${function () { removeCard(picked); }}>지도에서 빼기<//>
        </div>

        <!-- 아직 안 붙인 활동 서랍 — 셋씩, 넘치면 양쪽 화살표 -->
        <div class="mb-tray">
          <!-- 안내는 **서랍 안**에 둡니다. 지도 아래에 따로 한 줄을 두면
               그만큼 지도가 작아지고, 안내가 가리키는 곳과도 멀어집니다. -->
          <div class="mb-tray-head">
            <span class="mb-tray-cap">붙일 활동</span>
            <span class="mb-say">아래 활동을 선택하여 지도에 붙여 보아요.</span>
          </div>
          ${left.length
            ? flowBox(info, function (n) { boardPageS[1](n); }, 'mb-tray-grid',
                info.items.map(function (c) {
                  var mk = mainMark(c.id);
                  return html`<button key=${c.id} type="button" class=${'mb-pick mk-' + (mk || 'none')}
                      onClick=${function () {
                        /* 지도 가운데쯤에 놓습니다 — 붙인 뒤 끌어서 옮기면 됩니다 */
                        placeCard(c.id, { x: 30 + (placed.length % 5) * 10,
                                          y: 32 + (Math.floor(placed.length / 5) % 3) * 18, s: 1 });
                        boardPickS[1](c.id);
                        App.speakFor(student, c.name);
                      }}>
                    <span class="mb-art"><${C.ActivityArt} activity=${c} /></span>
                    <span class="mb-nm">${App.shortName(c) || c.name}</span>
                  </button>`;
                }), '붙일 활동')
            : html`<p class="muted small" style=${{ margin: '.3rem 0' }}>
                표시한 활동을 모두 붙였어요.</p>`}
        </div>
      <//>`;
    }

    /* ══════════ 나의 여가 포트폴리오 책자 — **네 코너를 한 권으로** ══════════
       ★ 코너마다 따로 인쇄하면 종이가 네 뭉치로 흩어집니다. 이 코너는 원래
         모아 두는 곳이므로, **한 번에 이어서** 낼 수 있어야 묶어서 한 권이 됩니다.
         차례 : 표지 → 내가 세운 계획 → 나의 여가지도 → 나의 일기장 → 나의 한마디
       ▸ 쪽 나누기는 `.book-page`(종이 한 장)와 `.pd-page`(그림일기 A4)가 맡습니다
         (print.css 의 break-after:page).
       ▸ 아무것도 없는 코너는 **건너뜁니다** — 빈 종이가 끼면 묶을 때 헷갈립니다. */
    function bookMapSheet() {
      var statusMap = App.store.mapOf(student.id);
      var cards = App.visibleCards(student).filter(function (c) {
        var s = statusMap[c.id];
        return s && (s.tried || s.like || s.challenge || s.unsure);
      });
      if (!cards.length) return null;
      var sides = [{ k: 'indoor', nm: '실내', cls: 'in' }, { k: 'outdoor', nm: '실외', cls: 'out' }];
      return html`<div class="sheet">
        <div class="sheet-title">나의 여가지도</div>
        <div class="sheet-meta">${student.name} · ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)}</div>
        ${sides.map(function (side) {
          var mine = cards.filter(function (c) { return c.area === side.k; });
          return html`<div key=${side.k} class="bk-side">
            <div class="bk-side-head">
              <span class=${'folio-where ' + side.cls}>${side.nm}</span>
              <b>${mine.length}가지</b>
            </div>
            ${mine.length ? html`<div class="bk-grid">
              ${mine.map(function (c) {
                var s = statusMap[c.id] || {};
                var on = App.DATA.mapStates.filter(function (m) { return s[m.id]; });
                return html`<div key=${c.id} class="bk-card">
                  <span class="bk-art"><${C.ActivityArt} activity=${c} /></span>
                  <span class="bk-nm">${c.name}</span>
                  <span class="bk-marks">
                    ${on.map(function (m) {
                      return html`<span key=${m.id} class="bk-mark" title=${m.name}
                        ><${C.StateArt} state=${m} /></span>`;
                    })}
                  </span>
                </div>`;
              })}
            </div>` : html`<p class="muted small">아직 없어요.</p>`}
          </div>`;
        })}
      </div>`;
    }

    function printBook() {
      var mapSheet = bookMapSheet();
      return html`<div>
        <!-- 표지 — 누구의 책인지, 어느 기간인지, 무엇이 담겼는지 -->
        <div class="book-page bk-cover">
          <!-- ★ 바탕은 앱의 **민트 벽지**입니다 — 표지를 넘기면 나오는 화면과
                 같은 결이라, 이 책이 이 앱의 것임이 한눈에 보입니다.
               ⛔ css 배경(background-image)으로 두지 마세요. 인쇄에서 통째로
                 빠집니다 (인수인계 15-24). **진짜 그림**을 깔아야 합니다.
               ▸ 벽지는 640x640 짜리 **무늬 한 장**이라, 3칸 x 5줄로 이어 붙여
                 표지를 채웁니다. 그 위에 흰 막을 덮어 글자가 묻히지 않게 합니다. -->
          <!-- ⚠ App.uiImage 는 IMAGE_BASE.ui 안만 봅니다. 벽지는 **맨 바깥**에
                 있으므로 App.imgUrl 로 주소를 만들어야 합니다. -->
          ${App.IMAGE_BASE.wallpaper && html`<${React.Fragment}>
            <span class="bk-cover-bg" aria-hidden="true">
              ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(function (i) {
                return html`<img key=${i} src=${App.imgUrl(App.IMAGE_BASE.wallpaper)} alt="" />`;
              })}
            </span>
            <span class="bk-cover-veil" aria-hidden="true"></span>
          <//>`}
          <div class="bk-cover-face"><${C.AvatarArt} student=${student} /></div>
          <div class="bk-cover-title">나의 여가 포트폴리오</div>
          <div class="bk-cover-name">${student.name}</div>
          <div class="bk-cover-range">
            ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)}</div>
          <div class="bk-cover-list">
            <div>내가 세운 계획 · ${data.plans.length}장</div>
            <div>나의 여가지도 · ${data.tried.length}가지</div>
            <div>나의 일기장 · ${data.diaries.length}장</div>
            <div>나의 한마디</div>
          </div>
        </div>

        <!-- 책자 안의 계획표에도 **쓰기 학습지**가 함께 붙습니다
             (2026-08-26). 세 곳(계획하기 · 포트폴리오 계획 모음 · 이 책자)이
             모두 C.PlanWorksheet 하나를 씁니다. -->
        ${data.plans.map(function (pl) {
          return html`<div key=${'p' + pl.id} class="book-page plain">
            <${C.PlanSheet} plan=${pl} student=${student} />
            <${C.PlanWorksheet} plan=${pl} student=${student} />
          </div>`;
        })}

        <!-- ★ 학생이 **직접 붙인 지도**가 있으면 그것을 책에 넣습니다.
               제 손으로 놓은 지도가 목록보다 훨씬 제 것 같습니다.
             ▸ 아직 안 붙였으면 목록 쪽(bookMapSheet)을 그대로 냅니다. -->
        <!-- ⛔ **테두리는 하나만** (2026-08-28 · 선생님 말씀 — 「쓸데없이 겹두줄
               테두리 하나만 테두리하기」). 계획표에서 이미 겪은 것과 같습니다.
               속에 든 것(지도 · 한마디 종이)이 **이미 제 테두리**를 가지고
               있어서, 쪽 테두리까지 그리면 두 겹으로 보입니다.
             ▸ 「plain」 은 쪽 나누기는 그대로 두고 **선만** 뺍니다.
             ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
        ${Object.keys(boardLayout()).length
          ? html`<div class="book-page plain">${printMapBoard()}</div>`
          : (mapSheet && html`<div class="book-page plain">${mapSheet}</div>`)}

        ${data.diaries.map(function (d) {
          return html`<div key=${'d' + d.id} class="pd-page">
            <${C.PicDiarySheet} diary=${d} student=${student} trace="text" />
          </div>`;
        })}

        <div class="book-page plain">${printMe()}</div>
      </div>`;
    }

    function meBody() {
      var acts = meActs();
      var moods = App.moodsFor(student);
      var wp = student.wordPick || {};
      var mePart = mePartS[0];
      var slot = meSlotS[0];
      var rv = student.review || {};
      var cur = meRowS[0];

      /* 맨 위 줄 : 단계 1·2·3 + 그 단계 설명 + 한마디 / 돌아보기 */
      var lvTabs = html`<div class="wrap me-lv" style=${{ gap: '.25rem' }}>
        <span class="small" style=${{ fontWeight: 900 }}>한마디 단계</span>
        ${App.DATA.diaryLevels.map(function (lv) {
          return html`<button key=${lv.id} type="button" class=${'tab' + (meLv === lv.id ? ' on' : '')}
            style=${{ minHeight: '38px', padding: '.1rem .55rem', fontSize: '.85rem' }}
            aria-pressed=${meLv === lv.id ? 'true' : 'false'} title=${lv.desc}
            onClick=${function () { meLvS[1](lv.id); }}>${lv.id}<//>`;
        })}
        <span class="q-note">${(App.DATA.diaryLevels[meLv - 1] || {}).note || ''}</span>
        <!-- ★ 셋째 칸 「나의 한마디 모음」 — 다 쓰고 나서 **완성된 것을 함께**
               보는 자리입니다. 인쇄와 나가는 길도 여기 있습니다.
             ▸ 돌아보기 안에 따로 바를 두지 않은 까닭 : 들어가는 길이 둘이 되면
               학생이 어느 쪽이 맞는지 헷갈립니다. 셋을 나란히 두면
               「쓰기 → 쓰기 → 보기」 차례가 그대로 보입니다.
             ⛔ 이 주석 안에 백틱을 쓰지 마세요 (인수인계 2-3). -->
        <span class="me-parts">
          ${[{ id: 'word', nm: '나의 한마디' }, { id: 'review', nm: '돌아보기' },
             { id: 'done', nm: '나의 한마디 모음' }].map(function (x) {
            return html`<button key=${x.id} type="button" class=${'tab' + (mePart === x.id ? ' on' : '')}
              style=${{ minHeight: '38px', padding: '.1rem .8rem', fontSize: '.9rem' }}
              aria-pressed=${mePart === x.id ? 'true' : 'false'}
              onClick=${function () { mePartS[1](x.id); }}>${x.nm}<//>`;
          })}
        </span>
      </div>`;

      /* ── 나의 한마디 모음 ────────────────────────────────────────
         다 쓰고 나서 **완성된 것을 함께** 보는 자리입니다.
         인쇄에 나가는 종이 그대로 보여 줍니다 — 보는 것과 나오는 것이
         같아야 학생이 무엇을 인쇄하는지 압니다.
         인쇄 · 나가는 길은 흰 칸 아래 단추에 있습니다. */
      if (mePart === 'done') {
        return html`<${React.Fragment}>
          ${lvTabs}
          <div class="me-done">${printMe()}</div>
        <//>`;
      }

      /* ── 나의 한마디 ─────────────────────────────────────────────
         왼쪽에서 `무엇을 할 때` · `어떤 기분인가요` 를 고르면
         오른쪽에 그것을 고르는 칸이 나옵니다. 고른 것은 알약 안에 남습니다. */
      if (mePart === 'word') {
        var list = slot === 'act' ? acts : moods;
        /* ⚠ 여기에 「나의 한마디」 알약을 두지 않습니다. 아래 바에 이미 있고,
             맨 위 줄 제목도 「나의 한마디」 입니다 — 한 화면에 같은 말이 셋이
             되어 무엇이 무엇인지 흐려졌습니다.
             여기 남는 것은 **채우는 자리 두 알약**뿐입니다.
           ⛔ 여기는 JS 자리입니다. HTML 주석(<!-- -->)을 쓰면 문법 오류가 납니다. */
        var pills = html`<${React.Fragment}>
          ${[{ id: 'act', nm: '무엇을 할 때' }, { id: 'mood', nm: '어떤 기분인가요' }].map(function (x) {
            var on = slot === x.id;
            var got = x.id === 'act' ? App.act(wp.actId) : App.mood(wp.moodId);
            return html`<button key=${x.id} type="button" class=${'me-slot' + (on ? ' on' : '')}
                aria-pressed=${on ? 'true' : 'false'}
                onClick=${function () { meSlotS[1](x.id); }}>
              <span class="me-slot-nm">${x.nm}</span>
              ${got && html`<span class="me-slot-got">${got.name}</span>`}
            <//>`;
          })}
        <//>`;

        var picks = (meLv === 1)
          /* 1단계 — 그림을 골라 문장이 만들어집니다 */
          ? mePicks(slot, list, function (x) {
              var on = slot === 'act' ? (wp.actId === x.id) : (wp.moodId === x.id);
              return html`<${C.Pick} key=${x.id} label=${x.name} speakText=${x.name} selected=${on}
                onClick=${function () {
                  saveWordPick(slot === 'act' ? { actId: x.id } : { moodId: x.id });
                }}
                art=${slot === 'act'
                  ? html`<${C.ActivityArt} activity=${x} />`
                  : html`<${C.MoodArt} mood=${x} />`} />`;
            }, slot === 'act' ? '활동' : '기분', 4, 'me-picks four')
          /* 2·3단계 — 낱말 알약. 3단계에서는 **도움**입니다 (글은 제 말로 씁니다) */
          : mePicks(slot, list, function (x) {
              var on = slot === 'act' ? (wp.actId === x.id) : (wp.moodId === x.id);
              return html`<button key=${x.id} type="button" class=${'me-word' + (on ? ' on' : '')}
                aria-pressed=${on ? 'true' : 'false'}
                onClick=${function () {
                  saveWordPick(slot === 'act' ? { actId: x.id } : { moodId: x.id });
                }}>${x.name}<//>`;
            }, slot === 'act' ? '활동' : '기분');

        /* ★ 화면을 **바 둘**로 나눕니다 (2026-08-22).
             위 바 : 채우는 자리(왼쪽 알약) + 고르는 칸(오른쪽)
             아래 바 : 나 캐릭터(왼쪽) + 만들어지는 말(오른쪽 · 가운데 정렬)
           고르는 일과 만들어진 말을 눈으로 갈라 두면, 지금 무엇을 하는
           중인지가 분명해집니다. */
        return html`<${React.Fragment}>
          ${lvTabs}
          <!-- 채우는 자리 두 알약은 좁게 — 고르는 칸이 넓을수록 낱말이 잘 보입니다 -->
          <div class="me-bar slots">
            <div class="me-slots">${pills}</div>
            <div class="me-pickarea">${picks}</div>
          </div>
          <div class="me-bar">
            <div class="me-who">
              <span class="me-who-face"><${C.AvatarArt} student=${student} /></span>
              <b class="me-who-nm">${student.name}</b>
            </div>
            <div class="me-saycol">
              <span class="me-cap">나의 한마디</span>
              ${meSayBar()}
              <!-- ⛔ 2단계에는 이 칸을 두지 마세요. 위 노란 바가 이미
                     **빈칸을 채우는 자리**라, 같은 일을 두 번 하게 됩니다
                     (2026-08-24 · 선생님 말씀). 3단계만 씁니다. -->
              ${meLv === 3 && html`<div class="me-write wide"><${C.Field}
                label="내 말로 스스로 적어요"
                value=${student.word || ''}
                placeholder="예) 친구와 함께하는 여가가 제일 즐거워요."
                onChange=${saveWord} /></div>`}
            </div>
          </div>
        <//>`;
      }

      /* ── 돌아보기 ────────────────────────────────────────────────
         1·2단계 : 채울 줄을 고르고 → 오른쪽에서 넣을 것을 고릅니다.
         3단계   : 네 줄에 **바로 씁니다.** 위 칸은 도움으로 남습니다. */
      var rPicks = (meLv === 1)
        ? mePicks('rv', acts, function (a) {
            return html`<${C.Pick} key=${a.id} label=${a.name} speakText=${a.name}
              selected=${(rv[cur] || '') === a.name}
              onClick=${function () { saveReview(cur, a.name); App.speakFor(student, a.name); }}
              art=${html`<${C.ActivityArt} activity=${a} />`} />`;
          }, '활동', 4, 'me-picks four')
        : mePicks('rv', acts, function (a) {
            /* ⛔ 3단계는 이름을 칸에 넣지 않습니다 — 그림만 띄웁니다 */
            var picked = (meLv === 3)
              ? ((student.reviewPick || {})[cur] === a.id)
              : ((rv[cur] || '') === a.name);
            return html`<button key=${a.id} type="button"
              class=${'me-word' + (picked ? ' on' : '')}
              onClick=${function () {
                if (meLv === 3) saveReviewPick(cur, a.id);
                else saveReview(cur, a.name);
              }}>${a.name}<//>`;
          }, '활동');

      return html`<${React.Fragment}>
        ${lvTabs}
        <!-- 돌아보기의 위 바는 **고르는 칸만** 있습니다. 채울 자리는 아래
             네 줄에서 고르므로, 왼쪽에 알약을 둘 까닭이 없습니다.
             왼쪽 칸을 비워 두면 그만큼 카드가 좁아지므로 한 칸으로 폅니다. -->
        <div class="me-bar wide">
          <div class="me-pickarea">${rPicks}</div>
        </div>
        <div class="me-bar">
          <div class="me-who">
            <span class="me-who-face"><${C.AvatarArt} student=${student} /></span>
            <b class="me-who-nm">${student.name}</b>
          </div>
          <div class="me-saycol">
            <span class="me-cap">돌아보기</span>
            ${reviewRows(meLv === 3)}
          </div>
        </div>
      <//>`;
    }

    /* --------------- 기간 표시 ---------------
       기간을 바꾸는 단추는 '선생님 설정 → 포트폴리오' 한 곳에만 두었습니다.
       학생 화면에는 지금 어느 기간을 보고 있는지만 글로 알려 줍니다. */
    /* ══════════ 선생님 도구는 **창 하나**에 모읍니다 ══════════
       ★ 예전에는 기간 바 · 일기장 바 · 판형 탭이 학생 화면 **위에 층층이** 쌓였습니다.
         1366x768 에서 상단바 72 + 기간 52 + 일기장 197 + 모음 113 + 내용 213
         + 한마디 125 + 돌아보기 295 = 화면을 훌쩍 넘겨 **좌우 3쪽**으로 갈라졌고,
         학생이 화살표로 넘겨야 제 것을 다 볼 수 있었습니다.
       ▸ 인쇄 · 판형 · 기간은 **선생님 일**입니다. 학생 화면에서 빼고 창으로 모으면
         학생 화면은 한 쪽에 들어가고, 학생이 할 일도 분명해집니다.
       ▸ 학생 화면에는 **지금 어느 기간을 보고 있는지**만 작게 남깁니다. */
    var toolsS = useState(false);

    var toolsModal = toolsS[0] && html`<${C.Modal} title="선생님 도구" wide=${true}
        onClose=${function () { toolsS[1](false); }}
        actions=${html`<${C.Btn} kind="ok" onClick=${function () { toolsS[1](false); }}>닫기<//>`}>
      <div class="banner ok">
        <b>지금 보는 기간</b> : ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)}
        <span class="chip" style=${{ marginLeft: '.4rem' }}>일기 ${data.diaries.length}개</span>
        <span class="chip">전시 ${data.exhibited.length}개</span>
        <div class="small muted" style=${{ marginTop: '.3rem' }}>
          기간을 바꾸려면 선생님 설정 → 포트폴리오 에서 고릅니다.</div>
      </div>

      <${C.Sec} title="나의 일기장 인쇄">
        <p class="muted small">
          이 기간에 쓴 그림일기 <b>${bookDiaries.length}장</b>을 A4 여러 쪽으로 한꺼번에 인쇄해요.
          묶으면 그대로 한 권이 됩니다.
        </p>
        <!-- 가장 자주 쓰는 것 하나만 크게. 판형 둘은 작게 곁들입니다.
             넷이 같은 크기로 늘어서 있으면 무엇이 중요한지 보이지 않습니다. -->
        <div class="wrap" style=${{ marginTop: '.4rem' }}>
          <${C.Btn} kind="primary" icon="print" disabled=${!bookDiaries.length}
            onClick=${function () { printJournal('text'); }}>일기장 인쇄하기<//>
          <${C.Btn} size="small" icon="print" disabled=${!bookDiaries.length}
            onClick=${function () { printJournal('trace'); }}>따라쓰기 판<//>
          <${C.Btn} size="small" icon="print" disabled=${!bookDiaries.length}
            onClick=${function () { printJournal('empty'); }}>빈칸 판<//>
        </div>
      <//>

      <${C.Sec} title="모아서 인쇄 · 전시">
        <div class="wrap">
          <${C.Btn} icon="print" onClick=${function () { tab[1]('board'); toolsS[1](false); }}>
            전시판형 보기<//>
          <${C.Btn} icon="print" onClick=${function () { tab[1]('book'); toolsS[1](false); }}>
            책자형 보기<//>
          <${C.Btn} icon="expand" disabled=${!showList.length}
            onClick=${function () { toolsS[1](false); showS[1](true); }}>
            교실 TV 전시 (${showList.length}장)<//>
        </div>
        <div class="small muted" style=${{ marginTop: '.4rem' }}>
          교실 TV 전시는 저절로 넘어가요. ← → 로도 넘길 수 있어요.</div>
      <//>

      <!-- ★ 종이로 하기 — 화면에서 끌어 붙이는 것과 **같은 일을 종이로**.
             빈 지도를 A3 로 뽑아 벽에 붙이고, 활동 라벨을 떼어 손으로 붙입니다.
           ▸ 인쇄 준비는 **선생님 일**이라 학생 화면이 아니라 여기에 둡니다. -->
      <${C.Sec} title="종이로 하기 — 빈 지도 · 활동 라벨">
        <p class="muted small">
          <b>빈 여가 지도</b>는 A3 가로 한 장으로, <b>활동 라벨</b>은 A4 한 장에 40가지가 나옵니다.
        </p>
        <div class="wrap" style=${{ marginTop: '.4rem' }}>
          <${C.Btn} icon="print" onClick=${function () {
            toolsS[1](false); App.printNode(printEmptyMap());
          }}>빈 여가 지도 (A3 가로)<//>
          <${C.Btn} icon="print" onClick=${function () {
            toolsS[1](false); App.printNode(printLabels());
          }}>활동 라벨 40개 (A4)<//>
        </div>
        <!-- 가지고 계신 라벨지에 맞춰 고릅니다. 고른 것은 학생별로 저장됩니다. -->
        <div class="wrap" style=${{ marginTop: '.55rem', alignItems: 'center' }}>
          <span class="small" style=${{ fontWeight: 900 }}>라벨지 규격</span>
          ${LABEL_KINDS.map(function (k) {
            var on = labelKind().id === k.id;
            return html`<button key=${k.id} type="button" class=${'tab' + (on ? ' on' : '')}
              style=${{ minHeight: '38px', padding: '.1rem .7rem', fontSize: '.85rem' }}
              aria-pressed=${on ? 'true' : 'false'} title=${k.note}
              onClick=${function () { App.store.updateStudent(student.id, { labelKind: k.id }); }}>
              ${k.nm}<//>`;
          })}
        </div>
        <div class="small muted" style=${{ marginTop: '.45rem', lineHeight: 1.45 }}>
          지금 고른 규격 : <b>${labelKind().nm}</b> — ${labelKind().note}<br />
          ⚠ 40칸은 <b>LS-3102(47 × 26.9mm)</b> 이고, LS-3104 는 <b>27칸(62.7 × 30.1mm)</b> 입니다.
          라벨지를 사시기 전에 <b>칸 크기</b>를 꼭 맞춰 보세요 — 칸 수만 같고 크기가 다른 제품이 많습니다.
          라벨지가 없으면 <b>일반 종이에 뽑아 오려 붙여도</b> 됩니다.
        </div>
      <//>

      <!-- 나의 한마디 · 돌아보기는 학생이 **화면 안에서** 쓰고, 인쇄는 여기에서.
           학생 화면에 인쇄 단추를 두면 고르고 쓰는 일에서 눈이 흩어집니다. -->
      <${C.Sec} title="나의 한마디 인쇄">
        <p class="muted small">
          학생이 쓴 <b>나의 한마디</b>와 <b>돌아보기</b> 네 줄을 A4 한 장에 함께 냅니다.
        </p>
        <div class="wrap" style=${{ marginTop: '.4rem' }}>
          <${C.Btn} icon="print" onClick=${function () {
            toolsS[1](false); App.printNode(printMe());
          }}>나의 한마디 · 돌아보기 인쇄하기<//>
        </div>
      <//>
    <//>`;

    return html`<div class="app" data-corner="portfolio">
      <!-- ★ 파란 화살표는 **한 걸음씩** 되짚습니다.
             창 안에 있으면 → 포트폴리오 첫 화면으로
             첫 화면이면   → 지나온 앞 화면으로
           예전에는 창 안에서도 곧장 홈으로 튀어서, 창을 하나 열어 본 학생이
           포트폴리오 밖으로 나가 버렸습니다. -->
      <!-- ★ 창 안에서는 맨 위 줄 제목이 **그 창 이름**입니다.
             예전에는 흰 칸 안에 제목(h3)을 또 두었습니다. 읽어주기까지 붙어
             60px 을 먹었는데, 그만큼 그림이 작아졌습니다.
             나가는 알약이 「여가 포트폴리오」 라고 적혀 있으므로
             제목은 **지금 어디에 있는지**를 알려 주는 편이 낫습니다. -->
      <!-- ★ 지도를 직접 붙이는 화면에도 **제목을 되살렸습니다** (2026-08-30 ·
             선생님 : 「왼쪽 파란색 화살표 뒤에 '나의 여가지도'를 크기를 줄여서
             넣어주면 좋겠다. 없으니 또 이상하구나」).
           ⚠ 2026-08-29 에 뺐던 까닭은 **잘려서**였습니다 — 맨 위 줄에 단추가
             여덟이라 자리가 없어 '나의 ⋯' 로 끊겼습니다.
             잘린 제목은 알려 주는 것 없이 자리만 먹습니다.
           ▸ 그래서 이번에는 **글자를 줄여서**(css 의 .topbar-title.tight) 넣습니다.
             줄이면 여덟 단추와 함께 한 줄에 다 들어갑니다.
           ⚠ 여기를 다시 지우지 마세요. 지울 것이 아니라 **줄일 것**이었습니다. -->
      <${C.TopBar} title=${(folioTab[0] === 'map' && mapViewS[0] === 'board')
          ? '나의 여가지도'
          : (view === 'pick' && folioTab[0])
          ? (FOLIO_TABS.filter(function (t) { return t.id === folioTab[0]; })[0] || {}).name
          : '여가 포트폴리오'}
        titleTight=${folioTab[0] === 'map' && mapViewS[0] === 'board'}
        onBack=${function () {
          if (view === 'pick' && folioTab[0]) { folioTab[1](null); return; }
          p.back("home");
        }}
        backLabel=${(view === 'pick' && folioTab[0]) ? '포트폴리오 첫 화면으로' : '앞 화면으로'}
        onTitle=${function () { p.nav("home"); }}>
        <!-- ⛔ 읽어주기는 **지금 보이는 화면**을 말해야 합니다 (2026-08-26 ·
               선생님 말씀 — 「스피커 말 내용이 화면과 맞지 않아」).
               예전에는 어느 화면에서나 「전시하고 싶은 일기를 골라 보세요」를
               읽었습니다. 첫 화면은 **네 칸을 고르는 곳**이고 전시 고르기는
               「나의 일기장」 안에 있어서, 학생이 시키는 대로 해도 그런 것이
               화면에 없었습니다.
             ▸ 창 안에 들어가 있으면 그 창 이름을, 첫 화면이면 네 칸을 말합니다. -->
        <${C.Speak} text=${(function () {
          var 기간 = App.fmtDateShort(data.from) + '부터 ' + App.fmtDateShort(data.to) + '까지';
          /* 인쇄 판형을 보는 중 */
          if (view === 'book') return '책자형이에요. 종이를 넘기며 보는 모양으로 인쇄해요.';
          if (view === 'board') return '전시판형이에요. 교실에 붙이는 모양으로 인쇄해요.';
          /* 첫 화면 — 네 칸 고르기 */
          if (!folioTab[0]) {
            return '나의 여가 포트폴리오. ' + 기간 + '의 기록이에요. '
              + '내가 세운 계획, 나의 여가지도, 나의 일기장, 나의 한마디 가운데 '
              + '보고 싶은 것을 눌러 보세요.';
          }
          /* 창 안 */
          if (folioTab[0] === 'plan') {
            return data.plans.length
              ? '내가 세운 계획이에요. ' + 기간 + ' 계획 ' + data.plans.length + '장이 있어요. '
                + '누르면 계획표를 볼 수 있어요.'
              : '내가 세운 계획이에요. 아직 세운 계획이 없어요. 여가 계획하기에서 계획을 세워 보세요.';
          }
          if (folioTab[0] === 'map') {
            if (mapViewS[0] === 'board') {
              return '나만의 여가 지도를 만들어요. 아래 활동을 잡아서 섬 위로 끌어다 놓아 보세요.';
            }
            return '나의 여가지도예요. 해봤어요 ' + data.tried.length + '가지, '
              + '좋아해요 ' + data.likes.length + '가지, '
              + '도전하고 싶어요 ' + data.challenges.length + '가지를 표시했어요.';
          }
          if (folioTab[0] === 'diary') {
            return data.diaries.length
              ? '나의 일기장이에요. 일기 ' + data.diaries.length + '개가 있어요. '
                + '전시하고 싶은 일기를 골라 보세요. 지금 ' + data.exhibited.length + '개를 골랐어요.'
              : '나의 일기장이에요. 아직 쓴 일기가 없어요. 여가 일기에서 일기를 써 보세요.';
          }
          if (folioTab[0] === 'me') {
            return mePartS[0] === 'done'
              ? '나의 한마디를 다 썼어요. 인쇄해서 붙여 보세요.'
              : '나의 한마디예요. 여가를 하고 나서 든 생각을 한 문장으로 남겨 보세요.';
          }
          return '나의 여가 포트폴리오. ' + 기간 + '의 기록이에요.';
        })()} />
        <!-- 창 안에 있거나 판형을 보는 중일 때만 돌아갈 길을 둡니다.
             첫 화면에는 나갈 길이 파란 화살표 하나뿐이라야 헷갈리지 않습니다. -->
        ${folioTools && tab[0] !== 'pick' && html`<${C.Btn} size="small" icon="back"
          onClick=${function () { tab[1]('pick'); }}>포트폴리오로 돌아가기<//>`}
        <!-- 「지도에 붙이기」 는 **맨 위 줄**에 이름표와 돌아가는 알약을 둡니다.
             흰 칸 안에 두면 그만큼 지도가 작아집니다 — 이 화면에서 가장 커야
             하는 것은 지도입니다. -->
        <!-- ★ 인쇄 알약 셋은 **늘 보입니다** (2026-08-23).
               예전에는 「학생 화면에 도구 보이기」 를 끄면 함께 숨었습니다.
               그런데 그 스위치가 꺼진 줄 모르는 선생님은 **종이 지도를 아예
               찾지 못했습니다.** 눌러도 인쇄 창이 열릴 뿐 지워지는 것이 없으니,
               찾기 쉬운 쪽이 낫습니다.
             ▸ 「내 지도」 는 학생이 붙인 그대로, 「빈 지도」 와 「활동 라벨」 은
               손으로 붙이는 종이입니다. -->
        ${tab[0] === 'pick' && folioTab[0] === 'map' && mapViewS[0] === 'board'
          && html`<${React.Fragment}>
            <!-- ⛔ 종이 크기(· A3 · A4)를 단추에 적지 마세요 (2026-08-26).
                   알약 셋이 넓어져 **제목을 밀어내 잘랐습니다**
                   (「나의 여가지도」 → 「나의 …」). 종이 크기는 인쇄 창이
                   알려 주고, 아래 「종이로 하기」 칸에도 적혀 있습니다. -->
            <${C.Btn} size="small" icon="print" className="pastel-yellow"
              onClick=${function () { App.printNode(printMapBoard()); }}>내 지도<//>
            <${C.Btn} size="small" icon="print" className="pastel-blue"
              onClick=${function () { App.printNode(printEmptyMap()); }}>빈 지도<//>
            <${C.Btn} size="small" icon="print" className="pastel-blue"
              onClick=${function () { App.printNode(printLabels()); }}>활동 라벨<//>
          <//>`}
        <!-- ⛔ **나가는 알약은 folioTools 로 가리지 마세요.**
               「학생 화면에 도구 보이기」 는 **선생님 도구**를 숨기는 스위치입니다.
               나가는 길까지 함께 숨겼더니, 그 스위치를 끈 학생은 지도에 붙이기
               화면에서 나갈 알약이 하나도 없었습니다 (파란 화살표만 남았습니다).
               인쇄는 선생님 것이지만 **나가는 길은 학생 것**입니다. -->
        ${tab[0] === 'pick' && folioTab[0] === 'map' && mapViewS[0] === 'board'
          && html`<${C.Btn} size="small" icon="back" className="pastel-pink"
            onClick=${function () { mapViewS[1]('list'); }}>모아 보기로<//>`}
        <!-- ⚠ 지도에 붙이기 화면에서는 이 단추를 빼 둡니다.
               인쇄 알약 셋 + 「모아 보기로」 와 함께 놓이면 맨 위 줄이 두 줄로
               접혀서 지도가 그만큼 작아집니다. 나가는 길은 「모아 보기로」 하나로
               충분합니다 (거기에 이 단추가 다시 있습니다). -->
        ${tab[0] === 'pick' && folioTab[0]
          && !(folioTab[0] === 'map' && mapViewS[0] === 'board')
          && html`<${C.Btn} size="small" icon="back"
            className="pastel-pink" onClick=${function () { folioTab[1](null); }}>
            여가 포트폴리오<//>`}
        ${folioTools && tab[0] === 'pick' && !folioTab[0] && html`<${C.Btn} size="small" icon="gear"
          className="pastel-blue" onClick=${function () { toolsS[1](true); }}>선생님 도구<//>`}
      <//>

      <!-- 흰 칸 맨 아래 단추
             · 판형을 보는 중  → 그 판형 인쇄하기 (선생님 일)
             · 나의 한마디 창  → **한마디와 돌아보기를 함께 인쇄** + 나의 여가로 돌아가기
                                 둘은 하나의 마무리 글이라 한 장에 같이 냅니다.
                                 여기가 포트폴리오의 **마지막 칸**이라 나가는 길도 둡니다.
             · 그 밖         → 없음 (학생 것과 선생님 것을 섞지 않습니다) -->
      <!-- ★ **상자는 첫 화면에만** (2026-08-29 · 선생님 말씀 —
           「여긴 큰 상자가 있으면 좋겠다」).
         상자가 하는 일은 「여기까지가 한 묶음」이라고 말해 주는 것입니다.
         ▸ 첫 화면 : 나 카드와 네 칸이 가운데 오밀조밀 모이고 둘레가 텅 빕니다.
           상자가 다섯을 한 묶음으로 잡아 주어 허공에 뜬 것처럼 보이지 않습니다.
         ▸ 칸에 들어간 뒤 : 내용이 이미 폭을 다 씁니다. 그때 상자는 아무것도
           묶어 주지 못하고 테두리만 하나 더 그립니다 — 그래서 벗깁니다.
         ⛔ 이것은 화면마다 취향으로 정하는 것이 아니라 **내용이 폭을 다 쓰는가**
           로 정합니다. 새 칸을 더할 때도 그 잣대로 보세요. -->
      <${C.Stage} bare=${!(view === 'pick' && !folioTab[0])} action=${(folioTools && view !== 'pick')
        ? html`<${C.Btn} kind="primary" icon="print" onClick=${doPrint}>
            ${view === 'book' ? '책자형 인쇄하기' : '전시판형 인쇄하기'}<//>`
        /* ★ 나의 한마디 창은 **모음 칸에서만** 아래 단추를 둡니다.
             고르고 쓰는 칸에는 두지 않습니다 — 화면 안에서 고르고 쓰는
             일에만 눈이 가야 합니다. 다 쓰고 모음 칸에 오면 그때
             인쇄하고 나갑니다 (`쓰기 → 쓰기 → 보기·인쇄`). */
        : (view === 'pick' && folioTab[0] === 'me' && mePartS[0] === 'done')
        ? html`<${React.Fragment}>
            <${C.Btn} kind="primary" icon="print"
              onClick=${function () { App.printNode(printMe()); }}>
              나의 한마디 · 돌아보기 인쇄하기<//>
            <${C.Btn} icon="back" className="pastel-pink"
              onClick=${function () { folioTab[1](null); }}>
              여가 포트폴리오로 돌아가기<//>
          <//>`
        /* ★ 일기를 **한꺼번에 인쇄하는 자리**는 여기입니다 (2026-08-22).
             예전에는 선생님 도구 창 안에만 있어서, 일기장을 보고 있어도
             모아 인쇄하는 길이 화면에 없었습니다. 지금 보고 있는 것이
             일기 모음이므로, 모아 내는 단추도 여기 있어야 합니다.
           ★ **인쇄 모양을 고를 수 있습니다** (2026-08-23).
             예전에는 `글자 그대로` 하나뿐이라, 따라쓰기 판이 필요하면
             선생님 도구 창까지 찾아 들어가야 했습니다.
           ▸ 고를 수 있는 모양은 **학생의 일기 단계마다 다릅니다.**
             목록은 picdiary.js 한 곳에서 정합니다 (App.diaryPrintModes) —
             여기에 따로 적으면 언젠가 둘이 어긋납니다.
               1단계  글자 · 따라 쓰기
               2단계  따라 쓰기 · 힌트 보고 쓰기
               3단계  내가 쓴 글 · 빈 줄 */
        : (view === 'pick' && folioTab[0] === 'diary' && data.diaries.length)
        ? html`<${React.Fragment}>
            ${(App.diaryPrintModes
                ? App.diaryPrintModes((student && student.diaryLevel) || 1)
                : [{ id: 'text', name: '글자' }]
              ).map(function (m, i) {
                return html`<${C.Btn} key=${m.id} kind=${i === 0 ? 'primary' : null}
                  className=${i === 0 ? null : 'pastel-blue'} icon="print" title=${m.desc}
                  onClick=${function () { printJournal(m.id); }}>
                  일기장 모두 인쇄 · ${m.name}<//>`;
              })}
            <span class="small muted folio-print-n">${data.diaries.length}장</span>
          <//>`
        : null}>
        ${view === 'pick' ? html`<${React.Fragment}>
          <!-- 창 안에서만 **지금 어느 기간을 보고 있는지**를 한 줄로 알려 줍니다.
               첫 화면에서는 왼쪽 「나」 칸 안에 들어가 있습니다.
               인쇄 · 판형 · 기간 고르기는 위 선생님 도구 창으로 옮겼습니다. -->
          ${(folioTools && folioTab[0]) ? html`<div class="folio-range small muted">
            ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)} 의 기록
          </div>` : null}

          <!-- ★ 포트폴리오는 **세 코너에서 만든 것을 한곳에 모아 두는 곳**입니다.
                 보관 · 전시 · 발표를 여기서 합니다.
                   ① 내가 세운 여가계획들   (계획하GO!)
                   ② 나의 여가지도          (여가지도)
                   ③ 나의 여가 일기장        (기록하GO!)
                   ④ 나의 한마디            (여기에서 쓰는 것)

               ★ 첫 화면은 **왼쪽에 「나」 · 오른쪽에 창 넷**입니다 (2줄 x 2칸).
                 창 넷은 홈의 코너 화면과 **같은 짜임**이라 학생이 아는 모습입니다.
                 창을 누르면 그 창 안으로 들어가서 거기서 활동합니다.
               ★ 왼쪽 「나」 는 **누구의 포트폴리오인지**를 알려 줍니다.
                 예전에는 맨 위 줄 오른쪽 끝의 작은 알약에만 있었습니다.
                 여기는 제 기록을 모아 두고 **남에게 보여 주는** 곳이라,
                 표지처럼 이름과 얼굴이 크게 있어야 제 것으로 느껴집니다.
                 그래서 첫 화면에서는 맨 위 줄의 알약을 빼고 이리로 옮겼습니다
                 (창 안으로 들어가면 알약이 다시 맨 위 줄에 나옵니다).
               ⚠ 예전에는 작은 알약 넷을 늘 위에 띄워 두고 그 아래에 내용을
                 함께 보였습니다. 첫 화면에 고르는 것과 고른 결과가 섞여 있어,
                 여기가 무엇을 하는 곳인지 한눈에 들어오지 않았습니다.
               ▸ 안으로 들어가면 맨 위 줄의 알약과 파란 화살표로 나옵니다. -->
          ${!folioTab[0] ? html`<div class="folio-intro">
            <div class="folio-left">
              <div class="folio-who">
                <span class="folio-who-face"><${C.AvatarArt} student=${student} /></span>
                <b class="folio-who-nm">${student.name}</b>
                <span class="folio-who-say">나의 여가 포트폴리오</span>
                ${folioTools && html`<span class="folio-who-range">
                  ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)} 의 기록</span>`}
              </div>
              <!-- ★ 네 코너를 **한 권으로** 내는 자리. 나 칸 바로 아래에 둡니다 —
                     이 책이 누구의 것인지 바로 위에 적혀 있어서 이어집니다.
                   ▸ 코너마다 따로 인쇄하면 종이가 네 뭉치로 흩어집니다.
                     여기는 원래 모아 두는 곳이라 한 번에 이어 낼 수 있어야 합니다. -->
              <${C.Btn} icon="print" className="folio-book"
                onClick=${function () { App.printNode(printBook()); }}>
                나의 여가 포트폴리오 책자<//>
            </div>
            <div class="corner-grid folio-home">
              ${FOLIO_TABS.map(function (t) {
                return html`<button key=${t.id} type="button" class="corner folio-corner"
                    onClick=${function () { folioTab[1](t.id); }}
                    aria-label=${t.name + '. ' + t.count(data, student)}>
                  <span class="art" aria-hidden="true">
                    ${t.art ? t.art() : html`<${C.Art} iconKey=${t.icon} />`}</span>
                  <span class="txt">
                    <span class="desc">${t.name}</span>
                    <span class="name">${t.count(data, student)}</span>
                  </span>
                </button>`;
              })}
            </div>
          </div>` : null}

          <!-- ★ 내가 세운 계획 — **한 줄에 넷**씩 늘어놓습니다.
                 예전에는 남는 폭에 맞춰 저절로 채웠더니(auto-fill) 화면마다
                 줄 수가 달라져, 같은 학생 것인데도 볼 때마다 모습이 달랐습니다.
               ▸ 계획을 누르면 **내가 쓴 계획표를 그대로** 창으로 보여 줍니다.
                 예전에는 계획 만들기 화면으로 넘어가서, 보려던 학생이
                 처음부터 다시 고르는 화면을 만났습니다.
               ▸ 「계획 모음 인쇄하기」 는 이 기간의 계획표를 **한 장씩 이어** 냅니다
                 (일기장 인쇄와 같은 방식 — book-page 가 쪽을 나눕니다).
             ⛔ 이 주석 안에 백틱을 쓰면 템플릿이 거기서 끊깁니다 (인수인계 2-3). -->
          ${folioTab[0] === 'plan' && html`<${C.Sec} className="sec-fit"
            title=${'내가 세운 계획 · ' + data.plans.length + '장'}
            speakText=${'내가 세운 여가계획 ' + data.plans.length + '장이에요. 누르면 계획표를 볼 수 있어요.'}>
            ${data.plans.length ? html`<${React.Fragment}>
              <!-- ★ 한 줄에 셋 · 두 줄까지(여섯 장)만 놓고, 넘치면 **양쪽 화살표**로
                     넘깁니다. 계획이 몇 장이든 화면 높이가 늘 같아서 스크롤도,
                     좌우 갈라짐도 없습니다 (여가지도 · 일기장과 같은 방식).
                   ▸ 칸은 **정사각형**이라 그림이 큽니다 — 가로로 긴 칸에
                     작은 그림이 떠 있으면 눈에 안 들어옵니다. -->
              ${(function () {
                /* ★ 한 쪽에 **셋** (2026-08-30 · 선생님 말씀 —
     「여가 계획은 그림 3개씩 배열해서 최대한 크게 스크롤 없이」).
     ⚠ 2026-08-29 에는 넷이었습니다. 셋으로 줄이면 한 장이 쓸 수 있는 폭이
       1/3 넓어지고, 카드가 정사각이라 그만큼 **그림도 커집니다.**
     ⚠ 여기 숫자와 css 의 repeat(3, …) 는 **함께** 고쳐야 합니다.
       하나만 고치면 셋만 보이는데 칸은 넷이라 오른쪽이 비거나,
       넷이 들어오는데 칸이 셋이라 한 장이 다음 줄로 내려갑니다. */
                var info = pageOf(data.plans, planPageS[0], 3);
                return flowBox(info, function (n) { planPageS[1](n); }, 'folio-grid wide folio-plans',
                  info.items.map(function (pl) {
                    var a = App.act(pl.activityId);
                    var done = !!pl.doneDiaryId;
                    return html`<button key=${pl.id} type="button" class="folio-card"
                        onClick=${function () { planOpenS[1](pl.id); }}
                        aria-label=${App.fmtDateLong(pl.date) + ' ' + (a ? a.name : '') + (done ? ', 일기까지 마쳤어요' : '') + '. 누르면 계획표를 봐요.'}>
                      <span class="folio-art"><${C.ActivityArt} activity=${a} /></span>
                      <span class="folio-name">${a ? a.name : '여가 계획'}</span>
                      <span class="folio-date">${App.fmtDateShort(pl.date)}</span>
                      ${done && html`<span class="star-badge">✓ 해봤어요</span>`}
                    </button>`;
                  }), '계획');
              })()}
              <div class="wrap" style=${{ marginTop: '.6rem', justifyContent: 'center' }}>
                <${C.Btn} kind="primary" icon="print" onClick=${printPlans}>
                  계획 모음 인쇄하기 (${data.plans.length}장)<//>
              </div>
            <//>` : html`<${C.Banner} icon="cornerPlan">
              아직 세운 계획이 없어요.
              <div class="wrap" style=${{ marginTop: '.4rem' }}>
                <${C.Btn} size="small" onClick=${function () { p.nav('plan'); }}>계획 세우러 가기<//>
              </div>
            <//>`}
          <//>`}

          <!-- ★ 나의 여가지도 — **실내·실외를 한꺼번에** 봅니다.
                 여가지도는 섬마다 따로 보는 곳이라, 합쳐서 보는 자리가
                 여기 말고는 없었습니다. 포트폴리오는 원래 모아서 보는 곳이라
                 이 자리가 알맞습니다.
               ▸ 네 가지 표시를 눌러 고르면 그 활동만 카드로 나옵니다.

               ★ 실내·실외를 **위아래 두 창으로 갈라** 놓습니다 (2026-08-22).
                 예전에는 한 덩어리로 섞어 두고 카드마다 「실내」·「실외」 딱지를
                 붙였습니다. 그러면 어느 쪽이 몇 가지인지 세어 보아야 알았습니다.
                 갈라 놓으면 **한눈에** 들어옵니다.
               ▸ 좌우가 아니라 **위아래**입니다. 좌우로 놓으면 한 창이 화면의
                 절반뿐이라 카드가 좁아지고 그림이 작아집니다. 위아래로 놓으면
                 창이 **화면 폭을 다 써서** 같은 자리에 그림을 훨씬 크게 담습니다.
               ▸ 한 창에 **여덟씩**입니다. 대표 활동은 실내 15 · 실외 15 가지라
                 가장 많을 때가 창마다 딱 **2줄**입니다 (8 + 7).
                 그래서 두 창을 합쳐도 4줄이면 끝납니다.
               ⚠ 「여가지도 보기」 단추는 뺐습니다. 여기는 **모아 보는 자리**이고,
                 지도로 가려면 홈에서 지도 코너로 들어가는 것이 제 길입니다.
             ⛔ 이 주석 안에 백틱을 쓰지 마세요 (인수인계 2-3). -->
          ${folioTab[0] === 'map' && (function () {
            var pick = mapPick[0];
            var lists = {
              tried: data.tried, like: data.likes,
              challenge: data.challenges, unsure: data.unsure
            };
            var shown = lists[pick] || [];
            /* ★ 「지도에 붙이기」 는 **이 코너에서 가장 재미있는 활동**입니다.
                 작은 탭으로 「모아 보기」 옆에 두었더니 찾기 어려웠습니다.
               → 들어오자마자 보이는 **큰 알약**으로 올리고, 눌러 보라는 뜻으로
                 잔잔한 테두리 물결을 줍니다.
               ▸ 되돌아올 때는 작은 알약이면 됩니다 — 그때는 이미 어디에
                 있는지 알고, 화면 높이도 지도에 내주어야 하기 때문입니다. */
            /* ★ 돌아가는 알약과 이름표는 **맨 위 줄**에 있습니다 (아래 TopBar).
                 흰 칸 안에 두었더니 그만큼 지도가 작아졌습니다 —
                 이 화면에서 가장 커야 하는 것은 **지도**입니다. */
            if (mapViewS[0] === 'board') return mapBoardBody();

            var mapTabs = html`<button type="button" class="map-go"
                onClick=${function () { mapViewS[1]('board'); }}>
              <!-- 코너 그림 그대로 — 이 창의 창 카드와 같은 그림이라
                   무엇을 하러 가는지 그림만 봐도 이어집니다. -->
              <span class="map-go-art" aria-hidden="true">
                <${C.PickArt} kind="corner" word="여가 지도" iconKey="cornerMap" /></span>
              <span class="map-go-txt">
                <span class="map-go-nm">나만의 여가 지도 직접 완성하기</span>
                <span class="map-go-sub">활동을 골라 섬에 직접 붙여 보아요</span>
              </span>
              <span class="map-go-arrow" aria-hidden="true"
                dangerouslySetInnerHTML=${{ __html: App.icon('next') }} />
            </button>`;

            /* ⚠ 여기에 제목(h3)을 두지 마세요. 읽어주기까지 붙어 60px 을 먹고,
                 그만큼 그림이 작아집니다. 창 이름은 **맨 위 줄**에 있습니다.
                 읽어주기도 맨 위 줄에 하나 있습니다 (규칙 4 — 화면마다 하나). */
            return html`<${C.Sec}>
              ${mapTabs}
              <!-- 네 가지 표시 — 눌러서 고릅니다 -->
              <div class="folio-marks">
                ${App.DATA.mapStates.map(function (m) {
                  var on = pick === m.id;
                  return html`<button key=${m.id} type="button"
                      class=${'folio-mark' + (on ? ' on' : '')}
                      aria-pressed=${on ? 'true' : 'false'}
                      onClick=${function () { mapPick[1](m.id); mapPageS[1]({}); }}>
                    <span class="fm-art" aria-hidden="true"><${C.StateArt} state=${m} /></span>
                    <span class="fm-txt"><b>${(lists[m.id] || []).length}</b>가지 ${m.name}</span>
                  </button>`;
                })}
              </div>

              ${shown.length ? html`<div class="folio-two">
                ${[{ k: 'indoor', nm: '실내', cls: 'in' }, { k: 'outdoor', nm: '실외', cls: 'out' }]
                  .map(function (side) {
                    var mine = shown.filter(function (c) { return c.area === side.k; });
                    /* ★ **한 줄에 셋, 한 쪽에 셋**입니다. 두 줄로 두었더니
                         그림이 작아 보기 힘들었습니다. 창이 둘(실내·실외)이라
                         한 줄씩만 써도 화면에 두 줄이 들어갑니다. */
                    var info = pageOf(mine, mapPageS[0][side.k], 3);
                    return html`<div key=${side.k} class=${'folio-half ' + side.cls}>
                      <!-- 쪽 표시를 머리줄에 붙입니다 — 격자 아래에 두면
                           창마다 18px 씩, 둘이면 36px 을 먹습니다. -->
                      <div class="folio-half-head">
                        <span class=${'folio-where ' + side.cls}>${side.nm}</span>
                        <b>${mine.length}가지</b>
                        ${info.pages > 1 && html`<span class="flow-n" role="status" aria-live="polite">
                          ${info.page + 1} / ${info.pages}</span>`}
                      </div>
                      ${mine.length ? flowBox(info, function (n) {
                        var next = Object.assign({}, mapPageS[0]); next[side.k] = n;
                        mapPageS[1](next);
                      }, 'folio-grid wide', info.items.map(function (c) {
                        return html`<span key=${c.id} class="folio-card as-view"
                            role="img" aria-label=${side.nm + ' ' + c.name}>
                          <span class="folio-art"><${C.ActivityArt} activity=${c} /></span>
                          <span class="folio-name">${c.name}</span>
                        </span>`;
                      }), side.nm + ' 활동', true) : html`<p class="muted small folio-half-none">아직 없어요.</p>`}
                    </div>`;
                  })}
              </div>` : html`<${C.Banner} icon="cornerMap" style=${{ marginTop: '.7rem' }}>
                아직 여기에 표시한 활동이 없어요. 여가지도에서 표시해 보아요.
              <//>`}
            <//>`;
          })()}

          <!-- ★ 일기 카드는 **2칸 x 2줄, 넉 장씩** 놓고 화살표로 넘깁니다 (2026-08-22).
                 한 줄에 하나씩 늘어놓았더니
                   · 카드가 흰 칸 폭(1060px)을 다 써서 글줄이 너무 길었고
                   · 일기가 쌓일수록 좌우 서너 쪽으로 갈라졌습니다.
               ▸ 두 칸이면 글줄이 알맞고, 넉 장씩 끊으면 일기가 몇 장이든
                 **화면 높이가 늘 같습니다** (이 창의 다른 칸과 같은 방식).
               ⚠ 여러 쪽 나누기(stage-track 의 다단)에 맡기지 마세요. 격자는
                 다단에서 제멋대로 쪼개져, 다 들어가는데도 4쪽이 되었습니다. -->
          ${folioTab[0] === 'diary' && html`<${C.Sec}>
            ${data.diaries.length ? (function () {
              /* ★ 한 쪽에 **둘** (2026-08-29 · 선생님 말씀 — 「2개씩 배치하고 제목은
     한줄로 나오게 해줘. 그리고 그림은 크게」).
     넷이면 카드가 좁아 제목이 두 줄로 접히고 그림도 96px 뿐이었습니다.
     둘로 줄이면 카드 폭이 곱절이라 **제목이 저절로 한 줄**에 들어가고,
     남는 자리를 그림이 가져갑니다. 셋을 따로 손보지 않아도 함께 풀립니다. */
                var info = pageOf(data.diaries, diaryPageS[0], 2);
              return flowBox(info, function (n) { diaryPageS[1](n); }, 'folio-diaries',
                info.items.map(function (d) {
                var a = App.act(d.activityId), pt = App.partner(d.partnerId);
                /* ★ 카드에는 **활동 그림 · 제목 · 날짜** 셋만 둡니다
                       (2026-08-28 · 선생님 말씀 — 「굳이 여기서 내용을 다 써서
                       보여줄 필요 없음 … 여긴 너무 많은 정보와 상자가 많아」).
                     ▸ 뺀 것 : 「전시할 일기」 딱지 · 「· 친구 · 교실」 · 일기 글 전문 · 사진.
                       일기 내용은 바로 아래 「그림일기」 를 누르면 제대로 보입니다.
                       여기서 또 보여 주면 같은 것이 두 번 나오는 셈입니다.
                     ⚠ 전시 여부는 딱지 대신 **카드 테두리(.dcard.on)** 와 아래
                       단추의 눌린 모양으로 압니다 — 표시가 사라진 것이 아닙니다. */
                return html`<div key=${d.id} class=${'card dcard' + (d.exhibit ? ' on' : '')}>
                  <!-- ★ **왼쪽은 그림 한 장, 오른쪽은 세 줄** (2026-08-28 · 선생님 말씀 —
                         「왼쪽에 활동 그림만 넣고 오른쪽에 년월일요일 밑에 제목,
                         그 밑에 세개의 바 … 난 그림이 좀 눈에 띄었으면 해서」).
                         그림이 54px 일 때는 이름표처럼 작아서 제목 옆에 묻혔습니다.
                         이제 오른쪽 세 줄 높이를 통째로 써서 **가장 먼저 보입니다.**
                       ▸ 날짜가 제목 **위**입니다 — 일기는 날짜로 찾는 것이라
                         먼저 눈에 들어와야 합니다.
                       ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
                  <div class="dcard-in">
                    <!-- ★ **날짜 → 제목 → [그림 | 단추 셋]** (2026-08-29 ·
                           선생님 말씀 — 「날짜카드 밑에 제목 넣고 그밑에
                           그림과 전시할래요, 그림일기, 일기 고치기」).
                         ▸ 날짜와 제목이 **위에서 폭을 다 씁니다.** 그래서
                           긴 제목도 잘리지 않고 다 보입니다.
                         ▸ 그림과 단추 셋만 좌우로 나눕니다.
                         ▸ 단추 셋은 세로로 쌓습니다 — 가로로 두면 카드가
                           낮아져 그림 자리가 안 나옵니다. -->
                    <div class="small muted dcard-date">${App.fmtDateLong(d.date)}</div>
                    <b class="dcard-title">${d.title || (a ? a.name : '여가 일기')}</b>
                    <div class="dcard-head">
                      <span class="dcard-art"><${C.ActivityArt} activity=${a} /></span>
                    <!-- ★ 단추 셋을 **흰 바 하나** 안에 넣어 한 줄로 보이게 했습니다.
                           낱개 알약이 셋이면 상자가 셋으로 보여 어수선했습니다.
                         ▸ 칸막이 선은 CSS(.dcard-bar) 가 긋습니다. -->
                    <div class="dcard-bar">
                    <button type="button" class=${'dcard-act' + (d.exhibit ? ' on' : '')}
                      aria-pressed=${d.exhibit ? 'true' : 'false'}
                      onClick=${function () {
                        var next = !d.exhibit;
                        App.store.updateDiary(d.id, { exhibit: next });
                        App.ui.toast(next ? '전시할 일기로 골랐어요.' : '전시하지 않기로 했어요.');
                      }}>
                      <span class="ico" aria-hidden="true"
                        dangerouslySetInnerHTML=${{ __html: App.icon(d.exhibit ? 'bookmark' : 'dash') }} />
                      <span>${d.exhibit ? '전시할래요' : '전시하지 않을래요'}</span>
                    </button>
                    <!-- ★ from:'folio' 를 넘겨야 **여기로 돌아옵니다.**
                           그림일기·일기 고치기 화면의 파란 화살표는 지나온 길을
                           되짚지 않고 이 표시를 보고 돌아올 곳을 정합니다.
                         ▸ 일기 고치기는 step:'last' 로 **완성 화면**에서 엽니다.
                           그러지 않으면 「언제 했나요?」 부터 다시 훑게 됩니다.
                         ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
                    <button type="button" class="dcard-act"
                      onClick=${function () { p.nav('picdiary', { diaryId: d.id, from: 'folio' }); }}>
                      <span class="ico" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('book') }} />
                      <span>그림일기</span>
                    </button>
                    <button type="button" class="dcard-act"
                      onClick=${function () { p.nav('diary', { diaryId: d.id, step: 'last', from: 'folio' }); }}>
                      <span class="ico" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('pencil') }} />
                      <span>일기 고치기</span>
                    </button>
                    </div>
                    </div>
                  </div>
                </div>`;
              }), '일기');
            })() : html`<${C.Banner} icon="cornerDiary">
              이 기간에 쓴 일기가 없어요. 기간을 늘리거나 일기를 먼저 써 보아요.
              <div class="wrap" style=${{ marginTop: '.4rem' }}>
                <${C.Btn} size="small" onClick=${function () { p.nav('diary'); }}>일기 쓰러 가기<//>
              </div>
            <//>`}
          <//>`}

          <!-- ★ 한마디와 돌아보기는 **학생이 쓰는 것**입니다.
                 그런데 선생님 도구를 켰을 때만 나와서, 정작 학생은 쓸 수 없었습니다.
                 학생 화면으로 옮겼습니다.
               ▸ 말도 학생에게 하는 말로 바꿨습니다 (학생의 한마디 → 나의 한마디). -->
          <!-- 둘 다 **학생이 글을 쓰는 곳**이라 나란히 둡니다.
               위아래로 쌓으면 162 + 332 = 494px 라 화면을 넘겨 2쪽이 됩니다.
               옆으로 놓으면 큰 쪽(332px) 높이만 쓰면 되어 한 쪽에 들어갑니다.
             ⚠ 예전에는 이 두 칸이 **모음 아래에 늘 붙어** 있었습니다. 그래서
               일기장을 고르면 일기 카드까지 더해져 4쪽까지 갈라졌습니다.
               지금은 넷째 칸(나의 한마디)을 골랐을 때만 나옵니다. -->
          <!-- ★ 나의 한마디도 **일기와 같은 세 단계**로 나눕니다 (2026-08-22).
                 예전에는 세 단계가 모두 **글자를 쳐 넣는 칸 하나**뿐이었습니다.
                 그래서 아직 글을 못 쓰는 1단계 학생은 여기를 아예 못 썼습니다.
                 일기가 이미 푼 문제라 **같은 틀**을 그대로 가져옵니다.
               ▸ 담기는 곳은 단계와 상관없이 **한 곳**입니다 (student.word · review).
                 그래서 전시판형 · 책자형 인쇄는 고칠 것이 없습니다.
               ▸ 자세한 것은 아래 meBody 를 보세요. -->
          ${folioTab[0] === 'me' && meBody()}
        <//>` : html`<${React.Fragment}>
          <div class="folio-range small muted">
            ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)} 의 기록
          </div>
          <${C.Sec} title=${view === 'board'
            ? '전시판형 미리보기 — 전시할 일기로 만듭니다'
            : '책자형 미리보기'}>
            <div class="banner info" style=${{ marginBottom: '.6rem' }}>
              <b>인쇄하기</b> 를 누르면 인쇄 미리보기가 열려요. 인쇄 창에서 <b>대상을 “PDF로 저장”</b> 으로 바꾸면 PDF 파일로 저장돼요.
            </div>
            <!-- ★ 미리보기는 **제 칸 안에서 위아래로 넘겨** 봅니다.
                   종이 한 장이 흰 칸보다 커서, 그대로 두면 쪽이 통째로 밀려나
                   첫 쪽이 텅 비어 보였습니다 (책자형은 5장이라 5쪽이 됩니다).
                 ※ 학생 화면에는 스크롤을 만들지 않는 것이 규칙이지만,
                   여기는 **선생님이 인쇄 전에 확인하는 곳**이라 넘겨 보는
                   편이 자연스럽습니다. -->
            <div class="folio-preview">${printableNode()}</div>
          <//>
        <//>`}
      <//>

      ${toolsModal}
      ${planModal}

      ${showS[0] && html`<${C.ShowMode} diaries=${showList} student=${student}
        onClose=${function () { showS[1](false); }} />`}
    </div>`;
  };
})();
