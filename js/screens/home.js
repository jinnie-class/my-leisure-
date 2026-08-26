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
        <!-- 두 단추 크기 통일 (2026-08-26 · 선생님 말씀 — small 을 뺐습니다) -->
        <div class="wrap" style=${{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <${C.Btn} icon="eye" onClick=${p.onView}>계획 보기<//>
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
    var planPage = useState(0);

    var todays = App.store.todayPlans(student && student.id);
    /* ★ `오늘의 도전` 은 **오늘 세운 계획이 없을 때에만** 보여 줍니다.
         까닭 둘 :
         · 뜻으로 — 오늘 할 일을 이미 정한 학생에게 다른 활동을 또 권하면
           방금 세운 계획과 서로 다투게 됩니다. 도전은 '오늘 뭘 하지?' 하는
           학생에게 건네는 말입니다.
         · 자리로 — 도전 칸이 180px 입니다. 계획 카드까지 다 있으면
           흰 칸을 넘겨서 홈이 두 쪽으로 갈라지고, 1쪽에 도전이 안 보입니다. */
    var challenge = todays.length ? null : challengeOf(student);
    /* ⚠ 오늘 계획 때문에 도전이 안 나오는 것과, 정말로 다 해본 것을
         가려야 합니다. 그러지 않으면 계획을 세운 날마다
         '모든 활동을 한 번씩 해 보았어요' 가 잘못 나옵니다. */
    var doneAll = student && !todays.length && !challengeOf(student)
                  && App.visibleCards(student).length > 0;

    function goDiaryFromPlan(plan) {
      p.nav('diary', { planId: plan.id });
    }

    /* 왼쪽 로고·오른쪽 홈·전체화면·설정·학생 이름표는 맨 위 줄(C.TopBar)이
       모든 화면에 똑같이 그립니다 (2026-08-26 · 인수인계 20-1). */
    return html`<div class="app" data-corner="home">
      <${C.TopBar}>
        <${C.Speak} text=${'나의 여가. 내가 좋아하는 여가를 찾아보아요. ' +
          App.DATA.corners.map(function (c) { return c.name + ' ' + c.guide; }).join(' ')} />
      <//>

      <!-- tall : 흰 칸이 화면 높이를 다 씁니다 (2026-08-26 — 아래가 비어 보여서).
           남는 자리는 아래 CSS 가 제목·코너·계획 사이에 나눕니다 (--slack). -->
      <${C.Stage} tall=${true}>
        <!-- 제목 밑 설명 한 줄을 없앴습니다.
             네 코너 그림만으로 무엇을 하는 곳인지 이미 알 수 있고,
             그만큼 코너 카드가 크게 보입니다. (읽어주기에는 그대로 남깁니다) -->
        <div class="sec home-title">
          <h1>나의 여가를 만들어볼까요?</h1>
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
             (‘활동을 했어요’ 를 눌러야 일기에 내용이 자동으로 채워져요)

             ⛔ **한 번에 두 장까지만** 보여 주고 나머지는 화살표로 넘깁니다.
                까닭 (2026-08-23 · 이은우 학생 화면) :
                계획을 여러 개 세운 날에는 이 칸이 남은 자리보다 커지는데,
                칸은 중간에 잘리지 않게 되어 있어 **통째로 2쪽으로 밀려납니다.**
                그러면 1쪽에는 코너 넷만 남고 아래가 텅 비어, 학생도 선생님도
                왜 비었는지 알 수 없었습니다. (계획이 있는 날에는 「오늘의 도전」도
                일부러 숨기므로 정말 아무것도 안 남습니다)
              ▸ 몇 장을 보일지는 **화면 높이로** 정합니다. 낮은 화면에서는
                코너 넷이 자리를 거의 다 써서 계획 칸에 남는 자리가 적습니다.
                재어 본 값 (계획 카드 한 장 = 약 122px) :
                  화면 1103px … 남는 자리 456px → 두 장(244px) 넉넉
                  화면  900px … 남는 자리 318px → 두 장, 여유 74px
                  화면  720px … 남는 자리 198px → **한 장만** (두 장이면 밀려남)
                그래서 900px 을 가릅니다. 넉넉한 쪽으로 잡은 값이니
                카드 모양을 키울 일이 있으면 여기도 함께 보세요.
              ▸ 화살표는 포트폴리오와 **같은 것**입니다 (App.flowBox). -->
        ${todays.length ? html`<${C.Sec} title="오늘의 여가 계획">
          ${(function () {
            var per = (window.innerHeight >= 900) ? 2 : 1;
            var info = App.pageOf(todays, planPage[0], per);
            var cards = info.items.map(function (pl) {
              return html`<${C.TodayPlanCard} key=${pl.id} plan=${pl}
                onView=${function () { viewPlan[1](pl); }}
                onDid=${function () { goDiaryFromPlan(pl); }} />`;
            });
            return App.flowBox(info, function (n) { planPage[1](n); },
              'stack', cards, '오늘의 여가 계획');
          })()}
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

        <!-- ⛔ **마지막 그물** — 화면이 아무 말 없이 비지 않게.
               활동이 하나도 없으면 계획·지도·일기가 모두 고를 것이 없어져
               홈이 네 코너만 남고 아래가 통째로 비어 보였습니다.
               선생님은 무엇이 잘못됐는지 알 길이 없었습니다.
             ▸ 위 두 층(선생님 설정에서 막기 · 켤 때 바로잡기)이 이미 막고 있어
               여기까지 오는 일은 없어야 합니다. 그래도 남겨 둡니다 —
               **빈 화면보다 까닭을 알려 주는 화면**이 언제나 낫습니다. -->
        ${!todays.length && !challenge && !doneAll && html`<${C.Sec} title="보여 줄 활동이 없어요">
          <${C.Banner} tone="warn" icon="question"
            speakText="보여 줄 활동이 없어요. 선생님께 말씀드려 주세요.">
            <b>이 학생에게 보여 줄 활동이 하나도 없어요.</b>
            <div class="small" style=${{ marginTop: '.3rem' }}>
              선생님 설정 → <b>9. 학생에게 보여줄 활동</b> 에서 활동을 켜 주세요.
            </div>
          <//>
        <//>`}

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
