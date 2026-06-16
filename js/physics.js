// ============================================================
//  Mind & Venture — physics.js
//  All physics constants, collision resolution, camera,
//  player hitboxes, rope helpers, push/pull reactions.
//
//  Depends on: WW, WH, TR (world arrays from main.js),
//  BWALLS, CRATES, MPLAT, APLAT (from enemies.js / main.js),
//  ctx, W, H, SMS_SCALE, MV2_VISUAL (from main.js canvas setup),
//  p, p2, fr (from player.js),
//  _gameState, _playerCount, _spawnX, _spawnY (globals),
//  sfx (audio.js), OPT (save.js)
// ============================================================

// ── Movement constants ────────────────────────────────────────
const GRAV=0.52, FRIC=0.88, GROUND_FRIC=0.52, RUN_COAST_FRIC=0.86, AIR_DRIFT=0.96;
const MOVE_BUILD=11;
const MOVE_WALK=10.5;
const MOVE_PEAK=1.0;
const MOVE_RUN=16.5;
const MOVE_ACCEL=0.52;
const MOVE_RUN_ACCEL=0.62;
const MOVE_AIR=0.42;
const MOVE_POWER=0.028;
const MOVE_TORQUE=1.45;
const MOVE_STOP=0.48;
const MOVE_TURN=2.1;
const MOVE_RUN_RAMP=0.10;
const WLK=MOVE_WALK, RUN=MOVE_RUN, ACCEL=MOVE_ACCEL;
const RUN_RAMP_RATE=MOVE_RUN_RAMP;
const FALL_DMG_VY=9.2;
const LIFE_REGEN_FRAMES=360;
const KNOWL_TREE_BOOST=2;
let _knowlTreeZone=null;

// ── Jump constants ────────────────────────────────────────────
const JI=-3.0, JHH=0.40, JMH=22, JMX=-11.0;

// ── Body / character dimensions ───────────────────────────────
const BODY_W=52, BODY_H=42, AIM_LEN=36, RCA_NOSE_LEN=41;
const SW=64, SH=96;
const FEET_OFF=88;
const WHEEL_R=20;
const SUSP_TRAVEL=14, SUSP_STIFF=0.44, SUSP_DAMP=0.7, SUSP_ROLL_MAX=11;
const HBX=6, HBW=BODY_W;
const FEET_L=SW/2-WHEEL_R, FEET_W=WHEEL_R*2;
const STAND_H=70, DUCK_H=40;

// ── Rope / grappling hook constants ───────────────────────────
const CSPD=11, CMAX=400;
const ROPE_REEL_IN=3.6;
const ROPE_REEL_OUT=2.8;
const ROPE_RL_MIN=28;
const ROPE_MAX_PIVOTS=6;
const ROPE_SNAP_STRETCH=0.45;
const ROPE_SNAP_MIN=64;
const ROPE_GIVE=12;

// Verlet visual cord
const VROPE_N=22;       // particles along cord
const VROPE_ITER=8;     // constraint passes per frame
const VROPE_GRAV=0.3;   // sag gravity for slack cord
const VROPE_DRAG=0.96;  // air drag on cord wiggle

// ── Collision system ──────────────────────────────────────────
const COLL_SEAM=8;
const COLL_MOVE_STEP=4;
const COLL_LEDGE_STEP=56;
let COLL_SEGS=[];
let COLL_WALL_SEGS=[];
let COLL_POLYS=[];
let _collSegBuckets=[];
const _COLL_BUCKET_W=256;
let _useSegGround=false;

// ── Camera ────────────────────────────────────────────────────
const CAM_LERP=0.11;
let camX=0, camY=0;
let _rcamX=0, _rcamY=0;
let camZoom, camZoomTgt;

function _initCamZoom(){
  camZoom    = 1/SMS_SCALE;
  camZoomTgt = 1/SMS_SCALE;
}

function camViewW(){ return W/camZoom; }
function camViewH(){ return H/camZoom; }
function camClampX(x){ return Math.max(0,Math.min(Math.max(0,WW-camViewW()),x)); }
function camClampY(y){ return Math.max(0,Math.min(Math.max(0,WH-camViewH()),y)); }
// Single follow anchor — feet at ~40% width, vertical center (matches spawn snap).
function _cameraFollowTarget(pl){
  const vw=camViewW(), vh=camViewH();
  return {
    x:pl.x+SW*0.5-vw*0.4,
    y:pl.y+FEET_OFF-vh*0.5
  };
}
function _cameraFollowTargetCoop(){
  const vw=camViewW(), vh=camViewH();
  const cx=(p.x+p2.x)*0.5+SW*0.5;
  const cy=(p.y+p2.y)*0.5+FEET_OFF;
  return {x:cx-vw*0.4, y:cy-vh*0.5};
}
let _camSettle=0;
function _snapCameraToPlayer(pl){
  if(!pl) return;
  const t=_cameraFollowTarget(pl);
  camX=camClampX(t.x);
  camY=camClampY(t.y);
  _camSettle=10;
  _snapRenderCam();
}
function _snapRenderCam(){
  if(MV2_VISUAL){ _rcamX=camX; _rcamY=camY; }
  else{ _rcamX=Math.floor(camX/SMS_SCALE)*SMS_SCALE; _rcamY=Math.floor(camY/SMS_SCALE)*SMS_SCALE; }
}
function sx(x){ return MV2_VISUAL?Math.round(x-_rcamX):Math.floor((x-_rcamX)/SMS_SCALE); }
function sy(y){ return MV2_VISUAL?Math.round(y-_rcamY):Math.floor((y-_rcamY)/SMS_SCALE); }
function sw(v){ return MV2_VISUAL?Math.max(1,Math.round(v)):Math.max(1,Math.floor(v/SMS_SCALE)); }
function _syncGameCamera(){
  if(_gameState!=='game'||!p) return;
  if(!isFinite(p.x)) p.x=_spawnX;
  if(!isFinite(p.y)) p.y=_spawnY;
  const t=(_playerCount===2&&p2&&isFinite(p2.x)&&isFinite(p2.y))
    ?_cameraFollowTargetCoop()
    :_cameraFollowTarget(p);
  const tx=camClampX(t.x), ty=camClampY(t.y);
  if(_camSettle>0){
    camX=tx; camY=ty;
    _camSettle--;
  }else if(_mapApplied&&_zoneIdx===0&&!_battleTestMode&&!_runTestMode&&
    (Math.abs(camX-tx)>120||Math.abs(camY-ty)>120)){
    camX=tx; camY=ty; _camSettle=4;
  }else{
    camX+=(tx-camX)*CAM_LERP;
    camY+=(ty-camY)*CAM_LERP;
  }
}

// ── Overlap / hitbox helpers ──────────────────────────────────
function ov(ax,ay,aw,ah,bx,by,bw,bh){ return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by; }
function hbH(ca){ return STAND_H-(STAND_H-DUCK_H)*ca; }
function hb(){ return playerCoreHB(p); }
function cpt(){ return {x:p.x+SW/2, y:p.y+FEET_OFF-STAND_H*0.5}; }

function playerCoreHB(pl){
  const ca2=pl.crouchAmt||0;
  const wcy=pl.y+FEET_OFF-WHEEL_R-2;
  const standBodyCY=pl.y+FEET_OFF-STAND_H-WHEEL_R+10;
  const duckBodyBottom=wcy+WHEEL_R*0.5;
  const duckBodyCY=duckBodyBottom-BODY_H;
  const bodyTop=standBodyCY+ca2*(duckBodyCY-standBodyCY);
  return {x:pl.x+SW/2-BODY_W/2, y:bodyTop, w:BODY_W, h:BODY_H};
}
function playerWheelCol(pl){ return {cx:pl.x+SW/2, cy:pl.y+FEET_OFF-WHEEL_R, r:WHEEL_R}; }
function playerHeadWorld(pl){
  const ca2=pl.crouchAmt||0;
  const px=pl.x, py=pl.y;
  const wcy=py+FEET_OFF-WHEEL_R-2;
  const standBodyCY=py+FEET_OFF-STAND_H-WHEEL_R+10;
  const duckBodyCY=(wcy+WHEEL_R*0.5)-BODY_H;
  const bodyCY=standBodyCY+ca2*(duckBodyCY-standBodyCY);
  const tuck=Math.max(ca2,pl._autoHeadTuck||0);
  const headR=14-tuck*3;
  const standHeadCY=bodyCY-18;
  const shellHeadCY=bodyCY+headR*1.05;
  const headCY=standHeadCY+tuck*(shellHeadCY-standHeadCY);
  return {cx:px+SW/2, cy:headCY, r:headR};
}
function _playerChargeInfo(pl){
  const wallWC=pl.wallGrip>0?(90-pl.wallGrip):0;
  const wallC=pl.wallGrip>0?Math.min(1,wallWC/60):0;
  const springC=Math.min(1,(pl.duckCharge||0)/60);
  const sprinting=pl===p&&isSprintHeld()&&(pl.og||_playerOnGround(pl))&&_moveInputX()!==0;
  const runC=sprinting?(pl.runRamp||0):0;
  const springReady=!!pl.duckBoostReady;
  const wallReady=!!pl._wallChargeReady;
  const chargeFrac=Math.max(springReady?1:springC,wallReady?1:wallC,runC);
  const ready=springReady||wallReady||(sprinting&&runC>=0.98);
  return {wallC,springC,runC,chargeFrac,ready,sprinting,springReady,wallReady};
}
function _circleRectOverlap(cx,cy,r,rx,ry,rw,rh){
  const nx=Math.max(rx,Math.min(cx,rx+rw));
  const ny=Math.max(ry,Math.min(cy,ry+rh));
  const dx=cx-nx, dy=cy-ny;
  return dx*dx+dy*dy<r*r;
}

// ── Platform normalizer + allP cache ─────────────────────────
function _normPlat(t){
  if(Array.isArray(t)) return {x:t[0],y:t[1],w:t[2],h:t[3],tp:t[4]||'solid',poly:t[5]==='poly',mv:null,mp:null};
  return {x:t.x,y:t.y,w:t.w,h:t.h,tp:t.tp||'solid',poly:!!t.poly,mv:t.mv||null,mp:t.mp||null};
}
let _allPCache=null, _allPCacheFr=-1;
function allP(){
  if(_allPCacheFr===fr) return _allPCache;
  const out=TR.map(_normPlat);
  for(const bw of BWALLS){ if(bw.hp>0) out.push({x:bw.x,y:bw.y,w:bw.w,h:bw.h,tp:'solid',mv:null,mp:null,bw}); }
  for(const m of MPLAT) out.push({x:m.x,y:m.y,w:m.w,h:m.h,tp:'oneway',mv:null,mp:m});
  for(const a of APLAT) out.push({x:a.x,y:a.y,w:a.w,h:a.h,tp:'oneway',mv:a,mp:null});
  _allPCache=out; _allPCacheFr=fr;
  return out;
}

// ── Spatial buckets for collision segments ────────────────────
function _rebuildCollSegBuckets(){
  _collSegBuckets=[];
  for(const seg of COLL_SEGS){
    const minX=Math.min(seg.x1,seg.x2), maxX=Math.max(seg.x1,seg.x2);
    const b0=Math.max(0,Math.floor(minX/_COLL_BUCKET_W));
    const b1=Math.floor(maxX/_COLL_BUCKET_W);
    for(let b=b0;b<=b1;b++){
      if(!_collSegBuckets[b]) _collSegBuckets[b]=[];
      _collSegBuckets[b].push(seg);
    }
  }
}
function _eachCollSegNear(x,pad,fn){
  if(!COLL_SEGS.length) return;
  const b0=Math.max(0,Math.floor((x-pad)/_COLL_BUCKET_W));
  const b1=Math.floor((x+pad)/_COLL_BUCKET_W);
  const seen=new Set();
  for(let b=b0;b<=b1;b++){
    const bucket=_collSegBuckets[b];
    if(!bucket) continue;
    for(const seg of bucket){ if(seen.has(seg)) continue; seen.add(seg); fn(seg); }
  }
}

// ── Seg geometry helpers ──────────────────────────────────────
function _xPushCap(pl){ return Math.max(8,Math.min(24,Math.abs(pl.vx||0)*0.55+6)); }
function _feetSamples(pl){ const fL=pl.x+FEET_L, fR=fL+FEET_W; return [fL+3,(fL+fR)*0.5,fR-3]; }
function _segYAtX(seg,x){
  const {x1,y1,x2,y2}=seg;
  const minX=Math.min(x1,x2)-COLL_SEAM, maxX=Math.max(x1,x2)+COLL_SEAM;
  if(x<minX||x>maxX) return null;
  const dx=x2-x1;
  if(Math.abs(dx)<0.25) return null;
  const t=(x-x1)/dx;
  if(t<-0.01||t>1.01) return null;
  return y1+t*(y2-y1);
}
function _segSupportAt(seg,samples){
  const ys=[];
  for(const x of samples){ const y=_segYAtX(seg,x); if(y!==null) ys.push(y); }
  if(!ys.length) return null;
  return Math.max(...ys);
}
function _querySegGround(pl,feet,prevFeet,landSlop){
  if(!COLL_SEGS.length) return null;
  const samples=_feetSamples(pl);
  let best=null;
  _eachCollSegNear(pl.x+SW*0.5,FEET_W+64,seg=>{
    const y=_segSupportAt(seg,samples);
    if(y===null) return;
    if(prevFeet!==null&&prevFeet>y+landSlop){ const drop=prevFeet-y; if(drop>COLL_LEDGE_STEP) return; if(pl.vy<-0.4&&drop>10) return; }
    if(feet<y-12) return;
    if(feet>y+Math.max(40,COLL_LEDGE_STEP)) return;
    const stick=pl._groundSeg===seg?0.4:0;
    if(!best||y+stick<best.y) best={y,seg,angle:seg.angle};
  });
  return best;
}
function _walkableYForPlayer(pl){
  const feet=pl.y+FEET_OFF;
  const fL=pl.x+FEET_L, fR=fL+FEET_W;
  let best=null;
  if(COLL_SEGS.length){
    const samples=_feetSamples(pl);
    _eachCollSegNear(pl.x+SW*0.5,FEET_W+48,seg=>{
      const y=_segSupportAt(seg,samples);
      if(y===null) return;
      const gap=feet-y;
      if(gap<-20||gap>24) return;
      if(best===null||y<best) best=y;
    });
  }
  if(best===null){
    for(const plat of allP()){
      if(plat.tp!=='solid') continue;
      if(!_feetSpanOver(plat,fL,fR)) continue;
      if(plat.poly&&plat.h>28) continue;
      const gap=feet-plat.y;
      if(gap<-20||gap>24) continue;
      if(best===null||plat.y<best) best=plat.y;
    }
  }
  return best;
}

// ── Slope geometry ────────────────────────────────────────────
function _surfaceUnderFeet(pl){
  const feet=pl.y+FEET_OFF;
  const y=_walkableYForPlayer(pl);
  if(y===null) return null;
  let seg=null, angle=0;
  if(COLL_SEGS.length){ const hit=_querySegGround(pl,feet,null,36); if(hit){seg=hit.seg;angle=hit.angle;} }
  return {y,seg,angle};
}
function _onWalkableTop(pl,plat){
  if(plat.tp!=='solid') return false;
  const feet=pl.y+FEET_OFF;
  const fL=pl.x+FEET_L, fR=fL+FEET_W;
  return _feetSpanOver(plat,fL,fR,4)&&feet>=plat.y-8&&feet<=plat.y+plat.h+10;
}
function _applySlopePhysics(pl){
  if(!pl||(pl.hook&&pl.hook.st==='on')||pl.wallGrip>0) return;
  const surf=_surfaceUnderFeet(pl);
  if(!surf){pl._onSlope=false;pl._slopeAngle=0;pl._groundSeg=null;return;}
  const feet=pl.y+FEET_OFF;
  const gap=surf.y-feet;
  const rising=pl.vy<-0.4;
  const nearSurf=gap>=-6&&gap<=Math.max(18,COLL_LEDGE_STEP);
  const onGround=pl.og||(!rising&&nearSurf&&pl.vy>=0);
  const ang=surf.seg?surf.seg.angle:0;
  const isSlope=Math.abs(ang)>0.09;
  if(onGround&&!rising&&nearSurf){ pl.y=surf.y-FEET_OFF; if(pl.vy>0.35) pl.vy=0; pl.og=true; pl._groundSeg=surf.seg||null; }
  if(onGround&&isSlope){
    pl._onSlope=true; pl._slopeAngle=ang;
    const driving=pl===p&&_moveInputX()!==0;
    if(!driving){
      const slideDir=Math.sign(Math.sin(ang))||1;
      const uphill=(slideDir>0&&isLf())||(slideDir<0&&isRt());
      const downhill=(slideDir>0&&isRt())||(slideDir<0&&isLf());
      if(!uphill) pl.vx+=GRAV*Math.sin(ang)*0.28;
      if(uphill) pl.vx*=0.82;
      if(downhill&&Math.abs(pl.vx)<RUN*0.5) pl.vx+=slideDir*0.05;
      const slopeCap=RUN*1.05;
      pl.vx=Math.max(-slopeCap,Math.min(slopeCap,pl.vx));
      const ducking=pl.crouchInput||(pl.crouchAmt||0)>0.25||(pl===p&&pl.og&&isDn());
      if(ducking){ const duckAmt=Math.max(pl.crouchAmt||0,pl.crouchInput?0.9:0.5); pl.vx*=Math.pow(0.52,1+duckAmt*1.5); if(Math.abs(pl.vx)<0.07) pl.vx=0; }
      else if(!isLf()&&!isRt()){ pl.vx*=0.85; if(Math.abs(pl.vx)<0.12) pl.vx=0; }
    }
    if(Math.abs(ang)>0.45&&Math.abs(pl.vx)>RUN&&!driving) pl.vx*=0.92;
    if(pl.vy>2) pl.vy=Math.min(pl.vy,2);
  }else{ pl._onSlope=false; if(!isSlope) pl._slopeAngle=0; }
}
function _wheelEdgeRoll(pl){
  if(!pl||!pl.og) return;
  if(pl.hook&&pl.hook.st==='on') return;
  if(pl._onSlope) return;
  if(Math.abs(pl.vx||0)<1.15) return;
  const ducked=(pl.crouchAmt||0)>0.25||(pl===p&&!!pl.crouchInput);
  if(ducked) return;
  const cx=pl.x+SW/2, feet=pl.y+FEET_OFF;
  let centerOn=false, rim=null;
  for(const q of allP()){
    if(q.tp!=='solid'&&q.tp!=='oneway') continue;
    if(Math.abs(feet-q.y)>8) continue;
    if(cx>=q.x&&cx<=q.x+q.w){centerOn=true;break;}
    if(cx>q.x+q.w&&cx<q.x+q.w+WHEEL_R){ const d=cx-(q.x+q.w); if(!rim||d<rim.d) rim={d,dir:1}; }
    else if(cx<q.x&&cx>q.x-WHEEL_R){ const d=q.x-cx; if(!rim||d<rim.d) rim={d,dir:-1}; }
  }
  if(centerOn||!rim) return;
  const lean=rim.d/WHEEL_R;
  pl.vx+=rim.dir*(0.12+lean*0.3);
  if(lean>0.55){pl.og=false;pl.vy=Math.max(pl.vy,0.4);}
}
function _feetSpanOver(plat,fL,fR,seam=COLL_SEAM){ return fR>plat.x-seam&&fL<plat.x+plat.w+seam; }
function _feetPlatSpan(pl,plat,seam=COLL_SEAM){ const fL=pl.x+FEET_L, fR=fL+FEET_W; return _feetSpanOver(plat,fL,fR,seam); }
function _platNearX(plat,cx,pad){ return plat.x+plat.w>=cx-pad&&plat.x<=cx+pad; }
function _mergeCollRects(rects,gap=COLL_SEAM){
  const solid=rects.filter(r=>(Array.isArray(r)?r[4]:r.tp||'solid')==='solid').map(r=>{
    if(Array.isArray(r)) return r.slice();
    const out=[r.x,r.y,r.w,r.h,r.tp||'solid']; if(r.poly) out[5]='poly'; return out;
  });
  const other=rects.filter(r=>(Array.isArray(r)?r[4]:r.tp||'solid')!=='solid');
  let changed=true;
  while(changed){
    changed=false;
    outer:for(let i=0;i<solid.length;i++){
      for(let j=i+1;j<solid.length;j++){
        const a=solid[i], b=solid[j];
        if(Math.abs(a[1]-b[1])<=gap&&Math.abs(a[3]-b[3])<=gap){
          const aR=a[0]+a[2], bR=b[0]+b[2];
          if(aR>=b[0]-gap&&a[0]<=bR+gap){
            const nx=Math.min(a[0],b[0]), nr=Math.max(aR,bR);
            solid[i]=[nx,Math.min(a[1],b[1]),nr-nx,Math.max(a[3],b[3]),'solid',(a[5]==='poly'||b[5]==='poly')?'poly':a[5]||b[5]];
            solid.splice(j,1); changed=true; break outer;
          }
        }
        if(Math.abs(a[0]-b[0])<=gap&&Math.abs(a[2]-b[2])<=gap){
          const aB=a[1]+a[3], bB=b[1]+b[3];
          if(aB>=b[1]-gap&&a[1]<=bB+gap){
            const ny=Math.min(a[1],b[1]), nb=Math.max(aB,bB);
            solid[i]=[a[0],ny,a[2],nb-ny,'solid',(a[5]==='poly'||b[5]==='poly')?'poly':a[5]||b[5]];
            solid.splice(j,1); changed=true; break outer;
          }
        }
      }
    }
  }
  return solid.concat(other);
}

// ── Wall segment resolution ───────────────────────────────────
function _wallXAtY(seg,y){
  const dy=seg.y2-seg.y1;
  if(Math.abs(dy)<0.5) return (seg.x1+seg.x2)*0.5;
  const t=Math.max(0,Math.min(1,(y-seg.y1)/dy));
  return seg.x1+(seg.x2-seg.x1)*t;
}
function _resolveWallSegBodyX(pl,seg){
  const h=playerCoreHB(pl);
  const bodyL=h.x, bodyR=h.x+h.w, bodyT=h.y, bodyB=h.y+h.h;
  if(bodyB<=seg.minY||bodyT>=seg.maxY) return false;
  const wallX=_wallXAtY(seg,(bodyT+bodyB)*0.5);
  if(bodyR<=wallX||bodyL>=wallX) return false;
  const penL=bodyR-wallX, penR=wallX-bodyL;
  const cap=_xPushCap(pl);
  const vx=pl.vx||0;
  let pushLeft;
  if(seg.insideLeft) pushLeft=vx>0.12||(vx>=-0.12&&vx<=0.12&&penL<=penR);
  else pushLeft=vx<-0.12||(vx>=-0.12&&vx<=0.12&&penL<penR);
  const push=Math.min(pushLeft?penL:penR,cap);
  if(push<=0) return false;
  pl.x+=pushLeft?-push:push;
  return true;
}
function _resolvePlatBodyX(pl,plat){
  if(plat.tp!=='solid') return false;
  const feet=pl.y+FEET_OFF;
  const fL=pl.x+FEET_L, fR=fL+FEET_W;
  if(_feetSpanOver(plat,fL,fR,8)&&feet>=plat.y-14&&feet<=plat.y+24) return false;
  if(_playerStandingOnPlat(pl,plat)) return false;
  const h=playerCoreHB(pl);
  if(!ov(h.x,h.y,h.w,h.h,plat.x,plat.y,plat.w,plat.h)) return false;
  if(plat.poly&&_useSegGround&&plat.h<=32){
    if(_onWalkableTop(pl,plat)) return false;
    const sidePenL=h.x+h.w-plat.x, sidePenR=plat.x+plat.w-h.x;
    const yPen=Math.min(h.y+h.h-plat.y,plat.y+plat.h-h.y);
    const xPen=Math.min(sidePenL,sidePenR);
    const onFloorStrip=feet>=plat.y-6&&feet<=plat.y+plat.h+10;
    if(onFloorStrip&&xPen<=yPen+4) return false;
  }
  const penL=(h.x+h.w)-plat.x, penR=(plat.x+plat.w)-h.x;
  const push=Math.min(penL,penR,_xPushCap(pl));
  if(push<=0) return false;
  if(penL<=penR) pl.x-=push; else pl.x+=push;
  return true;
}
function _playerStandingOnPlat(pl,plat){
  const feet=pl.y+FEET_OFF;
  const fL=pl.x+FEET_L, fR=fL+FEET_W;
  if(!_feetSpanOver(plat,fL,fR,4)) return false;
  const topTol=plat.h>20?2:12;
  return feet>=plat.y-8&&feet<=plat.y+topTol;
}
function resolveBodyX(pl){
  const passes=Math.abs(pl.vx||0)>WLK+2?8:4;
  const cap=_xPushCap(pl);
  const cx=pl.x+SW*0.5, xPad=SW+40;
  for(let pass=0;pass<passes;pass++){
    let moved=false;
    for(const seg of COLL_WALL_SEGS){ if(_resolveWallSegBodyX(pl,seg)) moved=true; }
    for(const plat of allP()){
      if(plat.tp!=='solid') continue;
      if(plat.poly&&_useSegGround) continue;
      if(!_platNearX(plat,cx,xPad)) continue;
      if(_resolvePlatBodyX(pl,plat)) moved=true;
    }
    const h=playerCoreHB(pl);
    for(const c of CRATES){
      if(!ov(h.x,h.y,h.w,h.h,c.x,c.y,c.w,c.h)) continue;
      const penL=(h.x+h.w)-c.x, penR=(c.x+c.w)-h.x;
      const push=Math.min(penL,penR,cap);
      if(penL<=penR) pl.x-=push; else pl.x+=push;
      moved=true;
    }
    if(!moved) break;
  }
}
function resX(){ resolveBodyX(p); }

// ── Y resolution ──────────────────────────────────────────────
function resolvePlatY(pl,prevFeet){
  const wasOg=pl.og; pl.og=false;
  const feet=pl.y+FEET_OFF;
  const fL=pl.x+FEET_L, fR=fL+FEET_W;
  const h=playerCoreHB(pl);
  const landSlop=Math.max(12,Math.abs(pl.vy)+10);
  if(pl.vy>=0){
    let bestTop=null;
    const slopeSurf=_querySegGround(pl,feet,prevFeet,landSlop);
    if(slopeSurf){ bestTop=slopeSurf.y; pl._groundSeg=slopeSurf.seg; pl._slopeAngle=slopeSurf.angle; pl._onSlope=Math.abs(slopeSurf.angle)>0.09; }
    for(const plat of allP()){
      if(plat.tp!=='solid') continue;
      if(plat.poly&&_useSegGround) continue;
      if(!_platNearX(plat,pl.x+SW*0.5,SW+48)) continue;
      if(!_feetSpanOver(plat,fL,fR)) continue;
      if(prevFeet>plat.y+landSlop) continue;
      if(feet<plat.y-6) continue;
      if(feet>plat.y+plat.h) continue;
      if(bestTop===null||plat.y<bestTop) bestTop=plat.y;
    }
    if(bestTop!==null){
      if(pl.hook&&pl.hook.st==='on') return;
      const landVy=pl.vy, impactVy=Math.max(landVy,pl._peakVy||0);
      pl._peakVy=0;
      pl.y=bestTop-FEET_OFF; pl.vy=0; pl.og=true;
      if(!wasOg){
        const landAmp=Math.min(1,Math.max(0.22,impactVy/10));
        pl._landAmp=landAmp;
        pl.landF=Math.round(10+landAmp*22);
        pl.jumpTiltF=0;
        pl.suspComp=Math.min(1,Math.max(pl.suspComp||0,landAmp*0.82));
        pl.suspVel=Math.max(pl.suspVel||0,landAmp*0.14);
        if(pl===p&&!(pl.hook&&pl.hook.st==='on')) sfx('land');
      }
      if(landVy>5.5) pl.vy=-Math.min(0.9,landVy*0.08);
      return;
    }
  }
  for(const plat of allP()){
    if(plat.tp==='oneway'){
      if(pl.hook&&pl.hook.st==='on') continue;
      if(!_platNearX(plat,pl.x+SW*0.5,SW+32)) continue;
      if(pl.vy>=0&&_feetSpanOver(plat,fL,fR)&&prevFeet<=plat.y+landSlop&&feet>=plat.y-2){
        pl.y=plat.y-FEET_OFF; pl.vy=0; pl.og=true;
        if(plat.mv) pl.x+=plat.mv.dx;
        if(plat.mp) pl.x+=plat.mp.vx*0.5;
      }
    }else if(plat.tp==='solid'||plat.tp==='ceil'){
      if(!_platNearX(plat,pl.x+SW*0.5,SW+32)) continue;
      const head=playerHeadWorld(pl);
      if(pl.vy<0&&_circleRectOverlap(head.cx,head.cy,head.r,plat.x,plat.y,plat.w,plat.h)){
        const ceilB=plat.y+plat.h, headTop=head.cy-head.r;
        if(headTop<ceilB){pl.y+=ceilB-headTop;pl.vy=0;pl._autoHeadTuck=Math.min(1,(pl._autoHeadTuck||0)+0.18);}
      }else if(ov(h.x,h.y,h.w,h.h,plat.x,plat.y,plat.w,plat.h)&&pl.vy<0){
        pl.y=plat.y+plat.h-(FEET_OFF-(pl===p?hbH(pl.crouchAmt):STAND_H));
        pl.vy=0;
      }
    }
  }
}
function resY(prevFeet){ resolvePlatY(p,prevFeet); }
function _bwallOverlapsPlayer(bw,pl){ if(!pl) return false; const h=playerCoreHB(pl); return ov(h.x,h.y,h.w,h.h,bw.x,bw.y,bw.w,bw.h); }
function _resolveHeadCeiling(pl){
  if(!pl) return;
  const head=playerHeadWorld(pl);
  let hit=false;
  const cx=pl.x+SW*0.5;
  for(const plat of allP()){
    if(plat.tp!=='ceil'&&plat.tp!=='solid') continue;
    if(!_platNearX(plat,cx,SW+24)) continue;
    if(!_circleRectOverlap(head.cx,head.cy,head.r,plat.x,plat.y,plat.w,plat.h)) continue;
    const ceilB=plat.y+plat.h, headTop=head.cy-head.r;
    if(headTop<ceilB){ pl.y+=ceilB-headTop; if(pl.vy<0) pl.vy=0; pl._autoHeadTuck=Math.min(1,(pl._autoHeadTuck||0)+0.22); hit=true; }
  }
  if(!hit) pl._autoHeadTuck=Math.max(0,(pl._autoHeadTuck||0)-0.05);
}

// ── Multi-step player move ────────────────────────────────────
function _movePlayerWithColl(pl,vx,vy){
  const stepSz=(pl===p&&(Math.abs(vx)>WLK+0.5||Math.abs(vy)>8))?2:COLL_MOVE_STEP;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(vx),Math.abs(vy))/stepSz));
  for(let i=0;i<steps;i++){
    const sx2=vx/steps, sy2=vy/steps;
    pl.x+=sx2;
    if(pl.x<0){pl.x=0;pl.vx=0;}
    if(pl.x>WW-SW){pl.x=WW-SW;pl.vx=0;}
    resolveBodyX(pl);
    const pf=pl.y+FEET_OFF;
    pl.y+=sy2;
    resolvePlatY(pl,pf);
    if(pl.og&&sy2>0) break;
  }
  if(!pl.og&&pl.vy>=0&&pl.vy<4){
    const surf=_walkableYForPlayer(pl);
    if(surf!==null){ const feet=pl.y+FEET_OFF; if(feet>=surf-8&&feet<=surf+COLL_LEDGE_STEP){pl.y=surf-FEET_OFF;pl.vy=0;pl.og=true;} }
  }
}

// ── Actor (enemy) physics ─────────────────────────────────────
function _actorFeetSpan(a,feetOff){
  const pad=Math.max(4,Math.floor(a.w*0.16)), cx=a.x+a.w/2;
  const half=Math.max(6,Math.floor((a.w-pad*2)*0.5));
  return {fL:cx-half,fR:cx+half,feet:a.y+feetOff,hb:{x:a.x+pad,y:a.y+4,w:a.w-pad*2,h:Math.max(8,a.h-feetOff*0.35)}};
}
function _resolveActorBodyX(a,feetOff){
  const {hb,feet}=_actorFeetSpan(a,feetOff);
  const cap=Math.min(10,Math.max(4,a.w*0.14));
  for(let pass=0;pass<4;pass++){
    let moved=false;
    for(const plat of allP()){
      if(plat.tp!=='solid') continue;
      if(!ov(hb.x,hb.y,hb.w,hb.h,plat.x,plat.y,plat.w,plat.h)) continue;
      if(feet>=plat.y-14&&feet<=plat.y+plat.h+12) continue;
      const penL=(hb.x+hb.w)-plat.x, penR=(plat.x+plat.w)-hb.x;
      const push=Math.min(penL,penR,cap);
      if(push<=0) continue;
      a.x+=(penL<=penR)?-push:push; moved=true;
    }
    if(!moved) break;
  }
  a.x=Math.max(0,Math.min(WW-a.w,a.x));
}
function _resolveActorPlatY(a,prevFeet,feetOff){
  a.og=false;
  const feet=a.y+feetOff;
  const {fL,fR,hb}=_actorFeetSpan(a,feetOff);
  const landSlop=Math.max(12,Math.abs(a.vy||0)+10);
  if((a.vy||0)>=0){
    let bestTop=null;
    if(COLL_SEGS.length){
      const samples=[a.x+a.w/2,fL,fR];
      _eachCollSegNear(a.x+a.w*0.5,a.w+48,seg=>{
        const y=_segSupportAt(seg,samples);
        if(y===null) return;
        if(prevFeet>y+landSlop) return;
        if(feet<y-6) return;
        if(bestTop===null||y>bestTop) bestTop=y;
      });
    }
    for(const plat of allP()){
      if(plat.tp!=='solid') continue;
      if(fR<=plat.x||fL>=plat.x+plat.w) continue;
      if(plat.poly&&_useSegGround&&bestTop!==null) continue;
      if(prevFeet>plat.y+landSlop) continue;
      if(feet<plat.y-6) continue;
      if(feet>plat.y+plat.h) continue;
      if(bestTop===null||plat.y<bestTop) bestTop=plat.y;
    }
    if(bestTop!==null){ a.y=bestTop-feetOff; a.vy=0; a.og=true; return; }
  }
  for(const plat of allP()){
    if(plat.tp!=='solid'&&plat.tp!=='ceil') continue;
    if(!ov(hb.x,hb.y,hb.w,hb.h,plat.x,plat.y,plat.w,plat.h)) continue;
    if((a.vy||0)<0&&hb.y<plat.y+plat.h){ a.y=plat.y+plat.h; a.vy=0; }
    else if((a.vy||0)>0&&feet>plat.y&&feet<=plat.y+plat.h+8){ a.y=plat.y-feetOff; a.vy=0; a.og=true; }
  }
}
function _moveActorWithColl(a,vx,vy,feetOff){
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(vx),Math.abs(vy))/COLL_MOVE_STEP));
  for(let i=0;i<steps;i++){
    const sx2=vx/steps, sy2=vy/steps;
    a.x+=sx2; _resolveActorBodyX(a,feetOff);
    const pf=a.y+feetOff; a.y+=sy2; _resolveActorPlatY(a,pf,feetOff);
    if(a.og&&sy2>0) break;
  }
  if(!a.og&&(a.vy||0)>=0&&(a.vy||0)<4){
    const cx=a.x+a.w/2;
    let surf=null;
    if(COLL_SEGS.length){ const fake={x:a.x,y:a.y}; const hit=_querySegGround(fake,a.y+feetOff,null,36); if(hit) surf=hit.y; }
    if(surf===null){ for(const plat of allP()){ if(plat.tp!=='solid'||plat.poly) continue; if(cx<plat.x||cx>plat.x+plat.w) continue; if(surf===null||plat.y>surf) surf=plat.y; } }
    const feet=a.y+feetOff;
    if(surf!==null&&feet>=surf-8&&feet<=surf+COLL_LEDGE_STEP){ a.y=surf-feetOff; a.vy=0; a.og=true; }
  }
}
function _applyActorGravity(a,feetOff,gravMul=0.55){
  a.vy=Math.min((a.vy||0)+GRAV*gravMul,11);
  _moveActorWithColl(a,a.vx||0,a.vy,feetOff);
}
function _applyMindEnemyPhysics(e){
  if(!e.crouchAmt) e.crouchAmt=0;
  if(!e.hook) e.hook={st:'idle'};
  if(!e.wallGrip) e.wallGrip=0;
  _movePlayerWithColl(e,e.vx||0,e.vy||0);
}

// ── Polygon helpers ───────────────────────────────────────────
function _pointInPoly(px,py,pts){
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
function _buildTopWalkSegs(pts){
  const segs=[];
  for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len<3) continue;
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    const sample=Math.max(8,len*0.12);
    const inBelow=_pointInPoly(mx,my+sample,pts);
    const inAbove=_pointInPoly(mx,my-sample,pts);
    // Keep top walk surfaces (room floors + platform tops, skip ceilings).
    const centY=pts.reduce((s,p)=>s+p.y,0)/pts.length;
    const roomFloor=inAbove&&!inBelow;
    const platTop=!inAbove&&inBelow&&my>=centY;
    if(!roomFloor&&!platTop) continue;
    const angle=Math.atan2(dy,dx);
    if(Math.abs(Math.cos(angle))<0.05) continue;
    const ux=dx/len,uy=dy/len,pad=COLL_SEAM*0.5;
    segs.push({id:segs.length,x1:a.x-ux*pad,y1:a.y-uy*pad,x2:b.x+ux*pad,y2:b.y+uy*pad,len:len+pad*2,angle,ux,uy});
  }
  return segs;
}
function _buildWallSegs(pts){
  const segs=[];
  for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len<3) continue;
    if(Math.abs(dx)>Math.abs(dy)*0.55) continue;
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    const sample=Math.max(10,len*0.1);
    const lax=-dy/len,lay=dx/len;
    const inA=_pointInPoly(mx+lax*sample,my+lay*sample,pts);
    const inB=_pointInPoly(mx-lax*sample,my-lay*sample,pts);
    if(inA===inB) continue;
    segs.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y,len,insideLeft:inA,minY:Math.min(a.y,b.y)-COLL_SEAM,maxY:Math.max(a.y,b.y)+COLL_SEAM});
  }
  return segs;
}

// ── Stability passes ──────────────────────────────────────────
function _resolvePlayerInSolids(pl){
  if(!pl) return;
  const cx=pl.x+SW*0.5, xPad=SW+40;
  for(let pass=0;pass<6;pass++){
    const h=playerCoreHB(pl);
    let moved=false;
    for(const plat of allP()){
      if(plat.tp!=='solid') continue;
      if(plat.poly&&_useSegGround) continue;
      if(_useSegGround&&plat.h>24) continue;
      if(!_platNearX(plat,cx,xPad)) continue;
      if(!ov(h.x,h.y,h.w,h.h,plat.x,plat.y,plat.w,plat.h)) continue;
      if(_playerStandingOnPlat(pl,plat)&&!plat.poly) continue;
      const overlapX=Math.min(h.x+h.w,plat.x+plat.w)-Math.max(h.x,plat.x);
      const overlapY=Math.min(h.y+h.h,plat.y+plat.h)-Math.max(h.y,plat.y);
      if(overlapX<=0||overlapY<=0) continue;
      const fromLeft=h.x+h.w/2<plat.x+plat.w/2;
      const horiz=overlapX<=overlapY||plat.h<=18;
      const feet=pl.y+FEET_OFF;
      if(horiz) pl.x+=fromLeft?-overlapX:overlapX;
      else if(feet<=plat.y+18||h.y+h.h*0.5<=plat.y+plat.h*0.35){ pl.y-=overlapY; if(pl.vy>0) pl.vy*=0.5; }
      else continue;
      moved=true;
    }
    pl.x=Math.max(0,Math.min(WW-SW,pl.x));
    if(!moved) break;
  }
}
function _recoverFromInterior(pl){
  if(!pl||!COLL_POLYS.length) return;
  const cx=pl.x+SW/2, feet=pl.y+FEET_OFF;
  for(const pts of COLL_POLYS){
    if(!_pointInPoly(cx,feet+6,pts)) continue;
    const surf=_walkableYForPlayer(pl);
    if(surf!==null&&feet>surf+6){ pl.y=surf-FEET_OFF; pl.vy=0; pl.vx*=0.5; pl.og=true; return; }
  }
}
function _enforceGroundContact(pl){
  if(!pl||pl.vy<-0.5) return;
  if(pl.hook&&pl.hook.st==='on') return;
  if(pl.wallGrip>0) return;
  const surf=_walkableYForPlayer(pl);
  if(surf===null) return;
  const feet=pl.y+FEET_OFF;
  if(feet>=surf-12&&feet<=surf+COLL_LEDGE_STEP){ pl.y=surf-FEET_OFF; if(pl.vy>0) pl.vy=0; pl.og=true; }
}
function _resolveSpawnPlacement(pl){
  if(!pl) return;
  const cx=pl.x+SW*0.5;
  let markerFeet=pl.y+FEET_OFF;
  if(typeof _canvasFloorFeetAt==='function'){
    const canvasFeet=_canvasFloorFeetAt(cx,markerFeet);
    if(canvasFeet!=null) markerFeet=canvasFeet;
  }
  let surf=_spawnSurfaceYAt(cx,markerFeet,64,true);
  if(surf==null) surf=_spawnSurfaceYAt(cx,markerFeet,480,true);
  if(surf==null&&!_useSegGround) surf=_spawnSurfaceYAt(cx,markerFeet,480,false);
  if(surf!=null){ pl.y=surf-FEET_OFF; pl.og=true; pl.vy=0; }
  _resolvePlayerInSolids(pl);
  _recoverFromInterior(pl);
  const walk=_walkableYForPlayer(pl);
  if(walk!=null){
    const feet=pl.y+FEET_OFF;
    if(feet>walk+1||feet<walk-12){ pl.y=walk-FEET_OFF; pl.og=true; pl.vy=0; }
  }
  _resolvePlayerInSolids(pl);
  _enforceGroundContact(pl);
}
function _stabilizePlayerCollision(pl){
  if(!pl) return;
  if(pl.hook&&pl.hook.st==='on') return;
  if(pl.wallGrip>0) return;
  _resolvePlayerInSolids(pl);
  _recoverFromInterior(pl);
  _applyWheelGroundContact(pl);
  _enforceGroundContact(pl);
  _resolveHeadCeiling(pl);
  _applySlopePhysics(pl);
}

// ── Segment / AABB intersection ───────────────────────────────
function _segAabbHit(x1,y1,x2,y2,pl){
  const rx=pl.x,ry=pl.y,rw=pl.w,rh=pl.h;
  const edges=[
    {x1:rx,y1:ry,x2:rx,y2:ry+rh,nx:-1,ny:0},{x1:rx+rw,y1:ry,x2:rx+rw,y2:ry+rh,nx:1,ny:0},
    {x1:rx,y1:ry,x2:rx+rw,y2:ry,nx:0,ny:-1},{x1:rx,y1:ry+rh,x2:rx+rw,y2:ry+rh,nx:0,ny:1}
  ];
  const ex=x2-x1,ey=y2-y1;
  let best=null,bestT=1;
  for(const e of edges){
    const fx=e.x2-e.x1,fy=e.y2-e.y1,dn=ex*fy-ey*fx;
    if(Math.abs(dn)<.001) continue;
    const t=((e.x1-x1)*fy-(e.y1-y1)*fx)/dn;
    const u=((e.x1-x1)*ey-(e.y1-y1)*ex)/dn;
    if(t>=0&&t<=1&&u>=0&&u<=1&&t<bestT){bestT=t;best={tx:x1+t*ex,ty:y1+t*ey,nx:e.nx,ny:e.ny};}
  }
  return best;
}
function segHit(x1,y1,x2,y2,pl){ const hit=_segAabbHit(x1,y1,x2,y2,pl); return hit?{tx:hit.tx,ty:hit.ty}:null; }

// ── Wheel suspension ──────────────────────────────────────────
function _groundYAtWheel(pl,ahead){
  if(!pl) return null;
  const cx=pl.x+SW/2+(ahead||0), feet=pl.y+FEET_OFF;
  const fL=cx-WHEEL_R*0.6, fR=cx+WHEEL_R*0.6;
  let best=null;
  if(COLL_SEGS.length){
    _eachCollSegNear(cx,FEET_W+48,seg=>{
      const y=_segSupportAt(seg,[cx,fL,fR]);
      if(y===null) return;
      if(feet>y+COLL_LEDGE_STEP+8||feet<y-28) return;
      if(best===null||y>best) best=y;
    });
  }
  for(const plat of allP()){
    if(plat.tp!=='solid') continue;
    if(plat.poly&&_useSegGround) continue;
    if(fR<=plat.x||fL>=plat.x+plat.w) continue;
    if(feet>plat.y+plat.h+COLL_LEDGE_STEP||feet<plat.y-28) continue;
    if(best===null||plat.y>best) best=plat.y;
  }
  return best;
}
function _applyWheelGroundContact(pl){
  if(!pl||(pl.hook&&pl.hook.st==='on')||pl.wallGrip>0) return;
  const dir=Math.sign(pl.vx||0)||1;
  const gNow=_groundYAtWheel(pl,0), gAhead=_groundYAtWheel(pl,dir*WHEEL_R*0.9);
  const targetY=gNow===null?gAhead:(gAhead===null?gNow:Math.max(gNow,gAhead));
  if(targetY===null) return;
  const feet=pl.y+FEET_OFF, rise=targetY-feet;
  if(rise>0&&rise<=SUSP_ROLL_MAX&&(pl.og||pl.vy>=0)&&Math.abs(pl.vx)>0.15){
    pl.y+=rise*0.72; pl.suspComp=Math.min(1,(pl.suspComp||0)+rise/SUSP_ROLL_MAX*0.62); pl.og=true; if(pl.vy>0) pl.vy=0;
  }else if(Math.abs(rise)<=14&&(pl.og||pl.vy>=0)){ pl.y+=(targetY-feet)*0.88; pl.og=true; if(pl.vy>0) pl.vy=0; }
}
function _updateWheelSuspension(pl,prevVx){
  if(!pl) return;
  let target=0.14;
  if(pl.hook&&pl.hook.st==='on') target=0.5;
  else if(!pl.og&&!pl._onSlope) target=0.68+Math.min(0.3,Math.abs(pl.vy)*0.035);
  else if(pl.og){
    const spd=Math.abs(pl.vx||0);
    if(pl.landF>0) target=0.32+Math.min(0.58,(pl._landAmp||0.45)*0.9);
    else if(spd>0.25) target=0.1+Math.sin(fr*0.4+pl.x*0.035)*0.09*Math.min(1,spd/WLK);
    const dir=Math.sign(pl.vx||0)||1;
    const gNow=_groundYAtWheel(pl,0), gAhead=_groundYAtWheel(pl,dir*WHEEL_R*0.85);
    if(gNow!==null&&gAhead!==null){ const bump=Math.max(0,gAhead-gNow); if(bump>0) target=Math.min(1,target+bump/SUSP_ROLL_MAX*0.75); }
  }
  const stiff=pl.og?SUSP_STIFF:SUSP_STIFF*0.65;
  pl.suspVel=(pl.suspVel||0)+((target-(pl.suspComp||0))*stiff);
  pl.suspVel*=(pl.og?SUSP_DAMP:0.76);
  pl.suspComp=Math.max(0,Math.min(1,(pl.suspComp||0)+pl.suspVel));
  const accel=(pl.vx||0)-(prevVx||0);
  const tiltTgt=pl.og?Math.sign(pl.vx||0)*Math.min(0.38,Math.abs(pl.vx)/RUN*0.34)+accel*0.04:0;
  pl.suspTilt=((pl.suspTilt||0)+(tiltTgt-(pl.suspTilt||0))*0.16);
}
function _rollWheelFromTravel(pl,x0,y0){
  if(!pl) return;
  if(pl.hook&&pl.hook.st==='on') return;
  if(pl.wallGrip>0) return;
  if(pl.xlrOn||pl.magOn) return;
  if(!pl.og&&!pl._onSlope) return;
  const dx=pl.x-x0, dy=pl.y-y0;
  if(Math.abs(dx)<0.01) return;
  const dist=pl._onSlope?Math.hypot(dx,dy):Math.abs(dx);
  pl.wheelAngle=(pl.wheelAngle||0)+Math.sign(dx)*dist/WHEEL_R;
}

// ── Push / pull (XLR/MAG) ─────────────────────────────────────
function _ropeColliders(){
  const out=[];
  for(const q of allP()) if(q.tp==='solid'||q.tp==='ceil') out.push(q);
  for(const c of CRATES) out.push({x:c.x,y:c.y,w:c.w,h:c.h,tp:'solid'});
  for(const bw of BWALLS){ if(bw.hp<=0) continue; out.push({x:bw.x,y:bw.y,w:bw.w,h:bw.h,tp:'solid'}); }
  return out;
}
function _raySolidDist(x,y,ux,uy,maxD,step=7){
  const len=Math.hypot(ux,uy)||1;
  ux/=len; uy/=len;
  let best=maxD+1;
  for(let t=step;t<=maxD;t+=step){
    const px=x+ux*t, py=y+uy*t;
    for(const q of allP()){ if(q.tp!=='solid'&&q.tp!=='ceil') continue; if(px>=q.x&&px<=q.x+q.w&&py>=q.y&&py<=q.y+q.h){best=Math.min(best,t);break;} }
    if(best<=maxD) break;
    for(const bw of BWALLS){ if(bw.hp<=0||bw.movable) continue; if(px>=bw.x&&px<=bw.x+bw.w&&py>=bw.y&&py<=bw.y+bw.h){best=Math.min(best,t);break;} }
    if(best<=maxD) break;
  }
  return best;
}
function _pullTargetBlocked(ox,oy,tox,toy,w,h){
  const mx=ox+(tox-ox)*0.38, my=oy+(toy-oy)*0.38;
  const hw=(w||28)*0.5, hh=(h||28)*0.5;
  for(const q of allP()){ if(q.tp!=='solid'&&q.tp!=='ceil') continue; if(ov(mx-hw,my-hh,w||28,h||28,q.x,q.y,q.w,q.h)) return true; }
  for(const bw of BWALLS){ if(bw.hp<=0||!bw.movable) continue; if(ov(mx-hw,my-hh,w||28,h||28,bw.x,bw.y,bw.w,bw.h)) return true; }
  return false;
}
function _applyPushWallReaction(pl,originX,originY,aimA,range,held){
  if(pl.hook&&pl.hook.st==='on') return;
  const ux=Math.cos(aimA), uy=Math.sin(aimA);
  const holdScale=Math.min(1,(held||0)/180)*1.5+1;
  const block=_raySolidDist(originX,originY,ux,uy,range);
  if(block<=range){ const prox=Math.pow(1-block/range,1.65); const react=prox*2.5*holdScale; pl.vx-=ux*react; pl.vy-=uy*react*0.9; }
  const core=cpt();
  if(uy>0.35){ const floorD=_raySolidDist(core.x,pl.y+FEET_OFF,0,1,44,5); if(floorD<38){ const prox=Math.pow(1-floorD/38,1.45); pl.vy-=prox*1.7*holdScale; } }
  if(uy<-0.35){ const headY=pl.y+FEET_OFF-STAND_H+6; const ceilD=_raySolidDist(core.x,headY,0,-1,40,5); if(ceilD<34){ const prox=Math.pow(1-ceilD/34,1.45); pl.vy+=prox*1.5*holdScale; } }
}
function _applyPullPlayerTug(pl,centerX,centerY,fx,fy,ox,oy,w,h,range,blockedOnly){
  if(pl.hook&&pl.hook.st==='on') return {x:0,y:0,w:0};
  const dx=ox-centerX, dy=oy-centerY, dist=Math.hypot(dx,dy)||1;
  if(dist>range) return {x:0,y:0,w:0};
  const blocked=_pullTargetBlocked(ox,oy,centerX,centerY,w,h);
  const stuckNear=dist<58;
  if(blockedOnly&&!blocked&&!stuckNear) return {x:0,y:0,w:0};
  const prox=Math.pow(1-dist/range,1.25);
  const boost=blocked?2.6:(stuckNear?1.35:0.55);
  return {x:(dx/dist)*fx*prox*boost, y:(dy/dist)*fy*prox*boost, w:prox*boost};
}

// ── Rope path helpers ─────────────────────────────────────────
function _ropePathLen(pts){ let len=0; for(let i=1;i<pts.length;i++) len+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y); return len; }
function _segPathClear(x1,y1,x2,y2){ for(const q of _ropeColliders()){ if(_segAabbHit(x1,y1,x2,y2,q)) return false; } return true; }
function _ropeNearestCorner(rect,hx,hy){
  const cs=[{x:rect.x,y:rect.y},{x:rect.x+rect.w,y:rect.y},{x:rect.x,y:rect.y+rect.h},{x:rect.x+rect.w,y:rect.y+rect.h}];
  let best=cs[0], bd=1e18;
  for(const c of cs){ const d=(c.x-hx)**2+(c.y-hy)**2; if(d<bd){bd=d;best=c;} }
  const cx=rect.x+rect.w*0.5, cy=rect.y+rect.h*0.5;
  return {x:best.x+(best.x>cx?2.5:-2.5), y:best.y+(best.y>cy?2.5:-2.5)};
}
function _ropeFirstHit(x1,y1,x2,y2){
  let best=null, bt=1;
  const segLen=Math.hypot(x2-x1,y2-y1)||1;
  for(const q of _ropeColliders()){ const hit=_segAabbHit(x1,y1,x2,y2,q); if(!hit) continue; const t=Math.hypot(hit.tx-x1,hit.ty-y1)/segLen; if(t<bt){bt=t;best={hit,rect:q};} }
  return best;
}
function _ropeSegClear(x1,y1,x2,y2){ const d=Math.hypot(x2-x1,y2-y1); if(d<8) return true; const ux=(x2-x1)/d,uy=(y2-y1)/d; return _segPathClear(x1+ux*3,y1+uy*3,x2-ux*3,y2-uy*3); }
function _ropeUpdatePivots(h,tx,ty){
  if(!h.pivots) h.pivots=[];
  for(let g=0;g<3&&h.pivots.length;g++){
    const n=h.pivots.length, base=n>=2?h.pivots[n-2]:{x:h.ax,y:h.ay};
    if(_ropeSegClear(base.x,base.y,tx,ty)) h.pivots.pop(); else break;
  }
  for(let g=0;g<3;g++){
    const base=h.pivots.length?h.pivots[h.pivots.length-1]:{x:h.ax,y:h.ay};
    if(_ropeSegClear(base.x,base.y,tx,ty)) break;
    if(h.pivots.length>=ROPE_MAX_PIVOTS) break;
    const d=Math.hypot(tx-base.x,ty-base.y)||1;
    const ux=(tx-base.x)/d, uy=(ty-base.y)/d;
    const fh=_ropeFirstHit(base.x+ux*3,base.y+uy*3,tx-ux*3,ty-uy*3);
    if(!fh) break;
    const c=_ropeNearestCorner(fh.rect,fh.hit.tx,fh.hit.ty);
    if(Math.hypot(c.x-base.x,c.y-base.y)<3) break;
    h.pivots.push(c);
  }
}
function _ropePathPts(h,tx,ty){
  const pts=[{x:h.ax,y:h.ay}];
  if(h.pivots) for(const pv of h.pivots) pts.push({x:pv.x,y:pv.y});
  pts.push({x:tx,y:ty});
  return pts;
}
function _ropeSolidFloor(pl,prevFeet){
  if(pl.vy<0) return;
  const feet=pl.y+FEET_OFF, fL=pl.x+FEET_L, fR=fL+FEET_W;
  const landSlop=Math.max(12,Math.abs(pl.vy)+10);
  let bestTop=null;
  const slopeSurf=_querySegGround(pl,feet,prevFeet,landSlop);
  if(slopeSurf) bestTop=slopeSurf.y;
  for(const plat of allP()){
    if(plat.tp!=='solid') continue;
    if(!_feetSpanOver(plat,fL,fR)) continue;
    if(prevFeet>plat.y+landSlop||feet<plat.y-6||feet>plat.y+plat.h) continue;
    if(bestTop===null||plat.y<bestTop) bestTop=plat.y;
  }
  if(bestTop!==null&&feet>bestTop){ pl.y=bestTop-FEET_OFF; if(pl.vy>0) pl.vy=0; }
}
function _ropeRefreshPath(h){ const end=ropePlayerEndWorld(); _ropeUpdatePivots(h,end.x,end.y); const path=_ropePathPts(h,end.x,end.y); h._path=path; return path; }
function _ropeApplyTension(h){
  const path=_ropeRefreshPath(h), plen=_ropePathLen(path), over=plen-h.rl;
  h._tension=Math.max(0,over); h._slack=over<-4; h._tight=over>1;
  if(over<=0) return;
  const i=path.length-2, p0=path[i], p1=path[i+1];
  const seg=Math.hypot(p1.x-p0.x,p1.y-p0.y)||1;
  const toAx=(p0.x-p1.x)/seg, toAy=(p0.y-p1.y)/seg;
  const spring=Math.min(over*0.12,2.4);
  p.vx+=toAx*spring; p.vy+=toAy*spring;
  const outX=(p1.x-p0.x)/seg, outY=(p1.y-p0.y)/seg;
  const vd=p.vx*outX+p.vy*outY;
  if(vd>0){const k=0.88*Math.min(1,over/ROPE_GIVE);p.vx-=outX*vd*k;p.vy-=outY*vd*k;}
}

// ── Verlet visual cord ────────────────────────────────────────
function _pathPointAt(path,plen,d){
  if(d<=0) return {x:path[0].x,y:path[0].y};
  let acc=0;
  for(let i=1;i<path.length;i++){
    const sl=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
    if(acc+sl>=d){const t=sl>0?(d-acc)/sl:0;return {x:path[i-1].x+(path[i].x-path[i-1].x)*t,y:path[i-1].y+(path[i].y-path[i-1].y)*t};}
    acc+=sl;
  }
  const lp=path[path.length-1]; return {x:lp.x,y:lp.y};
}
function _vropeStep(h){
  const path=h._path;
  if(!path||path.length<2) return;
  const plen=_ropePathLen(path), rl=Math.max(h.rl,ROPE_RL_MIN);
  const end=path[path.length-1];
  if(!h.vr){ h.vr=[]; for(let i=0;i<VROPE_N;i++){const t=i/(VROPE_N-1);const x=h.ax+(end.x-h.ax)*t,y=h.ay+(end.y-h.ay)*t;h.vr.push({x,y,px:x,py:y});} }
  const vr=h.vr, n=vr.length;
  for(let i=1;i<n-1;i++){const q=vr[i];const vx=(q.x-q.px)*VROPE_DRAG,vy=(q.y-q.py)*VROPE_DRAG;q.px=q.x;q.py=q.y;q.x+=vx;q.y+=vy+VROPE_GRAV;}
  vr[0].x=vr[0].px=h.ax; vr[0].y=vr[0].py=h.ay;
  vr[n-1].x=vr[n-1].px=end.x; vr[n-1].y=vr[n-1].py=end.y;
  const segRest=Math.max(plen,rl)/(n-1);
  for(let it=0;it<VROPE_ITER;it++){
    for(let i=0;i<n-1;i++){
      const a=vr[i],b=vr[i+1];
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-6;
      const f=(d-segRest)/d*0.5;
      const ox=dx*f,oy=dy*f;
      if(i>0){a.x+=ox;a.y+=oy;}
      if(i+1<n-1){b.x-=ox;b.y-=oy;}
    }
  }
  const taut=Math.min(1,Math.max(0,(plen-rl+4)/10));
  const pull=Math.min(0.85,Math.max(taut*0.85,path.length>2?0.35:0));
  if(pull>0){for(let i=1;i<n-1;i++){const q=vr[i];const tp=_pathPointAt(path,plen,plen*i/(n-1));q.x+=(tp.x-q.x)*pull;q.y+=(tp.y-q.y)*pull;}}
  const cols=_ropeColliders();
  for(let i=1;i<n-1;i++){
    const q=vr[i];
    for(const r of cols){
      if(q.x>r.x&&q.x<r.x+r.w&&q.y>r.y&&q.y<r.y+r.h){
        const dl=q.x-r.x,dr=r.x+r.w-q.x,dt=q.y-r.y,db=r.y+r.h-q.y;
        const m=Math.min(dl,dr,dt,db);
        if(m===dt) q.y=r.y; else if(m===db) q.y=r.y+r.h;
        else if(m===dl) q.x=r.x; else q.x=r.x+r.w;
        q.px+=(q.x-q.px)*0.4; q.py+=(q.y-q.py)*0.4; break;
      }
    }
  }
  h._tautAmt=taut;
}

// ── Player health / lives ─────────────────────────────────────
const SHUTDOWN_FRAMES=72;
let _shutdownTimer=0;

function _syncLivesFromHp(pl){ pl.lives=Math.max(0,Math.ceil(pl.hp/PLAYER_HIT_DMG)); }
function applyPlayerHit(knockX,knockY,dmg=PLAYER_HIT_DMG){
  if(_shutdownTimer>0) return;
  if(_awdjooTutorial) _stageDamageFree=false;
  p.hp=Math.max(0,p.hp-dmg);
  _syncLivesFromHp(p);
  p._lifeRegenT=0;
  p.inv=0;
  _playerHitKnock(knockX,knockY,dmg);
  p.flashF=Math.max(p.flashF,12);
  try{sfx('player_hit',_hitSfxPitch(p.hp,p.maxHp));}catch(e){}
  if(p.hp<=0){
    if(_battleTestMode){_battleTestDeaths++;_syncBattleHud();}
    _shutdownTimer=SHUTDOWN_FRAMES;
    p.vx=0; p.vy=-2;
    try{sfx('shutdown');}catch(e){}
  }
}
function healPlayerFromKnowl(){
  if(p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+PLAYER_HIT_DMG);
  _syncLivesFromHp(p);
  if(p.itemStamina<100) p.itemStamina=Math.min(100,p.itemStamina+50);
  p.flashF=Math.max(p.flashF,10);
}
function healAnyPlayerFromKnowl(pl){
  if(pl.hp<pl.maxHp) pl.hp=Math.min(pl.maxHp,pl.hp+PLAYER_HIT_DMG);
  _syncLivesFromHp(pl);
  if(pl.itemStamina<100) pl.itemStamina=Math.min(100,pl.itemStamina+50);
  pl.flashF=Math.max(pl.flashF,10);
}

// ── Ground + spawn helpers ────────────────────────────────────
function _playerGrounded(pl){
  if(pl.og) return true;
  if(pl.hook&&pl.hook.st==='on') return false;
  if(pl.wallGrip>0) return false;
  if(pl.vy<-1.2) return false;
  const surf=_walkableYForPlayer(pl);
  if(surf===null) return false;
  return Math.abs((pl.y+FEET_OFF)-surf)<18;
}
function _playerOnGround(pl){ return _playerGrounded(pl); }
function measureHeadroom(pl=p){
  const head=playerHeadWorld(pl), headTop=head.cy-head.r;
  const fL=pl.x+SW/2-BODY_W/2, fR=fL+BODY_W;
  let minGap=999;
  for(const plat of allP()){
    if(plat.tp!=='ceil') continue;
    if(plat.x+plat.w<=fL||plat.x>=fR) continue;
    const gap=plat.y-headTop;
    if(gap<0||gap>STAND_H+4) continue;
    if(gap<minGap) minGap=gap;
  }
  return minGap;
}
function _surfaceYAt(cx,feetY,maxDrop=96){
  let best=null, bestDrop=1e9;
  if(COLL_SEGS.length){
    const samples=[cx,cx-FEET_W*0.5,cx+FEET_W*0.5];
    _eachCollSegNear(cx,FEET_W+64,seg=>{
      const y=_segSupportAt(seg,samples);
      if(y===null) return;
      const drop=y-feetY;
      if(drop<-24||drop>maxDrop) return;
      if(drop<bestDrop){bestDrop=drop;best=y;}
    });
  }
  for(const pl of TR.map(_normPlat)){
    if(pl.tp!=='solid'||pl.poly) continue;
    if(cx<pl.x-COLL_SEAM||cx>pl.x+pl.w+COLL_SEAM) continue;
    const drop=pl.y-feetY;
    if(drop<-24||drop>maxDrop) continue;
    if(drop<bestDrop){bestDrop=drop;best=pl.y;}
  }
  return best;
}
// Spawn snap: cx = entity center; find nearest walkable floor at or below marker feet.
function _spawnSurfaceYAt(cx,feetY,maxDrop=40,segOnly=false){
  let best=null, bestDrop=1e9;
  const tryY=(y)=>{
    const drop=y-feetY;
    if(drop<-1||drop>maxDrop) return;
    if(drop<bestDrop){bestDrop=drop;best=y;}
  };
  if(COLL_SEGS.length){
    const samples=[cx,cx-FEET_W*0.5,cx+FEET_W*0.5];
    _eachCollSegNear(cx,FEET_W+48,seg=>{
      const y=_segSupportAt(seg,samples);
      if(y!==null) tryY(y);
    });
  }
  if(!segOnly){
    for(const pl of TR.map(_normPlat)){
      if(pl.tp!=='solid'||pl.poly) continue;
      if(COLL_SEGS.length&&pl.h>24) continue;
      if(cx<pl.x-COLL_SEAM||cx>pl.x+pl.w+COLL_SEAM) continue;
      tryY(pl.y);
    }
  }
  return best;
}
function _snapSpawnToSolid(cx,feetY,maxDrop=40){
  let best=_spawnSurfaceYAt(cx,feetY,Math.min(maxDrop,96),true);
  if(best==null) best=_spawnSurfaceYAt(cx,feetY,maxDrop,true);
  if(best==null&&!_useSegGround) best=_spawnSurfaceYAt(cx,feetY,maxDrop,false);
  return best!=null?best:feetY;
}

// ── Wall touch / jump ─────────────────────────────────────────
function _wallTouchInfo(pl){
  const h=playerCoreHB(pl);
  const bodyL=h.x, bodyR=h.x+h.w, bodyT=h.y+8, bodyB=h.y+h.h-8;
  let touch=false, dir=0;
  if(COLL_WALL_SEGS.length){
    for(const seg of COLL_WALL_SEGS){
      if(bodyB<=seg.minY||bodyT>=seg.maxY) continue;
      const wallX=_wallXAtY(seg,(bodyT+bodyB)*0.5);
      if(seg.insideLeft){if(bodyL<=wallX+10&&bodyL>=wallX-18){touch=true;dir=-1;}}
      else if(bodyR>=wallX-10&&bodyR<=wallX+18){touch=true;dir=1;}
    }
  }
  if(!touch){
    const cx=pl.x+SW*0.5;
    for(const plat of allP()){
      if(plat.tp!=='solid') continue;
      if(!_platNearX(plat,cx,SW+24)) continue;
      if(bodyB<=plat.y+8||bodyT>=plat.y+plat.h-8) continue;
      if(bodyL<=plat.x+plat.w+10&&bodyL>=plat.x+plat.w-18){touch=true;dir=-1;break;}
      if(bodyR>=plat.x-10&&bodyR<=plat.x+18){touch=true;dir=1;break;}
    }
  }
  return {touch,dir};
}
function _faceAwayFromWall(pl){
  pl.fc=pl.wallDir<0;
  if(!pl._hasAimInput){ pl.aimDX=pl.fc?1:-1; pl.aimDY=0; pl.tAimDX=pl.aimDX; pl.tAimDY=0; }
}
function _wallJumpOff(pl){
  pl.vy=JI; pl.jf=JMH; pl.vx=-pl.wallDir*WLK; pl.wallGrip=0;
  pl._wallChargeReady=false; pl._wallJumpTap=0; pl.og=false;
  _faceAwayFromWall(pl); pl._wallAimFree=20; sfx('jump');
}

// ── Knowl tree boost zone ────────────────────────────────────
function _knowlTreeBoostMul(pl){
  if(!_knowlTreeZone||!pl) return 1;
  const cx=pl.x+SW/2, cy=pl.y+FEET_OFF*0.48;
  const dx=cx-_knowlTreeZone.x, dy=cy-_knowlTreeZone.y;
  return dx*dx+dy*dy<=_knowlTreeZone.r*_knowlTreeZone.r?KNOWL_TREE_BOOST:1;
}
function _nearKnowlTree(pl){ return _knowlTreeBoostMul(pl)>1; }

// ── Enemy damage ──────────────────────────────────────────────
function _damageEnemy(e,dmg,fromX,fromY,kbScale){
  if(!e) return false;
  if(e.mind&&!e.alive){ if(e._mindOff==='rebooting') return _tryInterruptMindReboot(e); return false; }
  if(!e.alive) return false;
  e.hp=Math.max(0,e.hp-dmg);
  e.hitF=14;
  if(e.type==='signol'&&e.signolState==='charge'&&e.hp>0){ e.signolState='roll'; e.chargeT=0; }
  if(fromX!=null&&fromY!=null) _enemyHitKnock(e,fromX,fromY,dmg,kbScale==null?1:kbScale);
  if(e.hp<=0){
    if(e.type==='signol'&&e.signolState!=='dead'){ _signolExplode(e); return true; }
    e.alive=false; e._mindOff='shutdown'; e.shutF=ENEMY_SHUTDOWN_FRAMES;
    e.xlrOn=false; e.magOn=false; e.pt=0;
    if(e.hook) e.hook.st='idle';
    e._shutSettled=false; e._offAnchorX=null; e._offAnchorY=null; e._cooldownEnd=0; e._rebootFill=0;
    e._shutLean=e.mind?((e.vx||0)<-0.2?-0.18:((e.vx||0)>0.2?0.18:(e.fc?0.14:-0.14))):(e.dir>0?0.14:-0.14);
    e.vx=(e.vx||0)*0.35; e.vy=Math.max((e.vy||0),0.8); e.og=false;
    e._itemForceF=0; e._kbF=0;
    if(p&&p.hook&&p.hook.tgt===e){
      if(p.hook.st==='on') _releaseHookAim(p.hook.ax,p.hook.ay);
      p.hook={st:'idle',ex:0,ey:0,evx:0,evy:0,ax:0,ay:0,rl:0,ox:NaN,oy:NaN,tgt:null,tox:0,toy:0};
    }
    sfx('enemy_shut');
    if(_battleTestMode&&e._battleAi) _onBattleRivalDefeated();
    if(_battleTestMode&&e._battleSignol) _onBattleSignolDefeated();
    return true;
  }
  sfx('hit_enemy',_hitSfxPitch(e.hp,e.mhp));
  return false;
}

// ── Entity HP bar draw ────────────────────────────────────────
function _drawEntityHpBar(bx,by,bw,hp,mhp,col){
  const frac=mhp>0?Math.max(0,Math.min(1,hp/mhp)):0;
  const barW=Math.max(12,Math.min(bw,24));
  const x=(bx+(bw-barW)/2)|0;
  ctx.fillStyle=C.BLACK; ctx.fillRect(x,by,barW,3);
  const fill=Math.round((barW-2)*frac);
  ctx.fillStyle=col;
  if(fill>0) ctx.fillRect(x+1,by+1,fill,1);
}

// ── Zero vx into wall (sprint hold) ──────────────────────────
function _zeroVxIntoWall(pl){
  if(pl!==p) return;
  const dir=_runDir();
  if(!isPunch()||!dir) return;
  const wall=_wallTouchInfo(pl);
  if(wall.touch&&wall.dir===dir) pl.vx=0;
}
