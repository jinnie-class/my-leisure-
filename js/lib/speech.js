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

  function refresh() {
    if (!synth) return;
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    picked = null;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      var lang = (v.lang || '').toLowerCase().replace('_', '-');
      if (lang === 'ko-kr' || lang.indexOf('ko') === 0) { picked = v; break; }
    }
  }
  if (synth) {
    refresh();
    try { synth.addEventListener('voiceschanged', refresh); }
    catch (e) { synth.onvoiceschanged = refresh; }
  }

  var Speech = {
    /* 이 브라우저에서 음성 안내를 쓸 수 있는지 */
    supported: function () { return !!(synth && typeof window.SpeechSynthesisUtterance === 'function'); },
    hasKorean: function () { return !!picked; },
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
