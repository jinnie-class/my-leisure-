/* ===========================================================
   나의 여가 — 앱 시작점 (화면 이동 · 인쇄 · 첫 실행)
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  /* 지금 열려 있는 것이 최신판인지 확인할 때 씁니다.
     선생님 설정 → 데이터 → 저장 상태 에서 볼 수 있습니다. */
  App.VERSION = '2026-08-26 · 가로 게임판 3 (백업 안전 · 뒤로 단추 · 연타 잠금)';

  /* 인쇄 내용을 담아 두는 자리 (실제 그리기는 Root 가 맡습니다) */
  var setPrintContent = null;
  App.printNode = function (node) {
    if (!setPrintContent) return;
    setPrintContent(node);
    document.body.classList.add('printing');
    setTimeout(function () {
      try { window.print(); } catch (e) {}
      setTimeout(function () {
        document.body.classList.remove('printing');
        if (setPrintContent) setPrintContent(null);
      }, 600);
    }, 180);
  };
  App.printPlan = function (plan) {
    if (!plan) return;
    var student = App.store.student(plan.studentId) || App.store.current();
    App.printNode(html`<div style=${{ padding: '4px' }}>
      <${C.PlanSheet} plan=${plan} student=${student} />
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
    App.navBack = navBack;

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
    useIfExists(App.IMAGE_BASE.wallpaper, '--wallpaper');
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
