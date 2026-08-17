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
     · 양옆(또는 위아래)으로 '실내 여가 섬' 과 '실외 여가 섬'
     · 화면 크기에 맞추어 카드 크기를 스스로 정하므로 글씨가 작아지지 않습니다
     ----------------------------------------------------------------- */
  /* 섬 이름 바는 섬 칸 안이 아니라 '나' 칸 양옆(같은 높이)에 놓습니다.
     TOP_H 는 이름 자리는 아니지만 섬 칸 위쪽 여백으로 그대로 남겨 둡니다.
     ※ 0 으로 줄이면 활동 카드가 175 → 231px 로 커져 지도 느낌이 달라집니다. */
  var PAD = 10, GAP = 10, LABEL_H = 52, NAV_H = 52;
  /* 진행 막대 앞에 붙는 그림 — '해봤어요' 표시와 같은 그림을 씁니다 */
  var footImg = App.uiImage('tried');                 // images/해봤어요.png (없으면 null)
  var COLS = 2, ROWS = 2;              // 한 섬에 2줄 × 2칸 = 4장씩
  var PER = COLS * ROWS;

  /* 섬 한 칸 안에 카드 4장을 가장 크게 놓기 (아래 화살표 자리는 빼고) */
  function gridFor(region, list) {
    var innerW = region.w - PAD * 2;
    var innerH = region.h - LABEL_H - NAV_H;
    var cellW = (innerW - GAP * (COLS - 1)) / COLS;
    var cellH = (innerH - GAP * (ROWS - 1)) / ROWS;
    var cw = Math.max(60, Math.min(cellW, cellH));   // 정사각형
    var totalW = COLS * cw + (COLS - 1) * GAP;
    var totalH = ROWS * cw + (ROWS - 1) * GAP;
    var x0 = region.x + (region.w - totalW) / 2;
    var y0 = region.y + LABEL_H + Math.max(0, (innerH - totalH) / 2);
    return list.map(function (card, i) {
      var r = Math.floor(i / COLS), c = i % COLS;
      return { card: card, x: x0 + c * (cw + GAP), y: y0 + r * (cw + GAP), w: cw, h: cw };
    });
  }

  /* 전체 자리 잡기 — 섬마다 제 쪽(page)의 카드만 놓습니다 */
  function layoutOf(box, indoor, outdoor, pageIn, pageOut) {
    var w = Math.max(320, box.w), h = Math.max(240, box.h);
    /* '나' 는 맨 위 가운데, 그 아래 왼쪽에 실내 섬 · 오른쪽에 실외 섬 */
    var cs = Math.max(110, Math.min(170, Math.min(w * 0.17, h * 0.26)));
    var top = PAD + cs + 26;                        // 발자국 길 자리까지 포함
    var islandW = (w - PAD * 3) / 2;
    var islandH = h - top - PAD;
    var center = { x: (w - cs) / 2, y: PAD, w: cs, h: cs };
    var regionIn = { x: PAD, y: top, w: islandW, h: islandH };
    var regionOut = { x: PAD * 2 + islandW, y: top, w: islandW, h: islandH };
    var side = true;

    var pagesIn = Math.max(1, Math.ceil(indoor.length / PER));
    var pagesOut = Math.max(1, Math.ceil(outdoor.length / PER));
    var pi = Math.min(pageIn, pagesIn - 1), po = Math.min(pageOut, pagesOut - 1);
    var placed = gridFor(regionIn, indoor.slice(pi * PER, pi * PER + PER))
        .map(function (q) { return Object.assign(q, { island: 'in' }); })
      .concat(gridFor(regionOut, outdoor.slice(po * PER, po * PER + PER))
        .map(function (q) { return Object.assign(q, { island: 'out' }); }));

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
        { key: 'in', label: '실내 여가 섬', region: regionIn, tone: '#c9a87f',
          labelBox: labelBox(regionIn, -1), page: pi, pages: pagesIn },
        { key: 'out', label: '실외 여가 섬', region: regionOut, tone: '#8fbb85',
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
    var L = useMemo(function () {
      return layoutOf(box[0], indoor, outdoor, pIn[0], pOut[0]);
    }, [cards.map(function (c) { return c.id; }).join(','),
        Math.round(box[0].w), Math.round(box[0].h), pIn[0], pOut[0]]);
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
      { id: 'none', name: '아직 안 해봤어요', icon: 'dash' }
    ];

    var summary = App.sentences.mapSummary(statusMap, cards);
    var shownCount = placed.filter(function (q) { return matches(q.card.id); }).length;

    /* ================= 나의 여가 도장판 =================
       ★ 예전에는 진행 막대 하나뿐이라 **30곳을 다 가야** 뭔가 되는 구조였습니다.
         너무 멀어서 학생이 목표를 느끼지 못했습니다.
         이제 **5곳마다 도장 1개**를 찍습니다 (30곳 = 도장 6개).
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
    var stampTotal = Math.ceil(cards.length / PER_STAMP);       // 30곳 → 6칸
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

    function toggle(cardId, key) {
      App.store.toggleMapState(student.id, cardId, key);
      var st = App.store.statusOf(student.id, cardId);
      var s = App.DATA.mapStates.filter(function (m) { return m.id === key; })[0];
      App.speakFor(student, s.name + (st[key] ? ' 선택했어요' : ' 선택을 지웠어요'));
    }

    return html`<div class="app" data-corner="map">
      <${C.TopBar} title="여가 지도"
        left=${html`<${C.IconBtn} uiKey="home" icon="home" label="홈으로 가기"
          onClick=${function () { p.nav('home'); }} />`}>
        <!-- '일기 쓰기' 는 두지 않습니다. 여기는 지도를 보는 곳이고,
             일기는 홈의 계획 카드나 기록하GO! 에서 씁니다 (규칙 7 — 중복 금지) -->
        <${C.Speak} text=${'나의 여가 탐험 지도. ' + summary.join(' ')} />
        <${C.WhoChip} student=${student} />
      <//>

      <div class="stage">
        <!-- 폭은 다른 화면과 같게(가운데 기둥), 높이만 남는 만큼 씁니다.
             ※ flex:1 1 auto 를 주면 '가로로도' 늘어나 다른 화면보다 넓어집니다. -->
        <div class="panel" style=${{ alignSelf: 'stretch' }}>
        <div class="stage-fit" style=${{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>

          <!-- 나의 여가 도장판 : 5곳마다 발자국 도장 하나 -->
          <div class="stampcard"
              role="group" aria-label=${'나의 여가 도장판. 모두 ' + cards.length + '곳 가운데 ' + triedCount + '곳 다녀왔어요.'}>
            <span class="stampcard-lab">나의 여가 도장판
              <b>${triedCount} / ${cards.length}곳</b></span>
            <div class="stamps">
              ${stamps.map(function (s) {
                var cls = 'stamp' + (s.done ? ' on' : '') + (s.next ? ' next' : '');
                return html`<button key=${s.no} type="button" class=${cls}
                    disabled=${!s.done}
                    aria-label=${s.need + '곳 도장' + (s.done ? ' 받았어요' : ' 아직이에요')}
                    title=${s.done ? '눌러서 해본 활동 보기' : s.need + '곳을 가면 도장을 받아요'}
                    onClick=${function () { if (s.done) stampS[1](s); }}>
                  <span class="stamp-ink" aria-hidden="true">
                    ${footImg ? html`<img src=${footImg} alt="" />`
                              : html`<span dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />`}
                  </span>
                  <span class="stamp-need">${s.need}곳</span>
                  <span class="stamp-date">${s.done ? (s.date ? App.fmtDateShort(s.date) : '완성') : ''}</span>
                </button>`;
              })}
            </div>
          </div>


          <!-- 학생 화면에는 지도와 활동카드만 둡니다.
               필터·확대·도움말은 선생님이 켤 때에만 나옵니다. -->
          ${student && student.mapTools ? html`<div class="row" style=${{ gap: '.4rem' }}>
            <${C.Btn} size="small" icon="eye" onClick=${function () { toolsS[1](!toolsS[0]); }}>
              찾아보기 ${toolsS[0] ? '▲' : '▼'}<//>
            ${filter[0] !== 'all' && html`<span class="chip">
              ${FILTERS.filter(function (f) { return f.id === filter[0]; })[0].name} 만 보여요
            </span>`}
            <div class="grow"></div>
            <${C.Btn} size="small" icon="question" onClick=${function () { helpS[1](true); }}>지도 도움말<//>
          </div>` : null}

          ${student && student.mapTools && toolsS[0] && html`<div class="map-toolbox">
            <div class="map-tools">
              ${FILTERS.map(function (f) {
                return html`<button key=${f.id} type="button"
                  class=${'tab' + (filter[0] === f.id ? ' on' : '')}
                  aria-pressed=${filter[0] === f.id ? 'true' : 'false'}
                  onClick=${function () { filter[1](f.id); }}>
                  <span class="filter-art" aria-hidden="true">
                    ${f.id === 'all' || f.id === 'none'
                      ? html`<span dangerouslySetInnerHTML=${{ __html: App.icon(f.icon) }} />`
                      : html`<${C.StateArt} state=${App.state(f.id)} />`}
                  </span>
                  ${f.name}${filter[0] === f.id ? ' ✓' : ''}</button>`;
              })}
            </div>
            <div class="map-tools" style=${{ marginTop: '.4rem' }}>
              <${C.Btn} size="small" onClick=${function () { view[1]({ zoom: Math.max(0.6, view[0].zoom - 0.2), px: 0, py: 0 }); }} ariaLabel="지도 작게">－ 작게<//>
              <span class="chip">${Math.round(view[0].zoom * 100)}%</span>
              <${C.Btn} size="small" onClick=${function () { view[1]({ zoom: Math.min(2.2, view[0].zoom + 0.2), px: 0, py: 0 }); }} ariaLabel="지도 크게">＋ 크게<//>
              <${C.Btn} size="small" onClick=${function () { view[1]({ zoom: 1, px: 0, py: 0 }); }}>처음 크기<//>
            </div>
          </div>`}

          <div class="map-wrap grow" ref=${wrapRef}>
            <div class="map-canvas" style=${{ width: W + 'px', height: H + 'px',
                transform: 'translate(' + offX + 'px,' + offY + 'px) scale(' + scale + ')' }}>

              <!-- 섬 이름 바 — 활동 카드 첫 줄 바로 위 -->
              ${L.islands.map(function (is) {
                var r = is.labelBox || is.region;
                return html`<div key=${'t' + is.key} class=${'island-head ' + is.key}
                    style=${{ left: r.x + 'px', top: L.labelTop + 'px', width: r.w + 'px' }}>
                  <span class="island-label">${is.label}</span>
                </div>`;
              })}


              <div class="map-me" style=${{ left: CX + 'px', top: CY + 'px',
                  width: L.center.w + 'px', height: L.center.h + 'px' }}>
                <span class="face"><${C.AvatarArt} student=${student} /></span>
                <span class="nm">${student ? student.name : ''}</span>
              </div>

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
            </div>

            <!-- 섬마다 아래에 이전 / 다음 -->
            ${L.islands.map(function (is) {
              if (is.pages <= 1) return null;
              var r = is.region;
              return html`<div key=${'nav' + is.key} class="island-nav"
                  style=${{ left: r.x + 'px', top: (r.y + r.h - 46) + 'px', width: r.w + 'px' }}>
                <button type="button" class="isl-btn prev" aria-label=${is.label + ' 앞 활동 보기'}
                  disabled=${is.page === 0} onClick=${function () { turn(is.key, -1); }}>◀ 이전</button>
                <span class="isl-page">
                  <b>${is.page + 1} / ${is.pages} 쪽</b>
                  <span class="isl-dots">
                    ${Array.apply(null, { length: is.pages }).map(function (_, i) {
                      return html`<i key=${i} class=${i === is.page ? 'on' : ''}></i>`;
                    })}
                  </span>
                </span>
                <button type="button" class="isl-btn next" aria-label=${is.label + ' 다음 활동 보기'}
                  disabled=${is.page >= is.pages - 1} onClick=${function () { turn(is.key, 1); }}>다음 ▶</button>
              </div>`;
            })}
          </div>

          <!-- 요약은 첫 문장만, **가운데 정렬**.
               자세히 단추는 없앴습니다 — 위쪽 지도 도움말 과 똑같은 창을 열어
               같은 곳으로 가는 단추가 두 개였습니다 (규칙 7 — 중복 금지). -->
          <div class="map-summary">
            <span>${summary[0]}</span>
          </div>

          <!-- 지도를 본 다음 : 내가 표시한 활동을 네 가지로 모아 봅니다 -->
          <div class="wrap" style=${{ justifyContent: 'center' }}>
            <${C.Btn} kind="primary" icon="next"
              onClick=${function () { p.nav('mymap'); }}>내가 표시한 활동 모아보기<//>
          </div>
        </div>
        </div>
      </div>


      ${helpS[0] && html`<${C.Modal} title="지도 표시 뜻과 요약" onClose=${function () { helpS[1](false); }}
        speakText=${summary.join(' ')}
        actions=${html`<${C.Btn} kind="ok" onClick=${function () { helpS[1](false); }}>닫기<//>`}>
        <div class="stack">
          <div class="wrap">
            ${App.DATA.mapStates.map(function (m) {
              return html`<${C.StateChip} key=${m.id} state=${m} />`;
            })}
            <span class="chip none">
              <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('dash') }} />
              <span>표시가 없으면 아직 안 해봤어요</span></span>
          </div>
          <!-- 요약 글은 조금 작게 (map-sum). 큰 글씨로 다섯 줄이면 창이 글자로 빽빽해집니다 -->
          <div class="sentence map-sum">
            ${summary.map(function (s, i) { return html`<div key=${i}>${s}</div>`; })}
          </div>
          <!-- 아래 두 줄은 **가운데**로 (창 맨 아래 안내라 가운데가 읽기 편합니다) -->
          ${filter[0] !== 'all' && html`<p class="small muted" style=${{ textAlign: 'center' }}>
            지금 보이는 활동 : ${shownCount}가지 (${FILTERS.filter(function (f) { return f.id === filter[0]; })[0].name})</p>`}
          <p class="small muted" style=${{ textAlign: 'center' }}>활동카드를 누르면 표시를 고를 수 있어요.</p>
        </div>
      <//>`}

      <!-- 도장을 누르면 그때까지 해본 활동과 날짜가 나옵니다.
           문구마켓의 '참잘했어요' 도장처럼 날짜가 남는 것이 핵심입니다. -->
      ${stampS[0] && html`<${C.Modal} wide=${true}
        title=${stampS[0].need + '곳 도장' + (stampS[0].date ? ' · ' + App.fmtDateShort(stampS[0].date) : '')}
        speakText=${'도장을 받은 활동이에요. ' + stampS[0].group.map(function (g) { return g.name; }).join(', ')}
        onClose=${function () { stampS[1](null); }}
        actions=${html`<${C.Btn} kind="ok" onClick=${function () { stampS[1](null); }}>닫기<//>`}>
        <div class="stamp-big" aria-hidden="true">
          ${footImg ? html`<img src=${footImg} alt="" />`
                    : html`<span dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />`}
        </div>
        <p class="small muted" style=${{ textAlign: 'center' }}>이때까지 해본 활동이에요</p>
        <ol class="stamp-list">
          ${stampS[0].group.map(function (g, i) {
            return html`<li key=${g.id}>
              <span class="sl-no">${(stampS[0].no - 1) * PER_STAMP + i + 1}</span>
              <span class="sl-name">${g.name}</span>
              <span class="sl-date">${g.date ? App.fmtDateShort(g.date) : ''}</span>
            </li>`;
          })}
        </ol>
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
    return html`<${C.Modal} title=${q} onClose=${p.onClose}
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
    if (!student) return null;

    var cards = App.visibleCards(student, null);
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
        <${C.Question} bar=${true}
          speakText="내가 표시한 활동을 모아 볼 수 있어요. 보고 싶은 것을 눌러 보세요.">
          내가 표시한 활동을 모아 볼까요?<//>
        <div class="mymap-grid">
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
      var e = EMPTY_WORD[open.id] || { line: '아직 없어요.', tip: '활동을 시작해 보아요!' };
      body = html`<${React.Fragment}>
        <${C.Question} bar=${true} speakText=${open.name + '. ' + open.help}>${open.name}<//>
        ${list.length
          ? html`<div class="mymap-list">
              ${list.map(function (x, i) {
                return html`<div key=${x.card.id} class="mymap-row">
                  <span class="mymap-no">${i + 1}</span>
                  <span class="mymap-thumb"><${C.ActivityArt} activity=${x.card} /></span>
                  <b class="grow">${x.card.name}</b>
                  <span class="mymap-date">${x.date ? App.fmtDateShort(x.date) : ''}</span>
                </div>`;
              })}
            </div>`
          : html`<div class="mymap-empty">
              <span class="mymap-empty-art"><${C.StateArt} state=${open} /></span>
              <b>${e.line}</b>
              <span>${e.tip}</span>
            </div>`}
      <//>`;
    }

    return html`<div class="app" data-corner="map">
      <${C.TopBar} title="나의 여가 모아보기"
        left=${html`<${C.IconBtn} uiKey="home" icon="home" label="홈으로 가기"
          onClick=${function () { p.nav('home'); }} />`}>
        <${C.Speak} text=${open ? open.name + '. ' + open.help : '내가 표시한 활동을 모아 볼 수 있어요.'} />
        <${C.WhoChip} student=${student} />
      <//>

      <${C.Stage}
        top=${open ? html`<${C.Btn} size="small" icon="back" className="pastel-yellow"
          onClick=${function () { openS[1](null); }}>네 가지로 돌아가기<//>` : null}
        action=${html`<${C.Btn} kind="ok" icon="home"
          onClick=${function () { p.nav('home'); }}>다 봤어요 · 나의 여가로<//>`}>
        ${body}
      <//>
    </div>`;
  };
})();
