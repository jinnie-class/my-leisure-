/* ===========================================================
   나의 여가 — 기본 SVG 그림
   PNG 그림이 없을 때에도 앱이 정상 작동하도록 쓰이는 기본 아이콘입니다.
   모든 그림은 48x48 좌표계, 짙은 갈색 윤곽선을 사용합니다.
   =========================================================== */
(function () {
  var App = (window.App = window.App || {});

  var L = '#8a6a4e';   // 윤곽선 (짙은 갈색)

  /* 얼굴 아이콘을 쉽게 만들기 위한 도우미 */
  function face(bg, inner) {
    return '<circle cx="24" cy="24" r="17" fill="' + bg + '"/>' + inner;
  }
  var EYES = '<circle cx="18" cy="21" r="2.1" fill="' + L + '" stroke="none"/><circle cx="30" cy="21" r="2.1" fill="' + L + '" stroke="none"/>';

  var ICONS = {
    /* ------------------------- 조작 아이콘 ------------------------- */
    speaker: '<path d="M12 19h6l8-6v22l-8-6h-6z" fill="#ffd9a8"/><path d="M32 18c3 3 3 9 0 12M36 14c5 5 5 15 0 20"/>',
    speakerOff: '<path d="M12 19h6l8-6v22l-8-6h-6z" fill="#efe6d6"/><path d="M32 19l10 10M42 19L32 29"/>',
    foot: '<ellipse cx="20" cy="27" rx="8" ry="11" fill="#e7dcc9"/><circle cx="31" cy="15" r="3.4" fill="#e7dcc9"/><circle cx="37" cy="21" r="3" fill="#e7dcc9"/><circle cx="37" cy="28" r="2.7" fill="#e7dcc9"/>',
    heart: '<path d="M24 39S8 29 8 19.5C8 14 12 11 16 11c3.4 0 6 2 8 4.6C26 13 28.6 11 32 11c4 0 8 3 8 8.5C40 29 24 39 24 39z" fill="#fbcfd8"/>',
    star: '<path d="M24 7l5.4 10.9 12 1.8-8.7 8.5 2 12L24 34.5 13.3 40.2l2-12L6.6 19.7l12-1.8z" fill="#fdeeb0"/>',
    question: '<circle cx="24" cy="24" r="17" fill="#dfe7f3"/><path d="M19 19c0-3 2.4-5 5-5s5 2 5 4.6c0 3.4-5 3.6-5 7.4"/><circle cx="24" cy="33" r="1.9" fill="' + L + '" stroke="none"/>',
    check: '<circle cx="24" cy="24" r="17" fill="#cfe9d3"/><path d="M15 24.5l6.5 6.5L34 18.5"/>',
    dash: '<circle cx="24" cy="24" r="17" fill="#f1ece4"/><path d="M15 24h18"/>',
    home: '<path d="M8 23L24 9l16 14" fill="none"/><path d="M12 21v18h24V21" fill="#ffe1a8"/><path d="M20 39V28h8v11" fill="#fff"/>',
    back: '<circle cx="24" cy="24" r="17" fill="#fff"/><path d="M27 15l-9 9 9 9"/>',
    next: '<circle cx="24" cy="24" r="17" fill="#fff"/><path d="M21 15l9 9-9 9"/>',
    print: '<path d="M14 18V8h20v10" fill="#fff"/><rect x="8" y="18" width="32" height="14" rx="3" fill="#dfe7f3"/><rect x="14" y="28" width="20" height="12" rx="2" fill="#fff"/>',
    camera: '<rect x="6" y="15" width="36" height="24" rx="5" fill="#dfe7f3"/><path d="M18 15l3-5h6l3 5" fill="#fff"/><circle cx="24" cy="27" r="7" fill="#fff"/>',
    trash: '<path d="M10 14h28" /><path d="M14 14l2 25h16l2-25" fill="#f6c6b6"/><path d="M19 14v-4h10v4"/>',
    plus: '<circle cx="24" cy="24" r="17" fill="#cfe9d3"/><path d="M24 15v18M15 24h18"/>',
    save: '<rect x="8" y="8" width="32" height="32" rx="5" fill="#b9e3c2"/><path d="M16 8v11h16V8" fill="#fff"/><rect x="16" y="26" width="16" height="14" rx="2" fill="#fff"/>',
    upload: '<path d="M24 34V12" /><path d="M15 21l9-9 9 9"/><path d="M10 34v6h28v-6"/>',
    download: '<path d="M24 12v22"/><path d="M15 25l9 9 9-9"/><path d="M10 36v4h28v-4"/>',
    calendar: '<rect x="7" y="11" width="34" height="30" rx="5" fill="#fff"/><path d="M7 20h34" /><path d="M16 7v8M32 7v8"/><rect x="14" y="25" width="8" height="7" rx="2" fill="#bfe4f6"/>',
    clock: '<circle cx="24" cy="24" r="17" fill="#fff"/><path d="M24 14v11l7 4"/>',
    gear: '<circle cx="24" cy="24" r="7" fill="#fff"/><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4.5 4.5M32.5 32.5L37 37M37 11l-4.5 4.5M15.5 32.5L11 37"/><circle cx="24" cy="24" r="14" fill="none"/>',
    pencil: '<path d="M10 38l2-8L32 10l6 6-20 20z" fill="#fdeeb0"/><path d="M30 12l6 6"/>',
    map: '<path d="M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4z" fill="#c9e7bf"/><path d="M18 8v28M30 12v28"/>',
    people: '<circle cx="17" cy="18" r="6" fill="#bfe4f6"/><circle cx="32" cy="19" r="5" fill="#fbcfd8"/><path d="M7 38c0-6 4.5-10 10-10s10 4 10 10" fill="#fff"/><path d="M27 38c0-5 3-8 7-8s7 3 7 8" fill="#fff"/>',
    book: '<path d="M8 10h13c2 0 3 1 3 3v27c0-2-1-3-3-3H8z" fill="#fff"/><path d="M40 10H27c-2 0-3 1-3 3v27c0-2 1-3 3-3h13z" fill="#ffe1a8"/>',
    sun: '<circle cx="24" cy="24" r="9" fill="#fdeeb0"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M37 11l-3.5 3.5M14.5 33.5L11 37"/>',
    door: '<rect x="12" y="8" width="24" height="32" rx="3" fill="#ffe1a8"/><circle cx="30" cy="25" r="2" fill="' + L + '" stroke="none"/>',
    tree: '<path d="M24 6l11 16H13z" fill="#c9e7bf"/><path d="M24 15l13 16H11z" fill="#c9e7bf"/><path d="M21 31h6v9h-6z" fill="#e7dcc9"/>',
    edit: '<rect x="7" y="9" width="34" height="30" rx="5" fill="#fff"/><path d="M14 18h20M14 25h20M14 32h12"/>',
    eye: '<path d="M5 24s7-10 19-10 19 10 19 10-7 10-19 10S5 24 5 24z" fill="#fff"/><circle cx="24" cy="24" r="6" fill="#bfe4f6"/>',
    expand: '<path d="M18 8H8v10M30 8h10v10M18 40H8V30M30 40h10V30" stroke-width="3.4"/>',
    shrink: '<path d="M8 18h10V8M40 18H30V8M8 30h10v10M40 30H30v10" stroke-width="3.4"/>',
    eyeOff: '<path d="M5 24s7-10 19-10 19 10 19 10-7 10-19 10S5 24 5 24z" fill="#f1ece4"/><path d="M12 12l24 24"/>',

    /* ------------------------- 코너 그림 ------------------------- */
    cornerPlan: '<rect x="8" y="9" width="32" height="32" rx="6" fill="#bfe4f6"/><path d="M8 18h32"/><path d="M16 6v7M32 6v7"/><path d="M15 27l4 4 9-9"/>',
    cornerMap: '<path d="M5 13l13-5 12 5 13-5v27l-13 5-12-5-13 5z" fill="#c9e7bf"/><path d="M18 8v27M30 13v27"/><circle cx="24" cy="22" r="4" fill="#fff"/>',
    cornerDiary: '<rect x="9" y="7" width="30" height="34" rx="5" fill="#ddd0f4"/><path d="M16 7v34"/><path d="M22 17h11M22 24h11M22 31h7"/>',
    cornerFolio: '<rect x="6" y="14" width="36" height="24" rx="5" fill="#ffd9a8"/><path d="M6 20h36"/><path d="M16 14v-4h16v4"/><path d="M18 28l4 4 8-8"/>',

    /* ------------------------- 실내 활동 ------------------------- */
    box: '<path d="M8 18h32v20H8z" fill="#ffe1a8"/><path d="M6 12h36v6H6z" fill="#fbcfd8"/><path d="M24 12v26"/><path d="M24 12c-4-6-11-4-9 0M24 12c4-6 11-4 9 0"/>',
    leaf: '<path d="M38 10C22 10 12 18 12 30c0 4 2 7 2 7s16 1 22-9c4-7 2-18 2-18z" fill="#c9e7bf"/><path d="M34 14L12 38"/>',
    stone: '<ellipse cx="18" cy="31" rx="11" ry="8" fill="#e7dcc9"/><ellipse cx="33" cy="22" rx="8" ry="6.5" fill="#dfe7f3"/>',
    nature: '<circle cx="16" cy="16" r="7" fill="#c9e7bf"/><path d="M30 8l6 8-6 8-6-8z" fill="#fdeeb0"/><ellipse cx="30" cy="34" rx="11" ry="7" fill="#e7dcc9"/><circle cx="13" cy="33" r="5" fill="#fbcfd8"/>',
    blocks: '<rect x="7" y="26" width="14" height="14" rx="3" fill="#bfe4f6"/><rect x="24" y="26" width="14" height="14" rx="3" fill="#fbcfd8"/><rect x="15" y="10" width="14" height="14" rx="3" fill="#fdeeb0"/>',
    slime: '<path d="M9 30c0-9 7-16 15-16s15 7 15 16c0 3-2 4-4 3s-3 3-6 3-3-3-5-3-2 4-5 4-3-4-6-4-4-1-4-3z" fill="#c9e7bf"/><circle cx="19" cy="24" r="2" fill="#fff" stroke="none"/><circle cx="29" cy="27" r="1.6" fill="#fff" stroke="none"/>',
    squishy: '<rect x="9" y="14" width="30" height="22" rx="10" fill="#fbcfd8"/><path d="M17 26c2 2 4 3 7 3s5-1 7-3"/><circle cx="18" cy="22" r="1.8" fill="' + L + '" stroke="none"/><circle cx="30" cy="22" r="1.8" fill="' + L + '" stroke="none"/>',
    paper: '<path d="M12 8h18l8 8v24H12z" fill="#fff"/><path d="M30 8v8h8"/><path d="M17 24h14M17 31h10"/>',
    pot: '<rect x="8" y="18" width="30" height="16" rx="4" fill="#dfe7f3"/><path d="M38 22h5v6h-5"/><path d="M6 18h34"/><path d="M17 12c0-3 3-3 3-6M26 12c0-3 3-3 3-6"/>',
    bread: '<path d="M10 20c0-6 6-10 14-10s14 4 14 10v18H10z" fill="#ffe1a8"/><path d="M16 20h16v12H16z" fill="#fff6df"/>',
    fries: '<path d="M14 20h20l-2 18H16z" fill="#f5b45f"/><path d="M18 20l-2-11M24 20V8M30 20l2-11" /><path d="M12 20h24"/>',
    brownie: '<rect x="8" y="18" width="32" height="18" rx="4" fill="#c3a184"/><circle cx="17" cy="16" r="5" fill="#fff"/><circle cx="17" cy="16" r="2" fill="#4a3323" stroke="none"/><path d="M8 27h32"/>',
    tteok: '<path d="M8 30c0-6 5-10 16-10s16 4 16 10-5 8-16 8S8 36 8 30z" fill="#fbcfd8"/><rect x="14" y="14" width="6" height="14" rx="3" fill="#fff"/><rect x="26" y="12" width="6" height="16" rx="3" fill="#fff"/>',
    eggrice: '<path d="M8 26c0-7 7-12 16-12s16 5 16 12z" fill="#fff"/><ellipse cx="24" cy="22" rx="8" ry="5.5" fill="#fff6df"/><circle cx="24" cy="22" r="3" fill="#fdeeb0"/><path d="M6 26h36l-3 10H9z" fill="#dfe7f3"/>',
    fruit: '<circle cx="18" cy="28" r="10" fill="#fbcfd8"/><circle cx="32" cy="30" r="8" fill="#fdeeb0"/><path d="M18 18c0-4 3-6 6-7"/><path d="M17 12c3 1 4 3 4 6" fill="#c9e7bf"/>',
    bug: '<ellipse cx="24" cy="27" rx="12" ry="11" fill="#fbcfd8"/><path d="M24 16v22"/><circle cx="24" cy="14" r="5" fill="#4a3323" stroke="none"/><circle cx="17" cy="24" r="2" fill="#4a3323" stroke="none"/><circle cx="31" cy="30" r="2" fill="#4a3323" stroke="none"/><path d="M20 9l-3-4M28 9l3-4"/>',
    magnet: '<path d="M13 34V22c0-6 5-11 11-11s11 5 11 11v12h-8V22a3 3 0 0 0-6 0v12z" fill="#dfe7f3"/><path d="M13 28h8M27 28h8" stroke="#c05a3e" stroke-width="4"/>',
    pet: '<circle cx="24" cy="28" r="10" fill="#ffe1a8"/><circle cx="13" cy="15" r="5" fill="#ffe1a8"/><circle cx="35" cy="15" r="5" fill="#ffe1a8"/><circle cx="20" cy="26" r="1.8" fill="' + L + '" stroke="none"/><circle cx="28" cy="26" r="1.8" fill="' + L + '" stroke="none"/><path d="M21 32c1.5 1.5 4.5 1.5 6 0"/>',
    tv: '<rect x="6" y="10" width="36" height="24" rx="5" fill="#dfe7f3"/><path d="M18 40h12M24 34v6"/><path d="M13 16h10"/>',
    gamepad: '<rect x="6" y="17" width="36" height="18" rx="9" fill="#ddd0f4"/><path d="M15 22v7M11.5 25.5h7"/><circle cx="32" cy="24" r="2.2" fill="' + L + '" stroke="none"/><circle cx="36" cy="28" r="2.2" fill="' + L + '" stroke="none"/>',
    dice: '<rect x="8" y="8" width="22" height="22" rx="5" fill="#fff"/><circle cx="15" cy="15" r="2" fill="' + L + '" stroke="none"/><circle cx="23" cy="23" r="2" fill="' + L + '" stroke="none"/><rect x="22" y="22" width="18" height="18" rx="5" fill="#bfe4f6"/><circle cx="31" cy="31" r="2" fill="' + L + '" stroke="none"/>',
    yoga: '<circle cx="24" cy="11" r="5" fill="#fbcfd8"/><path d="M24 16v11"/><path d="M24 27l-9 9M24 27l9 9"/><path d="M13 21l11 3 11-3"/>',
    gym: '<circle cx="24" cy="10" r="5" fill="#c9e7bf"/><path d="M24 15v13"/><path d="M9 17l15 4 15-4"/><path d="M24 28l-7 12M24 28l7 12"/>',

    /* ------------------------- 실외 활동 ------------------------- */
    slide: '<path d="M10 38V22l24-10" fill="none"/><path d="M34 12v22" /><path d="M10 22c6 0 18 4 24 12" fill="#bfe4f6"/><circle cx="14" cy="16" r="4" fill="#fbcfd8"/>',
    museum: '<path d="M6 18L24 8l18 10z" fill="#dfe7f3"/><path d="M11 18v16M19 18v16M29 18v16M37 18v16"/><path d="M6 34h36v5H6z" fill="#e7dcc9"/>',
    frame: '<rect x="7" y="9" width="34" height="28" rx="4" fill="#fff"/><path d="M12 31l8-9 5 5 4-5 7 9z" fill="#c9e7bf"/><circle cx="17" cy="17" r="3" fill="#fdeeb0"/><path d="M18 37v4h12v-4"/>',
    library: '<rect x="8" y="12" width="7" height="26" rx="2" fill="#fbcfd8"/><rect x="17" y="16" width="7" height="22" rx="2" fill="#bfe4f6"/><rect x="26" y="10" width="7" height="28" rx="2" fill="#fdeeb0"/><rect x="35" y="18" width="6" height="20" rx="2" fill="#c9e7bf"/>',
    store: '<path d="M8 18h32v20H8z" fill="#fff"/><path d="M6 10h36l-2 8H8z" fill="#fbcfd8"/><rect x="18" y="24" width="12" height="14" rx="2" fill="#bfe4f6"/>',
    mic: '<rect x="18" y="7" width="12" height="20" rx="6" fill="#ddd0f4"/><path d="M13 24c0 6 5 10 11 10s11-4 11-10"/><path d="M24 34v6M17 40h14"/>',
    park: '<circle cx="16" cy="18" r="9" fill="#c9e7bf"/><path d="M16 27v13"/><path d="M34 12l7 12H27z" fill="#c9e7bf"/><path d="M34 24v16"/><path d="M6 40h36"/>',
    tent: '<path d="M24 8L6 38h36z" fill="#c9e7bf"/><path d="M24 8v30"/><path d="M24 20l-7 18h14z" fill="#fff6df"/>',
    food: '<path d="M12 8v14a4 4 0 0 0 8 0V8" /><path d="M16 22v18"/><path d="M34 8c-4 0-6 5-6 10s2 6 4 6v16" /><circle cx="24" cy="24" r="0" fill="none"/>',
    shoe: '<path d="M6 32c0-4 2-10 6-10 5 0 6 4 11 6 5 2 11 1 15 3 3 1.5 4 3 4 5H6z" fill="#bfe4f6"/><path d="M12 22l3 5M18 25l3 4"/>',
    bike: '<circle cx="12" cy="32" r="9" fill="#fff"/><circle cx="36" cy="32" r="9" fill="#fff"/><path d="M12 32l8-14h8l8 14"/><path d="M20 18h10"/><path d="M28 18l-4 14"/><path d="M33 13h5"/>',
    marble: '<circle cx="17" cy="30" r="9" fill="#bfe4f6"/><circle cx="32" cy="34" r="6.5" fill="#fbcfd8"/><circle cx="30" cy="20" r="5.5" fill="#fdeeb0"/><circle cx="14" cy="27" r="2.4" fill="#fff" stroke="none"/>',
    cup: '<path d="M13 14h20l-2 24H15z" fill="#fff"/><path d="M33 19h5a4 4 0 0 1 0 8h-4"/><path d="M11 14h24"/>',
    film: '<rect x="6" y="12" width="36" height="24" rx="4" fill="#dfe7f3"/><path d="M6 18h36M6 30h36"/><path d="M14 12v24M34 12v24"/>',

    /* ------------------------- 준비물 ------------------------- */
    bag: '<path d="M10 16h28l2 24H8z" fill="#ffe1a8"/><path d="M18 16v-4a6 6 0 0 1 12 0v4"/>',
    bottle: '<path d="M19 8h10v6l4 6v20H15V20l4-6z" fill="#bfe4f6"/><path d="M15 26h18"/>',
    towel: '<rect x="9" y="12" width="30" height="24" rx="4" fill="#fbcfd8"/><path d="M9 20h30M9 28h30"/>',
    apron: '<path d="M18 8c0 4 12 4 12 0" /><path d="M18 8L12 14v10c0 9 4 16 12 16s12-7 12-16V14l-6-6z" fill="#c9e7bf"/>',
    hat: '<path d="M6 30c0-3 6-5 18-5s18 2 18 5-6 5-18 5S6 33 6 30z" fill="#fdeeb0"/><path d="M14 28V18a10 10 0 0 1 20 0v10" fill="#fdeeb0"/>',
    money: '<rect x="6" y="14" width="36" height="20" rx="4" fill="#c9e7bf"/><circle cx="24" cy="24" r="6" fill="#fff"/>',

    /* ------------------------- 기분 ------------------------- */
    moodExcited: face('#fdeeb0', '<path d="M14 19l5-4M34 19l-5-4"/><circle cx="18" cy="22" r="2.2" fill="' + L + '" stroke="none"/><circle cx="30" cy="22" r="2.2" fill="' + L + '" stroke="none"/><path d="M16 28c2 5 14 5 16 0" fill="#fff"/>'),
    moodFun: face('#fbcfd8', '<path d="M15 20c1.5-2 4-2 5.5 0M27.5 20c1.5-2 4-2 5.5 0"/><path d="M16 29c2 4 14 4 16 0"/>'),
    moodCalm: face('#cceee4', '<path d="M15 22h5M28 22h5"/><path d="M18 30c2 2 10 2 12 0"/>'),
    moodProud: face('#ffd9a8', EYES + '<path d="M17 29c2 3 12 3 14 0"/><path d="M24 6l2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6z" fill="#fdeeb0"/>'),
    moodSorry: face('#dfe7f3', EYES + '<path d="M18 31c2-2 10-2 12 0"/>'),
    moodTired: face('#e7dcc9', '<path d="M15 21l5 2M33 21l-5 2"/><path d="M18 31h12"/>'),
    moodSad: face('#bfe4f6', EYES + '<path d="M18 32c2-3 10-3 12 0"/><path d="M18 25c0 4-1 6-1 6" stroke="#7fc4e6" stroke-width="3"/>'),
    moodAngry: face('#f6c6b6', '<path d="M14 17l6 3M34 17l-6 3"/><circle cx="18" cy="23" r="2.1" fill="' + L + '" stroke="none"/><circle cx="30" cy="23" r="2.1" fill="' + L + '" stroke="none"/><path d="M18 32h12"/>'),

    /* ------------------------- 함께하는 사람 ------------------------- */
    pAlone: '<circle cx="24" cy="16" r="7" fill="#fdeeb0"/><path d="M12 40c0-7 5-12 12-12s12 5 12 12" fill="#fff"/>',
    pFamily: '<circle cx="13" cy="16" r="5.5" fill="#fbcfd8"/><circle cx="24" cy="14" r="5" fill="#bfe4f6"/><circle cx="35" cy="17" r="5" fill="#c9e7bf"/><path d="M5 40c0-6 4-9 8-9s8 3 8 9" fill="#fff"/><path d="M17 40c0-6 3-9 7-9s7 3 7 9" fill="#fff"/><path d="M28 40c0-6 3-9 7-9s8 3 8 9" fill="#fff"/>',
    pMom: '<circle cx="24" cy="16" r="7.5" fill="#fbcfd8"/><path d="M15 14c2-6 16-6 18 0 1 4-1 6-1 6"/><path d="M11 40c0-7 6-12 13-12s13 5 13 12" fill="#fff"/>',
    pDad: '<circle cx="24" cy="16" r="7.5" fill="#bfe4f6"/><path d="M16 12c3-4 13-4 16 0"/><path d="M11 40c0-7 6-12 13-12s13 5 13 12" fill="#fff"/>',
    pSibling: '<circle cx="16" cy="18" r="6" fill="#fdeeb0"/><circle cx="33" cy="20" r="5" fill="#c9e7bf"/><path d="M7 40c0-6 4-10 9-10s9 4 9 10" fill="#fff"/><path d="M25 40c0-5 3-9 8-9s8 4 8 9" fill="#fff"/>',
    pFriend: '<circle cx="17" cy="17" r="6" fill="#ddd0f4"/><circle cx="32" cy="17" r="6" fill="#fdeeb0"/><path d="M7 40c0-6 4-10 10-10s10 4 10 10" fill="#fff"/><path d="M22 40c0-6 4-10 10-10s10 4 10 10" fill="#fff"/>',
    pTeacher: '<circle cx="19" cy="16" r="6.5" fill="#c9e7bf"/><path d="M8 40c0-7 5-11 11-11s11 4 11 11" fill="#fff"/><rect x="31" y="12" width="12" height="14" rx="2" fill="#fff"/><path d="M34 17h6M34 21h6"/>',

    /* ------------------------- 학생 캐릭터 ------------------------- */
    avBear: '<circle cx="12" cy="13" r="6" fill="#e7dcc9"/><circle cx="36" cy="13" r="6" fill="#e7dcc9"/>' + face('#ffe1a8', EYES + '<ellipse cx="24" cy="28" rx="6" ry="4.5" fill="#fff"/><circle cx="24" cy="26" r="2" fill="' + L + '" stroke="none"/>'),
    avRabbit: '<ellipse cx="16" cy="9" rx="4" ry="9" fill="#fbcfd8"/><ellipse cx="32" cy="9" rx="4" ry="9" fill="#fbcfd8"/>' + face('#fff6df', EYES + '<path d="M20 30c2 2 6 2 8 0"/><circle cx="24" cy="26" r="1.8" fill="#c05a3e" stroke="none"/>'),
    avCat: '<path d="M11 16l1-10 9 5zM37 16l-1-10-9 5z" fill="#dfe7f3"/>' + face('#dfe7f3', EYES + '<path d="M13 25h6M29 25h6"/><path d="M21 29h6l-3 3z" fill="' + L + '" stroke="none"/>'),
    avFox: '<path d="M10 15l2-9 8 5zM38 15l-2-9-8 5z" fill="#ffd9a8"/>' + face('#ffd9a8', EYES + '<path d="M17 31c3 3 11 3 14 0"/><circle cx="24" cy="27" r="2.2" fill="' + L + '" stroke="none"/>'),
    avBird: face('#bfe4f6', '<circle cx="19" cy="21" r="2.2" fill="' + L + '" stroke="none"/><circle cx="30" cy="21" r="2.2" fill="' + L + '" stroke="none"/><path d="M21 27l7 3-7 3z" fill="#f5b45f"/><path d="M24 5l4 4h-8z" fill="#fbcfd8"/>'),
    avStar: '<path d="M24 5l6 12 13 2-9.5 9.2L36 41l-12-6.3L12 41l2.5-12.8L5 19l13-2z" fill="#fdeeb0"/><circle cx="20" cy="22" r="1.9" fill="' + L + '" stroke="none"/><circle cx="28" cy="22" r="1.9" fill="' + L + '" stroke="none"/><path d="M21 27c1.5 2 4.5 2 6 0"/>',
    avSprout: face('#c9e7bf', EYES + '<path d="M19 29c2 2 8 2 10 0"/><path d="M24 8c-4-3-8-1-7 3 3 2 7 1 7-3zM24 8c4-3 8-1 7 3-3 2-7 1-7-3"/>')
  };

  /* -----------------------------------------------------------------
     화면 조작용 아이콘 (읽어주기·설정·전체화면 …)
     색을 넣지 않고 선으로만 그려서, 단추 안에서 정갈하게 보이도록 합니다.
     색은 CSS 의 color 값을 따라갑니다(currentColor).
     ----------------------------------------------------------------- */
  var UI = {
    /* 스피커 몸통은 꽉 찬 모양, 소리 물결은 청록색 — 한눈에 '소리'로 읽히게.
       그림 전체가 동그라미 한가운데 오도록 좌우 균형을 맞춰 두었습니다. */
    speaker: '<g transform="translate(-2.5,0)">' +
             '<path d="M12 19h6.5l9.5-7.5v25L18.5 29H12z" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<path d="M33 19.5c2.7 2.6 2.7 7.4 0 10" stroke="#2bb3ab" stroke-width="3.2"/>' +
             '<path d="M38.5 14.5c5.2 5.2 5.2 14 0 19" stroke="#2bb3ab" stroke-width="3.2"/></g>',
    /* 음소거 : 물결 대신 X 표시 */
    speakerOff: '<g transform="translate(-2.5,0)">' +
             '<path d="M12 19h6.5l9.5-7.5v25L18.5 29H12z" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<path d="M33 18.5l10 11M43 18.5l-10 11" stroke="#c2566a" stroke-width="3.2"/></g>',
    gear: '<circle cx="24" cy="24" r="6.5"/><path d="M24 7v5M24 36v5M7 24h5M36 24h5M12 12l3.5 3.5M32.5 32.5L36 36M36 12l-3.5 3.5M15.5 32.5L12 36"/><circle cx="24" cy="24" r="14.5"/>',
    expand: '<path d="M18 8H8v10M30 8h10v10M18 40H8V30M30 40h10V30"/>',
    shrink: '<path d="M8 18h10V8M40 18H30V8M8 30h10v10M40 30H30v10"/>',
    home: '<path d="M8 22L24 9l16 13"/><path d="M12 20v19h24V20"/><path d="M19 39V28h10v11"/>',
    back: '<path d="M28 12L16 24l12 12"/>',
    next: '<path d="M20 12l12 12-12 12"/>',
    close: '<path d="M14 14l20 20M34 14L14 34"/>',
    question: '<circle cx="24" cy="24" r="16"/><path d="M19 19.5c0-2.8 2.3-5 5-5s5 2 5 4.6c0 3.4-5 3.6-5 7.4"/><circle cx="24" cy="33" r="1.6" fill="currentColor"/>'
  };

  /* 조작용 아이콘 : 선만 있는 깔끔한 모양 */
  App.uiIcon = function (key) {
    var body = UI[key] || UI.question;
    return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  };
  App.hasUiIcon = function (key) { return !!UI[key]; };

  /* 아이콘 markup 을 <svg> 로 감싸 돌려줍니다. */
  App.icon = function (key) {
    var body = ICONS[key] || ICONS.question;
    return '<svg viewBox="0 0 48 48" fill="none" stroke="' + L +
      '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  };
  App.hasIcon = function (key) { return !!ICONS[key]; };
  App.ICONS = ICONS;
})();
