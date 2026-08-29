/* ===========================================================
   나의 여가 — 앱 시작점 (화면 이동 · 인쇄 · 첫 실행)
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  /* 지금 열려 있는 것이 최신판인지 확인할 때 씁니다.
     선생님 설정 → 데이터 → 저장 상태 에서 볼 수 있습니다. */
  App.VERSION = '2026-08-26 · 세 기기판 (전자칠판·태블릿·노트북)';

  /* ============ 화면 높이 재기 (`--vh`) — ⛔⛔ 태블릿에서 꼭 필요합니다 ============

     안드로이드 브라우저(태블릿)에서 `1vh` 는 **주소창이 숨겨졌을 때의 큰 높이**를
     가리킵니다. 지금 보이는 높이가 아닙니다.

       껍데기(.app)  : `100dvh` — **지금 보이는** 높이 (620px)
       안쪽 그림·글자 : `16vh` 등 — **주소창 숨긴** 높이 (720px) 기준

     그래서 껍데기는 620px 인데 내용물이 720px 화면에 맞춰 커집니다.
     16% 쯤 넘쳐서 다음 쪽으로 밀리고, **고르는 카드가 화면에서 사라집니다.**
     선생님 : 「나의일기 쓰기를 위한 그림들이 처음부터 끝까지 보이지 않아서
     선택할 수 없고 일기를 쓸 수 없는 상태」 (2026-08-29 태블릿)

     전자칠판·노트북은 주소창이 접히지 않아 `vh` = `dvh` 라 멀쩡했습니다.
     **한 기기에서만 나는 탈**이라 화면을 줄여 보는 것만으로는 못 찾습니다.

     ▸ 고침 : 여기서 **실제 보이는 높이**를 재어 `--vh` 에 넣고,
       css 의 `16vh` 를 `calc(16 * var(--vh))` 로 씁니다.
       `dvh` 를 그냥 쓰지 않는 것은 오래된 전자칠판 브라우저가 `dvh` 를 모르면
       그 줄이 통째로 버려져 크기가 0 이 되기 때문입니다. `--vh` 는 어디서나 돕니다.
     ⚠ 주소창이 접히고 펴질 때마다 높이가 바뀌므로 `resize` 에서 다시 잽니다.
       화면을 돌릴 때(orientationchange)는 조금 늦게 재야 새 높이가 나옵니다. */
  function setVH() {
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!h) return;
    document.documentElement.style.setProperty('--vh', (h / 100) + 'px');
  }
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', function () { setTimeout(setVH, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', setVH);
  App.setVH = setVH;

  /* 인쇄 내용을 담아 두는 자리 (실제 그리기는 Root 가 맡습니다) */
  var setPrintContent = null;
  /* ⛔⛔ **글꼴이 다 실린 뒤에 인쇄창을 엽니다** (2026-08-29 · 선생님 말씀 —
       「아직 나눔바른펜이 안나와 **그래서 페이지도 넘어가고**」).
       나눔바른펜 파일은 **5.27MB** 입니다. `font-display:swap` 이라 그동안은
       기본 글꼴로 그려지는데, 그 글꼴이 **20% 쯤 넓습니다**
       (같은 문장 : 펜 450px · 기본 539px). 그래서 —
         · 글씨가 펜 글씨가 아니고
         · 넓어진 만큼 **쪽이 넘어갑니다**
       0.18초만 기다리다가 인쇄창을 열면, 글꼴이 아직 안 왔을 때 그대로 찍힙니다.
     ▸ `document.fonts.ready` 는 글꼴이 다 실리면 알려 줍니다.
     ⚠ 3초를 넘기면 그냥 엽니다 — 글꼴을 못 읽는 곳(파일로 열기 등)에서
       인쇄가 아예 안 되면 더 곤란합니다. */
  App.printNode = function (node) {
    if (!setPrintContent) return;
    setPrintContent(node);
    document.body.classList.add('printing');
    function 인쇄() {
      try { window.print(); } catch (e) {}
      setTimeout(function () {
        document.body.classList.remove('printing');
        if (setPrintContent) setPrintContent(null);
      }, 600);
    }
    setTimeout(function () {
      var 열림 = false;
      function 한번만() { if (!열림) { 열림 = true; 인쇄(); } }
      setTimeout(한번만, 3000);                    // 안전장치
      /* ⛔ `document.fonts.ready` 만으로는 **안 됩니다.**
           그것은 **이미 부르고 있는** 글꼴만 기다립니다. 나눔바른펜은
           `font-display:swap` 이라 **처음 쓰일 때** 부르기 시작하는데,
           인쇄 종이는 방금 만들어져서 아직 안 불렀을 수 있습니다.
           실제로 재어 보니 192ms 만에 인쇄창이 열려 기본 글꼴로 찍혔습니다.
         ▸ `document.fonts.load` 로 **직접 불러** 놓고 기다립니다. */
      if (document.fonts && document.fonts.load) {
        document.fonts.load("40px 'NanumBarunpen'", '가나다')
          .then(function () { return document.fonts.ready; })
          .then(한번만)['catch'](한번만);
      } else 한번만();
    }, 180);
  };
  App.printPlan = function (plan) {
    if (!plan) return;
    var student = App.store.student(plan.studentId) || App.store.current();
    App.printNode(html`<div style=${{ padding: '4px' }}>
      <${C.PlanSheet} plan=${plan} student=${student} />
      <${C.PlanWorksheet} plan=${plan} student=${student} />
    </div>`);
  };

  /* ══════════ 오류 안전망 (2026-08-25) ══════════
     ★ 그리는 도중 오류가 나면 React 18 은 화면을 **통째로 내립니다** —
       아무 안내 없는 흰 화면만 남고, 학생도 선생님도 까닭을 알 수 없습니다
       (html 주석 사고 때 실제로 겪었습니다 — 작업노트 §4).
     ▸ 여기서 받아서 「선생님을 불러 주세요」 화면으로 바꿉니다.
       학생 기록은 localStorage/IndexedDB 에 이미 있으므로 다시 열면 그대로입니다.
     ⛔ 지우지 마세요. 평소에는 아무 일도 하지 않습니다. */
  function ErrorBoundary(props) {
    React.Component.call(this, props);
    this.state = { err: null };
  }
  ErrorBoundary.prototype = Object.create(React.Component.prototype);
  ErrorBoundary.prototype.constructor = ErrorBoundary;
  ErrorBoundary.getDerivedStateFromError = function (e) { return { err: e || true }; };
  ErrorBoundary.prototype.componentDidCatch = function (e) {
    try { console.error('나의 여가 — 화면 오류:', e); } catch (x) {}
  };
  ErrorBoundary.prototype.render = function () {
    if (!this.state.err) return this.props.children;
    var msg = '';
    try { msg = String(this.state.err && this.state.err.message || this.state.err); } catch (x) {}
    return html`<div class="crash" role="alert">
      <div class="crash-card">
        <div class="crash-emoji" aria-hidden="true">🌳</div>
        <h1>잠깐 쉬었다 할게요</h1>
        <p>화면에 문제가 생겼어요. <b>선생님을 불러 주세요.</b><br />
          지금까지 저장한 기록은 그대로 있어요.</p>
        <button type="button" class="btn primary big"
          onClick=${function () { location.reload(); }}>다시 열기</button>
        ${msg && html`<p class="crash-detail">선생님께 : ${msg}</p>`}
      </div>
    </div>`;
  };

  function Root() {
    var store = App.useStore();
    var routeS = useState(function () { return { name: 'cover', params: {} }; });
    var route = routeS[0];
    var printS = useState(null);

    useEffect(function () { setPrintContent = printS[1]; return function () { setPrintContent = null; }; }, []);

    /* ── 지나온 길 ────────────────────────────────────────────────
       ★ 파란 화살표는 **바로 앞 화면**으로 가야 합니다.
         예전에는 화면마다 `홈으로` 라고 손으로 적어 두었습니다. 그래서
         그림일기 → 일기 고치기 에서 화살표를 누르면 그림일기가 아니라
         홈으로 튀었습니다. 화면이 늘 때마다 같은 실수가 되풀이됩니다.
         그래서 **앱이 지나온 길을 기억**하고, 화살표는 그 길을 되짚습니다.
       ▸ 20칸만 남깁니다. 그보다 오래된 길은 되짚을 일이 없습니다. */
    var histRef = useRef([]);

    function nav(name, params) {
      App.speech.stop();
      /* 같은 화면을 다시 부르는 것은 길이 아니므로 쌓지 않습니다
         (같은 화면에서 딸린 값만 바꾸는 경우).
         ※ 길을 쌓는 일은 setState 안에서 하지 마세요 — React 가 그 함수를
           두 번 부를 수 있어서 같은 길이 두 번 쌓입니다. */
      /* ★ 가려는 곳이 **길의 맨 위와 같은 화면이면 = 되돌아가는 이동**입니다 (2026-08-25).
           그때는 쌓지 않고 그 칸을 **되짚어(pop)** 없앱니다.
           예전에는 되돌아가는 nav('portfolio') 도 길에 쌓여서,
             포트폴리오 → 그림일기 → (되돌아옴) 포트폴리오 → 파란 화살표
           를 누르면 홈이 아니라 **방금 나온 그림일기로 다시** 갔습니다.
           map.js 가 같은 증상을 두 번 만나 화면마다 p.back 을 피해 둔 것이
           이 뿌리 때문이었습니다.
         ▸ 딸린 값(params)이 달라도 이름이 같으면 되짚은 것으로 봅니다 —
           같은 화면을 두 겹으로 쌓아 두면 뒤로가기가 제자리를 돕니다. */
      var top = histRef.current[histRef.current.length - 1];
      if (top && top.name === name) {
        histRef.current.pop();
      } else if (route && route.name !== name) {
        histRef.current.push(route);
        if (histRef.current.length > 20) histRef.current.shift();
      }
      routeS[1]({ name: name, params: params || {} });
      /* 새 화면은 언제나 처음부터 보이도록 */
      var el = document.querySelector('.stage-track');
      if (el) el.scrollLeft = 0;
    }

    /* 바로 앞 화면으로. 되짚을 길이 없으면 fallback (기본은 홈) 으로 갑니다. */
    function navBack(fallback) {
      App.speech.stop();
      var prev = histRef.current.pop();
      routeS[1](prev || { name: fallback || 'home', params: {} });
      var el = document.querySelector('.stage-track');
      if (el) el.scrollLeft = 0;
    }

    App.nav = nav;

    /* ══════════ 안드로이드·브라우저 뒤로가기 (2026-08-26) ══════════
       ★ 예전에는 태블릿의 뒤로 단추를 누르면 **앱 밖으로** 나갔습니다
         (전체화면이면 그대로 종료). 학생 화면에서는 사고입니다.
       ▸ 방법 : 켜질 때 history 에 한 칸을 쌓아 두고, popstate 가 오면
         곧바로 한 칸을 다시 쌓아 **앱 밖으로 못 나가게** 한 뒤,
         화면에 보이는 것과 똑같이 움직입니다 —
           · 팝업(확인창·큰 창)이 열려 있으면 → 그 팝업을 닫고
           · 파란 화살표가 있으면 → 그것을 누른 것과 같게
             (앞 질문으로 · 나가기 확인 「여기까지 저장할까요?」 포함)
           · 둘 다 없으면(표지·홈) → 아무 일도 하지 않습니다.
       ⛔ 여기서 navBack() 을 **직접 부르지 마세요** — 계획·일기의 단계
          되돌리기와 나가기 확인을 건너뛰어, 쓰던 것을 묻지도 않고 버립니다.
          화면의 단추를 그대로 누르는 것이 언제나 화면과 같은 결과를 냅니다. */
    useEffect(function () {
      try { history.pushState({ ny: 1 }, ''); } catch (e) {}
      function onPop() {
        try { history.pushState({ ny: 1 }, ''); } catch (e) {}
        var mask = document.querySelector('.mask');
        if (mask) {
          /* 바깥을 누른 것과 같게 — 확인창은 「그대로 있기」, 큰 창은 닫기 */
          try { mask.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch (e) {}
          return;
        }
        var back = document.querySelector('.topbar-back, .topbar-backbtn');
        if (back) back.click();
      }
      window.addEventListener('popstate', onPop);
      return function () { window.removeEventListener('popstate', onPop); };
    }, []);

    /* 학생이 하나도 없으면 학생 화면으로 (표지는 그대로 둡니다) */
    useEffect(function () {
      if (!store.students.length &&
          route.name !== 'profiles' && route.name !== 'teacher' && route.name !== 'cover') {
        routeS[1]({ name: 'profiles', params: {} });
      }
    }, [store.students.length, route.name]);

    /* 화면들은 `p.back()` 으로 바로 앞 화면에 갑니다 (파란 화살표).
       `p.nav('home')` 처럼 갈 곳을 손으로 적지 마세요 — 그러면 어디에서
       들어왔든 늘 같은 곳으로 튑니다. */
    var p = { nav: nav, back: navBack, params: route.params };
    var screen;
    switch (route.name) {
      case 'cover':     screen = html`<${C.CoverScreen} ...${p} />`; break;
      case 'profiles':  screen = html`<${C.ProfilesScreen} ...${p} />`; break;
      case 'avatar':    screen = html`<${C.AvatarScreen} ...${p} />`; break;
      case 'plan':      screen = html`<${C.PlanScreen} ...${p} />`; break;
      case 'map':       screen = html`<${C.MapScreen} ...${p} />`; break;
      /* 지도 다음 화면 — 해봤어요·좋아해요·도전·모르겠어요를 모아 봅니다 */
      case 'mymap':     screen = html`<${C.MyMapScreen} ...${p} />`; break;
      case 'diary':     screen = html`<${C.DiaryScreen} ...${p} />`; break;
      case 'picdiary':  screen = html`<${C.PicDiaryScreen} ...${p} />`; break;
      /* 그림일기를 고치는 좌우 2단 화면 · 날짜별로 쌓이는 일기 모음 */
      case 'fixdiary':  screen = html`<${C.FixDiaryScreen} ...${p} />`; break;
      case 'journal':   screen = html`<${C.JournalScreen} ...${p} />`; break;
      case 'portfolio': screen = html`<${C.PortfolioScreen} ...${p} />`; break;
      case 'teacher':   screen = html`<${C.TeacherScreen} ...${p} />`; break;
      default:          screen = html`<${C.HomeScreen} ...${p} />`;
    }

    /* 화면이 바뀌면 React 가 통째로 새로 그리도록 key 를 줍니다 */
    return html`<${React.Fragment}>
      ${React.cloneElement(screen, { key: route.name + JSON.stringify(route.params) })}
      <div id="print-root" class="print-area">${printS[0]}</div>
      <${C.UiHost} />
    <//>`;
  }

  /* ------------------------- 시작 ------------------------- */
  function boot() {
    App.store.init();

    /* 배경 벽지를 CSS 에 알려 줍니다.
       (경로는 js/data/activities.js 의 App.IMAGE_BASE 한 곳에서 관리)
       그림 파일이 없으면 조용히 바탕색만 쓰도록 미리 확인합니다. */
    /* 그림 파일이 있을 때에만 CSS 변수에 넣어 줍니다.
       ※ --wallpaper 같은 사용자 정의 속성 안의 상대 경로는, 그 값을 쓰는
          스타일시트(css/app.css) 를 기준으로 풀립니다. 그대로 두면
          'css/images/벽지.jpg' 를 찾다가 못 찾아 그림이 안 나옵니다.
          그래서 문서 기준의 절대 주소로 바꾸어 넣습니다. */
    function useIfExists(path, cssVar) {
      if (!path) return;
      var url = App.imgUrl(path);
      try { url = new URL(url, document.baseURI).href; } catch (e) {}
      var probe = new Image();
      probe.onload = function () {
        document.documentElement.style.setProperty(cssVar, 'url("' + url + '")');
      };
      probe.src = url;
    }
    /* ★ 벽지는 **끕니다** (2026-08-26 · B안 : 회색 바탕 + 흰 스테이지 + 파랑 하나).
         무늬 벽지는 카드·그림과 겹쳐 시각 자극을 늘립니다.
         되살리려면 아래 줄의 주석을 풀면 됩니다 — 그림 파일은 그대로 있습니다. */
    /* useIfExists(App.IMAGE_BASE.wallpaper, '--wallpaper'); */
    useIfExists(App.IMAGE_BASE.mapbg, '--mapbg');
    /* 포트폴리오 첫 화면 창 다섯 안쪽의 바탕 그림 */
    useIfExists(App.IMAGE_BASE.folioBg, '--folio-bg');

    var root = document.getElementById('root');
    var render = function () {
      var tree = html`<${ErrorBoundary}><${Root} /><//>`;
      if (window.ReactDOM.createRoot) {
        window.ReactDOM.createRoot(root).render(tree);
      } else {
        window.ReactDOM.render(tree, root);
      }
    };
    /* 사진 저장소를 먼저 준비한 뒤 화면을 그립니다 */
    App.photos.init().then(render)['catch'](render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
