// 테마별 소품 (얼음 연못, 곡간, 개울·나무다리, 수련터, 큰 소나무·꼬마전구 …)
// 모든 함수는 바닥 중앙(0,0,0) 기준, 정면 +z 로 만들고 { group, size:{w,d}, … } 를 돌려줍니다.
import * as THREE from 'three';
import { mesh, buildRoof, buildJangseung, buildLockBox, blobGeometry, taegukTexture } from './hanok.js';
import {
  textBoardTexture, glowTexture, snowflakePlateTexture, trigramTexture, talismanTexture, crackTexture, rand, leafLitterTexture, canvasTexture,
} from './textures.js';

const PI = Math.PI;
const Q = PI / 2;
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
const std = (o) => new THREE.MeshStandardMaterial(o);

// ---------------------------------------------------------------------
// 공통
// ---------------------------------------------------------------------
const glowMats = new Map();
function glowMat(rgb, opacity = 0.6) {
  const k = `${rgb}|${opacity}`;
  if (!glowMats.has(k)) glowMats.set(k, new THREE.MeshBasicMaterial({ map: glowTexture(rgb), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
  return glowMats.get(k);
}
// 바닥에 번지는 불빛 (가짜 조명 — 밤 장면에서 등불 아래를 밝혀 줌)
export function groundGlow(size = 3, rgb = '255,180,90', opacity = 0.45) {
  return mesh(new THREE.PlaneGeometry(size, size).rotateX(-PI / 2), glowMat(rgb, opacity), null, 0, 0.035, 0, { cast: false, receive: false });
}
// 공중의 불빛 덩어리 (빛 번짐)
export function airGlow(size = 1.4, rgb = '255,200,120', opacity = 0.7) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(rgb), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
  s.scale.setScalar(size);
  return s;
}

// 가운데가 뚫린 네모 테두리 (계단 구멍을 둘러쌈)
function holeFrame(g, mat, outer, hole, h, y = h / 2) {
  const side = (outer - hole) / 2;
  mesh(box(outer, h, side), mat, g, 0, y, -(hole / 2 + side / 2));
  mesh(box(outer, h, side), mat, g, 0, y, hole / 2 + side / 2);
  mesh(box(side, h, hole), mat, g, -(hole / 2 + side / 2), y, 0);
  mesh(box(side, h, hole), mat, g, hole / 2 + side / 2, y, 0);
}

// 네 방위 돌 (마지막 퍼즐에서 누르는 돌)
const HANJA = { N: '北', S: '南', E: '東', W: '西' };
const DIRV = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
function dirStones(g, M, radius, { mat = M.granite, rgb = '255,215,140', bg = '#8f877b', fg = '#2a2018', h = 0.3 } = {}) {
  const sockets = {};
  for (const [k, [dx, dz]] of Object.entries(DIRV)) {
    const sg = new THREE.Group();
    sg.position.set(dx * radius, 0, dz * radius);
    mesh(cyl(0.34, 0.4, h, 16), mat, sg, 0, h / 2, 0);
    const tex = textBoardTexture(HANJA[k], { w: 128, h: 128, bg, fg, border: null, size: 92, weight: 900 });
    const top = mesh(new THREE.CircleGeometry(0.3, 20).rotateX(-PI / 2), std({ map: tex, roughness: 0.9 }), sg, 0, h + 0.005, 0, { cast: false });
    top.rotation.y = dx ? -dx * Q : dz > 0 ? 0 : PI;
    const glow = mesh(new THREE.PlaneGeometry(1.5, 1.5).rotateX(-PI / 2), glowMat(rgb, 1).clone(), sg, 0, h + 0.02, 0, { cast: false });
    glow.material.opacity = 0;
    g.add(sg);
    sockets[k] = { group: sg, glow };
  }
  return sockets;
}

// 꼬마전구 줄: pts 사이를 살짝 처지게 이음
const bulbGeo = new THREE.SphereGeometry(0.055, 6, 4);
export function buildLightString(M, pts, { spacing = 0.34, sag = 0.22, scale = 1, offset = 0 } = {}) {
  const g = new THREE.Group();
  let n = offset;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = a.distanceTo(b);
    const steps = Math.max(1, Math.round(len / spacing));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * PI) * sag * Math.min(1, len / 3);
      const m = mesh(bulbGeo, M.fairy[n++ % M.fairy.length], g, p.x, p.y, p.z, { cast: false, receive: false });
      m.scale.setScalar(scale);
    }
  }
  return g;
}

// 횃불 기둥
export function buildTorchPost(M, { h = 2.2, rgb = '255,170,80' } = {}) {
  const g = new THREE.Group();
  mesh(cyl(0.06, 0.08, h, 8), M.woodDark, g, 0, h / 2, 0);
  mesh(cyl(0.16, 0.09, 0.22, 8), M.iron, g, 0, h + 0.05, 0);
  const flame = mesh(new THREE.ConeGeometry(0.13, 0.42, 8), M.flame, g, 0, h + 0.36, 0, { cast: false });
  const ag = airGlow(1.6, rgb, 0.75);
  ag.position.set(0, h + 0.35, 0);
  g.add(ag);
  g.add(groundGlow(4.2, rgb, 0.4));
  return { group: g, size: { w: 0.3, d: 0.3 }, flame };
}

// 돌 화로 (불)
export function buildBrazier(M) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    const leg = mesh(box(0.08, 0.7, 0.08), M.iron, g, Math.cos(a) * 0.35, 0.35, Math.sin(a) * 0.35);
    leg.rotation.z = Math.cos(a) * 0.15;
  }
  mesh(cyl(0.55, 0.32, 0.32, 14), M.granite, g, 0, 0.85, 0);
  mesh(cyl(0.45, 0.45, 0.04, 14), M.coal, g, 0, 1.0, 0, { cast: false });
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const f = mesh(new THREE.ConeGeometry(0.16 - i * 0.03, 0.55 - i * 0.1, 8), M.flame, g, (i - 1) * 0.15, 1.25, (i % 2) * 0.1 - 0.05, { cast: false });
    flames.push(f);
  }
  const ag = airGlow(2.2, '255,160,70', 0.8);
  ag.position.set(0, 1.3, 0);
  g.add(ag);
  g.add(groundGlow(5, '255,150,60', 0.45));
  return { group: g, size: { w: 1.1, d: 1.1 }, flames };
}

// 선물 상자 (리본)
export function buildGiftBox(M, { w = 0.6, h = 0.5, d = 0.6, color = 0xc8402e, ribbon = 0xf2d24a } = {}) {
  const g = new THREE.Group();
  const bm = std({ color, roughness: 0.6 });
  const rm = std({ color: ribbon, roughness: 0.35, metalness: 0.2 });
  mesh(box(w, h, d), bm, g, 0, h / 2, 0);
  mesh(box(w + 0.01, h, 0.08), rm, g, 0, h / 2, 0);
  mesh(box(0.08, h, d + 0.01), rm, g, 0, h / 2, 0);
  const lid = new THREE.Group();
  lid.position.set(0, h, 0);
  mesh(box(w + 0.06, 0.1, d + 0.06), bm, lid, 0, 0.05, 0);
  mesh(box(w + 0.07, 0.1, 0.09), rm, lid, 0, 0.05, 0);
  mesh(box(0.09, 0.1, d + 0.07), rm, lid, 0, 0.05, 0);
  for (const s of [-1, 1]) {
    const bow = mesh(new THREE.TorusGeometry(0.09 * (w / 0.6), 0.03, 6, 12), rm, lid, s * 0.08 * (w / 0.6), 0.18, 0);
    bow.rotation.y = s * 0.6;
  }
  g.add(lid);
  return { group: g, size: { w, d }, lid };
}

// =====================================================================
// 설화 · 첫눈 내리는 밤
// =====================================================================
// 고드름 달린 곳간 (정면 +z, 큰 고드름 속에 열쇠)
export function buildIceShed(M) {
  const g = new THREE.Group();
  const W = 3.6, D = 2.8;
  mesh(box(W + 0.6, 0.35, D + 0.6), M.granite, g, 0, 0.175, 0);
  mesh(box(W, 2.0, D), M.plaster, g, 0, 1.35, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.2, 2.1, 0.2), M.wood, g, sx * W / 2, 1.4, sz * D / 2);
  mesh(box(W + 0.1, 0.18, 0.2), M.wood, g, 0, 2.3, D / 2);
  mesh(box(1.3, 1.65, 0.08), M.woodDark, g, 0, 1.18, D / 2 + 0.04);
  mesh(box(0.2, 0.12, 0.05), M.iron, g, 0, 1.3, D / 2 + 0.1);
  const RW = W + 1.6, RD = D + 1.6;
  const r = buildRoof(M, RW, RD, 1.3, { lift: 0.3 });
  r.group.position.set(0, 2.38, 0);
  g.add(r.group);
  const ez = RD / 2 - 0.08;
  const rr = rand(707);
  for (let x = -RW / 2 + 0.35; x < RW / 2 - 0.3; x += 0.22 + rr() * 0.18) {
    if (Math.abs(x - 1.0) < 0.3) continue;
    const len = 0.25 + rr() * 0.6;
    const y = 2.38 + r.heightAt(x, ez) - 0.03;
    const c = mesh(new THREE.ConeGeometry(0.045, len, 6), M.ice, g, x, y - len / 2, ez, { cast: false });
    c.rotation.x = PI;
  }
  // 열쇠가 얼어 있는 커다란 고드름
  const big = new THREE.Group();
  const by = 2.38 + r.heightAt(1.0, ez) - 0.03;
  big.position.set(1.0, by, ez);
  const cone = mesh(new THREE.ConeGeometry(0.16, 1.35, 8), std({ color: 0xcfeeff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.7, emissive: 0x2a6a9a, emissiveIntensity: 0.25 }), big, 0, -0.67, 0, { cast: false });
  cone.rotation.x = PI;
  const key = new THREE.Group();
  mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), M.brass, key, 0, 0, 0);
  mesh(box(0.025, 0.16, 0.02), M.brass, key, 0, -0.12, 0);
  key.position.set(0, -0.42, 0);
  big.add(key);
  g.add(big);
  return { group: g, size: { w: W + 0.6, d: D + 0.6 }, big, eaveY: by };
}

// 얼음 연못 (가운데 네모 구멍 = 계단 자리)
export function buildIcePond(M, w, d, hole = 0) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const n = 40;
  const r = rand(311);
  const radii = [];
  for (let i = 0; i < n; i++) radii.push(0.92 + r() * 0.08);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * PI * 2;
    const k = radii[i % n];
    const x = Math.cos(a) * (w / 2) * k, y = Math.sin(a) * (d / 2) * k;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  if (hole) {
    const h = hole / 2, p = new THREE.Path();
    p.moveTo(-h, -h); p.lineTo(-h, h); p.lineTo(h, h); p.lineTo(h, -h); p.lineTo(-h, -h);
    shape.holes.push(p);
  }
  const iceGeo = new THREE.ShapeGeometry(shape).rotateX(-PI / 2);
  const uv = iceGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 6);
  mesh(iceGeo, M.iceSurface, g, 0, 0.03, 0, { cast: false });
  // 둘레 돌 (네 방향 길목은 비움)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const gap = [0, Q, PI, PI * 1.5].some((t) => Math.abs(((a - t + PI * 3) % (PI * 2)) - PI) < 0.16);
    if (gap) continue;
    const k = radii[i] * 1.03;
    const s = 0.24 + r() * 0.22;
    const rock = mesh(new THREE.DodecahedronGeometry(s, 0), M.granite, g, Math.cos(a) * (w / 2) * k, s * 0.35, -Math.sin(a) * (d / 2) * k);
    rock.rotation.set(r() * 3, r() * 3, r() * 3);
    rock.scale.y = 0.6;
    const sc = mesh(new THREE.SphereGeometry(s * 0.8, 8, 6, 0, PI * 2, 0, PI / 2), M.snow, g, rock.position.x, s * 0.5, rock.position.z);
    sc.scale.y = 0.35;
  }
  // 얼음 위 눈 얼룩
  for (let i = 0; i < 9; i++) {
    const a = r() * PI * 2, rr = 0.45 + r() * 0.4;
    const p = mesh(new THREE.CircleGeometry(0.35 + r() * 0.5, 14).rotateX(-PI / 2), M.snow, g, Math.cos(a) * (w / 2) * rr, 0.04, Math.sin(a) * (d / 2) * rr, { cast: false });
    p.scale.x = 1.5;
  }
  return { group: g, size: { w, d } };
}

// 눈꽃 얼음판 (마지막 퍼즐): 여섯 조각으로 갈라지며 물러남
export function buildSnowflakePlate(M) {
  const g = new THREE.Group();
  const frameMat = std({ color: 0xb8d8ec, roughness: 0.25, metalness: 0.05 });
  holeFrame(g, frameMat, 3.0, 1.7, 0.14);
  const tex = snowflakePlateTexture();
  const plateMat = std({ map: tex, emissive: 0x6ab8f0, emissiveMap: tex, emissiveIntensity: 0.45, roughness: 0.12, metalness: 0.1 });
  const wedges = [];
  for (let i = 0; i < 6; i++) {
    const start = (i / 6) * PI * 2;
    const wg = new THREE.Group();
    wg.position.y = 0.14;
    mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.12, 6, 1, false, start, PI / 3), plateMat, wg, 0, 0.06, 0);
    const mid = start + PI / 6;
    g.add(wg);
    wedges.push({ group: wg, dx: Math.sin(mid), dz: Math.cos(mid) });
  }
  const crack = mesh(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }), g, 0, 0.29, 0, { cast: false });
  const sockets = dirStones(g, M, 2.05, { mat: frameMat, rgb: '150,210,255', bg: '#c6dceb', fg: '#20405a' });
  const halo = mesh(new THREE.PlaneGeometry(4.4, 4.4).rotateX(-PI / 2), glowMat('140,200,255', 0.35), g, 0, 0.05, 0, { cast: false });
  return {
    group: g, size: { w: 4.6, d: 4.6 }, sockets, halo, dur: 2.4,
    open(k) {
      const split = Math.max(0, (k - 0.25) / 0.75);
      crack.material.opacity = Math.sin(Math.min(1, k * 1.6) * PI) * 0.95;
      for (const w of wedges) {
        w.group.position.set(w.dx * split * 1.15, 0.14 - split * 0.1, w.dz * split * 1.15);
        w.group.rotation.set(w.dz * split * 0.22, 0, -w.dx * split * 0.22);
      }
    },
  };
}

// 얼음 동굴 보주 받침대 (서리 덮개가 걷힘)
export function buildOrbPedestal(M, { orb = 0xa8e4ff, cover = 0xd8f0ff, base = null } = {}) {
  const g = new THREE.Group();
  const bm = base || std({ color: 0x9cc4dc, roughness: 0.2, metalness: 0.1 });
  mesh(cyl(0.75, 0.9, 0.5, 8), bm, g, 0, 0.25, 0);
  mesh(cyl(0.45, 0.6, 0.6, 8), bm, g, 0, 0.8, 0);
  mesh(cyl(0.6, 0.5, 0.12, 8), bm, g, 0, 1.16, 0);
  const orbMat = std({ color: orb, emissive: orb, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.2 });
  const o = mesh(new THREE.SphereGeometry(0.32, 28, 20), orbMat, g, 0, 1.55, 0, { cast: false });
  const domeMat = std({ color: cover, roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.85 });
  const dome = mesh(new THREE.SphereGeometry(0.55, 24, 14, 0, PI * 2, 0, PI / 2), domeMat, g, 0, 1.22, 0, { cast: false });
  const glow = mesh(new THREE.PlaneGeometry(4, 4).rotateX(-PI / 2), glowMat('160,215,255', 0.5).clone(), g, 0, 0.02, 0, { cast: false });
  const ag = airGlow(2.2, '170,225,255', 0);
  ag.position.set(0, 1.55, 0);
  g.add(ag);
  return {
    group: g, size: { w: 1.8, d: 1.8 }, glow,
    open(k) {
      dome.position.y = 1.22 + k * 1.8;
      domeMat.opacity = 0.85 * (1 - k);
      dome.visible = k < 0.99;
      orbMat.emissiveIntensity = 0.6 + k * 2.4;
      ag.material.opacity = k * 0.9;
      glow.material.opacity = 0.5 + k * 0.5;
    },
    anim(t) { o.position.y = 1.55 + Math.sin(t * 1.6) * 0.06; o.rotation.y = t * 0.6; },
  };
}

// =====================================================================
// 홍길동 · 보름달 밤 잠입
// =====================================================================
// 곡간 (높은 마루, 판자벽, 자물쇠 문)
export function buildGranary(M, sign = '穀間') {
  const g = new THREE.Group();
  const W = 4.4, D = 3.4, fy = 0.6;
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) mesh(box(0.34, fy, 0.34), M.granite, g, sx * (W / 2 - 0.2), fy / 2, sz * (D / 2 - 0.2));
  mesh(box(W, 0.14, D), M.woodDark, g, 0, fy + 0.07, 0);
  const wallH = 2.2;
  mesh(box(W - 0.1, wallH, D - 0.1), M.woodLight, g, 0, fy + 0.14 + wallH / 2, 0);
  for (let i = 0; i <= 6; i++) {
    const x = -W / 2 + (i * W) / 6;
    mesh(box(0.08, wallH, 0.06), M.wood, g, x, fy + 0.14 + wallH / 2, D / 2 - 0.02);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.2, wallH + 0.2, 0.2), M.wood, g, sx * W / 2, fy + wallH / 2 + 0.2, sz * D / 2);
  // 문
  mesh(box(1.5, 1.8, 0.08), M.woodDark, g, 0, fy + 0.14 + 0.9, D / 2 + 0.03);
  for (const y of [0.5, 1.4]) mesh(box(1.52, 0.07, 0.04), M.iron, g, 0, fy + 0.14 + y, D / 2 + 0.08);
  mesh(box(0.22, 0.16, 0.08), M.brass, g, 0, fy + 1.0, D / 2 + 0.12);
  mesh(box(1.4, 0.3, 0.6), M.granite, g, 0, 0.15, D / 2 + 0.4);
  const r = buildRoof(M, W + 1.4, D + 1.4, 1.4, { lift: 0.3 });
  r.group.position.set(0, fy + 0.14 + wallH + 0.1, 0);
  g.add(r.group);
  const tex = textBoardTexture(sign, { w: 384, h: 140, size: 76 });
  mesh(new THREE.PlaneGeometry(1.0, 0.36), std({ map: tex, roughness: 0.6 }), g, 0, fy + wallH - 0.05, D / 2 + 0.05, { cast: false });
  return { group: g, size: { w: W + 0.4, d: D + 0.6 } };
}

// 포졸 초소 (기둥에 열쇠 꾸러미)
export function buildGuardPost(M) {
  const g = new THREE.Group();
  const W = 2.4, D = 2.0, H = 2.3;
  mesh(box(W + 0.3, 0.2, D + 0.3), M.granite, g, 0, 0.1, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(cyl(0.09, 0.1, H, 8), M.red, g, sx * W / 2, H / 2 + 0.2, sz * D / 2);
  mesh(box(W, H - 0.3, 0.08), M.woodLight, g, 0, (H - 0.3) / 2 + 0.2, -D / 2);
  const r = buildRoof(M, W + 1.0, D + 1.0, 0.9, { lift: 0.25 });
  r.group.position.set(0, H + 0.25, 0);
  g.add(r.group);
  // 걸상 + 전립(포졸 모자)
  mesh(box(1.6, 0.08, 0.4), M.wood, g, 0, 0.62, -D / 2 + 0.35);
  for (const sx of [-0.7, 0.7]) mesh(box(0.08, 0.42, 0.36), M.wood, g, sx, 0.41, -D / 2 + 0.35);
  mesh(new THREE.ConeGeometry(0.26, 0.2, 14), M.coal, g, -0.4, 0.78, -D / 2 + 0.35);
  mesh(cyl(0.34, 0.34, 0.02, 14), M.coal, g, -0.4, 0.68, -D / 2 + 0.35);
  // 창 걸이
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Group();
    mesh(cyl(0.02, 0.02, 2.0, 6), M.woodLight, sp, 0, 1.0, 0);
    mesh(new THREE.ConeGeometry(0.05, 0.25, 6), M.iron, sp, 0, 2.12, 0);
    mesh(new THREE.SphereGeometry(0.05, 6, 4), M.red, sp, 0, 1.95, 0);
    sp.position.set(0.55 + i * 0.18, 0.2, -D / 2 + 0.12);
    sp.rotation.z = -0.08;
    g.add(sp);
  }
  // 열쇠 꾸러미 (앞 기둥)
  const ring = new THREE.Group();
  ring.position.set(W / 2, 1.55, D / 2 + 0.12);
  mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 14), M.brass, ring, 0, -0.1, 0);
  for (const a of [-0.4, 0.4]) {
    const k = mesh(box(0.03, 0.2, 0.015), M.brass, ring, Math.sin(a) * 0.08, -0.26, 0);
    k.rotation.z = a;
  }
  g.add(ring);
  return { group: g, size: { w: W + 0.3, d: D + 0.3 }, ring };
}

// 담장 개구멍 (담장 앞면에 붙여 씀)
export function buildWallHole(M) {
  const g = new THREE.Group();
  const holeShape = new THREE.Shape();
  holeShape.moveTo(-0.45, 0);
  holeShape.lineTo(-0.45, 0.35);
  holeShape.absarc(0, 0.35, 0.45, PI, 0, true);
  holeShape.lineTo(0.45, 0);
  holeShape.lineTo(-0.45, 0);
  mesh(new THREE.ShapeGeometry(holeShape), M.dark, g, 0, 0.01, 0.01, { cast: false });
  const r = rand(55);
  for (let i = 0; i < 6; i++) {
    const s = 0.1 + r() * 0.12;
    const st = mesh(new THREE.DodecahedronGeometry(s, 0), M.granite, g, (r() - 0.5) * 1.3, s * 0.5, 0.15 + r() * 0.35);
    st.rotation.set(r() * 3, r() * 3, r() * 3);
  }
  const note = mesh(cyl(0.035, 0.035, 0.28, 8), M.paper, g, 0.05, 0.12, 0.08);
  note.rotation.z = Q;
  return { group: g, size: { w: 1.2, d: 0.5 }, note };
}

// 마구간 (말 + 여물통 + 자물쇠 함)
export function buildStable(M) {
  const g = new THREE.Group();
  const W = 4.6, D = 3.0, H = 2.3;
  mesh(box(W, H, 0.12), M.woodLight, g, 0, H / 2, -D / 2);
  for (const sx of [-1, 1]) mesh(box(0.12, H * 0.6, D), M.woodLight, g, sx * W / 2, H * 0.3, 0);
  for (const sx of [-1, 0, 1]) mesh(cyl(0.09, 0.1, H, 8), M.wood, g, sx * W / 2, H / 2, D / 2);
  mesh(box(W + 0.2, 0.16, 0.16), M.wood, g, 0, H, D / 2);
  const r = buildRoof(M, W + 1.2, D + 1.2, 1.1, { kind: 'thatch' });
  r.group.position.set(0, H + 0.08, 0);
  g.add(r.group);
  // 짚 바닥
  mesh(box(W - 0.3, 0.06, D - 0.3), M.rope, g, 0, 0.03, 0, { cast: false });
  // 말
  const horse = new THREE.Group();
  const hm = std({ color: 0x6a3e22, roughness: 0.8 });
  const mane = std({ color: 0x1e140e, roughness: 0.9 });
  const body = mesh(new THREE.CapsuleGeometry(0.34, 0.95, 6, 12), hm, horse, 0, 1.05, 0);
  body.rotation.x = Q;
  for (const sx of [-0.18, 0.18]) for (const sz of [-0.42, 0.42]) mesh(cyl(0.06, 0.05, 0.85, 6), hm, horse, sx, 0.42, sz);
  const head = new THREE.Group();
  head.position.set(0, 1.25, 0.6);
  const neck = mesh(new THREE.CapsuleGeometry(0.15, 0.45, 4, 8), hm, head, 0, 0.22, 0.12);
  neck.rotation.x = 0.7;
  const face = mesh(new THREE.CapsuleGeometry(0.12, 0.34, 4, 8), hm, head, 0, 0.42, 0.42);
  face.rotation.x = 1.2;
  mesh(box(0.06, 0.4, 0.3), mane, head, 0, 0.42, 0.05);
  for (const sx of [-1, 1]) mesh(new THREE.ConeGeometry(0.04, 0.12, 5), hm, head, sx * 0.07, 0.68, 0.3);
  horse.add(head);
  const tail = mesh(cyl(0.04, 0.02, 0.6, 5), mane, horse, 0, 0.9, -0.75);
  tail.rotation.x = -0.4;
  horse.position.set(-0.8, 0, -0.1);
  g.add(horse);
  // 여물통 + 자물쇠 함
  mesh(box(1.6, 0.4, 0.5), M.woodDark, g, -0.8, 0.45, D / 2 - 0.35);
  mesh(box(1.5, 0.08, 0.4), M.rope, g, -0.8, 0.62, D / 2 - 0.35, { cast: false });
  for (const sx of [-0.65, 0.65]) mesh(box(0.08, 0.3, 0.4), M.woodDark, g, -0.8 + sx, 0.15, D / 2 - 0.35);
  const lock = buildLockBox(M);
  lock.group.position.set(1.1, 0, D / 2 - 0.45);
  g.add(lock.group);
  // 짚더미
  const hay = mesh(blobGeometry(0.6, 77, { squash: 0.55, green: 0xc8a860, snow: 2, rough: 0.35, detail: 1 }), M.blob, g, 1.4, 0.3, -0.6);
  void hay;
  return { group: g, size: { w: W + 0.2, d: D + 0.2 }, head, lockbox: lock };
}

// 곡간 마당 자물쇠 석판 + 비밀문 (마지막 퍼즐)
export function buildTrapdoorFinal(M) {
  const g = new THREE.Group();
  holeFrame(g, M.granite, 3.2, 1.7, 0.2);
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.2, -0.85);
  const door = new THREE.Group();
  door.position.z = 0.85;
  mesh(box(1.72, 0.1, 1.72), M.wood, door, 0, 0.05, 0);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) mesh(box(0.02, 0.105, 1.72), M.woodDark, door, x, 0.05, 0, { cast: false });
  for (const z of [-0.55, 0.55]) mesh(box(1.74, 0.12, 0.1), M.iron, door, 0, 0.055, z);
  const lock = new THREE.Group();
  mesh(box(0.34, 0.26, 0.12), M.iron, lock, 0, 0.13, 0);
  mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12, PI), M.iron, lock, 0, 0.26, 0);
  lock.position.set(0, 0.1, 0.72);
  door.add(lock);
  pivot.add(door);
  g.add(pivot);
  const sockets = dirStones(g, M, 2.05, { rgb: '255,190,110' });
  return {
    group: g, size: { w: 4.6, d: 4.6 }, sockets, dur: 2.0,
    open(k) {
      lock.visible = k < 0.15;
      const t = Math.max(0, (k - 0.2) / 0.8);
      pivot.rotation.x = -t * 1.95;
    },
  };
}

// 방(榜) 붙은 게시판
export function buildNoticeBoard(M, lines) {
  const g = new THREE.Group();
  for (const sx of [-0.8, 0.8]) mesh(cyl(0.07, 0.08, 2.4, 8), M.woodDark, g, sx, 1.2, 0);
  mesh(box(1.8, 1.2, 0.08), M.woodLight, g, 0, 1.4, 0);
  const tex = textBoardTexture(lines, { w: 320, h: 400, bg: '#efe2c0', fg: '#2a1a10', border: '#8a2a1a', size: 44, vertical: true, paper: true, weight: 900 });
  mesh(new THREE.PlaneGeometry(0.9, 1.1), std({ map: tex, roughness: 0.9 }), g, -0.2, 1.4, 0.045, { cast: false });
  const t2 = textBoardTexture(['懸賞'], { w: 200, h: 200, bg: '#e9dbb4', fg: '#8a1a10', border: null, size: 70, paper: true, weight: 900 });
  const p2 = mesh(new THREE.PlaneGeometry(0.5, 0.5), std({ map: t2, roughness: 0.9 }), g, 0.55, 1.6, 0.046, { cast: false });
  p2.rotation.z = 0.08;
  const r = buildRoof(M, 2.4, 0.9, 0.35, { lift: 0.12 });
  r.group.position.set(0, 2.42, 0);
  g.add(r.group);
  return { group: g, size: { w: 1.8, d: 0.5 } };
}

// 쌀가마니 더미
export function buildRiceSacks(M, n = 5, seed = 1) {
  const g = new THREE.Group();
  const r = rand(seed * 31);
  const sm = std({ color: 0xc9a868, roughness: 1 });
  const rows = [[-0.55, 0], [0, 0], [0.55, 0], [-0.28, 1], [0.28, 1]].slice(0, n);
  for (const [x, row] of rows) {
    const s = mesh(new THREE.CapsuleGeometry(0.24, 0.5, 4, 10), sm, g, x, 0.25 + row * 0.42, (r() - 0.5) * 0.1);
    s.rotation.x = Q;
    s.scale.set(1, 1, 0.8);
  }
  return { group: g, size: { w: 1.5, d: 0.9 } };
}

// =====================================================================
// 김삿갓 · 늦가을 해질녘
// =====================================================================
// 개울: (x0,z0)→(x1,z1) 을 따라 흐르는 물길 (구역 좌표로 바로 만듦)
export function buildStream(M, x0, z0, x1, z1, width) {
  const g = new THREE.Group();
  const dx = x1 - x0, dz = z1 - z0;
  const L = Math.hypot(dx, dz);
  const ang = Math.atan2(-dz, dx);
  const waterMat = std({ map: M.water.map, color: 0x8aa6b0, roughness: 0.05, metalness: 0.35, transparent: true, opacity: 0.88 });
  const geo = new THREE.PlaneGeometry(L + 4, width, 40, 1).rotateX(-PI / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (L / 4), uv.getY(i) * (width / 4));
  const water = mesh(geo, waterMat, null, 0, 0, 0, { cast: false });
  water.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2);
  water.rotation.y = ang;
  g.add(water);
  // 물가 (흙 둑 + 돌 + 갈대)
  const bankMat = std({ color: 0x5a4630, roughness: 1 });
  const r = rand(919);
  for (const side of [-1, 1]) {
    const bank = mesh(new THREE.PlaneGeometry(L + 4, 0.9).rotateX(-PI / 2), bankMat, null, 0, 0, 0, { cast: false });
    const nx = Math.sin(ang), nz = Math.cos(ang);
    bank.position.set((x0 + x1) / 2 + nx * side * (width / 2 + 0.3), 0.012, (z0 + z1) / 2 + nz * side * (width / 2 + 0.3));
    bank.rotation.y = ang;
    g.add(bank);
    for (let t = 0; t <= 1; t += 0.03 + r() * 0.03) {
      const px = x0 + dx * t + nx * side * (width / 2 + 0.15 + r() * 0.25);
      const pz = z0 + dz * t + nz * side * (width / 2 + 0.15 + r() * 0.25);
      const s = 0.12 + r() * 0.2;
      const st = mesh(new THREE.DodecahedronGeometry(s, 0), M.granite, g, px, s * 0.3, pz);
      st.rotation.set(r() * 3, r() * 3, r() * 3);
      st.scale.y = 0.55;
      if (r() < 0.25) {
        for (let k = 0; k < 2; k++) {
          const rg = new THREE.PlaneGeometry(0.6, 0.9); rg.translate(0, 0.45, 0);
          const reed = mesh(rg, M.grassCard, g, px + (r() - 0.5) * 0.3, 0, pz + (r() - 0.5) * 0.3, { cast: false });
          reed.rotation.y = r() * PI;
        }
      }
    }
  }
  return { group: g, water, waterMat };
}

// 나무다리 (z 방향으로 놓임, 난간에 나무패)
export function buildWoodBridge(M, len = 5.6, width = 2.2) {
  const g = new THREE.Group();
  const n = Math.round(len / 0.28);
  for (let i = 0; i < n; i++) {
    const z = -len / 2 + (i + 0.5) * (len / n);
    const y = 0.1 + Math.cos((z / len) * PI) * 0.12;
    const pl = mesh(box(width, 0.08, len / n - 0.03), i % 2 ? M.wood : M.woodLight, g, 0, y, z);
    pl.rotation.x = -Math.sin((z / len) * PI) * 0.05;
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 4; i++) {
      const z = -len / 2 + (i * len) / 4;
      mesh(cyl(0.06, 0.07, 1.0, 8), M.woodDark, g, sx * width / 2, 0.5, z);
    }
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const z = -len / 2 + (i * len) / 8;
      pts.push(new THREE.Vector3(sx * width / 2, 0.95 + Math.cos((z / len) * PI) * 0.12, z));
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.045, 6), M.woodDark, g);
  }
  // 나무패 (동쪽 난간 가운데)
  const plaque = new THREE.Group();
  plaque.position.set(width / 2 + 0.05, 0.82, 0.4);
  const tex = textBoardTexture(['詩'], { w: 160, h: 220, bg: '#c8a46a', fg: '#2a1a0a', border: '#5a3a1a', size: 96, weight: 900 });
  const pm = mesh(new THREE.BoxGeometry(0.04, 0.36, 0.28), [M.woodLight, M.woodLight, M.woodLight, M.woodLight, M.woodLight, M.woodLight], plaque, 0.02, -0.2, 0);
  const face = mesh(new THREE.PlaneGeometry(0.28, 0.36), std({ map: tex, roughness: 0.8, emissive: 0xffd28a, emissiveIntensity: 0 }), plaque, 0.045, -0.2, 0, { cast: false });
  face.rotation.y = Q;
  mesh(cyl(0.006, 0.006, 0.12, 4), M.rope, plaque, 0.02, -0.0, 0);
  void pm;
  g.add(plaque);
  return { group: g, size: { w: width, d: len }, plaque, face };
}

// 징검다리
export function buildSteppingStones(M, len = 4, n = 6) {
  const g = new THREE.Group();
  const r = rand(616);
  for (let i = 0; i < n; i++) {
    const z = -len / 2 + (i + 0.5) * (len / n);
    const s = mesh(cyl(0.32 + r() * 0.08, 0.38, 0.16, 9), M.granite, g, (r() - 0.5) * 0.3, 0.08, z);
    s.rotation.y = r() * 3;
  }
  return { group: g, size: { w: 1, d: len } };
}

// 주막 깃발
export function buildTavernFlag(M) {
  const g = new THREE.Group();
  mesh(cyl(0.06, 0.08, 3.6, 8), M.woodDark, g, 0, 1.8, 0);
  mesh(cyl(0.025, 0.025, 1.0, 6).rotateZ(Q), M.woodDark, g, 0.45, 3.45, 0);
  const cloth = new THREE.Group();
  cloth.position.set(0.45, 3.45, 0);
  const tex = textBoardTexture(['酒'], { w: 200, h: 300, bg: '#f2ead6', fg: '#9a1a10', border: '#2a4a8a', size: 150, weight: 900, paper: true });
  const c = mesh(new THREE.PlaneGeometry(0.75, 1.1, 1, 4), std({ map: tex, roughness: 0.9, side: THREE.DoubleSide }), cloth, 0, -0.56, 0);
  void c;
  g.add(cloth);
  return { group: g, size: { w: 0.3, d: 0.3 }, cloth };
}

// 단풍나무
export function buildMaple(M, scale = 1, seed = 1) {
  const g = new THREE.Group();
  const r = rand(seed * 37 + 5);
  const h = 2.4 * scale;
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.3, h * 0.5, 0), new THREE.Vector3((r() - 0.5) * 0.5, h, (r() - 0.5) * 0.3)];
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.14 * scale, 7), M.trunk, g);
  const cols = [0xc03018, 0xd8501a, 0xe08a1e, 0xa82818, 0xd8a02a];
  const n = 4 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + r();
    const rr = i === 0 ? 0 : 0.7 * scale;
    const s = (i === 0 ? 1.25 : 0.85 + r() * 0.3) * scale;
    mesh(blobGeometry(s, seed * 11 + i, { squash: 0.72, green: cols[Math.floor(r() * cols.length)], snow: 2, rough: 0.4 }), M.blob, g, pts[2].x + Math.cos(a) * rr, h + (i === 0 ? 0.35 : -0.1 + r() * 0.5) * scale, pts[2].z + Math.sin(a) * rr);
  }
  return { group: g, size: { w: 0.6 * scale, d: 0.6 * scale } };
}

// 볏가리
export function buildStrawStack(M, scale = 1) {
  const g = new THREE.Group();
  mesh(cyl(0.55 * scale, 0.75 * scale, 1.3 * scale, 14), M.thatch, g, 0, 0.65 * scale, 0);
  mesh(new THREE.ConeGeometry(0.75 * scale, 0.7 * scale, 14), M.thatch, g, 0, 1.6 * scale, 0);
  mesh(cyl(0.6 * scale, 0.6 * scale, 0.08, 14), M.rope, g, 0, 0.9 * scale, 0);
  return { group: g, size: { w: 1.5 * scale, d: 1.5 * scale } };
}

// 언덕 아래 시비(詩碑) (마지막 퍼즐): 돌며 옆으로 밀려남
export function buildPoemStele(M, lines) {
  const g = new THREE.Group();
  holeFrame(g, M.granite, 3.0, 1.7, 0.16);
  const cover = new THREE.Group();
  mesh(box(1.92, 0.14, 1.92), M.granite, cover, 0, 0.23, 0);
  const stoneMat = std({ color: 0x6f6a62, roughness: 0.95, flatShading: true });
  const st = mesh(new THREE.DodecahedronGeometry(0.85, 1), stoneMat, cover, 0, 1.35, 0);
  st.scale.set(0.85, 1.45, 0.5);
  const tex = textBoardTexture(lines, { w: 256, h: 512, bg: '#5d5850', fg: '#efe0b8', border: null, size: 44, vertical: true, weight: 900 });
  const face = mesh(new THREE.PlaneGeometry(0.78, 1.5), std({ map: tex, roughness: 0.9, emissive: 0xffb070, emissiveMap: tex, emissiveIntensity: 0.08 }), cover, 0, 1.38, 0.41, { cast: false });
  void face;
  g.add(cover);
  const sockets = dirStones(g, M, 2.05, { rgb: '255,190,120' });
  return {
    group: g, size: { w: 4.6, d: 4.6 }, sockets, dur: 2.4,
    open(k) {
      cover.rotation.y = k * Q;
      cover.position.set(-k * 1.55, 0, -k * 1.55);
    },
  };
}

// 바닥에 흩어진 낙엽 (알파 판)
let litterMat = null;
export function buildLeafLitter(size = 4, seed = 1) {
  if (!litterMat) litterMat = std({ map: leafLitterTexture(), alphaTest: 0.5, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 });
  const g = new THREE.Group();
  const p = mesh(new THREE.PlaneGeometry(size, size).rotateX(-PI / 2), litterMat, g, 0, 0.018, 0, { cast: false });
  p.rotation.y = seed * 1.3;
  return { group: g, size: { w: size, d: size } };
}

// 서재 동굴의 옻칠 문갑 (금붓 + 시첩)
export function buildBrushBox(M) {
  const g = new THREE.Group();
  mesh(box(1.5, 0.08, 0.9), M.woodDark, g, 0, 0.6, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.08, 0.6, 0.08), M.woodDark, g, sx * 0.68, 0.3, sz * 0.38);
  const lac = std({ color: 0x5a1410, roughness: 0.2, metalness: 0.1 });
  mesh(box(0.9, 0.22, 0.55), lac, g, 0, 0.75, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.86, -0.275);
  mesh(box(0.92, 0.07, 0.57), lac, lid, 0, 0.035, 0.275);
  mesh(box(0.5, 0.01, 0.3), M.gold, lid, 0, 0.075, 0.275, { cast: false });
  g.add(lid);
  const inner = new THREE.Group();
  mesh(box(0.42, 0.05, 0.3), M.paper, inner, -0.15, 0.88, 0);
  const brush = mesh(cyl(0.018, 0.022, 0.5, 8), M.gold, inner, 0.18, 0.9, 0);
  brush.rotation.z = Q;
  mesh(new THREE.ConeGeometry(0.025, 0.08, 8), M.coal, inner, 0.45, 0.9, 0).rotation.z = -Q;
  inner.visible = false;
  g.add(inner);
  const glow = mesh(new THREE.PlaneGeometry(3.6, 3.6).rotateX(-PI / 2), glowMat('255,200,110', 0.45).clone(), g, 0, 0.02, 0, { cast: false });
  const ag = airGlow(1.6, '255,215,140', 0);
  ag.position.set(0, 1.05, 0);
  g.add(ag);
  return {
    group: g, size: { w: 1.6, d: 1.0 }, glow,
    open(k) {
      lid.rotation.x = -k * 1.8;
      inner.visible = k > 0.25;
      inner.position.y = k * 0.12;
      ag.material.opacity = k * 0.85;
      glow.material.opacity = 0.45 + k * 0.5;
    },
  };
}

// 촛대
export function buildCandle(M, h = 0.9) {
  const g = new THREE.Group();
  mesh(cyl(0.12, 0.15, 0.04, 10), M.brass, g, 0, 0.02, 0);
  mesh(cyl(0.02, 0.025, h, 6), M.brass, g, 0, h / 2, 0);
  mesh(cyl(0.05, 0.05, 0.2, 8), M.paper, g, 0, h + 0.1, 0);
  const flame = mesh(new THREE.ConeGeometry(0.035, 0.12, 8), M.flame, g, 0, h + 0.27, 0, { cast: false });
  const ag = airGlow(0.9, '255,200,120', 0.8);
  ag.position.set(0, h + 0.27, 0);
  g.add(ag);
  return { group: g, size: { w: 0.3, d: 0.3 }, flame };
}

// =====================================================================
// 전우치 · 천둥 치는 밤
// =====================================================================
// 수련터 모래 마당 (가운데 네모 구멍)
export function buildTrainingYard(M, radius, hole, mat) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, PI * 2, false);
  const h = hole / 2, p = new THREE.Path();
  p.moveTo(-h, -h); p.lineTo(-h, h); p.lineTo(h, h); p.lineTo(h, -h); p.lineTo(-h, -h);
  shape.holes.push(p);
  const geo = new THREE.ShapeGeometry(shape, 48).rotateX(-PI / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 5, uv.getY(i) / 5);
  mesh(geo, mat, g, 0, 0.015, 0, { cast: false });
  const r = rand(123);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * PI * 2;
    const s = mesh(box(0.5, 0.12, 0.25), M.granite, g, Math.cos(a) * (radius + 0.1), 0.06, Math.sin(a) * (radius + 0.1));
    s.rotation.y = -a + (r() - 0.5) * 0.1;
  }
  return { group: g };
}

// 부적 붙은 돌기둥
const talismanMats = new Map();
function talismanMat(text) {
  if (!talismanMats.has(text)) talismanMats.set(text, std({ map: talismanTexture(text), roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffd060, emissiveIntensity: 0.12 }));
  return talismanMats.get(text);
}
export function buildStonePillar(M, { talisman = '勅令', h = 2.4, seed = 1 } = {}) {
  const g = new THREE.Group();
  const r = rand(seed * 13);
  const pm = std({ color: 0x5e5c5a, roughness: 0.6, metalness: 0.05, flatShading: true });
  const p = mesh(cyl(0.3, 0.38, h, 7), pm, g, 0, h / 2, 0);
  p.rotation.y = r() * 3;
  mesh(cyl(0.42, 0.42, 0.18, 7), pm, g, 0, h + 0.09, 0);
  mesh(cyl(0.48, 0.5, 0.2, 7), pm, g, 0, 0.1, 0);
  let tal = null;
  if (talisman) {
    tal = new THREE.Group();
    tal.position.set(0, 1.55, 0.37);
    const t = mesh(new THREE.PlaneGeometry(0.3, 0.6, 1, 3), talismanMat(talisman), tal, 0, -0.3, 0, { cast: false });
    void t;
    g.add(tal);
  }
  return { group: g, size: { w: 0.85, d: 0.85 }, tal };
}

// 팔괘 석단 (마지막 퍼즐): 번개가 치면 가운데 판이 떠올라 빙글 돎
function octagonShape(R, hole) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    const x = Math.cos(a) * R, y = Math.sin(a) * R;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  if (hole) {
    const h = hole / 2, p = new THREE.Path();
    p.moveTo(-h, -h); p.lineTo(-h, h); p.lineTo(h, h); p.lineTo(h, -h); p.lineTo(-h, -h);
    s.holes.push(p);
  }
  return s;
}
export function buildPalgwaeAltar(M) {
  const g = new THREE.Group();
  const stone = std({ color: 0x6a6a6e, roughness: 0.45, metalness: 0.05 });
  const topTex = trigramTexture();
  topTex.repeat.set(1 / 4.9, 1 / 4.9);
  topTex.offset.set(0.5, 0.5);
  const topMat = std({ map: topTex, roughness: 0.4, emissive: 0xc8b070, emissiveMap: topTex, emissiveIntensity: 0.1 });
  const t1 = new THREE.ExtrudeGeometry(octagonShape(2.45, 1.7), { depth: 0.26, bevelEnabled: false }).rotateX(-PI / 2);
  mesh(t1, [topMat, stone], g, 0, 0, 0);
  const t2 = new THREE.ExtrudeGeometry(octagonShape(1.55, 1.7), { depth: 0.2, bevelEnabled: false }).rotateX(-PI / 2);
  mesh(t2, stone, g, 0, 0.26, 0);
  const plate = new THREE.Group();
  plate.position.y = 0.46;
  mesh(box(1.9, 0.14, 1.9), stone, plate, 0, 0.07, 0);
  const tg = mesh(new THREE.CircleGeometry(0.72, 40).rotateX(-PI / 2), std({ map: taegukTexture(), roughness: 0.5, emissive: 0x6a4aff, emissiveIntensity: 0 }), plate, 0, 0.145, 0, { cast: false });
  g.add(plate);
  const sockets = dirStones(g, M, 2.85, { mat: stone, rgb: '170,150,255' });
  // 번개 기둥 (하늘에서 석단으로)
  const pts = [];
  const r = rand(4040);
  for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3((r() - 0.5) * (i === 12 ? 0 : 1.2), 18 - i * 1.45, (r() - 0.5) * (i === 12 ? 0 : 1.2)));
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xd8e4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const bolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 60, 0.09, 5), boltMat);
  bolt.visible = false;
  g.add(bolt);
  const flashG = mesh(new THREE.PlaneGeometry(7, 7).rotateX(-PI / 2), glowMat('190,200,255', 1).clone(), g, 0, 0.5, 0, { cast: false });
  flashG.material.opacity = 0;
  let opened = 0;
  return {
    group: g, size: { w: 6.4, d: 6.4 }, sockets, dur: 2.6, flash: true,
    open(k) {
      opened = k;
      bolt.visible = k > 0.02 && k < 0.28;
      boltMat.opacity = bolt.visible ? 1 - k / 0.28 : 0;
      flashG.material.opacity = Math.max(0, 1 - k * 3);
      tg.material.emissiveIntensity = Math.min(1.5, k * 3);
      const t = Math.max(0, (k - 0.2) / 0.8);
      plate.position.y = 0.46 + t * 2.9;
      plate.rotation.y = t * PI * 2;
    },
    anim(time) { if (opened >= 1) { plate.position.y = 3.36 + Math.sin(time * 1.3) * 0.12; plate.rotation.y = time * 0.5; } },
  };
}

// 번개 맞은 고목 (갈라진 틈에 푸른 불꽃)
export function buildStruckTree(M) {
  const g = new THREE.Group();
  const char = std({ color: 0x2c2420, roughness: 1 });
  mesh(cyl(0.42, 0.6, 1.2, 9), char, g, 0, 0.6, 0);
  for (const s of [-1, 1]) {
    const pts = [new THREE.Vector3(s * 0.15, 1.1, 0), new THREE.Vector3(s * 0.45, 2.1, 0.05), new THREE.Vector3(s * 0.85, 2.9, -0.05)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.26, 7), char, g);
    const br = [pts[1], pts[1].clone().add(new THREE.Vector3(s * 0.7, 0.6, 0.3)), pts[1].clone().add(new THREE.Vector3(s * 1.0, 0.75, 0.6))];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(br), 6, 0.07, 5), char, g);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + 0.4;
    const root = mesh(new THREE.CapsuleGeometry(0.12, 0.7, 3, 6), char, g, Math.cos(a) * 0.6, 0.08, Math.sin(a) * 0.6);
    root.rotation.set(Q, 0, -a);
  }
  const ember = mesh(new THREE.PlaneGeometry(0.5, 1.4), new THREE.MeshBasicMaterial({ map: glowTexture('110,180,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }), g, 0, 1.4, 0.2, { cast: false });
  const ag = airGlow(1.8, '110,170,255', 0.55);
  ag.position.set(0, 1.5, 0.2);
  g.add(ag);
  g.add(groundGlow(3.4, '90,150,255', 0.35));
  return { group: g, size: { w: 1.4, d: 1.4 }, ember, air: ag };
}

// 부적 장승 (+ 발치의 자물쇠 함)
export function buildTalismanJangseung(M) {
  const j = buildJangseung(M, '辟邪大將軍', false);
  const g = j.group;
  const tals = [];
  [[0, 2.2, 0.33, 0], [-0.25, 1.6, 0.27, 0.4], [0.27, 1.3, 0.26, -0.35], [0, 0.8, 0.33, 0.1]].forEach(([x, y, z, ry], i) => {
    const t = mesh(new THREE.PlaneGeometry(0.22, 0.46), talismanMat(i % 2 ? '雷' : '勅令'), g, x, y, z, { cast: false });
    t.rotation.y = ry;
    t.rotation.z = (i - 1.5) * 0.12;
    tals.push(t);
  });
  const lock = buildLockBox(M);
  lock.group.position.set(0, 0, 0.75);
  g.add(lock.group);
  return { group: g, size: { w: 0.9, d: 1.6 }, lockbox: lock, tals };
}

// 물웅덩이
let puddleMat = null;
export function buildPuddle(seed = 1, s = 1) {
  if (!puddleMat) puddleMat = std({ color: 0x1a2230, roughness: 0.02, metalness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
  const g = new THREE.Group();
  const r = rand(seed * 71);
  const p = mesh(new THREE.CircleGeometry(0.6 * s, 18).rotateX(-PI / 2), puddleMat, g, 0, 0.012, 0, { cast: false });
  p.scale.set(1 + r(), 1, 0.6 + r() * 0.5);
  p.rotation.y = r() * 3;
  return { group: g, size: { w: 1, d: 1 } };
}

// 풍운선 받침대 (부채가 떠올라 펼쳐짐)
export function buildFanPedestal(M) {
  const g = new THREE.Group();
  const stone = std({ color: 0x4a4258, roughness: 0.5 });
  mesh(new THREE.ExtrudeGeometry(octagonShape(0.85, 0), { depth: 0.4, bevelEnabled: false }).rotateX(-PI / 2), stone, g, 0, 0, 0);
  mesh(cyl(0.35, 0.5, 0.7, 8), stone, g, 0, 0.75, 0);
  mesh(cyl(0.55, 0.4, 0.1, 8), stone, g, 0, 1.15, 0);
  const fan = new THREE.Group();
  fan.position.set(0, 1.75, 0);
  const ribs = [];
  const silk = std({ color: 0xe8d2a0, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x8a5aff, emissiveIntensity: 0.15 });
  const ribMat = std({ color: 0x3a2214, roughness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const rib = new THREE.Group();
    mesh(box(0.025, 0.75, 0.012), ribMat, rib, 0, 0.375, 0);
    const leaf = mesh(new THREE.PlaneGeometry(0.17, 0.45), silk, rib, 0, 0.52, 0.008, { cast: false });
    void leaf;
    fan.add(rib);
    ribs.push(rib);
  }
  mesh(new THREE.SphereGeometry(0.04, 8, 6), M.gold, fan, 0, 0, 0.01);
  fan.rotation.x = -0.25;
  g.add(fan);
  const glow = mesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-PI / 2), glowMat('170,130,255', 0.5).clone(), g, 0, 0.02, 0, { cast: false });
  const ag = airGlow(2.4, '190,160,255', 0.25);
  ag.position.set(0, 1.9, 0);
  g.add(ag);
  let k0 = 0;
  const pose = (k) => {
    k0 = k;
    ribs.forEach((rb, i) => { rb.rotation.z = (i - 4) * (0.04 + k * 0.15); });
    silk.emissiveIntensity = 0.15 + k * 0.8;
    ag.material.opacity = 0.25 + k * 0.7;
    glow.material.opacity = 0.5 + k * 0.5;
  };
  pose(0);
  return {
    group: g, size: { w: 1.8, d: 1.8 }, glow, open: pose,
    anim(t) { fan.position.y = 1.75 + k0 * 0.35 + Math.sin(t * 1.5) * 0.08; fan.rotation.y = Math.sin(t * 0.7) * 0.35; },
  };
}

// =====================================================================
// 선생님의 선물 · 꼬마전구 눈 오는 밤
// =====================================================================
function starShape(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = -Q + (i / 10) * PI * 2;
    const rr = i % 2 ? r : R;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return s;
}
// 나무 꼭대기 별
export function buildStar(size = 0.6) {
  const g = new THREE.Group();
  const mat = std({ color: 0xffd24a, emissive: 0xffb820, emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.4 });
  const geo = new THREE.ExtrudeGeometry(starShape(size, size * 0.45), { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  geo.translate(0, 0, -0.06);
  const m = mesh(geo, mat, g, 0, 0, 0, { cast: false });
  m.rotation.z = PI;
  const ag = airGlow(size * 4, '255,220,120', 0.85);
  g.add(ag);
  return { group: g, mat, glow: ag };
}

// 소나무 아래 별 석판 (마지막 퍼즐)
export function buildStarSlab(M) {
  const g = new THREE.Group();
  holeFrame(g, M.granite, 3.0, 1.7, 0.14);
  const slab = new THREE.Group();
  mesh(box(1.92, 0.14, 1.92), M.granite, slab, 0, 0.21, 0);
  const star = mesh(new THREE.ExtrudeGeometry(starShape(0.85, 0.38), { depth: 0.06, bevelEnabled: false }).rotateX(-PI / 2), std({ color: 0xffd24a, emissive: 0xffa820, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.5 }), slab, 0, 0.28, 0, { cast: false });
  g.add(slab);
  const sockets = dirStones(g, M, 2.05, { rgb: '255,220,120' });
  return {
    group: g, size: { w: 4.6, d: 4.6 }, sockets, dur: 2.4, star,
    open(k) {
      star.material.emissiveIntensity = 0.6 + Math.sin(Math.min(1, k * 1.5) * PI) * 3;
      const t = Math.max(0, (k - 0.3) / 0.7);
      slab.position.set(t * 1.6, Math.sin(t * PI) * 0.45, t * 1.6);
      slab.rotation.y = t * 0.6;
    },
  };
}

// 선물 썰매
export function buildSled(M) {
  const g = new THREE.Group();
  const red = std({ color: 0xb02a22, roughness: 0.5 });
  for (const sx of [-0.55, 0.55]) {
    const pts = [new THREE.Vector3(sx, 0.06, -1.0), new THREE.Vector3(sx, 0.05, 0.6), new THREE.Vector3(sx, 0.3, 1.05), new THREE.Vector3(sx, 0.55, 0.9)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.04, 6), M.gold, g);
    for (const z of [-0.6, 0.3]) mesh(box(0.05, 0.3, 0.05), M.woodDark, g, sx, 0.2, z);
  }
  mesh(box(1.3, 0.1, 1.7), red, g, 0, 0.38, -0.1);
  mesh(box(1.3, 0.35, 0.08), red, g, 0, 0.55, -0.95);
  const b1 = buildGiftBox(M, { w: 0.6, h: 0.5, d: 0.55, color: 0x2a7a4a, ribbon: 0xf2d24a });
  b1.group.position.set(-0.3, 0.43, -0.45);
  g.add(b1.group);
  const b2 = buildGiftBox(M, { w: 0.42, h: 0.4, d: 0.42, color: 0x2a4ab0, ribbon: 0xf2f2f2 });
  b2.group.position.set(-0.3, 0.98, -0.45);
  b2.group.rotation.y = 0.4;
  g.add(b2.group);
  const b3 = buildGiftBox(M, { w: 0.55, h: 0.45, d: 0.5, color: 0xc8402e, ribbon: 0xf2d24a });
  b3.group.position.set(0.33, 0.43, 0.25);
  g.add(b3.group);
  return { group: g, size: { w: 1.5, d: 2.2 }, lid: b3.lid };
}

// 커다란 선물 상자 (보물)
export function buildBigGift(M) {
  const g = new THREE.Group();
  mesh(cyl(1.0, 1.1, 0.3, 24), std({ color: 0xf2ead6, roughness: 0.7 }), g, 0, 0.15, 0);
  const b = buildGiftBox(M, { w: 1.2, h: 0.95, d: 1.2, color: 0xc8302a, ribbon: 0xf6d24a });
  b.group.position.y = 0.3;
  g.add(b.group);
  const glow = mesh(new THREE.PlaneGeometry(4.4, 4.4).rotateX(-PI / 2), glowMat('255,210,140', 0.5).clone(), g, 0, 0.02, 0, { cast: false });
  const ag = airGlow(2.4, '255,230,160', 0);
  ag.position.set(0, 1.4, 0);
  g.add(ag);
  return {
    group: g, size: { w: 2.2, d: 2.2 }, glow,
    open(k) {
      b.lid.position.y = 0.95 + Math.sin(Math.min(1, k) * Q) * 0.9;
      b.lid.position.x = k * 0.6;
      b.lid.rotation.z = -k * 0.7;
      ag.material.opacity = k * 0.9;
      glow.material.opacity = 0.5 + k * 0.5;
    },
  };
}

// 도술 동굴 바닥의 빛나는 팔괘 원
export function runeTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = 'rgba(190,160,255,0.95)';
    for (const [r, lw] of [[230, 6], [200, 3], [120, 4]]) { ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    const TRI = ['111', '011', '101', '001', '110', '010', '100', '000'];
    ctx.fillStyle = 'rgba(210,190,255,0.95)';
    TRI.forEach((t, i) => {
      ctx.save();
      ctx.rotate((i / 8) * Math.PI * 2);
      for (let k = 0; k < 3; k++) {
        const y = -185 + k * 18;
        if (t[k] === '1') ctx.fillRect(-36, y, 72, 10);
        else { ctx.fillRect(-36, y, 30, 10); ctx.fillRect(6, y, 30, 10); }
      }
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.stroke();
  });
}
// 떠다니는 부적 한 장
export function floatingTalisman(i) {
  return mesh(new THREE.PlaneGeometry(0.28, 0.56), talismanMat(i % 2 ? '雷' : '勅令'), null, 0, 0, 0, { cast: false });
}
