/* ===========================================================
   나의 여가 — 선생님 설정
   한 페이지에 번호 순서대로 모아 두고, 아래로 내리며 설정합니다.
   (문구마켓과 같은 방식 — 탭이나 잠금 문제 없이 바로 들어옵니다)
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useRef = React.useRef;

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
  function Choices(p) {
    return html`<div class="wrap">
      ${p.items.map(function (it) {
        var on = p.value === it.id;
        return html`<button key=${it.id} type="button" class=${'tchoice' + (on ? ' on' : '')}
          aria-pressed=${on ? 'true' : 'false'}
          onClick=${function () { p.onPick(it.id); }}>${on ? '✓ ' : ''}${it.name}</button>`;
      })}
    </div>`;
  }
  C.Choices = Choices;

  /* ------------------------- 설정 화면 ------------------------- */
  C.TeacherScreen = function (p) {
    var store = App.useStore();
    var fileRef = useRef(null);
    var markOpen = useState(null);
    var newActS = useState(null);          // '우리 반 활동 더하기' 창
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
        <div class="row" style=${{ gap: '.5rem', flexWrap: 'nowrap' }}>
          <button type="button" class="stu-mark" title="이름 앞 그림 바꾸기"
            aria-label=${s.name + ' 이름 앞 그림 바꾸기'}
            onClick=${function () { markOpen[1](markOpen[0] === s.id ? null : s.id); }}>${s.mark || '🌸'}</button>

          <input class="field" style=${{ flex: '1 1 auto', minWidth: 0 }} value=${s.name}
            placeholder="이름 또는 별명"
            onChange=${function (e) { upd(s.id, { name: e.target.value }); }} />

          <button type="button" class=${'tchoice sm avatar' + (s.avatarChosen ? ' done' : '')}
            style=${{ flex: '0 0 auto' }}
            aria-label=${(s.name || '이 학생') + ' 캐릭터 고르기'}
            onClick=${function () { p.nav('avatar', { studentId: s.id, from: 'teacher' }); }}>
            <span class="stu-av"><${C.AvatarArt} student=${s} /></span>
            <span>캐릭터</span>
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
      function toggleAct(id) {
        upd(current.id, { hiddenActivityIds: hidden.indexOf(id) >= 0
          ? hidden.filter(function (x) { return x !== id; }) : hidden.concat([id]) });
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
          <${Choices} value=${current.diaryLevel}
            items=${App.DATA.diaryLevels.map(function (l) { return { id: l.id, name: l.name + ' · ' + l.desc }; })}
            onPick=${function (v) { upd(current.id, { diaryLevel: v }); }} />
          <p class="muted small">${(App.DATA.diaryLevels.filter(function (l) { return l.id === current.diaryLevel; })[0] || {}).guide || ''}</p>
        </div>

        <div class="tsec">
          <label>4. 계획 방식</label>
          <${Choices} value=${current.planLevel}
            items=${App.DATA.planLevels.map(function (l) { return { id: l.id, name: l.name + ' · ' + l.desc }; })}
            onPick=${function (v) { upd(current.id, { planLevel: v }); }} />
        </div>

        <div class="tsec">
          <label>5. 음성 안내 · 사진 첨부</label>
          <div class="wrap">
            <${C.Switch} label="음성 안내" on=${current.voice !== false}
              onChange=${function (v) { upd(current.id, { voice: v }); }} />
            <${C.Switch} label="사진 첨부" on=${current.photo !== false}
              onChange=${function (v) { upd(current.id, { photo: v }); }} />
          </div>
        </div>

        <div class="tsec">
          <label>6. 학생 화면에 도구 보이기
            <span class="muted" style=${{ fontWeight: 400, fontSize: '.85em' }}>기본은 숨김이에요</span></label>
          <div class="wrap">
            <${C.Switch} label="지도 찾아보기·확대" on=${!!current.mapTools}
              onChange=${function (v) { upd(current.id, { mapTools: v }); }} />
            <${C.Switch} label="포트폴리오 기간·인쇄" on=${!!current.folioTools}
              onChange=${function (v) { upd(current.id, { folioTools: v }); }} />
            <${C.Switch} label="활동 고르는 화면의 ＋ 활동 더하기" on=${current.addTools !== false}
              onChange=${function (v) { upd(current.id, { addTools: v }); }} />
          </div>
          <p class="muted small">＋ 활동 더하기는 <b>기본이 켜짐</b>이에요.
            여가 계획하기 · 여가 일기 의 활동 고르는 화면에서 바로 우리 반 활동을 더할 수 있어요.</p>
        </div>

        <div class="tsec">
          <label>7. 함께하는 사람 선택지</label>
          <div class="wrap">
            ${App.DATA.partners.map(function (x) {
              var on = (current.partnerIds || []).indexOf(x.id) >= 0;
              return html`<button key=${x.id} type="button" class=${'tchoice' + (on ? ' on' : '')}
                aria-pressed=${on} onClick=${function () { toggleIn('partnerIds', App.DATA.partners, x.id); }}>
                ${on ? '✓ ' : ''}${x.name}</button>`;
            })}
          </div>
          ${App.DATA.partners.filter(function (x) { return x.variants; }).length ? html`
            <p class="muted small" style=${{ marginTop: '.4rem' }}>그림 고르기 (남 / 여)</p>
            <div class="wrap">
              ${App.DATA.partners.filter(function (x) { return x.variants; }).map(function (x) {
                var cur = App.partnerVariant(x, current);
                return html`<span key=${x.id} class="wrap" style=${{ gap: '.2rem', alignItems: 'center' }}>
                  <b class="small">${x.name}</b>
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
            ${App.DATA.moods.map(function (x) {
              var on = (current.moodIds || []).indexOf(x.id) >= 0;
              return html`<button key=${x.id} type="button" class=${'tchoice' + (on ? ' on' : '')}
                aria-pressed=${on} onClick=${function () { toggleIn('moodIds', App.DATA.moods, x.id); }}>
                ${on ? '✓ ' : ''}${x.name}</button>`;
            })}
          </div>
        </div>

        <div class="tsec">
          <label>9. 학생에게 보여줄 활동</label>
          ${['indoor', 'outdoor'].map(function (area) {
            return html`<div key=${area} style=${{ marginTop: '.4rem' }}>
              <p class="muted small">${area === 'indoor' ? '실내' : '실외'}</p>
              <div class="wrap">
                ${App.topCards(area).map(function (c) {
                  var off = hidden.indexOf(c.id) >= 0;
                  return html`<button key=${c.id} type="button"
                    class=${'tchoice' + (off ? '' : ' on') + (c.custom ? ' mine' : '')}
                    aria-pressed=${!off} onClick=${function () { toggleAct(c.id); }}>
                    ${off ? '' : '✓ '}${c.name}</button>`;
                })}
                <!-- 학급 특성에 맞게 활동을 더합니다 -->
                <button type="button" class="tchoice add"
                  onClick=${function () { newActS[1]({ area: area, name: '', place: '', icon: 'star' }); }}>
                  ＋ ${area === 'indoor' ? '실내' : '실외'} 활동 더하기</button>
              </div>
            </div>`;
          })}
          <p class="muted small" style=${{ marginTop: '.3rem' }}>체크된 활동만 학생 화면에 나옵니다.</p>

          ${customs.length ? html`<div style=${{ marginTop: '.5rem' }}>
            <p class="muted small">우리 반 활동 (선생님이 더한 활동)</p>
            <div class="stack" style=${{ gap: '.3rem' }}>
              ${customs.map(function (a) {
                return html`<div key=${a.id} class="row" style=${{ gap: '.4rem' }}>
                  <span class="chip">${a.area === 'indoor' ? '실내' : '실외'}</span>
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
        </div>

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
          <div class="stack" style=${{ gap: '.35rem' }}>
            ${App.store.diaries(current.id).map(function (d) {
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
            })}
            ${!App.store.diaries(current.id).length && html`<p class="muted small">아직 일기가 없어요.</p>`}
          </div>
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
              <!-- 지금 돌고 있는 판 번호. '고쳤는데 화면이 그대로' 일 때
                   여기를 보면 됩니다 (자세한 것은 인수인계 8-17). -->
              <p class="muted small">
                지금 보고 있는 판 : <b class="build-rev">${App.buildRev}</b>
              </p>
            </div>

          </div>
        </div>
      </div>

      ${newActS[0] && html`<${C.AddActivityModal} area=${newActS[0].area}
        onClose=${function () { newActS[1](null); }} />`}
    </div>`;
  };
})();
