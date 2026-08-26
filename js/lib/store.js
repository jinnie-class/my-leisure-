/* ===========================================================
   나의 여가 — 자료 보관과 상태 관리
   -----------------------------------------------------------
   · 서버 · 로그인 · 외부 데이터베이스를 쓰지 않습니다.
   · 글자 자료(학생·계획·일기·지도·설정)는 localStorage 에,
     사진은 IndexedDB(js/lib/photos.js) 에 저장합니다.
   · 새로고침하거나 브라우저를 닫았다 열어도 기록이 남습니다.
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});
  var D = App.DATA;

  var KEY = 'naui-yeoga.v1';
  var listeners = [];
  var state = null;

  /* ------------------------- 기본값 ------------------------- */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }
  function allIds(list) { return list.map(function (x) { return x.id; }); }

  function newStudent(partial) {
    var s = {
      id: uid('st'),
      name: '',
      mark: '🌸',                   // 이름 앞에 붙는 그림 (글자를 못 읽어도 자기 칸을 찾도록)
      gender: 'girl',               // 'girl' | 'boy' — 기본 캐릭터와 사람 그림을 고를 때 씁니다
      avatarId: '',                 // 비어 있으면 성별에 맞는 기본 캐릭터가 나옵니다
      avatarChosen: false,          // 학생이 직접 골랐는지
      facePhotoId: null,            // '내 얼굴로 만들기' 로 넣은 사진 (있으면 캐릭터 대신 씁니다)
      diaryLevel: 1,
      planLevel: 'easy',
      hiddenActivityIds: [],
      partnerIds: allIds(D.partners),
      partnerVariants: {},          // 예) { friend:'f', teacher:'m' } — 학생마다 그림 고르기
      moodIds: allIds(D.moods),
      voice: true,
      photo: true,
      mapTools: false,          // (안 씀) 찾아보기·도움말은 섬 안에서 늘 보입니다 — 14-34
      /* ★ 기본이 **켬**입니다. 숨겨 두면 기간을 바꾸거나 인쇄할 길이 아예 없어서,
           켜는 곳을 모르는 선생님은 포트폴리오를 못 씁니다.
           끄고 싶을 때만 선생님 설정 6번에서 끕니다. */
      folioTools: true,         // 포트폴리오의 기간·인쇄를 학생 화면에 보일지
      addTools: true,           // 활동 고르는 화면의 '＋ 활동 더하기' 를 보일지
      portfolio: { rangeId: 'm1', start: '', end: '' },
      review: { r1: '', r2: '', r3: '', r4: '' },
      isSample: false,
      createdAt: Date.now()
    };
    return Object.assign(s, partial || {});
  }
  App.newStudent = newStudent;

  function emptyState() {
    return {
      version: 1,
      currentStudentId: null,
      students: [],
      plans: [],
      diaries: [],
      map: {},
      customActivities: [],   // 선생님이 더한 '우리 반 활동'
      customPartners: [],     // 선생님이 더한 '함께하는 사람'
      customMoods: [],        // 선생님이 더한 '기분'
      /* 쓰다 만 계획·일기 — 나가면서 「여기까지 저장」을 눌렀을 때 담깁니다.
         { 학생id: { plan: {draft,step}|null, diary: {draft,step}|null } }
         ▸ 백업(내보내기)에는 넣지 않습니다 — 완성 전의 임시 기록입니다. */
      drafts: {},
      seeded: false
    };
  }

  /* ------------------------- 예시 자료 ------------------------- */
  function seed(st) {
    var today = App.todayKey();
    var s = newStudent({
      id: 'st_sample1',
      name: '학생 1',
      avatarId: 'bear',
      diaryLevel: 1,
      planLevel: 'easy',
      isSample: true
    });
    st.students = [s];
    st.currentStudentId = s.id;

    st.plans = [{
      id: 'pl_sample1', studentId: s.id, level: 'easy', area: 'indoor',
      activityId: 'toy-slime', cardId: 'toy', partnerId: 'friend',
      date: today, time: 'pm', place: '교실', supplies: ['슬라임', '물티슈'],
      memo: '', createdAt: Date.now(), doneDiaryId: null, isSample: true
    }];

    function diary(o) {
      return Object.assign({
        id: uid('dy'), studentId: s.id, planId: null, level: 1,
        date: today, activityId: 'toy-slime', cardId: 'toy', partnerId: 'friend',
        place: '', moodIds: ['fun'], againId: 'again',
        title: '', text: '', frames: {}, photoIds: [],
        exhibit: false, createdAt: Date.now(), updatedAt: Date.now(), isSample: true
      }, o);
    }
    st.diaries = [
      diary({
        id: 'dy_sample1', date: App.addDays(today, -12),
        activityId: 'boardgame', cardId: 'boardgame', partnerId: 'family',
        place: '교실', moodIds: ['fun', 'proud'], againId: 'again', exhibit: true,
        title: '보드게임을 했어요'
      }),
      diary({
        id: 'dy_sample2', date: App.addDays(today, -6),
        activityId: 'cook-eggrice', cardId: 'cook', partnerId: 'teacher',
        place: '조리실', moodIds: ['proud'], againId: 'again', exhibit: true,
        title: '간장계란밥 만들기'
      }),
      diary({
        id: 'dy_sample3', date: App.addDays(today, -2),
        activityId: 'park', cardId: 'park', partnerId: 'mom',
        place: '공원', moodIds: ['calm'], againId: 'unsure', exhibit: false,
        title: '공원 산책'
      })
    ];

    st.map[s.id] = {
      boardgame: { tried: true, like: true, challenge: false, unsure: false, updatedAt: Date.now() },
      cook:      { tried: true, like: true, challenge: false, unsure: false, updatedAt: Date.now() },
      park:      { tried: true, like: false, challenge: false, unsure: true, updatedAt: Date.now() },
      camping:   { tried: false, like: false, challenge: true, unsure: false, updatedAt: Date.now() },
      museum:    { tried: false, like: false, challenge: true, unsure: false, updatedAt: Date.now() }
    };
    st.seeded = true;
    return st;
  }

  /* ------------------------- 저장 / 불러오기 ------------------------- */
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) return seed(emptyState());
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('bad');
      var base = emptyState();
      var out = Object.assign(base, parsed);
      out.students = (out.students || []).map(function (s) { return Object.assign(newStudent({}), s); });
      out.plans = out.plans || [];
      out.diaries = out.diaries || [];
      out.map = out.map || {};
      out.customActivities = out.customActivities || [];
      out.customPartners = out.customPartners || [];
      out.customMoods = out.customMoods || [];
      out.drafts = out.drafts || {};
      if (!out.students.length) return seed(emptyState());
      if (!out.currentStudentId || !out.students.some(function (s) { return s.id === out.currentStudentId; })) {
        out.currentStudentId = out.students[0].id;
      }
      return out;
    } catch (e) {
      return seed(emptyState());
    }
  }

  var saveTimer = null;
  var lastSaveError = null;
  /* ★ 저장 실패를 **소리 내어** 알립니다 (2026-08-25).
       예전에는 lastSaveError 에 담기만 하고 아무도 읽지 않아서, 저장 공간이
       가득 차면 학생이 일기를 다 썼는데 **아무 말 없이 사라졌습니다.**
     ▸ 실패가 **시작될 때 한 번만** 알립니다 — 저장은 글자를 칠 때마다
       일어나므로, 매번 알리면 알림이 화면을 덮습니다. 성공하면 다시 무장합니다. */
  var warnedSaveFail = false;
  function noteSaveResult(err) {
    lastSaveError = err || null;
    if (err && !warnedSaveFail) {
      warnedSaveFail = true;
      if (App.ui && App.ui.toast) {
        App.ui.toast('⚠ 기록을 저장하지 못했어요. 저장 공간이 가득 찼을 수 있어요 — 선생님 설정 → 데이터에서 정리해 주세요.');
      }
    }
    if (!err) warnedSaveFail = false;
  }
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); noteSaveResult(null); }
      catch (e) { noteSaveResult(e); }
    }, 120);
  }
  function saveNow() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); noteSaveResult(null); return true; }
    catch (e) { noteSaveResult(e); return false; }
  }

  function notify() { listeners.slice().forEach(function (f) { try { f(); } catch (e) {} }); }

  /* 선생님이 더한 것들을 목록에 반영합니다 (저장할 때마다 다시 읽어 들임) */
  function syncCustom() {
    if (App.setCustomActivities) App.setCustomActivities(state.customActivities || []);
    if (App.setCustomPartners) App.setCustomPartners(state.customPartners || []);
    if (App.setCustomMoods) App.setCustomMoods(state.customMoods || []);
  }

  function set(mutator) {
    var next = Object.assign({}, state);
    var before = state.customActivities;
    var beforeP = state.customPartners, beforeM = state.customMoods;
    mutator(next);
    state = next;
    if (next.customActivities !== before
      || next.customPartners !== beforeP || next.customMoods !== beforeM) syncCustom();
    save();
    notify();
    return state;
  }

  /* ------------------------- 공개 API ------------------------- */
  var Store = {
    /* ⛔ 켤 때 **자료를 한 번 바로잡습니다.**
         「활동이 하나도 안 보이는 학생」 때문에 홈 화면이 네 코너만 남고
         아래가 통째로 비어 보이는 일이 되풀이됐습니다. 선생님은 무엇이
         잘못됐는지 알 길이 없었습니다.
       ▸ 예전 자료나 백업에 이미 그런 학생이 있을 수 있으므로,
         **켤 때 고쳐서 저장**합니다. 화면에서 되살리는 것(App.visibleCards)만으로는
         저장된 자료가 그대로 남아 다음에 또 나옵니다.
       ▸ 숨김 목록이 잘못된 꼴(배열이 아님)이어도 여기서 빈 배열로 돌립니다. */
    init: function () {
      if (!state) {
        state = load();
        syncCustom();
        var all = App.topCards ? App.topCards().map(function (c) { return c.id; }) : [];
        var fixed = 0;
        /* ⛔ **새로 생긴 사람은 켜 주어야 합니다** (2026-08-24).
             `partnerIds` 는 「켠 것 목록」이라, 목록에 없는 사람은 안 나옵니다.
             그런데 「형제자매」를 언니 · 누나 · 형 · 오빠 · 동생으로 나누고
             할머니 · 할아버지를 더했더니, 예전에 저장된 학생은 새 이름이
             목록에 없어서 **하나도 나오지 않았습니다.** 선생님은 끌 기회조차
             없었던 것들이라 켜 주는 것이 맞습니다.
           ▸ **판 번호**로 다스립니다. 사람을 더할 때마다 아래 표에 한 줄을
             더하고 `v` 를 올리면, 그 판을 아직 안 받은 학생에게만 켜 줍니다.
             ⛔ 표를 고치지 않고 사람만 더하면 **예전 학생에게는 안 보입니다.**
             ⛔ 판 번호 없이 매번 켜면 선생님이 일부러 끈 것을 되살려 버립니다.
           ▸ `partnersV2` 는 판 번호를 쓰기 전의 표시입니다. 그것만 있는 학생은
             2판까지 받은 것으로 봅니다. */
        var PARTNER_ADDS = [
          { v: 2, ids: ['grandma', 'grandpa', 'sisEl', 'nuna', 'hyeong', 'oppa', 'younger'] },
          { v: 3, ids: ['uncle', 'gomo', 'imo'] }
        ];
        (state.students || []).forEach(function (s) {
          var ver = s.partnerVer || (s.partnersV2 ? 2 : 0);
          var last = PARTNER_ADDS[PARTNER_ADDS.length - 1].v;
          if (ver < last) {
            if (Array.isArray(s.partnerIds) && s.partnerIds.length) {
              PARTNER_ADDS.forEach(function (step) {
                if (step.v <= ver) return;
                step.ids.forEach(function (id) {
                  if (s.partnerIds.indexOf(id) < 0) s.partnerIds.push(id);
                });
              });
            }
            s.partnerVer = last; fixed++;
          }
          var h = s.hiddenActivityIds;
          if (!Array.isArray(h)) { if (h != null) { s.hiddenActivityIds = []; fixed++; } return; }
          if (all.length && all.every(function (id) { return h.indexOf(id) >= 0; })) {
            s.hiddenActivityIds = []; fixed++;
          }
        });
        if (fixed) {
          saveNow();
          if (window.console) console.warn('[나의 여가] 활동이 하나도 안 보이던 학생 '
            + fixed + '명의 숨김 설정을 되돌렸습니다.');
        }
      }
      return state;
    },
    get: function () { if (!state) state = load(); return state; },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    },
    saveNow: saveNow,
    lastError: function () { return lastSaveError; },

    /* --------------- 우리 반 활동 (선생님이 더한 활동) --------------- */
    addActivity: function (o) {
      var a = Object.assign({
        id: uid('cx'), area: 'indoor', name: '', icon: 'star',
        defaultPlace: '', createdAt: Date.now()
      }, o);
      set(function (x) { x.customActivities = (x.customActivities || []).concat([a]); });
      return a.id;
    },
    updateActivity: function (id, patch) {
      set(function (x) {
        x.customActivities = (x.customActivities || []).map(function (a) {
          return a.id === id ? Object.assign({}, a, patch) : a;
        });
      });
    },
    /* --------------- 우리 반 사람 · 기분 (선생님이 더한 것) ---------------
       활동과 **같은 방식**입니다. 지우면 학생마다 켜 둔 목록에서도 함께 지웁니다. */
    addPartner: function (o) {
      var a = Object.assign({ id: uid('px'), name: '', icon: 'pFriend', createdAt: Date.now() }, o);
      set(function (x) { x.customPartners = (x.customPartners || []).concat([a]); });
      return a.id;
    },
    removePartner: function (id) {
      set(function (x) {
        x.customPartners = (x.customPartners || []).filter(function (a) { return a.id !== id; });
        x.students = x.students.map(function (s) {
          var v = (s.partnerIds || []).filter(function (k) { return k !== id; });
          return v.length === (s.partnerIds || []).length ? s : Object.assign({}, s, { partnerIds: v });
        });
      });
    },
    addMood: function (o) {
      var a = Object.assign({ id: uid('mx'), name: '', icon: 'moodFun', createdAt: Date.now() }, o);
      set(function (x) { x.customMoods = (x.customMoods || []).concat([a]); });
      return a.id;
    },
    removeMood: function (id) {
      set(function (x) {
        x.customMoods = (x.customMoods || []).filter(function (a) { return a.id !== id; });
        x.students = x.students.map(function (s) {
          var v = (s.moodIds || []).filter(function (k) { return k !== id; });
          return v.length === (s.moodIds || []).length ? s : Object.assign({}, s, { moodIds: v });
        });
      });
    },

    removeActivity: function (id) {
      set(function (x) {
        x.customActivities = (x.customActivities || []).filter(function (a) { return a.id !== id; });
        /* 학생마다 숨김 목록에 남아 있던 흔적도 지웁니다 */
        x.students = x.students.map(function (s) {
          var h = (s.hiddenActivityIds || []).filter(function (v) { return v !== id; });
          return h.length === (s.hiddenActivityIds || []).length ? s
            : Object.assign({}, s, { hiddenActivityIds: h });
        });
      });
    },

    /* --------------- 학생 --------------- */
    student: function (id) {
      var st = Store.get();
      var sid = id || st.currentStudentId;
      for (var i = 0; i < st.students.length; i++) if (st.students[i].id === sid) return st.students[i];
      return null;
    },
    current: function () { return Store.student(null); },
    setCurrent: function (id) { set(function (s) { s.currentStudentId = id; }); },

    /* ---------- 쓰다 만 계획·일기 (이어서 하기) ----------
       kind 는 'plan' | 'diary'. data 는 화면이 넣고 싶은 것 그대로
       ({ draft, step }) — 여기서는 뜻을 모르는 채 담기만 합니다. */
    draftOf: function (studentId, kind) {
      var d = state.drafts && state.drafts[studentId];
      return (d && d[kind]) || null;
    },
    setDraft: function (studentId, kind, data) {
      set(function (s) {
        s.drafts = Object.assign({}, s.drafts);
        var d = Object.assign({}, s.drafts[studentId]);
        d[kind] = data;
        s.drafts[studentId] = d;
      });
    },
    clearDraft: function (studentId, kind) {
      set(function (s) {
        if (!s.drafts || !s.drafts[studentId]) return;
        s.drafts = Object.assign({}, s.drafts);
        var d = Object.assign({}, s.drafts[studentId]);
        d[kind] = null;
        s.drafts[studentId] = d;
      });
    },
    addStudent: function (partial) {
      var s = newStudent(partial);
      set(function (x) {
        x.students = x.students.concat([s]);
        if (!x.currentStudentId) x.currentStudentId = s.id;
      });
      return s.id;
    },
    updateStudent: function (id, patch) {
      set(function (x) {
        x.students = x.students.map(function (s) {
          return s.id === id ? Object.assign({}, s, patch) : s;
        });
      });
    },
    removeStudent: function (id) {
      set(function (x) {
        x.students = x.students.filter(function (s) { return s.id !== id; });
        x.plans = x.plans.filter(function (p) { return p.studentId !== id; });
        x.diaries = x.diaries.filter(function (d) { return d.studentId !== id; });
        var m = Object.assign({}, x.map); delete m[id]; x.map = m;
        var dr = Object.assign({}, x.drafts); delete dr[id]; x.drafts = dr;
        if (x.currentStudentId === id) x.currentStudentId = x.students.length ? x.students[0].id : null;
      });
      if (App.photos) App.photos.removeByStudent(id);
    },

    /* --------------- 계획 --------------- */
    plans: function (studentId) {
      var sid = studentId || Store.get().currentStudentId;
      return Store.get().plans.filter(function (p) { return p.studentId === sid; })
        .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    },
    plan: function (id) {
      var list = Store.get().plans;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },
    todayPlans: function (studentId) {
      var t = App.todayKey();
      return Store.plans(studentId).filter(function (p) { return p.date === t; });
    },
    upcomingPlans: function (studentId) {
      var t = App.todayKey();
      return Store.plans(studentId).filter(function (p) { return p.date > t; })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    },
    addPlan: function (p) {
      var plan = Object.assign({
        id: uid('pl'), studentId: Store.get().currentStudentId, level: 'easy',
        area: 'indoor', activityId: null, cardId: null, partnerId: null,
        date: App.todayKey(), time: '', place: '', supplies: [], memo: '',
        createdAt: Date.now(), doneDiaryId: null, isSample: false
      }, p);
      if (!plan.cardId && plan.activityId) plan.cardId = App.cardIdOf(plan.activityId);
      set(function (x) { x.plans = x.plans.concat([plan]); });
      return plan.id;
    },
    updatePlan: function (id, patch) {
      set(function (x) {
        x.plans = x.plans.map(function (p) { return p.id === id ? Object.assign({}, p, patch) : p; });
      });
    },
    removePlan: function (id) {
      set(function (x) { x.plans = x.plans.filter(function (p) { return p.id !== id; }); });
    },

    /* --------------- 일기 --------------- */
    diaries: function (studentId) {
      var sid = studentId || Store.get().currentStudentId;
      return Store.get().diaries.filter(function (d) { return d.studentId === sid; })
        .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0); });
    },
    diary: function (id) {
      var list = Store.get().diaries;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },
    diariesInRange: function (studentId, from, to) {
      return Store.diaries(studentId).filter(function (d) {
        return (!from || d.date >= from) && (!to || d.date <= to);
      });
    },
    addDiary: function (d) {
      var diary = Object.assign({
        id: uid('dy'), studentId: Store.get().currentStudentId, planId: null, level: 1,
        date: App.todayKey(), activityId: null, cardId: null, partnerId: null, place: '',
        moodIds: [], againId: null, title: '', text: '', weather: '', frames: {}, photoIds: [],
        picKind: 'app', mainPhotoId: null, drawPhotoId: null, bodyEdit: null,
        exhibit: false, createdAt: Date.now(), updatedAt: Date.now(), isSample: false
      }, d);
      if (!diary.cardId && diary.activityId) diary.cardId = App.cardIdOf(diary.activityId);
      set(function (x) {
        x.diaries = x.diaries.concat([diary]);
        if (diary.planId) {
          x.plans = x.plans.map(function (p) {
            return p.id === diary.planId ? Object.assign({}, p, { doneDiaryId: diary.id }) : p;
          });
        }
      });
      /* 일기를 저장하면 해당 활동에 '해봤어요' 발자국이 자동으로 생깁니다. */
      if (diary.cardId) Store.setMapState(diary.studentId, diary.cardId, { tried: true });
      return diary.id;
    },
    updateDiary: function (id, patch) {
      set(function (x) {
        x.diaries = x.diaries.map(function (d) {
          return d.id === id ? Object.assign({}, d, patch, { updatedAt: Date.now() }) : d;
        });
      });
    },
    removeDiary: function (id) {
      var d = Store.diary(id);
      set(function (x) {
        x.diaries = x.diaries.filter(function (y) { return y.id !== id; });
        x.plans = x.plans.map(function (p) {
          return p.doneDiaryId === id ? Object.assign({}, p, { doneDiaryId: null }) : p;
        });
      });
      if (d && App.photos) {
        (d.photoIds || []).forEach(function (pid) { App.photos.remove(pid); });
        /* ★ 손글씨 두 장도 함께 지웁니다 (2026-08-26).
             예전에는 photoIds·drawPhotoId 만 지워서, 가장 큰
             원고지 손글씨(paperPhotoId)·손글씨 일기(writePhotoId)가
             일기를 지워도 보관소에 그대로 쌓였습니다. */
        if (d.drawPhotoId) App.photos.remove(d.drawPhotoId);
        if (d.paperPhotoId) App.photos.remove(d.paperPhotoId);
        if (d.writePhotoId) App.photos.remove(d.writePhotoId);
        /* 그림일기 위에 바로 쓴 글씨 (2026-08-26) */
        if (d.writeInkId) App.photos.remove(d.writeInkId);
      }
    },

    /* --------------- 여가 지도 --------------- */
    mapOf: function (studentId) {
      var sid = studentId || Store.get().currentStudentId;
      return Store.get().map[sid] || {};
    },
    statusOf: function (studentId, cardId) {
      var m = Store.mapOf(studentId);
      return m[cardId] || { tried: false, like: false, challenge: false, unsure: false };
    },
    setMapState: function (studentId, cardId, patch) {
      var sid = studentId || Store.get().currentStudentId;
      set(function (x) {
        var m = Object.assign({}, x.map);
        var forStudent = Object.assign({}, m[sid] || {});
        var cur = forStudent[cardId] || { tried: false, like: false, challenge: false, unsure: false };
        forStudent[cardId] = Object.assign({}, cur, patch, { updatedAt: Date.now() });
        m[sid] = forStudent;
        x.map = m;
      });
    },
    toggleMapState: function (studentId, cardId, key) {
      var cur = Store.statusOf(studentId, cardId);
      var patch = {}; patch[key] = !cur[key];
      Store.setMapState(studentId, cardId, patch);
    },

    /* --------------- 예시 자료 / 초기화 --------------- */
    hasSamples: function () {
      var st = Store.get();
      return st.students.some(function (s) { return s.isSample; }) ||
             st.plans.some(function (p) { return p.isSample; }) ||
             st.diaries.some(function (d) { return d.isSample; });
    },
    removeSamples: function () {
      var st = Store.get();
      var sampleStudents = st.students.filter(function (s) { return s.isSample; }).map(function (s) { return s.id; });
      set(function (x) {
        x.students = x.students.filter(function (s) { return !s.isSample; });
        x.plans = x.plans.filter(function (p) { return !p.isSample && sampleStudents.indexOf(p.studentId) < 0; });
        x.diaries = x.diaries.filter(function (d) { return !d.isSample && sampleStudents.indexOf(d.studentId) < 0; });
        var m = Object.assign({}, x.map);
        sampleStudents.forEach(function (id) { delete m[id]; });
        x.map = m;
        if (!x.students.length) { x.currentStudentId = null; }
        else if (sampleStudents.indexOf(x.currentStudentId) >= 0) { x.currentStudentId = x.students[0].id; }
      });
      sampleStudents.forEach(function (id) { if (App.photos) App.photos.removeByStudent(id); });
    },
    resetAll: function () {
      state = emptyState();
      state = seed(state);
      saveNow();
      notify();
      if (App.photos) App.photos.clearAll();
    },

    /* --------------- 내보내기 / 불러오기 --------------- */
    exportData: function (studentId) {
      var st = Store.get();
      var students = studentId ? st.students.filter(function (s) { return s.id === studentId; }) : st.students;
      var ids = students.map(function (s) { return s.id; });
      var map = {};
      ids.forEach(function (id) { if (st.map[id]) map[id] = st.map[id]; });
      return {
        app: '나의 여가',
        version: 1,
        exportedAt: new Date().toISOString(),
        scope: studentId ? 'student' : 'all',
        students: students,
        plans: st.plans.filter(function (p) { return ids.indexOf(p.studentId) >= 0; }),
        diaries: st.diaries.filter(function (d) { return ids.indexOf(d.studentId) >= 0; }),
        map: map,
        /* ★ 선생님이 더한 것들도 함께 담습니다.
             예전에는 빠져 있어서, 백업을 다른 기기에서 불러오면
             **우리 반 활동 · 사람 · 기분이 통째로 사라졌습니다.**
             학생 기록은 그것들을 id 로 가리키므로, 함께 옮기지 않으면
             일기에 활동 이름이 안 나오고 문장도 비어 버립니다. */
        customActivities: (st.customActivities || []).slice(),
        customPartners: (st.customPartners || []).slice(),
        customMoods: (st.customMoods || []).slice(),
        photos: App.photos ? App.photos.exportRecords(studentId) : []
      };
    },
    /* mode : 'merge' (덧붙이기) | 'replace' (모두 바꾸기) */
    importData: function (data, mode) {
      /* ★ 파일 검증 (2026-08-26) : 예전에는 students 배열만 있으면 무엇이든
           들어와서, 다른 앱의 JSON 을 골라도 조용히 섞였습니다.
         ▸ app 표시가 있으면 이 앱 것인지 보고, 없으면(아주 옛 백업)
           학생 record 가 이 앱 모양(id·name)인지 봅니다. */
      if (!data || !Array.isArray(data.students)) throw new Error('불러올 수 있는 파일이 아니에요.');
      if (data.app && data.app !== '나의 여가') throw new Error('이 파일은 「나의 여가」 백업이 아니에요.');
      var looksRight = data.students.every(function (s) {
        return s && typeof s === 'object' && typeof s.id === 'string';
      });
      if (!looksRight) throw new Error('불러올 수 있는 파일이 아니에요.');
      var incoming = data.students.map(function (s) { return Object.assign(newStudent({}), s); });

      if (mode === 'replace') {
        state = emptyState();
        state.students = incoming;
        state.plans = (data.plans || []).slice();
        state.diaries = (data.diaries || []).slice();
        state.map = Object.assign({}, data.map || {});
        state.customActivities = (data.customActivities || []).slice();
        state.customPartners = (data.customPartners || []).slice();
        state.customMoods = (data.customMoods || []).slice();
        syncCustom();                     // 목록에 바로 반영
        state.currentStudentId = incoming.length ? incoming[0].id : null;
        state.seeded = true;
        saveNow(); notify();
        if (App.photos) {
          return App.photos.clearAll().then(function () {
            return App.photos.importRecords(data.photos || [], null);
          });
        }
        return Promise.resolve();
      }

      /* ══════════ 덧붙이기 — **id 가 같으면 같은 것** (2026-08-26 개편) ══════════
         ★ 예전에는 id 가 겹치면 **새 id 를 부여**했습니다. 그래서
           · 같은 백업을 두 번 불러오면 학생·계획·일기가 **두 벌**이 되고
           · 계획·일기 id 를 늘 새로 매기면서 **doneDiaryId(계획↔일기 연결)가
             끊어져** 「✓ 일기까지 마쳤어요」 가 거짓으로 나왔고
           · 두 벌이 **같은 사진 id** 를 가리켜, 한 벌을 지우면
             남은 벌의 사진까지 사라졌습니다.
         ▸ id 는 무작위(uid)라 **다른 자료끼리 우연히 겹칠 일이 사실상 없습니다.**
           그러므로 id 가 같다 = 같은 백업에서 온 같은 기록입니다. 건너뜁니다.
           (예시 자료의 고정 id 들도 같은 원리로 두 벌이 되지 않습니다)
         ▸ id 를 그대로 두므로 planId · doneDiaryId 연결도 **저절로** 유지됩니다.
         ⛔ 다시 「겹치면 새 id」 로 되돌리지 마세요 — 위 세 가지가 다시 생깁니다. */
      var st = Store.get();
      var haveStu = {}, havePlan = {}, haveDiary = {};
      st.students.forEach(function (s) { haveStu[s.id] = true; });
      st.plans.forEach(function (p) { havePlan[p.id] = true; });
      st.diaries.forEach(function (d) { haveDiary[d.id] = true; });

      var newStudents = incoming.filter(function (s) { return !haveStu[s.id]; });
      var plans = (data.plans || []).filter(function (p) {
        return p && p.id && !havePlan[p.id];
      }).map(function (p) { return Object.assign({}, p); });
      var diaries = (data.diaries || []).filter(function (d) {
        return d && d.id && !haveDiary[d.id];
      }).map(function (d) { return Object.assign({}, d); });

      set(function (x) {
        x.students = x.students.concat(newStudents);
        x.plans = x.plans.concat(plans);
        x.diaries = x.diaries.concat(diaries);
        /* 지도 표시는 칸마다 **더 새것(updatedAt)** 을 남깁니다 —
           옛 백업을 다시 불러와도 지금 표시가 옛것으로 되돌아가지 않습니다. */
        var m = Object.assign({}, x.map);
        Object.keys(data.map || {}).forEach(function (k) {
          var cur = m[k] || {}, inc = data.map[k] || {};
          var merged = Object.assign({}, cur);
          Object.keys(inc).forEach(function (cid) {
            var a = cur[cid], b = inc[cid];
            merged[cid] = (!a || ((b && b.updatedAt) || 0) >= ((a && a.updatedAt) || 0)) ? b : a;
          });
          m[k] = merged;
        });
        x.map = m;
        /* 더한 것들은 **id 가 같으면 이미 있는 것**이라 건너뜁니다.
           id 를 새로 매기면 학생 기록이 가리키던 것과 끊어집니다. */
        ['customActivities', 'customPartners', 'customMoods'].forEach(function (k) {
          var have = {};
          (x[k] || []).forEach(function (o) { have[o.id] = true; });
          var add = (data[k] || []).filter(function (o) { return o && o.id && !have[o.id]; });
          if (add.length) x[k] = (x[k] || []).concat(add);
        });
        if (!x.currentStudentId && x.students.length) x.currentStudentId = x.students[0].id;
      });
      /* 사진도 id 그대로 — 같은 id 는 같은 사진이라 덮어써도 잃는 것이 없습니다 */
      if (App.photos) return App.photos.importRecords(data.photos || [], null);
      return Promise.resolve();
    }
  };

  App.store = Store;
})();
