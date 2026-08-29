/* ===========================================================
   나의 여가 — 음성 안내
   브라우저에 들어 있는 Speech Synthesis 기능만 사용합니다.
   외부 음성 API 를 쓰지 않으며, 음성이 없는 브라우저에서도
   오류 없이 글자로만 사용할 수 있습니다.
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});

  var synth = (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null;
  var voices = [];
  var picked = null;
  var listeners = [];

  /* 어떤 목소리로 읽을지 (선생님 설정에서 고릅니다). 비어 있으면 저절로 고릅니다. */
  var wantName = null;
  try { wantName = window.localStorage.getItem('naui-yeoga.voice') || null; } catch (e) {}

  /* ★ **한국어 목소리가 여럿일 때 무엇을 고르나** (2026-08-29 · 선생님 말씀 —
       「스피커로 말하는 목소리를 … 읽어주는 목소리와 동일했으면해」).
     ⚠ 예전에는 **맨 처음 찾은 것**을 그냥 썼습니다. 그런데 기기에 한국어
       목소리가 여럿 깔려 있으면(삼성 TTS · 구글 TTS · 마이크로소프트 …)
       **그 차례가 기기마다·판마다 다릅니다.** 그래서 같은 앱인데 태블릿과
       노트북의 목소리가 달랐습니다.
     ▸ 이제 둘을 차례로 봅니다 :
         ① 선생님이 고른 목소리 (이름이 정확히 맞는 것)
         ② 없으면 **맨 처음 한국어 목소리** — 다른 앱들과 같은 방식입니다
     ⚠ 한때 「구글을 먼저」로 두었다가 되돌렸습니다 (2026-08-29).
       선생님이 쓰시는 **고문구마켓**은 맨 처음 한국어 목소리를 씁니다
       (노트북에서 Microsoft Heami - Korean (Korean)).
       구글을 먼저 고르면 그 앱과 **오히려 달라집니다.**
       ⛔ 「어느 목소리가 더 좋은가」로 정하지 마세요. 학생이 하루에도 여러 앱을
         오가므로 **다른 앱과 같은 목소리**인 것이 훨씬 중요합니다.
     ▸ 고른 이름은 기기에 남겨 둡니다 — 학생마다가 아니라 **기기마다**입니다.
       한 태블릿을 여러 학생이 돌려 쓰므로 기기에 두는 것이 맞습니다. */
  function refresh() {
    if (!synth) return;
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    var ko = voices.filter(function (v) {
      var lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang === 'ko-kr' || lang.indexOf('ko') === 0;
    });
    picked = null;
    if (wantName) {
      for (var i = 0; i < ko.length; i++) if (ko[i].name === wantName) { picked = ko[i]; break; }
    }
    if (!picked && ko.length) picked = ko[0];
    emit();
  }

  /* 이 기기에서 쓸 수 있는 한국어 목소리 목록 (선생님 설정에서 보여 줍니다) */
  function koVoices() {
    return voices.filter(function (v) {
      var lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang === 'ko-kr' || lang.indexOf('ko') === 0;
    });
  }
  if (synth) {
    refresh();
    try { synth.addEventListener('voiceschanged', refresh); }
    catch (e) { synth.onvoiceschanged = refresh; }
  }

  var Speech = {
    /* 이 브라우저에서 음성 안내를 쓸 수 있는지 */
    supported: function () { return !!(synth && typeof window.SpeechSynthesisUtterance === 'function'); },
    speaking: false,

    speak: function (text, opts) {
      if (!Speech.supported() || !text) return false;
      var t = String(text).replace(/\s+/g, ' ').trim();
      if (!t) return false;
      try {
        synth.cancel();
        var u = new window.SpeechSynthesisUtterance(t);
        u.lang = 'ko-KR';
        if (picked) u.voice = picked;
        u.rate = (opts && opts.rate) || 0.94;    // 천천히
        u.pitch = (opts && opts.pitch) || 1.0;
        u.volume = 1;
        u.onstart = function () { Speech.speaking = true; emit(); };
        u.onend = u.onerror = function () { Speech.speaking = false; emit(); };
        synth.speak(u);
        return true;
      } catch (e) { return false; }
    },
    stop: function () {
      if (!synth) return;
      try { synth.cancel(); } catch (e) {}
      Speech.speaking = false; emit();
    },
    /* 이 기기에서 쓸 수 있는 한국어 목소리 */
    voices: function () { return koVoices(); },
    /* 기기에 깔린 목소리 수 — 다른 앱과 견줘 보실 수 있게 설정에 보여 줍니다 */
    voiceCount: function () { return { all: voices.length, ko: koVoices().length }; },
    /* 지금 쓰는 목소리 이름 */
    voiceName: function () { return picked ? picked.name : null; },
    /* 목소리 고르기 (null 이면 저절로 고르기로 되돌림) */
    setVoice: function (name) {
      wantName = name || null;
      try {
        if (wantName) window.localStorage.setItem('naui-yeoga.voice', wantName);
        else window.localStorage.removeItem('naui-yeoga.voice');
      } catch (e) {}
      refresh();
    },
    onChange: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    }
  };
  function emit() { listeners.slice().forEach(function (f) { try { f(); } catch (e) {} }); }

  /* 화면을 떠날 때 읽기를 멈춥니다 */
  window.addEventListener('beforeunload', function () { Speech.stop(); });

  App.speech = Speech;

  /* ===========================================================
     칭찬 소리
     -----------------------------------------------------------
     음성과 별개로, 잘 해냈을 때 짧게 울리는 소리입니다.
     소리 파일을 따로 두지 않고 브라우저가 직접 음을 만듭니다
     (파일이 없어도 되고, 인터넷도 필요 없습니다).
     선생님 설정에서 음성 안내를 끈 학생에게는 울리지 않습니다.
     =========================================================== */
  var ctx = null;
  function audio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } }
    /* 브라우저가 소리를 잠가 두었으면 깨웁니다 (학생이 화면을 누른 뒤에는 풀립니다) */
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  /* 도-미-솔-도 로 짧게 올라가는 소리 */
  var CHEER = [523.25, 659.25, 783.99, 1046.5];

  App.sound = {
    /* 잘 해냈을 때 : 맑게 올라가는 소리 */
    cheer: function () {
      var c = audio(); if (!c) return;
      try {
        CHEER.forEach(function (hz, i) {
          var t0 = c.currentTime + i * 0.10;
          var osc = c.createOscillator(), g = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(hz, t0);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
          osc.connect(g); g.connect(c.destination);
          osc.start(t0); osc.stop(t0 + 0.3);
        });
      } catch (e) {}
    },
    /* 하나 골랐을 때 : 아주 짧게 '톡' */
    tap: function () {
      var c = audio(); if (!c) return;
      try {
        var t0 = c.currentTime;
        var osc = c.createOscillator(), g = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.10, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        osc.connect(g); g.connect(c.destination);
        osc.start(t0); osc.stop(t0 + 0.14);
      } catch (e) {}
    }
  };

  /* 학생 설정(음성 안내)을 따르는 칭찬 소리 */
  App.cheerFor = function (student) {
    if (student && student.voice === false) return;
    App.sound.cheer();
  };
})();
