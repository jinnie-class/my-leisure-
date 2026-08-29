/* ===========================================================
   나의 여가 — 선생님 설정
   한 페이지에 번호 순서대로 모아 두고, 아래로 내리며 설정합니다.
   (문구마켓과 같은 방식 — 탭이나 잠금 문제 없이 바로 들어옵니다)
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;

  /* ------------------------- 전체 기록 인쇄용 ------------------------- */
  C.AllRecordsSheet = function () {
    var st = App.store.get();
    return html`<${React.Fragment}>
      ${st.students.map(function (s) {
        var diaries = App.store.diaries(s.id);
        var plans = App.store.plans(s.id);
        var map = App.store.mapOf(s.id);
        var cards = App.visibleCards(s);
        return html`<div key=${s.id} class="book-page">
          <div class="sheet-title" style=${{ fontSize: '1.4rem' }}>나의 여가 · 전체 기록 — ${s.name}</div>
          <div class="sheet-meta">일기 ${diaries.length}개 · 계획 ${plans.length}개 · 인쇄일 ${App.fmtDateLong(App.todayKey())}</div>
          <h3 style=${{ marginTop: '.6rem', fontWeight: 900 }}>여가 일기</h3>
          <table class="tbl">
            <thead><tr><th>날짜</th><th>활동</th><th>함께한 사람</th><th>기분</th><th>일기</th></tr></thead>
            <tbody>
              ${diaries.map(function (d) {
                return html`<tr key=${d.id}>
                  <td>${App.fmtDateShort(d.date)}</td>
                  <td>${(App.act(d.activityId) || {}).name || ''}</td>
                  <td>${(App.partner(d.partnerId) || {}).name || ''}</td>
                  <td>${d.moodIds.map(function (m) { return (App.mood(m) || {}).name; }).join(', ')}</td>
                  <td>${App.sentences.diaryBody(d)}</td>
                </tr>`;
              })}
              ${!diaries.length && html`<tr><td colspan="5">기록이 없어요.</td></tr>`}
            </tbody>
          </table>
          <h3 style=${{ marginTop: '.7rem', fontWeight: 900 }}>여가 계획</h3>
          <ul>${plans.map(function (pl) {
            return html`<li key=${pl.id} style=${{ padding: '2px 0' }}>· ${App.sentences.plan(pl)}</li>`;
          })}${!plans.length && html`<li>기록이 없어요.</li>`}</ul>
          <h3 style=${{ marginTop: '.7rem', fontWeight: 900 }}>여가 지도 표시</h3>
          <div class="wrap">
            ${cards.filter(function (c) { return map[c.id]; }).map(function (c) {
              var s2 = map[c.id];
              var words = App.DATA.mapStates.filter(function (m) { return s2[m.id]; })
                .map(function (m) { return m.name; }).join(' · ');
              return words ? html`<span key=${c.id} class="chip">${c.name} : ${words}</span>` : null;
            })}
          </div>
        </div>`;
      })}
    <//>`;
  };

  /* ------------------------- 한 줄짜리 고르기 ------------------------- */
  /* wide : 알약이 **한 줄로 늘어설 만큼** 넓게 (3. 일기 쓰기 수준 · 4. 계획 방식).
     셋을 나란히 놓고 견주어야 고르기 쉽습니다. */
  /* it.sub 를 주면 **두 줄**(이름 / 설명)로 나옵니다 — 3. 일기 수준 · 4. 계획 방식.
     고른 표시는 ✓ 없이 색(파란 테두리)으로만 합니다 (2026-08-26 · 선생님 말씀). */
  function Choices(p) {
    return html`<div class=${'wrap' + (p.wide ? ' tlevels' : '')}>
      ${p.items.map(function (it) {
        var on = p.value === it.id;
        return html`<button key=${it.id} type="button" class=${'tchoice' + (on ? ' on' : '')}
          aria-pressed=${on ? 'true' : 'false'}
          onClick=${function () { p.onPick(it.id); }}>${it.sub
            ? html`<span class="t-name">${it.name}</span><span class="t-sub">${it.sub}</span>`
            : it.name}</button>`;
      })}
    </div>`;
  }

  /* ------------------------- 설정 화면 ------------------------- */
  C.TeacherScreen = function (p) {
    var store = App.useStore();
    var fileRef = useRef(null);
    var markOpen = useState(null);
    var newActS = useState(null);          // '우리 반 활동 더하기' 창
    var newPartnerS = useState(false);     // '함께하는 사람 더하기' 창
    var newMoodS = useState(false);        // '기분 더하기' 창
    var recListS = useState(false);        // 11번 '기록 모두 보기' 창
    /* ★ 글씨체(나눔바른펜)가 실렸는지 (2026-08-29 · 선생님 말씀 —
         「아직 나눔바른펜이 안나와 그래서 페이지도 넘어가고」).
         파일이 5.27MB 라 **0.5초쯤 뒤에** 실립니다. 그래서 화면을 여는
         순간에 재면 늘 「안 실림」 이 나옵니다.
       ▸ 글꼴을 직접 불러 놓고, 실린 뒤에 다시 재어 보여 줍니다.
       ⛔ 그리는 도중에 바로 재지 마세요 — 늦게 오는 것을 못 봅니다. */
    var fontOkS = useState(null);          // null=살펴보는 중 · true/false
    useEffect(function () {
      var 살아있음 = true;
      function 재기() {
        try {
          var c = document.createElement('canvas').getContext('2d');
          var 글 = '나는 오늘 블록놀이를 했어요.';
          c.font = "40px 'NanumBarunpen'"; var 펜 = c.measureText(글).width;
          c.font = '40px sans-serif';      var 기본 = c.measureText(글).width;
          if (살아있음) fontOkS[1](Math.abs(펜 - 기본) > 2);
        } catch (e) { if (살아있음) fontOkS[1](false); }
      }
      if (document.fonts && document.fonts.load) {
        document.fonts.load("40px 'NanumBarunpen'", '가나다').then(재기)['catch'](재기);
      } else 재기();
      var t = setTimeout(재기, 3000);      // 그래도 안 오면 그때 값으로
      return function () { 살아있음 = false; clearTimeout(t); };
    }, []);
    var current = App.store.current();
    var students = store.students;
    var customs = store.customActivities || [];

    function upd(id, patch) { App.store.updateStudent(id, patch); }

    /* --------------- 백업 / 불러오기 --------------- */
    function download(obj, filename) {
      try {
        var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
        App.ui.toast('백업 파일을 저장했어요.');
      } catch (e) { App.ui.toast('파일을 저장하지 못했어요.'); }
    }
    function importFile(e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var data;
        try { data = JSON.parse(r.result); }
        catch (err) { App.ui.toast('읽을 수 없는 파일이에요.'); return; }
        App.ui.confirm({
          title: '자료를 불러올까요?',
          body: '지금 기록에 덧붙입니다.', okText: '덧붙여 불러오기', cancelText: '그만두기'
        }).then(function (ok) {
          if (!ok) return;
          try {
            Promise.resolve(App.store.importData(data, 'merge')).then(function () {
              App.ui.toast('자료를 불러왔어요.');
            });
          } catch (err2) { App.ui.toast(err2.message || '불러오지 못했어요.'); }
        });
      };
      r.readAsText(f);
    }

    /* --------------- 1. 우리 반 학생 --------------- */
    function studentRow(s) {
      return html`<div key=${s.id} class="stu-edit">
        <!-- ⛔ nowrap 으로 두지 마세요 (2026-08-26 · 선생님 말씀 — 「이름칸이 좀더
               폭이 있으면 좋겠어. 이름 쓰기전에 뭐라고 쓰여있는지도 안보여」).
               설정이 두 칸 배열로 바뀌면서 이 줄이 절반 폭에 들어갔는데,
               nowrap 이라 여섯 가지가 서로 밀어 **이름 칸만 끝까지 눌렸습니다.**
               「이름 또는 별명」이 한 글자도 안 보였습니다.
             ▸ 이제 자리가 모자라면 줄을 바꿉니다. 이름 칸은 아래 min-width 로
               placeholder 가 보일 만큼은 지킵니다. -->
        <div class="row" style=${{ gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" class="stu-mark" title="이름 앞 그림 바꾸기"
            aria-label=${s.name + ' 이름 앞 그림 바꾸기'}
            onClick=${function () { markOpen[1](markOpen[0] === s.id ? null : s.id); }}>${s.mark || '🌸'}</button>

          <input class="field stu-name-in" value=${s.name}
            placeholder="이름 또는 별명"
            onChange=${function (e) { upd(s.id, { name: e.target.value }); }} />

          <button type="button" class=${'tchoice sm avatar' + (s.avatarChosen ? ' done' : '')}
            style=${{ flex: '0 0 auto' }}
            aria-label=${(s.name || '이 학생') + ' 캐릭터 고르기'}
            onClick=${function () { p.nav('avatar', { studentId: s.id, from: 'teacher' }); }}>
            <!-- ★ 「캐릭터」 글자를 되살렸습니다 (2026-08-26 · 선생님 말씀 —
                   「캐릭터 창이 너무 작아 눌러서 골라야할지 모를듯」).
                 잠깐 글자를 빼고 그림만 두었더니, 고른 뒤에는 흰 네모에 작은
                 그림 하나라 **눌리는 것으로 보이지 않았습니다.**
               ⛔ 다시 글자를 빼지 마세요. 그림만으로는 「누르는 곳」임이
                  드러나지 않습니다 (그림은 뜻이지 손짓이 아닙니다). -->
            <span class="stu-av"><${C.AvatarArt} student=${s} /></span>
            <span class="stu-av-word">캐릭터</span>
          </button>

          <div class="wrap" style=${{ flex: '0 0 auto', gap: '.3rem' }}>
            <button type="button" class=${'tchoice sm' + ((s.gender || 'girl') === 'girl' ? ' on' : '')}
              aria-pressed=${(s.gender || 'girl') === 'girl'}
              onClick=${function () { upd(s.id, { gender: 'girl' }); }}>여자</button>
            <button type="button" class=${'tchoice sm' + (s.gender === 'boy' ? ' on' : '')}
              aria-pressed=${s.gender === 'boy'}
              onClick=${function () { upd(s.id, { gender: 'boy' }); }}>남자</button>
          </div>

          <button type="button" class="tchoice sm ghost" onClick=${function () {
            App.ui.confirmTwice(
              { title: '‘' + (s.name || '이 학생') + '’ 을(를) 지울까요?',
                body: '이 학생의 계획 · 일기 · 사진 · 지도 표시가 모두 지워져요.',
                okText: '지울래요', cancelText: '그만두기', tone: 'danger' },
              { title: '정말 지울까요?', body: '되돌릴 수 없어요. 먼저 백업을 받아 두세요.',
                okText: '네, 지울래요', cancelText: '그만두기', tone: 'danger' }
            ).then(function (ok) { if (ok) { App.store.removeStudent(s.id); markOpen[1](null); } });
          }}>지우기</button>
        </div>

        ${markOpen[0] === s.id && html`<div class="stu-marks">
          ${App.DATA.marks.map(function (m) {
            return html`<button key=${m} type="button"
              class=${'stu-mark-pick' + (s.mark === m ? ' on' : '')}
              onClick=${function () { upd(s.id, { mark: m }); markOpen[1](null); }}>${m}</button>`;
          })}
        </div>`}
      </div>`;
    }

    /* --------------- 지금 학생의 세부 설정 --------------- */
    function studentSettings() {
      if (!current) {
        return html`<p class="muted small">학생을 먼저 추가해 주세요.</p>`;
      }
      var hidden = current.hiddenActivityIds || [];
      /* ⛔ **활동을 전부 숨길 수는 없습니다.**
           예전에는 막는 것이 없어서, 하나씩 숨기다 보면 마지막 하나까지
           숨겨졌습니다. 그러면 계획·지도·일기가 모두 고를 것이 없어져
           홈 화면이 네 코너만 남고 **아래가 통째로 비어** 보였습니다.
           선생님은 무엇이 잘못됐는지 알 길이 없었습니다.
         ▸ 사람·기분(toggleIn)이 이미 쓰던 것과 **같은 막음**입니다. */
      function toggleAct(id) {
        var isHiding = hidden.indexOf(id) < 0;
        var next = isHiding ? hidden.concat([id])
                            : hidden.filter(function (x) { return x !== id; });
        if (isHiding && App.topCards().every(function (c) { return next.indexOf(c.id) >= 0; })) {
          App.ui.toast('적어도 하나는 남겨 두세요.');
          return;
        }
        upd(current.id, { hiddenActivityIds: next });
      }
      function toggleIn(key, all, id) {
        var cur = current[key] || all.map(function (x) { return x.id; });
        var next = cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]);
        if (!next.length) { App.ui.toast('적어도 하나는 남겨 두세요.'); return; }
        var patch = {}; patch[key] = next; upd(current.id, patch);
      }
      var pf = current.portfolio || { rangeId: 'm1' };
      var r = App.portfolioRange(current);

      return html`<${React.Fragment}>
        <div class="tsec">
          <label>2. 어느 학생의 설정인가요?</label>
          <${Choices} value=${current.id}
            items=${students.map(function (s) { return { id: s.id, name: (s.mark || '') + ' ' + (s.name || '이름 없음') }; })}
            onPick=${function (id) { App.store.setCurrent(id); }} />
          <p class="muted small">아래 3번부터는 <b>${current.name}</b> 학생에게만 적용됩니다.</p>
        </div>

        <div class="tsec">
          <label>3. 일기 쓰기 수준</label>
          <!-- 설명 줄바꿈은 선생님이 정해 주신 자리 그대로입니다 (2026-08-26) -->
          <${Choices} value=${current.diaryLevel}
            items=${App.DATA.diaryLevels.map(function (l) {
              var subs = { 1: '그림으로\n골라 쓰기', 2: '문장 틀\n완성하기', 3: '자유롭게\n쓰기' };
              return { id: l.id, name: l.name, sub: subs[l.id] || l.desc };
            })}
            wide=${true}
            onPick=${function (v) { upd(current.id, { diaryLevel: v }); }} />
          <p class="muted small">${(App.DATA.diaryLevels.filter(function (l) { return l.id === current.diaryLevel; })[0] || {}).guide || ''}</p>
        </div>

        <div class="tsec">
          <label>4. 계획 방식</label>
          <${Choices} value=${current.planLevel}
            items=${App.DATA.planLevels.map(function (l) {
              var subs = { easy: '활동 · 함께하는 사람\n날짜 · 장소',
                           detail: '시간 · 준비물\n메모까지' };
              return { id: l.id, name: l.name, sub: subs[l.id] || l.desc };
            })}
            wide=${true}
            onPick=${function (v) { upd(current.id, { planLevel: v }); }} />
        </div>

        <div class="tsec">
          <!-- inline(이름표 옆 나란히)을 풀었습니다 (2026-08-26) — 두 칸 배열이
               되면서 6번과 짝인데, 5번만 제목이 줄 가운데 있으면 어긋나 보입니다. -->
          <label>5. 음성 안내 · 사진 첨부</label>
          <div class="wrap">
            <${C.Switch} label="음성 안내" on=${current.voice !== false}
              onChange=${function (v) { upd(current.id, { voice: v }); }} />
            <${C.Switch} label="사진 첨부" on=${current.photo !== false}
              onChange=${function (v) { upd(current.id, { photo: v }); }} />
          </div>
          <!-- ★ **읽어 주는 목소리 고르기** (2026-08-29 · 선생님 말씀 —
                 「스피커로 말하는 목소리를 … 읽어주는 목소리와 동일했으면해」)
               기기에 한국어 목소리가 여럿 깔려 있으면(삼성 · 구글 · 마이크로소프트)
               예전에는 **맨 처음 찾은 것**을 그냥 써서, 같은 앱인데 태블릿과
               노트북의 목소리가 달랐습니다.
             ▸ 고른 것은 **학생이 아니라 기기**에 남습니다 — 한 태블릿을 여러
               학생이 돌려 쓰기 때문입니다.
             ▸ 목록이 비어 있으면 그 기기에 한국어 목소리가 없는 것입니다.
               (안드로이드 : 설정 → 접근성 → TTS 에서 받을 수 있습니다)
             ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
          ${(function () {
            if (!App.speech.supported || !App.speech.supported()) return null;
            var list = App.speech.voices ? App.speech.voices() : [];
            var now = App.speech.voiceName ? App.speech.voiceName() : null;
            return html`<div style=${{ marginTop: '.5rem' }}>
              <p class="muted small" style=${{ marginBottom: '.3rem' }}>
                읽어 주는 목소리 — 눌러서 골라 보세요. 누르면 바로 들려 줍니다.</p>
              <!-- ★ **기기마다 따로 고릅니다.** 한 태블릿을 여러 학생이 돌려 쓰므로
                     학생이 아니라 기기에 남깁니다. 그래서 전자칠판 · 태블릿 · 노트북
                     **셋 다** 한 번씩 골라 주셔야 목소리가 같아집니다.
                   ▸ 기기마다 깔려 있는 목소리가 다른데, 'Google' 로 시작하는 것은
                     보통 셋 다에 있습니다. 그것을 고르면 어디서나 같은 목소리입니다.
                   ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
              <p class="muted small" style=${{ marginBottom: '.4rem' }}>
                <b>이 기기에만 적용됩니다.</b> 전자칠판 · 태블릿 · 노트북에서
                <b>같은 이름</b>을 고르면 어디서나 같은 목소리가 됩니다.
                아무것도 안 고르면 <b>맨 처음 한국어 목소리</b>를 씁니다 —
                다른 앱들과 같은 방식이라 목소리가 서로 맞습니다.</p>
              ${(function () {
                var c = App.speech.voiceCount ? App.speech.voiceCount() : null;
                var now = App.speech.voiceName ? App.speech.voiceName() : null;
                if (!c) return null;
                return html`<p class="muted small" style=${{ marginBottom: '.4rem' }}>
                  이 기기의 목소리 : 전체 <b>${c.all}개</b> · 한국어 <b>${c.ko}개</b>
                  ${' · 지금 말하는 목소리 : '}<b>${now || '(없음)'}</b></p>`;
              })()}
              <div class="wrap">
                <button type="button" class=${'tchoice' + (!list.length || !now ? ' on' : '')}
                  onClick=${function () {
                    App.speech.setVoice(null);
                    App.speech.speak('안녕하세요. 나의 여가입니다.');
                    upd(current.id, {});
                  }}>저절로 고르기</button>
                ${list.map(function (v) {
                  var on = (now === v.name);
                  return html`<button key=${v.name} type="button" class=${'tchoice' + (on ? ' on' : '')}
                    aria-pressed=${on ? 'true' : 'false'}
                    onClick=${function () {
                      App.speech.setVoice(v.name);
                      App.speech.speak('안녕하세요. 나의 여가입니다.');
                      upd(current.id, {});
                    }}>${on ? '✓ ' : ''}${v.name}</button>`;
                })}
              </div>
              ${!list.length && html`<p class="muted small" style=${{ marginTop: '.3rem' }}>
                이 기기에 한국어 목소리가 없어요. 기기 설정에서 한국어 음성을 받아 주세요.</p>`}
            </div>`;
          })()}
        </div>

        <div class="tsec">
          <label>6. 학생 화면에 도구 보이기
            <span class="muted" style=${{ fontWeight: 400, fontSize: '.85em' }}>둘 다 기본은 켜짐이에요</span></label>
          <!-- ⚠ 「지도 찾아보기·확대」 스위치를 뺐습니다.
                 찾아보기와 지도 도움말은 이제 **섬 안에서 늘 보입니다**.
                 아무 일도 하지 않는 스위치를 남겨 두면 켜고 꺼도 화면이 그대로라
                 선생님이 고장인 줄 압니다. 하는 일이 없어진 스위치는 지웁니다.
               ▸ 담아 두는 값(mapTools)은 지우지 않았습니다 — 예전 기록에 남아 있어도
                 해가 없고, 지우면 되돌리기 어려워집니다. -->
          <div class="wrap">
            <${C.Switch} label="포트폴리오 기간·인쇄" on=${current.folioTools !== false}
              onChange=${function (v) { upd(current.id, { folioTools: v }); }} />
            <${C.Switch} label="활동 고르는 화면의 ＋ 활동 더하기" on=${current.addTools !== false}
              onChange=${function (v) { upd(current.id, { addTools: v }); }} />
          </div>
          <p class="muted small"><b>포트폴리오 기간·인쇄</b>는 기간을 바꾸고 전시판형·책자형으로
            인쇄하는 길이에요. 포트폴리오는 인쇄해서 붙이는 것이 목적이라 <b>켜 두는 것이 좋습니다.</b><br/>
            <b>＋ 활동 더하기</b>는 여가 계획하기 · 여가 일기 의 활동 고르는 화면에서
            바로 우리 반 활동을 더할 수 있어요.</p>
        </div>

        <div class="tsec">
          <label>7. 함께하는 사람 선택지</label>
          <div class="wrap">
            <!-- ★ 「모두」 = 한 번에 전부 켜기 (2026-08-26 · 선생님 말씀) -->
            <button type="button" class="tchoice sm" aria-label="사람 모두 켜기"
              onClick=${function () {
                upd(current.id, { partnerIds: App.DATA.partners.map(function (x) { return x.id; }) });
              }}>모두</button>
            ${App.DATA.partners.map(function (x) {
              var on = (current.partnerIds || []).indexOf(x.id) >= 0;
              return html`<button key=${x.id} type="button"
                class=${'tchoice' + (on ? ' on' : '') + (x.custom ? ' mine' : '')}
                aria-pressed=${on} onClick=${function () { toggleIn('partnerIds', App.DATA.partners, x.id); }}>
                ${x.name}</button>`;
            })}
            <!-- 학급마다 함께하는 사람이 다릅니다. 글자는 ＋ 하나만 (aria 로 뜻 전달) -->
            <button type="button" class="tchoice add" aria-label="사람 더하기" title="사람 더하기"
              onClick=${function () { newPartnerS[1](true); }}>＋</button>
          </div>
          <!-- 더한 사람은 지울 수도 있어야 합니다. 기본 일곱은 끄기만 됩니다. -->
          ${App.DATA.partners.filter(function (x) { return x.custom; }).length ? html`
            <p class="muted small" style=${{ marginTop: '.35rem' }}>
              더한 사람 지우기 —
              ${App.DATA.partners.filter(function (x) { return x.custom; }).map(function (x) {
                return html`<button key=${x.id} type="button" class="tchoice sm"
                  onClick=${function () {
                    if (!window.confirm('「' + x.name + '」 을(를) 지울까요?')) return;
                    App.store.removePartner(x.id);
                  }}>✕ ${x.name}</button>`;
              })}
            </p>` : null}
          <!-- ★ 그림 고르기는 **위에서 켠 사람만** 나옵니다.
                 형제자매가 없는 학생은 위에서 '형제자매' 를 끄는데, 예전에는
                 그래도 아래에 남녀 고르기가 남아 있었습니다. 쓰지도 않을 그림을
                 고르라고 하는 셈이라, 선생님이 껐는지 안 껐는지 헷갈립니다.
               ▸ 거르는 일은 App.partnersFor 가 이미 합니다 — 학생 화면에서도
                 같은 함수를 씁니다. 여기서 또 만들면 둘이 어긋날 수 있습니다.
               ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
          ${App.partnersFor(current).filter(function (x) { return x.variants; }).length ? html`
            <p class="tsub center">그림 고르기 (남 / 여) — 위에서 고른 사람만 나와요</p>
            <div class="wrap sexrow">
              ${App.partnersFor(current).filter(function (x) { return x.variants; }).map(function (x) {
                var cur = App.partnerVariant(x, current);
                return html`<span key=${x.id} class="sexone">
                  <b class="sexname">${x.name}</b>
                  ${x.variants.map(function (v) {
                    return html`<button key=${v.id} type="button"
                      class=${'tchoice sm' + (cur.id === v.id ? ' on' : '')}
                      onClick=${function () {
                        var m = Object.assign({}, current.partnerVariants || {}); m[x.id] = v.id;
                        upd(current.id, { partnerVariants: m });
                      }}>${v.name}</button>`;
                  })}
                </span>`;
              })}
            </div>` : null}
        </div>

        <div class="tsec">
          <label>8. 기분 선택지</label>
          <div class="wrap">
            <button type="button" class="tchoice sm" aria-label="기분 모두 켜기"
              onClick=${function () {
                upd(current.id, { moodIds: App.DATA.moods.map(function (x) { return x.id; }) });
              }}>모두</button>
            ${App.DATA.moods.map(function (x) {
              var on = (current.moodIds || []).indexOf(x.id) >= 0;
              return html`<button key=${x.id} type="button"
                class=${'tchoice' + (on ? ' on' : '') + (x.custom ? ' mine' : '')}
                aria-pressed=${on} onClick=${function () { toggleIn('moodIds', App.DATA.moods, x.id); }}>
                ${x.name}</button>`;
            })}
            <button type="button" class="tchoice add" aria-label="기분 더하기" title="기분 더하기"
              onClick=${function () { newMoodS[1](true); }}>＋</button>
          </div>
          ${App.DATA.moods.filter(function (x) { return x.custom; }).length ? html`
            <p class="muted small" style=${{ marginTop: '.35rem' }}>
              더한 기분 지우기 —
              ${App.DATA.moods.filter(function (x) { return x.custom; }).map(function (x) {
                return html`<button key=${x.id} type="button" class="tchoice sm"
                  onClick=${function () {
                    if (!window.confirm('「' + x.name + '」 을(를) 지울까요?')) return;
                    App.store.removeMood(x.id);
                  }}>✕ ${x.name}</button>`;
              })}
            </p>` : null}
        </div>

        <!-- ★ 9번을 **실내 / 실외 두 칸**으로 갈랐습니다 (2026-08-26 · 선생님 말씀).
               한 칸에 45개가 다 있으면 실내·실외 경계가 눈에 안 띄었고,
               두 칸 배열(카드 격자)과도 짝이 맞습니다. -->
        ${['indoor', 'outdoor'].map(function (area) {
          var isIn = area === 'indoor';
          var mine = customs.filter(function (a) { return a.area === area; });
          return html`<div key=${area} class="tsec">
            <label>${isIn ? '9-1. 학생 활동(실내)' : '9-2. 학생 활동(실외)'}</label>
            <div class="wrap">
              <button type="button" class="tchoice sm" aria-label="활동 모두 켜기"
                onClick=${function () {
                  var ids = App.topCards(area).map(function (c) { return c.id; });
                  upd(current.id, { hiddenActivityIds:
                    hidden.filter(function (h) { return ids.indexOf(h) < 0; }) });
                }}>모두</button>
              ${App.topCards(area).map(function (c) {
                var off = hidden.indexOf(c.id) >= 0;
                return html`<button key=${c.id} type="button"
                  class=${'tchoice' + (off ? '' : ' on') + (c.custom ? ' mine' : '')}
                  aria-pressed=${!off} onClick=${function () { toggleAct(c.id); }}>
                  ${c.name}</button>`;
              })}
              <!-- 학급 특성에 맞게 활동을 더합니다. 글자는 ＋ 하나만 -->
              <button type="button" class="tchoice add" aria-label="활동 더하기" title="활동 더하기"
                onClick=${function () { newActS[1]({ area: area, name: '', place: '', icon: 'star' }); }}>
                ＋</button>
            </div>
            ${isIn && html`<p class="muted small" style=${{ marginTop: '.3rem' }}>
              색이 켜진 활동만 학생 화면에 나옵니다.</p>`}
            ${mine.length ? html`<div style=${{ marginTop: '.5rem' }}>
              <p class="muted small">우리 반 활동 (선생님이 더한 활동)</p>
              <div class="stack" style=${{ gap: '.3rem' }}>
                ${mine.map(function (a) {
                  return html`<div key=${a.id} class="row" style=${{ gap: '.4rem' }}>
                    <!-- 그림을 함께 보여 줍니다 — 어느 활동에 어떤 그림을
                         넣었는지 목록에서 바로 알아볼 수 있어야 합니다. -->
                    <span class="addact-pic sm"><${C.ActivityArt} activity=${App.act(a.id)} /></span>
                    <b class="grow small">${a.name}</b>
                    ${a.defaultPlace && html`<span class="chip">${a.defaultPlace}</span>`}
                    <button type="button" class="tchoice sm danger"
                      onClick=${function () {
                        App.ui.confirm({ title: '「' + a.name + '」 활동을 지울까요?',
                          body: '이미 쓴 계획·일기는 그대로 남습니다.',
                          okText: '지울래요', cancelText: '그만두기', tone: 'danger' })
                          .then(function (ok) { if (ok) App.store.removeActivity(a.id); });
                      }}>지우기</button>
                  </div>`;
                })}
              </div>
            </div>` : null}
          </div>`;
        })}

        <div class="tsec">
          <label>10. 포트폴리오 기간</label>
          <${Choices} value=${pf.rangeId}
            items=${App.DATA.ranges.map(function (x) { return { id: x.id, name: x.name }; })}
            onPick=${function (v) {
              var next = Object.assign({}, pf, { rangeId: v });
              if ((v === 'term' || v === 'custom') && !next.start) {
                next.start = App.addMonths(App.todayKey(), -4); next.end = App.todayKey();
              }
              upd(current.id, { portfolio: next });
            }} />
          ${(pf.rangeId === 'term' || pf.rangeId === 'custom') && html`<div class="row" style=${{ marginTop: '.5rem' }}>
            <div style=${{ width: '13rem' }}><${C.Field} label="시작일" type="date" value=${pf.start || ''}
              onChange=${function (v) { upd(current.id, { portfolio: Object.assign({}, pf, { start: v }) }); }} /></div>
            <div style=${{ width: '13rem' }}><${C.Field} label="종료일" type="date" value=${pf.end || ''}
              onChange=${function (v) { upd(current.id, { portfolio: Object.assign({}, pf, { end: v }) }); }} /></div>
          </div>`}
          <p class="muted small">지금 기간 : ${App.fmtDateLong(r.from)} ~ ${App.fmtDateLong(r.to)}</p>
        </div>

        <div class="tsec">
          <label>11. ${current.name} 학생의 기록</label>
          <!-- ★ **최근 3개만** 보여 줍니다 (2026-08-26 · 선생님 말씀).
                 기록이 쌓이면 이 칸이 옆 칸보다 한없이 길어졌습니다.
                 나머지는 「더 보기」 팝업에서 봅니다. -->
          ${(function () {
            var all = App.store.diaries(current.id);
            var recent = all.slice(-3).reverse();     /* 최근 것이 위로 */
            function diaryRow(d) {
              return html`<div key=${d.id} class="row" style=${{ gap: '.4rem' }}>
                <span class="chip">${App.fmtDateShort(d.date)}</span>
                <b class="grow small">${(App.act(d.activityId) || {}).name || ''}</b>
                <button type="button" class="tchoice sm"
                  onClick=${function () { p.nav('diary', { diaryId: d.id }); }}>고치기</button>
                <button type="button" class="tchoice sm ghost" onClick=${function () {
                  App.ui.confirmTwice(
                    { title: '이 일기를 지울까요?', body: App.fmtDateLong(d.date), okText: '지울래요', cancelText: '그만두기', tone: 'danger' },
                    { title: '정말 지울까요?', okText: '네, 지울래요', cancelText: '그만두기', tone: 'danger' }
                  ).then(function (ok) { if (ok) App.store.removeDiary(d.id); });
                }}>지우기</button>
              </div>`;
            }
            return html`<${React.Fragment}>
              <div class="stack" style=${{ gap: '.35rem' }}>
                ${recent.map(diaryRow)}
                ${!all.length && html`<p class="muted small">아직 일기가 없어요.</p>`}
              </div>
              ${all.length > 3 && html`<div class="wrap" style=${{ marginTop: '.45rem' }}>
                <button type="button" class="tchoice sm"
                  onClick=${function () { recListS[1](true); }}>
                  더 보기 (모두 ${all.length}개)</button>
              </div>`}
              ${recListS[0] && html`<${C.Modal} title=${current.name + ' 학생의 기록 모두 보기'}
                speak=${false} onClose=${function () { recListS[1](false); }}
                actions=${html`<${C.Btn} onClick=${function () { recListS[1](false); }}>닫기<//>`}>
                <div class="stack" style=${{ gap: '.35rem', maxHeight: '60vh', overflowY: 'auto' }}>
                  ${all.slice().reverse().map(diaryRow)}
                </div>
              <//>`}
            <//>`;
          })()}
        </div>
      <//>`;
    }

    /* --------------- 화면 --------------- */
    return html`<div class="app" data-corner="portfolio">
      <div class="stage tstage">
        <div class="panel tpanel">
          <div class="tscroll">

            <div class="row" style=${{ marginBottom: '.6rem' }}>
              <h1 class="grow" style=${{ fontSize: '1.6rem', fontWeight: 900 }}>선생님 설정</h1>
              <${C.Btn} size="small" icon="print"
                onClick=${function () { App.printNode(html`<${C.AllRecordsSheet} />`); }}>기록 인쇄<//>
              <!-- ★ 표지로 가는 길 (2026-08-28 · 선생님 말씀 — 「넣어줘」).
                     맨 위 줄의 「나의 여가」 글자를 뺐더니(§40-32) 표지로
                     돌아갈 길이 없어져서, **선생님 설정 안**에 둡니다.
                     학생 화면은 그대로 깔끔하게 두고, 필요할 때만 여기서 갑니다.
                   ▸ 화면을 옮기는 단추끼리 모아 둡니다 (설정 완료 옆).
                   ⛔ 「전체 초기화」 옆에 두지 마세요 — 지우는 단추와 섞이면
                      잘못 누르기 쉽습니다.
                   ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
              <${C.Btn} size="small" icon="home"
                onClick=${function () { p.nav('cover'); }}>처음 화면(표지)으로<//>
              <${C.Btn} size="small" kind="primary" icon="check"
                onClick=${function () { p.nav(students.length ? 'profiles' : 'cover'); }}>설정 완료<//>
            </div>

            <div class="tsec">
              <label>1. 우리 반 학생
                <span class="muted" style=${{ fontWeight: 400, fontSize: '.85em' }}>
                  학생마다 계획·일기·지도가 따로 모여요</span></label>
              ${!students.length && html`<p class="muted small">
                아직 학생이 없어요. <b>+ 학생 추가</b> 를 눌러 우리 반 학생을 모두 등록해 주세요.</p>`}
              <div class="stack" style=${{ gap: '.45rem' }}>
                ${students.map(studentRow)}
              </div>
              <div class="wrap" style=${{ marginTop: '.55rem' }}>
                <button type="button" class="tchoice add" onClick=${function () {
                  var used = students.map(function (x) { return x.mark; });
                  var mark = App.DATA.marks.filter(function (m) { return used.indexOf(m) < 0; })[0] || App.DATA.marks[0];
                  var id = App.store.addStudent({ name: '', mark: mark });
                  App.store.setCurrent(id);
                }}>＋ 학생 추가</button>
              </div>
              ${students.length > 1 && html`<p class="muted small" style=${{ marginTop: '.4rem' }}>
                캐릭터는 <b>학생 줄마다 있는 ‘캐릭터’ 단추</b>로 각각 고릅니다.
                아직 안 고른 학생은 단추가 <b>빨간 점선</b>으로 보여요.</p>`}
            </div>

            ${studentSettings()}

            <div class="tsec">
              <label>12. 백업 · 불러오기</label>
              <div class="wrap">
                <button type="button" class="tchoice" onClick=${function () {
                  download(App.store.exportData(null), '나의여가_전체백업_' + App.todayKey() + '.json'); }}>
                  전체 백업 내보내기</button>
                ${current && html`<button type="button" class="tchoice" onClick=${function () {
                  download(App.store.exportData(current.id), '나의여가_' + current.name + '_' + App.todayKey() + '.json'); }}>
                  ${current.name} 학생만 백업</button>`}
                <button type="button" class="tchoice"
                  onClick=${function () { if (fileRef.current) fileRef.current.click(); }}>백업 불러오기</button>
                <input ref=${fileRef} type="file" accept="application/json,.json"
                  style=${{ display: 'none' }} onChange=${importFile} />
              </div>
              <p class="muted small">백업 파일에는 기록과 사진이 함께 담기고, 밖으로 전송되지 않습니다.</p>
            </div>

            <div class="tsec">
              <label>13. 예시 자료 · 초기화</label>
              <div class="wrap">
                <button type="button" class="tchoice ghost" disabled=${!App.store.hasSamples()}
                  onClick=${function () {
                    App.ui.confirmTwice(
                      { title: '예시 자료를 모두 지울까요?', body: '예시 학생과 예시 기록이 함께 지워져요.',
                        okText: '지울래요', cancelText: '그만두기', tone: 'danger' },
                      { title: '정말 지울까요?', okText: '네, 지울래요', cancelText: '그만두기', tone: 'danger' }
                    ).then(function (ok) { if (ok) { App.store.removeSamples(); App.ui.toast('예시 자료를 지웠어요.'); } });
                  }}>${App.store.hasSamples() ? '예시 자료 모두 지우기' : '예시 자료가 없어요'}</button>
                <button type="button" class="tchoice ghost" onClick=${function () {
                  App.ui.confirmTwice(
                    { title: '모든 기록을 지우고 처음으로 되돌릴까요?',
                      body: '학생 · 계획 · 일기 · 사진 · 지도 표시가 모두 지워져요.',
                      okText: '초기화할래요', cancelText: '그만두기', tone: 'danger' },
                    { title: '정말 초기화할까요?', body: '이 동작은 되돌릴 수 없어요.',
                      okText: '네, 초기화할래요', cancelText: '그만두기', tone: 'danger' }
                  ).then(function (ok) { if (ok) { App.store.resetAll(); App.ui.toast('처음 상태로 되돌렸어요.'); } });
                }}>전체 초기화</button>
              </div>
              <p class="muted small">
                앱 판 : ${App.VERSION || '-'} · 사진 ${App.photos.count()}장
                ${App.photos.isFallback() ? ' · 간단 저장소 사용 중' : ''}
              </p>
              <!-- ★ **글씨체가 실렸는지** 여기서 봅니다 (2026-08-29 · 선생님 말씀 —
                     「아직 나눔바른펜이 안나와 그래서 페이지도 넘어가고」).
                     나눔바른펜은 5.27MB 라, 여는 방법에 따라 안 실릴 때가 있습니다.
                     안 실리면 기본 글꼴이 **20% 넓어** 인쇄가 쪽을 넘깁니다.
                   ▸ 「안 실림」 이 보이면 인터넷 주소로 열어 주세요.
                   ⛔ 이 주석 안에 백틱 금지 (인수인계 2-3). -->
              <p class="muted small">
                글씨체(나눔바른펜) : ${fontOkS[0] === null ? '살펴보는 중…'
                  : (fontOkS[0] ? '✓ 잘 실렸어요'
                     : '✗ 안 실렸어요 — 인쇄가 기본 글씨로 나오고 쪽이 넘어갑니다')}
              </p>
              <!-- 지금 돌고 있는 판 번호. '고쳤는데 화면이 그대로' 일 때
                   여기를 보면 됩니다 (자세한 것은 인수인계 8-17). -->
              <p class="muted small">
                지금 보고 있는 판 : <b class="build-rev">${App.buildRev}</b>
              </p>
            </div>

          </div>
        </div>
      </div>

      ${newPartnerS[0] && html`<${C.AddPartnerModal}
        onClose=${function () { newPartnerS[1](false); }} />`}
      ${newMoodS[0] && html`<${C.AddMoodModal}
        onClose=${function () { newMoodS[1](false); }} />`}
      ${newActS[0] && html`<${C.AddActivityModal} area=${newActS[0].area}
        onClose=${function () { newActS[1](null); }} />`}
    </div>`;
  };
})();
