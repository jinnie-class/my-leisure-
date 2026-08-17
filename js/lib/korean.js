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

  function partnerPhrase(partnerId) {
    var p = App.partner(partnerId);
    return p ? p.phrase : '';
  }

  /* 계획 문장 : "나는 오늘 친구와 슬라임 놀이를 할 거예요." */
  S.plan = function (plan) {
    if (!plan) return '';
    var a = App.act(plan.activityId);
    var bits = ['나는'];
    var when = App.whenPhrase(plan.date, plan.time);
    if (when) bits.push(when);
    var pp = partnerPhrase(plan.partnerId);
    if (pp) bits.push(pp);
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
    var pp = partnerPhrase(d.partnerId);
    if (pp) bits.push(pp);
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

  /* 1단계 일기 전체 문장 */
  S.diaryAutoLines = function (d) {
    return [S.diaryLead(d), S.diaryMood(d), S.diaryAgain(d)].filter(Boolean);
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
    if (who && what) out.push('나는 ' + App.waGwa(who) + ' 함께 ' + App.eulReul(what) + ' 했어요.');
    else if (what) out.push('나는 ' + App.eulReul(what) + ' 했어요.');
    else if (who) out.push('나는 ' + App.waGwa(who) + ' 함께 했어요.');
    if (v.f2) out.push('활동을 하니 ' + App.moodWord(v.f2) + '.');
    if (v.f3) out.push('가장 기억에 남는 것은 ' + App.iEyo(v.f3) + '.');
    if (v.f4) out.push('다음에는 ' + v.f4 + ' 하고 싶어요.');
    return out;
  };
  S.diaryFrames = function (d) { return S.diaryFramesLines(d).join(' '); };

  /* 고른 낱말로 저절로 만들어진 문장 — 노란 칸에는 '한 줄에 한 문장' 으로 보여 줍니다 */
  S.diaryMadeLines = function (d) {
    if (!d || d.level === 3) return [];
    return d.level === 2 ? S.diaryFramesLines(d) : S.diaryAutoLines(d);
  };
  S.diaryMade = function (d) { return S.diaryMadeLines(d).join('\n'); };

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
