/* ===========================================================
   나의 여가 — 첫 화면
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState;

  /* 오늘의 여가 계획 카드 */
  C.TodayPlanCard = function (p) {
    var plan = p.plan;
    var a = App.act(plan.activityId);
    var partner = App.partner(plan.partnerId);
    var when = App.fmtDateShort(plan.date) + (App.timeWord(plan.time) ? ' · ' + App.timeWord(plan.time) : '');
    var done = !!plan.doneDiaryId;

    /* 문장 안에 날짜·사람·활동이 모두 들어 있으므로 같은 내용을 칩으로 또 적지 않습니다. */
    return html`<div class="card" style=${{ padding: '.6rem .8rem' }}>
      <div class="row" style=${{ alignItems: 'center', flexWrap: 'nowrap', gap: '.7rem' }}>
        <div style=${{ width: 'clamp(50px,6.5vh,84px)', height: 'clamp(50px,6.5vh,84px)', flex: '0 0 auto' }}>
          <${C.ActivityArt} activity=${a} />
        </div>
        <div class="grow" style=${{ minWidth: 0 }}>
          <b class="card-say">
            ${App.sentences.plan(plan)}</b>
          ${done && html`<span class="star-badge" style=${{ marginTop: '.2rem' }}>✓ 일기까지 마쳤어요</span>`}
        </div>
        <div class="wrap" style=${{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <${C.Btn} size="small" icon="eye" onClick=${p.onView}>계획 보기<//>
          <${C.Btn} kind="primary" icon="check" onClick=${p.onDid}>
            ${done ? '일기 다시 쓰기' : '활동을 했어요'}<//>
        </div>
      </div>
    </div>`;
  };

  /* ------------------------- 오늘의 도전 -------------------------
     아직 '해봤어요' 발자국이 없는 활동 가운데 하나를 권합니다.
     날마다 같은 활동이 나오도록 날짜를 씨앗으로 골라, 하루에 하나씩만 바뀝니다.
     (누를 때마다 바뀌면 학생이 고르기 어려워집니다) */
  function challengeOf(student) {
    if (!student) return null;
    var cards = App.visibleCards(student);
    var yet = cards.filter(function (c) {
      return !App.store.statusOf(student.id, c.id).tried;
    });
    if (!yet.length) return null;
    var key = App.todayKey() + student.id;
    var n = 0;
    for (var i = 0; i < key.length; i++) n = (n * 31 + key.charCodeAt(i)) % 100000;
    return yet[n % yet.length];
  }

  C.HomeScreen = function (p) {
    App.useStore();
    var student = App.store.current();
    var viewPlan = useState(null);

    var todays = App.store.todayPlans(student && student.id);
    var challenge = challengeOf(student);
    var doneAll = student && !challenge && App.visibleCards(student).length > 0;

    function goDiaryFromPlan(plan) {
      p.nav('diary', { planId: plan.id });
    }

    return html`<div class="app" data-corner="home">
      <${C.TopBar}
        left=${html`<${C.IconBtn} uiKey="home" icon="home" label="표지로 가기"
          onClick=${function () { p.nav('cover'); }} />`}>
        <${C.Speak} text=${'나의 여가. 내가 좋아하는 여가를 찾아보아요. ' +
          App.DATA.corners.map(function (c) { return c.name + ' ' + c.guide; }).join(' ')} />
        <${C.WhoChip} student=${student} onClick=${function () { p.nav('profiles'); }}
          extra=${html`<span class="small muted">바꾸기</span>`} />
      <//>

      <${C.Stage}>
        <!-- 제목 밑 설명 한 줄을 없앴습니다.
             네 코너 그림만으로 무엇을 하는 곳인지 이미 알 수 있고,
             그만큼 코너 카드가 크게 보입니다. (읽어주기에는 그대로 남깁니다) -->
        <div class="sec home-title">
          <h1>나의 여가</h1>
        </div>

        <div class="sec">
          <div class="corner-grid">
            ${App.DATA.corners.map(function (c) {
              /* 안내 문장(c.guide)은 카드에 적지 않고 읽어주기와 화면 낭독으로만 전합니다.
                 — 카드마다 세 줄이면 첫 화면이 글자로 빽빽해지기 때문입니다. */
              return html`<button key=${c.id} type="button" class="corner" style=${{ '--c': c.color }}
                  onClick=${function () { p.nav(c.route); }}
                  aria-label=${c.name + '. ' + c.desc + '. ' + c.guide}>
                <!-- 코너 그림 : images/코너명/<큰 제목>.png (없으면 코드로 그린 SVG) -->
                <span class="art" aria-hidden="true">
                  <${C.PickArt} kind="corner" word=${c.desc} iconKey=${c.icon} />
                </span>
                <span class="txt">
                  <span class="desc">${c.desc}</span>
                  <span class="name">${c.name}</span>
                </span>
              </button>`;
            })}
          </div>
        </div>

        <!-- 오늘 세운 계획이 있을 때에만 나옵니다.
             계획 → 실행 → 일기로 이어지는 이음매라서 남겨 두었습니다.
             (‘활동을 했어요’ 를 눌러야 일기에 내용이 자동으로 채워져요) -->
        ${todays.length ? html`<${C.Sec} title="오늘의 여가 계획">
          <div class="stack">
            ${todays.map(function (pl) {
              return html`<${C.TodayPlanCard} key=${pl.id} plan=${pl}
                onView=${function () { viewPlan[1](pl); }}
                onDid=${function () { goDiaryFromPlan(pl); }} />`;
            })}
          </div>
        <//>` : null}

        <!-- 오늘의 도전 : 아직 안 해본 활동 하나를 권합니다.
             계획하GO! 로 바로 이어져서 '한 번 해볼까?' 가 계획이 됩니다. -->
        ${challenge ? html`<${C.Sec} title="오늘의 도전"
            speakText=${'오늘의 도전. ' + challenge.name + '. 아직 안 해본 활동이에요.'}>
          <div class="card challenge">
            <div class="ch-art"><${C.ActivityArt} activity=${challenge} /></div>
            <div class="grow" style=${{ minWidth: 0 }}>
              <span class="ch-tag">아직 안 해봤어요</span>
              <b class="ch-name">${challenge.name}</b>
              <span class="ch-say">${'오늘 ' + App.eulReul(App.shortName(challenge)) + ' 해 볼까요?'}</span>
            </div>
            <${C.Btn} kind="primary" icon="cornerPlan"
              onClick=${function () { p.nav('plan', { activityId: challenge.id }); }}>이거 할래요<//>
          </div>
        <//>` : (doneAll ? html`<${C.Sec} title="오늘의 도전">
          <${C.Banner} tone="ok" icon="star" speakText="모든 활동을 한 번씩 해 보았어요. 정말 대단해요.">
            <b>모든 활동을 한 번씩 해 보았어요. 정말 대단해요!</b>
          <//>
        <//>` : null)}

      <//>

      ${viewPlan[0] && html`<${C.Modal} title="나의 여가 계획표" onClose=${function () { viewPlan[1](null); }}
        speakText=${App.sentences.plan(viewPlan[0])}
        actions=${html`<${React.Fragment}>
          <${C.Btn} kind="primary" icon="check" onClick=${function () {
            var pl = viewPlan[0]; viewPlan[1](null); goDiaryFromPlan(pl);
          }}>활동을 했어요<//>
          <${C.Btn} icon="print" onClick=${function () { App.printPlan(viewPlan[0]); }}>계획 인쇄하기<//>
          <${C.Btn} onClick=${function () { viewPlan[1](null); }}>닫기<//>
        <//>`}>
        <${C.PlanSheet} plan=${viewPlan[0]} student=${student} />
      <//>`}
    </div>`;
  };
})();
