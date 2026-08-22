/* ===========================================================
   나의 여가 — 기록하GO! (나의 여가 일기)
   1단계 그림으로 골라 쓰기 · 2단계 문장 틀 완성하기 · 3단계 자유롭게 쓰기
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useEffect = React.useEffect;
  var useRef = React.useRef, useLayoutEffect = React.useLayoutEffect;

  /* ══════════ 확인 화면은 **어떤 경우에도 한 쪽** ══════════
     ⛔ 이 장치를 지우지 마세요. 같은 고장이 세 번 되풀이됐습니다.

     무대(.stage-track)는 CSS 다단으로 쪽을 나눕니다. 확인 화면 본문
     (.confirm-2col)은 `break-inside:avoid` 라, 흰 칸보다 **단 34px만 커도**
     통째로 다음 쪽으로 밀려 **1쪽에 질문 줄만 남습니다.**

     예전 대책은 `내용이 들어가도록 크기를 맞추기`(fitDv)였는데,
     fitDv 는 **오른쪽 그림일기만** 줄입니다. 실제 높이를 정하는 것은
     **왼쪽 칸(문장 칸 + 고치는 길 세 줄)** 일 때가 많아 소용이 없었습니다.
     화면 크기 · 글 길이 · 단추 줄바꿈 어느 하나만 달라져도 다시 넘칩니다.

     ★ 그래서 **무엇이 높이를 만들든** 넘치면 본문을 통째로 줄입니다.
       zoom 은 transform 과 달리 **레이아웃 크기가 실제로 줄어들어**
       단이 넘치지 않습니다 (크롬·엣지 기준. 이 앱이 쓰는 브라우저입니다).

     ▸ 잴 때는 zoom 을 1 로 되돌린 뒤 재야 합니다 (줄인 크기를 또 줄이면 계속 작아집니다).
     ▸ 글꼴·그림이 늦게 와서 높이가 바뀌므로 rAF · 250ms · 700ms 에 다시 잽니다. */
  var FIT_MIN = 0.5;                  // 이보다 더 줄이지 않습니다 (글자가 못 읽게 됩니다)
  function useFitOnePage(deps) {
    var boxRef = useRef(null);        // 줄이는 껍데기 (zoom 이 걸립니다)
    var innerRef = useRef(null);      // 재는 알맹이 (zoom 이 안 걸립니다)
    useLayoutEffect(function () {
      var timers = [], ro = null;
      /* ⚠ **zoom 이 걸린 요소를 재면 안 됩니다.**
           줄인 것을 또 재어 값이 겉돌다가 0.94 에서 멈춰 버렸습니다
           (실제로 필요한 값은 0.52 였습니다).
         ★ 그래서 **껍데기에 zoom 을 걸고, 알맹이를 잽니다.**
           알맹이의 offsetHeight 는 부모 zoom 과 상관없이 늘 원래 높이라
           한 번에 정확히 셈해집니다. */
      function 재기() {
        var box = boxRef.current, inner = innerRef.current;
        if (!box || !inner) return;
        var track = box.closest('.stage-track'); if (!track) return;
        var 남는 = track.clientHeight;
        [].forEach.call(track.children, function (c) {
          if (c !== box) 남는 -= c.offsetHeight;
        });
        /* ⚠ 여유를 넉넉히 두세요. 딱 맞게 셈하면 **몇 px 차이로 또 밀립니다.**
             재고 나서 그림·글꼴이 마저 오면 높이가 조금 더 늘기 때문입니다
             (실제로 4px 넘쳐서 2쪽이 됐습니다). */
        남는 -= 24;
        var 필요 = inner.offsetHeight;
        if (!(남는 > 40) || !(필요 > 0)) return;
        var k = 1;
        if (필요 > 남는) k = Math.max(FIT_MIN, (남는 / 필요) * 0.97);    // 0.97 = 안전 몫
        /* ⚠ 상태(useState)로 넘기지 않고 **DOM 에 바로 씁니다.**
             상태를 거치면 다시 그리는 차례와 엇갈려, 줄여야 하는데도
             zoom 이 1 인 채로 남는 일이 생겼습니다 (1366x640 에서 20px 잘림).
             style 의 zoom 은 React 가 건드리지 않으므로 그대로 남습니다. */
        var 새값 = (k === 1) ? '' : String(k);
        if (box.style.zoom !== 새값) box.style.zoom = 새값;
        /* 자가 검사 — 가장 작게 줄여도 넘치면 알려 줍니다 (조용히 1쪽이 비지 않게) */
        if (k <= FIT_MIN + 0.001 && 필요 * k > 남는 + 2 && window.console) {
          console.warn('[확인 화면] 가장 작게 줄여도 흰 칸을 넘습니다 — 필요 '
            + Math.round(필요) + 'px / 자리 ' + Math.round(남는) + 'px');
        }
      }
      재기();
      var raf = requestAnimationFrame(재기);
      timers.push(setTimeout(재기, 250), setTimeout(재기, 700));
      /* 창 크기가 바뀔 때 resize 이벤트가 안 오는 경우가 있어(전자칠판·미리보기)
         흰 칸 자체를 지켜봅니다. 이게 가장 확실합니다. */
      if (window.ResizeObserver) {
        ro = new window.ResizeObserver(재기);
        var tr = boxRef.current && boxRef.current.closest('.stage-track');
        if (tr) ro.observe(tr);
        if (innerRef.current) ro.observe(innerRef.current);
      }
      window.addEventListener('resize', 재기);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(재기).catch(function () {});
      return function () {
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', 재기);
      };
    }, deps);
    return [boxRef, innerRef];
  }
  var PAGE_SIZE = 6;

  /* 3단계가 일기를 쓰는 세 가지 방법.
     ★ 학생마다 쓰기 수단이 다릅니다. 키보드를 못 치는 학생도 3단계일 수 있어서
       손글씨와 종이 길을 함께 열어 두었습니다.
       `종이` 는 새로 만들 것이 없습니다 — 그림일기의 `빈 줄` 인쇄가 그 길입니다. */
  var WRITE_WAYS = [
    { id: 'key',   name: '키보드로 쓰기', desc: '글자판으로 씁니다' },
    { id: 'hand',  name: '손글씨로 쓰기', desc: '전자칠판·태블릿에 손가락이나 펜으로 씁니다' },
    { id: 'paper', name: '종이에 쓰기',   desc: '빈 줄로 인쇄해서 연필로 씁니다' }
  ];

  /* ------------------------- 활동 고르기 (일기용) ------------------------- */
  C.ActivityChooser = function (p) {
    var student = p.student;
    var areaS = useState(p.area || null);
    var pageS = useState(0);
    var subS = useState(null);
    var addS = useState(false);      // '우리 반 활동 더하기' 창
    /* 학급 특성에 맞는 활동을 그 자리에서 바로 더할 수 있게 합니다.
       (선생님 설정 → 학생 화면에 도구 보이기 에서 끌 수 있습니다) */
    var canAdd = !student || student.addTools !== false;

    if (!areaS[0]) {
      return html`<${React.Fragment}>
        <!-- 이 질문은 '어디에서 했나요?' 가 아니라 실내·실외 가르기 입니다.
             장소는 앞 단계에서 19곳 가운데 골랐으므로, 같은 말을 쓰면
             학생이 방금 답한 것을 또 묻는 줄 압니다.
             ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
        <${C.Question} bar=${true} note=${p.note} speakText="실내에서 했나요, 실외에서 했나요?">
          실내에서 했나요, 실외에서 했나요?<//>
        <${C.PickGrid} cols=${2}>
          <${C.Pick} label="실내에서 했어요" speakText="실내에서 했어요" bare=${true}
            onClick=${function () { areaS[1]('indoor'); }}
            art=${html`<${C.Art} src=${App.uiImage('indoor')} iconKey="door" />`} />
          <${C.Pick} label="실외에서 했어요" speakText="실외에서 했어요" bare=${true}
            onClick=${function () { areaS[1]('outdoor'); }}
            art=${html`<${C.Art} src=${App.uiImage('outdoor')} iconKey="tree" />`} />
        <//>
      <//>`;
    }
    if (subS[0]) {
      var kids = App.visibleChildren(student, subS[0]);
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} note=${p.note} speakText=${'무엇을 했나요? ' + subS[0].name}>무엇을 했나요? — ${subS[0].name}<//>
        <${C.PickGrid} cols=${kids.length > 4 ? 3 : 2}>
          ${kids.map(function (ch) {
            return html`<${C.ActivityPick} key=${ch.id} activity=${ch} selected=${p.value === ch.id}
              onClick=${function () { p.onPick(ch.id); subS[1](null); App.speakFor(student, ch.speechName); }} />`;
          })}
        <//>
        <div class="wrap" style=${{ marginTop: '.7rem' }}>
          <${C.Btn} size="small" icon="back" className="pastel-yellow"
            onClick=${function () { subS[1](null); }}>다른 활동 고르기<//>
        </div>
      <//>`;
    }
    var cards = App.visibleCards(student, areaS[0]);
    var pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
    var page = Math.min(pageS[0], pages - 1);
    return html`<${React.Fragment}>
      <${C.Question} bar=${true} note=${p.note} speakText="무엇을 했나요?"
        right=${html`<${C.Btn} size="small" icon="back" className="pastel-yellow"
          onClick=${function () { areaS[1](null); pageS[1](0); }}>실내·실외 다시 고르기<//>`}>무엇을 했나요?<//>
      <${C.PickGrid} cols=${3}>
        ${cards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map(function (c) {
          var kids = App.visibleChildren(student, c);
          return html`<${C.ActivityPick} key=${c.id} activity=${c} childCount=${kids.length}
            selected=${App.cardIdOf(p.value) === c.id}
            onClick=${function () {
              if (kids.length) { subS[1](c); return; }
              p.onPick(c.id); App.speakFor(student, c.speechName);
            }} />`;
        })}
        ${canAdd && page === pages - 1 &&
          html`<${C.AddActivityCard} onClick=${function () { addS[1](true); }} />`}
      <//>
      <!-- 아래에는 쪽 넘기는 단추만 남기고 가운데에 둡니다.
           실내·실외 다시 고르기는 위 질문 줄 오른쪽으로 올렸습니다.
           ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
      ${pages > 1 && html`<div class="wrap" style=${{ marginTop: '.7rem', justifyContent: 'center' }}>
        <${C.Btn} size="small" icon="back" disabled=${page === 0} onClick=${function () { pageS[1](page - 1); }}>앞 활동<//>
        <span class="chip">${page + 1} / ${pages}</span>
        <${C.Btn} size="small" icon="next" disabled=${page >= pages - 1} onClick=${function () { pageS[1](page + 1); }}>다음 활동<//>
      </div>`}
      ${addS[0] && html`<${C.AddActivityModal} area=${areaS[0]}
        onClose=${function () { addS[1](false); }}
        onAdded=${function (id) { pageS[1](Math.ceil((cards.length + 1) / PAGE_SIZE) - 1); }} />`}
    <//>`;
  };

  /* ------------------------- 일기 화면 ------------------------- */
  C.DiaryScreen = function (p) {
    App.useStore();
    var student = App.store.current();
    var params = p.params || {};
    var fromPlan = params.planId ? App.store.plan(params.planId) : null;
    var editing = params.diaryId ? App.store.diary(params.diaryId) : null;

    function initial() {
      if (editing) return Object.assign({}, editing);
      var d = {
        planId: fromPlan ? fromPlan.id : null,
        level: (student && student.diaryLevel) || 1,
        date: fromPlan ? fromPlan.date : App.todayKey(),
        activityId: fromPlan ? fromPlan.activityId : null,
        cardId: fromPlan ? fromPlan.cardId : null,
        partnerId: fromPlan ? fromPlan.partnerId : null,
        partnerIds: fromPlan ? (fromPlan.partnerIds || (fromPlan.partnerId ? [fromPlan.partnerId] : [])) : [],
        place: fromPlan ? fromPlan.place : '',
        moodIds: [], againId: null, title: '', text: '', weather: '', frames: {}, photoIds: [], exhibit: false,
        six: {},            /* 3단계 육하원칙 뼈대 */
        writeWay: 'key', writePhotoId: null,   /* 3단계 : 키보드 | 손글씨 | 종이 */
        picKind: 'app',     // 그림칸 : 'app' 내가 고른 그림 | 'photo' 사진 | 'draw' 직접 그리기
        mainPhotoId: null,  // 사진을 여러 장 넣었을 때 그림일기에 쓸 한 장
        drawPhotoId: null,  // 직접 그린 그림
        bodyEdit: null      // 노란 칸에서 직접 고쳐 쓴 문장 (안 고쳤으면 null)
      };
      return d;
    }
    var dr = useState(initial);
    var draft = dr[0], setDraft = dr[1];
    function patch(o) { setDraft(Object.assign({}, draft, o)); }

    /* 계획에서 왔으면 '누구와' 는 이미 정해져 있습니다.
       빈 질문을 다시 묻지 않고 다음 질문(기분)부터 시작합니다.
       고른 내용은 노란 문장 띠에 그대로 보이고, `앞 질문으로` 로 바꿀 수 있습니다. */
    /* 언제나 첫 질문부터 시작합니다.
       ★ 예전에는 계획에서 왔으면 2단계를 1번 질문부터 시작했습니다. 그런데
         뼈대 차례가 바뀌면 그 번호가 엉뚱한 질문을 가리킵니다.
         계획에서 가져온 내용은 이미 채워져 있고 위 띠에도 보이므로,
         그냥 처음부터 훑으며 넘기는 편이 안전하고 헷갈리지 않습니다. */
    /* ▸ `step:'last'` 로 오면 **맨 마지막 질문(완성 화면)** 에서 엽니다.
         그림일기에서 파란 화살표로 되돌아올 때 씁니다 — 첫 질문부터 다시
         훑게 하면 `바로 전단계` 가 아닙니다.
       ⚠ 단계 목록(L1/L2/L3)은 아래에서 정해지므로, 여기서는 **가장 긴 것**을
         기준으로 잡고 아래에서 실제 길이에 맞춰 깎습니다. */
    var stepS = useState(function () {
      return (params.step === 'last') ? 99 : 0;
    });
    var placePageS = useState(0);      // 장소 19곳을 6곳씩 넘겨 볼 때 쓰는 쪽 번호
    var afterS = useState(null);       // 저장 후 물어보는 순서
    var savedIdS = useState(null);
    var helpS = useState(false);
    var editMetaS = useState(false);   // 바꾸기 창 : false 면 닫힘, 숫자면 그 쪽
    var drawS = useState(false);       // 직접 그리기 판이 열려 있는지
    var photoS = useState(false);      // 사진 고르기 팝업이 열려 있는지
    var moveS = useState(false);       // 그림 자리를 옮기는 중인지 (완성 화면)
    var pickedS = useState(null);      // 크기를 바꾸려고 고른 그림
    var madeS = useState(null);        // 방금 그린 그림 (완성 확인 창에서 보여 줍니다)
    var reDrawS = useState(null);      // '다시 그릴래요' 로 돌아갈 때 이어서 그릴 그림
    var writeS = useState(false);      // 손글씨 일기 판이 열려 있는지 (3단계)

    /* 고르면 0.45초 뒤 다음 질문으로 넘어갑니다 (규칙 2).
       시간이 지나 저절로 넘어가는 것이 아니라, 학생이 고른 결과로 넘어갑니다. */
    var goTimer = React.useRef(null);
    useEffect(function () {
      return function () { if (goTimer.current) clearTimeout(goTimer.current); };
    }, []);
    function goNext() {
      if (goTimer.current) clearTimeout(goTimer.current);
      goTimer.current = setTimeout(function () {
        /* ※ 지금 단계 목록의 마지막을 넘지 않게 막습니다.
             ⚠ 세 단계를 **모두** 적어야 합니다. 3단계가 빠져 있어서 L1(8칸)
               길이로 깎였고, `또 하고 싶나` 를 제목 뒤(8번째)로 옮기자
               3단계가 그 칸에서 더 못 넘어갔습니다 (2026-08-22). */
        var list = (draft.level === 2) ? L2 : (draft.level === 3 ? L3 : L1);
        stepS[1](function (s) { return Math.min(s + 1, list.length - 1); });
      }, 450);
    }

    var level = draft.level;
    /* 확인 화면이 **한 쪽을 넘지 않게** 통째로 줄여 주는 장치 (위 useFitOnePage).
       ⛔ 지우지 마세요 — 같은 고장이 세 번 되풀이됐습니다.
       ▸ 글·단계·그림이 바뀌면 높이가 달라지므로 그때마다 다시 잽니다. */
    var fit = useFitOnePage([stepS[0], level, draft.bodyEdit, draft.text,
                             draft.picKind, draft.photoIds && draft.photoIds.length,
                             draft.title, draft.activityId, moveS[0]]);
    var fitBox = fit[0], fitInner = fit[1];
    /* 지금 고른 일기 단계가 **무엇을 하는 것인지** 한 줄 설명.
       질문 줄 오른쪽에 늘 같은 자리로 나갑니다 (options.js 의 note). */
    var lvNote = (function () {
      var lv = (App.DATA.diaryLevels || []).filter(function (x) { return x.id === level; })[0];
      return lv ? (lv.id + '단계 · ' + lv.note) : null;
    })();
    var moods = App.moodsFor(student);
    var partners = App.partnersFor(student);
    var act = App.act(draft.activityId);

    /* 함께한 사람은 **여러 명**일 수 있습니다 (계획하기와 같은 방식).
       `혼자` 는 뜻이 어긋나므로 다른 사람과 같이 고를 수 없습니다. */
    function whoIds() {
      if (draft.partnerIds && draft.partnerIds.length) return draft.partnerIds;
      return draft.partnerId ? [draft.partnerId] : [];
    }
    function toggleWho(pt) {
      var cur = whoIds().slice();
      var i = cur.indexOf(pt.id);
      if (i >= 0) cur.splice(i, 1);
      else if (pt.id === 'alone') cur = ['alone'];
      else cur = cur.filter(function (x) { return x !== 'alone'; }).concat([pt.id]);
      patch({ partnerIds: cur, partnerId: cur[0] || null });
      /* ★ 낱말 하나(`엄마`)가 아니라 짧은 문장(`엄마와 함께 했어요`)으로 읽습니다.
           까닭은 korean.js 의 App.partnerSpeechPast 주석을 보세요. */
      if (i < 0) App.speakFor(student, App.partnerSpeechPast(pt));
    }

    /* --------------------- 저장 --------------------- */
    function save() {
      if (!draft.activityId) { App.ui.toast('무엇을 했는지 먼저 골라 주세요.'); return; }
      var payload = {
        studentId: student.id, planId: draft.planId, level: draft.level, date: draft.date,
        activityId: draft.activityId, cardId: App.cardIdOf(draft.activityId),
        partnerId: draft.partnerId, place: draft.place, moodIds: draft.moodIds,
        againId: draft.againId, title: draft.title, text: draft.text, weather: draft.weather,
        bodyEdit: draft.bodyEdit || null,
        frames: draft.frames, photoIds: draft.photoIds,
        picKind: draft.picKind || 'app',
        mainPhotoId: draft.mainPhotoId || null,
        drawPhotoId: draft.drawPhotoId || null, exhibit: draft.exhibit,
        writeWay: draft.writeWay || 'key', writePhotoId: draft.writePhotoId || null,
        partnerIds: draft.partnerIds || [],
        six: draft.six || {},
        /* 완성 화면에서 옮기고 키운 그림 자리. 이것을 빠뜨리면 저장하는 순간
           애써 맞춘 자리가 처음으로 되돌아갑니다. 인쇄할 때도 이 값을 씁니다. */
        artLayout: draft.artLayout || null
      };
      var id;
      if (editing) {
        App.store.updateDiary(editing.id, payload);
        id = editing.id;
      } else {
        id = App.store.addDiary(payload);
      }

      /* ★ 지도 표시를 **일기 답에서 바로** 만듭니다.
           예전에는 저장한 뒤에 `이 활동을 좋아하나요?` `또 하거나 도전하고
           싶나요?` 를 다시 물었습니다. 하지만 일기 안에서 이미
           `또 하고 싶나요?` 를 물었으니 **같은 것을 두 번 묻는 것**이었습니다
           (규칙 7 — 중복 금지).

           또 하고 싶어요      → 좋아해요 ♥ + 도전하고 싶어요 ★
                                (또 하고 싶다는 것은 좋아한다는 뜻입니다)
           다른 것도 하고 싶어요 → 해봤어요 만 (싫다는 뜻이 아니라서 지우지 않습니다)
           잘 모르겠어요       → 아직 잘 모르겠어요 ? */
      var mark = { tried: true };
      if (payload.againId === 'again')       { mark.like = true;  mark.challenge = true; mark.unsure = false; }
      else if (payload.againId === 'unsure') { mark.unsure = true; }
      App.store.setMapState(student.id, payload.cardId, mark);
      savedIdS[1](id);
      afterS[1](0);
      App.speakFor(student, '일기를 잘 기록했어요.');
    }

    /* --------------------- 1단계 --------------------- */
    /* ★ `그림` 을 **따로 한 단계**로 두었습니다.
       예전에는 `확인` 화면 맨 아래에 붙어 있어서 눈에 띄지 않았습니다.
       2단계와 같은 자리(제목 다음 · 확인 앞)에 두어 두 단계가 같게 흐릅니다. */
    /* 단계 목록 — **앞 여섯은 세 단계가 똑같습니다** (공통 뼈대).
       뒤에 붙는 것만 단계마다 다릅니다.
         1단계 : 없음                (그림으로 고르기만)
         2단계 : 기억 · 다음에 · 제목 (낱말로 문장 만들기)
         3단계 : 일기 쓰기 · 제목     (자유롭게 쓰기)
       ⛔ 앞 여섯의 차례를 바꾸지 마세요 (boneBody 주석 참고). */
    var L1 = ['언제', '누구와', '어디에서', '무엇을', '기분', '또 하고 싶나', '그림', '확인'];

    /* ── 1단계 : 지금까지 고른 것을 **그림으로** 한 줄에 ────────────────
       2·3단계는 흰 칸 위 노란 띠에 지금까지 만든 **문장**이 자랍니다.
       1단계는 아직 글을 읽기 어려운 학생이라, 같은 자리에 **그림**을 차례대로
       쌓아 줍니다. 언제 → 누구와 → 무엇을 → 어디에서 → 기분 차례라
       그림만 훑어도 '내가 뭘 고르고 있었지?' 가 풀립니다.
       ▸ **이미 지나온 단계**의 그림만 넣습니다. 아직 안 고른 것을 미리 보여 주면
         고른 것과 안 고른 것이 섞여 헷갈립니다. */
    function picsSoFar1(step) {
      var out = [];
      var t = App.todayKey();
      if (step > 0 && draft.date) {
        var word = draft.date === t ? '오늘'
                 : (draft.date === App.addDays(t, -1) ? '어제' : '날짜 고르기');
        out.push({ key: 'date', label: App.fmtDateShort(draft.date),
          art: html`<${C.PickArt} kind="when" word=${word} iconKey="calendar" />` });
      }
      if (step > 1) whoIds().forEach(function (id) {
        var pt = App.partner(id); if (!pt) return;
        out.push({ key: 'who-' + id, label: pt.name,
          art: html`<${C.PartnerArt} partner=${pt} student=${student} />` });
      });
      /* 차례는 뼈대와 같습니다 : 언제 0 · 누구와 1 · 어디에서 2 · 무엇을 3 · 기분 4 */
      if (step > 2 && draft.place) out.push({ key: 'place', label: draft.place,
        art: html`<${C.PickArt} kind="place" word=${draft.place} iconKey="map" />` });
      if (step > 3 && draft.activityId) {
        var a2 = App.act(draft.activityId);
        if (a2) out.push({ key: 'act', label: a2.name,
          art: html`<${C.ActivityArt} activity=${a2} />` });
      }
      if (step > 4) (draft.moodIds || []).forEach(function (m) {
        var mo = App.mood(m); if (!mo) return;
        out.push({ key: 'mood-' + m, label: mo.name, art: html`<${C.MoodArt} mood=${mo} />` });
      });
      return out;
    }
    /* 날씨 고르기 — 그림일기의 기본 항목이라 **학생이 앱에서 고릅니다.**
       예전에는 인쇄한 종이에 손으로 동그라미 치는 방식이라 기록으로 남지 않았습니다.
       세 단계가 모두 같은 것을 쓰므로 한 군데에 만들어 두고 불러 씁니다. */
    function weatherPicker() {
      return html`<div class="wthr">
        <span class="wthr-lab">날씨</span>
        ${(App.DATA.weathers || []).map(function (w) {
          var on = draft.weather === w.id;
          return html`<button key=${w.id} type="button" class=${'wthr-btn' + (on ? ' on' : '')}
            aria-pressed=${on ? 'true' : 'false'} title=${w.name}
            onClick=${function () {
              patch({ weather: on ? '' : w.id });
              if (!on) App.speakFor(student, w.name);
            }}>
            <span class="wthr-art" aria-hidden="true"
              dangerouslySetInnerHTML=${{ __html: App.weatherSvg(w) }} />
            <span class="wthr-nm">${w.name}</span>
          </button>`;
        })}
      </div>`;
    }

    /* ══════════════ 세 단계가 **함께 쓰는 일기 뼈대** ══════════════
       ★ 1·2·3단계가 서로 다른 것을 물어서, 3단계에는 장소가 아예 없는 등
         빠진 것이 있었습니다. 이제 **묻는 내용은 세 단계가 똑같고**,
         다른 것은 `학생이 스스로 하는 정도` 뿐입니다.

         언제 → 누구와 → 어디에서 → 무엇을 → 기분

       ▸ 1단계 : 그림으로 고르기만
       ▸ 2단계 : 그림으로 고르고, 낱말로 문장 만들기
       ▸ 3단계 : 그림으로 고르고, 그 자리에서 **한 줄씩 글로도** 씁니다
                (그 여섯 줄이 모여 일기의 뼈대가 됩니다)

       ★ `또 하고 싶나` 는 **뼈대에서 빼서 제목 뒤로** 옮겼습니다 (2026-08-22).
         이것은 일기 문장을 만드는 물음이 아니라 **여가지도의 표시로 이어지는**
         물음입니다. 일기를 다 쓰고 제목까지 정한 뒤에 묻는 것이 차례에 맞습니다.
         (2단계에서 바로 뒤 `다음에는 어떻게 하고 싶나요?` 와 나란히 놓여
          같은 것을 두 번 묻는 것처럼 보이기도 했습니다)

       ⛔ 뼈대 다섯의 차례는 바꾸지 마세요. `picsSoFar1` · `diarySoFar1` ·
          `canNextBone` · `BONE_WRITE` · `META_TABS` 가 이 차례의 **번호**를
          그대로 씁니다. 뼈대 **뒤** 단계(제목 · 또 하고 싶나 · 그림 …)는
          이름으로 가르므로 L1/L2/L3 에서 자유롭게 옮겨도 됩니다. */
    var BONE = ['언제', '누구와', '어디에서', '무엇을', '기분'];

    /* 3단계가 각 뼈대 단계에서 함께 쓰는 글 (없는 단계는 그림만 고릅니다) */
    var BONE_WRITE = {
      0: [{ k: 'when',  q: '언제 있었던 일인가요?', ph: '예) 어제 학교 끝나고' }],
      1: [{ k: 'who',   q: '누구와 함께했나요?',    ph: '예) 친구 민수와' }],
      2: [{ k: 'where', q: '어디에 갔나요?',        ph: '예) 학교 놀이터에서' }],
      3: [{ k: 'what',  q: '무엇을 했나요?',        ph: '예) 그네를 타고 술래잡기를 했다' }],
      4: [{ k: 'how',   q: '어떤 기분이 들었나요?', ph: '예) 아주 신나고 재미있었다' },
          { k: 'why',   q: '왜 그렇게 느꼈나요?',   ph: '예) 친구와 오래 놀 수 있어서' }]
    };

    /* 3단계 글 칸 — 그림 고르기 **위**에 놓습니다.
       ▸ 비워 두어도 다음으로 넘어갑니다. 여섯 칸을 다 채워야 넘어가게 하면
         한 칸에서 막힌 학생이 일기를 아예 못 끝냅니다.
         안 쓴 칸은 마지막 확인 화면에서 모아 알려 줍니다. */
    function boneWrite(step) {
      var rows = BONE_WRITE[step];
      if (!rows || level !== 3) return null;
      var s = sixOf();
      return html`<div class="six">
        ${rows.map(function (x) {
          return html`<div key=${x.k} class="six-row">
            <span class="six-q">${x.q}</span>
            <input class="field six-in" value=${s[x.k] || ''} placeholder=${x.ph}
              onChange=${function (e) {
                var n = Object.assign({}, sixOf()); n[x.k] = e.target.value;
                patch({ six: n });
              }} />
          </div>`;
        })}
      </div>`;
    }

    /* 뼈대 한 단계를 그립니다 (세 단계가 함께 씁니다) */
    function boneBody(step) {
      var t = App.todayKey();

      if (step === 0) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} note=${lvNote} speakText="언제 했나요?">언제 했나요?<//>
          ${boneWrite(0)}
          <!-- bigSpeak : 읽어주기를 글자 아래에 크게 (질문 옆 읽어주기와 비슷한 크기) -->
          <${C.PickGrid} cols=${3} bigSpeak=${true}>
            <${C.Pick} selected=${draft.date === t} label="오늘" speakText="오늘"
              onClick=${function () { patch({ date: t }); }}
              art=${html`<${C.PickArt} kind="when" word="오늘" iconKey="sun" />`} />
            <${C.Pick} selected=${draft.date === App.addDays(t, -1)} label="어제" speakText="어제"
              onClick=${function () { patch({ date: App.addDays(t, -1) }); }}
              art=${html`<${C.PickArt} kind="when" word="어제" iconKey="calendar" />`} />
            <div class="pick" style=${{ cursor: 'default' }}>
              <span class="thumb"><${C.PickArt} kind="when" word="날짜 고르기" iconKey="pencil" /></span>
              <span class="label">날짜 직접 고르기</span>
              <input class="field" type="date" value=${draft.date}
                onChange=${function (e) { patch({ date: e.target.value || t }); }} />
            </div>
          <//>
          ${weatherPicker()}
        <//>`;
      }

      if (step === 1) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} note=${lvNote} speakText="누구와 했나요? 여러 명을 골라도 돼요.">누구와 했나요?<//>
          ${boneWrite(1)}
          <${C.PickGrid} cols=${7}>
            ${partners.map(function (pt) {
              var on = whoIds().indexOf(pt.id) >= 0;
              return html`<${C.Pick} key=${pt.id} selected=${on}
                label=${pt.name} speakText=${App.partnerSpeechPast(pt)} portrait=${true}
                onClick=${function () { toggleWho(pt); }}
                art=${html`<${C.PartnerArt} partner=${pt} student=${student} />`} />`;
            })}
          <//>
        <//>`;
      }

      /* ★ 장소는 **19곳 모두** 나옵니다 (계획하기와 같은 방식).
           예전에는 1단계에 다섯 곳만 나오고 3단계에는 아예 없었습니다.
         ▸ 한 쪽에 6곳 (3칸 × 2줄) — `무엇을 했나요?` 와 같은 개수라
           학생이 규칙 하나만 익히면 됩니다. 19곳 → 4쪽.
         ▸ `직접 쓰기` 는 마지막 쪽에만 붙입니다. */
      if (step === 2) {
        var places = (App.DATA.places || []).slice();
        if (act && act.defaultPlace) {
          places = [act.defaultPlace].concat(places.filter(function (s) { return s !== act.defaultPlace; }));
        }
        var PLACE_PER = 6;
        var plPages = Math.max(1, Math.ceil(places.length / PLACE_PER));
        var plPage = Math.min(placePageS[0], plPages - 1);
        var plShown = places.slice(plPage * PLACE_PER, plPage * PLACE_PER + PLACE_PER);
        var lastPl = plPage === plPages - 1;
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} note=${lvNote} speakText="어디에서 했나요?">어디에서 했나요?<//>
          ${boneWrite(2)}
          <${C.PickGrid} cols=${3} big=${true} label="장소">
            <!-- 고르면 낱말 하나가 아니라 짧은 문장으로 읽습니다 — 집 처럼
                 한 글자면 목소리가 이상하게 들립니다 (korean.js 주석 참고). -->
            ${plShown.map(function (s) {
              var say = s + '에서 했어요';
              return html`<${C.Pick} key=${s} selected=${draft.place === s} label=${s} speakText=${say}
                onClick=${function () { patch({ place: s }); App.speakFor(student, say); }}
                art=${html`<${C.PickArt} kind="place" word=${s} iconKey="map" />`} />`;
            })}
            ${lastPl && html`<div class="pick" style=${{ cursor: 'default' }}>
              <!-- 제목 고르기의 '직접 쓰기' 와 **같은 그림**을 씁니다.
                   뜻이 같은데 그림이 다르면 학생이 다른 것으로 봅니다. -->
              <span class="thumb">
                <${C.Art} src=${App.pickImage('title', '직접 쓰기')} iconKey="pencil" /></span>
              <span class="label">직접 쓰기</span>
              <input class="field" value=${draft.place || ''} placeholder="예) 우리 집 거실"
                onChange=${function (e) { patch({ place: e.target.value }); }} />
            </div>`}
          <//>
          ${plPages > 1 && html`<div class="wrap" style=${{ marginTop: '.6rem', justifyContent: 'center' }}>
            <${C.Btn} icon="back" disabled=${plPage === 0}
              onClick=${function () { placePageS[1](plPage - 1); }}>앞 장소 보기<//>
            <span class="chip">${plPage + 1} / ${plPages}</span>
            <${C.Btn} icon="next" disabled=${plPage >= plPages - 1}
              onClick=${function () { placePageS[1](plPage + 1); }}>장소 더 보기<//>
          </div>`}
        <//>`;
      }

      if (step === 3) {
        return html`<${React.Fragment}>
          ${boneWrite(3)}
          <${C.ActivityChooser} student=${student} value=${draft.activityId}
            area=${act ? act.area : null} note=${lvNote}
            onPick=${function (id) { var a = App.act(id); patch({ activityId: id, cardId: App.cardIdOf(id),
              place: draft.place || (a ? a.defaultPlace : '') }); }} />
        <//>`;
      }

      if (step === 4) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} note=${lvNote} speakText="기분이 어땠나요? 여러 개 골라도 좋아요.">기분이 어땠나요?<//>
          ${boneWrite(4)}
          <${C.PickGrid} cols=${moods.length > 4 ? 4 : moods.length}>
            ${moods.map(function (m) {
              var on = draft.moodIds.indexOf(m.id) >= 0;
              return html`<${C.Pick} key=${m.id} selected=${on} label=${m.name} speakText=${m.name}
                onClick=${function () {
                  patch({ moodIds: on ? draft.moodIds.filter(function (x) { return x !== m.id; })
                                      : draft.moodIds.concat([m.id]) });
                  if (!on) App.speakFor(student, m.name);
                }}
                art=${html`<${C.MoodArt} mood=${m} />`} />`;
            })}
          <//>
        <//>`;
      }

      return null;
    }

    /* 또 하고 싶나 — 여가지도의 `또 하고 싶어요` 기록으로 이어집니다.
       ★ 뼈대(boneBody)에서 빼내어 **제목 뒤**에 놓습니다. 일기 문장을 만드는
         물음이 아니라 지도로 이어지는 물음이라, 일기를 다 쓴 뒤가 맞습니다.
       ▸ 세 단계가 이 하나를 함께 씁니다 — 따로 만들면 언젠가 어긋납니다. */
    function againBody() {
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} note=${lvNote} speakText="또 하고 싶나요?">또 하고 싶나요?<//>
        <${C.PickGrid} cols=${3}>
          ${App.DATA.agains.map(function (g) {
            return html`<${C.Pick} key=${g.id} selected=${draft.againId === g.id}
              label=${g.name} speakText=${g.name}
              onClick=${function () { patch({ againId: g.id }); App.speakFor(student, g.name); }}
              art=${html`<${C.Art} src=${App.againImage(g)} iconKey=${g.icon} />`} />`;
          })}
        <//>
      <//>`;
    }

    /* 1단계 그림 띠 아래에 붙는 **한 줄 문장** (계획하기 1단계와 같은 모양).
       지나온 단계까지만 넣어서, 고를 때마다 문장이 조금씩 자랍니다. */
    function diarySoFar1(step) {
      var a = App.act(draft.activityId);
      var t = App.todayKey();
      var bits = ['나는'];
      if (step > 0 && draft.date) {
        bits.push(draft.date === t ? '오늘'
          : (draft.date === App.addDays(t, -1) ? '어제' : App.fmtDateShort(draft.date) + '에'));
      }
      if (step > 1) {
        var pp = App.partnerPhrase(draft.partnerId, whoIds());
        if (pp) bits.push(pp);
      }
      if (step > 2 && draft.place) bits.push(draft.place + '에서');
      if (step > 3 && a) {
        /* 활동 문장 뒤에 마침표를 붙여야 기분 문장과 이어 붙지 않습니다
           (`곤충을 키워 보았어요 기분이 신나요` 처럼 붙어 나왔습니다) */
        bits.push((a.diaryText || (App.eulReul(a.name) + ' 했어요')) + '.');
      }
      if (step > 4 && draft.moodIds.length) {
        var mo = App.mood(draft.moodIds[0]);
        if (mo) bits.push('기분이 ' + mo.name + '.');
      }
      /* 활동을 아직 안 골랐으면 문장이 끝나지 않았다는 뜻으로 … 를 붙입니다 */
      return bits.join(' ') + ((step > 3 && a) ? '' : ' …');
    }

    /* ── 흰 빈칸이 채워지는 두 줄 문장 (2·3단계) ──────────────────
       ★ 고른 것을 줄글로 죽 이어 붙이면, 뒤에 기분·제목이 붙을수록
         앞 내용이 옆으로 밀려나 안 보였습니다. **빈칸 채우기**로 되돌립니다.
         아직 안 고른 것은 빈 흰 칸으로 남아, 무엇을 더 골라야 하는지 보입니다.
       ▸ 1줄은 **세 단계가 똑같은 뼈대**입니다 (언제 · 누구와 · 어디에서 · 무엇을).
       ▸ 2줄에는 그 단계에서 더 고르는 것만 담습니다. 2줄이 길어져도
         1줄이 밀리지 않습니다.
       ▸ 3단계는 학생이 **직접 쓴 글**로 같은 칸을 채웁니다. */
    function blank(v, wide) {
      var on = !!(v && String(v).trim());
      return html`<span class=${'blank' + (on ? ' on' : '') + (wide ? ' wide' : '')}>
        ${on ? v : '　　　'}</span>`;
    }
    /* ══════ 틀의 고정 말이 학생 글과 겹치면 붙이지 않습니다 ══════
       3단계는 학생이 **자기 말로** 씁니다. 안내 예시부터 `예) 친구 민수와`,
       `예) 학교 놀이터에서` 처럼 **조사까지 포함**해 쓰라고 되어 있습니다.
       그런데 틀은 1·2단계용 고정 말을 그대로 또 붙여서 이렇게 됐습니다.

         나는 [나는 어제] [가족과 함께]와 함께 [강당에서]에서 [노래부르기를 했어요.]를 했어요.

       ★ 그래서 **이미 있는 말은 또 붙이지 않습니다.**
         낱말로 써도(`가족` → 가족과 함께) 어구로 써도(`가족과 함께` → 그대로)
         양쪽 다 자연스럽습니다.
       ⛔ 낱말만 쓰게 강제하지 않습니다. 그러면 아래 `내가 만든 뼈대`가
         `어제 가족 강당 노래부르기` 처럼 단어 나열이 되어 버립니다.
       ▸ 1·2단계는 고른 낱말이 그대로 들어오므로 겹칠 일이 없습니다 (그대로 붙습니다). */
    /* 앞에 붙는 말(`나는` · `기분이`)이 학생 글에 이미 있으면 생략합니다 */
    function headWord(v, word) {
      var s = String(v || '').trim();
      return (s.indexOf(word) === 0) ? '' : word;
    }
    /* 뒤에 붙는 말을 정합니다. 이미 그렇게 끝나면 빈 글자를 돌려줍니다.
         v     학생이 쓴 글(또는 고른 낱말)
         re    이미 이렇게 끝나면 붙이지 않을 모양
         make  붙일 말을 만드는 함수
       ⚠ 끝나는 말을 **하나하나 나열하면 반드시 빠집니다** (`재미있었어요` 를
         놓쳐서 `재미있었어요를 했어요.` 가 나왔습니다). 종결어미 모양으로 잡습니다. */
    function tailWord(v, re, make) {
      var s = String(v || '').trim().replace(/[.。!?]+$/, '');
      if (!s) return make(v);                          // 빈칸이면 틀을 그대로 보여 줍니다
      return re.test(s) ? '' : make(v);
    }
    /* 문장이 끝나는 모양 — 이렇게 끝나면 `을/를 했어요.` 를 또 붙이지 않습니다 */
    var RE_END = /(어요|아요|여요|예요|에요|습니다|했다|았다|었다|였다|한다|이다|았어|었어|였어)$/;
    /* 이미 마침표로 끝났으면 마침표를 또 찍지 않습니다 */
    function dotOf(v) {
      return /[.。!?]$/.test(String(v || '').trim()) ? '' : '.';
    }

    function frameBar() {
      var six = sixOf();
      /* 3단계는 쓴 글을, 1·2단계는 고른 것을 넣습니다 */
      function say(k, picked) {
        return level === 3 ? ((six[k] || '').trim() || picked || '') : (picked || '');
      }
      var t = App.todayKey();
      var dateWord = !draft.date ? ''
        : (draft.date === t ? '오늘'
          : (draft.date === App.addDays(t, -1) ? '어제' : App.fmtDateShort(draft.date)));
      var whoWord = whoIds().map(function (id) {
        var q = App.partner(id); return q ? q.name : '';
      }).filter(Boolean).join(', ');
      var a2 = App.act(draft.activityId);
      var actWord = a2 ? App.frameWord(a2) : '';
      var moodWord = (draft.moodIds || []).map(function (m) {
        var mo = App.mood(m); return mo ? mo.name : '';
      }).filter(Boolean).join(', ');

      var w1 = say('when', dateWord), w2 = say('who', whoWord);
      var w3 = say('where', draft.place), w4 = say('what', actWord);
      /* 1·2단계는 고른 것(id)으로, 3단계는 **칸에 든 말**로 가립니다.
         id 로만 보면 3단계에서 손으로 쓴 `혼자` 를 놓쳐 `혼자와 함께` 가 됩니다.
         ⚠ w2 가 정해진 **뒤에** 가려야 합니다. 앞에서 가리면 3단계에서 늘 빈 값을 봅니다. */
      var alone = (whoIds().length === 1 && whoIds()[0] === 'alone' && level !== 3)
               || App.isAloneWord(w2);
      var f = (level === 2) ? frames() : {};

      /* 겹치는 고정 말은 붙이지 않습니다 (위 tailWord 주석 참고) */
      var 나는 = headWord(w1, '나는');
      var 함께 = alone ? ''
        : tailWord(w2, /(와|과|이랑|랑|함께)$/,
            function (v) { return josaOf(v, '과/와') + ' 함께'; });
      var 에서 = tailWord(w3, /(에서|에)$/, function () { return '에서'; });
      var 했어요 = tailWord(w4, RE_END,
            function (v) { return josaOf(v, '을/를') + ' 했어요.'; });
      /* 서술어로 끝나서 `을/를 했어요.` 를 뺐으면 **마침표만** 찍어 줍니다.
         (`…술래잡기를 했다` 처럼 첫 줄이 마침표 없이 끝나 버립니다) */
      if (!했어요 && String(w4 || '').trim()) 했어요 = dotOf(w4);
      var howWord = say('how', moodWord);

      return html`<${React.Fragment}>
        <div class="frame-line">
          ${나는 && html`<b>${나는}</b>`} ${blank(w1)}
          <!-- 혼자는 와 함께 를 붙이지 않습니다 (혼자와 함께 는 말이 안 됩니다).
               이미 있는 App.partnerPhrase 와 같은 규칙을 씁니다. -->
          ${blank(w2)}${함께 && html`<b>${함께}</b>`}
          ${blank(w3)}${에서 && html`<b>${에서}</b>`}
          ${blank(w4, true)}${했어요 && html`<b>${했어요}</b>`}
        </div>
        <div class="frame-line">
          ${headWord(howWord, '기분이') && html`<b>기분이</b>`} ${blank(howWord)}<b>${dotOf(howWord)}</b>
          ${level === 2 && html`<${React.Fragment}>
            <b>기억에 남는 것은</b> ${blank(f.f3)}<b>${josaOf(f.f3, '이에요/예요') + '.'}</b>
            <b>다음에는</b> ${blank(f.f4)}<b>하고 싶어요.</b>
          <//>`}
          ${level === 3 && html`<${React.Fragment}>
            <b>왜냐하면</b> ${blank(say('why', ''), true)}<b>${dotOf(say('why', ''))}</b>
          <//>`}
        </div>
      <//>`;
    }

    /* 뼈대 단계에서 **다음으로 넘어가도 되는지**.
       ▸ 그림은 반드시 골라야 합니다 (안 고르면 일기에 넣을 것이 없습니다).
       ▸ 글은 비어 있어도 넘어갑니다 (위 boneWrite 주석 참고). */
    function canNextBone(step) {
      if (step === 0) return !!draft.date;
      if (step === 1) return whoIds().length > 0;
      if (step === 2) return !!draft.place;
      if (step === 3) return !!draft.activityId;
      if (step === 4) return draft.moodIds.length > 0;
      /* `또 하고 싶나` 는 뼈대에서 빠져 제목 뒤로 갔습니다.
         그 단계에서 넘어가도 되는지는 아래 canNextStep 이 봅니다. */
      return true;
    }
    /* 지금 단계에서 다음으로 넘어가도 되는지 (뼈대 + 뼈대 밖 단계) */
    function canNextStep(step) {
      if (step < BONE.length) return canNextBone(step);
      if (steps[step] === '또 하고 싶나') return !!draft.againId;
      return true;
    }

    /* 그림 고르기 — 세 단계가 같은 화면을 씁니다 */
    function picStep() {
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} note=${lvNote} speakText="그림일기에 넣을 그림을 골라요">
          그림일기에 넣을 그림을 골라요<//>
        ${photoSection(true)}
      <//>`;
    }

    /* ★ 단계는 **번호가 아니라 이름으로** 가릅니다.
         예전에는 `step === 6` 처럼 번호로 갈랐습니다. 그래서 차례를 한 칸만
         바꿔도 엉뚱한 화면이 나와, 주석에 `차례를 바꾸지 마세요` 를 달아야 했습니다.
       ▸ 이름으로 가르면 차례를 바꿔도 그대로 맞습니다. */
    function level1Body(step) {
      if (step < BONE.length) return boneBody(step);
      var key = L1[step];
      if (key === '또 하고 싶나') return againBody();
      if (key === '그림') return picStep();
      return confirmStep();
    }

    /* --------------------- 완성 (1·2단계 마지막) ---------------------
       ★ 문장만 보여 주지 않고 **완성된 그림일기를 작게 그대로** 보여 줍니다.
         예전에는 노란 문장 칸만 있어서, 학생이 "내 일기가 어떻게 됐는지" 를
         모르고 저장했습니다. 저장한 뒤 여러 창을 지나서야 완성품이 나왔고,
         그 사이에 `글 → 그림 → 완성` 흐름이 끊겼습니다.
         이제 이 한 화면에서 끝납니다. */
    /* ── 아직 안 쓴 칸 알려 주기 (3단계) ──────────────────────────
       ★ 글 칸을 비워 두어도 다음으로 넘어갑니다. 그래야 한 칸에서 막힌
         학생도 일기를 끝낼 수 있습니다. 대신 **마지막에 모아서** 알려 주고,
         누르면 그 질문으로 바로 돌아갑니다.
       ▸ 나무라는 말투로 쓰지 않습니다. 안 써도 일기는 이미 완성입니다. */
    function emptyBoneNote() {
      if (level !== 3) return null;
      var s = sixOf();
      var todo = [];
      Object.keys(BONE_WRITE).forEach(function (st) {
        BONE_WRITE[st].forEach(function (x) {
          if (!(s[x.k] || '').trim()) todo.push({ step: Number(st), q: x.q });
        });
      });
      if (!todo.length) return null;
      return html`<${C.Banner} tone="info" icon="pencil"
        speakText=${'아직 안 쓴 것이 ' + todo.length + '가지 있어요. 지금 써도 되고, 그냥 두어도 괜찮아요.'}>
        <b>아직 안 쓴 것이 ${todo.length}가지 있어요.</b>
        <div class="small">눌러서 그 질문으로 갈 수 있어요. 그냥 두어도 괜찮아요.</div>
        <div class="wrap" style=${{ marginTop: '.4rem' }}>
          ${todo.map(function (t) {
            return html`<${C.Btn} key=${t.q} size="small" className="pastel-yellow" icon="back"
              onClick=${function () { stepS[1](t.step); }}>${t.q}<//>`;
          })}
        </div>
      <//>`;
    }

    /* 바꾸기 창의 네 쪽. `bone` 은 뼈대 화면 번호입니다 (boneBody 주석 참고).
       editMetaS 에는 **쪽 번호**가 들어갑니다 (false 면 창이 닫힌 것). */
    var META_TABS = [
      { name: '날짜 · 날씨', bone: 0 },
      { name: '사람',        bone: 1 },
      { name: '장소',        bone: 2 },
      { name: '실내외 활동', bone: 3 }
    ];
    function metaPage() {
      var v = editMetaS[0];
      return (typeof v === 'number' && v >= 0 && v < META_TABS.length) ? v : 0;
    }

    /* -------- 그림일기 위의 그림 자리·크기 (완성 화면에서 바로 고치기) --------
       아직 저장 전이라 store 가 아니라 **draft** 에 담습니다.
       담는 곳 이름(artLayout)은 저장 뒤와 같아서, 저장하면 그대로 이어집니다. */
    function moveArt(key, pos) {
      var cur = draft.artLayout || {};
      var next = {};
      for (var k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) next[k] = cur[k];
      next[key] = pos;
      patch({ artLayout: next });
    }

    /* 고른 그림의 크기를 한 단계씩 (0.5배 ~ 2배) */
    function sizeArt(dir) {
      var key = pickedS[0];
      if (!key) { App.ui.toast('크기를 바꿀 그림을 먼저 눌러 주세요.'); return; }
      var cur = draft.artLayout || {};
      var now = cur[key] || {};
      var sc = Math.max(0.5, Math.min(2, (now.s || 1) + dir * 0.15));
      var next = {};
      for (var k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) next[k] = cur[k];
      next[key] = { x: now.x, y: now.y, s: Math.round(sc * 100) / 100 };
      patch({ artLayout: next });
    }

    function confirmStep(madeText) {
      return html`<${React.Fragment}>
        <!-- ⚠ 여기에는 단계 설명(note)을 두지 않습니다.
               단계 설명은 **무엇을 하는 중인지** 알려 주는 말인데, 완성 화면은
               이미 다 만든 뒤라 알려 줄 일이 없습니다. 오른쪽 자리도 좁습니다. -->
        <${C.Question} bar=${true} speakText="일기가 완성되었어요">일기가 완성되었어요<//>
        <!-- 넓고 낮은 화면에서는 좌우로 나눕니다 (문장 | 완성된 그림일기).
             위아래로 쌓으면 낮은 화면에서 2쪽으로 갈라집니다.
             ★ 바깥 껍데기(.confirm-fit)에 zoom 을 걸어 흰 칸을 넘으면 통째로 줄입니다.
               **재는 것은 안쪽(.confirm-2col)** 입니다 — zoom 이 걸린 것을 재면
               값이 겉돌아 제대로 줄지 않습니다 (위 useFitOnePage 주석). 지우지 마세요. -->
        <div class="confirm-fit" ref=${fitBox}>
        <div class="confirm-2col" ref=${fitInner}>
          <div class="confirm-left">
            <!-- ★ 왼쪽 고치는 길을 **오른쪽 그림일기의 차례와 나란히** 놓습니다.
                   위 = 그림칸 → 그림 고치기 두 가지
                   아래 = 원고지 → 글 고치기(노란 칸)
                   맨 아래 = 날짜 · 사람 · 장소
                 왼쪽과 오른쪽이 같은 차례로 놓이면, 어느 단추가 무엇을 고치는
                 것인지 눈으로 바로 이어집니다. 학생이 「왼쪽에서 고치면 되는구나」
                 를 설명 없이 알게 됩니다.
                 ⛔ 이 주석에 백틱을 쓰면 템플릿이 끊깁니다 — 낫표(「」)만 쓸 것. -->
            <div class="fix-part">
              <span class="fix-lab">그림</span>
              <div class="fix-body">
                <${C.Btn} size="big" className=${'pastel-green fix-go' + (moveS[0] ? ' on' : '')}
                  icon="expand" onClick=${function () { moveS[1](!moveS[0]); }}>
                  ${moveS[0] ? '자리 옮기기 끝내기' : '그림 자리 · 크기 바꾸기'}<//>
                <${C.Btn} size="big" className="pastel-red fix-go" icon="pencil"
                  onClick=${function () { patch({ picKind: 'draw' }); drawS[1](true); }}>
                  그림 다시 그리기<//>
              </div>
            </div>

            <!-- 내가 그린 그림(또는 사진)으로 바꾼 뒤 **되돌릴 길**.
                 ★ 그림 묶음 바로 아래에 둡니다 — 그림에 딸린 일이라
                   그림 자리에 있어야 무엇을 되돌리는지 압니다. -->
            ${(draft.picKind === 'draw' || draft.picKind === 'photo') && html`<div class="fix-undo">
              <${C.Btn} size="small" icon="back"
                onClick=${function () { patch({ picKind: 'app' }); }}>
                고른 그림으로 되돌리기<//>
              <span class="small muted">그린 그림은 지워지지 않아요.</span>
            </div>`}

            <!-- ★ 자리 옮기기 안내는 **그림 묶음과 글 묶음 사이**에 놓습니다.
                   ⚠ 켜고 끌 때 아래 칸들이 밀려 올라갔다 내려갔다 하면 안 됩니다.
                     그래서 **자리는 늘 잡아 두고**(move-slot) 안 켰을 때만
                     보이지 않게 합니다. 그러면 왼쪽 두 묶음이 오른쪽
                     그림일기의 그림칸 · 원고지와 **처음부터 나란히** 놓입니다. -->
            <div class=${'move-slot' + (moveS[0] ? '' : ' off')} aria-hidden=${moveS[0] ? 'false' : 'true'}>
              <!-- ⚠ speakText 를 켤 때만 주면 **읽어주기 단추가 그때만 생겨**
                     칸 높이가 달라지고, 아래 칸들이 53px 밀립니다.
                     자리를 잡아 두는 것이 목적이므로 **늘 같은 것을 그립니다.**
                     끈 동안에는 visibility 로 감추므로 눌리지 않습니다. -->
              <${C.Banner} tone="info" icon="expand"
                speakText="그림을 손가락이나 마우스로 끌어서 자리를 옮기고, 크기도 바꾸어 보아요.">
                <b>그림을 끌어서 옮겨요.</b>
                <div class="small">오른쪽 그림일기에서 그림을 잡고 끌면 자리가 바뀌어요.
                  그림을 한 번 누르면 크기도 바꿀 수 있어요.</div>
                <div class="wrap" style=${{ justifyContent: 'center', marginTop: '.5rem' }}>
                  <${C.Btn} size="small" className="pastel-blue"
                    onClick=${function () { sizeArt(-1); }}>고른 그림 작게<//>
                  <${C.Btn} size="small" className="pastel-blue"
                    onClick=${function () { sizeArt(1); }}>고른 그림 크게<//>
                  <${C.Btn} size="small"
                    onClick=${function () { patch({ artLayout: null }); pickedS[1](null); }}>
                    처음 자리로<//>
                </div>
              <//>
            </div>

            <div class="fix-part">
              <span class="fix-lab">글</span>
              <div class="fix-body">
                <${C.SentenceEdit}
                  made=${madeText === undefined ? App.sentences.diaryMade(draft) : madeText}
                  value=${draft.bodyEdit === undefined ? null : draft.bodyEdit}
                  placeholder="아직 고른 내용이 없어요. 여기에 직접 써도 돼요."
                  onChange=${function (v) { patch({ bodyEdit: v }); }}
                  onReset=${function () { patch({ bodyEdit: null }); }} />
                ${emptyBoneNote()}
              </div>
            </div>

            <div class="fix-here">
              <${C.Btn} size="big" className="pastel-blue fix-go" icon="edit"
                onClick=${function () { editMetaS[1](0); }}>날짜 · 사람 · 장소 바꾸기<//>
              <!-- ★ 저장은 **왼쪽 기둥 맨 아래**. 오른쪽은 보는 자리,
                     왼쪽은 고치고 저장하는 자리로 갈라 둡니다. -->
              <${C.Btn} kind="ok" size="big" icon="save" className="fix-save"
                onClick=${save}>일기 저장하기<//>
              <!-- ⚠ 「나의 일기장으로 돌아가기」 를 이 기둥에 두지 마세요.
                     여기에 두었더니 눈에 안 띈다는 이야기가 있었고, 기둥이
                     커진 만큼 한 쪽에 맞추는 장치(useFitOnePage)가 화면을
                     통째로 줄여서 **그림일기가 11% 작아졌습니다.**
                   ▸ 지금은 **맨 위 줄 화살표 자리**에 글자 단추로 있습니다
                     (TopBar 의 backText). 흰 칸 높이를 먹지 않습니다. -->
            </div>

          </div>
          <!-- 오른쪽에는 **완성된 그림일기 그대로**. 고치는 길은 모두 왼쪽에 있어서
               학생이 한 곳만 보면 됩니다.
               ★ 여기는 **편집 화면**입니다. 왼쪽에서 그림·문장을 고치면 오른쪽
                 그림일기가 그대로 바뀌는 것을 보아야 합니다. 그래서 **세 단계 모두**
                 종이 모양(원고지 칸 · 그림칸)을 그대로 보여 줍니다.
               ⚠ 한때 1단계만 그림·문장을 크게 잘라 보여 주었습니다(C.BigLook).
                 글자를 못 읽는 학생을 배려한 것이었지만, **완성 화면은 다 만든
                 일기를 확인하고 손보는 자리**라 종이 모양이 그대로 보여야 합니다.
                 크게 보기는 글자를 만드는 단계에서 쓸 것입니다. -->
          <${C.DiaryPreview} draft=${draft} student=${student}
            arrange=${moveS[0]} onMoveArt=${moveArt}
            picked=${pickedS[0]} onPickArt=${function (k) { pickedS[1](k); }} />
        </div>
        </div>
      <//>`;
    }

    /* --------------------- 사진 --------------------- */
    function photoSection(bare) {
      if (student && student.photo === false) return null;
      /* 그림일기 그림칸에 무엇을 넣을지 세 가지 가운데 하나를 고릅니다.
           app   내가 고른 그림 — 고른 활동·사람·기분·장소를 그림으로
           photo 사진 넣기      — 이 기기에 있는 사진
           draw  내가 그리기    — 손가락·펜으로 직접 그리기
         그림은 언제나 한 장만 들어갑니다. */
      var kind = draft.picKind || 'app';
      var main = draft.mainPhotoId && draft.photoIds.indexOf(draft.mainPhotoId) >= 0
        ? draft.mainPhotoId : (draft.photoIds[0] || null);
      var myDraw = draft.drawPhotoId ? App.photos.url(draft.drawPhotoId) : null;

      /* ★ 세 칸을 **누르면 바로 그 일이 일어납니다.**
           예전에는 고르기만 하고 아래에 또 다른 단추가 나와서,
           학생이 '눌렀는데 아무 일도 안 일어난다' 고 느꼈습니다.
           또 그 아래 블록(사진 목록·그린 그림)이 길어서 이 화면이 3쪽으로
           갈라졌고, **1쪽이 텅 비어** 보였습니다 (규칙 10-1).
           지금은 사진 고르기도 그림 그리기도 **팝업**에서 합니다.
           고른 결과는 세 칸 바로 아래에 **작게 한 줄**로만 보여 줍니다. */
      var chosenPic = (kind === 'photo' && main) ? App.photos.url(main)
                    : (kind === 'draw' && myDraw) ? myDraw : null;

      return html`<${C.Sec} title=${bare ? null : '그림일기에 넣을 그림'}
          speakText=${bare ? null : '그림일기에 넣을 그림을 골라요'}>
        <${C.PickGrid} cols=${3} label="그림일기에 넣을 그림">
          <${C.Pick} label="내가 고른 그림" speakText="내가 고른 그림"
            note="활동·사람·기분" selected=${kind === 'app'}
            onClick=${function () { patch({ picKind: 'app' }); }}
            art=${html`<${C.ActivityArt} activity=${act} />`} />
          <${C.Pick} label="사진 넣기" speakText="사진 넣기"
            note="누르면 사진을 골라요" selected=${kind === 'photo'}
            onClick=${function () { patch({ picKind: 'photo' }); photoS[1](true); }}
            art=${html`<${C.Art} src=${App.pickImage('word', '사진 넣기')} iconKey="camera" />`} />
          <${C.Pick} label="내가 그리기" speakText="내가 그리기"
            note="누르면 그림판이 열려요" selected=${kind === 'draw'}
            onClick=${function () { patch({ picKind: 'draw' }); drawS[1](true); }}
            art=${html`<${C.Art} src=${App.pickImage('word', '내가 그리기')} iconKey="pencil" />`} />
        <//>

        ${chosenPic && html`<div class="picked-row">
          <img src=${chosenPic} alt="그림일기에 넣을 그림" class="picked-thumb" />
          <span class="grow small" style=${{ fontWeight: 800 }}>
            ${kind === 'draw' ? '내가 그린 그림이 들어가요' : '이 사진이 들어가요'}</span>
          <${C.Btn} size="small" icon="pencil" className="pastel-blue"
            onClick=${function () { if (kind === 'draw') drawS[1](true); else photoS[1](true); }}>
            ${kind === 'draw' ? '고쳐 그리기' : '다른 사진'}<//>
        </div>`}
        ${kind === 'draw' && !myDraw && html`<p class="small muted" style=${{ textAlign: 'center' }}>
          <b>내가 그리기</b> 를 한 번 더 누르면 그림판이 열려요.</p>`}
        ${kind === 'photo' && !main && html`<p class="small muted" style=${{ textAlign: 'center' }}>
          <b>사진 넣기</b> 를 한 번 더 누르면 사진을 고를 수 있어요.</p>`}
      <//>`;
    }

    /* --------------------- 공통 기록 머리 --------------------- */
    function metaBar() {
      var pt = App.partner(draft.partnerId);
      return html`<div class="banner info" style=${{ marginBottom: '.7rem' }}>
        <div class="row">
          <span class="chip"><span aria-hidden="true"
            dangerouslySetInnerHTML=${{ __html: App.icon('calendar') }} />${App.fmtDateShort(draft.date)}</span>
          <span class="chip">${act ? act.name : '활동을 골라 주세요'}</span>
          <span class="chip">${pt ? pt.name : '함께한 사람'}</span>
          <span class="chip">${draft.place || '장소'}</span>
          ${draft.weather && html`<span class="chip">
            <span class="chip-art" aria-hidden="true"
              dangerouslySetInnerHTML=${{ __html: App.weatherSvg(App.weather(draft.weather)) }} />
            ${(App.weather(draft.weather) || {}).name}</span>`}
          <div class="grow"></div>
          ${fromPlan && html`<span class="star-badge">계획에서 가져왔어요</span>`}
          <${C.Btn} size="small" icon="pencil" onClick=${function () { editMetaS[1](0); }}>바꾸기<//>
        </div>
      </div>`;
    }

    /* --------------------- 2단계 ---------------------
       예전에는 문장 4개 + 기분 + 또하기 + 그림이 한 화면에 몰려 있어서
       학생이 '지금 무엇을 해야 하는지' 알기 어려웠습니다.
       1단계처럼 한 번에 하나씩 묻고 넘어갑니다. (규칙 1·2) */
    /* ★ `또 하고 싶나` 를 **제목 뒤**에 둡니다 (지도 표시로 이어지는 물음).
         `다음에는 어떻게 하고 싶나요?` 바로 옆에 있으면 같은 것을 두 번 묻는
         것처럼 보였습니다. 일기를 다 만든 뒤에 묻습니다. */
    var L2 = BONE.concat(['기억', '다음에', '제목', '또 하고 싶나', '그림', '확인']);

    function frames() {
      var f = Object.assign({}, draft.frames || {});
      /* 뼈대에서 고른 것을 문장 칸에 그대로 옮겨 옵니다.
         ★ 누구와 · 기분은 이제 **공통 뼈대**에서 그림으로 고릅니다.
           여기서 옮겨 오지 않으면 2단계 문장이 빈 칸으로 남습니다. */
      if (!f.f1a) {
        var names = whoIds().map(function (id) {
          var q = App.partner(id); return q ? q.name : '';
        }).filter(Boolean).join(', ');
        if (names) f.f1a = names;
      }
      if (!f.f1b && act) f.f1b = App.frameWord(act);
      if (!f.f2 && draft.moodIds && draft.moodIds.length) {
        var m0 = App.mood(draft.moodIds[0]);
        if (m0) f.f2 = m0.past;
      }
      return f;
    }
    function setF(k, v, extra) {
      var n = Object.assign({}, frames()); n[k] = v;
      patch(Object.assign({ frames: n }, extra || {}));
    }

    /* 고른 낱말에 맞는 조사를 붙여 보여 줍니다.
       '스티커북 만들기 을 했어요' 처럼 어긋나지 않게요. */
    function josaOf(w, pair) {
      if (!w) return pair.split('/')[1] || pair.split('/')[0];
      return App.josa(w, pair).slice(String(w).length);
    }

    /* 만들어지고 있는 문장을 늘 위에 보여 줍니다 (지금 어디를 채우는지 보이도록) */
    function frameLine(f) {
      return html`<div class="frame-line">
        ${fromPlan && html`<span class="from-plan">계획에서 가져왔어요</span>`}
        <b>나는</b>
        <span class=${'blank' + (f.f1a ? ' on' : '')}>${f.f1a || '　　'}</span>
        <b>${josaOf(f.f1a, '과/와') + ' 함께'}</b>
        <span class=${'blank' + (f.f1b ? ' on' : '')}>${f.f1b || '　　'}</span>
        <b>${josaOf(f.f1b, '을/를') + ' 했어요.'}</b>
      </div>`;
    }

    /* 낱말 카드 — 활동 카드처럼 크게, 그림을 붙여서 고릅니다.
       (작은 글자 단추는 읽기 어려운 학생이 고르기 힘듭니다) */
    function wordCards(list, k, cur, cols, extraOf) {
      return html`<${C.PickGrid} cols=${cols || 4}>
        ${list.map(function (w) {
          var on = cur === w.name;
          return html`<${C.Pick} key=${w.name} selected=${on} label=${w.name} speakText=${w.name}
            onClick=${function () {
              setF(k, w.name, extraOf ? extraOf(w) : null);
              App.speakFor(student, w.name);
            }}
            art=${w.mood
              ? html`<${C.MoodArt} mood=${w.mood} />`
              : html`<${C.Art} src=${wordImage(w)} iconKey=${w.icon} />`} />`;
        })}
      <//>`;
    }

    /* 낱말 카드 그림.
       ▸ use : **이미 있는 그림**을 그대로 씁니다. 뜻이 같은데 그림을 또 그리면
         학생이 둘을 다른 것으로 봅니다 (`잘 모르겠어요` 를 한 장으로 모은 것과 같은 뜻).
       ▸ use 가 없으면 images/일기 낱말/<이름>.png 를 찾고, 없으면 icon 의 SVG.
       ⛔ 별(star)·하트(heart) 는 쓰지 않습니다 — 지도에서 도전·좋아해요 를 뜻합니다. */
    var F3_WORDS = [
      { name: '친구와 함께한 것', icon: 'pFriend', use: 'images/제목/함께한.png' },
      { name: '만든 작품',       icon: 'frame' },
      { name: '맛있게 먹은 것',   icon: 'food' },
      /* ⚠ `새로 해본 것` 이었습니다. 제목 칸의 `처음 해 본 ○○` 과 **같은 뜻인데
           말이 둘**이었습니다. 그림은 이미 같은 것을 쓰고 있었는데 말만 갈렸습니다.
         한 가지 뜻에는 **한 가지 말**을 씁니다. 낱말 자체가 배울 거리인데,
         같은 것을 두 말로 가르치면 익힐 것이 곱절이 됩니다.
         `처음` 이 `새로` 보다 아이들이 자주 쓰고 뜻이 또렷합니다. */
      { name: '처음 해 본 것',    icon: 'avSprout', use: 'images/제목/처음 해 본.png' }
    ];
    var F4_WORDS = [
      { name: '또',          icon: 'next',  use: 'images/또하기/또 하고 싶어요.png' },
      { name: '더 오래',      icon: 'clock' },
      /* ★ 또하기의 `다른 것도 하고 싶어요` 와 **같은 그림 한 벌**을 씁니다.
           둘 다 `이 활동 말고 다른 것` 이라는 한 가지 뜻입니다.
           뜻이 같은 자리에 그림을 또 그리면 학생이 **둘을 다른 것으로** 봅니다 (14-10).
         ⚠ 한때 이 자리에 전용 그림을 따로 두었는데, 거의 같은 그림이 **두 벌**이 되어
           테두리 색만 미묘하게 다른 두 판이 생겼습니다. 한 벌로 모았습니다.
           그림을 바꾸려면 `images/또하기/다른 것도 하고 싶어요.png` **하나만** 바꾸세요. */
      { name: '다른 활동을',  icon: 'dice',  use: 'images/또하기/다른 것도 하고 싶어요.png' },
      /* ⚠ `친구와 같이` 였습니다. `친구와 함께한 것`(기억) · `아빠와 함께한`(제목)
           과 **같은 뜻인데 말이 달랐습니다.** `함께` 로 맞춥니다 (셋 중 둘이 이미 함께).
         문장도 자연스럽습니다 : `다음에는 친구와 함께 하고 싶어요.` */
      { name: '친구와 함께',  icon: 'pFriend', use: 'images/제목/함께한.png' }
    ];

    /* 낱말 카드에 붙일 그림 주소 (없으면 null → icon 의 SVG 가 나옵니다) */
    function wordImage(w) {
      if (!w) return null;
      return w.use ? App.imgUrl(w.use) : App.pickImage('word', w.name);
    }

    /* 제목 후보 — 고른 내용에서 만들어 줍니다. 직접 쓸 수도 있어요. */
    function titleWords(f) {
      var short = App.shortName(act) || (act ? act.name : '여가활동');
      var who = f.f1a || '';
      var mood = App.mood((draft.moodIds || [])[0]);
      /* ⛔ 하트 · 별은 쓰지 않습니다.
           지도에서 **하트 = 좋아해요**, **별 = 도전하고 싶어요** 를 뜻합니다.
           여기에도 같은 모양을 쓰면 한 그림이 서로 다른 뜻으로 두 번 보입니다.
         ▸ img 는 images/제목/<이름>.png. 파일이 없으면 icon 의 SVG 가 나옵니다. */
      /* 첫 칸은 **활동 이름이 그대로** 제목이 됩니다 (`자전거 타기`).
         그러니 그 활동의 그림을 그대로 보여 줍니다 — 학생이 무엇을 고르는지
         한눈에 압니다. 팻말 같은 다른 그림을 두면 오히려 무엇을 뜻하는지
         한 번 더 생각해야 합니다. */
      var out = [{ name: act ? act.name : '나의 여가', act: act, icon: 'paper' }];
      /* ⚠ `가족와 함께한` 처럼 나오던 것을 고쳤습니다.
           받침에 따라 `과/와` 가 달라지므로 App.waGwa 를 씁니다 (가족과 · 친구와).
         ⚠ 혼자 한 날은 `혼자와 함께한` 이 되어 말이 되지 않았습니다.
           혼자일 때는 `혼자 한 ○○` 로 바꿉니다. */
      /* 사람 칸도 **실제로 고른 사람 그림**을 씁니다 (아빠면 아빠, 혼자면 혼자).
         ⚠ 예전에는 누구를 골랐든 `함께한.png`(손 잡은 두 아이)를 붙였습니다.
           그래서 `혼자 한 요가` 에 두 아이가 나왔습니다 — 글은 고쳤는데
           그림이 그대로여서 말과 그림이 어긋났습니다. */
      var whoP = App.partner(draft.partnerId);
      if (whoP && whoP.name !== who) whoP = null;   // 손수 고쳐 쓴 이름이면 그림을 못 찾습니다
      if (who === '혼자') {
        out.push({ name: '혼자 한 ' + short, partner: whoP, img: '함께한', icon: 'pAlone' });
      } else if (who) {
        out.push({ name: App.waGwa(who) + ' 함께한 ' + short,
                   partner: whoP, img: '함께한', icon: 'pFriend' });
      }
      if (mood) out.push({ name: (mood.pre || mood.name) + ' ' + short, mood: mood, icon: mood.icon });
      out.push({ name: '처음 해 본 ' + short, img: '처음 해 본', icon: 'avSprout' });
      var seen = {}, uniq = [];
      out.forEach(function (o) { if (!seen[o.name]) { seen[o.name] = 1; uniq.push(o); } });
      return uniq.slice(0, 4);
    }

    /* 제목 고르기 — 그림일기 맨 위에 들어갑니다 */
    function titleStep() {
      var f = frames();
      return html`<${React.Fragment}>
        <div class="frame-line"><b>제목 :</b>
          <span class=${'blank wide' + (draft.title ? ' on' : '')}>${draft.title || '　　　　'}</span>
        </div>
        <${C.Question} bar=${true} note=${lvNote} speakText="일기 제목을 골라요. 그림일기 맨 위에 들어가요.">일기 제목을 골라요<//>
        <${C.PickGrid} cols=${6}>
          ${titleWords(f).map(function (w) {
            var on = draft.title === w.name;
            return html`<${C.Pick} key=${w.name} selected=${on} label=${w.name} speakText=${w.name}
              onClick=${function () { patch({ title: w.name }); App.speakFor(student, w.name); }}
              art=${w.act
                ? html`<${C.ActivityArt} activity=${w.act} />`
                : w.partner
                ? html`<span class="bust"><${C.PartnerArt} partner=${w.partner} student=${student} /></span>`
                : w.mood
                ? html`<${C.MoodArt} mood=${w.mood} />`
                : html`<${C.Art} src=${App.pickImage('title', w.img)} iconKey=${w.icon} />`} />`;
          })}
          <div class="pick" style=${{ cursor: 'default' }}>
            <span class="thumb">
              <${C.Art} src=${App.pickImage('title', '직접 쓰기')} iconKey="pencil" /></span>
            <span class="label">직접 쓰기</span>
            <input class="field" value=${draft.title || ''} placeholder="제목을 써 보아요"
              onChange=${function (e) { patch({ title: e.target.value }); }} />
          </div>
        <//>
      <//>`;
    }

    function level2Body(step) {
      var f = frames();
      /* 앞 여섯은 세 단계 공통 뼈대 (언제 · 누구와 · 어디에서 · 무엇을 · 기분 · 또 하고 싶나).
         예전에는 2단계가 누구와 · 기분만 물어서 날짜 · 장소가 통째로 빠져 있었습니다. */
      if (step < BONE.length) return boneBody(step);
      /* ★ 뒤 단계도 **이름으로** 가릅니다 (예전에는 `step -= 4` 로 번호를 옮겨 썼습니다). */
      var key = L2[step];
      if (key === '기억') {
        return html`<${React.Fragment}>
          <!-- 만들어지는 문장은 흰 칸 맨 위 두 줄(frameBar)에 있습니다.
               여기에 또 두면 같은 말이 두 번 나옵니다. -->
          <${C.Question} bar=${true} note=${lvNote} speakText="가장 기억에 남는 것은 무엇인가요?">가장 기억에 남는 것은 무엇인가요?<//>
          ${wordCards(F3_WORDS, 'f3', f.f3, 4)}
        <//>`;
      }
      if (key === '다음에') {
        return html`<${React.Fragment}>
          <!-- 위와 같은 까닭으로 낱개 문장 줄을 뺐습니다 -->
          <${C.Question} bar=${true} note=${lvNote} speakText="다음에는 어떻게 하고 싶나요?">다음에는 어떻게 하고 싶나요?<//>
          ${wordCards(F4_WORDS, 'f4', f.f4, 4)}
        <//>`;
      }
      if (key === '제목') return titleStep();
      if (key === '또 하고 싶나') return againBody();
      if (key === '그림') return picStep();

      /* 완성 — 1단계와 같은 화면을 씁니다 (완성된 그림일기를 함께 보여 줍니다)
         ★ 문장 사이는 **한 칸 띄우기**입니다 (예전에는 줄바꿈).
           일기는 문장이 끝나도 줄을 바꾸지 않고 이어 쓰고, 원고지에서도
           줄바꿈은 **새 문단**을 뜻해 줄마다 첫 칸이 비어 버립니다.
           1단계(diaryMade)와 같은 규칙이라야 두 단계가 어긋나지 않습니다. */
      return confirmStep(App.sentences.diaryFramesLines(Object.assign({}, draft, { frames: f })).join(' '));
    }


    /* 기분 · 또 하고 싶은지 (2·3단계 공통) */
    function moodAndAgain() {
      return html`<${React.Fragment}>
        <${C.Sec} title="오늘의 기분" speakText="오늘의 기분">
          <${C.PickGrid} cols=${4}>
            ${moods.map(function (m) {
              var on = draft.moodIds.indexOf(m.id) >= 0;
              return html`<${C.Pick} key=${m.id} selected=${on} label=${m.name} speakText=${m.name}
                onClick=${function () {
                  patch({ moodIds: on ? draft.moodIds.filter(function (x) { return x !== m.id; })
                                      : draft.moodIds.concat([m.id]) });
                }} art=${html`<${C.MoodArt} mood=${m} />`} />`;
            })}
          <//>
        <//>
        <${C.Sec} title="또 하고 싶은 활동인가요?" speakText="또 하고 싶은 활동인가요?">
          <${C.PickGrid} cols=${3}>
            ${App.DATA.agains.map(function (g) {
              return html`<${C.Pick} key=${g.id} selected=${draft.againId === g.id} label=${g.name}
                speakText=${g.name} onClick=${function () { patch({ againId: g.id }); }}
                art=${html`<${C.Art} src=${App.againImage(g)} iconKey=${g.icon} />`} />`;
            })}
          <//>
        <//>
      <//>`;
    }

    /* --------------------- 3단계 --------------------- */
    /* ★ 3단계도 **한 단계에 한 가지**씩 묻습니다.
         예전에는 이 모든 것을 한 장에 담아서, 낮은 화면에서 **5쪽으로 갈라졌고**
         가장 중요한 글쓰기가 뒷쪽으로 밀려 1쪽에는 제목·그림만 보였습니다.
         (규칙 1 : 한 화면에 주요 질문 하나 · 규칙 10-1 : 한 쪽에 들어가야 함) */
    var L3 = BONE.concat(['일기 쓰기', '제목', '또 하고 싶나', '그림', '완성']);

    /* ★ 3단계 첫 단계는 **육하원칙 뼈대**입니다.
         빈 칸에 바로 긴 글을 쓰라고 하면 3단계 학생도 막막해집니다.
         한 줄씩 짧게 답해 뼈대를 만들고, 그 뼈대를 글쓰기 칸으로 옮겨
         살을 붙이게 합니다. 뼈대는 지워지지 않고 남아서 다시 볼 수 있습니다. */
    var SIX = [
      { k: 'when',  q: '언제 있었던 일인가요?',   ph: '예) 어제 학교 끝나고' },
      { k: 'who',   q: '누구와 함께했나요?',      ph: '예) 친구 민수와' },
      { k: 'where', q: '어디에 갔나요?',          ph: '예) 학교 놀이터에서' },
      { k: 'what',  q: '무엇을 했나요?',          ph: '예) 그네를 타고 술래잡기를 했다' },
      { k: 'how',   q: '어떤 기분이 들었나요?',   ph: '예) 아주 신나고 재미있었다' },
      { k: 'why',   q: '왜 그렇게 느꼈나요?',     ph: '예) 친구와 오래 놀 수 있어서' }
    ];
    function sixOf() { return draft.six || {}; }
    function sixLines() {
      var s = sixOf();
      return SIX.map(function (x) { return (s[x.k] || '').trim(); })
                .filter(function (t) { return t; });
    }

    function level3Body(step) {
      /* 앞 여섯은 세 단계 공통 뼈대. 3단계는 그 각 단계에서 그림도 고르고
         **한 줄씩 글도** 씁니다 (boneWrite). 그 여섯 줄이 일기의 뼈대입니다.
         ★ 예전에는 뼈대 여섯 칸을 한 화면에 몰아 넣어 스크롤이 생겼고,
           장소를 19곳에서 고르는 길도 없었습니다. */
      if (step < BONE.length) return boneBody(step);
      /* ★ 뒤 단계도 **이름으로** 가릅니다 (예전에는 번호 표 `L3_OLD` 로 옮겨 썼습니다). */
      var key = L3[step];
      if (key === '제목') {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} note=${lvNote} speakText="일기 제목을 써요">일기 제목을 써요<//>
          <div class="row">
            <div class="grow"><${C.Field} label="일기 제목" value=${draft.title}
              placeholder="예) 친구와 슬라임 놀이" onChange=${function (v) { patch({ title: v }); }} /></div>
            <div style=${{ width: '13rem' }}><${C.Field} label="날짜" type="date" value=${draft.date}
              onChange=${function (v) { patch({ date: v || App.todayKey() }); }} /></div>
          </div>
          ${weatherPicker()}
        <//>`;
      }
      if (key === '또 하고 싶나') return againBody();
      if (key === '그림') return picStep();
      if (key === '완성') return confirmStep(draft.text || '');

      /* 일기 쓰기 (뼈대에 살을 붙이는 단계입니다) */
      var bones = sixLines();
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} note=${lvNote} speakText="오늘의 여가 일기를 써요">오늘의 여가 일기를 써요<//>
        ${bones.length ? html`<div class="bones">
          <span class="bones-lab">내가 만든 뼈대</span>
          <span class="bones-txt">${bones.join(' ')}</span>
          <${C.Btn} size="small" className="pastel-blue" icon="plus"
            onClick=${function () {
              var add = bones.join(' ');
              patch({ text: draft.text ? draft.text + '\n' + add : add });
            }}>글쓰기 칸에 넣기<//>
        </div>` : null}
        <${C.Sec}>
          <div class="row" style=${{ marginBottom: '.3rem' }}>
            <span class="lab grow">오늘 있었던 일을 써 보아요</span>
            <${C.Btn} size="small" icon="book" onClick=${function () { helpS[1](true); }}>문장 도움 보기<//>
          </div>

          <!-- 3단계는 쓰는 방법을 고릅니다 : 키보드 · 손글씨 · 종이 -->
          <div class="wrap" style=${{ marginBottom: '.5rem' }}>
            ${WRITE_WAYS.map(function (wy) {
              var on = (draft.writeWay || 'key') === wy.id;
              return html`<button key=${wy.id} type="button" class=${'tab' + (on ? ' on' : '')}
                aria-pressed=${on ? 'true' : 'false'} title=${wy.desc}
                onClick=${function () { patch({ writeWay: wy.id }); }}>${wy.name}<//>`;
            })}
          </div>

          ${(draft.writeWay || 'key') === 'key' && html`<${React.Fragment}>
            <${C.Area} rows=${6} value=${draft.text}
              placeholder="예) 오늘 나는 친구와 슬라임 놀이를 했어요. 말랑말랑해서 재미있었어요."
              onChange=${function (v) { patch({ text: v }); }} />
            <div class="wrap" style=${{ marginTop: '.45rem' }}>
              <${C.Speak} text=${draft.text} label="내가 쓴 글 들어보기" />
            </div>
          <//>`}

          ${(draft.writeWay || 'key') === 'hand' && html`<div class="stack">
            ${draft.writePhotoId
              ? html`<${React.Fragment}>
                  <img class="hw-shot" src=${App.photos.url(draft.writePhotoId)} alt="손으로 쓴 일기" />
                  <div class="wrap">
                    <${C.Btn} size="small" icon="pencil" className="pastel-blue"
                      onClick=${function () { writeS[1](true); }}>이어서 쓰기<//>
                    <${C.Btn} size="small" icon="trash" onClick=${function () {
                      var old = draft.writePhotoId;
                      patch({ writePhotoId: null });
                      if (old) App.photos.remove(old);
                    }}>지우고 다시 쓰기<//>
                  </div>
                <//>`
              : html`<${C.Btn} kind="primary" icon="pencil"
                  onClick=${function () { writeS[1](true); }}>손글씨로 일기 쓰기<//>`}
            <p class="small muted">전자칠판·태블릿에서 손가락이나 펜으로 씁니다.
              줄이 그려진 종이에 쓰는 것처럼 나옵니다.</p>
          </div>`}

          ${(draft.writeWay || 'key') === 'paper' && html`<${C.Banner} tone="info" icon="print">
            <b>종이에 손으로 씁니다.</b>
            <div class="small" style=${{ marginTop: '.3rem' }}>
              저장한 뒤 <b>그림일기 보기 → 빈 줄</b> 로 인쇄하면
              줄만 있는 종이가 나옵니다. 거기에 직접 쓰세요.
              생각 질문도 줄 위에 함께 나옵니다.
            </div>
          <//>`}
        <//>
      <//>`;
    }

    /* --------------------- 화면 조립 --------------------- */
    var step = stepS[0];
    var steps = level === 2 ? L2 : (level === 3 ? L3 : L1);
    /* `step:'last'` 로 넣어 둔 99 를 여기서 실제 마지막 번호로 깎습니다 */
    if (stepS[0] > steps.length - 1) stepS[1](steps.length - 1);
    var lastStep = steps.length - 1;
    /* 확인(완성) 화면인가 — 이 화면만 쪽을 나누지 않고 줄여서 맞춥니다 */
    var isConfirm = (step === lastStep);
    var body, action = null, backBtn = null;

    /* ── 흰 칸 맨 위 띠 : 지금까지 만든 것 ──────────────────────────
       세 단계가 **같은 자리**에 두되, 담는 것만 다릅니다.
         1단계 : 고른 것을 **그림**으로 (아직 글을 읽기 어려운 학생)
         2단계 : 낱말로 만들어지는 **문장**
         3단계 : 한 줄씩 쓴 **뼈대 문장**
       마지막 확인 화면에는 넣지 않습니다 — 거기에는 완성된 문장과 그림일기가
       이미 다 나와서, 같은 말이 두 번 보입니다. */
    if (step < lastStep) {
      if (level === 1) {
        var pics1 = picsSoFar1(step);
        /* ★ 계획하기 1단계와 **같은 모양** : 그림 띠 + 그 아래 문장 한 줄.
             그림만 있으면 '무엇을 고르는 중인지' 는 알아도 그것들이 모여
             어떤 문장이 되는지는 안 보였습니다. 계획과 일기가 같은 모습이면
             학생이 익힐 것이 하나로 줍니다. */
        if (pics1.length) backBtn = html`<div class="plan-top" aria-live="polite">
          <div class="plan-l1">
            <span class="pic-sofar"
              aria-label=${'지금까지 고른 것 : ' + pics1.map(function (it) { return it.label; }).join(', ')}>
              ${pics1.map(function (it, i) {
                return html`<${React.Fragment} key=${it.key}>
                  ${i > 0 && html`<span class="pic-sofar-sep" aria-hidden="true">›</span>`}
                  <span class="pic-sofar-item" role="img" aria-label=${it.label}>${it.art}</span>
                <//>`;
              })}
            </span>
            <span class="plan-l1-say">${diarySoFar1(step)}</span>
          </div>
        </div>`;
      } else {
        backBtn = html`<div class="frame-top" aria-live="polite">${frameBar()}</div>`;
      }
    }

    /* ── 아래 큰 단추 ──────────────────────────────────────────────
       세 단계가 **같은 규칙**을 씁니다.
       ▸ 뼈대 단계에서는 **그림을 골라야** 넘어갑니다 (canNextBone).
         글 칸은 비어 있어도 넘어갑니다 — 여섯 칸을 다 채워야 넘어가게 하면
         한 칸에서 막힌 학생이 일기를 아예 못 끝냅니다.
       ▸ 여러 개 고르는 단계(누구와 · 기분)는 `다 골랐어요` 로 알려 줍니다.
         다만 3단계는 글도 함께 쓰므로 `다음` 으로 둡니다 (글을 더 쓰라는 뜻). */
    body = html`<${React.Fragment}>
      ${fromPlan && step === 0 && html`<${C.Banner} tone="ok" icon="cornerPlan"
        speakText="계획한 내용을 미리 넣어 두었어요.">
        <b>계획한 내용을 미리 넣어 두었어요.</b>
        <div class="small">${App.sentences.plan(fromPlan)}</div>
      <//>`}
      ${level === 1 ? level1Body(step) : (level === 2 ? level2Body(step) : level3Body(step))}
    <//>`;

    var multiStep = (level !== 3) && (step === 1 || step === 4);   // 누구와 · 기분
    /* ★ 완성 화면의 `일기 저장하기` 는 **맨 아래 띠가 아니라 왼쪽 칸 안**에
         있습니다. 오른쪽은 그림일기를 보는 자리이고, 왼쪽이 고치고 저장하는
         자리라 한 기둥으로 이어지는 것이 맞습니다.
       ▸ 그래서 아래 action 은 완성 화면에서만 비웁니다. */
    action = step === lastStep
      ? null
      : html`<${C.Btn} kind="primary" icon="next" disabled=${!canNextStep(step)}
          onClick=${function () { stepS[1](step + 1); }}>${multiStep ? '다 골랐어요' : '다음'}<//>`;

    /* 단계 표시는 길어서 제목·단추와 한 줄에 두면 서로 밀립니다 → 위쪽 줄의 아랫줄로.
       ※ 주석을 html`` 안에 쓰면 글자로 섞여 들어가 앱이 통째로 안 뜹니다. */
    /* 맨 위 줄 화살표가 하는 일 :
       · 질문을 진행하는 중이면 → 앞 질문으로
       · 첫 질문이면 → 나의 여가로 (코너 네 개가 있는 홈) */
    /* ★ 포트폴리오의 `나의 일기장` 에서 고치러 왔으면 **거기로** 돌아갑니다.
         `p.back()` 은 지나온 길을 되짚는데, 그 길에는 포트폴리오의 어느 칸을
         보고 있었는지가 없습니다. `from` 을 보고 곧장 그 칸으로 갑니다
         (그림일기 화면이 쓰는 방법과 같습니다 — picdiary 의 goBack). */
    function diaryBack() {
      /* ★ 포트폴리오에서 왔으면 **어느 단계에 있든** 곧장 나의 일기장으로.
           화살표 자리에 「나의 일기장으로 돌아가기」 라고 적혀 있으므로,
           적힌 곳과 가는 곳이 달라서는 안 됩니다.
         ▸ 앞 질문으로 가려면 아래 단계 띠에서 그 칸을 누릅니다. */
      if (params.from === 'folio') { p.nav('portfolio', { studentId: student.id, tab: 'diary' }); return; }
      if (step > 0) { stepS[1](step - 1); return; }
      p.back('home');
    }
    var backLabel = (params.from === 'folio') ? '나의 일기장으로'
                  : (step > 0 ? '앞 질문으로' : '앞 화면으로');

    /* 단계 띠는 **일기를 처음 쓸 때** 어디쯤 왔는지 알려 주는 것입니다.
       ★ 포트폴리오에서 **다 쓴 일기를 고치러** 왔을 때에는 넣지 않습니다.
         처음부터 훑는 길이 아니라 완성 화면 한 곳에서 고치고 돌아가는
         길이라, 열두 칸이 늘어서 있으면 무엇을 하는 화면인지 흐려집니다. */
    var stepsBar = (params.from !== 'folio' && (level === 1 || (level !== 1 && draft.activityId)))
      ? html`<${C.Steps} steps=${steps} current=${step} />` : null;

    return html`<div class="app" data-corner="diary">
      <!-- ★ 포트폴리오에서 고치러 왔으면 **화살표 자리에 글자 단추**를 둡니다.
             화살표만으로는 어디로 가는지 몰라 학생이 누르지 못했습니다.
           ▸ 흰 칸 안(왼쪽 기둥)에 두었더니 기둥이 커져서 한 쪽에 맞추는
             장치가 화면을 줄였고, 그림일기가 작아졌습니다. 맨 위 줄은
             흰 칸 높이를 한 픽셀도 먹지 않습니다. -->
      <${C.TopBar} title="여가 일기"
        onBack=${diaryBack}
        backLabel=${backLabel}
        backText=${params.from === 'folio' ? '나의 일기장으로 돌아가기' : null}
        onTitle=${function () { p.nav("home"); }}
        below=${stepsBar}>
        <div class="wrap" style=${{ gap: '.25rem' }}>
          <span class="small" style=${{ fontWeight: 900 }}>일기 단계</span>
          ${App.DATA.diaryLevels.map(function (lv) {
            return html`<button key=${lv.id} type="button" class=${'tab' + (level === lv.id ? ' on' : '')}
              style=${{ minHeight: '40px', padding: '.1rem .55rem', fontSize: '.85rem' }}
              aria-pressed=${level === lv.id ? 'true' : 'false'}
              title=${lv.desc}
              onClick=${function () { patch({ level: lv.id }); stepS[1](0); }}>${lv.id}<//>`;
          })}
        </div>
        <${C.WhoChip} student=${student} />
      <//>

      <!-- ★ 확인(완성) 화면은 **쪽을 나누지 않습니다.**
             한 장으로 보여 주어야 하는 화면인데, 다단은 조금만 넘쳐도
             통째로 밀어내어 1쪽이 텅 빕니다. 나누지 않고 줄여서 맞춥니다
             (useFitOnePage). ⛔ 지우지 마세요 — 세 번 되풀이된 고장입니다. -->
      <${C.Stage} top=${backBtn} action=${action} onePage=${isConfirm} tall=${isConfirm}>${body}<//>

      ${helpS[0] && html`<${C.Modal} title="문장 도움 보기" onClose=${function () { helpS[1](false); }}
        actions=${html`<${C.Btn} onClick=${function () { helpS[1](false); }}>닫기<//>`}>
        <p class="small muted">아래 문장을 참고해서 내 이야기로 바꾸어 써 보아요. 누르면 글에 넣어져요.</p>
        <div class="stack" style=${{ marginTop: '.5rem' }}>
          ${App.DATA.writingHelp.map(function (s, i) {
            return html`<button key=${i} type="button" class="btn wide" style=${{ justifyContent: 'flex-start' }}
              onClick=${function () { patch({ text: (draft.text ? draft.text + '\n' : '') + s }); }}>${s}<//>`;
          })}
        </div>
      <//>`}

      <!-- ★ 바꾸기 창을 **네 쪽**으로 나눴습니다.
             예전에는 날짜 · 날씨 · 사람 · 장소 · 활동을 한 창에 다 넣어서
             스크롤이 생기고, 칸 크기도 들쑥날쑥했습니다.
           ▸ 쪽마다 **뼈대 화면을 그대로** 씁니다 (boneBody). 그래서 고르는
             모습이 처음 고를 때와 똑같고, 크기도 저절로 같아집니다.
           ▸ 앞뒤 화살표로 오갑니다. -->
      ${editMetaS[0] !== false && editMetaS[0] !== null && html`<${C.Modal}
        title=${'바꾸기 — ' + META_TABS[metaPage()].name} wide=${true}
        onClose=${function () { editMetaS[1](false); }}
        actions=${html`<${React.Fragment}>
          <${C.Btn} icon="back" disabled=${metaPage() === 0}
            onClick=${function () { editMetaS[1](metaPage() - 1); }}>앞으로<//>
          <span class="chip">${metaPage() + 1} / ${META_TABS.length}</span>
          <${C.Btn} icon="next" disabled=${metaPage() >= META_TABS.length - 1}
            onClick=${function () { editMetaS[1](metaPage() + 1); }}>뒤로<//>
          <${C.Btn} kind="ok" icon="check"
            onClick=${function () { editMetaS[1](false); }}>다 바꿨어요<//>
        <//>`}>
        <div class="meta-tabs">
          ${META_TABS.map(function (t, i) {
            var on = metaPage() === i;
            return html`<button key=${t.name} type="button" class=${'tab' + (on ? ' on' : '')}
              aria-pressed=${on ? 'true' : 'false'}
              onClick=${function () { editMetaS[1](i); }}>${t.name}<//>`;
          })}
        </div>
        <div class="meta-page">${boneBody(META_TABS[metaPage()].bone)}</div>
      <//>`}

      <!-- 손글씨 일기 판 (3단계) — 줄공책처럼 줄이 그려진 넓은 판입니다 -->
      ${writeS[0] && html`<${C.Modal} title="손글씨로 일기를 써요" wide=${true}
        onClose=${function () { writeS[1](false); }}
        actions=${html`<${C.Btn} onClick=${function () { writeS[1](false); }}>그만두기<//>`}>
        <${C.DrawPad} w=${1400} h=${800} ruled=${true} ruleHeight=${88}
          startFrom=${draft.writePhotoId ? App.photos.url(draft.writePhotoId) : null}
          doneText="일기 다 썼어요"
          hintText="손가락·펜으로 줄에 맞춰 써요. 색과 굵기를 고를 수 있어요."
          onDone=${function (url) {
            App.photos.addDataUrl(url, student.id, 'write').then(function (id) {
              var old = draft.writePhotoId;
              patch({ writePhotoId: id, writeWay: 'hand' });
              if (old) App.photos.remove(old);
              writeS[1](false);
              App.ui.toast('손글씨 일기를 넣었어요.');
            })['catch'](function (err) {
              App.ui.toast(err && err.message ? err.message : '손글씨를 저장하지 못했어요.');
            });
          }} />
      <//>`}

      <!-- 사진 고르기 팝업 — '사진 넣기' 를 누르면 바로 열립니다 -->
      <!-- 사진이 없으면 속이 '사진 넣기' 단추 하나뿐이라 좁은 창으로,
           사진이 있으면 격자를 펼쳐야 하니 보통 폭(760px)으로 엽니다.
           예전에는 늘 wide(1100px) 라 단추 하나에 화면 폭을 다 썼습니다.
           ⛔ 이 주석 안에 백틱을 쓰면 템플릿이 끊겨 화면이 통째로 빕니다 (2-3). -->
      ${photoS[0] && html`<${C.Modal} title="그림일기에 넣을 사진을 골라요"
        narrow=${!(draft.photoIds || []).length}
        onClose=${function () { photoS[1](false); }}
        actions=${html`<${C.Btn} kind="ok" icon="check"
          onClick=${function () { photoS[1](false); }}>이 사진으로 할래요<//>`}>
        <${C.PhotoPicker} studentId=${student.id} photoIds=${draft.photoIds}
          label="사진 넣기"
          mainId=${draft.mainPhotoId && draft.photoIds.indexOf(draft.mainPhotoId) >= 0
            ? draft.mainPhotoId : (draft.photoIds[0] || null)}
          onMain=${function (id) { patch({ mainPhotoId: id }); }}
          onAdd=${function (ids) {
            patch({ photoIds: draft.photoIds.concat(ids),
                    mainPhotoId: draft.mainPhotoId || ids[0] });
          }}
          onRemove=${function (id) {
            var left = draft.photoIds.filter(function (x) { return x !== id; });
            patch({ photoIds: left,
                    mainPhotoId: draft.mainPhotoId === id ? (left[0] || null) : draft.mainPhotoId });
          }} />
      <//>`}

      <!-- 그림판. 단추는 판 안 맨 윗줄에 있어 팝업에 스크롤이 생기지 않습니다. -->
      ${drawS[0] && html`<${C.Modal} title="그림을 그려요" wide=${true}
        onClose=${function () { drawS[1](false); }}>
        <${C.DrawPad} startFrom=${reDrawS[0]
            || (draft.drawPhotoId ? App.photos.url(draft.drawPhotoId) : null)}
          onCancel=${function () { drawS[1](false); reDrawS[1](null); }}
          onDone=${function (url) {
            /* 곧바로 넣지 않고 **완성 확인 창**을 띄웁니다.
               학생이 자기 그림을 보고 '이대로 할지 / 다시 그릴지' 를 정합니다. */
            drawS[1](false); reDrawS[1](null);
            madeS[1](url);
          }} />
      <//>`}

      <!-- ★ 그림 완성 확인 — 그린 그림을 보여 주고 정하게 합니다.
           그림일기에는 한 장만 들어가므로, 여러 장 그려 고르게 하지 않고
           **한 장을 만족스럽게 완성**하는 쪽으로 만들었습니다. -->
      ${madeS[0] && html`<${C.Modal} title="그림이 완성되었어요!" wide=${true}
        speakText="그림이 완성되었어요. 이 그림으로 할까요?"
        onClose=${function () { madeS[1](null); }}
        actions=${html`<${React.Fragment}>
          <${C.Btn} kind="ok" size="big" icon="check" onClick=${function () {
            var url = madeS[0];
            App.photos.addDataUrl(url, student.id, 'draw').then(function (id) {
              var old = draft.drawPhotoId;
              patch({ drawPhotoId: id, picKind: 'draw' });
              if (old) App.photos.remove(old);
              madeS[1](null);
              App.ui.toast('그림을 넣었어요.');
            })['catch'](function (err) {
              App.ui.toast(err && err.message ? err.message : '그림을 저장하지 못했어요.');
            });
          }}>이 그림으로 할래요<//>
          <${C.Btn} className="pastel-yellow" icon="pencil" onClick=${function () {
            /* 그린 것을 그대로 안고 그림판으로 돌아갑니다 (처음부터 다시 아님) */
            reDrawS[1](madeS[0]); madeS[1](null); drawS[1](true);
          }}>다시 그릴래요<//>
        <//>`}>
        <img src=${madeS[0]} alt="내가 그린 그림" class="made-shot" />
      <//>`}

      ${afterS[0] !== null && html`<${C.DiaryAfter} student=${student} diaryId=${savedIdS[0]}
        step=${afterS[0]} onStep=${function (n) { afterS[1](n); }} nav=${p.nav} />`}
    </div>`;
  };

  /* ------------------------- 저장 후 물어보기 ------------------------- */
  C.DiaryAfter = function (p) {
    var d = App.store.diary(p.diaryId);
    /* 저장을 마친 순간에 칭찬 소리를 한 번 울립니다 */
    useEffect(function () {
      if (p.step === 0) App.cheerFor(p.student);
    }, [p.step]);
    if (!d) return null;
    var card = App.cardOf(d.activityId);
    var name = card ? card.name : '이 활동';
    var st = App.store.statusOf(p.student.id, d.cardId);

    /* ★ `좋아하나요?` `또 하거나 도전하고 싶나요?` 두 질문을 없앴습니다.
         일기 안에서 이미 `또 하고 싶나요?` 를 물었으니 같은 것을 두 번
         묻는 것이었습니다 (규칙 7). 지도 표시는 저장할 때 그 답에서
         바로 만듭니다 (위 save 참고).
         전시 질문만 남깁니다 — 이것은 일기를 쓰고 나서 정하는 새 질문입니다. */
    function setExhibit(v) {
      App.store.updateDiary(d.id, { exhibit: v });
      p.onStep(4);
    }

    /* ※ 저장 뒤 질문 창에는 `일기 고치기` 를 두지 않습니다.
         되돌아가서 처음부터 다시 고르는 것은 번거롭습니다.
         고치는 일은 **완성한 그림일기 화면**에서 한 번에 합니다. */

    if (p.step === 0) {
      var msg = '일기를 잘 기록했어요.';
      return html`<${C.Modal} title=${msg} speakText=${msg + ' ' + name + '에 해봤어요 발자국이 생겼어요.'}
        actions=${html`<${C.Btn} kind="ok" size="big" icon="next" onClick=${function () { p.onStep(1); }}>다음<//>`}>
        <!-- 캐릭터가 폴짝 뛰며 칭찬해 줍니다 -->
        <div class="cheer">
          <span class="cheer-face"><${C.AvatarArt} student=${p.student} /></span>
          <span class="cheer-bubble">잘했어요!</span>
          <i class="cheer-spark s1" aria-hidden="true">✦</i>
          <i class="cheer-spark s2" aria-hidden="true">✦</i>
          <i class="cheer-spark s3" aria-hidden="true">✦</i>
        </div>
        <${C.Banner} tone="ok" icon="check">
          <b style=${{ fontSize: '1.15rem' }}>${msg}</b>
          <div style=${{ marginTop: '.35rem' }}>
            <${C.StateChip} state=${App.DATA.mapStates[0]} />
            <b>${' 표시가 ' + name + '에 생겼어요.'}</b>
          </div>
        <//>
      <//>`;
    }
    if (p.step === 1) {
      /* ★ 말은 `전시` 그대로 둡니다.
           `전시` 는 학교에서 늘 쓰는 말이고, 게시판에 붙은 제 작품을 보며
           배우는 **구체적인 말**입니다. `중요` 는 눈에 보이지 않는 추상어라
           오히려 어렵습니다. 그리고 실제로 벌어지는 일이 정말로 전시입니다
           (전시판형 인쇄 · 교실 TV). 말과 일이 맞아야 합니다.
           무엇을 남에게 보일지 고르는 것도 학생이 배울 몫입니다.
         ⛔ 다만 그림은 별(★) → **책갈피**. 지도에서 별은 `도전하고 싶어요` 라
           한 모양이 두 뜻으로 보였습니다. */
      var q3 = '이 일기를 전시하고 싶어요?';
      return html`<${C.Modal} title=${q3}
          speakText=${'내가 전시하고 싶은 일기를 골라 보세요. ' + q3}>
        <p class="small muted center">전시하기로 고른 일기에는 책갈피가 붙고,
          교실에 전시해요.</p>
        <${C.PickGrid} cols=${2} label=${q3}>
          <${C.Pick} label="전시할래요" speakText="전시할래요" selected=${!!d.exhibit}
            onClick=${function () { setExhibit(true); }}
            art=${html`<${C.Art} src=${App.uiImage('exhibitYes')} iconKey="bookmark" />`} />
          <${C.Pick} label="전시하지 않을래요" speakText="전시하지 않을래요"
            onClick=${function () { setExhibit(false); }}
            art=${html`<${C.Art} src=${App.uiImage('exhibitNo')} iconKey="dash" />`} />
        <//>
      <//>`;
    }
    /* 마무리 */
    var stNow = App.store.statusOf(p.student.id, d.cardId);
    /* ★ 마지막 창에는 **다음에 할 일 하나만** 둡니다.
         예전에는 그림일기·지도·포트폴리오·일기 고치기·홈 다섯 개가 늘어서 있어
         학생이 무엇을 눌러야 할지 몰랐습니다.
         일기를 썼으면 이제 볼 것은 **완성한 그림일기**입니다.
         지도·포트폴리오·홈은 그림일기 화면에서 이어서 갈 수 있습니다. */
    return html`<${C.Modal} title="모두 마쳤어요" speakText="일기를 다 썼어요. 완성한 그림일기를 볼까요?"
      actions=${html`<${C.Btn} kind="primary" size="big" icon="book"
        onClick=${function () { p.nav('picdiary', { diaryId: d.id, from: 'diary' }); }}>완성한 그림일기 보기<//>`}>
      <${C.Banner} tone="ok" icon="check">
        <!-- 가운데로 모읍니다 — 마지막 창은 알림 한 덩어리라 가운데가 읽기 편합니다 -->
        <div style=${{ textAlign: 'center' }}>
          <b>${name + '의'}</b><span>${' 지금 표시예요.'}</span>
        </div>
        <div class="wrap" style=${{ marginTop: '.4rem', justifyContent: 'center' }}>
          <${C.StateChips} status=${stNow} /></div>
      <//>
    <//>`;
  };
})();
