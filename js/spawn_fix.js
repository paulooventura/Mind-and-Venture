// ============================================================
//  Mind & Venture — spawn_fix.js
//  Tiled spawn / marker resolution (loaded before main.js).
//  Awdjoo spawns tile layer (col, row):
//    player gid 150 @ 31, 73
//    mind   gid 204 @ 13, 65
//    RCA    gid 168 @ 30, 85
//  Object layer "spawns" gives pixel-accurate positions when present.
// ============================================================

function _isSpawnLayerName(name){
  const l=String(name||'').toLowerCase();
  return l==='spawns'||l==='spawn';
}

function _spawnPtFromCell(col,row,tw,th,sc){
  const x=Math.floor((col+0.5)*tw*sc-SW/2);
  const feetY=Math.floor((row+1)*th*sc);
  return {x, feetY, row, col};
}

function _spawnPtFromObject(o,tw,th,sc){
  const w=o.width||0, h=o.height||0;
  const cx=(o.x+(w>0?w*0.5:0))*sc;
  const feetY=Math.floor((o.y+(h>0?h:th))*sc);
  const col=Math.floor(o.x/tw), row=Math.floor(o.y/th);
  return {x:Math.floor(cx-SW/2), feetY, row, col};
}

function _spawnGidAt(data,mw,col,row){
  if(!data||!mw||col<0||row<0) return 0;
  const i=row*mw+col;
  if(i<0||i>=data.length) return 0;
  return _tmjGid(data[i]);
}

function _firstHouseSpawnFallback(sc){
  return _spawnPtFromCell(TMJ_PLAYER_SPAWN_COL,TMJ_PLAYER_SPAWN_ROW,8,8,sc);
}

function _shapeForEnemyGid(gid){
  if(gid===TMJ_ENEMY_BALL_GID||gid===TMJ_MIND_ENEMY_GID) return 'ball';
  if(gid===TMJ_ENEMY_SQ_GID) return 'square';
  if(gid===TMJ_ENEMY_TRI_GID) return 'triangle';
  if(gid===TMJ_ENEMY_STAR_GID) return 'star';
  return 'ball';
}

function _dispatchMindSpawnAt(cx,feetY,row,col,mw,tw,sc){
  const range=Math.max(96,Math.min(200,mw*tw*sc*0.08));
  const wx=Math.floor(cx);
  _mapEnemyDefs.push({
    shape:'ball', x:wx, y:feetY, row, col,
    mn:Math.floor(wx-range), mx:Math.floor(wx+range),
    hp:_ENEMY_SHAPE_HP.ball, spd:_ENEMY_SHAPE_SPD.ball,
  });
}

function _dispatchSpawnGid(gid,col,row,tw,th,sc,mw){
  if(_isBasementSpawnRow(row)) return;
  const cx=(col+0.5)*tw*sc, feetY=(row+1)*th*sc;
  const wx=Math.floor(cx), wy=Math.floor(row*th*sc);
  if(TMJ_PLAYER_SPAWN_GIDS.has(gid)){
    if(!_mapPlayerSpawnPt) _mapPlayerSpawnPt=_spawnPtFromCell(col,row,tw,th,sc);
    return;
  }
  if(TMJ_MIND_SPAWN_GIDS.has(gid)||gid===TMJ_MIND_ENEMY_GID){
    _dispatchMindSpawnAt(cx,feetY,row,col,mw,tw,sc);
    return;
  }
  if(TMJ_RCA_SPAWN_GIDS.has(gid)&&!_mapRopePickup){
    _mapRopePickup={x:col*tw*sc,y:row*th*sc,w:tw*sc,h:th*sc,got:false};
    return;
  }
  if(gid===TMJ_KNOWL_GID){
    _mapKnowlDefs.push({x:wx+tw*sc*0.5,y:wy+th*sc*0.5});
    return;
  }
  if(gid===TMJ_ENEMY_BALL_GID||gid===TMJ_ENEMY_SQ_GID||
     gid===TMJ_ENEMY_TRI_GID||gid===TMJ_ENEMY_STAR_GID){
    const range=Math.max(96,Math.min(200,mw*tw*sc*0.08));
    const shape=_shapeForEnemyGid(gid);
    _mapEnemyDefs.push({
      shape, x:wx, y:feetY, row, col,
      mn:Math.floor(wx-range), mx:Math.floor(wx+range),
      hp:_ENEMY_SHAPE_HP[shape], spd:_ENEMY_SHAPE_SPD[shape],
    });
    return;
  }
  if(TMJ_SIGNOL_GIDS.has(gid)){
    _mapSignolDefs.push({x:cx, y:feetY, row, col});
    return;
  }
  if(TMJ_ROPE_PICKUP_GIDS.has(gid)&&!_mapRopePickup){
    _mapRopePickup={x:col*tw*sc,y:row*th*sc,w:tw*sc,h:th*sc,got:false};
    return;
  }
  if(TMJ_LAITU_GIDS.has(gid)&&!_mapLaituSpawn){
    _mapLaituSpawn={x:wx,y:wy,feetY};
    return;
  }
  if(gid===TMJ_MINION_CIRCLE_GID||gid===TMJ_MINION_SQUARE_GID||gid===TMJ_MINION_FLYER_GID){
    const kind=gid===TMJ_MINION_CIRCLE_GID?'circle':gid===TMJ_MINION_SQUARE_GID?'square':'flyer';
    _mapMinionDefs.push({kind,x:wx,y:feetY,row,col});
  }
}

function _dispatchSpawnObject(o,tw,th,sc,spawnData,mw){
  if(o.polyline){
    if(!_mapRopePickup&&o.y>=660){
      _mapRopePickup={x:Math.floor(o.x*sc),y:Math.floor(o.y*sc),w:tw*sc,h:th*sc,got:false};
    }
    return;
  }
  const col=Math.floor(o.x/tw), row=Math.floor(o.y/th);
  const gid=_spawnGidAt(spawnData,mw,col,row)||_spawnGidAt(spawnData,mw,col,row-1);
  const pt=_spawnPtFromObject(o,tw,th,sc);
  if(TMJ_PLAYER_SPAWN_GIDS.has(gid)||o.x>=200){
    _mapPlayerSpawnPt=pt;
    return;
  }
  if(TMJ_MIND_SPAWN_GIDS.has(gid)||gid===TMJ_MIND_ENEMY_GID||(o.x<160&&_mapEnemyDefs.length===0)){
    _dispatchMindSpawnAt(pt.x+SW/2,pt.feetY,row,col,mw,tw,sc);
    return;
  }
  if(TMJ_RCA_SPAWN_GIDS.has(gid)&&!_mapRopePickup){
    _mapRopePickup={x:Math.floor(o.x*sc),y:Math.floor(o.y*sc),w:Math.max(tw*sc,Math.round((o.width||tw)*sc)),h:Math.max(th*sc,Math.round((o.height||th)*sc)),got:false};
  }
}

function _pickPlayerSpawn(data,tw,th,sc,spawnTileLayer,mw,spawnObjects){
  if(_mapPlayerSpawnPt) return _mapPlayerSpawnPt;
  if(spawnObjects&&spawnObjects.length){
    for(const o of spawnObjects){
      if(o.polyline) continue;
      if(o.x>=200) return _spawnPtFromObject(o,tw,th,sc);
    }
  }
  if(spawnTileLayer&&spawnTileLayer.data&&mw>0){
    const gid=_spawnGidAt(spawnTileLayer.data,mw,TMJ_PLAYER_SPAWN_COL,TMJ_PLAYER_SPAWN_ROW);
    if(TMJ_PLAYER_SPAWN_GIDS.has(gid)){
      return _spawnPtFromCell(TMJ_PLAYER_SPAWN_COL,TMJ_PLAYER_SPAWN_ROW,tw,th,sc);
    }
    for(let row=0;row<data.height;row++){
      for(let col=0;col<mw;col++){
        const gid2=_tmjGid(spawnTileLayer.data[row*mw+col]);
        if(TMJ_PLAYER_SPAWN_GIDS.has(gid2)) return _spawnPtFromCell(col,row,tw,th,sc);
      }
    }
  }
  return _firstHouseSpawnFallback(sc);
}

function _resolveAndApplySpawn(data,tw,th,sc,spawnTileLayer,mw){
  _mapPlayerSpawnPt=null;
  _mapEnemyDefs=[];
  _mapRopePickup=null;
  const layers=data.layers||[];
  const spawnOg=layers.find(l=>l.type==='objectgroup'&&_isSpawnLayerName(l.name));
  const spawnObjects=spawnOg?(spawnOg.objects||[]):[];
  const spawnData=spawnTileLayer?spawnTileLayer.data:null;

  if(spawnObjects.length){
    for(const o of spawnObjects) _dispatchSpawnObject(o,tw,th,sc,spawnData,mw);
  }else if(spawnData&&mw>0){
    for(let row=0;row<data.height;row++){
      for(let col=0;col<mw;col++){
        const gid=_spawnGidAt(spawnData,mw,col,row);
        if(!gid) continue;
        _dispatchSpawnGid(gid,col,row,tw,th,sc,mw);
      }
    }
  }

  const spawnPt=_pickPlayerSpawn(data,tw,th,sc,spawnTileLayer,mw,spawnObjects);
  _mapPlayerSpawnPt=spawnPt;
  _spawnX=spawnPt.x;
  const markerFeet=spawnPt.feetY!=null?spawnPt.feetY:(spawnPt.y+FEET_OFF);
  const cx=_spawnX+SW/2;
  const canvasFeet=typeof _canvasFloorFeetAt==='function'?_canvasFloorFeetAt(cx,markerFeet):null;
  const hintFeet=canvasFeet!=null?canvasFeet:markerFeet;
  const snapped=_snapSpawnToSolid(cx,hintFeet,220);
  _spawnY=snapped-FEET_OFF;
  _floorTopY=snapped;
}
