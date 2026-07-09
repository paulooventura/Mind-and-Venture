// ============================================================
//  test_lab.js — Test Lab playground (all items, rich platforming)
//  Sonic-style runs + Metroid-style ability gates.
// ============================================================

let _testLabMode = false;

const TEST_LAB_WW = 4800;
const TEST_LAB_WH = 720;
const TEST_LAB_FLOOR = 520;

const TEST_LAB_TR = [
  [0, TEST_LAB_FLOOR, TEST_LAB_WW, 48, 'solid'],
  [0, 0, TEST_LAB_WW, 24, 'solid'],
  [0, 0, 24, TEST_LAB_WH, 'solid'],
  [TEST_LAB_WW - 24, 0, 24, TEST_LAB_WH, 'solid'],
  [0, -80, TEST_LAB_WW, 80, 'solid'],
  [80, 508, 120, 12, 'solid'], [240, 504, 80, 16, 'solid'], [360, 500, 64, 20, 'solid'],
  [460, 496, 48, 24, 'solid'], [540, 492, 40, 28, 'solid'], [620, 488, 36, 32, 'solid'],
  [700, 484, 32, 36, 'solid'], [780, 480, 28, 40, 'solid'], [860, 476, 24, 44, 'solid'],
  [940, 472, 20, 48, 'solid'], [1020, 468, 16, 52, 'solid'], [1100, 464, 12, 56, 'solid'],
  [1180, 460, 8, 60, 'solid'], [1260, 456, 8, 64, 'solid'], [1340, 452, 8, 68, 'solid'],
  [1420, 448, 8, 72, 'solid'], [1500, 444, 8, 76, 'solid'], [1580, 440, 8, 80, 'solid'],
  [1660, 436, 8, 84, 'solid'], [1740, 432, 8, 88, 'solid'], [1820, 428, 8, 92, 'solid'],
  [1900, 424, 8, 96, 'solid'], [1980, 420, 8, 100, 'solid'], [2060, 416, 8, 104, 'solid'],
  [2140, 412, 8, 108, 'solid'], [2220, 408, 8, 112, 'solid'], [2300, 404, 8, 116, 'solid'],
  [2380, 400, 8, 120, 'solid'], [2460, 396, 8, 124, 'solid'], [2540, 392, 8, 128, 'solid'],
  [2620, 388, 8, 132, 'solid'], [2700, 384, 8, 136, 'solid'], [2780, 380, 8, 140, 'solid'],
  [2860, 376, 8, 144, 'solid'], [2940, 372, 8, 148, 'solid'], [3020, 368, 8, 152, 'solid'],
  [3100, 364, 8, 156, 'solid'], [3180, 360, 8, 160, 'solid'], [3260, 356, 8, 164, 'solid'],
  [3340, 352, 8, 168, 'solid'], [3420, 348, 8, 172, 'solid'], [3500, 344, 8, 176, 'solid'],
  [3580, 340, 8, 180, 'solid'], [3660, 336, 8, 184, 'solid'], [3740, 332, 8, 188, 'solid'],
  [3820, 328, 8, 192, 'solid'], [3900, 324, 8, 196, 'solid'], [3980, 320, 8, 200, 'solid'],
  [4060, 316, 8, 204, 'solid'], [4140, 312, 8, 208, 'solid'], [4220, 308, 8, 212, 'solid'],
  [4300, 304, 8, 216, 'solid'], [4380, 300, 8, 220, 'solid'], [4460, 296, 8, 224, 'solid'],
  [4540, 292, 8, 228, 'solid'], [4620, 288, 8, 232, 'solid'], [4700, 284, 8, 236, 'solid'],
  [200, 380, 100, 14, 'oneway'], [360, 340, 90, 14, 'oneway'], [520, 300, 80, 14, 'oneway'],
  [680, 260, 70, 14, 'oneway'], [840, 220, 60, 14, 'oneway'], [1000, 180, 50, 14, 'oneway'],
  [1160, 240, 120, 14, 'solid'], [1320, 200, 100, 14, 'oneway'], [1480, 160, 90, 14, 'oneway'],
  [1640, 200, 140, 14, 'solid'], [1820, 280, 80, 14, 'oneway'], [1980, 320, 100, 14, 'oneway'],
  [2160, 360, 120, 14, 'solid'],
  [2400, 120, 160, 14, 'solid'], [2400, 200, 24, 320, 'solid'], [2536, 200, 24, 320, 'solid'],
  [2440, 280, 80, 14, 'oneway'], [2440, 360, 80, 14, 'oneway'], [2440, 440, 80, 14, 'oneway'],
  [2620, 300, 100, 14, 'solid'], [2620, 380, 100, 14, 'oneway'], [2620, 460, 100, 14, 'oneway'],
  [2900, 380, 280, 14, 'solid'], [2900, 200, 24, 200, 'solid'], [3156, 200, 24, 200, 'solid'],
  [2940, 260, 60, 14, 'oneway'], [3060, 300, 60, 14, 'oneway'], [2940, 340, 60, 14, 'oneway'],
  [3060, 340, 60, 14, 'oneway'], [3020, 120, 120, 14, 'solid'], [3020, 120, 24, 140, 'solid'],
  [3116, 120, 24, 140, 'solid'],
  [3400, 380, 360, 14, 'solid'], [3400, 200, 24, 200, 'solid'], [3736, 200, 24, 200, 'solid'],
  [3480, 280, 80, 14, 'oneway'], [3600, 240, 80, 14, 'oneway'],
  [4000, 380, 200, 14, 'solid'], [4000, 120, 24, 280, 'solid'], [4176, 120, 24, 280, 'solid'],
  [4040, 200, 120, 14, 'oneway'], [4040, 280, 120, 14, 'oneway'],
  [4280, 380, 120, 14, 'solid'], [4400, 340, 100, 14, 'oneway'], [4520, 300, 100, 14, 'oneway'],
  [4640, 260, 120, 14, 'solid'], [4640, 120, 24, 160, 'solid'], [4736, 120, 24, 160, 'solid'],
];

const TEST_LAB_KNOWLS = [
  { x: 320, y: 470 }, { x: 720, y: 430 }, { x: 1120, y: 200 }, { x: 1520, y: 130 },
  { x: 2080, y: 320 }, { x: 2480, y: 90 }, { x: 2680, y: 260 }, { x: 3000, y: 90 },
  { x: 3280, y: 340 }, { x: 3560, y: 200 }, { x: 4080, y: 90 }, { x: 4480, y: 260 },
];

const TEST_LAB_MPLAT = [
  { x: 1280, y: 320, w: 100, h: 14, vx: 0, minX: 1200, maxX: 1480 },
  { x: 2720, y: 400, w: 90, h: 14, vx: 0, minX: 2640, maxX: 2860 },
  { x: 3520, y: 300, w: 110, h: 14, vx: 0, minX: 3420, maxX: 3680 },
];

const TEST_LAB_APLAT = [
  { x: 1680, y: 260, w: 90, h: 12, dx: 1.6, mn: 1640, mx: 1900 },
  { x: 3180, y: 160, w: 80, h: 12, dx: -1.4, mn: 3100, mx: 3320 },
  { x: 4320, y: 220, w: 70, h: 12, dx: 1.8, mn: 4260, mx: 4480 },
];

const TEST_LAB_CRATES = [
  { x: 2960, y: 350, w: 30, h: 30 }, { x: 3000, y: 350, w: 30, h: 30 },
  { x: 3040, y: 350, w: 30, h: 30 }, { x: 3460, y: 350, w: 30, h: 30 },
  { x: 3500, y: 350, w: 30, h: 30 },
];

function _testLabZoneIdx() {
  let i = ZONES.findIndex(z => z.name === 'TEST LAB');
  if (i < 0) {
    ZONES.push({ name: 'TEST LAB', sub: 'all items · platforming sandbox' });
    i = ZONES.length - 1;
  }
  return i;
}

function _grantTestLabItems(pl) {
  _unlockedMask = 15;
  ITEM = 1;
  if (pl) {
    pl.itemStamina = 100;
    pl.hook = { st: 'idle', ex: 0, ey: 0, evx: 0, evy: 0, ax: 0, ay: 0, rl: 0, ox: NaN, oy: NaN, tgt: null, tox: 0, toy: 0 };
    pl.xlrOn = false;
    pl.magOn = false;
  }
}

function _spawnTestLabKnowls() {
  KDROP.length = 0;
  for (const d of TEST_LAB_KNOWLS) {
    KDROP.push({
      x: d.x, y: d.y, ox: d.x, oy: d.y,
      px: 0, py: 0, vx: 0, vy: 0, got: false,
      bob: Math.random() * Math.PI * 2,
    });
  }
  kTotal = KDROP.length;
  kColl = 0;
}

function _spawnTestLabBWalls() {
  BWALLS.length = 0;
  const tw = 32, th = 32;
  const redGid = typeof BWALL_RED_GID !== 'undefined' ? BWALL_RED_GID : 242;
  const blocks = [
    { x: 2980, y: 348 }, { x: 3012, y: 348 }, { x: 3044, y: 316 },
    { x: 3076, y: 284 }, { x: 3108, y: 252 }, { x: 3140, y: 220 },
    { x: 3540, y: 348 }, { x: 3572, y: 348 },
  ];
  for (const b of blocks) {
    BWALLS.push(_mkBwall(b.x, b.y, tw, th, {
      tileGid: redGid, movable: true, hp: RED_BWALL_HP, maxHp: RED_BWALL_HP,
      homeX: b.x, homeY: b.y, _awake: false,
    }));
  }
}

function _spawnTestLabEnemies() {
  ENEMS.length = 0;
  const specs = [
    { kind: 'minion', type: 'circle', x: 900, y: TEST_LAB_FLOOR, mn: 760, mx: 1100 },
    { kind: 'minion', type: 'square', x: 1400, y: TEST_LAB_FLOOR, mn: 1280, mx: 1580 },
    { kind: 'minion', type: 'flyer', x: 1900, y: 320, mn: 1780, mx: 2100 },
    { kind: 'mind', shape: 'ball', x: 2680, y: TEST_LAB_FLOOR, mn: 2540, mx: 2820, spd: 1.1 },
    { kind: 'mind', shape: 'triangle', x: 3480, y: TEST_LAB_FLOOR, mn: 3420, mx: 3720, spd: 1.35 },
    { kind: 'signol', x: 3620, y: TEST_LAB_FLOOR, mn: 3440, mx: 3740 },
    { kind: 'mind', shape: 'star', x: 4180, y: TEST_LAB_FLOOR, mn: 4020, mx: 4280, spd: 1.5 },
    { kind: 'minion', type: 'circle', x: 4500, y: TEST_LAB_FLOOR, mn: 4380, mx: 4620 },
  ];
  for (const s of specs) {
    if (s.kind === 'signol') {
      ENEMS.push(_mkSignol(s.x, s.y, { mn: s.mn, mx: s.mx, spd: 0.85 }));
    } else if (s.kind === 'mind') {
      ENEMS.push(_mkMindEnemy(s.shape, s.x, s.y, { spd: s.spd, mn: s.mn, mx: s.mx, campaignAi: true }));
    } else {
      ENEMS.push(_mkMinion(s.x, s.y, s.type, { mn: s.mn, mx: s.mx }));
    }
  }
}

function _pushTestLabMovPlats() {
  MPLAT.length = 0;
  APLAT.length = 0;
  for (const m of TEST_LAB_MPLAT) MPLAT.push(Object.assign({}, m));
  for (const a of TEST_LAB_APLAT) APLAT.push(Object.assign({}, a));
  for (const m of MPLAT) {
    TR.push({ x: m.x, y: m.y, w: m.w, h: m.h, tp: 'solid', mv: null, mp: m });
  }
}

function initTestLabWorld() {
  _clearTiledState();
  _testLabMode = true;
  _battleTestMode = false;
  _runTestMode = false;
  _stageDesignerMode = false;
  _awdjooTutorial = false;
  _syncBattleHud();

  WW = TEST_LAB_WW;
  WH = TEST_LAB_WH;
  TR = TEST_LAB_TR.map(r => ({
    x: r[0], y: r[1], w: r[2], h: r[3],
    tp: r[4] || 'solid', mv: null, mp: null,
  }));
  _pushTestLabMovPlats();

  ENEMS = [];
  CRATES = [];
  ESHOTS = [];
  PFXS = [];
  goalOpen = false;
  win = false;

  _spawnTestLabKnowls();
  _spawnTestLabBWalls();
  _spawnTestLabEnemies();
  for (const c of TEST_LAB_CRATES) {
    CRATES.push({ x: c.x, y: c.y, w: c.w, h: c.h, vx: 0, vy: 0, og: false });
  }

  GOALPL = { x: 4680, y: 80, w: 80, h: 200 };
  _zoneIdx = _testLabZoneIdx();
  _zoneCardT = 220;

  _spawnX = 48;
  _spawnY = TEST_LAB_FLOOR - FEET_OFF;
  p = mkP();
  p.x = _spawnX;
  p.y = _spawnY;
  p.vx = 0;
  p.vy = 0;
  p.og = true;
  p.hp = p.maxHp;
  _syncLivesFromHp(p);
  _grantTestLabItems(p);

  camX = 0;
  camY = 0;
  _mapReady = true;
  _allPCache = null;
  _snapCameraToPlayer(p);
  uiShowToast('TEST LAB — TRS/RCA/XLR/MAG unlocked · collect 12 knowls');
  console.info('MV: Test Lab —', kTotal, 'knowls,', ENEMS.length, 'enemies');
}

function startTestLab() {
  _unlockAudio();
  _gameState = 'game';
  _stopBGM('title');
  _stopBGM('story');
  initTestLabWorld();
  _playBGM('game', OPT.musicVol);
}

function _tickTestLabGoals() {
  if (!_testLabMode || _gameState !== 'game') return;
}
