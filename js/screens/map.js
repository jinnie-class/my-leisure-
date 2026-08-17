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

    /* 모은 만큼 보여 주기 — '몇 곳 다녀왔는지' 가 눈에 보여야 계속 모으고 싶어집니다 */
    var triedCount = cards.filter(function (c) { return statusOf(c.id).tried; }).length;
    var pct = cards.length ? Math.round(triedCount / cards.length * 100) : 0;
    /* 지금 보고 있는 두 섬의 쪽이 모두 '해봤어요' 인지 (다 채우면 도장) */
    var islandDone = L.islands.map(function (is) {
      var list = (is.key === 'in' ? indoor : outdoor).slice(is.page * PER, is.page * PER + PER);
      return {
        key: is.key, label: is.label, page: is.page + 1,
        done: list.length > 0 && list.every(function (c) { return statusOf(c.id).tried; })
      };
    });

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
        <${C.Btn} size="small" icon="cornerDiary" onClick=${function () { p.nav('diary'); }}>일기 쓰기<//>
        <${C.Speak} text=${'나의 여가 탐험 지도. ' + summary.join(' ')} />
        <${C.WhoChip} student=${student} />
      <//>

      <div class="stage">
        <!-- 폭은 다른 화면과 같게(가운데 기둥), 높이만 남는 만큼 씁니다.
             ※ flex:1 1 auto 를 주면 '가로로도' 늘어나 다른 화면보다 넓어집니다. -->
        <div class="panel" style=${{ alignSelf: 'stretch' }}>
        <div class="stage-fit" style=${{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>

          <!-- 모은 만큼 눈에 보이게 : 발자국이 몇 곳에 찍혔는지 -->
          <div class="mprog" role="group" aria-label=${'모두 ' + cards.length + '곳 가운데 ' + triedCount + '곳 다녀왔어요'}>
            <span class="mprog-foot" aria-hidden="true">
              ${footImg ? html`<img src=${footImg} alt="" />`
                        : html`<span dangerouslySetInnerHTML=${{ __html: App.icon('foot') }} />`}
            </span>
            <b class="mprog-num">${triedCount}<span> / ${cards.length}곳</span></b>
            <span class="mprog-bar"><i style=${{ width: pct + '%' }}></i></span>
            ${islandDone.map(function (d) {
              /* 섬 한 쪽(4장)을 다 채우면 도장이 찍힙니다 */
              return html`<span key=${d.key} class=${'mprog-stamp' + (d.done ? ' on' : '')}
                title=${d.label + ' ' + d.page + '쪽'}>${d.done ? '🏅' : '·'}</span>`;
            })}
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

          <!-- 요약은 첫 문장만 -->
          <div class="map-summary">
            <div class="row" style=${{ flexWrap: 'nowrap' }}>
              <span class="grow" style=${{ minWidth: 0 }}>${summary[0]}</span>
              ${student && student.mapTools && summary.length > 1 && html`<${C.Btn} size="small"
                onClick=${function () { helpS[1](true); }}>자세히<//>`}
            </div>
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
          <div class="sentence">
            ${summary.map(function (s, i) { return html`<div key=${i}>${s}</div>`; })}
          </div>
          ${filter[0] !== 'all' && html`<p class="small muted">
            지금 보이는 활동 : ${shownCount}가지 (${FILTERS.filter(function (f) { return f.id === filter[0]; })[0].name})</p>`}
          <p class="small muted">활동카드를 누르면 표시를 고를 수 있어요.</p>
        </div>
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
})();
