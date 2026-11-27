// 눈 내린 겨울 한옥마을 · 집 안 · 지하 보물창고 배치
// 좌표: x = 동(+)/서(-), z = 남(+)/북(-). 각 구역은 (0,0)~(w,d) 안쪽 좌표로 배치합니다.
import * as THREE from 'three';
import * as H from './3d/hanok.js';
import { snowTexture, snowPathTexture, textBoardTexture, sparkleTexture } from './3d/textures.js';

const PI = Math.PI;
const Q = PI / 2;
const SCREEN_PANELS = ['plum', 'orchid', 'chrys', 'bamboo'];
const CABINET_LABELS = ['황기', '인삼', '천궁', '복령', '계피', '작약', '당귀', '대추', '생강', '감초', '진피', '오미자', '숙지황', '구기자', '백출', '맥문동'];
export const CABINET_PUZZLE_DRAWER = 5; // 자물쇠 달린 서랍

function rotXZ(x, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [x * c + z * s, -x * s + z * c];
}

export function buildAreas({ mk, M, story }) {
  const B = { houses: {} };
  const anim = { flames: [], lanterns: [] };

  // =================================================================
  // 마을
  // =================================================================
  const V = mk({
    id: 'village', ox: 0, oz: 0, w: 50, d: 46, margin: 0.4,
    env: { sky: true, fog: [0xdfe5ec, 26, 85], hemi: [0xe6eef8, 0x8c95a3, 1.15], key: [0xfff1de, 1.5], exposure: 1.0, el: 0.8, dist: 16, bloom: 0.22, envI: 0.35, snow: true },
  });
  const VW = V.w, VD = V.d;
  const ALTAR = { x: 25, z: 22 };
  const HOLE = 1.7;

  // ---- 땅 (눈) ----
  const snow = snowTexture(); snow.repeat.set(1 / 6, 1 / 6);
  const snowOut = snowTexture(); snowOut.repeat.set(1 / 8, 1 / 8);
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
  inner.holes.push(rectPath(ALTAR.x - HOLE / 2, ALTAR.z - HOLE / 2, ALTAR.x + HOLE / 2, ALTAR.z + HOLE / 2));
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(inner).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ map: snow, roughness: 0.95 }));
  ground.receiveShadow = true;
  V.add(ground, 0, 0, 0, 0);
  const outer = rectShape(-60, -60, VW + 60, VD + 60);
  outer.holes.push(rectPath(0.2, 0.2, VW - 0.2, VD - 0.2));
  const outGround = new THREE.Mesh(new THREE.ShapeGeometry(outer).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ map: snowOut, roughness: 0.95 }));
  outGround.receiveShadow = true;
  V.add(outGround, 0, 0, 0, -0.005);
  // 사람이 다닌 눈길
  const pathMat = new THREE.MeshStandardMaterial({ map: snowPathTexture(), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 });
  const addPath = (x0, z0, x1, z1) => {
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
  };
  addPath(23.9, 24.1, 26.1, VD - 0.2);
  addPath(23.9, 11.4, 26.1, 19.9);
  addPath(12.4, 21, 22.9, 23);
  addPath(12.4, 13.8, 14.4, 34.2);
  addPath(27.1, 21, 41, 23);
  addPath(39.9, 13.4, 42.1, 21);
  addPath(32.1, 23, 33.9, 30.6);   // 우물 가는 길

  // ---- 담장 · 대문 ----
  const wall = (x, z, len, rot) => V.place(H.buildStoneWall(M, len), x, z, rot);
  wall(VW / 2, 0.3, VW, 0);
  wall(0.3, VD / 2, VD - 0.6, Q);
  wall(VW - 0.3, VD / 2, VD - 0.6, Q);
  wall(11.7, VD - 0.3, 23.4, 0);
  wall(VW - 11.7, VD - 0.3, 23.4, 0);
  V.place(H.buildGate(M, 3.2), 25, VD - 0.3, 0, { collide: false });
  V.box(25 - 1.6, VD - 0.3, 0.5, 0.6);
  V.box(25 + 1.6, VD - 0.3, 0.5, 0.6);
  V.spawns.start = { x: 25, z: 43.6, yaw: PI };

  // ---- 집 네 채 ----
  const house = (key, opts, x, z, rot) => {
    const h = H.buildHanok(M, opts);
    V.place(h, x, z, rot, { fade: true });
    const [fx, fz] = rotXZ(h.front.x, h.front.z, rot);
    const [mx, mz] = rotXZ(0, h.front.z - 0.6, rot);
    V.inter({
      id: `door_${key}`, x: x + fx, z: z + fz, pick: [h.group], marker: [x + mx, 2.3, z + mz], face: rot + PI,
      highlight: (t) => { h.doorMat.emissiveIntensity = t * 0.45; },
    });
    const [sx, sz] = rotXZ(0, h.front.z + 0.5, rot);
    V.spawns[`door_${key}`] = { x: x + sx, z: z + sz, yaw: rot };
    B.houses[key] = h;
    return h;
  };
  house('daegam', { bays: 5, bayW: 2.4, depth: 5, sign: '大監宅', roofH: 2.4, wallH: 2.7 }, 25, 7.4, 0);
  house('seodang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '書堂' }, 7.6, 15.5, Q);
  house('byeoldang', { bays: 3, bayW: 2.0, depth: 3.8, sign: '別堂', roofH: 1.9 }, 7.6, 32.5, Q);
  house('yakbang', { bays: 3, bayW: 2.2, depth: 4.2, sign: '藥房', roof: 'thatch', roofH: 1.9, overhang: 0.8 }, 41, 8.6, 0);

  // ---- 중앙 마당: 방위 석단 + 비석 + 계단 ----
  const altar = H.buildAltar(M);
  V.place(altar, ALTAR.x, ALTAR.z, 0, { dynamic: true });
  B.altar = altar;
  V.inter({ id: 'altar', x: ALTAR.x, z: ALTAR.z + 2.85, pick: [altar.group], marker: [ALTAR.x, 1.2, ALTAR.z], face: PI });
  V.inter({ id: 'stairs', x: ALTAR.x + 0.01, z: ALTAR.z + 2.85, pick: [], marker: [ALTAR.x, 0.9, ALTAR.z], face: PI });
  V.spawns.stairs = { x: ALTAR.x, z: ALTAR.z + 3.2, yaw: 0 };
  const stairwell = H.buildStairwell(M, HOLE, 3.0);
  stairwell.group.visible = false;
  V.add(stairwell.group, ALTAR.x, ALTAR.z, 0, 0);
  V.dyn.add(stairwell.group);
  B.stairwell = stairwell;

  const stele = H.buildStele(M, story.scroll3d.stele);
  V.place(stele, 29.6, 25.4, 0, { dynamic: true });
  V.inter({ id: 'stele', x: 29.6, z: 26.8, pick: [stele.group], marker: [29.6, 2.3, 25.4], face: PI });

  // ---- 입구 장승 ----
  for (const [x, title, female] of [[22.6, '天下大將軍', false], [27.4, '地下女將軍', true]]) {
    const j = H.buildJangseung(M, title, female);
    const cap = H.mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, PI * 2, 0, PI / 2), M.snow, j.group, 0, 3.18, 0);
    cap.scale.y = 0.4;
    V.place(j, x, 41.4, 0, { dynamic: true });
    V.inter({ id: 'jangseung', x, z: 42.6, pick: [j.group], marker: [x, 3.5, 41.4], face: PI });
  }
  for (const x of [23.4, 26.6]) {
    for (const z of [29, 36]) {
      const l = H.buildLanternPost(M, z > 30);
      V.place(l, x, z, x < 25 ? PI : 0, { dynamic: true });
      anim.lanterns.push(l.lamp);
    }
  }

  // ---- 퍼즐 1: 우물 ----
  const well = H.buildWell(M);
  V.place(well, 33, 29.6, 0, { dynamic: true });
  V.inter({ id: 'well', x: 33, z: 31.2, pick: [well.group], marker: [33, 2.9, 29.6], face: PI });
  B.well = well;

  // ---- 퍼즐 2: 석판 든 눈사람 ----
  const sman = H.buildSnowman(M, { slate: ['문제', '❄'], hat: story.id === 'kimsatgat', seed: 1 });
  V.place(sman, 20.0, 25.6, 0, { dynamic: true });
  V.inter({ id: 'snowman', x: 20.0, z: 27.1, pick: [sman.group], marker: [20.0, 2.5, 25.6], face: PI });
  B.snowman = sman;
  // 장식 눈사람
  [[30.8, 41.8, 0.8], [14.6, 43.0, 0.7]].forEach(([x, z, s], i) => {
    const d = H.buildSnowman(M, { scale: s, hat: i === 0, seed: i + 2 });
    V.place(d, x, z, -0.3 + i * 0.6, { dynamic: true });
    V.inter({ id: 'snowmen', x, z: z - 1.1 < 40 ? z + 1 : z - 1.1, pick: [d.group], marker: [x, 2.0 * s, z] });
  });

  // ---- 퍼즐 3: 언 연못가 정자 ----
  const pond = H.buildPond(M, 6.4, 4.6);
  V.place(pond, 18.4, 38.4, 0, { dynamic: true });
  V.inter({ id: 'pond', x: 18.4, z: 41.2, pick: [pond.group], marker: [18.4, 1.0, 38.4], face: PI });
  const pav = H.buildPavilion(M, ['觀雪亭', '눈을 바라보는 정자']);
  V.place(pav, 18.6, 30.6, 0, { fade: true, keep: [] });
  const lockbox = H.buildLockBox(M);
  V.add(lockbox.group, 18.6, 32.1, 0, 0.62);
  V.dyn.add(lockbox.group);
  B.lockbox = lockbox;
  V.inter({ id: 'pavilion', x: 18.6, z: 33.4, pick: [pav.group, lockbox.group], marker: [18.6, 1.4, 32.3], face: PI });

  // ---- 장식: 장독대 · 감나무 · 솟대 · 평상 ----
  const jars = H.buildJangdokdae(M);
  V.place(jars, 43.2, 18.8, 0, { dynamic: true });
  V.inter({ id: 'jars', x: 43.2, z: 20.4, pick: [jars.group], marker: [43.2, 1.8, 18.8], face: PI });
  const tree = H.buildPersimmonTree(M, 1.1);
  V.place(tree, 44.6, 35.2, 0, { dynamic: true, cw: 0.8, cd: 0.8 });
  V.inter({ id: 'persimmon', x: 42.9, z: 35.2, pick: [tree.group], marker: [44.6, 3.8, 35.2], face: Q });
  const sot = H.buildSotdae(M);
  V.place(sot, 22.4, 39.6, 0, { dynamic: true });
  V.inter({ id: 'sotdae', x: 22.4, z: 40.6, pick: [sot.group], marker: [22.4, 4.6, 39.6], face: PI });
  V.place(H.buildPyeongsang(M), 39.2, 28.8, 0);

  // ---- 눈 덮인 덤불 · 눈 더미 · 소나무 ----
  [[44.6, 37.6], [4.6, 24.2], [30.6, 43.2], [47.0, 26.8], [19.4, 13.6], [4.8, 41.6], [3, 6], [47, 6.5], [33.5, 13.5], [16.5, 12.6], [3.4, 37], [46.8, 41.2], [14.6, 26.5], [36, 25.5], [47, 21]].forEach(([x, z], i) => {
    V.place(H.buildBush(M, 20 + i, 0.8 + (i % 3) * 0.12), x, z, 0);
  });
  [[36.5, 39.5], [10.5, 40.5], [28.5, 33.5], [45.5, 30.5], [6, 9], [35, 17]].forEach(([x, z], i) => {
    V.place(H.buildSnowPile(M, i + 1, 1 + (i % 2) * 0.4), x, z, 0, { collide: false });
  });
  [[3.2, 3.0, 1.2], [15.6, 2.8, 1.1], [34.6, 3.0, 1.15], [47.2, 3.4, 1.2], [3.0, 42.8, 1.1], [47.0, 43.0, 1.2], [47.3, 14.5, 1.0], [12.6, 43.6, 0.95], [37.5, 43.6, 1.0]].forEach(([x, z, s], i) => {
    V.place(H.buildPine(M, s, i + 1), x, z, 0, { fade: true, cw: 0.6, cd: 0.6 });
  });
  // 담장 밖 눈 덮인 산
  const hillMat = new THREE.MeshStandardMaterial({ color: 0xe8edf3, roughness: 1, flatShading: true });
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
    V.add(H.buildPine(M, 1.2 + (i % 3) * 0.2, 40 + i).group, x, z, 0);
  }

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

  // ---- 지하 보물창고 ----
  const T = mk({
    id: 'vault', ox: 360, oz: 0, w: 10, d: 10, margin: 0.3,
    env: { bg: 0x0a0704, fog: [0x0a0704, 22, 45], hemi: [0xffc88a, 0x2a1408, 0.3], key: [0xffc080, 0.35], exposure: 1.1, el: 0.9, dist: 13, lamp: { intensity: 10, distance: 12, color: 0xffa040, at: [5, 3, 5] }, bloom: 0.6 },
  });
  const vaultWall = M.stoneWall.clone();
  vaultWall.map = M.stoneWall.map.clone();
  vaultWall.map.wrapS = vaultWall.map.wrapT = THREE.RepeatWrapping;
  vaultWall.map.repeat.set(4, 1.4);
  vaultWall.map.needsUpdate = true;
  T.add(H.buildRoomShell(M, 10, 10, { floor: 'board', wallMat: vaultWall, wallH: 3.4 }).group);
  for (let i = 0; i < 6; i++) {
    const st = H.mesh(new THREE.BoxGeometry(2, 0.3 * (i + 1), 0.4), M.granite, null);
    T.add(st, 2.2, 2.2 - i * 0.4, 0, 0.15 * (i + 1));
  }
  T.box(2.2, 1.2, 2.1, 2.4);
  T.inter({ id: 'exit_vault', x: 2.2, z: 2.95, pick: [], marker: [2.2, 2.4, 1.5], face: PI });
  T.spawns.start = { x: 2.2, z: 3.4, yaw: 0.4 };
  const chestObj = H.buildTreasureChest(M);
  T.place(chestObj, 5.6, 5.0, 0, { dynamic: true });
  B.chest = chestObj;
  T.inter({ id: 'chest', x: 5.6, z: 6.4, pick: [chestObj.group], marker: [5.6, 2.0, 5.0], face: PI });
  for (const [x, z, rot] of [[4.5, 0.15, 0], [8.0, 0.15, 0], [0.15, 6.5, Q]]) {
    const t = H.buildTorch(M);
    T.add(t.group, x, z, rot, 1.8);
    T.dyn.add(t.group);
    anim.flames.push(t.flame);
  }
  const sp = new THREE.Group();
  const spMat = new THREE.SpriteMaterial({ map: sparkleTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const motes = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(spMat.clone());
    s.scale.setScalar(0.15 + Math.random() * 0.2);
    s.userData = { a: Math.random() * PI * 2, r: 0.2 + Math.random() * 0.8, y: Math.random() * 2.5, sp: 0.3 + Math.random() * 0.6 };
    sp.add(s);
    motes.push(s);
  }
  sp.visible = false;
  T.add(sp, 5.6, 5.0, 0, 1.2);
  T.dyn.add(sp);
  B.sparkles = sp;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    const c = H.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), M.gold, null);
    T.add(c, 5.6 + Math.cos(a) * 1.1, 5.0 + Math.sin(a) * 1.1, 0, 0.02 + (i % 3) * 0.04);
  }

  // ---- 매 프레임 움직임 ----
  B.update = (dt, time, areaId) => {
    if (areaId === 'village') {
      anim.lanterns.forEach((l, i) => { l.rotation.z = Math.sin(time * 1.4 + i) * 0.06; });
      if (B.stairwell.group.visible) B.stairwell.glow.material.opacity = 0.75 + Math.sin(time * 2) * 0.2;
    }
    anim.flames.forEach((f, i) => { const s = 0.85 + Math.sin(time * 13 + i * 2.1) * 0.1 + Math.sin(time * 23 + i) * 0.06; f.scale.set(s, 0.9 + (1 - s), s); });
    if (areaId === 'vault' && sp.visible) {
      for (const m of motes) {
        const u = m.userData;
        u.y += dt * u.sp;
        if (u.y > 2.6) u.y = 0;
        u.a += dt * 0.6;
        m.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r);
        m.material.opacity = Math.sin((u.y / 2.6) * PI);
      }
    }
  };
  return B;
}
