// 테마별 한옥마을 · 집 안 · 지하 보물방 배치
// 좌표: x = 동(+)/서(-), z = 남(+)/북(-). 각 구역은 (0,0)~(w,d) 안쪽 좌표로 배치합니다.
// 이야기(테마)마다 시간대·날씨·집 위치·마을 문제 장소 3곳·마지막 퍼즐·보물방이 다릅니다.
import * as THREE from 'three';
import * as H from './3d/hanok.js';
import * as P from './3d/props.js';
import {
  snowTexture, snowPathTexture, textBoardTexture, sparkleTexture, grassTexture, earthTexture, dirtTexture, rand,
} from './3d/textures.js';

const PI = Math.PI;
const Q = PI / 2;
const SCREEN_PANELS = ['plum', 'orchid', 'chrys', 'bamboo'];
const CABINET_LABELS = ['황기', '인삼', '천궁', '복령', '계피', '작약', '당귀', '대추', '생강', '감초', '진피', '오미자', '숙지황', '구기자', '백출', '맥문동'];
export const CABINET_PUZZLE_DRAWER = 5; // 자물쇠 달린 서랍
const HOLE = 1.7; // 계단 구멍 크기

// 테마 → 계절 (재질·나무 색)
export const THEME_SEASON = { seolhwa: 'winter', hong: 'summer', kimsatgat: 'autumn', jeonwoochi: 'rain', teacher: 'winter' };

// 마을 하늘·빛·날씨
const VILLAGE_ENV = {
  seolhwa: {
    bg: 0x0c1424, fog: [0x111c30, 22, 72], hemi: [0x86a0d0, 0x222a3a, 0.8], key: [0xaec4ff, 1.0], keyDir: [-10, 18, 7],
    exposure: 1.1, el: 0.8, dist: 16, bloom: 0.45, envI: 0.12, weather: 'snow', weatherRate: 1.25, skyfx: 'moonhaze',
    followLamp: true, lamp: { intensity: 4, distance: 9, color: 0xffd8a8 },
  },
  hong: {
    bg: 0x070b16, fog: [0x0b1426, 22, 70], hemi: [0x5a72aa, 0x161c20, 0.65], key: [0xbdd0ff, 1.35], keyDir: [9, 20, -7],
    exposure: 1.12, el: 0.8, dist: 16, bloom: 0.45, envI: 0.1, weather: 'fireflies', skyfx: 'moon',
    followLamp: true, lamp: { intensity: 3.5, distance: 8, color: 0xffc890 },
  },
  kimsatgat: {
    bg: 0x3a2030, fog: [0xc8805c, 26, 82], hemi: [0xffb68a, 0x5a3a2a, 0.9], key: [0xffa060, 2.3], keyDir: [-18, 8, 5],
    exposure: 1.0, el: 0.8, dist: 16, bloom: 0.32, envI: 0.25, weather: 'leaves', skyfx: 'sunset',
  },
  jeonwoochi: {
    bg: 0x06080e, fog: [0x0c1019, 16, 55], hemi: [0x56648a, 0x10141a, 0.62], key: [0x92a4c8, 0.6], keyDir: [-6, 20, 8],
    exposure: 1.15, el: 0.82, dist: 15, bloom: 0.45, envI: 0.2, weather: 'rain', lightning: true, skyfx: 'storm',
    followLamp: true, lamp: { intensity: 4.5, distance: 9, color: 0xffc890 },
  },
  teacher: {
    bg: 0x0c1222, fog: [0x141c32, 22, 72], hemi: [0x8898c8, 0x222234, 0.75], key: [0xb6c6f2, 0.8], keyDir: [-9, 18, 10],
    exposure: 1.1, el: 0.8, dist: 16, bloom: 0.6, envI: 0.12, weather: 'snow', weatherRate: 0.55, skyfx: 'stars',
    followLamp: true, lamp: { intensity: 3.5, distance: 8, color: 0xffd8a8 },
  },
};

function rotXZ(x, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [x * c + z * s, -x * s + z * c];
}

export function buildAreas({ mk, M, story }) {
  const themeId = VILLAGE_ENV[story.id] ? story.id : 'seolhwa';
  const B = { houses: {}, spotFx: {}, spotPose: {}, themeId };
  const anim = { flames: [], lanterns: [], cloths: [], fairy: false, water: null, pulses: [], spin: [] };

  // =================================================================
  // 마을 (공통 도구)
  // =================================================================
  const V = mk({ id: 'village', ox: 0, oz: 0, w: 50, d: 46, margin: 0.4, env: { ...VILLAGE_ENV[themeId] } });
  const VW = V.w, VD = V.d;
  const season = THEME_SEASON[themeId];
  const night = themeId !== 'kimsatgat';
  const reserved = []; // 장식을 놓지 않을 곳 (길·광장)
  const reserve = (x0, z0, x1, z1) => reserved.push({ x0, z0, x1, z1 });

  const ctx = { V, M, B, story, anim, night, season, reserve };

  // ---- 땅 ----
  const GROUND = {
    winter: () => ({ main: snowTexture(), out: snowTexture(), path: snowPathTexture(), rough: 0.95 }),
    summer: () => ({ main: grassTexture(), out: grassTexture(), path: earthTexture(), rough: 0.95, tint: 0x9aa88a }),
    autumn: () => ({ main: dirtTexture('#8a7048', 31), out: grassTexture(), path: earthTexture(), rough: 0.95, outTint: 0xc8a060 }),
    rain: () => ({ main: dirtTexture('#4a4034', 47), out: dirtTexture('#3e3a2e', 53), path: dirtTexture('#6a5a46', 59), rough: 0.38, metal: 0.12 }),
  }[season]();
  function ground(holes) {
    GROUND.main.wrapS = GROUND.main.wrapT = THREE.RepeatWrapping;
    GROUND.main.repeat.set(1 / 6, 1 / 6);
    GROUND.out.wrapS = GROUND.out.wrapT = THREE.RepeatWrapping;
    GROUND.out.repeat.set(1 / 8, 1 / 8);
    const rectPath = (x0, z0, x1, z1) => {
      const p = new THREE.Path();
      p.moveTo(x0, -z0); p.lineTo(x0, -z1); p.lineTo(x1, -z1); p.lineTo(x1, -z0); p.lineTo(x0, -z0);
      return p;
    };
    const rectShape = (x0, z0, x1, z1) => {
      const s = new THREE.Shape();
      s.moveTo(x0, -z0); s.lineTo(x1, -z0); s.lineTo(x1, -z1); s.lineTo(x0, -z1); s.lineTo(x0, -z0);
      return s;
    };
    const inner = rectShape(0.2, 0.2, VW - 0.2, VD - 0.2);
    for (const h of holes) inner.holes.push(rectPath(h.x - HOLE / 2, h.z - HOLE / 2, h.x + HOLE / 2, h.z + HOLE / 2));
    const gm = new THREE.MeshStandardMaterial({ map: GROUND.main, roughness: GROUND.rough, metalness: GROUND.metal || 0 });
    if (GROUND.tint) gm.color.setHex(GROUND.tint);
    const g = new THREE.Mesh(new THREE.ShapeGeometry(inner).rotateX(-PI / 2), gm);
    g.receiveShadow = true;
    V.add(g, 0, 0, 0, 0);
    const outer = rectShape(-60, -60, VW + 60, VD + 60);
    outer.holes.push(rectPath(0.2, 0.2, VW - 0.2, VD - 0.2));
    const om = new THREE.MeshStandardMaterial({ map: GROUND.out, roughness: GROUND.rough, metalness: GROUND.metal || 0 });
    if (GROUND.outTint) om.color.setHex(GROUND.outTint);
    const og = new THREE.Mesh(new THREE.ShapeGeometry(outer).rotateX(-PI / 2), om);
    og.receiveShadow = true;
    V.add(og, 0, 0, 0, -0.005);
  }
  ctx.ground = ground;

  // 길
  const pathMat = new THREE.MeshStandardMaterial({ map: GROUND.path, roughness: season === 'rain' ? 0.3 : 0.85, metalness: season === 'rain' ? 0.1 : 0, polygonOffset: true, polygonOffsetFactor: -2, color: season === 'winter' ? 0xffffff : season === 'summer' ? 0xb8a890 : 0xffffff });
  if (season !== 'winter') { GROUND.path.wrapS = GROUND.path.wrapT = THREE.RepeatWrapping; }
  function path(x0, z0, x1, z1) {
    const w = x1 - x0, d = z1 - z0;
    const geo = new THREE.PlaneGeometry(w, d).rotateX(-PI / 2);
    const uv = geo.attributes.uv;
    const along = d >= w;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      if (along) uv.setXY(i, u * (w / 2.2), v * (d / 2.2)); else uv.setXY(i, v * (d / 2.2), u * (w / 2.2));
    }
    const m = new THREE.Mesh(geo, pathMat);
    m.receiveShadow = true;
    V.add(m, x0 + w / 2, z0 + d / 2, 0, 0.008);
    reserve(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3);
  }
  ctx.path = path;

  // 담장 · 대문 · 시작 위치 · 입구 장승
  function perimeter({ high = null } = {}) {
    const wall = (x, z, len, rot, h) => V.place(H.buildStoneWall(M, len, h ? { h, t: 0.6 } : {}), x, z, rot);
    if (high) {
      // high = { x0, z1 } : 북쪽 x0~끝, 동쪽 0~z1 은 높은 담
      wall(high.x0 / 2, 0.3, high.x0, 0);
      wall((high.x0 + VW) / 2, 0.3, VW - high.x0, 0, 2.6);
      wall(VW - 0.3, high.z1 / 2 + 0.3, high.z1 - 0.6, Q, 2.6);
      wall(VW - 0.3, (high.z1 + VD - 0.3) / 2, VD - 0.3 - high.z1, Q);
    } else {
      wall(VW / 2, 0.3, VW, 0);
      wall(VW - 0.3, VD / 2, VD - 0.6, Q);
    }
    wall(0.3, VD / 2, VD - 0.6, Q);
    wall(11.7, VD - 0.3, 23.4, 0);
    wall(VW - 11.7, VD - 0.3, 23.4, 0);
    V.place(H.buildGate(M, 3.2), 25, VD - 0.3, 0, { collide: false });
    V.box(25 - 1.6, VD - 0.3, 0.5, 0.6);
    V.box(25 + 1.6, VD - 0.3, 0.5, 0.6);
    V.spawns.start = { x: 25, z: 43.6, yaw: PI };
    for (const [x, title, female] of [[22.6, '天下大將軍', false], [27.4, '地下女將軍', true]]) {
      const j = H.buildJangseung(M, title, female);
      const cap = H.mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, PI * 2, 0, PI / 2), M.snow, j.group, 0, 3.18, 0);
      cap.scale.y = 0.4;
      V.place(j, x, 41.4, 0, { dynamic: true });
      V.inter({ id: 'jangseung', x, z: 42.6, pick: [j.group], marker: [x, 3.5, 41.4], face: PI });
    }
    reserve(21, 39.5, 29, VD);
  }
  ctx.perimeter = perimeter;

  // 집 (문 앞 상호작용 + 나올 때 서는 자리)
  function house(key, opts, x, z, rot, { enter = true } = {}) {
    const h = H.buildHanok(M, opts);
    V.place(h, x, z, rot, { fade: true });
    const [fx, fz] = rotXZ(h.front.x, h.front.z, rot);
    const [mx, mz] = rotXZ(0, h.front.z - 0.6, rot);
    if (enter) {
      V.inter({
        id: `door_${key}`, x: x + fx, z: z + fz, pick: [h.group], marker: [x + mx, 2.3, z + mz], face: rot + PI,
        highlight: (t) => { h.doorMat.emissiveIntensity = t * 0.45; },
      });
      const [sx, sz] = rotXZ(0, h.front.z + 0.5, rot);
      V.spawns[`door_${key}`] = { x: x + sx, z: z + sz, yaw: rot };
      B.houses[key] = h;
    }
    h.world = { x, z, rot };
    if (themeId === 'teacher') eaveLights(h, x, z, rot);
    return h;
  }
  ctx.house = house;
  // 처마 끝 꼬마전구
  function eaveLights(h, x, z, rot) {
    const pts = [];
    const w = h.eave.w - 0.6;
    for (let i = 0; i <= 8; i++) {
      const lx = -w / 2 + (i * w) / 8;
      const [px, pz] = rotXZ(lx, h.eave.z + 0.05, rot);
      pts.push(new THREE.Vector3(x + px, h.eave.heightAt(lx) - 0.12, z + pz));
    }
    V.add(P.buildLightString(M, pts, { sag: 0.25, offset: Math.round(x) }));
    anim.fairy = true;
  }

  // 마지막 퍼즐 (구멍 위에 덮개) + 계단
  function finale(obj, x, z, { stair = {} } = {}) {
    V.place(obj, x, z, 0, { dynamic: true });
    B.final = obj;
    const fz = z + obj.size.d / 2 + 0.55;
    V.inter({ id: 'altar', x, z: fz, pick: [obj.group], marker: [x, 1.3, z], face: PI });
    V.inter({ id: 'stairs', x: x + 0.01, z: fz, pick: [], marker: [x, 0.9, z], face: PI });
    V.spawns.stairs = { x, z: fz + 0.35, yaw: 0 };
    const sw = H.buildStairwell(M, HOLE, 3.0, stair);
    sw.group.visible = false;
    V.add(sw.group, x, z, 0, 0);
    V.dyn.add(sw.group);
    B.stairwell = sw;
    reserve(x - obj.size.w / 2 - 1, z - obj.size.d / 2 - 1, x + obj.size.w / 2 + 1, fz + 1.2);
  }
  ctx.finale = finale;

  // 문제 장소 (마을)
  function spot(id, item, x, z, rot, { at, marker, face = PI, place = {} } = {}) {
    V.place(item, x, z, rot, { dynamic: true, ...place });
    const [ix, iz] = at || [x, z + (item.size?.d || 1) / 2 + 0.6];
    V.inter({ id, x: ix, z: iz, pick: [item.group], marker: marker || [x, 2.0, z], face });
    reserve(ix - 1.2, iz - 1.2, ix + 1.2, iz + 1.2);
    return item;
  }
  ctx.spot = spot;
  function flavor(id, item, x, z, rot, { at, marker, face = PI, place = {} } = {}) {
    if (item) V.place(item, x, z, rot, { dynamic: true, ...place });
    const [ix, iz] = at || [x, z + (item?.size?.d || 1) / 2 + 0.6];
    V.inter({ id, x: ix, z: iz, pick: item ? [item.group] : [], marker: marker || [x, 1.6, z], face });
    reserve(ix - 0.8, iz - 0.8, ix + 0.8, iz + 0.8);
    return item;
  }
  ctx.flavor = flavor;

  function stele(item, x, z) {
    V.place(item, x, z, 0, { dynamic: true });
    V.inter({ id: 'stele', x, z: z + item.size.d / 2 + 0.7, pick: [item.group], marker: [x, 2.3, z], face: PI });
    reserve(x - 1.2, z - 1, x + 1.2, z + item.size.d / 2 + 1.6);
  }
  ctx.stele = stele;

  // 등 · 횃불
  function lantern(x, z, blue = false) {
    const l = H.buildLanternPost(M, blue);
    V.place(l, x, z, x < 25 ? PI : 0, { dynamic: true });
    anim.lanterns.push(l.lamp);
    if (night) {
      const [lx] = rotXZ(0.4, 0, x < 25 ? PI : 0);
      const gl = P.groundGlow(3.6, blue ? '150,180,255' : '255,170,100', 0.42);
      V.add(gl, x + lx, z);
      const ag = P.airGlow(1.3, blue ? '160,190,255' : '255,170,110', 0.65);
      V.add(ag, x + lx, z, 0, 1.6);
    }
    return l;
  }
  ctx.lantern = lantern;
  function torch(x, z) {
    const t = P.buildTorchPost(M);
    V.place(t, x, z, 0, { dynamic: true });
    anim.flames.push(t.flame);
    return t;
  }
  ctx.torch = torch;

  // 빈 자리 찾아 장식 뿌리기 (길·문 앞·다른 물체와 겹치지 않게)
  function isFree(x, z, r) {
    if (x < 1.4 || z < 1.4 || x > VW - 1.4 || z > VD - 1.6) return false;
    for (const o of V.colliders) if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return false;
    for (const o of reserved) if (x > o.x0 - r * 0.5 && x < o.x1 + r * 0.5 && z > o.z0 - r * 0.5 && z < o.z1 + r * 0.5) return false;
    for (const it of V.inters) if (Math.hypot(it.x - x, it.z - z) < r + 1.4) return false;
    return true;
  }
  function scatter(n, seed, r, make) {
    const rr = rand(seed);
    let placed = 0;
    for (let tries = 0; tries < n * 30 && placed < n; tries++) {
      const x = 1.5 + rr() * (VW - 3), z = 1.5 + rr() * (VD - 3.2);
      if (!isFree(x, z, r)) continue;
      make(x, z, placed, rr);
      placed++;
    }
  }
  ctx.scatter = scatter;
  function decor({ bushes = 12, grass = 26, pines = 7, extra = null } = {}) {
    scatter(pines, 61, 1.6, (x, z, i) => V.place(H.buildPine(M, 1.0 + (i % 3) * 0.12, i + 1), x, z, 0, { fade: true, cw: 0.6, cd: 0.6 }));
    scatter(bushes, 71, 1.3, (x, z, i) => V.place(H.buildBush(M, 20 + i, 0.8 + (i % 3) * 0.12), x, z, 0));
    if (extra) extra();
    scatter(grass, 81, 0.5, (x, z, i) => {
      V.place(H.buildGrassTuft(M, i + 1, 0.8 + (i % 4) * 0.12), x, z, (i * 1.7) % PI, { collide: false });
      reserve(x - 0.2, z - 0.2, x + 0.2, z + 0.2);
    });
  }
  ctx.decor = decor;
  // 담장 밖 산 · 숲
  function hills(color, treeFn) {
    const hillMat = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
    for (const [x, z, s] of [[-14, 10, 12], [-12, 34, 10], [64, 6, 13], [62, 30, 11], [10, -14, 12], [40, -16, 14], [25, -22, 9], [-8, 58, 12], [58, 56, 12]]) {
      const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), hillMat);
      hill.scale.y = 0.4;
      hill.receiveShadow = true;
      V.add(hill, x, z, 0, -s * 0.12);
    }
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * PI * 2;
      const x = 25 + Math.cos(a) * 34, z = 23 + Math.sin(a) * 31;
      if (z > 50 && Math.abs(x - 25) < 8) continue;
      V.add((treeFn ? treeFn(i) : H.buildPine(M, 1.2 + (i % 3) * 0.2, 40 + i)).group, x, z, 0);
    }
  }
  ctx.hills = hills;

  LAYOUTS[themeId](ctx);

  // =================================================================
  // 실내 공통
  // =================================================================
  const indoorEnv = { bg: 0x1a120c, fog: [0x1a120c, 24, 50], hemi: [0xffe6c8, 0x3a2614, 0.85], key: [0xffd6a0, 1.5], exposure: 1.05, el: 0.86, dist: 12.5, bloom: 0.3 };
  function room(id, ox, w, d, extra = {}) {
    const R = mk({ id, ox, oz: 0, w, d, margin: 0.3, env: { ...indoorEnv, ...(extra.env || {}) } });
    R.add(H.buildRoomShell(M, w, d, extra.shell || {}).group);
    const ex = H.buildExitDoor(M);
    R.add(ex.group, w / 2, d - 0.6);
    R.inter({ id: `exit_${id}`, x: w / 2, z: d - 0.55, pick: [], marker: [w / 2, 1.0, d - 0.3], face: 0 });
    R.spawns.start = { x: w / 2, z: d - 1.3, yaw: PI };
    return R;
  }
  const onWall = (R, obj, x, y) => { R.add(obj, x, 0.03, 0, y); return obj; };
  const scrollHighlight = (m) => (t) => { m.material.emissiveIntensity = t * 0.25; };

  // ---- 서당 (퍼즐 4: 반닫이) ----
  const S = room('seodang', 200, 10, 8);
  const seoan = H.buildSeoan(M);
  S.place(seoan, 5, 2.4, 0);
  S.inter({ id: 'letter', x: 5, z: 3.65, pick: [seoan.group], marker: [5, 1.0, 2.4], face: PI });
  const sc1 = H.buildScroll(story.scroll3d.seodang);
  onWall(S, sc1.group, 2.3, 1.75);
  S.dyn.add(sc1.group);
  S.inter({ id: 'scroll_seodang', x: 2.3, z: 1.2, pick: [sc1.group], marker: [2.3, 2.8, 0.2], face: PI, highlight: scrollHighlight(sc1.mesh) });
  const shelf = H.buildBookshelf(M);
  S.place(shelf, 0.35, 5, Q);
  S.inter({ id: 'books', x: 1.5, z: 5, pick: [shelf.group], marker: [0.4, 2.1, 5], face: -Q });
  const band = H.buildBandaji(M);
  S.place(band, 8.2, 0.55, 0, { dynamic: true });
  S.inter({ id: 'bandaji', x: 8.2, z: 1.6, pick: [band.group], marker: [8.2, 1.3, 0.55], face: PI });
  B.bandaji = band;
  S.place(H.buildLowTable(M), 3, 5.6, 0);
  onWall(S, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: textBoardTexture('學而時習', { w: 512, h: 160, size: 80 }), roughness: 0.6 })), 5, 2.55);

  // ---- 대감댁 (퍼즐 5: 병풍) ----
  const D = room('daegam', 240, 12, 9, { shell: { floor: 'jangpan', wallH: 3.2 } });
  const screen = H.buildFoldingScreen(M, SCREEN_PANELS);
  D.place(screen, 6, 0.55, 0, { dynamic: true, cw: 2.6, cd: 0.6 });
  screen.group.userData.x0 = screen.group.position.x;
  B.screen = screen;
  D.inter({ id: 'screen', x: 6, z: 1.9, pick: [screen.group], marker: [6, 2.2, 0.6], face: PI });
  const drawer = new THREE.Group();
  H.mesh(new THREE.BoxGeometry(0.6, 0.3, 0.3), M.woodDark, drawer, 0, 0.9, 0.12);
  H.mesh(new THREE.PlaneGeometry(1.4, 1.4), M.glow, drawer, 0, 0.95, 0.3, { cast: false });
  drawer.visible = false;
  D.add(drawer, 6, 0, 0);
  D.dyn.add(drawer);
  B.secretDrawer = drawer;
  const mirror = H.buildMirrorStand(M);
  D.place(mirror, 0.5, 4.2, Q, { dynamic: true });
  D.inter({ id: 'mirror', x: 1.6, z: 4.2, pick: [mirror.group], marker: [0.5, 1.4, 4.2], face: -Q });
  D.place(H.buildLowTable(M), 9.8, 2.0, 0);
  const cushions = new THREE.Group();
  for (const [x, m] of [[-0.5, M.cushion], [0.5, M.cushionBlue]]) H.mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), m, cushions, x, 0.05, 0);
  D.add(cushions, 6, 4.6, 0);
  D.dyn.add(cushions);
  D.box(6, 4.6, 1.8, 0.8);
  D.inter({ id: 'cushions', x: 6, z: 5.6, pick: [cushions], marker: [6, 0.8, 4.6], face: PI });
  D.place(H.buildBandaji(M), 10.8, 0.5, 0);
  onWall(D, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.55), new THREE.MeshStandardMaterial({ map: textBoardTexture('積善之家', { w: 512, h: 160, size: 80 }), roughness: 0.6 })), 6, 2.75);

  // ---- 약방 (퍼즐 6: 약장) ----
  const Y = room('yakbang', 280, 10, 8, { shell: { floor: 'board' } });
  const cab = H.buildMedicineCabinet(M, CABINET_LABELS);
  Y.place(cab, 5, 0.3, 0, { dynamic: true });
  for (const d of cab.drawers) d.mesh.userData.z0 = d.mesh.position.z;
  const lockD = cab.drawers[CABINET_PUZZLE_DRAWER];
  H.mesh(new THREE.BoxGeometry(0.1, 0.08, 0.03), M.brass, lockD.mesh, 0, 0.0, 0.04);
  B.cabinet = cab;
  Y.inter({ id: 'cabinet', x: 5, z: 1.55, pick: [cab.group], marker: [5, cab.height + 0.3, 0.3], face: PI });
  const desk = H.buildLowTable(M);
  Y.place(desk, 1.6, 4.4, Q, { dynamic: true });
  desk.group.add(H.mesh(new THREE.BoxGeometry(0.3, 0.01, 0.22), M.paper, null, 0, 0.375, 0));
  Y.inter({ id: 'yakbang_note', x: 2.6, z: 4.4, pick: [desk.group], marker: [1.6, 1.0, 4.4], face: -Q });
  for (const [x, z, s] of [[7.6, 4.2, 1], [8.6, 5.3, 2], [7.4, 5.6, 3]]) Y.place(H.buildHerbTray(M, s), x, z, 0, { dynamic: true });
  Y.inter({ id: 'herbs', x: 7.0, z: 6.6, pick: [], marker: [8.0, 0.8, 5.0], face: PI * 0.75 });
  for (const [x, z] of [[1, 1], [2, 0.8]]) {
    const jar = new THREE.Group();
    H.mesh(new THREE.SphereGeometry(0.3, 14, 10), M.jar, jar, 0, 0.3, 0).scale.y = 1.2;
    Y.add(jar, x, z);
    Y.box(x, z, 0.6, 0.6);
  }

  // ---- 별당 (퍼즐 7: 자개함, 어두움) ----
  const Bd = room('byeoldang', 320, 9, 7, {
    env: { hemi: [0x8a7aa8, 0x1a1020, 0.16], key: [0x8aa0ff, 0.12], exposure: 1.1, bg: 0x07050a, fog: [0x07050a, 20, 40], followLamp: true, lamp: { intensity: 9, distance: 9, color: 0xffb060 }, bloom: 0.45 },
  });
  const ntable = H.buildNajeonBox(M);
  Bd.place(ntable, 4.5, 3.2, 0, { dynamic: true });
  B.najeon = ntable;
  Bd.inter({ id: 'najeon', x: 4.5, z: 4.3, pick: [ntable.group], marker: [4.5, 1.3, 3.2], face: PI });
  const sc2 = H.buildScroll(story.scroll3d.byeoldang, { w: 0.9, h: 1.7 });
  onWall(Bd, sc2.group, 2.0, 1.75);
  Bd.dyn.add(sc2.group);
  Bd.inter({ id: 'scroll_byeoldang', x: 2.0, z: 1.2, pick: [sc2.group], marker: [2.0, 2.8, 0.2], face: PI, highlight: scrollHighlight(sc2.mesh) });
  const gaya = H.buildGayageum(M);
  Bd.place(gaya, 7.0, 1.4, 0, { dynamic: true });
  Bd.inter({ id: 'gayageum', x: 7.0, z: 2.5, pick: [gaya.group], marker: [7.0, 0.9, 1.4], face: PI });

  // =================================================================
  // 지하 보물방 (테마별)
  // =================================================================
  const VA = VAULTS[themeId];
  const T = mk({ id: 'vault', ox: 360, oz: 0, w: 10, d: 10, margin: 0.3, env: VA.env });
  const vaultWall = M.stoneWall.clone();
  vaultWall.map = M.stoneWall.map.clone();
  vaultWall.map.wrapS = vaultWall.map.wrapT = THREE.RepeatWrapping;
  vaultWall.map.repeat.set(4, 1.4);
  vaultWall.map.needsUpdate = true;
  if (VA.wallColor) vaultWall.color.setHex(VA.wallColor);
  if (VA.wallRough != null) vaultWall.roughness = VA.wallRough;
  T.add(H.buildRoomShell(M, 10, 10, { floor: VA.floor || 'board', wallMat: VA.plaster ? M.plaster : vaultWall, wallH: 3.4 }).group);
  const stepMat = VA.stepColor ? new THREE.MeshStandardMaterial({ color: VA.stepColor, roughness: 0.3 }) : M.granite;
  for (let i = 0; i < 6; i++) {
    const st = H.mesh(new THREE.BoxGeometry(2, 0.3 * (i + 1), 0.4), stepMat, null);
    T.add(st, 2.2, 2.2 - i * 0.4, 0, 0.15 * (i + 1));
  }
  T.box(2.2, 1.2, 2.1, 2.4);
  T.inter({ id: 'exit_vault', x: 2.2, z: 2.95, pick: [], marker: [2.2, 2.4, 1.5], face: PI });
  T.spawns.start = { x: 2.2, z: 3.4, yaw: 0.4 };
  const treasure = VA.treasure(M);
  T.place(treasure, 5.6, 5.0, 0, { dynamic: true });
  B.treasure = treasure;
  T.inter({ id: 'chest', x: 5.6, z: 5.0 + treasure.size.d / 2 + 0.5, pick: [treasure.group], marker: [5.6, 2.0, 5.0], face: PI });
  VA.decor({ T, M, anim, H, P, vaultWall });
  // 반짝이 (상자를 열면)
  const sp = new THREE.Group();
  const spMat = new THREE.SpriteMaterial({ map: sparkleTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: VA.sparkle || 0xffffff });
  const motes = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(spMat.clone());
    if (VA.confetti) s.material.color.setHex([0xff5a5a, 0xffd24a, 0x5ad46a, 0x5a9cff, 0xff7ad8][i % 5]);
    s.scale.setScalar(0.15 + Math.random() * 0.2);
    s.userData = { a: Math.random() * PI * 2, r: 0.2 + Math.random() * 0.8, y: Math.random() * 2.5, sp: 0.3 + Math.random() * 0.6 };
    sp.add(s);
    motes.push(s);
  }
  sp.visible = false;
  T.add(sp, 5.6, 5.0, 0, 1.2);
  T.dyn.add(sp);
  B.sparkles = sp;

  // ---- 매 프레임 움직임 ----
  const fairyPhase = [0, 1.3, 2.6, 3.9, 5.2];
  B.update = (dt, time, areaId) => {
    if (areaId === 'village') {
      anim.lanterns.forEach((l, i) => { l.rotation.z = Math.sin(time * 1.4 + i) * 0.06; });
      anim.cloths.forEach((c, i) => { c.rotation.y = Math.sin(time * 1.8 + i) * 0.25; c.rotation.z = Math.sin(time * 2.6 + i) * 0.05; });
      if (B.stairwell.group.visible) B.stairwell.glow.material.opacity = 0.75 + Math.sin(time * 2) * 0.2;
      if (anim.fairy) M.fairy.forEach((m, i) => { m.emissiveIntensity = 1.4 + Math.max(0, Math.sin(time * 2.2 + fairyPhase[i])) * 2.2; });
      if (anim.water) { anim.water.offset.x = (time * 0.05) % 1; }
      anim.pulses.forEach((p) => p(time));
      B.final?.anim?.(time);
    }
    anim.flames.forEach((f, i) => { const s = 0.85 + Math.sin(time * 13 + i * 2.1) * 0.1 + Math.sin(time * 23 + i) * 0.06; f.scale.set(s, 0.9 + (1 - s), s); });
    if (areaId === 'vault') {
      treasure.anim?.(time);
      anim.spin.forEach((f) => f(time, dt));
      if (sp.visible) {
        for (const m of motes) {
          const u = m.userData;
          u.y += dt * u.sp;
          if (u.y > 2.6) u.y = 0;
          u.a += dt * 0.6;
          m.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r);
          m.material.opacity = Math.sin((u.y / 2.6) * PI);
        }
      }
    }
  };
  return B;
}

// =====================================================================
// 마을 배치 (테마별)
// =====================================================================
const LAYOUTS = {
  // ------------------------------------------------------------------
  // 설화 · 첫눈 내리는 밤: 가운데 큰 얼음 연못, 둘레에 집 네 채
  // ------------------------------------------------------------------
  seolhwa(c) {
    const { V, M, B, story, anim } = c;
    const F = { x: 25, z: 21 };
    c.ground([F]);
    c.perimeter();
    const pond = P.buildIcePond(M, 15, 11, HOLE);
    V.add(pond.group, F.x, F.z);
    c.reserve(17, 15, 33, 27);
    c.finale(P.buildSnowflakePlate(M), F.x, F.z, {
      stair: { step: new THREE.MeshStandardMaterial({ color: 0xbfe2f6, roughness: 0.15 }), wall: new THREE.MeshStandardMaterial({ color: 0x8cc0e0, roughness: 0.2 }), glow: '140,200,255' },
    });
    c.flavor('pond', null, 0, 0, 0, { at: [19.2, 26.4], marker: [20.4, 0.8, 24.6] });
    c.stele(H.buildStele(M, story.scroll3d.stele), 30.2, 28.8);

    c.house('daegam', { bays: 5, bayW: 2.4, depth: 5, sign: '大監宅', roofH: 2.4, wallH: 2.7 }, 25, 6.4, 0);
    c.house('seodang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '書堂' }, 7.2, 20.5, Q);
    c.house('byeoldang', { bays: 3, bayW: 2.0, depth: 3.8, sign: '別堂', roofH: 1.9 }, 42.8, 21, -Q);
    c.house('yakbang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '藥房', roof: 'thatch', roofH: 1.9, overhang: 0.8 }, 41, 7.6, 0);

    // 1) 고드름 달린 곳간 처마
    const shed = P.buildIceShed(M);
    c.spot('well', shed, 10.4, 7.2, 0, { at: [11.4, 10.4], marker: [11.4, shed.eaveY - 0.5, 9.3] });
    const big = shed.big, by0 = big.position.y;
    B.spotFx.well = async (tween, sfx) => {
      sfx?.('crack');
      await tween(0.7, (k) => { big.position.y = by0 - k * (by0 - 0.7); big.rotation.z = k * 0.4; }, (k) => k * k);
      big.visible = false;
    };
    B.spotPose.well = (k) => { big.visible = k < 1; };
    // 2) 석판 든 눈사람
    const sman = H.buildSnowman(M, { slate: ['문제', '❄'], hat: false, seed: 1 });
    c.spot('snowman', sman, 16.4, 30.4, 0, { marker: [16.4, 2.5, 30.4] });
    B.spotFx.snowman = async (tween) => { await tween(0.8, (k) => { sman.group.rotation.z = Math.sin(k * PI * 6) * 0.06 * (1 - k); }); };
    // 3) 눈 덮인 장독대
    const jars = H.buildJangdokdae(M);
    c.spot('pavilion', jars, 36.6, 31.8, 0, { marker: [36.5, 1.7, 31.4] });
    const lid = jars.jars[1].lid, ly0 = lid.position.y;
    B.spotPose.pavilion = (k) => { lid.position.y = ly0 + k * 0.32; lid.rotation.z = k * 0.55; lid.position.x = k * 0.18; };

    // 길
    c.path(23.9, 26.4, 26.1, 45.7);
    c.path(23.9, 10.4, 26.1, 15.7);
    c.path(11, 19.4, 17.7, 21.6);
    c.path(32.3, 20, 39.2, 22);
    c.path(39.9, 11.4, 42.1, 15.6);
    c.path(31.5, 15.6, 42.1, 17.6);
    c.path(10.4, 10.4, 12.4, 19.4);
    // 등불 (연못 둘레 + 입구 길)
    for (const [x, z] of [[23.2, 30], [26.8, 30], [23.2, 36.5], [26.8, 36.5], [16.6, 15.6], [33.4, 15.6], [16.2, 26.6], [33.8, 26.6]]) c.lantern(x, z, z > 33);
    // 장식
    [[31, 41.8, 0.8], [14.6, 43.0, 0.7]].forEach(([x, z, s], i) => {
      const d = H.buildSnowman(M, { scale: s, hat: i === 0, seed: i + 2 });
      c.flavor('snowmen', d, x, z, -0.3 + i * 0.6, { at: [x, z - 1.1], marker: [x, 2.0 * s, z] });
    });
    const sot = H.buildSotdae(M);
    c.flavor('sotdae', sot, 20.2, 38.6, 0, { marker: [20.2, 4.6, 38.6] });
    const tree = H.buildPersimmonTree(M, 1.1);
    c.flavor('persimmon', tree, 44.6, 35.4, 0, { at: [42.9, 35.4], marker: [44.6, 3.8, 35.4], face: Q, place: { cw: 0.8, cd: 0.8 } });
    V.place(H.buildPyeongsang(M), 39.2, 41.2, 0);
    c.decor({
      bushes: 13, grass: 26, pines: 7,
      extra: () => c.scatter(6, 91, 1.0, (x, z, i) => V.place(H.buildSnowPile(M, i + 1, 1 + (i % 2) * 0.4), x, z, 0, { collide: false })),
    });
    c.hills(0xd6dfea);
    void anim;
  },

  // ------------------------------------------------------------------
  // 홍길동 · 보름달 밤 잠입: 높은 담장 안 대감댁 + 곡간 세 채
  // ------------------------------------------------------------------
  hong(c) {
    const { V, M, B, story } = c;
    const F = { x: 39, z: 16.2 };
    c.ground([F]);
    c.perimeter({ high: { x0: 21, z1: 26 } });
    // 담장 안 흙 마당
    const yardMat = (new THREE.MeshStandardMaterial({ map: (() => { const t = earthTexture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 4.5); return t; })(), roughness: 0.95, color: 0x9a9080, polygonOffset: true, polygonOffsetFactor: -1 }));
    // 비밀문 구멍 자리는 비워 둠 (마당 판을 네 조각으로)
    const yardParts = [[21.3, 0.6, 49.4, F.z - HOLE / 2], [21.3, F.z + HOLE / 2, 49.4, 25.7], [21.3, F.z - HOLE / 2, F.x - HOLE / 2, F.z + HOLE / 2], [F.x + HOLE / 2, F.z - HOLE / 2, 49.4, F.z + HOLE / 2]];
    for (const [x0, z0, x1, z1] of yardParts) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-PI / 2), yardMat);
      m.receiveShadow = true;
      V.add(m, (x0 + x1) / 2, (z0 + z1) / 2, 0, 0.006);
    }
    // 대감댁 담장 (서쪽 · 남쪽, 남쪽 가운데 대문)
    const hw = (x, z, len, rot) => V.place(H.buildStoneWall(M, len, { h: 2.6, t: 0.6 }), x, z, rot);
    hw(21, 13.3, 25.4, Q);
    hw(27.2, 26, 12.4, 0);
    hw(43.15, 26, 13.1, 0);
    V.place(H.buildGate(M, 3.2), 35, 26, 0, { collide: false });
    V.box(33.4, 26, 0.5, 0.6);
    V.box(36.6, 26, 0.5, 0.6);
    c.reserve(32, 24, 38, 29);

    c.house('daegam', { bays: 5, bayW: 2.4, depth: 5, sign: '大監宅', roofH: 2.4, wallH: 2.7 }, 29, 7.2, 0);
    c.house('yakbang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '藥房', roof: 'thatch', roofH: 1.9, overhang: 0.8 }, 10.5, 7, 0);
    c.house('seodang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '書堂' }, 6.6, 20, Q);
    c.house('byeoldang', { bays: 3, bayW: 2.0, depth: 3.8, sign: '別堂', roofH: 1.9 }, 42.5, 38, -Q);
    // 곡간 세 채
    V.place(P.buildGranary(M, '穀間'), 40.6, 5.0, 0, { fade: true });
    V.place(P.buildGranary(M, '穀間'), 46.4, 5.0, 0, { fade: true });
    V.place(P.buildGranary(M, '米倉'), 46.4, 13.6, -Q, { fade: true });
    V.inter({ id: 'granary', x: 40.6, z: 8.2, pick: [], marker: [40.6, 2.6, 6.8], face: PI });
    c.reserve(38, 7, 44, 9.5);
    // 마지막: 곡간 마당 자물쇠 석판
    c.finale(P.buildTrapdoorFinal(M), F.x, F.z, { stair: { glow: '255,170,80' } });
    c.flavor('sacks', P.buildRiceSacks(M, 5, 1), 32.6, 16.4, 0, {});
    V.place(P.buildRiceSacks(M, 4, 2), 43.4, 21.6, 0.3);
    // 방(榜) 게시판
    c.stele(P.buildNoticeBoard(M, story.scroll3d.stele), 29.4, 31.2);

    // 1) 포졸 초소 (열쇠 꾸러미)
    const gp = P.buildGuardPost(M);
    c.spot('well', gp, 40.4, 29.4, 0, { at: [41.6, 31.4], marker: [41.6, 1.6, 30.6] });
    B.spotFx.well = async (tween, sfx) => { sfx?.('bucket'); await tween(0.9, (k) => { gp.ring.rotation.z = Math.sin(k * PI * 4) * 0.5 * (1 - k); }); };
    B.spotPose.well = (k) => { gp.ring.visible = k < 1; };
    // 2) 담장 개구멍 (서쪽 담 바깥)
    const hole = P.buildWallHole(M);
    V.add(hole.group, 20.68, 17, -Q);
    V.dyn.add(hole.group);
    V.inter({ id: 'snowman', x: 19.3, z: 17, pick: [hole.group], marker: [20.5, 1.1, 17], face: Q });
    c.reserve(17.5, 15.5, 20.6, 18.5);
    B.spotFx.snowman = async (tween) => { await tween(0.6, (k) => { hole.note.position.z = 0.08 + k * 0.5; hole.note.position.y = 0.12 + Math.sin(k * PI) * 0.3; }); hole.note.visible = false; };
    B.spotPose.snowman = (k) => { hole.note.visible = k < 1; };
    // 3) 마구간 여물통
    const st = P.buildStable(M);
    c.spot('pavilion', st, 9.4, 33.6, Q, { at: [12.4, 32.5], marker: [10.5, 1.2, 32.5], face: -Q });
    B.spotFx.pavilion = async (tween) => { tween(0.9, (k) => { st.head.rotation.x = Math.sin(k * PI * 3) * 0.25; }); await tween(0.7, (k) => { st.lockbox.lid.rotation.x = -k * 1.3; }); };
    B.spotPose.pavilion = (k) => { st.lockbox.lid.rotation.x = -k * 1.3; };
    const hay = new THREE.Group();
    H.mesh(H.blobGeometry(0.9, 88, { squash: 0.6, green: 0xc8a860, snow: 2, rough: 0.35 }), M.blob, hay, 0, 0.45, 0);
    c.flavor('haystack', { group: hay, size: { w: 1.6, d: 1.6 } }, 6.2, 39.6, 0, {});

    const jars = H.buildJangdokdae(M);
    c.flavor('jars', jars, 17.2, 6.4, 0, { marker: [17.2, 1.8, 6.4] });

    // 길 (흙길)
    c.path(23.9, 29.6, 26.1, 45.7);
    c.path(12.4, 27.6, 38.6, 29.6);
    c.path(33.9, 11.6, 36.1, 27.6);
    c.path(36.1, 19.0, 41.0, 21.0);
    c.path(12.4, 19, 14.4, 27.6);
    c.path(10.5, 19, 12.4, 21);
    c.path(9.5, 10.9, 11.5, 19);
    c.path(36.4, 31.0, 38.9, 39);
    // 횃불 · 청사초롱
    for (const [x, z] of [[33.0, 27.4], [37.0, 27.4], [36.0, 20.2], [42.2, 19.8], [33.4, 12.6], [44.2, 31.6]]) c.torch(x, z);
    for (const [x, z] of [[23.2, 34], [26.8, 34], [23.2, 40], [26.8, 40]]) c.lantern(x, z, true);
    c.decor({ bushes: 12, grass: 22, pines: 6 });
    c.hills(0x2a3a2a);
  },

  // ------------------------------------------------------------------
  // 김삿갓 · 늦가을 해질녘: 비스듬한 개울 + 나무다리, 건너편에 주막과 시비
  // ------------------------------------------------------------------
  kimsatgat(c) {
    const { V, M, B, story, anim } = c;
    const F = { x: 25, z: 10.5 };
    const zAt = (x) => 31 - 0.32 * x; // 개울 가운데
    const SW = 3.0;
    c.ground([F]);
    c.perimeter();
    // 개울 + 충돌 (다리·징검다리 자리는 비움)
    const stream = P.buildStream(M, -2, zAt(-2), 52, zAt(52), SW);
    V.add(stream.group);
    anim.water = stream.waterMat.map;
    const gaps = [[23.9, 26.1], [39.3, 40.7]];
    for (let x = 0.35; x < 49.7; x += 0.7) {
      const x0 = x - 0.35, x1 = x + 0.35;
      if (gaps.some(([a, b]) => x1 > a && x0 < b)) continue;
      V.box(x, zAt(x), 0.72, SW + 0.3);
    }
    for (let x = 0; x <= 50; x += 1) c.reserve(x - 0.5, zAt(x) - SW / 2 - 0.6, x + 0.5, zAt(x) + SW / 2 + 0.6);
    // 나무다리 (첫 문제)
    const bridge = P.buildWoodBridge(M, 5.6, 2.2);
    V.add(bridge.group, 25, zAt(25));
    V.dyn.add(bridge.group);
    for (const sx of [-1.12, 1.12]) V.box(25 + sx, zAt(25), 0.14, 5.6);
    V.inter({ id: 'well', x: 25, z: zAt(25) + 3.6, pick: [bridge.group], marker: [26.2, 1.4, zAt(25) + 0.4], face: PI });
    c.reserve(23, zAt(25) - 3.5, 27, zAt(25) + 4.6);
    const pf = bridge.face, pl = bridge.plaque;
    B.spotFx.well = async (tween) => { await tween(0.9, (k) => { pl.rotation.x = Math.sin(k * PI * 4) * 0.5 * (1 - k); pf.material.emissiveIntensity = Math.sin(k * PI) * 0.8; }); };
    B.spotPose.well = (k) => { pf.material.emissiveIntensity = k * 0.15; };
    // 징검다리
    const stones = P.buildSteppingStones(M, 4.4, 6);
    V.add(stones.group, 40, zAt(40));
    V.inter({ id: 'stones', x: 40, z: zAt(40) + 2.9, pick: [stones.group], marker: [40, 0.7, zAt(40) + 1.4], face: PI });

    // ---- 개울 북쪽: 대감댁 · 주막 · 언덕 아래 시비 ----
    c.house('daegam', { bays: 5, bayW: 2.4, depth: 5, sign: '大監宅', roofH: 2.4, wallH: 2.7 }, 10, 7.4, 0);
    // 언덕 (시비 뒤)
    const hill = new THREE.Mesh(H.blobGeometry(5.5, 333, { squash: 0.36, green: 0x8a6a34, snow: 2, rough: 0.25 }), M.blob);
    hill.receiveShadow = true; hill.castShadow = true;
    V.add(hill, 25, 2.4, 0, -0.4);
    V.box(25, 2.6, 9, 4.2);
    c.finale(P.buildPoemStele(M, ['山客秋夜', '詩一首']), F.x, F.z, { stair: { glow: '255,190,110' } });
    c.stele(H.buildStele(M, story.scroll3d.stele), 29.6, 12.2);
    for (const [x, z, s] of [[20.2, 3.6, 1.0], [30.4, 3.4, 1.1], [17.6, 5.4, 0.8]]) V.place(P.buildMaple(M, s, Math.round(x)), x, z, 0, { fade: true, cw: 0.6, cd: 0.6 });
    // 주막 (들어갈 수 없음) + 평상 (두 번째 문제)
    c.house('jumak', { bays: 3, bayW: 2.2, depth: 4.2, sign: '酒幕', roof: 'thatch', roofH: 1.9, overhang: 0.8 }, 39.5, 6.4, 0, { enter: false });
    const pyeong = H.buildPyeongsang(M);
    const paper = H.mesh(new THREE.BoxGeometry(0.3, 0.01, 0.22), M.paper, pyeong.group, 0.6, 0.56, -0.35);
    for (const [x, z] of [[0.75, 0.3], [0.45, 0.45]]) H.mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.5 }), pyeong.group, x, 0.59, z);
    c.spot('snowman', pyeong, 39.5, 12.4, 0, { marker: [39.5, 1.2, 12.4] });
    B.spotFx.snowman = async (tween) => { await tween(0.7, (k) => { paper.position.y = 0.56 + Math.sin(k * PI) * 0.35; paper.rotation.y = k * PI * 2; }); };
    const flag = P.buildTavernFlag(M);
    c.flavor('flag', flag, 34.0, 10.8, 0, { at: [34.0, 12.4], marker: [34.4, 3.6, 10.8] });
    anim.cloths.push(flag.cloth);
    c.flavor('jars', H.buildJangdokdae(M), 46.2, 11.6, 0, { at: [46.2, 13.2], marker: [46.2, 1.8, 11.6] });

    // ---- 개울 남쪽: 서당 · 약방 · 별당 · 감나무 ----
    c.house('seodang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '書堂' }, 7.4, 39.4, Q);
    c.house('yakbang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '藥房', roof: 'thatch', roofH: 1.9, overhang: 0.8 }, 34.2, 31.8, 0);
    c.house('byeoldang', { bays: 3, bayW: 2.0, depth: 3.8, sign: '別堂', roofH: 1.9 }, 44.6, 32.2, -Q);
    // 감나무 + 함 (세 번째 문제)
    const ptree = H.buildPersimmonTree(M, 1.25);
    V.place(ptree, 15.6, 30.2, 0, { dynamic: true, cw: 0.8, cd: 0.8 });
    const lb = H.buildLockBox(M);
    V.add(lb.group, 15.6, 31.5);
    V.dyn.add(lb.group);
    V.box(15.6, 31.5, 0.8, 0.6);
    V.inter({ id: 'pavilion', x: 15.6, z: 32.9, pick: [ptree.group, lb.group], marker: [15.6, 1.0, 31.5], face: PI });
    c.reserve(14, 29, 17.2, 34);
    B.spotFx.pavilion = async (tween) => {
      const f = ptree.fruits[0], y0 = f.position.y;
      tween(0.6, (k) => { f.position.y = y0 - k * (y0 - 0.15); }, (k) => k * k);
      await tween(0.7, (k) => { lb.lid.rotation.x = -k * 1.3; });
    };
    B.spotPose.pavilion = (k) => { lb.lid.rotation.x = -k * 1.3; };
    c.flavor('straw', P.buildStrawStack(M, 1), 3.4, 33.4, 0, { at: [3.4, 35.2] });
    V.place(P.buildStrawStack(M, 0.85), 20.4, 36.2, 0);

    // 길
    c.path(23.9, zAt(25) + 2.8, 26.1, 45.7);
    c.path(23.9, 13.4, 26.1, zAt(25) - 2.8);
    c.path(9, 14.6, 38, 16.4);
    c.path(9, 11.8, 11, 14.6);
    c.path(11.2, 38.4, 41, 40.4);
    c.path(33.2, 35.4, 35.2, 38.4);
    c.path(39.9, 32.2, 41.9, 38.4);
    for (const [x, z] of [[23.2, 30.5], [26.8, 30.5], [23.2, 37], [26.8, 37]]) c.lantern(x, z);
    // 단풍 · 낙엽
    c.decor({
      bushes: 12, grass: 30, pines: 2,
      extra: () => {
        c.scatter(9, 97, 1.7, (x, z, i) => V.place(P.buildMaple(M, 0.9 + (i % 3) * 0.15, 200 + i), x, z, 0, { fade: true, cw: 0.6, cd: 0.6 }));
        c.scatter(18, 101, 0.3, (x, z, i) => V.add(P.buildLeafLitter(3 + (i % 3), i).group, x, z));
      },
    });
    c.hills(0x9a5a2a, (i) => (i % 3 ? P.buildMaple(M, 1.6, 400 + i) : H.buildPine(M, 1.3, 40 + i)));
  },

  // ------------------------------------------------------------------
  // 전우치 · 천둥 치는 밤: 가운데 수련터 + 팔괘 석단, 사방으로 집
  // ------------------------------------------------------------------
  jeonwoochi(c) {
    const { V, M, B, story, anim } = c;
    const F = { x: 25, z: 21 };
    c.ground([F]);
    c.perimeter();
    const sand = new THREE.MeshStandardMaterial({ map: (() => { const t = dirtTexture('#7a6a52', 77); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })(), roughness: 0.55, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -1 });
    V.add(P.buildTrainingYard(M, 7.6, HOLE, sand).group, F.x, F.z);
    c.reserve(17.4, 13.4, 32.6, 28.6);
    c.finale(P.buildPalgwaeAltar(M), F.x, F.z, { stair: { glow: '170,140,255' } });
    // 돌기둥 여덟 (그중 서남쪽이 첫 문제)
    for (let i = 0; i < 8; i++) {
      const a = PI / 8 + (i / 8) * PI * 2;
      const dx = Math.cos(a), dz = Math.sin(a);
      const x = F.x + dx * 6.4, z = F.z + dz * 6.4;
      const rot = Math.atan2(dx, dz);
      const isSpot = i === 3;
      const pil = P.buildStonePillar(M, { talisman: isSpot ? '勅令' : i % 2 ? '雷' : '風', seed: i + 1, h: 2.3 + (i % 3) * 0.2 });
      V.place(pil, x, z, rot, { dynamic: true, cw: 0.8, cd: 0.8 });
      if (isSpot) {
        V.inter({ id: 'well', x: F.x + dx * 7.7, z: F.z + dz * 7.7, pick: [pil.group], marker: [x + dx * 0.3, 2.2, z + dz * 0.3] });
        const tal = pil.tal, ty0 = tal.position.y;
        B.spotFx.well = async (tween) => { await tween(0.9, (k) => { tal.rotation.x = Math.sin(k * PI * 5) * 0.4 * (1 - k * 0.5); tal.position.y = ty0 - k * k * 1.3; }); tal.visible = false; };
        B.spotPose.well = (k) => { tal.visible = k < 1; };
      } else if (i === 7) {
        V.inter({ id: 'pillar', x: F.x + dx * 7.7, z: F.z + dz * 7.7, pick: [pil.group], marker: [x, 2.6, z] });
      } else if (pil.tal) {
        anim.pulses.push(((t, ph) => (time) => { t.rotation.x = Math.sin(time * 3 + ph) * 0.12; })(pil.tal, i));
      }
    }
    c.stele(H.buildStele(M, story.scroll3d.stele), 19.4, 33.4);

    c.house('daegam', { bays: 5, bayW: 2.4, depth: 5, sign: '大監宅', roofH: 2.4, wallH: 2.7 }, 25, 5.8, 0);
    c.house('seodang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '書堂' }, 6.8, 21, Q);
    c.house('yakbang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '藥房', roof: 'thatch', roofH: 1.9, overhang: 0.8 }, 43.2, 14.2, -Q);
    c.house('byeoldang', { bays: 3, bayW: 2.0, depth: 3.8, sign: '別堂', roofH: 1.9 }, 42.6, 34.6, -Q);

    // 2) 번개 맞은 고목
    const tree = P.buildStruckTree(M);
    c.spot('snowman', tree, 12.4, 33.4, 0, { marker: [12.4, 2.6, 33.4] });
    anim.pulses.push((t) => { tree.ember.material.opacity = 0.55 + Math.sin(t * 5) * 0.2 + Math.sin(t * 13) * 0.1; });
    B.spotFx.snowman = async (tween, sfx) => { sfx?.('zap'); await tween(0.8, (k) => { tree.ember.scale.setScalar(1 + Math.sin(k * PI) * 1.4); tree.air.material.opacity = 0.55 + Math.sin(k * PI) * 0.45; }); };
    // 3) 부적 장승 + 함
    const tj = P.buildTalismanJangseung(M);
    c.spot('pavilion', tj, 33.6, 31.0, 0, { marker: [33.6, 1.1, 31.75] });
    B.spotFx.pavilion = async (tween) => {
      tween(0.9, (k) => tj.tals.forEach((t, i) => { t.rotation.x = Math.sin(k * PI * 4 + i) * 0.5 * (1 - k); }));
      await tween(0.7, (k) => { tj.lockbox.lid.rotation.x = -k * 1.3; });
    };
    B.spotPose.pavilion = (k) => { tj.lockbox.lid.rotation.x = -k * 1.3; };

    // 화로 (도술 불)
    const br1 = P.buildBrazier(M);
    c.flavor('brazier', br1, 16.4, 13.6, 0, { at: [16.4, 15.2], marker: [16.4, 1.8, 13.6] });
    const br2 = P.buildBrazier(M);
    V.place(br2, 33.6, 11.4, 0, { dynamic: true });
    anim.flames.push(...br1.flames, ...br2.flames);
    c.flavor('jars', H.buildJangdokdae(M), 8.6, 8.4, 0, { marker: [8.6, 1.8, 8.4] });

    // 길
    c.path(23.9, 28.6, 26.1, 45.7);
    c.path(23.9, 10.0, 26.1, 13.4);
    c.path(10.6, 20, 17.4, 22);
    c.path(31.4, 13.2, 39.4, 15.2);
    c.path(32.6, 33.6, 39, 35.6);
    for (const [x, z] of [[23.0, 31], [27.0, 31], [23.0, 38], [27.0, 38]]) c.torch(x, z);
    // 물웅덩이
    c.flavor('puddle', P.buildPuddle(3, 1.3), 28.6, 36.6, 0, { at: [29.4, 36.6], marker: [28.6, 0.6, 36.6], place: { collide: false } });
    c.decor({
      bushes: 13, grass: 24, pines: 7,
      extra: () => c.scatter(16, 113, 0.4, (x, z, i) => V.add(P.buildPuddle(i + 5, 0.8 + (i % 3) * 0.3).group, x, z)),
    });
    c.hills(0x1e2620);
  },

  // ------------------------------------------------------------------
  // 선생님의 선물 · 꼬마전구 눈 오는 밤: 가운데 큰 소나무
  // ------------------------------------------------------------------
  teacher(c) {
    const { V, M, B, story, anim } = c;
    const F = { x: 25, z: 24.4 };
    const TREE = { x: 25, z: 18.4 };
    c.ground([F]);
    c.perimeter();
    // 큰 소나무 + 꼬마전구 나선 + 별
    const pine = H.buildPine(M, 2.6, 7);
    V.place(pine, TREE.x, TREE.z, 0, { fade: true, cw: 1.3, cd: 1.3 });
    const bb = new THREE.Box3().setFromObject(pine.group);
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const pts = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      const y = 4.0 + t * (bb.max.y - 4.6);
      const r = 4.1 - t * 3.3;
      const a = t * PI * 2 * 5.5;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
    }
    V.add(P.buildLightString(M, pts, { spacing: 0.5, sag: 0, scale: 1.5 }));
    anim.fairy = true;
    const star = P.buildStar(0.62);
    V.add(star.group, cx, cz, 0, bb.max.y + 0.4);
    V.dyn.add(star.group);
    anim.pulses.push((t) => { star.group.rotation.y = t * 0.6; star.glow.material.opacity = 0.7 + Math.sin(t * 2.4) * 0.2; });
    // 1) 소나무 장식 패 (동쪽 가지)
    const orn = new THREE.Group();
    H.mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.3, 6).rotateZ(Q), M.pineTrunk, orn, 0.55, 0, 0);
    const plaque = new THREE.Group();
    plaque.position.set(1.1, -0.05, 0);
    H.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.25, 4), M.rope, plaque, 0, -0.12, 0);
    const pTex = textBoardTexture(['1'], { w: 160, h: 160, bg: '#c8302a', fg: '#ffe9a8', border: '#f2d24a', size: 110, weight: 900 });
    const pm = H.mesh(new THREE.BoxGeometry(0.36, 0.36, 0.05), [M.gold, M.gold, M.gold, M.gold, new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.5, emissive: 0xffc860, emissiveIntensity: 0.25 }), M.gold], plaque, 0, -0.42, 0);
    pm.rotation.y = Q;
    orn.add(plaque);
    V.add(orn, TREE.x + 0.1, TREE.z, 0, 2.2);
    V.dyn.add(orn);
    V.inter({ id: 'well', x: TREE.x + 2.7, z: TREE.z, pick: [orn], marker: [TREE.x + 1.2, 2.4, TREE.z], face: -Q });
    c.reserve(TREE.x + 1, TREE.z - 1.4, TREE.x + 4, TREE.z + 1.4);
    B.spotFx.well = async (tween) => { await tween(1.0, (k) => { plaque.rotation.y = k * PI * 4; plaque.rotation.z = Math.sin(k * PI * 3) * 0.3 * (1 - k); }); };
    c.reserve(TREE.x - 2, TREE.z - 2, TREE.x + 2, TREE.z + 2);
    // 선물 꾸러미 (소나무 아래)
    const gifts = new THREE.Group();
    [[-0.5, 0, 0x2a7a4a, 0.5], [0.15, 0.25, 0x2a4ab0, 0.42], [-0.1, -0.45, 0xc8402e, 0.36]].forEach(([x, z, col, s]) => {
      const g = P.buildGiftBox(M, { w: s, h: s * 0.8, d: s, color: col, ribbon: 0xf2d24a });
      g.group.position.set(x, 0, z);
      g.group.rotation.y = x * 2;
      gifts.add(g.group);
    });
    c.flavor('gifts', { group: gifts, size: { w: 1.4, d: 1.2 } }, 21.6, 19.6, 0, { at: [21.6, 21.2], marker: [21.6, 1.2, 19.6] });
    // 마지막: 별 석판
    c.finale(P.buildStarSlab(M), F.x, F.z, { stair: { glow: '255,210,140' } });
    const sl = B.final;
    const open0 = sl.open;
    sl.open = (k) => { open0(k); M.fairy.forEach((m) => { m.emissiveIntensity = 2 + Math.sin(k * PI) * 4; }); };
    c.stele(H.buildStele(M, story.scroll3d.stele), 31.0, 26.4);

    c.house('daegam', { bays: 5, bayW: 2.4, depth: 5, sign: '大監宅', roofH: 2.4, wallH: 2.7 }, 25, 6.0, 0);
    c.house('seodang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '書堂' }, 7.2, 16, Q);
    c.house('byeoldang', { bays: 3, bayW: 2.0, depth: 3.8, sign: '別堂', roofH: 1.9 }, 42.8, 16, -Q);
    c.house('yakbang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '藥房', roof: 'thatch', roofH: 1.9, overhang: 0.8 }, 7.4, 33.4, Q);

    // 2) 선물 썰매
    const sled = P.buildSled(M);
    c.spot('snowman', sled, 36, 30.4, 0, { marker: [36.3, 1.5, 30.6] });
    B.spotFx.snowman = async (tween) => { await tween(0.6, (k) => { sled.lid.position.y = 0.45 + Math.sin(k * PI) * 0.4; sled.lid.rotation.z = Math.sin(k * PI * 3) * 0.3; }); };
    B.spotPose.snowman = (k) => { sled.lid.rotation.x = -k * 0.6; sled.lid.position.z = -k * 0.15; };
    // 3) 석판 든 눈사람
    const sman = H.buildSnowman(M, { slate: ['문제', '✏'], hat: false, seed: 3 });
    c.spot('pavilion', sman, 15.2, 28.4, 0, { marker: [15.2, 2.5, 28.4] });
    B.spotFx.pavilion = async (tween) => { await tween(0.8, (k) => { sman.group.rotation.z = Math.sin(k * PI * 6) * 0.06 * (1 - k); }); };

    // 길 · 등 · 전구 줄
    c.path(23.9, 26.9, 26.1, 45.7);
    c.path(23.9, 10.2, 26.1, 15.2);
    c.path(11, 15, 20.5, 17);
    c.path(29.5, 15, 39.2, 17);
    c.path(11.3, 32.4, 23.9, 34.4);
    const posts = [[23.2, 30], [26.8, 30], [23.2, 36.5], [26.8, 36.5], [23.2, 41], [26.8, 41]];
    for (const [x, z] of posts.slice(0, 4)) c.lantern(x, z);
    for (const side of [23.2, 26.8]) {
      const pts2 = [30, 36.5].map((z) => new THREE.Vector3(side, 1.95, z));
      V.add(P.buildLightString(M, pts2, { sag: 0.45, offset: side > 25 ? 2 : 0 }));
    }
    const across = [new THREE.Vector3(23.2, 1.95, 30), new THREE.Vector3(26.8, 1.95, 30)];
    V.add(P.buildLightString(M, across, { sag: 0.35 }));
    [[31, 41.8, 0.8], [16.6, 42.6, 0.7]].forEach(([x, z, s], i) => {
      const d = H.buildSnowman(M, { scale: s, hat: i === 0, seed: i + 2 });
      c.flavor('snowmen', d, x, z, -0.3 + i * 0.6, { at: [x, z - 1.1], marker: [x, 2.0 * s, z] });
    });
    V.inter({ id: 'lights', x: 19.6, z: 11.6, pick: [], marker: [19.6, 3.4, 9.6], face: PI });
    c.flavor('jars', H.buildJangdokdae(M), 42.6, 36.4, 0, { marker: [42.6, 1.8, 36.4] });
    c.decor({
      bushes: 12, grass: 22, pines: 6,
      extra: () => c.scatter(6, 91, 1.0, (x, z, i) => V.place(H.buildSnowPile(M, i + 1, 1 + (i % 2) * 0.4), x, z, 0, { collide: false })),
    });
    c.hills(0xd6dfea);
  },
};

// =====================================================================
// 지하 보물방 (테마별)
// =====================================================================
function torches(T, anim, H, M, spots) {
  for (const [x, z, rot] of spots) {
    const t = H.buildTorch(M);
    T.add(t.group, x, z, rot, 1.8);
    T.dyn.add(t.group);
    anim.flames.push(t.flame);
  }
}
const VAULTS = {
  seolhwa: {
    env: { bg: 0x040912, fog: [0x040912, 22, 45], hemi: [0x9fc8ff, 0x0c1830, 0.42], key: [0xa8d4ff, 0.35], exposure: 1.15, el: 0.9, dist: 13, lamp: { intensity: 9, distance: 12, color: 0x8fd0ff, at: [5, 3, 5] }, bloom: 0.6 },
    wallColor: 0x9cc6e6, wallRough: 0.18, stepColor: 0xbfe2f6, sparkle: 0xc8ecff,
    treasure: (M) => P.buildOrbPedestal(M),
    decor({ T, M }) {
      const ice = new THREE.MeshStandardMaterial({ map: M.iceSurface.map, roughness: 0.1, metalness: 0.15 });
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-PI / 2), ice);
      fl.receiveShadow = true;
      T.add(fl, 5, 5, 0, 0.01);
      const icicle = new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.05, emissive: 0x2a5a8a, emissiveIntensity: 0.3 });
      const r = rand(77);
      for (let i = 0; i < 26; i++) {
        const onBack = i % 2 === 0;
        const len = 0.4 + r() * 0.9;
        const m = H_mesh(new THREE.ConeGeometry(0.08 + r() * 0.06, len, 6), icicle);
        m.rotation.x = PI;
        if (onBack) T.add(m, 0.4 + r() * 9.2, 0.15, 0, 3.4 - len / 2); else T.add(m, 0.15, 0.4 + r() * 9.2, 0, 3.4 - len / 2);
      }
      const crystal = new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x3aa0ff, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.2 });
      for (const [x, z] of [[8.8, 1.2], [1.0, 8.6], [8.6, 8.6], [4.2, 0.9]]) {
        const g = new THREE.Group();
        for (let k = 0; k < 5; k++) {
          const c = H_mesh(new THREE.OctahedronGeometry(0.18 + r() * 0.2, 0), crystal, g, (r() - 0.5) * 0.6, 0.25 + r() * 0.3, (r() - 0.5) * 0.6);
          c.scale.y = 2 + r() * 1.5;
          c.rotation.z = (r() - 0.5) * 0.6;
        }
        T.add(g, x, z);
        T.box(x, z, 0.8, 0.8);
      }
    },
  },
  hong: {
    env: { bg: 0x0a0704, fog: [0x0a0704, 22, 45], hemi: [0xffc88a, 0x2a1408, 0.3], key: [0xffc080, 0.35], exposure: 1.1, el: 0.9, dist: 13, lamp: { intensity: 10, distance: 12, color: 0xffa040, at: [5, 3, 5] }, bloom: 0.6 },
    treasure: (M) => {
      const c = H.buildTreasureChest(M);
      return { ...c, open(k) { c.lid.rotation.x = -k * 1.9; c.glow.material.opacity = 0.5 + k * 0.5; } };
    },
    decor({ T, M, anim }) {
      torches(T, anim, H, M, [[4.5, 0.15, 0], [8.0, 0.15, 0], [0.15, 6.5, Q]]);
      // 금괴 더미 · 쌀가마니 · 엽전
      const r = rand(31);
      for (const [x, z] of [[8.4, 2.0], [8.6, 8.2], [1.4, 8.6]]) {
        const g = new THREE.Group();
        for (let l = 0; l < 3; l++) for (let i = 0; i < 4 - l; i++) for (let j = 0; j < 2; j++) H_mesh(new THREE.BoxGeometry(0.34, 0.12, 0.16), M.gold, g, (i - (3 - l) / 2) * 0.36, 0.06 + l * 0.12, j * 0.18 - 0.09);
        g.rotation.y = r() * 0.6;
        T.add(g, x, z);
        T.box(x, z, 1.5, 0.7);
      }
      T.add(P.buildRiceSacks(M, 5, 3).group, 4.4, 8.9, 0.2);
      T.box(4.4, 8.9, 1.6, 0.9);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        T.add(H_mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), M.gold), 5.6 + Math.cos(a) * 1.1, 5.0 + Math.sin(a) * 1.1, 0, 0.02 + (i % 3) * 0.04);
      }
    },
  },
  kimsatgat: {
    env: { bg: 0x0d0805, fog: [0x0d0805, 22, 45], hemi: [0xffd8a8, 0x2a1a0e, 0.38], key: [0xffc890, 0.4], exposure: 1.1, el: 0.9, dist: 13, lamp: { intensity: 8, distance: 11, color: 0xffb860, at: [5, 2.6, 5] }, bloom: 0.5 },
    wallColor: 0xa08060,
    treasure: (M) => P.buildBrushBox(M),
    decor({ T, M, anim }) {
      for (const x of [3.6, 7.6]) { const s = H.buildBookshelf(M); T.add(s.group, x, 0.35); T.box(x, 0.35, 1.4, 0.45); }
      const s3 = H.buildBookshelf(M); T.add(s3.group, 0.35, 6.6, Q); T.box(0.35, 6.6, 0.45, 1.4);
      for (const [x, z, h] of [[4.0, 4.4, 0.9], [7.2, 4.4, 1.1], [7.6, 6.8, 0.7], [3.6, 6.6, 1.2], [9.2, 2.2, 1.4], [1.2, 9.0, 1.0]]) {
        const cd = P.buildCandle(M, h);
        T.add(cd.group, x, z);
        T.dyn.add(cd.group);
        anim.flames.push(cd.flame);
      }
      // 두루마리 더미 · 방석
      const r = rand(5);
      const g = new THREE.Group();
      for (let i = 0; i < 7; i++) { const s = H_mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8).rotateZ(Q), M.paper, g, (r() - 0.5) * 0.3, 0.06 + (i % 3) * 0.12, (i - 3) * 0.13); void s; }
      T.add(g, 8.6, 8.4);
      T.box(8.6, 8.4, 0.8, 1.0);
      T.add(H_mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), M.cushion), 5.6, 6.3, 0, 0.04);
    },
  },
  jeonwoochi: {
    env: { bg: 0x07040e, fog: [0x07040e, 22, 45], hemi: [0xb8a0ff, 0x140a28, 0.4], key: [0xb0a0ff, 0.35], exposure: 1.15, el: 0.9, dist: 13, lamp: { intensity: 9, distance: 12, color: 0xa080ff, at: [5, 3, 5] }, bloom: 0.65 },
    wallColor: 0x6a5a88, wallRough: 0.5, stepColor: 0x5a4e70, sparkle: 0xd8c8ff,
    treasure: (M) => P.buildFanPedestal(M),
    decor({ T, M, anim }) {
      // 바닥 팔괘 원
      const tex = new THREE.MeshBasicMaterial({ map: P.runeTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 });
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2).rotateX(-PI / 2), tex);
      T.add(rune, 5.6, 5.0, 0, 0.02);
      T.dyn.add(rune);
      // 떠다니는 부적
      const ring = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        const t = P.floatingTalisman(i);
        t.position.set(Math.cos(a) * 2.2, 1.6 + (i % 2) * 0.5, Math.sin(a) * 2.2);
        t.rotation.y = -a + Q;
        ring.add(t);
      }
      T.add(ring, 5.6, 5.0);
      T.dyn.add(ring);
      anim.spin.push((t) => { ring.rotation.y = t * 0.25; rune.rotation.y = -t * 0.1; ring.children.forEach((c, i) => { c.position.y = 1.7 + Math.sin(t * 1.4 + i) * 0.25; }); });
      const crystal = new THREE.MeshStandardMaterial({ color: 0xc0a0ff, emissive: 0x7a4aff, emissiveIntensity: 1.0, roughness: 0.15 });
      const r = rand(9);
      for (const [x, z] of [[8.8, 1.2], [1.0, 8.6], [8.6, 8.6]]) {
        const g = new THREE.Group();
        for (let k = 0; k < 5; k++) { const c = H_mesh(new THREE.OctahedronGeometry(0.18 + r() * 0.2, 0), crystal, g, (r() - 0.5) * 0.6, 0.25 + r() * 0.3, (r() - 0.5) * 0.6); c.scale.y = 2 + r() * 1.5; }
        T.add(g, x, z);
        T.box(x, z, 0.8, 0.8);
      }
    },
  },
  teacher: {
    env: { bg: 0x120c0a, fog: [0x120c0a, 22, 45], hemi: [0xffe0c0, 0x2a1a14, 0.5], key: [0xffd8b0, 0.45], exposure: 1.1, el: 0.9, dist: 13, lamp: { intensity: 8, distance: 12, color: 0xffd090, at: [5, 3, 5] }, bloom: 0.6 },
    plaster: true, floor: 'jangpan', confetti: true,
    treasure: (M) => P.buildBigGift(M),
    decor({ T, M, anim }) {
      // 벽 꼬마전구
      for (let row = 0; row < 2; row++) {
        const back = [], left = [];
        for (let i = 0; i <= 5; i++) {
          back.push(new THREE.Vector3(0.3 + i * 1.88, 3.1 - row * 0.7, 0.12));
          left.push(new THREE.Vector3(0.12, 3.1 - row * 0.7, 0.3 + i * 1.88));
        }
        T.add(P.buildLightString(M, back, { sag: 0.3, offset: row }));
        T.add(P.buildLightString(M, left, { sag: 0.3, offset: row + 2 }));
      }
      anim.spin.push((t) => M.fairy.forEach((m, i) => { m.emissiveIntensity = 1.4 + Math.max(0, Math.sin(t * 2.2 + i * 1.3)) * 2.2; }));
      // 선물 더미 · 풍선
      const cols = [0x2a7a4a, 0x2a4ab0, 0xc8402e, 0xe0a020, 0x8a3ab0];
      const r = rand(12);
      for (const [x, z] of [[8.6, 1.6], [8.6, 8.4], [1.4, 8.6], [4.2, 8.8]]) {
        const g = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const s = 0.35 + r() * 0.25;
          const b = P.buildGiftBox(M, { w: s, h: s * 0.85, d: s, color: cols[(k + Math.round(x)) % 5], ribbon: 0xf2d24a });
          b.group.position.set((r() - 0.5) * 0.5, k === 2 ? 0.45 : 0, (r() - 0.5) * 0.5);
          b.group.rotation.y = r() * 2;
          g.add(b.group);
        }
        T.add(g, x, z);
        T.box(x, z, 1.0, 1.0);
      }
      const balloons = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const col = cols[i % 5];
        const b = H_mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.05 }), balloons, (r() - 0.5) * 1.4, 2.4 + r() * 0.6, (r() - 0.5) * 1.4);
        b.scale.y = 1.18;
        H_mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 3), M.paper, balloons, b.position.x, b.position.y - 0.8, b.position.z);
      }
      T.add(balloons, 2.6, 7.4);
      T.dyn.add(balloons);
      anim.spin.push((t) => { balloons.position.y = Math.sin(t * 1.2) * 0.08; balloons.rotation.y = Math.sin(t * 0.5) * 0.2; });
    },
  },
};
function H_mesh(geo, mat, parent, x = 0, y = 0, z = 0) { return H.mesh(geo, mat, parent || null, x, y, z); }
