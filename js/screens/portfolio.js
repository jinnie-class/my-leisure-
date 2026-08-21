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
  var FOLIO_TABS = [
    { id: 'plan',  name: '내가 세운 계획', icon: 'cornerPlan',
      count: function (d) { return d.plans.length + '장'; } },
    { id: 'map',   name: '나의 여가지도',  icon: 'cornerMap',
      count: function (d) { return d.tried.length + '가지'; } },
    { id: 'diary', name: '나의 일기장',    icon: 'cornerDiary',
      count: function (d) { return d.diaries.length + '장'; } }
  ];

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
            ${d.exhibited.slice(0, 2).map(function (dy) {
              return html`<div key=${dy.id} class="banner" style=${{ marginBottom: '.4rem' }}>
                <b>${App.fmtDateShort(dy.date)} · ${(App.act(dy.activityId) || {}).name || ''}</b>
                <div class="small" style=${{ marginTop: '.2rem' }}>${App.sentences.diaryBody(dy)}</div>
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
          ${App.DATA.reviewFrames.map(function (f) {
            return html`<div key=${f.id} class="sentence">
              ${f.before}<u style=${{ padding: '0 .4rem' }}>${rv[f.id] || '　　　　　　'}</u>${f.after}
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
    /* 모음 셋 가운데 무엇을 볼지 — **학생이 고릅니다.**
       무엇을 보여 줄지 고르는 것도 발표의 한 부분이라서요. */
    var folioTab = useState('plan');   // plan | map | diary
    /* 여가지도 칸에서 네 가지 표시 가운데 무엇을 보고 있는지 */
    var mapPick = useState('tried');   // tried | like | challenge | unsure
    var showS = useState(false);    // 교실 TV 전시 모드
    var range = rangeOf(student);

    var data = useMemo(function () {
      var diaries = App.store.diariesInRange(student.id, range.from, range.to);
      var plans = App.store.plans(student.id).filter(function (x) {
        return x.date >= range.from && x.date <= range.to;
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

    function setRange(id) {
      var pf = Object.assign({}, student.portfolio || {}, { rangeId: id });
      if ((id === 'term' || id === 'custom') && !pf.start) {
        pf.start = App.addMonths(App.todayKey(), -4);
        pf.end = App.todayKey();
      }
      App.store.updateStudent(student.id, { portfolio: pf });
    }
    function setDate(k, v) {
      var pf = Object.assign({}, student.portfolio || {});
      pf[k] = v;
      App.store.updateStudent(student.id, { portfolio: pf });
    }

    /* 기간·인쇄·전시판형은 선생님 일이라 학생 화면에서는 감춥니다.
       (선생님 설정 → 포트폴리오 에서 켜면 여기에도 나옵니다) */
    var folioTools = !!(student && student.folioTools);
    var view = folioTools ? tab[0] : 'pick';

    var printable = view === 'book'
      ? html`<${C.BookSheets} student=${student} data=${data} />`
      : html`<${C.BoardSheet} student=${student} data=${data} />`;

    function doPrint() { App.printNode(printable); }

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
          return html`<div key=${d.id} class="pd-page">
            <${C.PicDiarySheet} diary=${d} student=${student} trace=${mode} />
          </div>`;
        })}
      </div>`);
    }

    /* --------------- 기간 표시 ---------------
       기간을 바꾸는 단추는 '선생님 설정 → 포트폴리오' 한 곳에만 두었습니다.
       학생 화면에는 지금 어느 기간을 보고 있는지만 글로 알려 줍니다. */
    var rangeBar = html`<div class="banner ok sec">
      <b>지금 보는 기간</b> : ${App.fmtDateShort(data.from)} ~ ${App.fmtDateShort(data.to)}
      <span class="chip" style=${{ marginLeft: '.4rem' }}>일기 ${data.diaries.length}개</span>
      <span class="chip">전시 ${data.exhibited.length}개</span>
    </div>`;

    /* 그림일기를 모아 한 권으로 — 선생님 도구 */
    var journalBar = html`<${C.Sec} title="나의 여가 일기장">
      <p class="muted small">
        이 기간에 쓴 그림일기 <b>${bookDiaries.length}장</b>을 A4 여러 쪽으로 한꺼번에 인쇄해요.
        묶으면 그대로 한 권이 됩니다.
      </p>
      <div class="wrap" style=${{ marginTop: '.4rem' }}>
        <${C.Btn} icon="print" disabled=${!bookDiaries.length}
          onClick=${function () { printJournal('text'); }}>일기장 인쇄하기<//>
        <${C.Btn} size="small" icon="print" disabled=${!bookDiaries.length}
          onClick=${function () { printJournal('trace'); }}>따라쓰기 판으로<//>
        <${C.Btn} size="small" icon="print" disabled=${!bookDiaries.length}
          onClick=${function () { printJournal('empty'); }}>빈칸 판으로<//>
      </div>
      <div class="wrap" style=${{ marginTop: '.5rem' }}>
        <${C.Btn} icon="expand" disabled=${!showList.length}
          onClick=${function () { showS[1](true); }}>
          교실 TV 전시 (${showList.length}장)<//>
        <span class="small muted">저절로 넘어가요. ← → 로도 넘길 수 있어요.</span>
      </div>
    <//>`;

    return html`<div class="app" data-corner="portfolio">
      <${C.TopBar} title="여가 포트폴리오"
        onBack=${function () { p.back("home"); }}
        onTitle=${function () { p.nav("home"); }}>
        <${C.Speak} text=${'나의 여가 포트폴리오. 내가 전시하고 싶은 일기를 골라 보세요. ' +
          App.fmtDateShort(data.from) + '부터 ' + App.fmtDateShort(data.to) + '까지, 일기 ' +
          data.diaries.length + '개 가운데 ' + data.exhibited.length + '개를 골랐어요.'} />
        ${folioTools && html`<div class="tabs">
          <button type="button" class=${'tab' + (tab[0] === 'pick' ? ' on' : '')}
            aria-pressed=${tab[0] === 'pick'} onClick=${function () { tab[1]('pick'); }}>기록 고르기</button>
          <button type="button" class=${'tab' + (tab[0] === 'board' ? ' on' : '')}
            aria-pressed=${tab[0] === 'board'} onClick=${function () { tab[1]('board'); }}>전시판형</button>
          <button type="button" class=${'tab' + (tab[0] === 'book' ? ' on' : '')}
            aria-pressed=${tab[0] === 'book'} onClick=${function () { tab[1]('book'); }}>책자형</button>
        </div>`}
        <${C.WhoChip} student=${student} />
      <//>

      <${C.Stage} action=${folioTools ? html`<${C.Btn} kind="primary" icon="print" onClick=${doPrint}>
          ${view === 'book' ? '책자형 인쇄하기' : '전시판형 인쇄하기'}<//>` : null}>
        ${view === 'pick' ? html`<${React.Fragment}>
          ${folioTools ? rangeBar : null}
          ${folioTools ? journalBar : null}

          <!-- ★ 포트폴리오는 **세 코너에서 만든 것을 한곳에 모아 두는 곳**입니다.
                 보관 · 전시 · 발표를 여기서 합니다.
                   ① 내가 세운 여가계획들   (계획하GO!)
                   ② 나의 여가지도          (여가지도)
                   ③ 나의 여가 일기장        (기록하GO!)
                 예전에는 ③만 있어서 ①②가 통째로 빠져 있었습니다.
                 계획을 세워 본 일과 지도에 쌓인 발자국이 없으면,
                 '내가 어떤 경험을 해 왔는지' 가 반쪽만 보입니다.

               ★ 셋을 **학생이 골라** 봅니다 (한 번에 한 모음).
                 셋을 다 펼치면 좌우 3쪽이 되어 넘겨야 하고, 무엇부터 볼지
                 학생이 정할 수 없습니다. 무엇을 보여 줄지 고르는 것도
                 발표의 한 부분이라, 고르는 쪽이 이 코너의 뜻에 맞습니다. -->
          <div class="folio-pick">
            ${FOLIO_TABS.map(function (t) {
              var on = folioTab[0] === t.id;
              return html`<button key=${t.id} type="button" class=${'folio-tab' + (on ? ' on' : '')}
                  aria-pressed=${on ? 'true' : 'false'}
                  onClick=${function () { folioTab[1](t.id); }}>
                <span class="folio-tab-art" aria-hidden="true"
                  dangerouslySetInnerHTML=${{ __html: App.icon(t.icon) }} />
                <span class="folio-tab-nm">${t.name}</span>
                <span class="folio-tab-n">${t.count(data)}</span>
              </button>`;
            })}
          </div>

          ${folioTab[0] === 'plan' && html`<${C.Sec} title=${'내가 세운 여가계획들 · ' + data.plans.length + '장'}
            speakText=${'내가 세운 여가계획 ' + data.plans.length + '장이에요.'}>
            ${data.plans.length ? html`<div class="folio-grid">
              ${data.plans.map(function (pl) {
                var a = App.act(pl.activityId);
                var done = !!pl.doneDiaryId;
                return html`<button key=${pl.id} type="button" class="folio-card"
                    onClick=${function () { p.nav('plan', { planId: pl.id }); }}
                    aria-label=${App.fmtDateLong(pl.date) + ' ' + (a ? a.name : '') + (done ? ', 일기까지 마쳤어요' : '')}>
                  <span class="folio-art"><${C.ActivityArt} activity=${a} /></span>
                  <span class="folio-name">${a ? a.name : '여가 계획'}</span>
                  <span class="folio-date">${App.fmtDateShort(pl.date)}</span>
                  ${done && html`<span class="star-badge">✓ 해봤어요</span>`}
                </button>`;
              })}
            </div>` : html`<${C.Banner} icon="cornerPlan">
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
               ▸ 카드마다 실내·실외 표시가 붙어서, 합쳐 봐도 어느 섬 것인지 압니다. -->
          ${folioTab[0] === 'map' && (function () {
            var pick = mapPick[0];
            var lists = {
              tried: data.tried, like: data.likes,
              challenge: data.challenges, unsure: data.unsure
            };
            var shown = lists[pick] || [];
            return html`<${C.Sec} title="나의 여가지도 — 실내·실외 한눈에"
              speakText=${'나의 여가지도. 해봤어요 ' + data.tried.length + '가지, 좋아해요 '
                + data.likes.length + '가지, 도전하고 싶어요 ' + data.challenges.length
                + '가지, 잘 모르겠어요 ' + data.unsure.length + '가지예요.'}>
              <!-- 네 가지 표시 — 눌러서 고릅니다 -->
              <div class="folio-marks">
                ${App.DATA.mapStates.map(function (m) {
                  var on = pick === m.id;
                  return html`<button key=${m.id} type="button"
                      class=${'folio-mark' + (on ? ' on' : '')}
                      aria-pressed=${on ? 'true' : 'false'}
                      onClick=${function () { mapPick[1](m.id); }}>
                    <span class="fm-art" aria-hidden="true"><${C.StateArt} state=${m} /></span>
                    <span class="fm-txt"><b>${(lists[m.id] || []).length}</b>가지<br />${m.name}</span>
                  </button>`;
                })}
              </div>

              ${shown.length ? html`<div class="folio-grid" style=${{ marginTop: '.7rem' }}>
                ${shown.map(function (c) {
                  var inside = c.area === 'indoor';
                  return html`<span key=${c.id} class="folio-card as-view"
                      role="img" aria-label=${(inside ? '실내' : '실외') + ' ' + c.name}>
                    <span class="folio-art"><${C.ActivityArt} activity=${c} /></span>
                    <span class="folio-name">${c.name}</span>
                    <span class=${'folio-where ' + (inside ? 'in' : 'out')}>
                      ${inside ? '실내' : '실외'}</span>
                  </span>`;
                })}
              </div>` : html`<${C.Banner} icon="cornerMap" style=${{ marginTop: '.7rem' }}>
                아직 여기에 표시한 활동이 없어요. 여가지도에서 표시해 보아요.
              <//>`}

              <div class="wrap" style=${{ marginTop: '.6rem', justifyContent: 'center' }}>
                <${C.Btn} size="small" icon="map"
                  onClick=${function () { p.nav('map'); }}>여가지도 보기<//>
              </div>
            <//>`;
          })()}

          ${folioTab[0] === 'diary' && html`<${C.Sec} title="나의 여가 일기장 — 전시할 것을 골라 보세요">
            ${data.diaries.length ? html`<div class="stack">
              ${data.diaries.map(function (d) {
                var a = App.act(d.activityId), pt = App.partner(d.partnerId);
                return html`<div key=${d.id} class="card" style=${{ padding: '.6rem .8rem' }}>
                  <div class="row" style=${{ alignItems: 'flex-start' }}>
                    <span style=${{ width: 54, height: 54, flex: '0 0 auto' }}><${C.ActivityArt} activity=${a} /></span>
                    <div class="grow" style=${{ minWidth: 0 }}>
                      <div class="row" style=${{ gap: '.35rem' }}>
                        <b>${d.title || (a ? a.name : '여가 일기')}</b>
                        ${d.exhibit && html`<span class="star-badge">전시할 일기</span>`}
                      </div>
                      <div class="small muted">${App.fmtDateLong(d.date)} · ${pt ? pt.name : ''} ${d.place ? '· ' + d.place : ''}</div>
                      <div class="small" style=${{ marginTop: '.25rem' }}>${App.sentences.diaryBody(d)}</div>
                      ${d.photoIds && d.photoIds.length ? html`<div class="wrap" style=${{ marginTop: '.35rem' }}>
                        ${d.photoIds.slice(0, 3).map(function (id) {
                          var u = App.photos.url(id);
                          return u ? html`<img key=${id} src=${u} alt="활동 사진"
                            style=${{ width: 66, height: 50, objectFit: 'cover', borderRadius: 8, border: '2px solid #8a6a4e' }} /> ` : null;
                        })}
                      </div>` : null}
                    </div>
                  </div>
                  <div class="wrap" style=${{ marginTop: '.5rem' }}>
                    <button type="button" class=${'btn small exhibit-btn' + (d.exhibit ? ' on' : '')}
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
                    <${C.Btn} size="small" icon="book"
                      onClick=${function () { p.nav('picdiary', { diaryId: d.id }); }}>그림일기<//>
                    <${C.Btn} size="small" icon="pencil"
                      onClick=${function () { p.nav('diary', { diaryId: d.id }); }}>일기 고치기<//>
                  </div>
                </div>`;
              })}
            </div>` : html`<${C.Banner} icon="cornerDiary">
              이 기간에 쓴 일기가 없어요. 기간을 늘리거나 일기를 먼저 써 보아요.
              <div class="wrap" style=${{ marginTop: '.4rem' }}>
                <${C.Btn} size="small" onClick=${function () { p.nav('diary'); }}>일기 쓰러 가기<//>
              </div>
            <//>`}
          <//>`}

          ${folioTools ? html`<${React.Fragment}>
            <${C.Sec} title="학생의 한마디">
              <${C.Field} label="여가생활을 하며 하고 싶은 말을 적어요"
                value=${student.word || ''} placeholder="예) 친구와 함께하는 여가가 제일 즐거워요."
                onChange=${function (v) { App.store.updateStudent(student.id, { word: v }); }} />
            <//>
            <${C.Sec} title="마지막 돌아보기">
              <div class="stack">
                ${App.DATA.reviewFrames.map(function (f) {
                  return html`<div key=${f.id} class="row">
                    <b>${f.before}</b>
                    <input class="field" style=${{ width: '16rem' }} value=${(student.review || {})[f.id] || ''}
                      onChange=${function (e) {
                        var rv = Object.assign({}, student.review || {}); rv[f.id] = e.target.value;
                        App.store.updateStudent(student.id, { review: rv });
                      }} />
                    <b>${f.after}</b>
                  </div>`;
                })}
              </div>
            <//>
          <//>` : null}
        <//>` : html`<${React.Fragment}>
          ${rangeBar}
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
            <div class="folio-preview">${printable}</div>
          <//>
        <//>`}
      <//>

      ${showS[0] && html`<${C.ShowMode} diaries=${showList} student=${student}
        onClose=${function () { showS[1](false); }} />`}
    </div>`;
  };
})();
