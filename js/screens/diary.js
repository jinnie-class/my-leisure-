/* ===========================================================
   나의 여가 — 기록하GO! (나의 여가 일기)
   1단계 그림으로 골라 쓰기 · 2단계 문장 틀 완성하기 · 3단계 자유롭게 쓰기
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useEffect = React.useEffect;
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
        <${C.Question} bar=${true} speakText="실내에서 했나요, 실외에서 했나요?">
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
        <${C.Question} bar=${true} speakText=${'무엇을 했나요? ' + subS[0].name}>무엇을 했나요? — ${subS[0].name}<//>
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
      <${C.Question} bar=${true} speakText="무엇을 했나요?"
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
    var stepS = useState(0);
    var placePageS = useState(0);      // 장소 19곳을 6곳씩 넘겨 볼 때 쓰는 쪽 번호
    var afterS = useState(null);       // 저장 후 물어보는 순서
    var savedIdS = useState(null);
    var helpS = useState(false);
    var editMetaS = useState(false);   // 바꾸기 창 : false 면 닫힘, 숫자면 그 쪽
    var drawS = useState(false);       // 직접 그리기 판이 열려 있는지
    var photoS = useState(false);      // 사진 고르기 팝업이 열려 있는지
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
             예전에는 `L2.length` 로 굳혀 두어서, 1단계 목록이 길어지면
             마지막 단계로 못 가는 문제가 생길 자리였습니다. */
        var list = (draft.level === 2) ? L2 : L1;
        stepS[1](function (s) { return Math.min(s + 1, list.length - 1); });
      }, 450);
    }

    var level = draft.level;
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
        six: draft.six || {}
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

         언제 → 누구와 → 어디에서 → 무엇을 → 기분 → 또 하고 싶나

       ▸ 1단계 : 그림으로 고르기만
       ▸ 2단계 : 그림으로 고르고, 낱말로 문장 만들기
       ▸ 3단계 : 그림으로 고르고, 그 자리에서 **한 줄씩 글로도** 씁니다
                (그 여섯 줄이 모여 일기의 뼈대가 됩니다)

       ⛔ 뼈대 차례를 바꾸지 마세요. 세 단계와 아래 `picsSoFar1` ·
          `canNextBone` 이 모두 이 차례를 기준으로 움직입니다. */
    var BONE = ['언제', '누구와', '어디에서', '무엇을', '기분', '또 하고 싶나'];

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
          <${C.Question} bar=${true} speakText="언제 했나요?">언제 했나요?<//>
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
          <${C.Question} bar=${true} speakText="누구와 했나요? 여러 명을 골라도 돼요.">누구와 했나요?<//>
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
          <${C.Question} bar=${true} speakText="어디에서 했나요?">어디에서 했나요?<//>
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
              <span class="thumb"><${C.Art} iconKey="pencil" /></span>
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
            area=${act ? act.area : null}
            onPick=${function (id) { var a = App.act(id); patch({ activityId: id, cardId: App.cardIdOf(id),
              place: draft.place || (a ? a.defaultPlace : '') }); }} />
        <//>`;
      }

      if (step === 4) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="기분이 어땠나요? 여러 개 골라도 좋아요.">기분이 어땠나요?<//>
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

      /* 또 하고 싶나 — 여가지도의 `또 하고 싶어요` 기록으로 이어집니다 */
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} speakText="또 하고 싶나요?">또 하고 싶나요?<//>
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

      var alone = (level !== 3) && whoIds().length === 1 && whoIds()[0] === 'alone';
      var w1 = say('when', dateWord), w2 = say('who', whoWord);
      var w3 = say('where', draft.place), w4 = say('what', actWord);
      var f = (level === 2) ? frames() : {};

      return html`<${React.Fragment}>
        <div class="frame-line">
          <b>나는</b> ${blank(w1)}
          <!-- 혼자는 와 함께 를 붙이지 않습니다 (혼자와 함께 는 말이 안 됩니다).
               이미 있는 App.partnerPhrase 와 같은 규칙을 씁니다. -->
          ${blank(w2)}<b>${alone ? '' : (josaOf(w2, '과/와') + ' 함께')}</b>
          ${blank(w3)}<b>에서</b>
          ${blank(w4, true)}<b>${josaOf(w4, '을/를') + ' 했어요.'}</b>
        </div>
        <div class="frame-line">
          <b>기분이</b> ${blank(say('how', moodWord))}<b>.</b>
          ${level === 2 && html`<${React.Fragment}>
            <b>기억에 남는 것은</b> ${blank(f.f3)}<b>${josaOf(f.f3, '이에요/예요') + '.'}</b>
            <b>다음에는</b> ${blank(f.f4)}<b>하고 싶어요.</b>
          <//>`}
          ${level === 3 && html`<${React.Fragment}>
            <b>왜냐하면</b> ${blank(say('why', ''), true)}<b>.</b>
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
      if (step === 5) return !!draft.againId;
      return true;
    }

    function level1Body(step) {
      /* 뼈대 여섯 단계는 세 단계가 함께 쓰는 boneBody 가 그립니다.
         (언제 · 누구와 · 어디에서 · 무엇을 · 기분 · 또 하고 싶나) */
      if (step < BONE.length) return boneBody(step);
      /* 그림 — 사진 넣기 · 내가 그리기 (2단계와 같은 화면) */
      if (step === 6) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="그림일기에 넣을 그림을 골라요">
            그림일기에 넣을 그림을 골라요<//>
          ${photoSection(true)}
        <//>`;
      }

      /* 완성 */
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

    function confirmStep(madeText) {
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} speakText="일기가 완성되었어요">일기가 완성되었어요<//>
        <!-- 넓고 낮은 화면에서는 좌우로 나눕니다 (문장 | 완성된 그림일기).
             위아래로 쌓으면 낮은 화면에서 2쪽으로 갈라집니다. -->
        <div class="confirm-2col">
          <div class="confirm-left">
            <${C.SentenceEdit}
              made=${madeText === undefined ? App.sentences.diaryMade(draft) : madeText}
              value=${draft.bodyEdit === undefined ? null : draft.bodyEdit}
              placeholder="아직 고른 내용이 없어요. 여기에 직접 써도 돼요."
              onChange=${function (v) { patch({ bodyEdit: v }); }}
              onReset=${function () { patch({ bodyEdit: null }); }} />
            ${emptyBoneNote()}
          </div>
          <!-- 날짜·날씨·사람·장소·활동을 고치는 길은 그림일기 **왼쪽 바**로.
               위아래에 한 줄씩 두면 그만큼 그림일기가 작아집니다. -->
          <${C.DiaryPreview} draft=${draft} student=${student}
            left=${html`<${C.Btn} size="small" icon="pencil" className="pastel-blue"
              onClick=${function () { editMetaS[1](0); }}>날짜 · 사람 · 장소 바꾸기<//>`} />
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
            art=${html`<${C.Art} iconKey="camera" />`} />
          <${C.Pick} label="내가 그리기" speakText="내가 그리기"
            note="누르면 그림판이 열려요" selected=${kind === 'draw'}
            onClick=${function () { patch({ picKind: 'draw' }); drawS[1](true); }}
            art=${html`<${C.Art} iconKey="pencil" />`} />
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
    var L2 = BONE.concat(['기억', '다음에', '제목', '그림', '확인']);

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
              : html`<${C.Art} iconKey=${w.icon} />`} />`;
        })}
      <//>`;
    }

    var F3_WORDS = [
      { name: '친구와 함께한 것', icon: 'pFriend' },
      { name: '만든 작품',       icon: 'frame' },
      { name: '맛있게 먹은 것',   icon: 'food' },
      { name: '새로 해본 것',     icon: 'star' }
    ];
    var F4_WORDS = [
      { name: '또',          icon: 'next' },
      { name: '더 오래',      icon: 'clock' },
      { name: '다른 활동을',  icon: 'dice' },
      { name: '친구와 같이',  icon: 'pFriend' }
    ];

    /* 제목 후보 — 고른 내용에서 만들어 줍니다. 직접 쓸 수도 있어요. */
    function titleWords(f) {
      var short = App.shortName(act) || (act ? act.name : '여가활동');
      var who = f.f1a || '';
      var mood = App.mood((draft.moodIds || [])[0]);
      var out = [{ name: act ? act.name : '나의 여가', icon: 'star' }];
      if (who) out.push({ name: who + '와 함께한 ' + short, icon: 'pFriend' });
      if (mood) out.push({ name: (mood.pre || mood.name) + ' ' + short, mood: mood, icon: mood.icon });
      out.push({ name: '처음 해 본 ' + short, icon: 'heart' });
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
        <${C.Question} bar=${true} speakText="일기 제목을 골라요. 그림일기 맨 위에 들어가요.">일기 제목을 골라요<//>
        <${C.PickGrid} cols=${6}>
          ${titleWords(f).map(function (w) {
            var on = draft.title === w.name;
            return html`<${C.Pick} key=${w.name} selected=${on} label=${w.name} speakText=${w.name}
              onClick=${function () { patch({ title: w.name }); App.speakFor(student, w.name); }}
              art=${w.mood
                ? html`<${C.MoodArt} mood=${w.mood} />`
                : html`<${C.Art} iconKey=${w.icon} />`} />`;
          })}
          <div class="pick" style=${{ cursor: 'default' }}>
            <span class="thumb"><${C.Art} iconKey="pencil" /></span>
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
      /* 뒤 단계는 예전 번호를 그대로 씁니다 (기억 2 · 다음에 3 · 제목 4 · 그림 5 · 확인 6) */
      step -= 4;
      if (step === 2) {
        return html`<${React.Fragment}>
          <!-- 만들어지는 문장은 흰 칸 맨 위 두 줄(frameBar)에 있습니다.
               여기에 또 두면 같은 말이 두 번 나옵니다. -->
          <${C.Question} bar=${true} speakText="가장 기억에 남는 것은 무엇인가요?">가장 기억에 남는 것은 무엇인가요?<//>
          ${wordCards(F3_WORDS, 'f3', f.f3, 4)}
        <//>`;
      }
      if (step === 3) {
        return html`<${React.Fragment}>
          <!-- 위와 같은 까닭으로 낱개 문장 줄을 뺐습니다 -->
          <${C.Question} bar=${true} speakText="다음에는 어떻게 하고 싶나요?">다음에는 어떻게 하고 싶나요?<//>
          ${wordCards(F4_WORDS, 'f4', f.f4, 4)}
        <//>`;
      }
      if (step === 4) return titleStep();
      if (step === 5) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="그림일기에 넣을 그림을 골라요">
            그림일기에 넣을 그림을 골라요<//>
          ${photoSection(true)}
        <//>`;
      }

      /* 완성 — 1단계와 같은 화면을 씁니다 (완성된 그림일기를 함께 보여 줍니다) */
      return confirmStep(App.sentences.diaryFramesLines(Object.assign({}, draft, { frames: f })).join('\n'));
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
    var L3 = BONE.concat(['일기 쓰기', '제목', '그림', '완성']);

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
      /* 뒤 단계를 예전 번호로 바꿉니다 (일기 쓰기 1 · 제목 4 · 그림 5 · 완성 6) */
      var L3_OLD = { 6: 1, 7: 4, 8: 5, 9: 6 };
      step = L3_OLD[step] != null ? L3_OLD[step] : 6;
      if (step === 4) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="일기 제목을 써요">일기 제목을 써요<//>
          <div class="row">
            <div class="grow"><${C.Field} label="일기 제목" value=${draft.title}
              placeholder="예) 친구와 슬라임 놀이" onChange=${function (v) { patch({ title: v }); }} /></div>
            <div style=${{ width: '13rem' }}><${C.Field} label="날짜" type="date" value=${draft.date}
              onChange=${function (v) { patch({ date: v || App.todayKey() }); }} /></div>
          </div>
          ${weatherPicker()}
        <//>`;
      }
      if (step === 5) {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="그림일기에 넣을 그림을 골라요">
            그림일기에 넣을 그림을 골라요<//>
          ${photoSection(true)}
        <//>`;
      }
      if (step === 6) return confirmStep(draft.text || '');

      /* step 1 — 일기 쓰기 (뼈대에 살을 붙이는 단계입니다) */
      var bones = sixLines();
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} speakText="오늘의 여가 일기를 써요">오늘의 여가 일기를 써요<//>
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
    var lastStep = steps.length - 1;
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
    action = step === lastStep
      ? html`<${C.Btn} kind="ok" icon="save" onClick=${save}>일기 저장하기<//>`
      : html`<${C.Btn} kind="primary" icon="next" disabled=${!canNextBone(step)}
          onClick=${function () { stepS[1](step + 1); }}>${multiStep ? '다 골랐어요' : '다음'}<//>`;

    /* 단계 표시는 길어서 제목·단추와 한 줄에 두면 서로 밀립니다 → 위쪽 줄의 아랫줄로.
       ※ 주석을 html`` 안에 쓰면 글자로 섞여 들어가 앱이 통째로 안 뜹니다. */
    /* 맨 위 줄 화살표가 하는 일 :
       · 질문을 진행하는 중이면 → 앞 질문으로
       · 첫 질문이면 → 나의 여가로 (코너 네 개가 있는 홈) */
    function diaryBack() {
      if (step > 0) { stepS[1](step - 1); return; }
      p.back('home');
    }
    var backLabel = step > 0 ? '앞 질문으로' : '앞 화면으로';

    var stepsBar = (level === 1 || (level !== 1 && draft.activityId))
      ? html`<${C.Steps} steps=${steps} current=${step} />` : null;

    return html`<div class="app" data-corner="diary">
      <${C.TopBar} title="여가 일기"
        onBack=${diaryBack}
        backLabel=${backLabel}
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

      <${C.Stage} top=${backBtn} action=${action}>${body}<//>

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
      ${photoS[0] && html`<${C.Modal} title="그림일기에 넣을 사진을 골라요" wide=${true}
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
      var q3 = '이 일기를 전시하고 싶어요?';
      return html`<${C.Modal} title=${q3} speakText=${'내가 전시하고 싶은 활동을 골라 보세요. ' + q3}>
        <p class="small muted center">전시하기로 고른 기록에는 큰 별이 붙고, 포트폴리오에 실려요.</p>
        <${C.PickGrid} cols=${2} label=${q3}>
          <${C.Pick} label="전시할래요" speakText="전시할래요" selected=${!!d.exhibit}
            onClick=${function () { setExhibit(true); }} art=${html`<${C.Art} iconKey="star" />`} />
          <${C.Pick} label="전시하지 않을래요" speakText="전시하지 않을래요"
            onClick=${function () { setExhibit(false); }} art=${html`<${C.Art} iconKey="dash" />`} />
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
        onClick=${function () { p.nav('picdiary', { diaryId: d.id }); }}>완성한 그림일기 보기<//>`}>
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
