const fs = require('fs');
const d = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'Testee.json'), 'utf8'));
const sc = 4, tw = 8, th = 8;
function ptInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function buildSegs(pts) {
  const segs = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 3) continue;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, sample = Math.max(8, len * 0.12);
    const inBelow = ptInPoly(mx, my + sample, pts), inAbove = ptInPoly(mx, my - sample, pts);
    if (!(inAbove && !inBelow)) continue;
    if (Math.abs(Math.cos(Math.atan2(dy, dx))) < 0.05) continue;
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return segs;
}
function segYAt(seg, x) {
  const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
  if (Math.abs(dx) < 0.001) return seg.y1;
  return seg.y1 + ((x - seg.x1) / dx) * dy;
}
let segs = [], rects = 0;
const wf = d.layers.find(l => l.name === 'walls/floors');
for (const o of wf.objects) {
  if (o.polygon) {
    const ox = o.x * sc, oy = o.y * sc;
    const pts = o.polygon.map(p => ({ x: ox + p.x * sc, y: oy + p.y * sc }));
    segs = segs.concat(buildSegs(pts));
  } else if (o.width > 0 && o.height > 0) rects++;
}
const cx = 40.25 * sc + 7.25 * sc * 0.5, feetY = (448 + 7.5) * sc;
let best = null;
for (const s of segs) {
  const minX = Math.min(s.x1, s.x2), maxX = Math.max(s.x1, s.x2);
  if (cx < minX - 8 || cx > maxX + 8) continue;
  const y = segYAt(s, cx);
  if (y >= feetY - 10 && y <= feetY + 220) { if (best === null || y < best) best = y; }
}
console.log(JSON.stringify({ segs: segs.length, rects, spawnCx: cx, feetY, floorY: best }, null, 2));
