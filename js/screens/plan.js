/* ===========================================================
   나의 여가 — 계획하GO! (나의 여가 계획하기)
   한 화면에 한 가지 질문만 보여 주고, 활동은 6개씩 나누어 보여 줍니다.
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState;

  var PAGE_SIZE = 6;

  /* ------------------------- 그림 중심 계획표 ------------------------- */
  C.PlanSheet = function (p) {
    var plan = p.plan;
    var a = App.act(plan.activityId);
    var partner = App.partner(plan.partnerId);
    var student = p.student;
    return html`<div class="sheet">
      <div class="row" style=${{ alignItems: 'flex-start' }}>
        <div class="grow">
          <div class="sheet-title">오늘의 여가 계획표</div>
          <div class="sheet-meta">${student ? student.name : ''} · ${App.fmtDateLong(plan.date)}${
            App.timeWord(plan.time) ? ' · ' + App.timeWord(plan.time) : ''}</div>
        </div>
        <div style=${{ width: 'clamp(70px,10vh,120px)', height: 'clamp(70px,10vh,120px)', flex: '0 0 auto' }}>
          <${C.ActivityArt} activity=${a} />
        </div>
      </div>
      <div class="sentence" style=${{ marginTop: '.6rem' }}>${App.sentences.plan(plan)}</div>
      <div class="rows" style=${{ marginTop: '.7rem' }}>
        <div class="row"><span class="k">무엇을</span><b>${a ? a.name : '-'}</b></div>
        <div class="row"><span class="k">누구와</span><b>${partner ? partner.name : '-'}</b></div>
        <div class="row"><span class="k">언제</span><b>${App.fmtDateLong(plan.date)}${
          App.timeWord(plan.time) ? ' ' + App.timeWord(plan.time) : ''}</b></div>
        ${plan.place ? html`<div class="row"><span class="k">어디에서</span><b>${plan.place}</b></div>` : null}
        ${(plan.supplies && plan.supplies.length)
          ? html`<div class="row"><span class="k">준비물</span>
              <span class="wrap">${plan.supplies.map(function (s, i) {
                return html`<span key=${i} class="chip">${s}</span>`; })}</span></div>`
          : html`<div class="row"><span class="k">준비물</span><b>준비물이 없어요</b></div>`}
        ${plan.memo ? html`<div class="row"><span class="k">메모</span><b>${plan.memo}</b></div>` : null}
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
    /* 도전 활동을 안고 왔으면 '누구와' 부터 물어봅니다 (실내·실외와 활동은 이미 정해졌어요) */
    var stepS = useState(fromChallenge ? 2 : 0);
    var step = stepS[0], setStep = stepS[1];
    var pageS = useState(0);
    var savedS = useState(null);

    function patch(o) { setDraft(Object.assign({}, draft, o)); }

    var detail = draft.level === 'detail';
    var KEYS = detail
      ? ['area', 'what', 'who', 'when', 'time', 'place', 'supplies', 'confirm']
      : ['area', 'what', 'who', 'when', 'confirm'];
    var key = KEYS[step];

    /* 고르면 잠시 뒤 다음 질문으로 넘어갑니다.
       (시간이 지나 저절로 넘어가는 것이 아니라, 학생이 고른 결과로 넘어갑니다.
        고른 표시와 읽어주기를 확인할 만큼만 기다립니다.) */
    var goTimer = React.useRef(null);
    React.useEffect(function () {
      return function () { if (goTimer.current) clearTimeout(goTimer.current); };
    }, []);
    function pickAndGo(fn) {
      fn();
      if (goTimer.current) clearTimeout(goTimer.current);
      goTimer.current = setTimeout(function () {
        stepS[1](function (s) { return Math.min(s + 1, KEYS.length - 1); });
      }, 450);
    }

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
      pickAndGo(function () {
        patch({ cardId: card.id, activityId: card.id, place: draft.place || card.defaultPlace,
                supplies: draft.supplies.length ? draft.supplies : card.defaultSupplies.slice() });
        App.speakFor(student, card.speechName);
      });
    }
    function chooseChild(card, child) {
      pickAndGo(function () {
        patch({ cardId: card.id, activityId: child.id, place: draft.place || child.defaultPlace,
                supplies: draft.supplies.length ? draft.supplies : child.defaultSupplies.slice() });
        App.speakFor(student, child.speechName);
        subS[1](null);
      });
    }

    function canNext() {
      if (key === 'area') return !!draft.area;
      if (key === 'what') return !!draft.activityId;
      if (key === 'who') return !!draft.partnerId;
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
        partnerId: draft.partnerId, date: draft.date, time: draft.time,
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
          <${C.Banner} tone="ok" icon="check" speakText="계획을 잘 저장했어요.">
            <b style=${{ fontSize: '1.2rem' }}>계획을 잘 저장했어요.</b>
            <div class="small">홈 화면에 <b>오늘의 여가 계획</b>으로 나타나요.</div>
          <//>
          <div style=${{ height: '.7rem' }}></div>
          <${C.PlanSheet} plan=${saved} student=${student} />
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
          <${C.Question} hint="한 가지를 골라요" speakText=${subQ}>${subQ}<//>
          <${C.PickGrid} cols=${kids.length > 4 ? 3 : 2} label="세부 활동">
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
          <${C.Question} hint="한 가지를 골라요" speakText="어디에서 할까요?">어디에서 할까요?<//>
          <${C.PickGrid} cols=${2} label="장소 종류">
            <${C.Pick} selected=${draft.area === 'indoor'} label="실내에서 해요" speakText="실내에서 해요"
              bare=${true}
              onClick=${function () { pickAndGo(function () {
                patch({ area: 'indoor' }); pageS[1](0); App.speakFor(student, '실내에서 해요'); }); }}
              art=${html`<${C.Art} src=${App.uiImage('indoor')} iconKey="door" />`} />
            <${C.Pick} selected=${draft.area === 'outdoor'} label="실외에서 해요" speakText="실외에서 해요"
              bare=${true}
              onClick=${function () { pickAndGo(function () {
                patch({ area: 'outdoor' }); pageS[1](0); App.speakFor(student, '실외에서 해요'); }); }}
              art=${html`<${C.Art} src=${App.uiImage('outdoor')} iconKey="tree" />`} />
          <//>
        <//>`;
      }

      if (key === 'what') {
        return html`<${React.Fragment}>
          <${C.Question} hint=${'모두 ' + cards.length + '가지'} speakText="무엇을 할까요?">무엇을 할까요?<//>
          <${C.PickGrid} cols=${3} label="활동 목록">
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
          ${pageCount > 1 && html`<div class="wrap" style=${{ marginTop: '.7rem', justifyContent: 'center' }}>
            <${C.Btn} icon="back" disabled=${page === 0} onClick=${function () { pageS[1](page - 1); }}>앞 활동 보기<//>
            <span class="chip">${page + 1} / ${pageCount}</span>
            <${C.Btn} icon="next" disabled=${page >= pageCount - 1} onClick=${function () { pageS[1](page + 1); }}>다음 활동 보기<//>
          </div>`}
          ${draft.activityId && html`<div class="sentence" style=${{ marginTop: '.7rem' }}>
            고른 활동 : ${App.act(draft.activityId).name}
            <${C.Btn} size="small" onClick=${function () { patch({ cardId: null, activityId: null }); }}>다시 선택하기<//>
          </div>`}
        <//>`;
      }

      if (key === 'who') {
        var partners = App.partnersFor(student);
        return html`<${React.Fragment}>
          <${C.Question} hint="한 사람을 골라요" speakText="누구와 할까요?">누구와 할까요?<//>
          <${C.PickGrid} cols=${4} label="함께하는 사람">
            ${partners.map(function (pt) {
              return html`<${C.Pick} key=${pt.id} selected=${draft.partnerId === pt.id}
                label=${pt.name} speakText=${pt.name} portrait=${true}
                onClick=${function () { pickAndGo(function () {
                  patch({ partnerId: pt.id }); App.speakFor(student, pt.name); }); }}
                art=${html`<${C.PartnerArt} partner=${pt} student=${student} />`} />`;
            })}
          <//>
        <//>`;
      }

      if (key === 'when') {
        var t = App.todayKey();
        return html`<${React.Fragment}>
          <${C.Question} hint="한 가지를 골라요" speakText="언제 할까요?">언제 할까요?<//>
          <${C.PickGrid} cols=${3} label="날짜">
            <${C.Pick} selected=${draft.date === t} label="오늘" speakText="오늘"
              onClick=${function () { pickAndGo(function () { patch({ date: t }); App.speakFor(student, '오늘'); }); }}
              art=${html`<${C.Art} iconKey="sun" />`} />
            <${C.Pick} selected=${draft.date === App.addDays(t, 1)} label="내일" speakText="내일"
              onClick=${function () { pickAndGo(function () { patch({ date: App.addDays(t, 1) }); App.speakFor(student, '내일'); }); }}
              art=${html`<${C.Art} iconKey="calendar" />`} />
            <div class="pick" style=${{ cursor: 'default' }}>
              <span class="thumb"><${C.Art} iconKey="pencil" /></span>
              <span class="label">날짜 고르기</span>
              <input class="field" type="date" value=${draft.date}
                onChange=${function (e) { patch({ date: e.target.value || t }); }} />
              <${C.Btn} size="small" onClick=${next}>이 날짜로<//>
            </div>
          <//>
        <//>`;
      }

      if (key === 'time') {
        return html`<${React.Fragment}>
          <${C.Question} hint="한 가지를 골라요" speakText="몇 시에 할까요?">몇 시에 할까요?<//>
          <${C.PickGrid} cols=${3} label="시간">
            <${C.Pick} selected=${draft.time === 'am'} label="오전" speakText="오전"
              onClick=${function () { pickAndGo(function () { patch({ time: 'am' }); App.speakFor(student, '오전'); }); }}
              art=${html`<${C.Art} iconKey="sun" />`} />
            <${C.Pick} selected=${draft.time === 'pm'} label="오후" speakText="오후"
              onClick=${function () { pickAndGo(function () { patch({ time: 'pm' }); App.speakFor(student, '오후'); }); }}
              art=${html`<${C.Art} iconKey="clock" />`} />
            <${C.Pick} selected=${draft.time === ''} label="정하지 않아요" speakText="시간을 정하지 않아요"
              onClick=${function () { pickAndGo(function () { patch({ time: '' }); }); }}
              art=${html`<${C.Art} iconKey="dash" />`} />
          <//>
        <//>`;
      }

      if (key === 'place') {
        var act = App.act(draft.activityId);
        var suggests = [];
        if (act && act.defaultPlace) suggests.push(act.defaultPlace);
        ['교실', '집', '학교', '공원', '운동장'].forEach(function (s) { if (suggests.indexOf(s) < 0) suggests.push(s); });
        return html`<${React.Fragment}>
          <${C.Question} hint="한 곳을 골라요" speakText="어느 곳에서 할까요?">어느 곳에서 할까요?<//>
          <${C.PickGrid} cols=${3} label="장소">
            ${suggests.slice(0, 5).map(function (s) {
              return html`<${C.Pick} key=${s} selected=${draft.place === s} label=${s} speakText=${s}
                onClick=${function () { patch({ place: s }); }} art=${html`<${C.Art} iconKey="map" />`} />`;
            })}
            <div class="pick" style=${{ cursor: 'default' }}>
              <span class="thumb"><${C.Art} iconKey="pencil" /></span>
              <span class="label">직접 쓰기</span>
              <input class="field" value=${draft.place || ''} placeholder="예) 우리 집 거실"
                onChange=${function (e) { patch({ place: e.target.value }); }} />
            </div>
          <//>
        <//>`;
      }

      if (key === 'supplies') {
        var chosen = draft.supplies || [];
        function toggle(name) {
          var has = chosen.indexOf(name) >= 0;
          patch({ supplies: has ? chosen.filter(function (x) { return x !== name; }) : chosen.concat([name]) });
        }
        var actS = App.act(draft.activityId);
        var base = App.DATA.supplies.slice();
        (actS ? actS.defaultSupplies : []).forEach(function (n) {
          if (!base.some(function (b) { return b.name === n; })) base.unshift({ id: 'x-' + n, name: n, icon: 'bag' });
        });
        return html`<${React.Fragment}>
          <${C.Question} hint="여러 개 고를 수 있어요" speakText="필요한 준비물이 있나요?">필요한 준비물이 있나요?<//>
          <${C.PickGrid} cols=${4} label="준비물">
            ${base.slice(0, 8).map(function (s) {
              return html`<${C.Pick} key=${s.id} selected=${chosen.indexOf(s.name) >= 0}
                label=${s.name} speakText=${s.name} onClick=${function () { toggle(s.name); }}
                art=${html`<${C.Art} iconKey=${s.icon} />`} />`;
            })}
          <//>
          <div class="wrap" style=${{ marginTop: '.7rem' }}>
            <${C.Btn} kind=${chosen.length === 0 ? 'ok' : ''} icon="check"
              onClick=${function () { patch({ supplies: [] }); }}>준비물이 없어요<//>
          </div>
          <div style=${{ marginTop: '.7rem' }}>
            <${C.Field} label="준비물 직접 쓰기 (넣고 싶은 것을 적고 넣기를 눌러요)"
              value=${draft._extra || ''} placeholder="예) 색연필"
              onChange=${function (v) { patch({ _extra: v }); }} />
            <div class="wrap" style=${{ marginTop: '.4rem' }}>
              <${C.Btn} size="small" icon="plus" onClick=${function () {
                var v = (draft._extra || '').trim();
                if (!v) return;
                if (chosen.indexOf(v) < 0) patch({ supplies: chosen.concat([v]), _extra: '' });
                else patch({ _extra: '' });
              }}>준비물 넣기<//>
            </div>
          </div>
          ${chosen.length ? html`<div class="sentence" style=${{ marginTop: '.7rem' }}>
            준비물 : ${chosen.map(function (c, i) {
              return html`<button key=${i} type="button" class="chip" onClick=${function () { toggle(c); }}
                title="누르면 빼요">${c} ✕</button>`;
            })}
          </div>` : null}
          <div style=${{ marginTop: '.7rem' }}>
            <${C.Area} label="활동 순서 또는 간단한 메모" rows=${3} value=${draft.memo}
              placeholder="예) 1. 재료 꺼내기  2. 만들기  3. 정리하기"
              onChange=${function (v) { patch({ memo: v }); }} />
          </div>
        <//>`;
      }

      /* 확인 */
      return html`<${React.Fragment}>
        <${C.Question} hint="맞으면 저장해요" speakText=${'계획을 확인해요. ' + App.sentences.plan(previewPlan)}>
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
      action = html`<${C.Btn} icon="cornerDiary"
        onClick=${function () { p.nav('diary', { planId: saved }); }}>일기 쓰러 가기<//>`;
    } else if (key === 'confirm') {
      action = html`<${C.Btn} icon="save" onClick=${save}>계획 저장하기<//>`;
    } else if (key === 'supplies') {
      action = html`<${C.Btn} icon="next" onClick=${next}>다 골랐어요<//>`;
    } else if (key === 'place') {
      action = html`<${C.Btn} icon="next" disabled=${!canNext()} onClick=${next}>다음<//>`;
    }

    /* '다시 고르기' 는 흰 칸 안 맨 위에 둡니다.
       홈 단추 옆에 있으면 '홈으로 나가기' 와 헷갈립니다 — 하는 일이 다릅니다.
       첫 질문에서는 돌아갈 앞 질문이 없어 아예 내보내지 않습니다
       (예전에는 '그만두기' 가 나왔는데, 홈 단추와 똑같이 홈으로 가서 없앴습니다). */
    var backBtn = (!saved && (step > 0 || subCard))
      ? html`<${C.Btn} size="small" icon="back" className="pastel-yellow" onClick=${back}>
          ${subCard ? '다른 활동 고르기' : '앞 질문으로'}<//>` : null;

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
