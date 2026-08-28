/* ===========================================================
   나의 여가 — 사진 보관소
   -----------------------------------------------------------
   · 사진은 용량이 크므로 IndexedDB 에 저장합니다.
   · IndexedDB 를 쓸 수 없는 환경(일부 브라우저의 file:// 등)에서는
     자동으로 localStorage 로 되돌아가 동작합니다.
   · 업로드한 사진은 저장 전에 긴 변 1000px 로 줄입니다.
   · 어떤 경우에도 사진은 기기 밖으로 나가지 않습니다.
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});

  var DB_NAME = 'naui-yeoga-photos';
  var STORE = 'photos';
  var LS_KEY = 'naui-yeoga.photos.fallback';
  var MAX_SIDE = 1000;
  var QUALITY = 0.78;

  var db = null;
  var useFallback = false;
  var cache = {};          // id → { id, studentId, dataUrl, createdAt }
  var readyPromise = null;

  function openDB() {
    return new Promise(function (resolve) {
      var req;
      try {
        if (!window.indexedDB) throw new Error('no indexedDB');
        req = window.indexedDB.open(DB_NAME, 1);
      } catch (e) { useFallback = true; return resolve(null); }

      var settled = false;
      var guard = setTimeout(function () {
        if (!settled) { settled = true; useFallback = true; resolve(null); }
      }, 2500);

      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          var os = d.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('studentId', 'studentId', { unique: false });
        }
      };
      req.onsuccess = function () {
        if (settled) return; settled = true; clearTimeout(guard);
        db = req.result; resolve(db);
      };
      req.onerror = req.onblocked = function () {
        if (settled) return; settled = true; clearTimeout(guard);
        useFallback = true; resolve(null);
      };
    });
  }

  function readFallback() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function writeFallback() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); return true; }
    catch (e) { return false; }
  }

  function loadAll() {
    return new Promise(function (resolve) {
      if (useFallback || !db) { cache = readFallback(); return resolve(cache); }
      try {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () {
          cache = {};
          (req.result || []).forEach(function (r) { cache[r.id] = r; });
          resolve(cache);
        };
        req.onerror = function () { useFallback = true; cache = readFallback(); resolve(cache); };
      } catch (e) { useFallback = true; cache = readFallback(); resolve(cache); }
    });
  }

  function txPut(rec) {
    return new Promise(function (resolve) {
      if (useFallback || !db) { return resolve(writeFallback()); }
      try {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(rec);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { useFallback = true; resolve(writeFallback()); };
      } catch (e) { useFallback = true; resolve(writeFallback()); }
    });
  }
  function txDel(id) {
    return new Promise(function (resolve) {
      if (useFallback || !db) { return resolve(writeFallback()); }
      try {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE)['delete'](id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
  }

  var Photos = {
    /* 앱 시작 시 한 번 호출 */
    init: function () {
      if (readyPromise) return readyPromise;
      readyPromise = openDB().then(loadAll);
      return readyPromise;
    },
    isFallback: function () { return useFallback; },

    /* 화면에 바로 쓰는 동기 조회 (init 이후) */
    url: function (id) { var r = cache[id]; return r ? r.dataUrl : null; },
    has: function (id) { return !!cache[id]; },
    count: function () { return Object.keys(cache).length; },

    /* 파일을 줄여서 저장 → id 를 돌려줍니다 */
    addFile: function (file, studentId, kind) {
      return Photos.resize(file).then(function (dataUrl) {
        return Photos.addDataUrl(dataUrl, studentId, kind);
      });
    },
    addDataUrl: function (dataUrl, studentId, kind) {
      var rec = {
        id: 'ph_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        studentId: studentId || null,
        kind: kind || 'activity',      // 'activity' 활동 사진 | 'work' 작품 사진
        dataUrl: dataUrl,
        createdAt: Date.now()
      };
      cache[rec.id] = rec;
      return txPut(rec).then(function (ok) {
        if (!ok) { delete cache[rec.id]; throw new Error('사진을 저장하지 못했어요.'); }
        return rec.id;
      });
    },
    remove: function (id) {
      delete cache[id];
      return txDel(id);
    },
    removeByStudent: function (studentId) {
      var ids = Object.keys(cache).filter(function (k) { return cache[k].studentId === studentId; });
      return Promise.all(ids.map(function (id) { return Photos.remove(id); }));
    },
    clearAll: function () {
      var ids = Object.keys(cache);
      return Promise.all(ids.map(function (id) { return Photos.remove(id); }));
    },

    /* 내보내기 / 불러오기 */
    /* ★ 학생 한 명만 백업할 때에도 **학급 그림은 늘 담습니다** (2026-08-28).
         `우리 반 활동` 에 직접 넣은 그림은 어느 한 학생 것이 아니라
         `studentId` 가 비어 있습니다. 학생으로만 걸러 내면 그 그림이
         빠져서, 다른 컴퓨터에서 불러왔을 때 **활동은 있는데 그림만
         사라집니다** (활동 자체는 customActivities 로 늘 함께 갑니다).
       ⛔ 이 `!r.studentId` 조건을 빼지 마세요. */
    exportRecords: function (studentId) {
      return Object.keys(cache).map(function (k) { return cache[k]; })
        .filter(function (r) { return !studentId || !r.studentId || r.studentId === studentId; });
    },
    importRecords: function (records, idMap) {
      var jobs = (records || []).map(function (r) {
        var rec = {
          id: r.id, studentId: (idMap && idMap[r.studentId]) || r.studentId,
          kind: r.kind || 'activity', dataUrl: r.dataUrl, createdAt: r.createdAt || Date.now()
        };
        if (!rec.dataUrl) return Promise.resolve();
        cache[rec.id] = rec;
        return txPut(rec);
      });
      return Promise.all(jobs);
    },

    /* 이미지 축소 : 긴 변 1000px, JPEG 품질 0.78 */
    resize: function (file) {
      return new Promise(function (resolve, reject) {
        if (!file) return reject(new Error('사진 파일이 없어요.'));
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('사진을 읽지 못했어요.')); };
        reader.onload = function () {
          var img = new Image();
          img.onerror = function () { reject(new Error('사진 형식을 읽지 못했어요.')); };
          img.onload = function () {
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale));
            var ch = Math.max(1, Math.round(h * scale));
            var cv = document.createElement('canvas');
            cv.width = cw; cv.height = ch;
            var ctx = cv.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            var out;
            try { out = cv.toDataURL('image/jpeg', QUALITY); }
            catch (e) { out = reader.result; }
            resolve(out);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  App.photos = Photos;
})();
