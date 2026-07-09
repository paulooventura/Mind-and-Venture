// ============================================================
//  test_lab.js — Test Lab playground (all items, rich platforming)
//  Sonic-style runs + Metroid-style ability gates.
//  Geometry uses 32px tiles (campaign scale) — no razor-thin steps.
// ============================================================

let _testLabMode = false;

const TL_PT = 32;
const TL_WALL = 32;
const TL_FLOOR_Y = 528;
const TL_FLOOR_H = 64;
const TL_WW = 4800;
const TL_WH = 800;
const TL_MIN_TREAD = 96;

function _tlRect(x, y, w, h, tp) {
  return [x, y, w, h, tp || 'solid'];
}

function _tlBounds() {
  return [
    _tlRect(0, TL_FLOOR_Y, TL_WW, TL_FLOOR_H),
    _tlRect(0, 0, TL_WW, TL_WALL),
    _tlRect(0, 0, TL_WALL, TL_WH),
    _tlRect(TL_WW - TL_WALL, 0, TL_WALL, TL_WH),
    _tlRect(0, -80, TL_WW, 80),
  ];
}

// Zone A — downhill sprint runway (wide treads, 32px thick)
function _tlDownhill() {
  const out = [];
  let x = 64;
  let top = 360;
  const endX = 2240;
  const stepW = 120;
  const stepDrop = 28;
  const cap = TL_FLOOR_Y - TL_PT;
  while (x < endX && top <= cap) {
    out.push(_tlRect(x, top, stepW, TL_PT));
    x += stepW - 20;
    top += stepDrop;
  }
  return out;
}

// Zone B — jump gauntlet (chunky oneways + solid landings)
function _tlJumpGauntlet() {
  const y0 = TL_FLOOR_Y - TL_PT;
  return [
    _tlRect(2280, y0 - 160, 140, TL_PT, 'oneway'),
    _tlRect(2460, y0 - 224, 120, TL_PT, 'oneway'),
    _tlRect(2620, y0 - 288, 120, TL_PT, 'oneway'),
    _tlRect(2780, y0 - 224, 140, TL_PT, 'solid'),
    _tlRect(2960, y0 - 352, 100, TL_PT, 'oneway'),
    _tlRect(3120, y0 - 288, 120, TL_PT, 'oneway'),
    _tlRect(3280, y0 - 224, 160, TL_PT, 'solid'),
  ];
}

// Zone C — vertical climb shaft (wide bay, thick ledges)
function _tlVerticalShaft() {
  const shaftL = 2480;
  const shaftW = 192;
  const shaftTop = 96;
  const shaftBot = TL_FLOOR_Y - TL_PT;
  return [
    _tlRect(shaftL, shaftTop, shaftW, TL_PT),
    _tlRect(shaftL, shaftTop + TL_PT, TL_WALL, shaftBot - shaftTop),
    _tlRect(shaftL + shaftW - TL_WALL, shaftTop + TL_PT, TL_WALL, shaftBot - shaftTop),
    _tlRect(shaftL + 32, shaftTop + 96, shaftW - 64, TL_PT, 'oneway'),
    _tlRect(shaftL + 32, shaftTop + 192, shaftW - 64, TL_PT, 'oneway'),
    _tlRect(shaftL + 32, shaftTop + 288, shaftW - 64, TL_PT, 'oneway'),
    _tlRect(shaftL + 32, shaftTop + 384, shaftW - 64, TL_PT, 'solid'),
  ];
}

// Zone D — omniblock puzzle room
function _tlPuzzleRoom() {
  const base = TL_FLOOR_Y - TL_PT;
  return [
    _tlRect(2920, base, 320, TL_PT),
    _tlRect(2920, base - 192, TL_WALL, 192),
    _tlRect(3208, base - 192, TL_WALL, 192),
    _tlRect(2920, base - 224, 120, TL_PT, 'oneway'),
    _tlRect(3080, base - 288, 120, TL_PT, 'oneway'),
    _tlRect(2920, base - 352, 80, TL_PT, 'solid'),
    _tlRect(3112, base - 352, 80, TL_PT, 'solid'),
  ];
}

// Zone E — combat arena
function _tlCombatArena() {
  const base = TL_FLOOR_Y - TL_PT;
  return [
    _tlRect(3360, base, 400, TL_PT),
    _tlRect(3360, base - 224, TL_WALL, 224),
    _tlRect(3728, base - 224, TL_WALL, 224),
    _tlRect(3440, base - 96, 120, TL_PT, 'oneway'),
    _tlRect(3600, base - 160, 120, TL_PT, 'oneway'),
  ];
}

// Zone F — knowl vault + exit tower
function _tlVaultExit() {
  const base = TL_FLOOR_Y - TL_PT;
  return [
    _tlRect(3840, base, 280, TL_PT),
    _tlRect(3840, 96, TL_WALL, base + TL_PT - 96),
    _tlRect(4088, 96, TL_WALL, base + TL_PT - 96),
    _tlRect(3880, 160, 200, TL_PT, 'oneway'),
    _tlRect(3880, 256, 200, TL_PT, 'oneway'),
    _tlRect(4160, base, 200, TL_PT),
    _tlRect(4380, base - 96, 140, TL_PT, 'oneway'),
    _tlRect(4540, base - 160, 140, TL_PT, 'oneway'),
    _tlRect(4680, 96, TL_WALL, base + TL_PT - 96),
    _tlRect(4720, 96, TL_WALL, base + TL_PT - 96),
    _tlRect(4700, 160, 80, TL_PT, 'solid'),
  ];
}

function _buildTestLabTerrain() {
  return [
    ..._tlBounds(),
    ..._tlDownhill(),
    ..._tlJumpGauntlet(),
    ..._tlVerticalShaft(),
    ..._tlPuzzleRoom(),
    ..._tlCombatArena(),
    ..._tlVaultExit(),
  ];
}

const TEST_LAB_WW = TL_WW;
const TEST_LAB_WH = TL_WH;
const TEST_LAB_FLOOR = TL_FLOOR_Y;
const TEST_LAB_TR = _buildTestLabTerrain();

const TEST_LAB_KNOWLS = [
  { x: 340, y: 488 }, { x: 780, y: 420 }, { x: 1180, y: 300 }, { x: 1580, y: 220 },
  { x: 2120, y: 360 }, { x: 2580, y: 200 }, { x: 2760, y: 340 }, { x: 3040, y: 140 },
  { x: 3320, y: 380 }, { x: 3580, y: 240 }, { x: 3960, y: 120 }, { x: 4460, y: 300 },
];

const TEST_LAB_MPLAT = [
  { x: 1320, y: 400, w: 128, h: TL_PT, vx: 0, minX: 1240, maxX: 1520 },
  { x: 2780, y: 440, w: 112, h: TL_PT, vx: 0, minX: 2700, maxX: 2940 },
  { x: 3600, y: 360, w: 128, h: TL_PT, vx: 0, minX: 3500, maxX: 3760 },
];

const TEST_LAB_APLAT = [
  { x: 1720, y: 320, w: 112, h: TL_PT, dx: 1.6, mn: 1680, mx: 1940 },
  { x: 3220, y: 200, w: 96, h: TL_PT, dx: -1.4, mn: 3140, mx: 3360 },
  { x: 4360, y: 280, w: 96, h: TL_PT, dx: 1.8, mn: 4300, mx: 4520 },
];

const TEST_LAB_CRATES = [
  { x: 3000, y: TL_FLOOR_Y - TL_PT - 32, w: 32, h: 32 },
  { x: 3040, y: TL_FLOOR_Y - TL_PT - 32, w: 32, h: 32 },
  { x: 3080, y: TL_FLOOR_Y - TL_PT - 32, w: 32, h: 32 },
  { x: 3480, y: TL_FLOOR_Y - TL_PT - 32, w: 32, h: 32 },
  { x: 3520, y: TL_FLOOR_Y - TL_PT - 32, w: 32, h: 32 },
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
  const base = TL_FLOOR_Y - TL_PT;
  const blocks = [
    { x: 3020, y: base - 32 }, { x: 3052, y: base - 32 }, { x: 3084, y: base - 64 },
    { x: 3116, y: base - 96 }, { x: 3148, y: base - 128 }, { x: 3180, y: base - 160 },
    { x: 3560, y: base - 32 }, { x: 3592, y: base - 32 },
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
    { kind: 'minion', type: 'circle', x: 920, y: TEST_LAB_FLOOR, mn: 760, mx: 1120 },
    { kind: 'minion', type: 'square', x: 1420, y: TEST_LAB_FLOOR, mn: 1300, mx: 1600 },
    { kind: 'minion', type: 'flyer', x: 1940, y: 340, mn: 1820, mx: 2140 },
    { kind: 'mind', shape: 'ball', x: 2720, y: TEST_LAB_FLOOR, mn: 2580, mx: 2860, spd: 1.1 },
    { kind: 'mind', shape: 'triangle', x: 3520, y: TEST_LAB_FLOOR, mn: 3460, mx: 3760, spd: 1.35 },
    { kind: 'signol', x: 3640, y: TEST_LAB_FLOOR, mn: 3460, mx: 3760 },
    { kind: 'mind', shape: 'star', x: 4220, y: TEST_LAB_FLOOR, mn: 4060, mx: 4320, spd: 1.5 },
    { kind: 'minion', type: 'circle', x: 4520, y: TEST_LAB_FLOOR, mn: 4400, mx: 4640 },
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

function _testLabUnstick(pl) {
  if (!pl || !_testLabMode) return;
  const body = playerCoreHB(pl);
  const feet = pl.y + FEET_OFF;
  const cx = pl.x + SW * 0.5;
  let popped = false;

  for (const plat of allP()) {
    if (plat.tp !== 'solid' || plat.poly) continue;
    if (cx < plat.x - 12 || cx > plat.x + plat.w + 12) continue;
    if (!ov(body.x, body.y, body.w, body.h, plat.x, plat.y, plat.w, plat.h)) continue;
    if (feet <= plat.y + 6) continue;
    if (feet > plat.y + plat.h + 32) continue;
    pl.y = plat.y - FEET_OFF;
    pl.vy = 0;
    pl.og = true;
    pl._autoHeadTuck = 0;
    pl._groundHold = 10;
    popped = true;
    break;
  }
  if (popped) return;

  const hr = measureHeadroom(pl);
  if (!_playerOnGround(pl) && hr < STAND_H - 6) {
    const surf = typeof _surfaceYAt === 'function' ? _surfaceYAt(cx, feet + 16, 140) : null;
    if (surf != null && feet > surf + 4) {
      pl.y = surf - FEET_OFF;
      pl.vy = 0;
      pl.og = true;
      pl._autoHeadTuck = 0;
      pl._groundHold = 10;
    }
  } else if (_playerOnGround(pl) && pl._autoHeadTuck > 0.5 && hr >= STAND_H - 4) {
    pl._autoHeadTuck = 0;
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

  GOALPL = { x: 4710, y: 96, w: 80, h: TL_FLOOR_Y + TL_FLOOR_H - 96 };
  _zoneIdx = _testLabZoneIdx();
  _zoneCardT = 220;

  _spawnX = 64;
  _spawnY = TEST_LAB_FLOOR - FEET_OFF;
  p = mkP();
  p.x = _spawnX;
  p.y = _spawnY;
  p.vx = 0;
  p.vy = 0;
  p.og = true;
  p.hp = p.maxHp;
  p._autoHeadTuck = 0;
  _syncLivesFromHp(p);
  _grantTestLabItems(p);
  if (typeof _resolveSpawnPlacement === 'function') _resolveSpawnPlacement(p);

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
  if (!_testLabMode || _gameState !== 'game' || !p) return;
  _testLabUnstick(p);
  if (p2) _testLabUnstick(p2);
}
