/* ===========================================================
   나의 여가 — 표지 (첫 화면)
   · 가운데 아래 : 시작하기
   · 오른쪽 위   : 전체화면 · 선생님 설정
   · 시작하기를 고르면 표지 테두리가 노랗게 밝아지고 단추가 앞으로 나옵니다.
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useEffect = React.useEffect,
      useRef = React.useRef, useLayoutEffect = React.useLayoutEffect;

  /* 전체화면 켜기 / 끄기 (지원하지 않는 브라우저에서도 오류가 나지 않습니다) */
  App.fullscreen = {
    supported: function () {
      var el = document.documentElement;
      return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen);
    },
    isOn: function () {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    },
    toggle: function () {
      try {
        if (App.fullscreen.isOn()) {
          var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
          if (exit) exit.call(document);
        } else {
          var el = document.documentElement;
          var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
          if (req) { var r = req.call(el); if (r && r['catch']) r['catch'](function () {}); }
          else { App.ui.toast('이 브라우저는 전체화면을 지원하지 않아요. 키보드 F11 을 눌러 보세요.'); }
        }
      } catch (e) {
        App.ui.toast('전체화면으로 바꾸지 못했어요. 키보드 F11 을 눌러 보세요.');
      }
    }
  };

  /* 전체화면 상태를 지켜보는 도우미 */
  C.useFullscreen = function () {
    var s = useState(App.fullscreen.isOn());
    useEffect(function () {
      function sync() { s[1](App.fullscreen.isOn()); }
      document.addEventListener('fullscreenchange', sync);
      document.addEventListener('webkitfullscreenchange', sync);
      return function () {
        document.removeEventListener('fullscreenchange', sync);
        document.removeEventListener('webkitfullscreenchange', sync);
      };
    }, []);
    return s[0];
  };

  /* 음소거 단추 — 누르면 그 학생의 음성 안내가 꺼지고 켜집니다 */
  C.MuteBtn = function () {
    App.useStore();
    var st = App.store.current();
    var on = !st || st.voice !== false;      // on = 소리 켜짐
    return html`<${C.IconBtn} uiKey="speaker" icon=${on ? 'speaker' : 'speakerOff'}
      off=${!on}
      label=${on ? '소리 끄기' : '소리 켜기'}
      onClick=${function () {
        if (!st) return;
        App.speech.stop();
        App.store.updateStudent(st.id, { voice: !on });
      }} />`;
  };

  /* 전체화면 단추 — 그림만 크게 (설명 글자는 넣지 않습니다) */
  C.FullscreenBtn = function () {
    var on = C.useFullscreen();
    return html`<${C.IconBtn} uiKey="fullscreen" icon=${on ? 'shrink' : 'expand'}
      label=${on ? '전체화면 끄기' : '전체화면으로 보기'}
      onClick=${function () { App.fullscreen.toggle(); }} />`;
  };

  C.CoverScreen = function (p) {
    App.useStore();
    var student = App.store.current();
    var lit = useState(false);          // 시작하기를 고르는 중인지 (테두리 밝아짐)
    var failed = useState(false);
    var ar = useState(1.57);            // 표지 그림의 가로세로 비율
    var stageRef = useRef(null);
    var box = useState({ w: 0, h: 0 });

    /* 표지 액자 크기를 직접 계산합니다.
       (CSS 의 aspect-ratio 만으로는 세로 화면에서 그림이 잘려서, 여기서 정확히 맞춥니다) */
    useLayoutEffect(function () {
      function measure() {
        var el = stageRef.current; if (!el) return;
        var r = el.getBoundingClientRect();
        box[1](function (prev) {
          return (Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1)
            ? prev : { w: r.width, h: r.height };
        });
      }
      measure();
      var ro = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
      if (ro && stageRef.current) ro.observe(stageRef.current);
      window.addEventListener('resize', measure);
      return function () { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    /* 가로·세로 어느 쪽에도 넘치지 않는 가장 큰 크기 */
    var frameStyle = null;
    if (box[0].w > 0 && box[0].h > 0 && ar[0]) {
      var fw = Math.min(box[0].w, box[0].h * ar[0]);
      frameStyle = { width: Math.floor(fw) + 'px', height: Math.floor(fw / ar[0]) + 'px' };
    }

    function start() {
      App.speech.stop();
      p.nav(App.store.get().students.length ? 'home' : 'profiles');
    }

    var glow = { onMouseEnter: function () { lit[1](true); },
                 onMouseLeave: function () { lit[1](false); },
                 onFocus: function () { lit[1](true); },
                 onBlur: function () { lit[1](false); },
                 onTouchStart: function () { lit[1](true); },
                 onTouchEnd: function () { lit[1](false); } };

    var showImg = !failed[0];
    return html`<div class=${'app cover-app' + (lit[0] ? ' lit' : '')} data-corner="home">
      <div class="cover">
        <div class="cover-stage" ref=${stageRef}>
          <div class=${'cover-frame' + (showImg ? '' : ' is-text')}
               style=${showImg ? frameStyle : null}>

            ${showImg
              ? html`<img class="cover-img" src=${App.IMAGE_BASE.cover} alt="나의 여가 표지 그림"
                  onLoad=${function (e) {
                    var n = e.target;
                    if (n.naturalWidth && n.naturalHeight) ar[1](n.naturalWidth / n.naturalHeight);
                  }}
                  onError=${function () { failed[1](true); }} />`
              : html`<div class="cover-fallback">
                  <div class="cover-title">나의 여가</div>
                  <p>내가 좋아하는 여가를 찾아보아요.</p>
                </div>`}

            <!-- 표지 안 오른쪽 위 : 소리끄기 · 전체화면 · 선생님 설정
                 (학생 바꾸기는 표지에 두지 않습니다 — 홈 화면 위쪽과 선생님 설정에 있습니다) -->
            <div class="cover-top">
              <${C.MuteBtn} />
              <${C.FullscreenBtn} />
              <${C.IconBtn} uiKey="gear" icon="gear" label="선생님 설정"
                onClick=${function () { p.nav('teacher'); }} />
            </div>

            <!-- 표지 안 가운데 아래 -->
            <div class="cover-actions">
              <button type="button" class="start-btn" onClick=${start} ...${glow}>
                <span class="start-ico" aria-hidden="true"
                  dangerouslySetInnerHTML=${{ __html: App.icon('next') }} />
                <span>시작하기</span>
              </button>

              <${C.Speak} short=${true}
                text="나의 여가. 내가 좋아하는 여가를 찾아보아요. 시작하기를 눌러 보세요." />
            </div>
          </div>
        </div>
      </div>
    </div>`;
  };
})();
