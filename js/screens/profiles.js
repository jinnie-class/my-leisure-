/* ===========================================================
   나의 여가 — 학생 선택 화면
   =========================================================== */
(function () {
  var App = window.App, React = window.React, html = App.html, C = App.C;
  var useState = React.useState, useRef = React.useRef;

  /* ------------------------- 캐릭터 고르기 (학생 화면) -------------------------
     왼쪽에 고른 캐릭터를 크게, 오른쪽에 고를 수 있는 캐릭터를 늘어놓습니다. */
  C.AvatarScreen = function (p) {
    App.useStore();
    var sid = (p.params && p.params.studentId) || App.store.get().currentStudentId;
    var student = App.store.student(sid);
    if (!student) { p.nav('profiles'); return null; }

    var cur = App.avatarFor(student);
    var back = (p.params && p.params.from) || 'profiles';
    /* ★ 쪽 넘김이 없습니다 (2026-08-26 · 선생님 말씀 「한 장 안에서 선택하고
         넘어가게」). 캐릭터 여덟 + 「사진 찍기」 한 칸 = **3칸 × 3줄**.
       ▸ 예전에는 38개를 12개씩 네 쪽에 나눠 놓아, 고르기 전에 「다음 ▶」을
         누르는 일부터 배워야 했습니다. 사진 넣기도 격자 **밖 아래**에 따로
         있어서 캐릭터와 나란히 견주기 어려웠습니다.
       ⛔ 캐릭터를 더하면 아홉 칸이 깨집니다 — options.js 의 ⛔ 를 보세요. */
    var fitRef = useRef(null);
    C.useFitBox(fitRef);
    var list = App.DATA.avatars;

    var faceRef = useRef(null);
    var busy = useState(false);
    var face = student.facePhotoId ? App.photos.url(student.facePhotoId) : null;

    function pick(a) {
      /* 캐릭터를 고르면 얼굴 사진은 내려놓습니다 (둘 중 하나만 씁니다) */
      if (student.facePhotoId) App.photos.remove(student.facePhotoId);
      App.store.updateStudent(student.id, { avatarId: a.id, avatarChosen: true, facePhotoId: null });
      App.speakFor(student, a.name);
    }

    /* '내 얼굴로 만들기' — 이 기기에 있는 사진을 골라 캐릭터 대신 씁니다.
       사진은 밖으로 보내지 않고 이 기기에만 저장됩니다. */
    function pickFace(e) {
      var f = (e.target.files || [])[0];
      e.target.value = '';
      if (!f) return;
      busy[1](true);
      App.photos.addFile(f, student.id, 'face').then(function (id) {
        var old = student.facePhotoId;
        App.store.updateStudent(student.id, { facePhotoId: id, avatarChosen: true });
        if (old) App.photos.remove(old);
        busy[1](false);
        App.ui.toast('내 얼굴로 만들었어요.');
      })['catch'](function (err) {
        busy[1](false);
        App.ui.toast(err && err.message ? err.message : '사진을 저장하지 못했어요.');
      });
    }

    function dropFace() {
      if (student.facePhotoId) App.photos.remove(student.facePhotoId);
      App.store.updateStudent(student.id, { facePhotoId: null });
      App.ui.toast('캐릭터로 되돌렸어요.');
    }

    return html`<div class="app" data-corner="home">
      <${C.TopBar}
        left=${html`<${C.Btn} size="small" icon="back" className="pastel-yellow"
          onClick=${function () { p.nav(back); }}>누구의 여가생활일까요?<//>`} />

      <div class="stage">
        <div class="panel" style=${{ alignSelf: 'stretch' }}>
          <!-- ⛔ ref 를 지우지 마세요 — 넘칠 때 통째로 조금 줄여 주는 장치입니다
                 (C.useFitBox). 없으면 낮은 화면에서 캐릭터 그림이 이름 글자를
                 덮고, 「1 / 3 쪽」과 「다음」이 카드 위에 겹칩니다. -->
          <div class="stage-fit" ref=${fitRef}
              style=${{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>

            <div class="q" style=${{ marginBottom: 0 }}>
              <h2 class="grow">나의 여가 탐험 캐릭터를 골라요</h2>
              <${C.Speak} text="나의 여가 탐험 캐릭터를 골라요. 마음에 드는 캐릭터를 눌러 보세요." />
            </div>

            <div class="cs-cols grow">
              <!-- 왼쪽 : 지금 고른 캐릭터 -->
              <div class="cs-preview">
                <div class="cs-face"><${C.AvatarArt} student=${student} /></div>
                <!-- ★ 이름 칸이 곧 입력칸입니다 (2026-08-26 · 선생님 말씀).
                     예전에는 이름을 고치려면 선생님 설정까지 가야 했습니다. -->
                <input class="cs-name" value=${student.name || ''}
                  aria-label="학생 이름 (눌러서 고칠 수 있어요)" placeholder="이름"
                  onChange=${function (e) {
                    App.store.updateStudent(student.id, { name: e.target.value });
                  }} />
              </div>

              <!-- 오른쪽 : 고를 수 있는 캐릭터 -->
              <div class="cs-pickside">
                <div class="cs-grid">
                  ${list.map(function (a) {
                    var on = cur.id === a.id;
                    return html`<button key=${a.id} type="button" class=${'cs-item' + (on ? ' on' : '')}
                        aria-pressed=${on ? 'true' : 'false'} aria-label=${a.name}
                        onClick=${function () { pick(a); }}>
                      <span class="cs-art"><${C.AvatarArt} avatarId=${a.id} /></span>
                      <span class="cs-label">${a.name}</span>
                    </button>`;
                  })}

                  <!-- ★ 아홉 번째 칸 = 내 사진 (2026-08-26).
                         캐릭터와 **같은 크기·같은 자리**에 있어야 「이것도
                         고를 수 있는 것」으로 보입니다. 예전처럼 격자 밖
                         아래에 단추로 두면 학생 눈에 안 들어왔습니다. -->
                  <button type="button" class=${'cs-item cs-photo' + (face ? ' on' : '')}
                      aria-pressed=${face ? 'true' : 'false'} disabled=${busy[0]}
                      aria-label="내 사진으로 만들기"
                      onClick=${function () { if (faceRef.current) faceRef.current.click(); }}>
                    <span class="cs-art">
                      <${C.Art} src=${face || App.uiImage('camera')} iconKey="camera" />
                    </span>
                    <span class="cs-label">${busy[0] ? '넣는 중…' : (face ? '내 사진' : '사진 찍기')}</span>
                  </button>
                  <input ref=${faceRef} type="file" accept="image/*"
                    style=${{ display: 'none' }} onChange=${pickFace} />
                </div>

                ${face && html`<div class="face-row">
                  <${C.Btn} size="small" icon="back" onClick=${dropFace}>캐릭터로 되돌리기<//>
                  <span class="face-note">사진은 이 기기에만 저장돼요.</span>
                </div>`}
              </div>
            </div>
          </div>

          <div class="panel-action">
            <${C.Btn} icon="check" className="pastel-red" onClick=${function () {
              App.ui.toast((face ? student.name + ' 얼굴' : cur.name) + '로 정했어요.');
              p.nav(back === 'teacher' ? 'teacher' : 'home');
            }}>이 캐릭터로 여가생활 하러 가기<//>
          </div>
        </div>
      </div>
    </div>`;
  };

  /* ------------------------- 누구의 여가생활일까요? -------------------------
     선생님이 등록한 학생 가운데 오늘 사용할 학생을 고릅니다.
     글자를 못 읽어도 이름 앞 그림으로 자기 칸을 찾을 수 있습니다. */
  C.ProfilesScreen = function (p) {
    var store = App.useStore();
    var students = store.students;
    var q = '누구의 여가생활일까요?';
    /* ★ 누른 카드 표시 (2026-08-26) : 이름을 읽어 주는 0.35초 동안 화면에
         아무 반응이 없어서, 학생이 안 눌린 줄 알고 **또 눌렀습니다.**
         누르는 즉시 파란 테두리를 켜고, 그동안 다른 카드는 잠급니다. */
    var pickedS = React.useState(null);

    function choose(s) {
      if (pickedS[0]) return;              /* 읽어 주는 동안 겹눌림 막기 */
      pickedS[1](s.id);
      App.store.setCurrent(s.id);
      App.speakFor(s, s.name);
      /* 캐릭터를 아직 고르지 않았으면 캐릭터 고르기부터 */
      setTimeout(function () {
        p.nav(s.avatarChosen ? 'home' : 'avatar', { studentId: s.id, from: 'profiles' });
      }, 350);
    }

    /* 맨 위 줄(로고·홈·전체화면·설정·학생 이름표)은 C.TopBar 가 공용으로 그립니다. */
    return html`<div class="app" data-corner="home">
      <${C.TopBar} />

      <${C.Stage}>
        <div class="q">
          <h2 class="grow">🙋 ${q}</h2>
          <${C.Speak} text=${q + ' 내 이름을 눌러 보세요.'} />
        </div>

        ${students.length ? html`<div class="stu-grid">
          ${students.map(function (s) {
            return html`<button key=${s.id} type="button"
                class=${'stu-card' + (pickedS[0] === s.id ? ' picked' : '')}
                onClick=${function () { choose(s); }}
                aria-label=${(s.name || '이름 없음') + (s.id === store.currentStudentId ? ', 지금 학생' : '')}>
              <span class="stu-card-mark">${s.mark || '🌸'}</span>
              <span class="stu-card-name">${s.name || '이름 없음'}</span>
            </button>`;
          })}
        </div>` : html`<${C.Banner} icon="people">
          <!-- ★ 안내만 하지 않고 **누르면 바로 그 일이 일어나게** 합니다.
                 예전에는 '표지의 톱니바퀴를 눌러 …' 라고 딴 화면을 가리켰습니다.
                 선생님이 표지로 돌아가 톱니바퀴를 찾아야 했습니다.
                 갈 곳을 말로 알려 주는 대신 **여기에 그 단추를 둡니다.**
                 ※ 이 주석은 html 템플릿 안이라 홑따옴표만 씁니다 (백틱 금지). -->
          <b>아직 등록된 학생이 없어요.</b>
          <div class="small">선생님 설정에서 학생을 추가해 주세요.</div>
          <div class="wrap" style=${{ marginTop: '.6rem' }}>
            <${C.Btn} kind="primary" icon="gear"
              onClick=${function () { p.nav('teacher'); }}>선생님 설정 열기<//>
          </div>
        <//>`}

      <//>
    </div>`;
  };
})();
