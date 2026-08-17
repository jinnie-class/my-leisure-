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
  var MIN_ROWS = 5, MAX_ROWS = 7;

  /* 날씨 그림 — 인쇄해서 그날 날씨 하나에 동그라미 칩니다.
     글자를 못 읽는 학생도 알아볼 수 있게 모양을 뚜렷하게 그리고
     아래에 이름표를 함께 붙였습니다. */
  var CLOUD_HI = 'M15 30a8 8 0 01.8-15.9 11 11 0 0120.6-2.4A8 8 0 0134 30z';
  var CLOUD_LO = 'M15 34a8 8 0 01.8-15.9 11 11 0 0120.6-2.4A8 8 0 0134 34z';

  var WEATHER = [
    { key: 'sun', name: '맑음', svg:
      '<g stroke="#333" stroke-width="3" stroke-linecap="round">' +
      '<path d="M24 3v6M24 39v6M3 24h6M39 24h6M9.2 9.2l4.3 4.3M34.5 34.5l4.3 4.3' +
      'M38.8 9.2l-4.3 4.3M13.5 34.5l-4.3 4.3"/></g>' +
      '<circle cx="24" cy="24" r="10" fill="#FFD75E" stroke="#333" stroke-width="3"/>' },

    { key: 'cloud', name: '흐림', svg:
      '<path d="' + CLOUD_LO + '" fill="#E3ECF5" stroke="#333" stroke-width="3" stroke-linejoin="round"/>' },

    /* 비 : 우산 — 구름보다 한눈에 알아보기 쉽습니다 */
    { key: 'rain', name: '비', svg:
      '<path d="M22 9a17 17 0 0117 17H5A17 17 0 0122 9z" fill="#5AA9E6" ' +
      'stroke="#333" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M22 5v4" stroke="#333" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M22 26v13a4.5 4.5 0 01-9 0" stroke="#333" stroke-width="3" ' +
      'fill="none" stroke-linecap="round"/>' +
      '<g fill="#7FC4EE" stroke="#333" stroke-width="2" stroke-linejoin="round">' +
      '<path d="M40 28c1.6 2.4 2.5 3.8 2.5 4.7a2.5 2.5 0 01-5 0c0-.9.9-2.3 2.5-4.7z"/>' +
      '<path d="M33 36c1.6 2.4 2.5 3.8 2.5 4.7a2.5 2.5 0 01-5 0c0-.9.9-2.3 2.5-4.7z"/></g>' },

    /* 눈 : 눈사람 */
    { key: 'snow', name: '눈', svg:
      '<path d="M12 31l-6-4M36 31l6-4" stroke="#333" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="24" cy="34" r="11" fill="#fff" stroke="#333" stroke-width="3"/>' +
      '<circle cx="24" cy="16" r="8.5" fill="#fff" stroke="#333" stroke-width="3"/>' +
      '<circle cx="24" cy="31" r="1.6" fill="#333"/><circle cx="24" cy="38" r="1.6" fill="#333"/>' +
      '<circle cx="20.8" cy="14.5" r="1.5" fill="#333"/>' +
      '<circle cx="27.2" cy="14.5" r="1.5" fill="#333"/>' +
      '<path d="M24 17.6l4.6 1.9-4.6 1.6z" fill="#F59B4B" stroke="#333" stroke-width="1.4" ' +
      'stroke-linejoin="round"/>' }
  ];

  /* 인쇄 모양 — 왼쪽에서 오른쪽으로 갈수록 쓰기가 어려워집니다.
     학생마다 맞는 단계를 골라 인쇄하면 같은 일기로 여러 수준을 쓸 수 있습니다. */
  var TRACE_MODES = [
    { id: 'text',  name: '글자',    desc: '완성된 글자를 그대로 읽어요' },
    { id: 'first', name: '첫글자만', desc: '줄마다 첫 글자만 진해요 — 나머지는 따라 써요' },
    { id: 'trace', name: '따라쓰기', desc: '연한 글씨 위에 그대로 따라 써요' },
    { id: 'empty', name: '빈칸',    desc: '칸만 나와요 — 보고 옮겨 써요' }
  ];

  var PUNCT = /[.,!?…‥·:;]/;

  function gridRows(lines, cols) {
    var rows = [];
    (lines || []).forEach(function (line) {
      var chars = String(line).split('');
      var row = [''];                                    // 문단 첫 칸은 비웁니다
      for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        if (row.length >= cols) {
          /* 문장부호는 줄 첫 칸에 올 수 없습니다 → 앞 줄 마지막 칸에 함께 넣습니다 */
          if (PUNCT.test(ch)) { row[cols - 1] = row[cols - 1] + ch; continue; }
          rows.push(row); row = [];
          if (ch === ' ') continue;                      // 줄 끝 띄어쓰기는 넘기지 않습니다
        }
        row.push(ch);
      }
      while (row.length < cols) row.push('');            // 남는 칸은 빈 칸으로
      rows.push(row);
    });
    return rows;
  }

  /* 줄 수가 MAX_ROWS 를 넘지 않는 가장 큰 글씨(= 가장 적은 칸 수)를 고릅니다.
     모자라면 빈 줄을 채워 늘 5줄 이상 보이게 합니다. */
  function fitGrid(lines) {
    for (var i = 0; i < COL_OPTIONS.length; i++) {
      var cols = COL_OPTIONS[i];
      var rows = gridRows(lines, cols);
      if (rows.length <= MAX_ROWS || i === COL_OPTIONS.length - 1) {
        while (rows.length < MIN_ROWS) {
          var blank = [];
          for (var c = 0; c < cols; c++) blank.push('');
          rows.push(blank);
        }
        if (rows.length > MAX_ROWS) rows = rows.slice(0, MAX_ROWS);
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

    /* 3단계(자유쓰기)는 글이 길어서 원고지 칸에 다 담기지 않습니다.
       그래서 3단계만 밑줄로 바꿔 줍니다. */
    var useLines = d.level === 3;
    var g = useLines ? { cols: 0, rows: [] } : fitGrid(lines);
    var dt = App.parseKey(d.date);
    var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
    var mode = p.trace || 'text';        // text | first | trace | empty

    /* 보통의 그림일기 양식 :
       날짜·날씨 줄 → 일어난·잠드는 시간 줄 → 그림 칸 → 제목 줄 → 원고지 칸 */
    return html`<div class=${'pd-sheet t-' + mode}>

      <div class="pd-line pd-datebar">
        <span class="pd-date">
          <b class="pd-val">${dt.getFullYear()}</b> 년
          <b class="pd-val">${dt.getMonth() + 1}</b> 월
          <b class="pd-val">${dt.getDate()}</b> 일
          <b class="pd-val">${WEEK[dt.getDay()]}</b> 요일
        </span>
        <span class="pd-weather">날씨
          ${WEATHER.map(function (w) {
            return html`<span key=${w.key} class="pd-wi" role="img" aria-label=${w.name} title=${w.name}
              dangerouslySetInnerHTML=${{ __html:
                '<svg viewBox="0 0 48 48" fill="none">' + w.svg + '</svg>' }} />`;
          })}
        </span>
      </div>

      <div class="pd-line pd-timebar">
        <span class="pd-half">일어난 시간:</span>
        <span class="pd-half">잠드는 시간:</span>
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
                  <span class="pd-art-thumb" aria-hidden="true"
                    dangerouslySetInnerHTML=${{ __html: App.icon('map') }} />
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

      ${useLines
        /* 3단계(자유쓰기)는 칸이 아니라 밑줄에 씁니다.
           글이 길어져도 한 장에 다 담기고, 칸에 맞춰 쓰는 부담도 없습니다. */
        ? html`<div class="pd-lines">
            ${lines.map(function (s, i) {
              return html`<p key=${i} class=${'pd-ln pd-ch' + (i === 0 ? ' lead' : '')}>${s}</p>`;
            })}
          </div>`
        /* 1·2단계는 원고지 칸에 한 글자씩 */
        : html`<div class="pd-grid" style=${{ gridTemplateColumns: 'repeat(' + g.cols + ', 1fr)',
            fontSize: Math.round(790 / g.cols * 0.58) + 'px' }}>
          ${g.rows.map(function (row, r) {
            /* '첫 글자만' 판을 위해 줄마다 첫 글자가 어디인지 표시해 둡니다 */
            var lead = -1;
            for (var i = 0; i < row.length; i++) { if (row[i]) { lead = i; break; } }
            return row.map(function (ch, c) {
              return html`<span key=${r + '-' + c} class="pd-box">
                <span class=${'pd-ch' + (c === lead ? ' lead' : '')}>${ch}</span></span>`;
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
    /* 인쇄 모양 : 글자 → 첫글자만 → 따라쓰기 → 빈칸 (오른쪽으로 갈수록 어려워집니다) */
    var traceS = useState('text');

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

    /* 인쇄 모양 단추 4개는 제목·단추와 한 줄에 두면 서로 밀려 제목이 잘립니다 → 아랫줄로 */
    var modeBar = html`<div class="wrap" style=${{ gap: '.25rem', justifyContent: 'center' }}>
      <span class="small" style=${{ fontWeight: 900 }}>인쇄 모양</span>
      ${TRACE_MODES.map(function (m) {
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
