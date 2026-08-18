/* ===========================================================
   나의 여가 — 계획하GO! (나의 여가 계획하기)
   한 화면에 한 가지 질문만 보여 주고, 활동은 6개씩 나누어 보여 줍니다.
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState;

  var PAGE_SIZE = 6;

  /* 시간대 선택지 — `아침 · 낮 · 저녁`.
     ★ 예전에는 `오전 · 오후` 였습니다. '오전' 은 학생에게 추상적이어서,
       해가 어디 있는지로 알 수 있는 말로 바꿨습니다.
       `id` 는 저장되는 값이고 `name` 은 화면에 보이는 말이며,
       그림 파일 이름도 `name` 을 그대로 씁니다 (`images/시간/낮.png`).
     ※ 예전 기록의 `am` · `pm` 은 `App.timeWord` 가 아침 · 낮으로 읽어 줍니다. */
  var TIMES = [
    { id: 'morning', name: '아침', icon: 'sun' },
    { id: 'day',     name: '낮',   icon: 'sun' },
    { id: 'evening', name: '저녁', icon: 'clock' }
  ];

  /* ------------------------- 그림 중심 계획표 ------------------------- */
  C.PlanSheet = function (p) {
    var plan = p.plan;
    var a = App.act(plan.activityId);
    /* 함께하는 사람은 **여러 명**일 수 있습니다 (`partnerIds`).
       예전 기록은 `partnerId` 하나뿐이라 그것도 함께 읽습니다. */
    var whoIds = (plan.partnerIds && plan.partnerIds.length)
      ? plan.partnerIds : (plan.partnerId ? [plan.partnerId] : []);
    var whoList = whoIds.map(App.partner).filter(Boolean);
    var student = p.student;
    /* ★ 짜임새를 바꿨습니다.
         예전에는 활동 그림이 **제목 옆 오른쪽 위에 조그맣게** 붙어 있었습니다.
         제목을 가리고, 그림이 너무 작아서 무슨 활동인지 알아보기 어려웠습니다.
         이제는 제목 → 문장(가운데) → 아래를 **표(왼쪽) + 큰 그림(오른쪽)** 으로
         나눕니다. 표 오른쪽이 비어 있던 자리에 그림이 큼직하게 들어갑니다. */
    var rows = html`<div class="rows">
      <div class="row"><span class="k">무엇을</span><b>${a ? a.name : '-'}</b></div>
      <div class="row"><span class="k">누구와</span><b>${
        whoList.length ? whoList.map(function (x) { return x.name; }).join(', ') : '-'}</b></div>
      <div class="row"><span class="k">언제</span><b>${App.fmtDateLong(plan.date)}${
        App.timeWord(plan.time) ? ' ' + App.timeWord(plan.time) : ''}</b></div>
      ${plan.place ? html`<div class="row"><span class="k">어디에서</span><b>${plan.place}</b></div>` : null}
      ${(plan.supplies && plan.supplies.length)
        ? html`<div class="row"><span class="k">준비물</span>
            <span class="wrap">${plan.supplies.map(function (s, i) {
              return html`<span key=${i} class="chip">${s}</span>`; })}</span></div>`
        : html`<div class="row"><span class="k">준비물</span><b>준비물이 없어요</b></div>`}
      ${plan.memo ? html`<div class="row"><span class="k">메모</span><b>${plan.memo}</b></div>` : null}
    </div>`;

    return html`<div class="sheet">
      <div class="sheet-title">오늘의 여가 계획표</div>
      <div class="sentence sentence-center" style=${{ marginTop: '.6rem' }}>
        ${App.sentences.plan(plan)}</div>
      <div class="sheet-body">
        ${rows}
        <div class="sheet-art"><${C.ActivityArt} activity=${a} /></div>
      </div>
    </div>`;
  };

  /* ------------------------- 계획 만들기 ------------------------- */
  C.PlanScreen = function (p) {
    App.useStore();
    var student = App.store.current();
    var editingId = p.params && p.params.planId;
    var existing = editingId ? App.store.plan(editingId) : null;

    /* 홈의 '오늘의 도전' 에서 활동을 안고 들어올 수 있습니다 */
    var fromChallenge = (!existing && p.params && p.params.activityId)
      ? App.act(p.params.activityId) : null;

    var init = existing || {
      level: (student && student.planLevel) || 'easy',
      area: fromChallenge ? fromChallenge.area : null,
      cardId: fromChallenge ? App.cardIdOf(fromChallenge.id) : null,
      activityId: fromChallenge ? fromChallenge.id : null,
      partnerId: null,
      date: App.todayKey(), time: '',
      place: fromChallenge ? (fromChallenge.defaultPlace || '') : '',
      supplies: fromChallenge ? (fromChallenge.defaultSupplies || []).slice() : [],
      memo: ''
    };
    var dr = useState(Object.assign({}, init));
    var draft = dr[0], setDraft = dr[1];
    var extraS = useState(false);      // '여기 없는 준비물' 팝업
    var memoS = useState(false);       // '메모' 팝업
    /* 도전 활동을 안고 왔으면 '누구와' 부터 물어봅니다 (실내·실외와 활동은 이미 정해졌어요) */
    var stepS = useState(fromChallenge ? 2 : 0);
    var step = stepS[0], setStep = stepS[1];
    var pageS = useState(0);
    var placePageS = useState(0);      // 장소는 19곳이라 쪽을 나눕니다
    var savedS = useState(null);

    function patch(o) { setDraft(Object.assign({}, draft, o)); }

    var detail = draft.level === 'detail';
    var KEYS = detail
      ? ['area', 'what', 'who', 'when', 'time', 'place', 'supplies', 'confirm']
      : ['area', 'what', 'who', 'when', 'confirm'];
    var key = KEYS[step];

    /* ★ 예전에는 고르면 0.45초 뒤에 **저절로 다음 질문으로 넘어갔습니다.**
         고른 것을 확인할 틈이 없고, 잘못 고르면 이미 다음 화면이라 당황합니다.
         이제는 **고르기와 넘어가기를 나눕니다** — 골라서 확인하고,
         아래 `다음` 을 눌렀을 때에만 넘어갑니다.
         모든 질문이 똑같은 방식이라 학생이 규칙을 하나만 익히면 됩니다. */
    function pick(fn) { fn(); }

    /* 하위 활동 선택 화면 */
    var subS = useState(null);
    var subCard = subS[0];
    /* 학급 특성에 맞는 활동을 그 자리에서 바로 더합니다
       (선생님 설정 → 학생 화면에 도구 보이기 에서 끌 수 있습니다) */
    var addS = useState(false);
    var canAdd = !student || student.addTools !== false;

    var cards = App.visibleCards(student, draft.area);
    var pageCount = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
    var page = Math.min(pageS[0], pageCount - 1);
    var pageCards = cards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    function chooseCard(card) {
      var kids = App.visibleChildren(student, card);
      if (kids.length) { subS[1](card); App.speakFor(student, card.speechName); return; }
      pick(function () {
        patch({ cardId: card.id, activityId: card.id, place: draft.place || card.defaultPlace,
                supplies: draft.supplies.length ? draft.supplies : card.defaultSupplies.slice() });
        App.speakFor(student, card.speechName);
      });
    }
    function chooseChild(card, child) {
      pick(function () {
        patch({ cardId: card.id, activityId: child.id, place: draft.place || child.defaultPlace,
                supplies: draft.supplies.length ? draft.supplies : child.defaultSupplies.slice() });
        App.speakFor(student, child.speechName);
        subS[1](null);
      });
    }

    /* ---------- 함께하는 사람 : **여러 명**을 고를 수 있습니다 ----------
       한 사람만 고르게 할 이유가 없습니다 — 엄마와 아빠와 함께 갈 수도 있으니까요.
       `partnerIds` 에 모두 담고, 예전 기록과 맞추려고 `partnerId` 에는 첫 사람을 둡니다.
       `혼자` 는 뜻이 어긋나므로 다른 사람과 함께 고를 수 없게 합니다. */
    function who() {
      if (draft.partnerIds && draft.partnerIds.length) return draft.partnerIds;
      return draft.partnerId ? [draft.partnerId] : [];
    }
    function toggleWho(pt) {
      var cur = who().slice();
      var i = cur.indexOf(pt.id);
      if (i >= 0) cur.splice(i, 1);
      else if (pt.id === 'alone') cur = ['alone'];              // 혼자를 고르면 혼자만
      else cur = cur.filter(function (x) { return x !== 'alone'; }).concat([pt.id]);
      patch({ partnerIds: cur, partnerId: cur[0] || null });
      /* ★ 낱말 하나(`엄마`)가 아니라 짧은 문장(`엄마와 함께 할 거예요`)으로 읽습니다.
           까닭은 korean.js 의 App.partnerSpeech 주석을 보세요 — 윈도우 한국어
           목소리가 두 글자 낱말을 이상한 가락으로 읽습니다. */
      if (i < 0) App.speakFor(student, App.partnerSpeech(pt));
    }

    /* ---------- 지금까지 만들어진 한 문장 ----------
       ★ `누구와 할까요?` 를 고르다 보면 '앗, 내가 뭐 하기로 했지?' 하고
         앞에서 고른 것을 잊어버립니다. 그래서 **고를 때마다 한 문장이
         자라나는 것**을 맨 위에 보여 줍니다.
         (예전에는 활동 화면에만 `고른 활동 : 곤충 키우기` 줄이 있었는데,
          그 화면에서만 보이고 글자도 커서 자리를 많이 먹었습니다.)
       ▸ **답한 것만** 넣습니다. 아직 안 물어본 것은 넣지 않습니다 —
         날짜는 오늘로 미리 채워져 있어서, 묻기 전에 넣으면
         고르지도 않은 '오늘' 이 문장에 나옵니다.
       ▸ 활동을 고르기 전에는 빈 문자열이라 바가 아예 안 나옵니다. */
    function passed(k) { return KEYS.indexOf(k) >= 0 && step > KEYS.indexOf(k); }
    function sentenceSoFar() {
      var a = App.act(draft.activityId);
      if (!a) return '';
      var bits = ['나는'];
      if (passed('when')) {
        var w = App.whenPhrase(draft.date, passed('time') ? draft.time : '');
        if (w) bits.push(w);
      }
      if (passed('who')) {
        var pp = App.partnerPhrase(draft.partnerId, who());
        if (pp) bits.push(pp);
      }
      if (passed('place') && draft.place) bits.push(draft.place + '에서');
      bits.push(a.planText || (a.name + '을 할 거예요'));
      return bits.join(' ') + (key === 'confirm' ? '.' : ' …');
    }

    function canNext() {
      if (key === 'area') return !!draft.area;
      if (key === 'what') return !!draft.activityId;
      if (key === 'who') return who().length > 0;
      if (key === 'when') return !!draft.date;
      return true;
    }
    function next() { if (step < KEYS.length - 1) setStep(step + 1); }
    function back() {
      if (subCard) { subS[1](null); return; }
      if (step > 0) setStep(step - 1); else p.nav('home');
    }

    function save() {
      var payload = {
        studentId: student.id, level: draft.level, area: draft.area,
        activityId: draft.activityId, cardId: draft.cardId,
        partnerId: draft.partnerId, partnerIds: who(), date: draft.date, time: draft.time,
        place: draft.place, supplies: draft.supplies, memo: draft.memo
      };
      var id;
      if (existing) { App.store.updatePlan(existing.id, payload); id = existing.id; }
      else { id = App.store.addPlan(payload); }
      savedS[1](id);
      App.ui.toast('계획을 저장했어요.');
      App.speakFor(student, '계획을 저장했어요. ' + App.sentences.plan(payload));
    }

    var previewPlan = Object.assign({}, draft, { studentId: student && student.id });

    /* --------------------- 각 단계 화면 --------------------- */
    function body() {
      if (savedS[0]) {
        var saved = App.store.plan(savedS[0]) || previewPlan;
        return html`<${React.Fragment}>
          <!-- ★ 아래 작은 설명 글씨를 없앴습니다. 글씨가 작아서 학생은 읽지 않고,
                 칭찬 한마디만 크게 보이는 것이 더 분명합니다. -->
          <${C.Banner} tone="ok" icon="check"
            speakText="계획을 잘 저장했어요. 활동을 마친 뒤에 홈에서 일기를 쓰면 돼요.">
            <b style=${{ fontSize: '1.2rem' }}>계획을 잘 저장했어요.</b>
          <//>
          <div style=${{ height: '.7rem' }}></div>
          <${C.PlanSheet} plan=${saved} student=${student} />
          <div class="wrap" style=${{ marginTop: '.7rem', justifyContent: 'center' }}>
            <${C.Btn} icon="home" className="pastel-yellow"
              onClick=${function () { p.nav('home'); }}>나의 여가로 돌아가기<//>
          </div>
        <//>`;
      }

      if (subCard) {
        var kids = App.visibleChildren(student, subCard);
        /* 앞 질문과 똑같은 말이면 되돌아간 것처럼 느껴집니다 — 이어지는 질문으로 씁니다. */
        var subQ = '어떤 ' + App.shortName(subCard) + '을 할까요?';
        if (subCard.id === 'cook') subQ = '어떤 요리를 할까요?';
        else if (subCard.id === 'make') subQ = '무엇을 만들까요?';
        else if (subCard.id === 'collect') subQ = '무엇을 모을까요?';
        else if (subCard.id === 'toy') subQ = '어떤 놀잇감으로 놀까요?';
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText=${subQ}>${subQ}<//>
          <${C.PickGrid} cols=${kids.length > 4 ? 6 : 4} label="세부 활동">
            ${kids.map(function (ch) {
              return html`<${C.ActivityPick} key=${ch.id} activity=${ch}
                selected=${draft.activityId === ch.id}
                onClick=${function () { chooseChild(subCard, ch); }} />`;
            })}
          <//>
          <div class="wrap" style=${{ marginTop: '.7rem' }}>
            <${C.Btn} icon="back" onClick=${function () { subS[1](null); }}>다른 활동 고르기<//>
          </div>
        <//>`;
      }

      if (key === 'area') {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="어디에서 할까요?">어디에서 할까요?<//>
          <${C.PickGrid} cols=${2} bigSpeak=${true} label="장소 종류">
            <${C.Pick} selected=${draft.area === 'indoor'} label="실내에서 해요" speakText="실내에서 해요"
              bare=${true}
              onClick=${function () { pick(function () {
                patch({ area: 'indoor' }); pageS[1](0); App.speakFor(student, '실내에서 해요'); }); }}
              art=${html`<${C.Art} src=${App.uiImage('indoor')} iconKey="door" />`} />
            <${C.Pick} selected=${draft.area === 'outdoor'} label="실외에서 해요" speakText="실외에서 해요"
              bare=${true}
              onClick=${function () { pick(function () {
                patch({ area: 'outdoor' }); pageS[1](0); App.speakFor(student, '실외에서 해요'); }); }}
              art=${html`<${C.Art} src=${App.uiImage('outdoor')} iconKey="tree" />`} />
          <//>
        <//>`;
      }

      if (key === 'what') {
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} hint=${'모두 ' + cards.length + '가지'} speakText="무엇을 할까요?">무엇을 할까요?<//>
          <${C.PickGrid} cols=${6} label="활동 목록">
            ${pageCards.map(function (c) {
              var kids = App.visibleChildren(student, c);
              return html`<${C.ActivityPick} key=${c.id} activity=${c} childCount=${kids.length}
                selected=${draft.cardId === c.id}
                onClick=${function () { chooseCard(c); }} />`;
            })}
            ${canAdd && page === pageCount - 1 &&
              html`<${C.AddActivityCard} onClick=${function () { addS[1](true); }} />`}
          <//>
          ${addS[0] && html`<${C.AddActivityModal} area=${draft.area}
            onClose=${function () { addS[1](false); }}
            onAdded=${function () { pageS[1](Math.ceil((cards.length + 1) / PAGE_SIZE) - 1); }} />`}
          <!-- ★ 쪽 넘기는 단추에서 '다음' 이라는 말을 뺐습니다.
                 아래 넘어가는 단추도 '다음' 이라, 한 화면에 '다음' 이 둘이 되어
                 학생이 어느 것을 눌러야 하는지 헷갈렸습니다.
                 여기는 '활동을 더 본다', 아래는 '이 활동으로 정하고 넘어간다' 입니다.
                 ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
          ${pageCount > 1 && html`<div class="wrap" style=${{ marginTop: '.7rem', justifyContent: 'center' }}>
            <${C.Btn} icon="back" disabled=${page === 0} onClick=${function () { pageS[1](page - 1); }}>앞 활동 보기<//>
            <span class="chip">${page + 1} / ${pageCount}</span>
            <${C.Btn} icon="next" disabled=${page >= pageCount - 1} onClick=${function () { pageS[1](page + 1); }}>활동 더 보기<//>
          </div>`}
        <//>`;
      }

      if (key === 'who') {
        var partners = App.partnersFor(student);
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="누구와 할까요? 여러 명을 골라도 돼요.">누구와 할까요?<//>
          <${C.PickGrid} cols=${7} label="함께하는 사람">
            ${partners.map(function (pt) {
              var on = who().indexOf(pt.id) >= 0;
              return html`<${C.Pick} key=${pt.id} selected=${on}
                label=${pt.name} speakText=${App.partnerSpeech(pt)} portrait=${true}
                onClick=${function () { toggleWho(pt); }}
                art=${html`<${C.PartnerArt} partner=${pt} student=${student} />`} />`;
            })}
          <//>
        <//>`;
      }

      if (key === 'when') {
        var t = App.todayKey();
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="언제 할까요?">언제 할까요?<//>
          <${C.PickGrid} cols=${3} bigSpeak=${true} label="날짜">
            <${C.Pick} selected=${draft.date === t} label="오늘" speakText="오늘"
              onClick=${function () { pick(function () { patch({ date: t }); App.speakFor(student, '오늘'); }); }}
              art=${html`<${C.PickArt} kind="when" word="오늘" iconKey="sun" />`} />
            <${C.Pick} selected=${draft.date === App.addDays(t, 1)} label="내일" speakText="내일"
              onClick=${function () { pick(function () { patch({ date: App.addDays(t, 1) }); App.speakFor(student, '내일'); }); }}
              art=${html`<${C.PickArt} kind="when" word="내일" iconKey="calendar" />`} />
            <div class="pick" style=${{ cursor: 'default' }}>
              <span class="thumb"><${C.PickArt} kind="when" word="날짜 고르기" iconKey="pencil" /></span>
              <span class="label">날짜 고르기</span>
              <input class="field" type="date" value=${draft.date}
                onChange=${function (e) { patch({ date: e.target.value || t }); }} />
              <${C.Btn} size="small" onClick=${next}>이 날짜로<//>
            </div>
          <//>
        <//>`;
      }

      if (key === 'time') {
        /* ★ `오전 / 오후` 에서 **`아침 / 낮 / 저녁`** 으로 바꿨습니다.
             '오전' 은 학생에게 추상적입니다. 해가 어디 있는지로 알 수 있는 말이
             훨씬 구체적이고, 그림으로도 분명하게 그려집니다.
             예전 기록의 `am` · `pm` 은 `App.timeWord` 가 알아서 읽어 줍니다. */
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="언제쯤 할까요?">언제쯤 할까요?<//>
          <${C.PickGrid} cols=${4} scene=${true} bigSpeak=${true} label="시간">
            ${TIMES.map(function (tm) {
              return html`<${C.Pick} key=${tm.id} selected=${draft.time === tm.id}
                label=${tm.name} speakText=${tm.name}
                onClick=${function () { pick(function () { patch({ time: tm.id }); App.speakFor(student, tm.name); }); }}
                art=${html`<${C.PickArt} kind="time" word=${tm.name} iconKey=${tm.icon} />`} />`;
            })}
            <${C.Pick} selected=${draft.time === ''} label="정하지 않아요" speakText="시간을 정하지 않아요"
              onClick=${function () { pick(function () { patch({ time: '' }); }); }}
              art=${html`<${C.PickArt} kind="time" word="정하지 않아요" iconKey="dash" />`} />
          <//>
        <//>`;
      }

      if (key === 'place') {
        /* ★ 예전에는 `교실 · 집 · 학교 · 공원 · 운동장` **다섯 곳만** 나왔습니다.
             `images/장소/` 에 그림이 19장 있는데도 14장이 화면에 못 나오고
             있었습니다. 이제 `App.DATA.places` 를 모두 씁니다.
           ▸ 그 활동에 어울리는 곳(`defaultPlace`)을 **맨 앞**에 둡니다.
           ▸ 한 쪽에 10곳씩(5칸 × 2줄) 보여 주고, 활동 고르기와 같은 방식으로
             쪽을 넘깁니다. 한꺼번에 19곳을 놓으면 흰 칸을 넘겨 갈라집니다.
           ▸ `직접 쓰기` 는 **맨 마지막 쪽**에만 붙입니다 (늘 있으면 자리를 먹습니다). */
        var act = App.act(draft.activityId);
        var places = (App.DATA.places || []).slice();
        if (act && act.defaultPlace) {
          places = [act.defaultPlace].concat(places.filter(function (s) { return s !== act.defaultPlace; }));
        }
        var PLACE_PER = 10;
        var plPages = Math.max(1, Math.ceil(places.length / PLACE_PER));
        var plPage = Math.min(placePageS[0], plPages - 1);
        var plShown = places.slice(plPage * PLACE_PER, plPage * PLACE_PER + PLACE_PER);
        var lastPage = plPage === plPages - 1;
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} speakText="어느 곳에서 할까요?">어느 곳에서 할까요?<//>
          <${C.PickGrid} cols=${5} big=${true} label="장소">
            <!-- 고르면 낱말 하나가 아니라 짧은 문장으로 읽습니다 — '집' 처럼
                 한 글자면 목소리가 이상하게 들립니다
                 (korean.js 의 App.partnerSpeech 주석을 보세요). -->
            ${plShown.map(function (s) {
              var say = s + '에서 할 거예요';
              return html`<${C.Pick} key=${s} selected=${draft.place === s} label=${s} speakText=${say}
                onClick=${function () { patch({ place: s }); App.speakFor(student, say); }}
                art=${html`<${C.PickArt} kind="place" word=${s} iconKey="map" />`} />`;
            })}
            ${lastPage && html`<div class="pick" style=${{ cursor: 'default' }}>
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

      if (key === 'supplies') {
        var chosen = draft.supplies || [];
        /* ★ 여기도 고르면 아무 소리가 나지 않았습니다.
             넣을 때와 뺄 때를 **다르게** 읽어 줍니다 — 같은 단추를 두 번 눌러
             빼는 화면이라, 넣은 것인지 뺀 것인지 소리로 알 수 있어야 합니다.
             `App.eulReul(w)` 는 낱말까지 함께 돌려줍니다 (`자석` → `자석을`). */
        function toggle(name) {
          var has = chosen.indexOf(name) >= 0;
          patch({ supplies: has ? chosen.filter(function (x) { return x !== name; }) : chosen.concat([name]) });
          App.speakFor(student, App.eulReul(name) + (has ? ' 뺐어요' : ' 챙길 거예요'));
        }
        var actS = App.act(draft.activityId);
        var base = App.DATA.supplies.slice();
        (actS ? actS.defaultSupplies : []).forEach(function (n) {
          if (!base.some(function (b) { return b.name === n; })) base.unshift({ id: 'x-' + n, name: n, icon: 'bag' });
        });
        return html`<${React.Fragment}>
          <${C.Question} bar=${true} hint="여러 개 고를 수 있어요" speakText="필요한 준비물이 있나요?">필요한 준비물이 있나요?<//>
          <!-- ★ cols-8 은 낮은 화면에서 한 줄 8칸, 950px 이상 높은 화면에서
               두 줄 4칸(카드가 커집니다)이 됩니다 — 사람·기분과 같은 방식입니다.
               예전 cols-4 는 낮은 화면에서도 두 줄(400px)이라 3쪽으로 갈라졌습니다. -->
          <${C.PickGrid} cols=${8} label="준비물">
            ${base.slice(0, 8).map(function (s) {
              return html`<${C.Pick} key=${s.id} selected=${chosen.indexOf(s.name) >= 0}
                label=${s.name} speakText=${App.eulReul(s.name) + ' 챙길 거예요'}
                onClick=${function () { toggle(s.name); }}
                art=${html`<${C.PickArt} kind="supply" word=${s.name} iconKey=${s.icon} />`} />`;
            })}
          <//>
          <!-- 단추와 '고른 준비물' 을 **한 줄 묶음**으로 둡니다.
               따로 두면 그 한 줄(85px)이 넘쳐서 2쪽이 생기고,
               2쪽에 그것만 남아 빈 쪽처럼 보였습니다. -->
          <div class="wrap" style=${{ marginTop: '.7rem' }}>
            <${C.Btn} kind=${chosen.length === 0 ? 'ok' : ''} icon="check"
              onClick=${function () { patch({ supplies: [] });
                App.speakFor(student, '준비물이 없어요'); }}>준비물이 없어요<//>
            <${C.Btn} size="small" icon="plus" className="pastel-blue"
              onClick=${function () { extraS[1](true); }}>여기 없는 준비물<//>
            <${C.Btn} size="small" icon="pencil" className="pastel-blue"
              onClick=${function () { memoS[1](true); }}>
              ${draft.memo ? '메모 고치기' : '메모 쓰기'}<//>
            ${chosen.map(function (c, i) {
              return html`<button key=${'c' + i} type="button" class="chip"
                onClick=${function () { toggle(c); }}
                aria-label=${c + ' 빼기'} title="누르면 빼요">${c} ✕</button>`;
            })}
          </div>

          <!-- ★ 직접 쓰기와 메모는 **팝업**으로 뺐습니다.
               예전에는 이 한 화면에 준비물 8칸 + 직접 쓰기 + 칩 + 메모가 다 있어서
               낮은 화면에서 2쪽으로 갈라졌고, 2쪽이 거의 빈 것처럼 보였습니다.
               (규칙 1 : 한 화면에 주요 질문 하나 · 규칙 10-1 : 선택지는 한 쪽에) -->
          ${extraS[0] && html`<${C.Modal} title="여기 없는 준비물을 적어요"
            onClose=${function () { extraS[1](false); }}
            actions=${html`<${React.Fragment}>
              <${C.Btn} kind="ok" icon="plus" onClick=${function () {
                var v = (draft._extra || '').trim();
                if (v && chosen.indexOf(v) < 0) patch({ supplies: chosen.concat([v]), _extra: '' });
                else patch({ _extra: '' });
                extraS[1](false);
              }}>준비물 넣기<//>
              <${C.Btn} onClick=${function () { extraS[1](false); }}>그만두기<//>
            <//>`}>
            <${C.Field} label="준비물 이름" value=${draft._extra || ''} placeholder="예) 색연필"
              onChange=${function (v) { patch({ _extra: v }); }} />
          <//>`}

          ${memoS[0] && html`<${C.Modal} title="활동 순서나 메모를 적어요"
            onClose=${function () { memoS[1](false); }}
            actions=${html`<${C.Btn} kind="ok" icon="check"
              onClick=${function () { memoS[1](false); }}>다 적었어요<//>`}>
            <${C.Area} label="활동 순서 또는 간단한 메모" rows=${5} value=${draft.memo}
              placeholder="예) 1. 재료 꺼내기  2. 만들기  3. 정리하기"
              onChange=${function (v) { patch({ memo: v }); }} />
          <//>`}
        <//>`;
      }

      /* 확인 */
      return html`<${React.Fragment}>
        <${C.Question} bar=${true} speakText=${'계획을 확인해요. ' + App.sentences.plan(previewPlan)}>
          계획을 확인해요
        <//>
        <${C.PlanSheet} plan=${previewPlan} student=${student} />
      <//>`;
    }

    /* --------------------- 화면 --------------------- */
    var saved = savedS[0];

    /* 흰 칸 맨 아래에 '지금 할 일' 하나만 큼직하게 놓습니다. */
    var action = null;
    if (saved) {
      /* ★ 계획을 세운 뒤에 **일기를 쓰러 가지 않습니다.**
           아직 하지도 않은 일을 일기로 쓰는 것은 앞뒤가 맞지 않습니다.
           계획표를 인쇄해서 들고 가고, 홈으로 돌아갑니다.
           활동을 마친 뒤에는 **홈의 '오늘의 여가 계획' 카드**에서
           `활동을 했어요` 를 눌러 일기로 갑니다. */
      action = html`<${C.Btn} kind="primary" icon="print"
        onClick=${function () { App.printNode(html`<${C.PlanSheet}
          plan=${App.store.plan(saved) || previewPlan} student=${student} />`); }}>
        계획표 인쇄하기<//>`;
    } else if (key === 'confirm') {
      action = html`<${C.Btn} icon="save" onClick=${save}>계획 저장하기<//>`;
    } else if (key === 'supplies') {
      action = html`<${C.Btn} icon="next" onClick=${next}>다 골랐어요<//>`;
    } else if (key === 'who') {
      /* ★ **여러 개 고르는 화면**은 `다 골랐어요`, 한 개 고르는 화면은 `다음`.
           한 명 고르고 바로 `다음` 을 누르면 '더 고를 수 있다' 는 것을 모르고
           지나갑니다. 단추 글씨가 그것을 알려 줍니다. */
      action = html`<${C.Btn} kind="primary" icon="next" disabled=${!canNext()}
        onClick=${next}>다 골랐어요<//>`;
    } else if (key === 'when' || key === 'time') {
      /* 날짜·시간대는 한 개만 고르므로 그냥 `다음` */
      action = html`<${C.Btn} kind="primary" icon="next" disabled=${!canNext()}
        onClick=${next}>다음<//>`;
    } else if (key === 'place') {
      action = html`<${C.Btn} icon="next" disabled=${!canNext()} onClick=${next}>다음<//>`;
    } else if (key === 'area' || key === 'what') {
      /* ★ 새로 넣었습니다. 예전에는 이 두 질문에만 넘어가는 단추가 없어서
           고르면 저절로 넘어갔습니다. 이제 모든 질문이 같습니다 —
           고르고 아래 단추를 눌러야 넘어갑니다.
         ★ 글씨는 둘 다 `다음` 입니다. 한 화면에 `다음` 이 하나만 있도록
           쪽 넘기는 단추는 `활동 더 보기` 로 바꿨습니다 (위를 보세요).
           하위 활동을 고르는 화면(`subCard`)에서는 내보내지 않습니다:
           그 화면은 활동을 아직 고르는 중이라 넘어갈 수 없습니다. */
      action = subCard ? null
        : html`<${C.Btn} kind="primary" icon="next" disabled=${!canNext()}
            onClick=${next}>다음<//>`;
    }

    /* '다시 고르기' 는 흰 칸 안 맨 위에 둡니다.
       홈 단추 옆에 있으면 '홈으로 나가기' 와 헷갈립니다 — 하는 일이 다릅니다.
       첫 질문에서는 돌아갈 앞 질문이 없어 아예 내보내지 않습니다
       (예전에는 '그만두기' 가 나왔는데, 홈 단추와 똑같이 홈으로 가서 없앴습니다). */
    /* 흰 칸 맨 위 한 줄 : 왼쪽 `앞 질문으로` · 오른쪽 **지금까지 만든 한 문장**.
       문장은 고를 때마다 자라나므로, 학생이 앞에서 무엇을 골랐는지
       화면을 되돌아가지 않아도 알 수 있습니다. */
    /* 계획을 확인해요 화면에는 두지 않습니다 — 바로 아래 계획표에
       똑같은 문장이 이미 크게 나와서 같은 말을 두 번 하게 됩니다. */
    var soFar = (!saved && !subCard && key !== 'confirm') ? sentenceSoFar() : '';
    var backBtn = (!saved && (step > 0 || subCard) || soFar)
      ? html`<div class="plan-top">
          ${(!saved && (step > 0 || subCard))
            ? html`<${C.IconBtn} icon="back" className="plan-back"
                label=${subCard ? '다른 활동 고르기' : '앞 질문으로'}
                onClick=${back} />`
            : html`<span></span>`}
          ${soFar && html`<span class="plan-sofar" aria-live="polite">${soFar}</span>`}
        </div>` : null;

    return html`<div class="app" data-corner="plan">
      <${C.TopBar} title="여가 계획하기"
        left=${html`<${C.IconBtn} uiKey="home" icon="home" label="홈으로 가기"
          onClick=${function () { p.nav('home'); }} />`}>
        ${!saved && html`<${C.Dots} total=${KEYS.length} current=${step} />`}
        <${C.WhoChip} student=${student} />
      <//>

      <${C.Stage} top=${backBtn} action=${action}>${body()}<//>
    </div>`;
  };
})();
