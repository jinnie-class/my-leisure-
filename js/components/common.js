/* ===========================================================
   나의 여가 — 다시 쓰는 화면 조각들
   (버튼 · 읽어주기 · 활동카드 · 단계표시 · 무대(좌우 페이지) ·
    확인창 · 성공 알림 · 학생 표시 · 상태 배지)
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});
  var React = window.React;
  var html = window.htm.bind(React.createElement);
  var useState = React.useState, useEffect = React.useEffect,
      useRef = React.useRef, useCallback = React.useCallback,
      useLayoutEffect = React.useLayoutEffect, useMemo = React.useMemo;

  App.html = html;
  var C = (App.C = {});

  /* ======================= 전역 상태 구독 ======================= */
  App.useStore = function () {
    var sub = useCallback(function (cb) { return App.store.subscribe(cb); }, []);
    var get = useCallback(function () { return App.store.get(); }, []);
    if (React.useSyncExternalStore) return React.useSyncExternalStore(sub, get);
    var s = useState(App.store.get());
    useEffect(function () { return App.store.subscribe(function () { s[1](App.store.get()); }); }, []);
    return s[0];
  };

  /* ======================= 안내 · 확인창 ======================= */
  var uiSubs = [];
  var uiQueue = { confirm: null, toast: null };
  function uiEmit() { uiSubs.slice().forEach(function (f) { try { f(); } catch (e) {} }); }

  App.ui = {
    subscribe: function (fn) { uiSubs.push(fn); return function () { uiSubs = uiSubs.filter(function (f) { return f !== fn; }); }; },
    peek: function () { return uiQueue; },
    /* 확인창 : Promise<boolean> */
    confirm: function (opts) {
      return new Promise(function (resolve) {
        uiQueue.confirm = Object.assign({
          title: '계속할까요?', body: '', okText: '네', cancelText: '아니요',
          tone: 'normal', icon: 'question'
        }, opts || {}, {
          _done: function (v) { uiQueue.confirm = null; uiEmit(); resolve(v); }
        });
        uiEmit();
      });
    },
    /* 두 번 확인 (삭제 · 초기화) */
    confirmTwice: function (a, b) {
      return App.ui.confirm(a).then(function (ok) {
        if (!ok) return false;
        return App.ui.confirm(b);
      });
    },
    toast: function (msg) {
      uiQueue.toast = { msg: msg, at: Date.now() };
      uiEmit();
      setTimeout(function () {
        if (uiQueue.toast && Date.now() - uiQueue.toast.at >= 2400) { uiQueue.toast = null; uiEmit(); }
      }, 2500);
    }
  };

  C.UiHost = function () {
    var sub = useCallback(function (cb) { return App.ui.subscribe(cb); }, []);
    var tick = useState(0);
    useEffect(function () { return sub(function () { tick[1](function (n) { return n + 1; }); }); }, []);
    var q = App.ui.peek();
    return html`<${React.Fragment}>
      ${q.confirm && html`<${C.ConfirmModal} ...${q.confirm} />`}
      ${q.toast && html`<div class="toast" role="status" aria-live="polite">${q.toast.msg}</div>`}
    <//>`;
  };

  C.ConfirmModal = function (p) {
    var okRef = useRef(null);
    useEffect(function () { if (okRef.current) okRef.current.focus(); }, []);
    function key(e) {
      if (e.key === 'Escape') { e.stopPropagation(); p._done(false); }
    }
    return html`<div class="mask" onKeyDown=${key} onMouseDown=${function (e) { if (e.target === e.currentTarget) p._done(false); }}>
      <div class="modal" role="dialog" aria-modal="true" aria-label=${p.title}>
        <div style=${{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
          <${C.Art} iconKey=${p.icon} size=${44} />
          <div class="grow">
            <h2>${p.title}</h2>
            ${p.body && html`<p style=${{ fontSize: '1.02rem', lineHeight: 1.55, fontWeight: 700 }}>${p.body}</p>`}
          </div>
        </div>
        <div class="acts">
          <button ref=${okRef} class=${'btn ' + (p.tone === 'danger' ? 'danger' : 'ok')} onClick=${function () { p._done(true); }}>${p.okText}</button>
          <button class="btn" onClick=${function () { p._done(false); }}>${p.cancelText}</button>
        </div>
      </div>
    </div>`;
  };

  /* 화면 안에서 직접 쓰는 큰 팝업 */
  C.Modal = function (p) {
    var ref = useRef(null);
    useEffect(function () {
      var el = ref.current; if (!el) return;
      var f = el.querySelector('button,[href],input,select,textarea,[tabindex]');
      if (f) f.focus();
    }, []);
    return html`<div class="mask"
        onMouseDown=${function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); }}
        onKeyDown=${function (e) { if (e.key === 'Escape' && p.onClose) p.onClose(); }}>
      <!-- 창 폭은 **속에 든 것에 맞춰** 고릅니다.
           wide   그림판 · 인쇄 모양처럼 넓어야 하는 것 (1100px)
           (기본) 사진 격자 · 목록 (760px)
           narrow 단추 한둘뿐인 것 (460px)
           ⚠ 속은 단추 하나인데 wide 를 주면 화면 폭을 통째로 먹어
             쓸데없이 옆으로 긴 창이 됩니다.
           ⛔ 이 주석 안에 백틱을 쓰면 템플릿이 끊깁니다 (인수인계 2-3). -->
      <div class=${'modal' + (p.wide ? ' wide' : '') + (p.narrow ? ' narrow' : '')}
          ref=${ref} role="dialog" aria-modal="true"
          aria-label=${p.title || ''} style=${p.style}>
        ${p.title && html`<div class="q" style=${{ marginBottom: '.4rem' }}>
          <h2 class="grow">${p.title}</h2>
          ${p.speak !== false && html`<${C.Speak} text=${p.speakText || p.title} />`}
        </div>`}
        ${p.children}
        ${p.actions && html`<div class="acts">${p.actions}</div>`}
      </div>
    </div>`;
  };

  /* ======================= 폭죽 =======================
     도장 하나를 다 채웠을 때 터뜨리는 축하 폭죽입니다.

     ▸ 왜 CSS 로만 만들었나 : 그림 파일도, 소리 파일도 더 받지 않습니다.
       색종이 조각 하나하나가 그냥 작은 네모(`<i>`)이고, 날아가는 길은
       `--dx` · `--dy` 두 값으로만 정해집니다 (아래 `.fw-bit` 를 보세요).
     ▸ 화면을 가리지 않습니다 : `pointer-events:none` 이라 폭죽 위로도
       단추를 누를 수 있고, 3.5초 뒤에 스스로 사라집니다.
     ▸ 얼마나 오래 터지나 : 마지막 자리가 1.7초에 터지고, 조각이 1.6초 동안
       날아가 떨어지므로 3.3초쯤에 끝납니다. 그 뒤 0.2초를 두고 치웁니다.
       ⚠ 자리 수·터지는 사이(d)·조각이 나는 시간(fw-fly) 셋 가운데 하나만
         고치면 폭죽이 끝나기 전에 사라지거나, 끝난 뒤에도 빈 칸이 남습니다.
         셋을 늘 함께 셈해 주세요.
     ▸ 어지러움을 느끼는 학생을 위해, 운영체제에서 '움직임 줄이기' 를
       켜 두면 (`prefers-reduced-motion`) 조용히 나타났다 사라집니다.
     ▸ 소리는 내지 않습니다. 축하 말은 부르는 쪽에서 `App.speakFor` 로
       읽어 주면 됩니다 — 소리를 둘이 겹치면 시끄럽습니다. */
  var FW_COLORS = ['#ff6b6b', '#ffd23f', '#4dd4ac', '#5aa9f7', '#c58bf2', '#ff9f5a'];
  C.Fireworks = function (p) {
    var onDone = p.onDone;
    useEffect(function () {
      if (!onDone) return;
      var t = setTimeout(onDone, 3500);
      return function () { clearTimeout(t); };
    }, [onDone]);

    /* 터지는 자리 여섯 곳 · 자리마다 색종이 18조각.
       ★ 예전에는 세 곳이 0.44초 안에 다 터져서 눈 깜짝할 새에 지나갔습니다.
         자리를 늘리고 **사이를 벌려** 차례로 터지게 하면, 조각 수를 크게
         늘리지 않고도 축하가 오래 이어집니다.
       ▸ 자리를 화면 위쪽에 넓게 흩어 놓아야 한 곳에서만 터지는 느낌이
         나지 않습니다. */
    var bursts = [
      { x: 24, y: 34, d: 0 },   { x: 76, y: 30, d: .28 },
      { x: 50, y: 52, d: .56 }, { x: 14, y: 58, d: .9 },
      { x: 86, y: 56, d: 1.25 }, { x: 50, y: 24, d: 1.7 }
    ];
    var PER = 18;
    return html`<div class="fw" aria-hidden="true">
      ${bursts.map(function (b, bi) {
        return html`<div key=${bi} class="fw-burst"
            style=${{ left: b.x + '%', top: b.y + '%' }}>
          ${Array.apply(null, { length: PER }).map(function (_, i) {
            var ang = (Math.PI * 2 * i) / PER;
            var far = 70 + (i % 3) * 26;                 // 조각마다 날아가는 거리를 조금씩 다르게
            return html`<i key=${i} class="fw-bit" style=${{
              '--dx': Math.cos(ang) * far + 'px',
              '--dy': Math.sin(ang) * far + 'px',
              '--c': FW_COLORS[i % FW_COLORS.length],
              animationDelay: b.d + 's'
            }} />`;
          })}
        </div>`;
      })}
    </div>`;
  };

  /* ======================= 그림 ======================= */
  /* PNG 파일이 있으면 PNG 를, 없으면 기본 SVG 를 보여 줍니다. */
  C.Art = function (p) {
    var fail = useState(false);
    useEffect(function () { fail[1](false); }, [p.src]);
    var style = { width: p.size ? p.size + 'px' : '100%', height: p.size ? p.size + 'px' : '100%', display: 'block', objectFit: 'contain' };
    if (p.src && !fail[0]) {
      return html`<img src=${p.src} alt="" style=${style} onError=${function () { fail[1](true); }} />`;
    }
    return html`<span aria-hidden="true" style=${style}
      dangerouslySetInnerHTML=${{ __html: App.icon(p.iconKey || 'question') }} />`;
  };

  /* 여가 지도의 활동 표시 (해봤어요 · 좋아해요 · 도전하고 싶어요 · 아직 잘 모르겠어요).
     images/<이름>.png 가 있으면 그 그림을, 없으면 코드로 그린 SVG 를 씁니다.
     st 는 App.DATA.mapStates 의 한 항목입니다. */
  C.StateArt = function (p) {
    var st = p.state;
    if (!st) return null;
    return html`<${C.Art} src=${App.uiImage(st.id)} iconKey=${st.icon} size=${p.size} />`;
  };

  /* 기분 얼굴 — images/얼굴표정/<끝맺은 꼴>.png 가 있으면 그 그림을,
     없으면 코드로 그린 SVG 얼굴을 씁니다. */
  C.MoodArt = function (p) {
    var m = p.mood || App.mood(p.moodId);
    if (!m) return null;
    return html`<${C.Art} src=${App.moodImage(m)} iconKey=${m.icon} size=${p.size} />`;
  };

  /* 계획하GO! 에서 고르는 것들의 그림 — `언제 · 시간 · 장소 · 또하기`.
     `word` 는 화면에 보이는 말 그대로입니다 (`낮`, `조리실`, `또 하고 싶어요`).
     그림 파일이 없으면 `iconKey` 의 SVG 가 대신 나오므로,
     **그림을 한 장씩 넣어도 넣은 것부터 바로 보입니다.** */
  C.PickArt = function (p) {
    return html`<${C.Art} src=${App.pickImage(p.kind, p.word)} iconKey=${p.iconKey || 'question'}
      size=${p.size} />`;
  };

  C.ActivityArt = function (p) {
    var a = p.activity;
    if (!a) return html`<${C.Art} iconKey="question" size=${p.size} />`;
    return html`<${C.Art} src=${App.activityImage(a)} iconKey=${a.icon} size=${p.size} />`;
  };

  /* 학생이 캐릭터를 아직 고르지 않았으면 성별에 맞는 기본 캐릭터를 씁니다 */
  App.avatarFor = function (student) {
    var id = student && student.avatarId;
    if (id) { var a = App.avatar(id); if (a) return a; }
    var want = (student && student.gender === 'boy') ? 'boy' : 'girl';
    return App.avatar(want) || App.DATA.avatars[0];
  };

  C.AvatarArt = function (p) {
    /* '내 얼굴로 만들기' 로 넣은 사진이 있으면 캐릭터 대신 그 사진을 씁니다.
       얼굴 사진은 동그란 칸에 꽉 차게(cover) 넣습니다. */
    var face = p.student && p.student.facePhotoId ? App.photos.url(p.student.facePhotoId) : null;
    if (face) {
      var sz = p.size ? p.size + 'px' : '100%';
      return html`<img src=${face} alt="" class="face-photo"
        style=${{ width: sz, height: sz, display: 'block', objectFit: 'cover', borderRadius: '50%' }} />`;
    }
    var av = p.student ? App.avatarFor(p.student)
                       : (App.avatar(p.avatarId) || App.DATA.avatars[0]);
    return html`<${C.Art} src=${App.avatarImage(av)} iconKey=${av.icon} size=${p.size} />`;
  };

  /* 함께하는 사람 그림 (그림이 없으면 기본 SVG 로 대체) */
  C.PartnerArt = function (p) {
    var pt = p.partner || App.partner(p.partnerId);
    if (!pt) return null;
    var student = p.student !== undefined ? p.student : App.store.current();
    return html`<${C.Art} src=${App.partnerImage(pt, student)} iconKey=${pt.icon} size=${p.size} />`;
  };

  /* 캐릭터 고르기 (갈래별로 나누어 보여 줍니다) */
  C.AvatarPicker = function (p) {
    var groups = App.DATA.avatarGroups;
    var cur = App.avatar(p.value);
    var gs = useState((cur && cur.group) || groups[0].id);
    var list = App.DATA.avatars.filter(function (a) { return a.group === gs[0]; });
    return html`<div>
      <div class="wrap" style=${{ marginBottom: '.45rem' }}>
        ${groups.map(function (g) {
          return html`<button key=${g.id} type="button" class=${'tab' + (gs[0] === g.id ? ' on' : '')}
            aria-pressed=${gs[0] === g.id ? 'true' : 'false'}
            onClick=${function () { gs[1](g.id); }}>${gs[0] === g.id ? '✓ ' : ''}${g.name}</button>`;
        })}
      </div>
      <${C.PickGrid} cols=${6} label="캐릭터">
        ${list.map(function (a) {
          return html`<${C.Pick} key=${a.id} selected=${p.value === a.id} label=${a.name} speak=${false}
            onClick=${function () { p.onChange(a.id); }}
            art=${html`<${C.AvatarArt} avatarId=${a.id} />`} />`;
        })}
      <//>
    </div>`;
  };

  /* ======================= 읽어주기 ======================= */
  App.speakFor = function (student, text) {
    if (student && student.voice === false) return false;
    if (!App.speech.supported()) { App.ui.toast('이 브라우저에서는 음성 안내를 사용할 수 없어요. 글자로 읽어 주세요.'); return false; }
    var ok = App.speech.speak(text);
    if (!ok) App.ui.toast('지금은 소리로 읽어 줄 수 없어요.');
    return ok;
  };

  C.Speak = function (p) {
    var st = App.store.current();
    if (st && st.voice === false) return null;
    /* 읽어주기는 어디서나 소리 그림 하나로만 보여 줍니다 (글자는 넣지 않아요).
       화면 낭독기에는 aria-label 로 뜻이 전해집니다. */
    var label = p.label || '읽어주기';
    var src = App.uiImage('speaker');
    var fail = useState(false);
    var useImg = src && !fail[0];
    return html`<button type="button" class=${'iconbtn' + (useImg ? ' has-img' : '')} title=${label}
      aria-label=${label + ': ' + (p.text || '')}
      onClick=${function (e) { e.stopPropagation(); App.speakFor(st, p.text); }}>
      ${useImg
        ? html`<img src=${src} alt="" onError=${function () { fail[1](true); }} />`
        : html`<span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.uiIcon('speaker') }} />`}
    </button>`;
  };

  /* 그림만 있는 둥근 단추.
     uiKey 를 주면 images 폴더의 단추 그림(동그라미까지 그려진 PNG)을 씁니다.
     그림이 없으면 코드로 그린 선 아이콘이 대신 나옵니다. */
  C.IconBtn = function (p) {
    var src = p.uiKey ? App.uiImage(p.uiKey) : null;
    var fail = useState(false);
    useEffect(function () { fail[1](false); }, [src]);
    var useImg = src && !fail[0];
    var inset = p.uiKey && (App.IMAGE_BASE.uiInset || {})[p.uiKey];
    var cls = 'iconbtn' + (useImg ? ' has-img' : '') + (useImg && inset ? ' inset' : '') +
              (p.off ? ' off' : '') + (p.className ? ' ' + p.className : '');
    return html`<button type="button" class=${cls}
        onClick=${p.onClick} aria-label=${p.label} title=${p.label}>
      ${useImg
        ? html`<img src=${src} alt="" onError=${function () { fail[1](true); }} />`
        : html`<span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.uiIcon(p.icon) }} />`}
    </button>`;
  };

  /* ======================= 버튼 ======================= */
  C.Btn = function (p) {
    var cls = ['btn'];
    if (p.kind) cls.push(p.kind);
    if (p.size) cls.push(p.size);
    if (p.wide) cls.push('wide');
    if (p.className) cls.push(p.className);
    return html`<button type="button" class=${cls.join(' ')} disabled=${!!p.disabled}
      onClick=${p.onClick} aria-label=${p.ariaLabel} title=${p.title}>
      ${p.icon && html`<span class="ico" aria-hidden="true"
        dangerouslySetInnerHTML=${{ __html: App.icon(p.icon) }} />`}
      <span>${p.children}</span>
    </button>`;
  };

  /* ======================= 위 / 아래 막대 ======================= */
  /* 위쪽 줄.
     p.below 를 주면 아랫줄이 하나 더 생깁니다 — 단계 표시처럼 길어서
     제목·단추와 한 줄에 두면 서로 밀려 찌그러지는 것들을 내려놓는 자리입니다. */
  /* 맨 위 줄.
     ★ 자리와 뜻을 셋으로 **분명하게** 나눴습니다 (선생님 제안).
       · 왼쪽 파란 화살표 → **앞 화면으로** (`p.onBack`)
       · 코너 제목(`여가 계획하기` …) → 누르면 **홈**(코너 네 개가 있는 곳)
       · 홈에서는 제목 자리에 **`나의 여가` 표지 글자** → 누르면 **표지**
     ▸ 화살표는 제목 앞 파란 세로줄보다 **더 앞**에 옵니다.
       그래야 '뒤로 → 제목' 순서로 눈이 자연스럽게 흐릅니다.
     ▸ 제목이 단추가 되면서 위에 비어 있던 자리가 쓰임새를 갖습니다. */
  C.TopBar = function (p) {
    var title = p.title && (p.onTitle
      ? html`<button type="button" class="topbar-title as-btn" onClick=${p.onTitle}
            aria-label=${p.titleLabel || (p.title + ' — 누르면 나의 여가로 가요')}
            title=${p.titleLabel || '나의 여가로'}>
          ${p.sub && html`<div class="sub">${p.sub}</div>`}
          <div class="title">${p.title}</div>
        </button>`
      : html`<div class="topbar-title">
          ${p.sub && html`<div class="sub">${p.sub}</div>`}
          <div class="title">${p.title}</div>
        </div>`);
    return html`<header class=${'topbar pagepad' + (p.below ? ' two' : '')}>
      <div class="topbar-row">
        <!-- ★ backText 를 주면 화살표 **자리에 글자 단추**가 들어갑니다.
               화살표만으로는 어디로 가는지 몰라서 학생이 누르지 못한다는
               이야기가 있었습니다. 갈 곳이 정해진 화면에서는 글로 적어 둡니다.
             ▸ 자리는 그대로라 다른 화면과 어긋나지 않고, 흰 칸 높이도
               한 픽셀도 먹지 않습니다 (아래에 두면 그림일기가 작아집니다). -->
        ${p.onBack && (p.backText
          ? html`<${C.Btn} size="small" icon="back" className="topbar-backbtn pastel-pink"
              onClick=${p.onBack}>${p.backText}<//>`
          : html`<${C.IconBtn} uiKey="back" icon="back" className="topbar-back"
              label=${p.backLabel || '앞 화면으로'} onClick=${p.onBack} />`)}
        ${p.left}
        ${title}
        <div class="spacer"></div>
        ${p.children}
      </div>
      ${p.below && html`<div class="topbar-row below">${p.below}</div>`}
    </header>`;
  };

  C.BottomBar = function (p) {
    return html`<footer class="bottombar pagepad">
      ${p.onBack && html`<${C.Btn} icon="back" onClick=${p.onBack}>${p.backLabel || '이전'}<//>`}
      ${p.extraLeft}
      <div class="spacer"></div>
      ${p.center}
      <div class="spacer"></div>
      ${p.extraRight}
      ${p.onHome && html`<${C.Btn} icon="home" onClick=${p.onHome}>홈<//>`}
      ${p.onNext && html`<${C.Btn} kind="primary" icon="next" disabled=${p.nextDisabled} onClick=${p.onNext}>${p.nextLabel || '다음'}<//>`}
    </footer>`;
  };

  /* 큰 점으로 보여 주는 진행 표시 — 글씨를 못 읽어도 어디쯤인지 알 수 있어요 */
  C.Dots = function (p) {
    var total = p.total, cur = p.current;
    return html`<div class="dots-bar" role="status"
        aria-label=${'모두 ' + total + '단계 가운데 ' + (cur + 1) + '단계'}>
      ${Array.apply(null, { length: total }).map(function (_, i) {
        return html`<span key=${i} class=${'dot-big' + (i < cur ? ' done' : (i === cur ? ' on' : ''))}></span>`;
      })}
      <span class="dots-num">${cur + 1} / ${total}</span>
    </div>`;
  };

  /* ======================= 단계 표시 ======================= */
  C.Steps = function (p) {
    return html`<nav class="steps" aria-label="진행 단계">
      ${p.steps.map(function (s, i) {
        var cls = 'dot' + (i === p.current ? ' on' : (i < p.current ? ' done' : ''));
        return html`<span key=${i} class=${cls}
          aria-current=${i === p.current ? 'step' : null}>${i < p.current ? '✓ ' : ''}${s}</span>`;
      })}
    </nav>`;
  };

  /* ======================= 무대 : 좌우로 넘기는 페이지 ======================= */
  /* 세로 스크롤을 만들지 않고, 넘치는 내용은 오른쪽 페이지로 이어집니다.
     ← → 방향키, 화면의 ‹ › 단추, 손가락 밀기로 페이지를 넘길 수 있습니다. */
  C.Stage = function (p) {
    var trackRef = useRef(null);
    var st = useState({ pages: 1, page: 0 });
    var s = st[0], setS = st[1];
    var touch = useRef({ x: 0, y: 0 });

    /* 한 페이지의 폭(=단 폭)과 페이지 수를 잽니다.
       테두리 안쪽 여백을 뺀 '내용 폭'을 단 폭으로 써야 페이지가 정확히 맞습니다. */
    function metrics(el) {
      var cs = window.getComputedStyle(el);
      var padL = parseFloat(cs.paddingLeft) || 0;
      var padR = parseFloat(cs.paddingRight) || 0;
      var gap = parseFloat(cs.columnGap) || 0;
      var contentW = el.clientWidth - padL - padR;
      return { padL: padL, padR: padR, gap: gap, contentW: contentW, stride: contentW + gap };
    }

    /* 같은 순간에 재는 일이 반복되지 않도록 막아 둡니다. */
    var pass = useRef({ n: 0, t: 0 });

    /* ---------------- 남는 자리를 잽니다 (`--slack`) ----------------
       내용을 다 담고도 **얼마가 남는지**입니다. 지금은 홈의 `나의 여가`
       제목이 이 값을 써서, 남는 만큼만 위아래로 숨 쉴 자리를 벌립니다.

       남는 자리는 **두 군데**에 생깁니다. 화면마다 다르므로 둘 다 봅니다.
        ① 흰 칸 **안** — 흰 칸이 화면 높이를 다 쓰는 화면(지도처럼)
        ② 흰 칸 **아래** — 흰 칸이 내용만큼만 커지는 화면(홈처럼).
           홈은 카드 두 줄이 끝나면 흰 칸도 거기서 끝나고,
           남는 자리는 흰 칸 **바깥 아래쪽**에 생깁니다.

       ⚠ ① 을 `scrollHeight` 로는 알 수 없습니다. 내용이 짧아도
         `scrollHeight` 는 칸 높이보다 작아지지 않아 늘 0 이 나옵니다.
         그래서 첫 자식과 마지막 자식의 자리로 내용 높이를 직접 구합니다.
       ⚠ 반드시 `--slack` 을 0 으로 되돌린 뒤에 부르세요. 그러지 않으면
         '여백을 넓혔더니 남는 자리가 줄고, 줄었으니 여백이 좁아지고…'
         하며 값이 계속 흔들립니다. */
    function measureSlack(el) {
      var inside = 0;
      var kids = el.children;
      if (kids.length) {
        var cs = window.getComputedStyle(el);
        var padT = parseFloat(cs.paddingTop) || 0;
        var padB = parseFloat(cs.paddingBottom) || 0;
        var top = kids[0].getBoundingClientRect().top;
        var bottom = kids[kids.length - 1].getBoundingClientRect().bottom;
        inside = (el.clientHeight - padT - padB) - (bottom - top);
      }

      var below = 0;
      var panel = el.closest ? el.closest('.panel') : null;
      var host = el.closest ? el.closest('.app') : null;
      if (panel && host) {
        var hcs = window.getComputedStyle(host);
        var floor = host.getBoundingClientRect().bottom - (parseFloat(hcs.paddingBottom) || 0);
        below = floor - panel.getBoundingClientRect().bottom;
      }

      return Math.max(0, Math.floor(Math.max(inside, below)));
    }

    var measure = useCallback(function () {
      var el = trackRef.current; if (!el) return;
      if (!el.clientWidth) return;
      var now = Date.now();
      if (now - pass.current.t > 150) pass.current = { n: 0, t: now };
      if (pass.current.n > 5) return;
      pass.current.n++;

      var m = metrics(el);
      if (m.contentW <= 0) return;

      /* 내용이 흰 칸 높이를 넘을 때에만 좌우 페이지로 나눕니다.
         짧은 내용이면 단 나누기를 꺼서 흰 칸이 내용만큼만 차지하게 합니다.

         ※ 단 나누기(column-fill:auto)는 높이가 '확정'되어야 동작합니다.
            flex 로 정해진 높이는 확정으로 보지 않으므로, 넘칠 때에는
            지금 높이를 픽셀로 직접 지정해 줍니다. */
      el.style.columnWidth = 'auto';
      el.style.height = '';
      /* 지난번에 줄여 두었거나 쪼개 두었던 것을 **먼저 되돌립니다.**
         그러지 않으면 화면을 옮길 때마다 조금씩 더 작아집니다. */
      el.style.setProperty('--fit', '1');
      el.classList.remove('fitting');
      el.classList.remove('flowing');

      /* ---------- 남는 자리(`--slack`) 를 알려 줍니다 ----------
         내용을 다 담고도 **얼마가 남는지**를 재어 CSS 에 넘깁니다.
         지금은 홈의 `나의 여가` 제목이 이 값을 써서, 남는 만큼만 위아래로
         숨 쉴 자리를 벌립니다 (`.home-title` — 남는 게 없으면 0 이 됩니다).

         ⚠ `scrollHeight` 로는 알 수 없습니다. 내용이 짧아도 `scrollHeight` 는
           칸 높이보다 작아지지 않아서 **늘 0 이 나옵니다.** 그래서 첫 자식과
           마지막 자식의 자리를 재어 내용 높이를 직접 구합니다.

         ※ 재는 순서가 중요합니다. 먼저 `--slack` 을 **0 으로 되돌린 뒤**
           재야 합니다. 그러지 않으면 '여백을 넓혔더니 남는 자리가 줄고,
           줄었으니 여백이 좁아지고…' 하며 값이 계속 흔들립니다. */
      /* 남는 자리를 재어 `--slack` 으로 넘겨 줍니다 (자세한 것은 measureSlack).
         ★ 여백을 준 **뒤에** 넘치는지 꼭 다시 봅니다.
           그러지 않으면 여백이 내용을 밀어내서, 남는 자리가 넉넉해 보이는데도
           마지막 칸(오늘의 도전 같은)이 **2쪽으로 밀려납니다.**
           1쪽에는 큰 빈자리만 남고 학생은 왜 비었는지 알 수 없습니다.
         넘치면 여백을 절반 → 4분의 1 → 0 으로 줄여 가며 맞춥니다.
         한 번에 0 으로 떨어뜨리지 않는 까닭 : 조금이라도 숨 쉴 자리를 남기려는 것입니다. */
      el.style.setProperty('--slack', '0px');
      var want = measureSlack(el);
      var tries = [want, Math.floor(want / 2), Math.floor(want / 4), 0];
      for (var ti = 0; ti < tries.length; ti++) {
        el.style.setProperty('--slack', tries[ti] + 'px');
        if (el.scrollHeight <= el.clientHeight + 2) break;    // 넘치지 않으면 그대로
      }

      var avail = el.clientHeight;

      /* ===== ⛔ **1쪽이 비면 안 됩니다** — 두 겹으로 막습니다 (2026-08-23) =====
         고장난 모습 : 「무엇을 할까요?」 화면에 고를 것이 하나도 없고
         「1 / 3」 만 있었습니다. 흰 칸이 314px 인데 내용이 397px 이라,
         질문 줄만 1쪽에 남고 **활동 카드가 통째로 2쪽으로** 갔던 것입니다.
         (카드 묶음은 중간에 잘리지 않게 되어 있어 조금만 넘쳐도 통째로 넘어갑니다)
         계획·일기·첫 화면에서 두루 났고, **세로 화면에서도** 났습니다.

         ① 먼저 **통째로 살짝 줄여** 한 쪽에 담아 봅니다.
            글자와 그림이 조금 작아질 뿐 내용이 사라지지 않으니 이쪽이 먼저입니다.
            0.58 까지 줄입니다.
            ⚠ 예전에는 0.76 이 끝이었습니다. 그런데 **브라우저 글자 크기를 키운**
              선생님 화면에서는 그것으로 모자라, 「어디에서 했나요?」 에 장소가
              셋만 보이고 나머지가 2쪽으로 넘어갔습니다 (아래 186px 이 남는데도).
              확대해서 보는 분에게는 0.58 로 줄여도 **원래보다 큽니다** —
              확대한 만큼을 되돌리는 것뿐이니 겁내지 마세요.
         ② 그래도 모자라면 칸이 **이어서 채워지게** 풉니다.
            카드 묶음이 두 쪽에 걸쳐 나뉘지만, 1쪽이 비는 것보다 낫습니다.
         ⛔ 둘 중 하나만 두지 마세요. ① 만으로는 아주 낮은 화면을 못 담고,
            ② 만 두면 멀쩡히 한 쪽에 들어갈 화면까지 굳이 쪼갭니다. */
      var FITS = [1, 0.94, 0.88, 0.82, 0.76, 0.70, 0.64, 0.58];
      var fi = 0;
      while (fi < FITS.length - 1 && avail > 0 && el.scrollHeight > avail + 2) {
        fi++;
        el.classList.add('fitting');
        el.style.setProperty('--fit', String(FITS[fi]));
      }
      if (avail > 0 && el.scrollHeight > avail + 2) el.classList.add('flowing');

      var natural = el.scrollHeight;

      var n = 1;
      if (natural > avail + 2 && avail > 0) {
        el.style.height = avail + 'px';
        el.style.columnWidth = Math.floor(m.contentW) + 'px';
        var span = el.scrollWidth - m.padL - m.padR;       // 단들이 차지한 전체 폭
        n = Math.max(1, Math.round((span + m.gap) / m.stride));
        if (n > 40) n = 40;
        /* ★ 쪽이 하나로 나왔으면 **높이 잠금을 풀어야** 합니다.
             넘친다고 판단해서 높이를 지금 크기로 못박아 놓고 쪽은 하나이면,
             넘친 부분이 잘린 채 **넘겨 볼 방법도 없습니다.**
             (사람 카드 7장 화면에서 글자 아랫부분 15px 이 잘려 있었습니다)
             잠금을 풀면 흰 칸이 내용만큼 늘어나 잘리지 않습니다. */
        if (n <= 1) { el.style.height = ''; el.style.columnWidth = 'auto'; }
      }
      setS(function (prev) {
        var page = Math.min(prev.page, n - 1);
        return (prev.pages === n && prev.page === page) ? prev : { pages: n, page: page };
      });
    }, []);

    useLayoutEffect(function () {
      measure();
      var raf = window.requestAnimationFrame(function () { pass.current = { n: 0, t: 0 }; measure(); });
      var t = setTimeout(function () { pass.current = { n: 0, t: 0 }; measure(); }, 280);
      return function () { window.cancelAnimationFrame(raf); clearTimeout(t); };
    });

    useEffect(function () {
      var el = trackRef.current; if (!el) return;
      var ro = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
      if (ro) ro.observe(el);
      window.addEventListener('resize', measure);
      return function () { if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
    }, [measure]);

    /* 페이지 위치 적용 */
    useEffect(function () {
      var el = trackRef.current; if (!el) return;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = s.page * metrics(el).stride;
    }, [s.page, s.pages]);

    var go = useCallback(function (dir) {
      setS(function (prev) {
        var next = Math.max(0, Math.min(prev.pages - 1, prev.page + dir));
        return next === prev.page ? prev : { pages: prev.pages, page: next };
      });
    }, []);

    /* 좌우 방향키 */
    useEffect(function () {
      function onKey(e) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var t = e.target;
        if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
        if (document.querySelector('.mask')) return;      // 팝업이 열려 있으면 넘기지 않음
        e.preventDefault();
        go(e.key === 'ArrowRight' ? 1 : -1);
      }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [go]);

    function onTouchStart(e) {
      var t = e.touches && e.touches[0]; if (!t) return;
      touch.current = { x: t.clientX, y: t.clientY };
    }
    function onTouchEnd(e) {
      var t = e.changedTouches && e.changedTouches[0]; if (!t) return;
      var dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? 1 : -1);
    }

    /* ★ tall : 남는 높이를 **흰 칸이 다 쓰게** 합니다.
         평소에는 무대가 내용만큼만 커지고 남는 높이는 여백으로 둡니다.
         그런데 완성 화면처럼 **종이를 크게 보는 것이 목적**인 화면에서는
         그 여백이 그대로 손해입니다. 1247x1130 에서 창은 1130 인데
         무대가 691 만 써서, 1024x768 과 종이 크기가 똑같았습니다.
       ▸ 이 화면에서만 켭니다. 다른 화면의 여백은 그대로 둡니다.
       ⛔ 여기는 **JS 자리**입니다. HTML 주석(<!-- -->)을 쓰면 문법 오류가 납니다. */
    return html`<div class=${'stage' + (p.tall ? ' tall' : '')}>
      <div class="panel">
      ${p.top && html`<div class="panel-top">${p.top}</div>`}
      <!-- ★ onePage : 쪽 나누기를 **아예 끕니다.**
             다단(column)은 내용이 흰 칸보다 조금만 커도 통째로 다음 쪽으로
             밀어내어 **1쪽이 텅 비어** 보입니다. 확인 화면처럼 한 장으로
             보여 주어야 하는 화면은 나누지 말고, 넘치면 줄여서 맞춥니다.
           ⚠ zoom 으로 줄여도 소용없습니다 — 다단은 **줄이기 전 높이**로
             쪽을 나눕니다. 나누기 자체를 꺼야 합니다.
           ⛔ 이 주석 안에 백틱을 쓰면 템플릿이 끊깁니다 (인수인계 2-3 · 14-30). -->
      <div class=${'stage-track' + (p.onePage ? ' no-page' : '')} ref=${trackRef}
           onTouchStart=${onTouchStart} onTouchEnd=${onTouchEnd}>
        ${p.children}
      </div>
      ${s.pages > 1 && html`<div class="pager">
        <button type="button" class="pager-btn" aria-label="앞 페이지" disabled=${s.page === 0}
          onClick=${function () { go(-1); }}>‹</button>
        <span class="dots" role="status" aria-live="polite">${s.page + 1} / ${s.pages}</span>
        <button type="button" class="pager-btn" aria-label="다음 페이지" disabled=${s.page >= s.pages - 1}
          onClick=${function () { go(1); }}>›</button>
      </div>`}
      ${p.action && html`<div class="panel-action">${p.action}</div>`}
      </div>
    </div>`;
  };

  /* 지도처럼 스스로 크기를 맞추는 화면용 (페이지 나눔 없음) */
  /* 좌우 쪽 나누기가 **없는** 흰 칸입니다 (캐릭터 고르기처럼 한 화면에 다 담는 곳).
     ⛔ 쪽이 없으니 넘치면 갈 곳이 없어 **밖으로 삐져나오거나 잘립니다.**
        갤럭시탭에서 캐릭터 그림이 이름 글자를 덮고, 「1 / 3 쪽」과 「다음」이
        카드 위에 겹쳐 있었습니다 (2026-08-23).
     ▸ 그래서 여기에도 Stage 와 **같은 줄이기**를 넣습니다.
       다만 이어 채우기(.flowing)는 없습니다 — 넘겨 볼 쪽이 없으니까요. */
  /* ======================= 세로로 돌려 주세요 =======================
     ★ 이 앱은 **세로 화면**을 기준으로 만듭니다 (2026-08-23에 정했습니다).
       가로로 눕힌 태블릿은 위아래가 절반밖에 안 돼서, 그림이 최소 크기까지
       쪼그라들고도 모자라 화면이 좌우로 갈라집니다.
         갤럭시탭 세로  … 흰 칸에 쓸 수 있는 높이 838px · 그림 250~300px
         갤럭시탭 가로  … 337~559px · 그림 140~150px (더 못 줄임)
     ▸ **태블릿·휴대폰만** 대상입니다. 손가락으로 쓰는 기기(pointer:coarse)이면서
       가로이고 높이가 780px 아래일 때만 나옵니다.
       ⛔ 전자칠판과 PC 는 가로여도 높이가 넉넉하므로 뜨지 않습니다.
          (전자칠판도 손가락으로 쓰지만 화면이 커서 높이 조건에 안 걸립니다)
     ▸ 막지는 않습니다. 「그냥 가로로 볼래요」 를 누르면 그대로 쓸 수 있습니다 —
       기기 사정으로 세로가 안 되는 분을 가두면 안 됩니다. */
  C.TurnHint = function () {
    var offS = useState(false);
    if (offS[0]) return null;
    return html`<div class="turn-hint" role="note">
      <div class="turn-card">
        <div class="turn-emoji" aria-hidden="true">📱</div>
        <b>태블릿을 세로로 돌려 주세요</b>
        <div class="turn-say">세로로 세우면 그림이 두 배 크고,
          고를 것이 한 화면에 다 보여요.</div>
        <${C.Btn} size="small" onClick=${function () { offS[1](true); }}>
          그냥 가로로 볼래요<//>
      </div>
    </div>`;
  };

  C.useFitBox = function (ref) {
    useLayoutEffect(function () {
      function fit() {
        var el = ref.current; if (!el || !el.clientHeight) return;
        el.style.setProperty('--fit', '1');
        el.classList.remove('fitting');
        var FITS = [1, 0.94, 0.88, 0.82, 0.76, 0.70, 0.64, 0.58];
        var avail = el.clientHeight;
        for (var i = 1; i < FITS.length && el.scrollHeight > avail + 2; i++) {
          el.classList.add('fitting');
          el.style.setProperty('--fit', String(FITS[i]));
        }
      }
      fit();
      /* 그림이 늦게 실리면 높이가 달라지므로 한 번 더 봅니다 */
      var t = setTimeout(fit, 280);
      window.addEventListener('resize', fit);
      return function () { clearTimeout(t); window.removeEventListener('resize', fit); };
    });
  };
  C.StageFit = function (p) {
    var ref = useRef(null);
    C.useFitBox(ref);
    return html`<div class="stage"><div class="panel">
      <div class="stage-fit" ref=${ref}>${p.children}</div></div></div>`;
  };

  /* ======================= 질문 머리말 ======================= */
  /* 화면 안 질문.
     `bar` 를 주면 **동그란 흰 알약 바에 담아 가운데**에 놓습니다.
     학생이 '지금 무엇을 묻는지' 를 한눈에 찾게 하려는 것입니다.
     읽어주기는 알약 밖 오른쪽에 그대로 둡니다 (화면마다 한 자리 — 규칙 4). */
  C.Question = function (p) {
    if (p.bar) {
      /* 차례 : 질문 → 읽어주기 → (오른쪽 끝) 딸린 단추.
         읽어주기는 **질문 바로 옆**에 있어야 '이 질문을 읽어 준다' 로 읽힙니다.
         오른쪽 끝에 두면 옆에 놓인 단추의 읽어주기처럼 보였습니다. */
      return html`<div class=${'q q-bar' + (p.right ? ' has-right' : '')}>
        <span class="q-pill"><h2>${p.children}</h2></span>
        ${p.hint && html`<span class="hint">${p.hint}</span>`}
        ${p.speak !== false && html`<${C.Speak} text=${p.speakText || (typeof p.children === 'string' ? p.children : '')} />`}
        <!-- note : 지금 고른 일기 단계가 무엇을 하는 것인지 한 줄로.
             ★ 예전에는 이 설명이 단추의 title= 툴팁에만 있어서, 마우스를 올려야
               보였습니다. 태블릿 · 전자칠판에는 올릴 마우스가 없어 아무도 못 봤습니다.
             ▸ 학생에게 읽어 줄 말이 아니라 지금 무엇을 하는 중인지 알리는 안내라
               읽어주기에는 넣지 않습니다. -->
        ${p.note && html`<span class="q-note">${p.note}</span>`}
        <!-- 질문 줄 오른쪽 끝 : 되돌아가는 단추처럼 '질문에 딸린 단추' 를
             여기에 둡니다. 아래에 두면 쪽 넘기는 단추와 섞여
             무엇이 무엇인지 헷갈립니다. -->
        ${p.right && html`<span class="q-right">${p.right}</span>`}
      </div>`;
    }
    return html`<div class="q">
      <h2 class="grow">${p.children}</h2>
      ${p.hint && html`<span class="hint">${p.hint}</span>`}
      ${p.speak !== false && html`<${C.Speak} text=${p.speakText || (typeof p.children === 'string' ? p.children : '')} />`}
    </div>`;
  };

  /* ======================= 고쳐 쓸 수 있는 문장 칸 =======================
     낱말을 골라 만든 문장이 문맥에 안 맞을 때가 있어서,
     점선 칸을 눌러 학생이 바로 고쳐 쓸 수 있게 했습니다.
       p.made    : 고른 낱말로 저절로 만들어진 문장
       p.value   : 고쳐 쓴 문장 (아직 안 고쳤으면 null)
       p.onChange(v) / p.onReset()                                   */
  C.SentenceEdit = function (p) {
    var edited = p.value !== null && p.value !== undefined;
    var text = edited ? p.value : (p.made || '');
    var ta = useRef(null);

    /* 글이 길어지면 칸이 저절로 늘어납니다 (안쪽 스크롤이 생기지 않게).
       학생 화면에서는 스크롤을 만들지 않는 것이 규칙이라서요.
       ★ **글이 바뀔 때만 재면 안 됩니다.** 칸의 **폭**이 바뀌면 줄 수가
         달라지는데, 그때 다시 재지 않으면 앞 두 줄만 보이고 뒷글이
         잘려 나갑니다. 완성 화면은 한 쪽에 맞추느라 통째로 줄였다 늘였다
         하므로(useFitOnePage 의 zoom), 폭이 실제로 여러 번 바뀝니다.
       ▸ 그래서 ResizeObserver 로 **칸 자체를 지켜보다가** 다시 잽니다.
       ⛔ 지우지 마세요 — 지우면 긴 일기의 뒷부분이 안 보입니다. */
    useLayoutEffect(function () {
      var el = ta.current; if (!el) return;
      /* ⚠ `height = scrollHeight` 만으로는 **테두리 두께만큼 잘립니다.**
           이 앱은 box-sizing 이 border-box 라, 준 높이 안에 테두리(3px x 2)가
           들어갑니다. scrollHeight 에는 테두리가 없으므로 6px 이 모자라
           마지막 줄이 잘렸습니다 (재어서 확인).
         → 테두리 두께를 더해 줍니다. */
      function fit() {
        el.style.height = 'auto';
        var cs = window.getComputedStyle(el);
        var extra = (cs.boxSizing === 'border-box')
          ? (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0)
          : 0;
        el.style.height = (el.scrollHeight + extra) + 'px';
      }
      fit();
      var ro = window.ResizeObserver ? new window.ResizeObserver(fit) : null;
      if (ro) ro.observe(el);
      window.addEventListener('resize', fit);
      return function () { if (ro) ro.disconnect(); window.removeEventListener('resize', fit); };
    }, [text]);

    return html`<div class="sentence-box">
      <div class="sentence-head">
        <span class="sentence-cap">${p.title || '완성된 일기'}</span>
        <!-- 이 칸이 곧 '일기 내용 고치기' 입니다. 저장한 뒤 따로 있던 화면으로
             가지 않고 여기서 바로 고칩니다 — 그래서 말도 그렇게 적습니다. -->
        <span class="sentence-hint">✎ 여기를 눌러 일기를 고쳐 쓸 수 있어요</span>
      </div>
      <!-- 읽어주기를 노란 칸 **안쪽 왼쪽**에 넣습니다.
           칸 밖 아랫줄에 두면 그 한 줄만큼 아래 그림일기가 밀려 내려가서,
           그림일기를 그만큼 작게 보여 줄 수밖에 없었습니다. -->
      <div class="sentence-paper">
        <textarea class="sentence-edit" ref=${ta} value=${text}
          placeholder=${p.placeholder || '빈칸을 채우면 문장이 저절로 만들어져요. 여기를 눌러 고쳐 쓸 수도 있어요.'}
          aria-label="일기 문장. 눌러서 직접 고쳐 쓸 수 있어요."
          onChange=${function (e) { p.onChange(e.target.value); }} />
        <span class="sentence-speak"><${C.Speak} text=${text.replace(/\n/g, ' ')} /></span>
      </div>
      ${edited && html`<div class="sentence-tools">
        <div class="grow"></div>
        <${C.Btn} size="small" icon="back" onClick=${p.onReset}>고른 낱말로 되돌리기<//>
      </div>`}
    </div>`;
  };

  /* ======================= 선택 카드 ======================= */
  C.Pick = function (p) {
    /* bare : 그림이 카드를 꽉 채우는 경우 흰 카드 틀을 없앱니다.
       (실내에서 해요 / 실외에서 해요 처럼 그림 자체가 장면일 때) */
    var cls = 'pick' + (p.selected ? ' sel' : '') + (p.compact ? ' compact' : '')
            + (p.bare ? ' bare' : '');
    /* ★ 읽어주기 단추를 **글자 오른쪽 옆**에 붙입니다.
         예전에는 글자 아래에 따로 한 줄을 차지해서, 카드 높이를 그만큼 먹고
         그림이 작아졌습니다. 옆으로 옮기고 크기도 줄였습니다
         (css 의 `.pick-name` · `.pick-name .speak`). */
    return html`<button type="button" class=${cls} onClick=${p.onClick}
        aria-pressed=${p.selected ? 'true' : 'false'} aria-label=${p.ariaLabel || p.label}>
      <span class="check" aria-hidden="true">✓</span>
      <span class=${'thumb' + (p.portrait ? ' portrait' : '')}>${p.art}</span>
      <span class="pick-name">
        <span class="label">${p.label}</span>
        ${p.speak !== false && p.speakText && html`<${C.Speak} short=${true} text=${p.speakText} />`}
      </span>
      ${p.note && html`<span class="note">${p.note}</span>`}
      ${p.more && html`<span class="more">${p.more}</span>`}
    </button>`;
  };

  C.PickGrid = function (p) {
    /* scene : 그림이 아이콘이 아니라 **풍경 장면**일 때 (아침·낮·저녁처럼).
       칸을 3:2 로 넓혀서 장면이 꽉 차게 보입니다 (css 의 .pick-grid.scene). */
    var cls = 'pick-grid' + (p.cols ? ' cols-' + p.cols : '')
            + (p.scene ? ' scene' : '') + (p.big ? ' big' : '')
            + (p.bigSpeak ? ' big-speak' : '');
    return html`<div class=${cls} role="group" aria-label=${p.label || ''}>${p.children}</div>`;
  };

  /* 활동 선택 카드 */
  C.ActivityPick = function (p) {
    var a = p.activity;
    var kids = p.childCount || 0;
    return html`<${C.Pick}
      selected=${p.selected}
      onClick=${p.onClick}
      label=${a.name}
      more=${kids ? kids + '가지 더 있어요' : null}
      speakText=${a.speechName}
      ariaLabel=${a.name + (kids ? ', 하위 활동 ' + kids + '가지' : '') + (p.selected ? ', 선택됨' : '')}
      art=${html`<${C.ActivityArt} activity=${a} />`} />`;
  };

  /* ======================= 상태 배지 ======================= */
  C.StateChip = function (p) {
    var s = p.state;
    return html`<span class=${'chip ' + (p.tone || s.id)}>
      <span class="chip-art"><${C.StateArt} state=${s} /></span>
      <span>${s.name}</span>
    </span>`;
  };

  /* 활동 상태를 아이콘 + 글자로 늘어놓기 */
  C.StateChips = function (p) {
    var st = p.status || {};
    var on = App.DATA.mapStates.filter(function (m) { return st[m.id]; });
    if (!on.length) return html`<span class="chip none">
      <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon('dash') }} />
      <span>${App.DATA.notTried.name}</span></span>`;
    return html`<${React.Fragment}>${on.map(function (m) {
      return html`<${C.StateChip} key=${m.id} state=${m} />`;
    })}<//>`;
  };

  /* ======================= 학생 표시 ======================= */
  C.WhoChip = function (p) {
    var s = p.student;
    if (!s) return null;
    var inner = html`<${React.Fragment}>
      <span class="face"><${C.AvatarArt} student=${s} /></span>
      <span class="nm">${s.name}</span>
      ${p.extra}
    <//>`;
    if (p.onClick) {
      return html`<button type="button" class="who" onClick=${p.onClick}
        aria-label=${'학생 바꾸기. 지금은 ' + s.name}>${inner}</button>`;
    }
    return html`<div class="who">${inner}</div>`;
  };

  /* ======================= 입력 조각 ======================= */
  C.Field = function (p) {
    return html`<label style=${{ display: 'block', width: p.width || '100%' }}>
      ${p.label && html`<span class="lab">${p.label}</span>`}
      <input class="field" type=${p.type || 'text'} value=${p.value == null ? '' : p.value}
        placeholder=${p.placeholder || ''} min=${p.min} max=${p.max}
        onChange=${function (e) { p.onChange(e.target.value); }} />
    </label>`;
  };

  C.Area = function (p) {
    return html`<label style=${{ display: 'block' }}>
      ${p.label && html`<span class="lab">${p.label}</span>`}
      <textarea class="field" rows=${p.rows || 6} value=${p.value || ''} placeholder=${p.placeholder || ''}
        onChange=${function (e) { p.onChange(e.target.value); }}></textarea>
    </label>`;
  };

  C.Switch = function (p) {
    return html`<button type="button" class=${'switch' + (p.on ? ' on' : '')}
        role="switch" aria-checked=${p.on ? 'true' : 'false'}
        onClick=${function () { p.onChange(!p.on); }}>
      <b>${p.label}</b>
      <span class="pill" aria-hidden="true"></span>
      <span class="txt">${p.on ? (p.onText || '켬') : (p.offText || '끔')}</span>
    </button>`;
  };

  /* ======================= 사진 ======================= */
  C.PhotoBox = function (p) {
    var url = p.photoId ? App.photos.url(p.photoId) : null;
    if (!url) return html`<div class="photo empty">${p.empty || '사진 없음'}</div>`;
    return html`<div class="photo"><img src=${url} alt=${p.alt || '활동 사진'} /></div>`;
  };

  C.PhotoPicker = function (p) {
    var fileRef = useRef(null);
    var busy = useState(false);
    function pick(e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!files.length) return;
      busy[1](true);
      var jobs = files.slice(0, 4).map(function (f) {
        return App.photos.addFile(f, p.studentId, p.kind || 'activity');
      });
      Promise.all(jobs).then(function (ids) {
        busy[1](false);
        p.onAdd(ids);
        App.ui.toast('사진을 저장했어요.');
      })['catch'](function (err) {
        busy[1](false);
        App.ui.toast(err && err.message ? err.message : '사진을 저장하지 못했어요.');
      });
      e.target.value = '';
    }
    return html`<div class="stack">
      <div class="wrap">
        <${C.Btn} icon="camera" onClick=${function () { if (fileRef.current) fileRef.current.click(); }}
          disabled=${busy[0]}>${busy[0] ? '저장하는 중…' : (p.label || '사진 넣기')}<//>
        <input ref=${fileRef} type="file" accept="image/*" multiple style=${{ display: 'none' }} onChange=${pick} />
      </div>
      ${p.photoIds && p.photoIds.length ? html`<${React.Fragment}>
        ${p.onMain && p.photoIds.length > 1 && html`<p class="small muted" style=${{ margin: '.1rem 0 0' }}>
          그림일기에 넣을 그림 하나를 눌러서 골라요.</p>`}
        <div class="exh-grid">
          ${p.photoIds.map(function (id) {
            var on = p.onMain && p.mainId === id;
            return html`<div key=${id} class="stack">
              ${p.onMain
                ? html`<button type="button" class=${'photo-pick' + (on ? ' on' : '')}
                    aria-pressed=${on ? 'true' : 'false'} aria-label="이 그림을 그림일기에 넣기"
                    onClick=${function () { p.onMain(id); }}>
                    <span class="check" aria-hidden="true">✓</span>
                    <${C.PhotoBox} photoId=${id} />
                  </button>`
                : html`<${C.PhotoBox} photoId=${id} />`}
              <${C.Btn} size="small" kind="danger" icon="trash" onClick=${function () {
                App.ui.confirm({ title: '이 사진을 지울까요?', okText: '지울래요', cancelText: '그만두기', tone: 'danger' })
                  .then(function (ok) { if (ok) { App.photos.remove(id); p.onRemove(id); } });
              }}>사진 지우기<//>
            </div>`;
          })}
        </div>
      <//>` : null}
    </div>`;
  };

  /* ======================= 직접 그리기 =======================
     손가락·펜·마우스로 그림을 그려 그림일기에 넣습니다.
     그린 그림은 사진과 같은 곳(IndexedDB)에 저장합니다. */
  var DRAW_W = 1000, DRAW_H = 700;
  var DRAW_COLORS = [
    { id: 'black',  name: '검정',   v: '#2f2f3d' },
    { id: 'red',    name: '빨강',   v: '#e05252' },
    { id: 'orange', name: '주황',   v: '#f0913c' },
    { id: 'yellow', name: '노랑',   v: '#efc033' },
    { id: 'green',  name: '초록',   v: '#43b581' },
    { id: 'blue',   name: '파랑',   v: '#4a90d9' },
    { id: 'purple', name: '보라',   v: '#9b7fd4' },
    { id: 'brown',  name: '갈색',   v: '#96693f' }
  ];
  var DRAW_SIZES = [{ name: '가늘게', v: 5 }, { name: '보통', v: 12 }, { name: '굵게', v: 26 }];

  /* 그림판. `w`·`h` 로 크기를, `ruled` 로 줄공책 바탕을 고를 수 있습니다.
       그림 넣기   : 기본 크기(1000×700)
       손글씨 일기 : 옆으로 넓고 `ruled=true` (3단계가 손으로 일기를 씁니다) */
  C.DrawPad = function (p) {
    var W = p.w || DRAW_W, H = p.h || DRAW_H;
    var RULE_H = p.ruleHeight || 78;          // 줄 간격 (손글씨가 크니 넉넉하게)
    var cvRef = useRef(null);
    var drawing = useRef(false);
    var colorS = useState(DRAW_COLORS[0].v);
    var sizeS = useState(DRAW_SIZES[1].v);
    var eraserS = useState(false);
    var dirtyS = useState(false);

    /* 흰 바탕(+줄공책 줄)을 깝니다.
       투명하게 두면 인쇄할 때 검게 나오는 프린터가 있어서 흰색을 칠합니다.
       ※ 줄은 **바탕에 함께 그려** 둡니다. 그러면 저장한 그림에도 줄이 남아
         인쇄했을 때 학생 글씨가 줄 위에 앉은 것처럼 보입니다. */
    function paintBase(g) {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);
      if (!p.ruled) return;
      g.save();
      g.strokeStyle = '#dcdce4'; g.lineWidth = 2;
      for (var y = RULE_H; y < H; y += RULE_H) {
        g.beginPath(); g.moveTo(24, y); g.lineTo(W - 24, y); g.stroke();
      }
      g.restore();
    }
    useLayoutEffect(function () {
      var cv = cvRef.current; if (!cv) return;
      var g = cv.getContext('2d');
      paintBase(g);
      if (p.startFrom) {
        var img = new Image();
        img.onload = function () { g.drawImage(img, 0, 0, W, H); };
        img.src = p.startFrom;
      }
    }, []);

    /* 화면 좌표 → 그림판 좌표
       ★ 손끝(마우스·펜·손가락)과 그려지는 자리가 어긋나던 것을 고쳤습니다.
         빠뜨린 것이 둘이었습니다.
         ① **테두리 3px** — getBoundingClientRect 는 테두리까지 잰 크기입니다.
            그림은 테두리 안쪽에 그려지므로 그만큼 빼야 합니다.
         ② **빈 띠** — object-fit:contain 은 그림을 칸 안에서 비율 그대로
            가운데에 놓습니다. 칸이 그림보다 넓으면 양옆에 빈 띠가 생기는데,
            그 띠를 빼지 않으면 그림이 오른쪽으로 밀려서 그려집니다.
       ▸ clientWidth/clientHeight 는 테두리를 뺀 **안쪽** 크기입니다.
       ▸ 가로세로를 같은 배(scale)로 셈해야 그림이 찌그러지지 않습니다. */
    function at(e) {
      var cv = cvRef.current, r = cv.getBoundingClientRect();
      var cs = window.getComputedStyle(cv);
      var bl = parseFloat(cs.borderLeftWidth) || 0;
      var bt = parseFloat(cs.borderTopWidth) || 0;
      var cw = cv.clientWidth || (r.width - bl * 2);
      var ch = cv.clientHeight || (r.height - bt * 2);
      var scale = Math.min(cw / W, ch / H);
      if (!(scale > 0)) return { x: 0, y: 0 };
      var ox = r.left + bl + (cw - W * scale) / 2;
      var oy = r.top + bt + (ch - H * scale) / 2;
      return { x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale };
    }
    function begin(e) {
      var cv = cvRef.current; if (!cv) return;
      e.preventDefault();
      if (cv.setPointerCapture && e.pointerId != null) {
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      }
      drawing.current = true;
      var g = cv.getContext('2d'), q = at(e);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = eraserS[0] ? '#ffffff' : colorS[0];
      g.lineWidth = eraserS[0] ? sizeS[0] * 2.2 : sizeS[0];
      g.beginPath();
      g.moveTo(q.x, q.y);
      /* 톡 찍기만 해도 점이 찍히도록 */
      g.lineTo(q.x + 0.01, q.y);
      g.stroke();
      if (!dirtyS[0]) dirtyS[1](true);
    }
    function move(e) {
      if (!drawing.current) return;
      e.preventDefault();
      var g = cvRef.current.getContext('2d'), q = at(e);
      g.lineTo(q.x, q.y);
      g.stroke();
    }
    function end() { drawing.current = false; }

    function clearAll() {
      App.ui.confirm({ title: '그린 그림을 모두 지울까요?', okText: '다 지울래요',
        cancelText: '그만두기', tone: 'danger' }).then(function (ok) {
        if (!ok) return;
        paintBase(cvRef.current.getContext('2d'));
        dirtyS[1](false);
      });
    }
    function done() {
      var url = cvRef.current.toDataURL('image/png');
      p.onDone(url);
    }

    function swatch(c) {
      var on = !eraserS[0] && colorS[0] === c.v;
      return html`<button key=${c.id} type="button" class=${'dp-color' + (on ? ' on' : '')}
        style=${{ background: c.v }} aria-label=${c.name} title=${c.name}
        aria-pressed=${on ? 'true' : 'false'}
        onClick=${function () { colorS[1](c.v); eraserS[1](false); }} />`;
    }

    /* ★ 자리 잡기 — **스크롤이 생기지 않게** 합니다.
         [도구 줄] → [안내글] → [그림판] → [마치는 줄] 차례입니다.
       ★ `그림 다 그렸어요` · `그만두기` 는 **그림판 아래**에 둡니다 (2026-08-23).
         맨 위 도구 줄에 함께 두었더니 색·굵기 단추와 섞여서, 다 그린 뒤에
         어디를 눌러야 하는지 한눈에 보이지 않았습니다.
         그리는 일이 끝나는 자리(그림판 아래)에 있어야 차례가 이어집니다.
       ⚠ 마치는 줄은 **늘 자리를 차지**합니다(그만두기가 없어도). 그래야
         그림을 그리는 동안 그림판 크기가 흔들리지 않습니다. */
    return html`<div class="dp">
      <div class="dp-tools">
        ${DRAW_COLORS.map(swatch)}
        <button type="button" class=${'btn small' + (eraserS[0] ? ' ok' : '')}
          aria-pressed=${eraserS[0] ? 'true' : 'false'}
          onClick=${function () { eraserS[1](!eraserS[0]); }}>지우개<//>
        <span class="dp-gap"></span>
        ${DRAW_SIZES.map(function (s) {
          var on = sizeS[0] === s.v;
          return html`<button key=${s.name} type="button" class=${'btn small' + (on ? ' ok' : '')}
            aria-pressed=${on ? 'true' : 'false'}
            onClick=${function () { sizeS[1](s.v); }}>${s.name}<//>`;
        })}
        <span class="dp-gap"></span>
        <${C.Btn} size="small" icon="trash" onClick=${clearAll}>다 지우기<//>
      </div>

      <p class="small muted dp-hint">
        ${p.hintText || '손가락·펜·마우스로 그려요. 색과 굵기를 고를 수 있어요.'}</p>

      <canvas class="dp-canvas" ref=${cvRef} width=${W} height=${H}
        aria-label="그림 그리는 곳"
        onPointerDown=${begin} onPointerMove=${move}
        onPointerUp=${end} onPointerCancel=${end} onPointerLeave=${end} />

      <!-- 마치는 줄 — 그리는 일이 끝나는 자리에 둡니다 -->
      <div class="dp-done">
        ${p.onCancel && html`<${C.Btn} onClick=${p.onCancel}>그만두기<//>`}
        <${C.Btn} kind="ok" icon="check" className="dp-ok" disabled=${!dirtyS[0]}
          onClick=${done}>${p.doneText || '그림 다 그렸어요'}<//>
      </div>
    </div>`;
  };

  /* ======================= 우리 반 활동 더하기 =======================
     학급 특성에 맞는 활동을 그 자리에서 바로 더합니다.
     선생님 설정에서도, 활동을 고르는 화면에서도 같은 창을 씁니다. */
  var ADD_ICONS = ['star', 'heart', 'blocks', 'paper', 'pot', 'bread', 'bug', 'pet',
                   'tv', 'gamepad', 'dice', 'yoga', 'gym', 'slide', 'museum', 'library',
                   'store', 'mic', 'park', 'tent', 'food', 'shoe', 'bike', 'marble',
                   'film', 'bag', 'leaf', 'nature', 'box', 'frame'];

  C.AddActivityModal = function (p) {
    var nameS = useState('');
    var areaS = useState(p.area || 'indoor');
    var placeS = useState('');
    var iconS = useState('star');
    var name = nameS[0].trim();

    function save() {
      if (!name) { App.ui.toast('활동 이름을 써 주세요.'); return; }
      var id = App.store.addActivity({
        area: areaS[0], name: name, icon: iconS[0], defaultPlace: placeS[0].trim()
      });
      App.ui.toast('「' + name + '」 활동을 더했어요.');
      if (p.onAdded) p.onAdded(id);
      p.onClose();
    }

    return html`<${C.Modal} title="우리 반 활동 더하기" onClose=${p.onClose}
      actions=${html`<${React.Fragment}>
        <${C.Btn} onClick=${p.onClose}>그만두기<//>
        <${C.Btn} kind="ok" icon="check" disabled=${!name} onClick=${save}>이 활동 더하기<//>
      <//>`}>
      <div class="stack">
        <${C.Field} label="활동 이름" value=${nameS[0]}
          placeholder="예) 텃밭 가꾸기 · 방울 놀이"
          onChange=${function (v) { nameS[1](v); }} />

        <div>
          <span class="lab">어디에서 하나요?</span>
          <div class="wrap">
            ${[['indoor', '실내'], ['outdoor', '실외']].map(function (x) {
              var on = areaS[0] === x[0];
              return html`<button key=${x[0]} type="button" class=${'tchoice' + (on ? ' on' : '')}
                aria-pressed=${on} onClick=${function () { areaS[1](x[0]); }}>
                ${on ? '✓ ' : ''}${x[1]}</button>`;
            })}
          </div>
        </div>

        <${C.Field} label="장소 (안 써도 돼요)" value=${placeS[0]}
          placeholder="예) 교실 · 텃밭" onChange=${function (v) { placeS[1](v); }} />

        <div>
          <span class="lab">그림 고르기</span>
          <div class="icon-pick">
            ${ADD_ICONS.map(function (k) {
              var on = iconS[0] === k;
              return html`<button key=${k} type="button" class=${'icon-cell' + (on ? ' on' : '')}
                aria-pressed=${on} aria-label=${'그림 ' + k}
                onClick=${function () { iconS[1](k); }}>
                <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon(k) }} />
              </button>`;
            })}
          </div>
          <p class="small muted" style=${{ marginTop: '.3rem' }}>
            <b>images/activities/${name || '활동이름'}.png</b> 파일을 넣어 두면 그 그림이 대신 나와요.
          </p>
        </div>

        ${name && html`<${C.Banner} icon="check">
          <div class="small">문장은 이렇게 만들어져요.</div>
          <div><b>${'계획 : 나는 오늘 ' + App.eulReul(name) + ' 할 거예요.'}</b></div>
          <div><b>${'일기 : 나는 오늘 ' + App.eulReul(name) + ' 했어요.'}</b></div>
        <//>`}
      </div>
    <//>`;
  };

  /* ═══════ 함께하는 사람 더하기 ═══════
     학급마다 함께하는 사람이 다릅니다 (활동보조 선생님 · 사촌 · 이웃 …).
     ▸ 조사는 손으로 붙이지 않습니다 — App.waGwa 가 받침을 보고 정합니다. */
  var PARTNER_ICONS = ['pFriend', 'pFamily', 'pMom', 'pDad', 'pSibling', 'pTeacher', 'pAlone', 'heart', 'star'];

  C.AddPartnerModal = function (p) {
    var nameS = useState('');
    var iconS = useState('pFriend');
    var name = nameS[0].trim();

    function save() {
      if (!name) { App.ui.toast('누구인지 이름을 써 주세요.'); return; }
      var dup = (App.DATA.partners || []).some(function (x) { return x.name === name; });
      if (dup) { App.ui.toast('같은 이름이 이미 있어요.'); return; }
      App.store.addPartner({ name: name, icon: iconS[0] });
      App.ui.toast('「' + name + '」 을(를) 더했어요.');
      p.onClose();
    }

    return html`<${C.Modal} title="함께하는 사람 더하기" onClose=${p.onClose}
      actions=${html`<${React.Fragment}>
        <${C.Btn} onClick=${p.onClose}>그만두기<//>
        <${C.Btn} kind="ok" icon="check" disabled=${!name} onClick=${save}>이 사람 더하기<//>
      <//>`}>
      <div class="stack">
        <${C.Field} label="누구인가요?" value=${nameS[0]}
          placeholder="예) 사촌 · 이웃 · 활동보조 선생님"
          onChange=${function (v) { nameS[1](v); }} />
        <div>
          <span class="lab">그림 고르기</span>
          <div class="icon-pick">
            ${PARTNER_ICONS.map(function (k) {
              var on = iconS[0] === k;
              return html`<button key=${k} type="button" class=${'icon-cell' + (on ? ' on' : '')}
                aria-pressed=${on} aria-label=${'그림 ' + k}
                onClick=${function () { iconS[1](k); }}>
                <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon(k) }} />
              </button>`;
            })}
          </div>
          <p class="small muted" style=${{ marginTop: '.3rem' }}>
            <b>images/avatars/${name || '이름'}.png</b> 파일을 넣어 두면 그 그림이 대신 나와요.
          </p>
        </div>
        ${name && html`<${C.Banner} icon="check">
          <div class="small">문장은 이렇게 만들어져요.</div>
          <div><b>${'나는 오늘 ' + App.withPhrase(name) + ' 놀이를 했어요.'}</b></div>
        <//>`}
      </div>
    <//>`;
  };

  /* ═══════ 기분 더하기 ═══════
     ⚠ 기분은 **일기 문장에 그대로 들어갑니다** (기분이 ○○○.).
       `설레요` 를 그대로 쓰면 `기분이 설레요.` 가 되어 어색하므로,
       일기에 쓸 말(`설렜어요`)을 따로 받습니다. 비워 두면 이름을 그대로 씁니다. */
  var MOOD_ICONS = ['moodFun', 'moodExcited', 'moodCalm', 'moodProud',
                    'moodSorry', 'moodTired', 'moodSad', 'moodAngry', 'heart', 'star'];

  C.AddMoodModal = function (p) {
    var nameS = useState('');
    var pastS = useState('');
    var iconS = useState('moodFun');
    var name = nameS[0].trim();
    var past = pastS[0].trim() || name;

    function save() {
      if (!name) { App.ui.toast('기분 이름을 써 주세요.'); return; }
      var dup = (App.DATA.moods || []).some(function (x) { return x.name === name; });
      if (dup) { App.ui.toast('같은 기분이 이미 있어요.'); return; }
      App.store.addMood({ name: name, past: past, conn: past, stem: name, pre: name, icon: iconS[0] });
      App.ui.toast('「' + name + '」 기분을 더했어요.');
      p.onClose();
    }

    return html`<${C.Modal} title="기분 더하기" onClose=${p.onClose}
      actions=${html`<${React.Fragment}>
        <${C.Btn} onClick=${p.onClose}>그만두기<//>
        <${C.Btn} kind="ok" icon="check" disabled=${!name} onClick=${save}>이 기분 더하기<//>
      <//>`}>
      <div class="stack">
        <${C.Field} label="고를 때 보이는 말" value=${nameS[0]}
          placeholder="예) 설레요 · 놀라워요"
          onChange=${function (v) { nameS[1](v); }} />
        <${C.Field} label="일기에 쓸 말 (안 써도 돼요)" value=${pastS[0]}
          placeholder=${name ? '예) ' + name.replace(/요$/, '었어요') : '예) 설렜어요'}
          onChange=${function (v) { pastS[1](v); }} />
        <div>
          <span class="lab">그림 고르기</span>
          <div class="icon-pick">
            ${MOOD_ICONS.map(function (k) {
              var on = iconS[0] === k;
              return html`<button key=${k} type="button" class=${'icon-cell' + (on ? ' on' : '')}
                aria-pressed=${on} aria-label=${'그림 ' + k}
                onClick=${function () { iconS[1](k); }}>
                <span aria-hidden="true" dangerouslySetInnerHTML=${{ __html: App.icon(k) }} />
              </button>`;
            })}
          </div>
          <p class="small muted" style=${{ marginTop: '.3rem' }}>
            <b>images/얼굴표정/${past || '일기에쓸말'}.png</b> 파일을 넣어 두면 그 그림이 대신 나와요.
          </p>
        </div>
        ${name && html`<${C.Banner} icon="check">
          <div class="small">일기 문장은 이렇게 만들어져요.</div>
          <div><b>${'기분이 ' + past + '.'}</b></div>
        <//>`}
      </div>
    <//>`;
  };

  /* 활동 카드 자리에 놓는 '＋ 활동 더하기' 카드 */
  C.AddActivityCard = function (p) {
    return html`<button type="button" class="pick add-card" onClick=${p.onClick}
        aria-label="우리 반 활동 더하기">
      <span class="thumb"><span class="add-plus" aria-hidden="true">＋</span></span>
      <span class="label">활동 더하기</span>
      <span class="note">우리 반 활동</span>
    </button>`;
  };

  /* ======================= 그 밖 ======================= */
  C.Banner = function (p) {
    return html`<div class=${'banner ' + (p.tone || '')}>
      <div class="row">
        ${p.icon && html`<span style=${{ width: 32, height: 32, flex: '0 0 auto' }} aria-hidden="true"
          dangerouslySetInnerHTML=${{ __html: App.icon(p.icon) }} />`}
        <div class="grow">${p.children}</div>
        ${p.speakText && html`<${C.Speak} text=${p.speakText} />`}
      </div>
    </div>`;
  };

  C.Sec = function (p) {
    return html`<section class="sec">
      ${p.title && html`<h3>${p.title}${p.speakText && html`<${C.Speak} short=${true} text=${p.speakText} />`}</h3>`}
      ${p.children}
    </section>`;
  };

  App.useMemo2 = useMemo;
})();
