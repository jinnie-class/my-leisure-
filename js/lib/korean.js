/* ===========================================================
   나의 여가 — 자연스러운 한국어 문장 만들기
   조사(은/는, 이/가, 을/를, 와/과) 처리와 날짜 표현, 문장 조립을 담당합니다.
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});

  /* ------------------------- 받침 판별 ------------------------- */
  /* 숫자·영문으로 끝나는 낱말의 받침 여부 */
  var TAIL_DIGIT = { '0': true, '1': true, '3': true, '6': true, '7': true, '8': true,
                     '2': false, '4': false, '5': false, '9': false };
  var TAIL_ALPHA = { l: true, m: true, n: true, r: true, g: true, b: true, k: true,
                     p: true, t: true, c: true, s: true, x: true, z: true };

  function lastChar(word) {
    var w = String(word == null ? '' : word).replace(/[\s.,!?)"'\]]+$/, '');
    return w.charAt(w.length - 1);
  }

  /* 받침이 있으면 true. 'ㄹ' 받침이면 'rieul' 을 함께 알려 줍니다. */
  function batchimInfo(word) {
    var ch = lastChar(word);
    if (!ch) return { has: false, rieul: false };
    var code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      var t = (code - 0xac00) % 28;
      return { has: t !== 0, rieul: t === 8 };
    }
    if (ch >= '0' && ch <= '9') return { has: !!TAIL_DIGIT[ch], rieul: ch === '1' };
    var lower = ch.toLowerCase();
    if (lower >= 'a' && lower <= 'z') return { has: !!TAIL_ALPHA[lower], rieul: lower === 'l' };
    return { has: false, rieul: false };   // 기호 등은 받침 없음으로 처리
  }

  App.hasBatchim = function (w) { return batchimInfo(w).has; };

  /* 낱말 + 조사 : App.josa('슬라임', '을/를') → '슬라임을' */
  App.josa = function (word, pair) {
    var w = String(word == null ? '' : word);
    if (!w) return '';
    var info = batchimInfo(w);
    var parts = String(pair).split('/');
    var withB = parts[0], withoutB = parts[1] || parts[0];
    if (pair === '으로/로') return w + (info.has && !info.rieul ? '으로' : '로');
    return w + (info.has ? withB : withoutB);
  };
  App.eunNeun = function (w) { return App.josa(w, '은/는'); };
  App.iGa = function (w) { return App.josa(w, '이/가'); };
  App.eulReul = function (w) { return App.josa(w, '을/를'); };
  App.waGwa = function (w) { return App.josa(w, '과/와'); };
  App.iEyo = function (w) { return App.josa(w, '이에요/예요'); };

  /* 목록을 '가위, 풀, 색종이' 처럼 잇기 */
  App.joinList = function (arr, sep) {
    return (arr || []).filter(Boolean).join(sep || ', ');
  };
  /* 목록을 '보드게임과 요리' 처럼 잇기 */
  App.joinAnd = function (arr) {
    var a = (arr || []).filter(Boolean);
    if (a.length === 0) return '';
    if (a.length === 1) return a[0];
    var head = a.slice(0, -1), tail = a[a.length - 1];
    return head.map(function (w) { return App.waGwa(w); }).join(' ') + ' ' + tail;
  };

  /* ------------------------- 날짜 ------------------------- */
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  App.todayKey = function () { return App.dateKey(new Date()); };
  App.dateKey = function (d) {
    var x = (d instanceof Date) ? d : new Date(d);
    var m = x.getMonth() + 1, day = x.getDate();
    return x.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  };
  App.parseKey = function (key) {
    var p = String(key || '').split('-');
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  };
  App.addDays = function (key, n) {
    var d = App.parseKey(key); d.setDate(d.getDate() + n); return App.dateKey(d);
  };
  App.addMonths = function (key, n) {
    var d = App.parseKey(key); d.setMonth(d.getMonth() + n); return App.dateKey(d);
  };
  /* '2026년 8월 15일 토요일' */
  App.fmtDateLong = function (key) {
    var d = App.parseKey(key);
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WEEK[d.getDay()] + '요일';
  };
  /* '8월 15일' */
  App.fmtDateShort = function (key) {
    var d = App.parseKey(key);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  };
  /* 오늘/내일/어제 */
  App.dayWord = function (key) {
    var t = App.todayKey();
    if (key === t) return '오늘';
    if (key === App.addDays(t, 1)) return '내일';
    if (key === App.addDays(t, -1)) return '어제';
    return null;
  };
  /* 시간대 표현 : 'morning' | 'day' | 'evening' | 'HH:MM' | ''
     ★ `오전 / 오후` 에서 **`아침 / 낮 / 저녁`** 으로 바꿨습니다.
       '오전' 은 학생에게 추상적입니다. 해가 어디 있는지로 알 수 있는 말이
       특수교육대상학생에게 훨씬 구체적이고, 그림으로도 분명하게 그려집니다.
     ※ 예전 기록의 `am` · `pm` 도 그대로 읽습니다 (`am`→아침, `pm`→낮).
       예전 일기를 열었을 때 시간이 사라지지 않게 하기 위한 것입니다. */
  var TIME_WORDS = {
    morning: '아침', day: '낮', evening: '저녁',
    am: '아침', pm: '낮'                       // ← 예전 기록 읽기용
  };
  App.timeWord = function (time) {
    if (!time) return '';
    if (TIME_WORDS[time]) return TIME_WORDS[time];
    var m = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!m) return String(time);
    var h = +m[1], mi = +m[2];
    /* 직접 적은 시각은 아침(~11시) · 낮(~17시) · 저녁 으로 갈라 읽어 줍니다 */
    var part = h < 12 ? '아침' : (h < 18 ? '낮' : '저녁');
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return part + ' ' + h12 + '시' + (mi ? ' ' + mi + '분' : '');
  };
  /* 문장 앞에 들어갈 때 표현 : '오늘', '8월 20일 오후에' */
  App.whenPhrase = function (key, time) {
    var day = App.dayWord(key) || App.fmtDateShort(key);
    var tw = App.timeWord(time);
    if (tw) return day + ' ' + tw + '에';
    return App.dayWord(key) ? day : day + '에';
  };

  /* ------------------------- 문장 조립 ------------------------- */
  var S = (App.sentences = {});

  /* 함께한 사람을 문장에 넣습니다.
     ★ **여러 명**을 골랐을 수도 있습니다 (계획에서 여러 명 고르기).
       `엄마와 아빠와 함께` 처럼 조사를 붙여 잇습니다.
       `혼자` 는 다른 사람과 같이 고를 수 없는 말이라, 섞여 있으면 빼고 씁니다.
     ※ 예전 기록은 `partnerId` 하나만 있으니 그것도 그대로 읽습니다. */
  function partnerPhrase(partnerId, partnerIds) {
    var ids = (partnerIds && partnerIds.length) ? partnerIds : (partnerId ? [partnerId] : []);
    var list = ids.map(function (id) { return App.partner(id); }).filter(Boolean);
    if (!list.length) return '';
    if (list.length === 1) return list[0].phrase;
    /* 여러 명이면 '혼자' 는 뜻이 어긋나므로 뺍니다 */
    var many = list.filter(function (p) { return p.id !== 'alone'; });
    if (!many.length) return list[0].phrase;
    if (many.length === 1) return many[0].phrase;
    /* ※ `App.waGwa(w)` 는 **낱말까지 함께** 돌려줍니다 (`엄마` → `엄마와`).
         앞에 `p.name` 을 또 붙이면 `엄마엄마와` 가 됩니다. */
    return many.map(function (p) { return App.waGwa(p.name); }).join(' ') + ' 함께';
  }

  /* ---------------------------------------------------------------
     함께하는 사람을 **읽어 줄** 말
     ---------------------------------------------------------------
     ★ 왜 낱말 그대로 읽지 않나 :
       예전에는 `엄마` · `아빠` 처럼 **낱말 하나만** 읽어 주었습니다.
       그런데 윈도우의 한국어 목소리(Microsoft Heami)는 두 글자 짧은 낱말을
       말끝이 올라가는 이상한 가락으로 읽습니다. 특히 `엄마` · `아빠` 처럼
       된소리·콧소리가 들어간 말이 심합니다.
       **짧은 문장으로 만들어 주면** 가락이 자연스러워집니다.
       (`혼자` 는 `혼자 함께` 가 되면 말이 안 되므로 따로 다룹니다)
     ▸ 덧붙여, 조사까지 들려 주니 학생이 `엄마와` 라는 말꼴도 함께 익힙니다.
     --------------------------------------------------------------- */
  /* 계획을 세우는 도중에도 쓰려고 밖으로 내보냅니다
     (plan.js 의 `지금까지 만들어진 한 문장`). */
  App.partnerPhrase = partnerPhrase;

  /* ─────────────────────────────────────────────────────────────
     `가족과 함께` 처럼 **함께까지 붙인** 말을 만듭니다.
     ─────────────────────────────────────────────────────────────
     ★ 이 규칙이 여러 곳에 흩어져 있었습니다. 그림일기 아래 알약만
       `${partner.name}와 함께` 로 **`와` 를 못박아** 두어서, 받침이 있는
       이름에서 `가족와 함께` 가 나왔습니다.
     ⚠ 그리고 `혼자` 는 사람 이름이 아니라 **혼자 했다는 말**입니다.
       `혼자와 함께` 는 말이 되지 않습니다 (인수인계 14-7 에서 한 번 고쳤던 함정).
     ▸ 그래서 **한 곳에 모아 둡니다.** 새로 쓰는 곳은 반드시 이것을 쓰세요.
       손으로 `와`·`과` 를 붙이지 마세요. */
  /* `혼자` 인지 가리는 것도 한 곳에서 — 3단계는 학생이 손으로 `혼자` 라고 씁니다.
     id(`alone`)로만 가리면 손으로 쓴 `혼자` 를 놓쳐 `혼자와 함께` 가 됩니다. */
  App.isAloneWord = function (name) {
    return String(name == null ? '' : name).trim() === '혼자';
  };
  App.withPhrase = function (name) {
    var w = String(name == null ? '' : name).trim();
    if (!w) return '';
    if (App.isAloneWord(w)) return '혼자';
    if (/함께$/.test(w)) return w;          // 이미 붙어 있으면 그대로
    return App.waGwa(w) + ' 함께';
  };

  /* 고른 사람(여러 명 포함)으로 `엄마와 아빠와 함께` 를 만듭니다 */
  App.partnerWith = function (partnerId, partnerIds) {
    var pp = partnerPhrase(partnerId, partnerIds);
    if (!pp) return '';
    if (pp === '혼자') return '혼자';
    if (/함께$/.test(pp)) return pp;        // 여러 명이면 partnerPhrase 가 이미 붙였습니다
    return pp + ' 함께';                    // 한 명이면 `가족과` → `가족과 함께`
  };

  App.partnerSpeech = function (pt) {
    if (!pt) return '';
    if (pt.id === 'alone') return '혼자 할 거예요';
    return pt.phrase + ' 함께 할 거예요';       // 엄마와 함께 할 거예요
  };
  /* 일기(지난 일)에서 읽어 줄 말 — 같은 이유로 문장으로 만듭니다 */
  App.partnerSpeechPast = function (pt) {
    if (!pt) return '';
    if (pt.id === 'alone') return '혼자 했어요';
    return pt.phrase + ' 함께 했어요';          // 엄마와 함께 했어요
  };

  /* 계획 문장 : "나는 오늘 친구와 슬라임 놀이를 할 거예요." */
  S.plan = function (plan) {
    if (!plan) return '';
    var a = App.act(plan.activityId);
    var bits = ['나는'];
    var when = App.whenPhrase(plan.date, plan.time);
    if (when) bits.push(when);
    var pp = partnerPhrase(plan.partnerId, plan.partnerIds);
    if (pp) bits.push(pp);
    /* ★ 장소도 문장에 넣습니다.
       예전에는 활동 이름이 `공원 가기` 처럼 장소를 담고 있어서, 장소를 또
       넣으면 `공원에서 공원 가기를` 이 되었습니다. 이제 활동 이름에서
       장소를 뺐으므로 `공원에서 공원 나들이를` 처럼 매끄럽게 이어집니다.
     ⚠ 계획하기 노란 바(sentenceSoFar)에는 장소가 나오는데 계획표에는
       안 나와서 둘이 서로 달랐습니다. */
    if (plan.place) bits.push(plan.place + '에서');
    bits.push(a ? a.planText : '여가활동을 할 거예요');
    return bits.join(' ') + '.';
  };

  /* 일기 첫 문장 : "나는 오늘 친구와 슬라임 놀이를 했어요." */
  S.diaryLead = function (d) {
    if (!d) return '';
    var a = App.act(d.activityId);
    var bits = ['나는'];
    var when = App.whenPhrase(d.date, '');
    if (when) bits.push(when);
    var pp = partnerPhrase(d.partnerId, d.partnerIds);
    if (pp) bits.push(pp);
    if (d.place) bits.push(d.place + '에서');
    bits.push(a ? a.diaryText : '여가활동을 했어요');
    return bits.join(' ') + '.';
  };

  /* 기분 문장 : "기분이 신나고 뿌듯했어요." */
  S.diaryMood = function (d) {
    var ids = (d && d.moodIds) || [];
    var ms = ids.map(App.mood).filter(Boolean);
    if (!ms.length) return '';
    if (ms.length === 1) return '기분이 ' + ms[0].past + '.';
    var head = ms.slice(0, -1).map(function (m) { return m.conn; });
    return '기분이 ' + head.join(' ') + ' ' + ms[ms.length - 1].past + '.';
  };

  /* 다시 하기 문장 */
  S.diaryAgain = function (d) {
    var a = App.again(d && d.againId);
    return a ? a.sentence + '.' : '';
  };

  /* 장소 문장 : "공원에서 했어요." (장소가 따로 적혀 있을 때만) */
  S.diaryPlace = function (d) {
    if (!d || !d.place) return '';
    return d.place + '에서 했어요.';
  };

  /* 1단계 일기 전체 문장
     ★ 「가장 기억에 남는 것」과 「다음에는」도 1단계에 넣었습니다
       (2026-08-24 · 선생님 말씀 — 돌아보기 네 줄에는 세 단계 모두 그 물음이
       있는데 일기에만 1단계가 빠져 있어 앞뒤가 맞지 않았습니다).
     ▸ 담기는 자리는 2단계와 **같은 곳**(frames.f3 · f4)입니다. 그래야
       단계를 올려도 쓴 것이 그대로 이어집니다.
     ⚠ `다음에는 …` 을 골랐으면 `또 하고 싶어요`(diaryAgain)는 넣지 않습니다.
       둘 다 넣으면 같은 말이 잇달아 두 번 나옵니다. 2단계도 그렇게 합니다. */
  S.diaryAutoLines = function (d) {
    var v = (d && d.frames) || {};
    var out = [S.diaryLead(d), S.diaryMood(d)];
    if (v.f3) out.push('가장 기억에 남는 것은 ' + App.iEyo(v.f3) + '.');
    if (v.f4) out.push('다음에는 ' + v.f4 + ' 하고 싶어요.');
    else out.push(S.diaryAgain(d));
    return out.filter(Boolean);
  };
  S.diaryAuto = function (d) { return S.diaryAutoLines(d).join(' '); };

  /* 기분 낱말은 '재미있었어요' 처럼 끝맺은 꼴로 씁니다.
     예전에는 줄기('재미있')만 저장하고 뒤에 '했어요' 를 붙였는데,
     그러면 '재미있했어요' · '화났했어요' 처럼 말이 안 되는 문장이 나왔습니다. */
  App.moodWord = function (w) {
    if (!w) return '';
    if (/요$/.test(w)) return w;                       // 이미 끝맺은 꼴
    var hit = null;
    (App.DATA.moods || []).forEach(function (m) {
      if (m.stem === w || m.name === w) hit = m;
    });
    return hit ? hit.past : w + '했어요';
  };

  /* 2단계 문장 틀을 채운 결과 */
  S.diaryFramesLines = function (d) {
    var v = (d && d.frames) || {};
    var a = App.act(d && d.activityId);
    var p = App.partner(d && d.partnerId);
    var out = [];
    var who = v.f1a || (p ? p.name : '');
    var what = v.f1b || (a ? a.name : '');
    /* ⚠ `혼자와 함께` 는 말이 되지 않습니다. `혼자` 는 사람 이름이 아니라
         **혼자 했다는 말**이라서, `과/와 함께` 를 붙이면 안 됩니다.
         `혼자 요가를 했어요.` 처럼 그대로 씁니다.
       ▸ 규칙은 App.withPhrase 한 곳에 있습니다 — 여기서 또 만들지 않습니다. */
    var withWho = App.withPhrase(who);
    if (withWho && what) out.push('나는 ' + withWho + ' ' + App.eulReul(what) + ' 했어요.');
    else if (what) out.push('나는 ' + App.eulReul(what) + ' 했어요.');
    else if (withWho) out.push('나는 ' + withWho + ' 했어요.');
    if (v.f2) out.push('활동을 하니 ' + App.moodWord(v.f2) + '.');
    if (v.f3) out.push('가장 기억에 남는 것은 ' + App.iEyo(v.f3) + '.');
    if (v.f4) out.push('다음에는 ' + v.f4 + ' 하고 싶어요.');
    return out;
  };
  S.diaryFrames = function (d) { return S.diaryFramesLines(d).join(' '); };

  /* 고른 낱말로 저절로 만들어진 문장 */
  S.diaryMadeLines = function (d) {
    if (!d || d.level === 3) return [];
    return d.level === 2 ? S.diaryFramesLines(d) : S.diaryAutoLines(d);
  };
  /* ★ 문장이 끝나면 **줄을 바꾸지 않고 한 칸 띄워** 이어 씁니다.
       일기는 원래 그렇게 씁니다. 문장마다 줄을 바꾸면 원고지에서
       **문장 하나하나가 새 문단**이 되어, 줄마다 첫 칸이 비고 줄 끝에도
       빈 칸이 줄줄이 남습니다 (규칙 2 — 새 문단은 첫 칸을 비움).
     ▸ 학생이 노란 칸에서 손수 줄을 바꾼 것(bodyEdit)은 그대로 둡니다.
       그때는 정말로 문단을 나눈 것이기 때문입니다. */
  S.diaryMade = function (d) { return S.diaryMadeLines(d).join(' '); };

  /* 학생 수준에 맞는 일기 본문
     bodyEdit : 학생이 점선 칸에서 직접 고쳐 쓴 문장. 있으면 그것을 씁니다. */
  S.diaryShown = function (d) {
    if (!d) return '';
    return (d.bodyEdit !== null && d.bodyEdit !== undefined && d.bodyEdit !== '')
      ? d.bodyEdit : S.diaryMade(d);
  };
  S.diaryBody = function (d) {
    if (!d) return '';
    if (d.level === 3) return d.text || '';
    /* 줄바꿈은 보여 줄 때만 쓰고, 본문으로 옮길 때에는 한 칸 띄우기로 바꿉니다 */
    return (S.diaryShown(d) + (d.text ? ' ' + d.text : ''))
      .replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
  };

  /* 활동 이름을 문장에 쓰기 좋게 줄인 형태 : '박물관 가기' → '박물관' */
  var TRIM = ['하기', ' 가기', '가기', ' 보기', '보기', ' 키우기', '키우기', ' 모으기'];
  App.shortName = function (a) {
    if (!a) return '';
    var n = a.name;
    for (var i = 0; i < TRIM.length; i++) {
      var t = TRIM[i];
      if (n.length > t.length && n.slice(-t.length) === t) {
        var cut = n.slice(0, n.length - t.length).trim();
        if (cut.length >= 2) return cut;
      }
    }
    return n;
  };

  /* 2단계 문장 틀 "______을/를 했어요" 의 빈칸에 넣기 좋은 낱말
     '캠핑하기' → '캠핑' 처럼 '하기'만 떼어 냅니다.
     ('박물관 가기' 등은 그대로 두어야 자연스럽습니다) */
  App.frameWord = function (a) {
    if (!a) return '';
    var n = a.name;
    if (n.length > 4 && n.slice(-2) === '하기') {
      var cut = n.slice(0, -2).trim();
      if (cut.length >= 2) return cut;
    }
    return n;
  };

  /* 여가지도 요약 문장 (학생 자신의 경험만 이야기합니다) */
  S.mapSummary = function (statusMap, cards) {
    var tried = [], like = [], challenge = [], unsure = 0;
    cards.forEach(function (c) {
      var st = statusMap[c.id];
      if (!st) return;
      if (st.tried) tried.push(App.shortName(c));
      if (st.like) like.push(App.shortName(c));
      if (st.challenge) challenge.push(App.shortName(c));
      if (st.unsure) unsure++;
    });
    var out = [];
    out.push(tried.length
      ? '나는 ' + tried.length + '가지 여가활동을 해봤어요.'
      : '아직 해봤어요 표시를 한 활동이 없어요. 활동을 하고 일기를 쓰면 발자국이 생겨요.');
    if (like.length) out.push('나는 ' + App.eulReul(App.joinAnd(like.slice(0, 4))) + ' 좋아해요.');
    if (challenge.length) out.push('나는 ' + App.joinAnd(challenge.slice(0, 4)) + '에 도전하고 싶어요.');
    if (unsure) out.push('아직 잘 모르겠다고 표시한 활동이 ' + unsure + '가지 있어요.');
    return out;
  };
})();
