/* ===========================================================
   나의 여가 — 앱 시작점 (화면 이동 · 인쇄 · 첫 실행)
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  /* 지금 열려 있는 것이 최신판인지 확인할 때 씁니다.
     선생님 설정 → 데이터 → 저장 상태 에서 볼 수 있습니다. */
  App.VERSION = '2026-08-17 · 그림일기판 (모으기·전시·칭찬)';

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
      if (route && route.name !== name) {
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
      <${C.TurnHint} />
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
      if (window.ReactDOM.createRoot) {
        window.ReactDOM.createRoot(root).render(html`<${Root} />`);
      } else {
        window.ReactDOM.render(html`<${Root} />`, root);
      }
    };
    /* 사진 저장소를 먼저 준비한 뒤 화면을 그립니다 */
    App.photos.init().then(render)['catch'](render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
