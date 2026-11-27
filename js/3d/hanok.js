// 한옥마을 3D 소품 (집, 기와지붕, 돌담, 나무, 장독대, 우물, 장승, 정자, 실내 가구 등)
// 모든 함수는 바닥 중앙(0,0,0)을 기준으로 만들고 { group, size:{w,d} } 를 돌려줍니다.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  roofTileTexture, thatchTexture, plasterTexture, latticeTexture, woodTexture, floorBoardTexture, jangpanTexture,
  stoneWallTexture, graniteTexture, waterTexture, textBoardTexture, jangseungTexture, dancheongTexture,
  yutBoardTexture, plantPanelTexture, najeonTexture, glowTexture, rand,
  snowTexture, snowyRoofTexture, iceTexture, slateTexture,
} from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);

export function createMaterials() {
  const rep = (t, x, y) => { t.repeat.set(x, y); return t; };
  return {
    wood: std({ map: woodTexture('#6e4527', 81), roughness: 0.7 }),
    woodDark: std({ map: woodTexture('#4a2d18', 82), roughness: 0.7 }),
    woodLight: std({ map: woodTexture('#9a6d43', 83), roughness: 0.6 }),
    board: std({ map: floorBoardTexture(), roughness: 0.55 }),
    plaster: std({ map: plasterTexture(), roughness: 0.95 }),
    granite: std({ map: graniteTexture(), roughness: 0.9 }),
    stoneWall: std({ map: stoneWallTexture(), roughness: 1 }),
    tile: std({ map: rep(snowyRoofTexture(), 1, 1), roughness: 0.65, metalness: 0.05, side: THREE.FrontSide, shadowSide: THREE.DoubleSide }),
    tileDark: std({ color: 0xe9eef5, roughness: 0.85 }),
    snow: std({ color: 0xf3f6fb, roughness: 0.9 }),
    ice: std({ color: 0xd8eef8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }),
    iceSurface: std({ map: iceTexture(), roughness: 0.12, metalness: 0.15 }),
    coal: std({ color: 0x1a1a1c, roughness: 0.6 }),
    carrot: std({ color: 0xe0701e, roughness: 0.6 }),
    under: std({ color: 0x5a3a22, roughness: 0.9, side: THREE.BackSide }),
    thatch: std({ map: snowTexture(), roughness: 1, side: THREE.FrontSide, shadowSide: THREE.DoubleSide }),
    thatchUnder: std({ color: 0x6b5330, roughness: 1, side: THREE.BackSide }),
    door: std({ map: latticeTexture(), roughness: 0.85, emissive: 0xffc070, emissiveIntensity: 0 }),
    window: std({ map: latticeTexture({ kind: 'grid' }), roughness: 0.85 }),
    dancheong: std({ map: dancheongTexture(), roughness: 0.7 }),
    jangpan: std({ map: jangpanTexture(), roughness: 0.4 }),
    jar: std({ color: 0x4a2a16, roughness: 0.28, metalness: 0.05 }),
    jarLid: std({ color: 0x3c2414, roughness: 0.35 }),
    pine: std({ color: 0x2c4a2c, roughness: 0.85, flatShading: true }),
    pineLight: std({ color: 0x3d6236, roughness: 0.85, flatShading: true }),
    bush: std({ color: 0x3f6a32, roughness: 0.9, flatShading: true }),
    bushLight: std({ color: 0x5b8a3c, roughness: 0.9, flatShading: true }),
    leaf: std({ color: 0x4f7a34, roughness: 0.85, flatShading: true }),
    trunk: std({ color: 0x5a4030, roughness: 1 }),
    pineTrunk: std({ color: 0x7a4a32, roughness: 1 }),
    persimmon: std({ color: 0xe8741e, roughness: 0.45, emissive: 0x401800, emissiveIntensity: 0.3 }),
    water: std({ map: waterTexture(), roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.9 }),
    lotus: std({ color: 0x4d7d3a, roughness: 0.7, side: THREE.DoubleSide }),
    lotusFlower: std({ color: 0xf2a7b8, roughness: 0.6, emissive: 0x401020, emissiveIntensity: 0.2 }),
    red: std({ color: 0x9c2a1f, roughness: 0.6 }),
    blue: std({ color: 0x23466e, roughness: 0.6 }),
    green: std({ color: 0x2f6e5a, roughness: 0.6 }),
    gold: std({ color: 0xd4a548, metalness: 1, roughness: 0.3 }),
    brass: std({ color: 0xb8893a, metalness: 0.9, roughness: 0.4 }),
    iron: std({ color: 0x2a2624, metalness: 0.6, roughness: 0.5 }),
    rope: std({ color: 0xb59a6a, roughness: 1 }),
    paper: std({ color: 0xf3ead2, roughness: 0.9 }),
    cloth: std({ color: 0x9a3a3a, roughness: 0.9 }),
    cushion: std({ color: 0x8a2a3a, roughness: 0.9 }),
    cushionBlue: std({ color: 0x2a4a7a, roughness: 0.9 }),
    flame: std({ color: 0xffd27a, emissive: 0xffa53a, emissiveIntensity: 3 }),
    lanternRed: std({ color: 0xc8402e, emissive: 0xff6a3a, emissiveIntensity: 1.2, roughness: 0.7 }),
    lanternBlue: std({ color: 0x2f4f8f, emissive: 0x3a5aff, emissiveIntensity: 0.5, roughness: 0.7 }),
    najeon: std({ map: najeonTexture(), roughness: 0.25, metalness: 0.2 }),
    soil: std({ color: 0x5a4632, roughness: 1 }),
    dark: std({ color: 0x0c0907, roughness: 1 }),
    glow: new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }),
  };
}

export function mesh(geo, mat, parent, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (parent) parent.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);

// =====================================================================
// 기와 지붕 (우진각 + 처마 끝이 살짝 들린 곡선)
// =====================================================================
export function buildRoof(M, W, D, H, { kind = 'tile', lift = 0.45, profile = 1.55 } = {}) {
  const g = new THREE.Group();
  const thatch = kind === 'thatch';
  const prof = thatch ? 0.6 : profile;
  const lft = thatch ? 0 : lift;
  const half = Math.min(W, D) / 2;
  const heightAt = (x, z) => {
    const ex = W / 2 - Math.abs(x), ez = D / 2 - Math.abs(z);
    const t = Math.max(0, Math.min(1, Math.min(ex, ez) / half));
    const ax = Math.min(1, Math.abs(x) / (W / 2)), az = Math.min(1, Math.abs(z) / (D / 2));
    return H * Math.pow(t, prof) + lft * Math.pow(ax * az, 3);
  };
  const nx = Math.ceil(W / 0.22), nz = Math.ceil(D / 0.22);
  const geo = new THREE.PlaneGeometry(W, D, nx, nz);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const k = thatch ? 0.5 : 0.9;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    const ex = W / 2 - Math.abs(x), ez = D / 2 - Math.abs(z);
    if (ez <= ex) uv.setXY(i, x * k, ez * k * 1.4);
    else uv.setXY(i, z * k, ex * k * 1.4);
  }
  geo.computeVertexNormals();
  const top = mesh(geo, thatch ? M.thatch : M.tile, g);
  const bottom = mesh(geo, thatch ? M.thatchUnder : M.under, g, 0, -0.06, 0, { cast: false });
  bottom.userData.under = true;

  // 마루 (용마루 + 추녀마루)
  const ridgeR = thatch ? 0.16 : 0.1;
  const ridgeMat = thatch ? M.thatch : M.tileDark;
  const long = W >= D;
  const rl = Math.abs(W - D) / 2;
  const ridgeA = long ? new THREE.Vector3(-rl, H, 0) : new THREE.Vector3(0, H, -rl);
  const ridgeB = long ? new THREE.Vector3(rl, H, 0) : new THREE.Vector3(0, H, rl);
  if (rl > 0.05) {
    const pts = [];
    const ext = thatch ? 0 : 0.35;
    const dir = ridgeB.clone().sub(ridgeA).normalize();
    pts.push(ridgeA.clone().addScaledVector(dir, -ext).add(new THREE.Vector3(0, thatch ? 0 : 0.28, 0)));
    for (let s = 0; s <= 6; s++) pts.push(ridgeA.clone().lerp(ridgeB, s / 6).add(new THREE.Vector3(0, 0.05, 0)));
    pts.push(ridgeB.clone().addScaledVector(dir, ext).add(new THREE.Vector3(0, thatch ? 0 : 0.28, 0)));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, ridgeR * 1.4, 8), ridgeMat, g);
  }
  if (!thatch) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const start = long ? new THREE.Vector3(sx * rl, H, 0) : new THREE.Vector3(0, H, sz * rl);
        const end = new THREE.Vector3(sx * W / 2, 0, sz * D / 2);
        const pts = [];
        for (let s = 0; s <= 10; s++) {
          const p = start.clone().lerp(end, s / 10);
          p.y = heightAt(p.x * 0.999, p.z * 0.999) + 0.06;
          pts.push(p);
        }
        pts[pts.length - 1].y += 0.12;
        mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, ridgeR, 6), ridgeMat, g);
      }
    }
  }
  return { group: g, heightAt };
}

// =====================================================================
// 한옥 한 채
// =====================================================================
// bays: 정면 칸 수, bayW: 칸 너비, depth: 깊이. 문은 정면(+z) 가운데 칸.
export function buildHanok(M, {
  bays = 3, bayW = 2.2, depth = 4.2, wallH = 2.5, base = 0.55, roof = 'tile', roofH = 2.1, overhang = 1.05, sign = null, doorTint = null,
} = {}) {
  const g = new THREE.Group();
  const W = bays * bayW;
  const D = depth;
  const baseW = W + 1.4, baseD = D + 1.6;
  // 기단
  mesh(box(baseW, base, baseD), M.granite, g, 0, base / 2, 0);
  mesh(box(baseW + 0.08, 0.06, baseD + 0.08), M.granite, g, 0, base - 0.03, 0);
  // 섬돌 (계단)
  mesh(box(1.6, base * 0.5, 0.5), M.granite, g, 0, base * 0.25, baseD / 2 + 0.25);
  // 마루 바닥
  const floorY = base + 0.32;
  mesh(box(W + 0.2, 0.32, D + 0.2), M.woodDark, g, 0, base + 0.16, 0);
  const maru = mesh(box(W + 0.2, 0.08, 0.9), M.board, g, 0, floorY - 0.04, D / 2 + 0.3);
  maru.receiveShadow = true;

  // 기둥 + 주춧돌
  const colH = wallH;
  const colPts = [];
  for (let i = 0; i <= bays; i++) {
    const x = -W / 2 + i * bayW;
    colPts.push([x, -D / 2], [x, D / 2]);
  }
  const sideCols = Math.max(1, Math.round(D / 2.1));
  for (let j = 1; j < sideCols; j++) {
    const z = -D / 2 + (j * D) / sideCols;
    colPts.push([-W / 2, z], [W / 2, z]);
  }
  for (const [x, z] of colPts) {
    mesh(cyl(0.13, 0.14, colH, 12), M.wood, g, x, floorY + colH / 2, z);
    mesh(box(0.42, 0.14, 0.42), M.granite, g, x, floorY + 0.02, z);
  }
  // 앞쪽 툇기둥
  for (let i = 0; i <= bays; i++) {
    const x = -W / 2 + i * bayW;
    mesh(cyl(0.11, 0.12, colH, 12), M.wood, g, x, floorY + colH / 2, D / 2 + 0.7);
  }
  // 보·도리
  const topY = floorY + colH;
  mesh(box(W + 0.4, 0.24, 0.22), M.wood, g, 0, topY, -D / 2);
  mesh(box(W + 0.4, 0.24, 0.22), M.wood, g, 0, topY, D / 2);
  mesh(box(W + 0.4, 0.24, 0.22), M.wood, g, 0, topY, D / 2 + 0.7);
  mesh(box(0.22, 0.24, D + 0.9), M.wood, g, -W / 2, topY, 0.35);
  mesh(box(0.22, 0.24, D + 0.9), M.wood, g, W / 2, topY, 0.35);
  // 단청 띠
  mesh(box(W + 0.42, 0.14, 0.02), M.dancheong, g, 0, topY - 0.2, D / 2 + 0.82, { cast: false });

  // 벽 (뒤·옆: 회벽 + 아래 나무 판)
  const wallT = 0.12;
  const lowH = 0.55;
  const panel = (w, h, x, y, z, rotY, mat) => {
    const m = mesh(box(w, h, wallT), mat, g, x, y, z);
    m.rotation.y = rotY;
    return m;
  };
  const wallMidY = floorY + lowH + (colH - lowH) / 2;
  panel(W, colH - lowH - 0.1, 0, wallMidY - 0.05, -D / 2, 0, M.plaster);
  panel(W, lowH, 0, floorY + lowH / 2, -D / 2, 0, M.woodLight);
  for (const sx of [-1, 1]) {
    panel(D, colH - lowH - 0.1, sx * W / 2, wallMidY - 0.05, 0, Math.PI / 2, M.plaster);
    panel(D, lowH, sx * W / 2, floorY + lowH / 2, 0, Math.PI / 2, M.woodLight);
    // 옆벽 작은 창
    const win = mesh(new THREE.PlaneGeometry(0.9, 0.7), M.window, g, sx * (W / 2 + wallT / 2 + 0.005), floorY + 1.5, 0, { cast: false });
    win.rotation.y = sx * Math.PI / 2;
  }
  // 뒷벽 창
  for (let i = 0; i < bays; i++) {
    const x = -W / 2 + (i + 0.5) * bayW;
    const win = mesh(new THREE.PlaneGeometry(0.9, 0.7), M.window, g, x, floorY + 1.5, -D / 2 - wallT / 2 - 0.005, { cast: false });
    win.rotation.y = Math.PI;
  }
  // 정면: 가운데 칸 = 문, 나머지 = 창호 + 머름
  const doorMat = M.door.clone();
  if (doorTint) doorMat.color = new THREE.Color(doorTint);
  const doorMeshes = [];
  const mid = Math.floor(bays / 2);
  for (let i = 0; i < bays; i++) {
    const x = -W / 2 + (i + 0.5) * bayW;
    const z = D / 2;
    if (i === mid) {
      const dh = colH - 0.35;
      for (const s of [-1, 1]) {
        const leaf = mesh(new THREE.BoxGeometry(bayW / 2 - 0.1, dh, 0.06), doorMat, g, x + s * (bayW / 4 - 0.02), floorY + dh / 2 + 0.05, z);
        doorMeshes.push(leaf);
      }
      mesh(box(bayW, 0.35, wallT), M.plaster, g, x, floorY + colH - 0.17, z);
      // 문고리
      for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), M.brass, g, x + s * 0.12, floorY + 1.1, z + 0.05);
    } else {
      mesh(box(bayW - 0.2, 0.75, wallT), M.woodLight, g, x, floorY + 0.375, z);
      mesh(new THREE.BoxGeometry(bayW - 0.24, colH - 1.15, 0.05), M.window, g, x, floorY + 0.75 + (colH - 1.15) / 2, z);
      mesh(box(bayW - 0.2, 0.4, wallT), M.plaster, g, x, floorY + colH - 0.2, z);
    }
  }

  // 지붕
  const roofW = W + overhang * 2, roofD = D + 0.7 + overhang * 2;
  const r = buildRoof(M, roofW, roofD, roofH, { kind: roof });
  r.group.position.set(0, topY + 0.12, 0.35);
  g.add(r.group);

  // 처마 고드름 (정면)
  const ice = [];
  const rr = rand(Math.round(W * 13));
  for (let x = -roofW / 2 + 0.5; x < roofW / 2 - 0.5; x += 0.32 + rr() * 0.3) {
    const len = 0.15 + rr() * 0.45;
    const ez = roofD / 2 - 0.08;
    const y = topY + 0.12 + r.heightAt(x, ez) - 0.04;
    const c = mesh(new THREE.ConeGeometry(0.035, len, 5), M.ice, g, x, y - len / 2, 0.35 + ez, { cast: false });
    c.rotation.x = Math.PI;
    ice.push(c);
  }

  // 현판
  let signMesh = null;
  if (sign) {
    const tex = textBoardTexture(sign, { w: 512, h: 160, size: 84 });
    signMesh = mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), g, 0, topY - 0.12, D / 2 + 0.83, { cast: false });
  }

  const totalH = topY + 0.12 + roofH;
  return {
    group: g,
    size: { w: baseW, d: baseD + 0.5 },
    doorMeshes,
    doorMat,
    signMesh,
    front: { x: 0, z: baseD / 2 + 0.95 },
    height: totalH,
    footprint: { w: roofW, d: roofD, cz: 0.35 },
  };
}

// =====================================================================
// 담장 / 대문
// =====================================================================
export function buildStoneWall(M, len, { h = 1.35, t = 0.55, cap = true } = {}) {
  const g = new THREE.Group();
  const wallMat = M.stoneWall.clone();
  wallMat.map = M.stoneWall.map.clone();
  wallMat.map.needsUpdate = true;
  wallMat.map.wrapS = wallMat.map.wrapT = THREE.RepeatWrapping;
  wallMat.map.repeat.set(len / 2.4, 1);
  mesh(box(len, h, t), wallMat, g, 0, h / 2, 0);
  if (cap) {
    // 기와 얹은 담 (지붕 모양 단면)
    const shape = new THREE.Shape();
    shape.moveTo(-t / 2 - 0.22, 0);
    shape.lineTo(0, 0.32);
    shape.lineTo(t / 2 + 0.22, 0);
    shape.lineTo(-t / 2 - 0.22, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: len + 0.2, bevelEnabled: false });
    geo.translate(0, 0, -(len + 0.2) / 2);
    geo.rotateY(Math.PI / 2);
    mesh(geo, M.tileDark, g, 0, h, 0);
  }
  return { group: g, size: { w: len, d: t } };
}

// 솟을대문 (마을 입구 · 지나갈 수 있음)
export function buildGate(M, width = 3.2) {
  const g = new THREE.Group();
  const H = 3.2;
  for (const s of [-1, 1]) {
    mesh(cyl(0.16, 0.17, H, 12), M.wood, g, s * width / 2, H / 2, 0);
    mesh(box(0.5, 0.2, 0.5), M.granite, g, s * width / 2, 0.1, 0);
    // 열린 대문짝
    const leaf = mesh(box(width / 2 - 0.15, H - 0.6, 0.08), M.woodLight, g, 0, 0, 0);
    leaf.position.set(s * (width / 2 - 0.1), (H - 0.6) / 2 + 0.15, -(width / 4));
    leaf.rotation.y = s * Math.PI / 2;
    leaf.position.x = s * (width / 2 - 0.05);
    leaf.position.z = -(width / 2 - 0.15) / 2 - 0.05;
  }
  mesh(box(width + 0.6, 0.28, 0.3), M.wood, g, 0, H, 0);
  const r = buildRoof(M, width + 1.8, 2.0, 1.0, { lift: 0.25 });
  r.group.position.set(0, H + 0.12, 0);
  g.add(r.group);
  // 홍살 장식
  mesh(box(width, 0.06, 0.06), M.red, g, 0, H - 0.4, 0.1);
  return { group: g, size: { w: width + 0.6, d: 0.5 }, posts: [[-width / 2, 0], [width / 2, 0]] };
}

// =====================================================================
// 나무 / 풀숲
// =====================================================================
export function buildPine(M, scale = 1, seed = 1) {
  const g = new THREE.Group();
  const r = rand(seed * 977 + 3);
  const lean = (r() - 0.5) * 0.25;
  const h = 3.2 * scale;
  const pts = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    pts.push(new THREE.Vector3(Math.sin(t * 2.4 + seed) * 0.25 * scale + lean * t * h, t * h, Math.cos(t * 1.7 + seed) * 0.15 * scale));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.16 * scale, 7), M.pineTrunk, g);
  const top = pts[pts.length - 1];
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const t = 0.55 + (i / layers) * 0.5;
    const p = new THREE.CatmullRomCurve3(pts).getPoint(Math.min(1, t));
    const rad = (1.6 - i * 0.28) * scale;
    const cx = p.x + (r() - 0.5) * 0.6 * scale, cz = p.z + (r() - 0.5) * 0.6 * scale;
    const cloud = mesh(new THREE.IcosahedronGeometry(rad, 1), i % 2 ? M.pineLight : M.pine, g, cx, p.y + 0.2, cz);
    cloud.scale.set(1.25, 0.42, 1.05);
    const cap = mesh(new THREE.IcosahedronGeometry(rad * 0.92, 1), M.snow, g, cx, p.y + 0.2 + rad * 0.2, cz);
    cap.scale.set(1.18, 0.26, 0.98);
  }
  void top;
  return { group: g, size: { w: 0.5 * scale, d: 0.5 * scale } };
}

export function buildPersimmonTree(M, scale = 1) {
  // 잎이 진 겨울 감나무 (까치밥 몇 개만 남음)
  const g = new THREE.Group();
  const h = 2.2 * scale;
  mesh(cyl(0.13 * scale, 0.2 * scale, h, 8), M.trunk, g, 0, h / 2, 0);
  const r = rand(77);
  const fruits = [];
  const fgeo = new THREE.SphereGeometry(0.11 * scale, 10, 8);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.5;
    const len = (1.2 + r() * 0.8) * scale;
    const start = new THREE.Vector3(0, h * (0.75 + r() * 0.2), 0);
    const mid = start.clone().add(new THREE.Vector3(Math.cos(a) * len * 0.5, len * 0.45, Math.sin(a) * len * 0.5));
    const end = start.clone().add(new THREE.Vector3(Math.cos(a) * len, len * 0.8, Math.sin(a) * len));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, mid, end]), 8, 0.05 * scale, 5), M.trunk, g);
    // 잔가지
    const tw = end.clone().add(new THREE.Vector3(Math.cos(a + 0.8) * 0.4 * scale, 0.35 * scale, Math.sin(a + 0.8) * 0.4 * scale));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([mid, mid.clone().lerp(tw, 0.5), tw]), 6, 0.025 * scale, 4), M.trunk, g);
    // 가지 위 눈
    const sn = mesh(new THREE.CapsuleGeometry(0.05 * scale, len * 0.5, 3, 6), M.snow, g, mid.x, mid.y + 0.06, mid.z);
    sn.lookAt(end.x, end.y + 0.06, end.z);
    sn.rotateX(Math.PI / 2);
    if (i % 2 === 0 || i === 3) fruits.push(mesh(fgeo, M.persimmon, g, end.x, end.y - 0.12, end.z));
  }
  return { group: g, size: { w: 0.6 * scale, d: 0.6 * scale }, fruits };
}

export function buildBush(M, seed = 1, scale = 1) {
  const g = new THREE.Group();
  const inner = new THREE.Group(); // 흔들림용
  g.add(inner);
  const r = rand(seed * 131 + 9);
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r();
    const rr = (0.25 + r() * 0.35) * scale;
    const s = (0.45 + r() * 0.3) * scale;
    const b = mesh(new THREE.IcosahedronGeometry(s, 1), r() > 0.45 ? M.bush : M.bushLight, inner, Math.cos(a) * rr, s * 0.8, Math.sin(a) * rr);
    b.scale.y = 0.85;
  }
  mesh(new THREE.IcosahedronGeometry(0.55 * scale, 1), M.bush, inner, 0, 0.7 * scale, 0);
  const cap = mesh(new THREE.IcosahedronGeometry(0.75 * scale, 1), M.snow, inner, 0, 0.95 * scale, 0);
  cap.scale.set(1.15, 0.45, 1.15);
  return { group: g, inner, size: { w: 1.3 * scale, d: 1.3 * scale } };
}

// =====================================================================
// 마을 소품
// =====================================================================
function onggiGeometry(h, r) {
  const pts = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bulge = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 0.95 + 0.25;
    pts.push(new THREE.Vector2(Math.max(0.05, r * (t < 0.92 ? bulge * (0.75 + 0.25 * t) : 0.55)), t * h));
  }
  return new THREE.LatheGeometry(pts, 20);
}

export function buildJangdokdae(M, count = 5) {
  const g = new THREE.Group();
  const W = 3.4, D = 1.9;
  mesh(box(W, 0.3, D), M.granite, g, 0, 0.15, 0);
  const jars = [];
  const spec = [[-1.15, -0.4, 1.0], [-0.1, -0.45, 1.15], [1.05, -0.4, 0.95], [-0.65, 0.45, 0.75], [0.55, 0.45, 0.7]].slice(0, count);
  spec.forEach(([x, z, s], i) => {
    const jg = new THREE.Group();
    jg.position.set(x, 0.3, z);
    mesh(onggiGeometry(0.95 * s, 0.42 * s), M.jar, jg);
    const lid = mesh(cyl(0.3 * s, 0.32 * s, 0.07, 18), M.jarLid, jg, 0, 0.95 * s, 0);
    mesh(new THREE.SphereGeometry(0.06 * s, 8, 6), M.jarLid, lid, 0, 0.05, 0);
    const sn = mesh(new THREE.SphereGeometry(0.3 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.snow, lid, 0, 0.03, 0);
    sn.scale.y = 0.35;
    g.add(jg);
    jars.push({ group: jg, lid, index: i });
  });
  return { group: g, size: { w: W, d: D }, jars };
}

export function buildWell(M) {
  const g = new THREE.Group();
  const ring = new THREE.LatheGeometry([new THREE.Vector2(0.62, 0), new THREE.Vector2(0.75, 0), new THREE.Vector2(0.75, 0.75), new THREE.Vector2(0.62, 0.75)], 24);
  mesh(ring, M.granite, g);
  mesh(new THREE.CircleGeometry(0.62, 24).rotateX(-Math.PI / 2), M.dark, g, 0, 0.4, 0);
  for (const s of [-1, 1]) mesh(box(0.14, 2.0, 0.14), M.wood, g, s * 0.82, 1.0, 0);
  mesh(cyl(0.08, 0.08, 1.8, 10).rotateZ(Math.PI / 2), M.woodLight, g, 0, 1.7, 0);
  const r = buildRoof(M, 2.2, 1.4, 0.55, { lift: 0.15 });
  r.group.position.set(0, 2.0, 0);
  g.add(r.group);
  const rope = mesh(cyl(0.015, 0.015, 0.9, 5), M.rope, g, 0, 1.25, 0);
  const bucket = new THREE.Group();
  bucket.position.set(0, 0.85, 0);
  mesh(cyl(0.16, 0.13, 0.26, 12), M.woodLight, bucket);
  mesh(new THREE.TorusGeometry(0.15, 0.012, 5, 16).rotateX(Math.PI / 2), M.iron, bucket, 0, 0.1, 0);
  g.add(bucket);
  return { group: g, size: { w: 1.7, d: 1.6 }, bucket, rope };
}

export function buildJangseung(M, title, female) {
  const g = new THREE.Group();
  const tex = jangseungTexture(title, female);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const body = mesh(cyl(0.28, 0.32, 3.0, 14), mat, g, 0, 1.5, 0);
  body.rotation.y = Math.PI; // 얼굴(텍스처 가운데)이 +z 를 보도록
  mesh(cyl(0.34, 0.3, 0.32, 14), female ? M.blue : M.iron, g, 0, 3.05, 0);
  mesh(cyl(0.4, 0.4, 0.15, 14), M.granite, g, 0, 0.07, 0);
  return { group: g, size: { w: 0.8, d: 0.8 } };
}

export function buildSotdae(M) {
  const g = new THREE.Group();
  mesh(cyl(0.05, 0.07, 4.2, 8), M.woodLight, g, 0, 2.1, 0);
  const bird = new THREE.Group();
  bird.position.set(0, 4.25, 0);
  const b = mesh(new THREE.CapsuleGeometry(0.08, 0.32, 4, 8), M.woodLight, bird);
  b.rotation.z = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.08, 8, 6), M.woodLight, bird, 0.24, 0.07, 0);
  mesh(new THREE.ConeGeometry(0.03, 0.12, 6).rotateZ(-Math.PI / 2), M.woodDark, bird, 0.35, 0.07, 0);
  g.add(bird);
  return { group: g, size: { w: 0.3, d: 0.3 } };
}

// 정자 (현판에 단서)
export function buildPavilion(M, lines) {
  const g = new THREE.Group();
  const S = 3.4;
  mesh(box(S + 0.6, 0.5, S + 0.6), M.granite, g, 0, 0.25, 0);
  mesh(box(S, 0.12, S), M.board, g, 0, 0.56, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(cyl(0.12, 0.13, 2.6, 12), M.red, g, sx * S / 2, 0.6 + 1.3, sz * S / 2);
  // 난간
  for (const [x, z, ry] of [[0, -S / 2, 0], [-S / 2, 0, Math.PI / 2], [S / 2, 0, Math.PI / 2]]) {
    const rail = mesh(box(S, 0.08, 0.08), M.red, g, x, 1.05, z);
    rail.rotation.y = ry;
  }
  mesh(box(S + 0.3, 0.22, 0.22), M.wood, g, 0, 3.2, S / 2);
  mesh(box(S + 0.3, 0.22, 0.22), M.wood, g, 0, 3.2, -S / 2);
  mesh(box(0.22, 0.22, S + 0.3), M.wood, g, S / 2, 3.2, 0);
  mesh(box(0.22, 0.22, S + 0.3), M.wood, g, -S / 2, 3.2, 0);
  const r = buildRoof(M, S + 2.2, S + 2.2, 1.7, { lift: 0.5 });
  r.group.position.set(0, 3.3, 0);
  g.add(r.group);
  const tex = textBoardTexture(lines, { w: 512, h: 160, size: 80 });
  const sign = mesh(new THREE.PlaneGeometry(1.4, 0.44), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), g, 0, 2.92, S / 2 + 0.12, { cast: false });
  return { group: g, size: { w: S + 0.6, d: S + 0.6 }, sign };
}

export function buildPond(M, w, d) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const n = 28;
  const r = rand(301);
  const radii = [];
  for (let i = 0; i < n; i++) radii.push(0.88 + r() * 0.12);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = radii[i % n];
    const x = Math.cos(a) * (w / 2) * k, y = Math.sin(a) * (d / 2) * k;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const water = mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), M.iceSurface, g, 0, 0.04, 0, { cast: false });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = radii[i] * 1.02;
    const s = 0.22 + r() * 0.22;
    const rock = mesh(new THREE.DodecahedronGeometry(s, 0), M.granite, g, Math.cos(a) * (w / 2) * k, s * 0.4, Math.sin(a) * (d / 2) * k);
    rock.rotation.set(r() * 3, r() * 3, r() * 3);
    rock.scale.y = 0.6;
    const sc = mesh(new THREE.SphereGeometry(s * 0.8, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.snow, g, rock.position.x, s * 0.55, rock.position.z);
    sc.scale.y = 0.35;
  }
  // 얼음 위 눈 얼룩
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2, rr = r() * 0.6;
    const p = mesh(new THREE.CircleGeometry(0.3 + r() * 0.5, 14).rotateX(-Math.PI / 2), M.snow, g, Math.cos(a) * (w / 2) * rr, 0.05, Math.sin(a) * (d / 2) * rr, { cast: false });
    p.scale.x = 1.4;
  }
  return { group: g, size: { w: w * 0.92, d: d * 0.92 }, water };
}

// 평상 + 윷판
export function buildPyeongsang(M) {
  const g = new THREE.Group();
  const W = 2.2, D = 1.6, H = 0.5;
  mesh(box(W, 0.1, D), M.board, g, 0, H, 0);
  mesh(box(W, 0.06, D), M.snow, g, 0.35, H + 0.08, 0.1).scale.x = 0.55;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.12, H, 0.12), M.woodDark, g, sx * (W / 2 - 0.1), H / 2, sz * (D / 2 - 0.1));
  const mat = mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: yutBoardTexture(), roughness: 0.9 }), g, -0.3, H + 0.056, 0, { cast: false });
  const sticks = [];
  for (let i = 0; i < 4; i++) {
    const s = mesh(new THREE.CapsuleGeometry(0.035, 0.3, 4, 8), M.woodLight, g, 0.55 + (i - 1.5) * 0.12, H + 0.09, 0.15 - i * 0.05);
    s.rotation.z = Math.PI / 2;
    s.rotation.y = 0.3 + i * 0.4;
    sticks.push(s);
  }
  return { group: g, size: { w: W, d: D }, mat, sticks };
}

// 빨랫줄 (오방색 천)
export function buildClothesline(M, colors) {
  const g = new THREE.Group();
  const L = 4.6;
  for (const s of [-1, 1]) {
    mesh(cyl(0.05, 0.06, 2.1, 8), M.woodLight, g, s * L / 2, 1.05, 0);
  }
  mesh(cyl(0.012, 0.012, L, 4).rotateZ(Math.PI / 2), M.rope, g, 0, 1.95, 0);
  const cloths = [];
  const n = colors.length;
  colors.forEach((c, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(-L / 2 + (L * (i + 0.5)) / n, 1.95, 0);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide });
    const cloth = mesh(new THREE.PlaneGeometry(0.62, 0.85, 1, 4), mat, pivot, 0, -0.44, 0);
    cloth.castShadow = true;
    g.add(pivot);
    cloths.push(pivot);
  });
  return { group: g, size: { w: L, d: 0.2 }, cloths, posts: [[-L / 2, 0], [L / 2, 0]] };
}

// 비석 (거북 받침)
export function buildStele(M, lines) {
  const g = new THREE.Group();
  const turtle = mesh(new THREE.SphereGeometry(0.6, 14, 10), M.granite, g, 0, 0.2, 0);
  turtle.scale.set(1.0, 0.45, 1.3);
  mesh(new THREE.SphereGeometry(0.2, 10, 8), M.granite, g, 0, 0.28, 0.8);
  const tex = textBoardTexture(lines, { w: 256, h: 512, bg: '#8f877b', fg: '#2a2420', border: null, size: 46, vertical: true, weight: 900 });
  const mats = [M.granite, M.granite, M.granite, M.granite, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), M.granite];
  const slab = mesh(box(0.7, 1.4, 0.2), mats, g, 0, 1.1, 0);
  mesh(box(0.85, 0.22, 0.3), M.granite, g, 0, 1.9, 0);
  return { group: g, size: { w: 1.1, d: 1.5 }, slab };
}

// 청사초롱
export function buildLanternPost(M, blue = false) {
  const g = new THREE.Group();
  mesh(cyl(0.05, 0.06, 2.0, 8), M.woodDark, g, 0, 1.0, 0);
  mesh(box(0.5, 0.05, 0.05), M.woodDark, g, 0.2, 1.95, 0);
  const lamp = new THREE.Group();
  lamp.position.set(0.4, 1.6, 0);
  const body = mesh(cyl(0.16, 0.16, 0.42, 12), blue ? M.lanternBlue : M.lanternRed, lamp, 0, 0, 0, { cast: false });
  mesh(cyl(0.17, 0.17, 0.1, 12), M.lanternBlue, lamp, 0, 0.2, 0);
  mesh(cyl(0.17, 0.17, 0.1, 12), M.lanternBlue, lamp, 0, -0.2, 0);
  mesh(cyl(0.005, 0.005, 0.32, 4), M.rope, lamp, 0, 0.32, 0);
  g.add(lamp);
  void body;
  return { group: g, size: { w: 0.25, d: 0.25 }, lamp };
}

// =====================================================================
// 중앙 마당 석단 (사신 옥패를 놓는 곳)
// =====================================================================
export function buildAltar(M) {
  const g = new THREE.Group();
  const S = 4.2;
  // 가운데가 뚫린 2단 석단 (덮개돌이 밀리면 계단이 보임)
  const hole = 1.7;
  const frame = (outer, h, y) => {
    const side = (outer - hole) / 2;
    mesh(box(outer, h, side), M.granite, g, 0, y, -(hole / 2 + side / 2));
    mesh(box(outer, h, side), M.granite, g, 0, y, hole / 2 + side / 2);
    mesh(box(side, h, hole), M.granite, g, -(hole / 2 + side / 2), y, 0);
    mesh(box(side, h, hole), M.granite, g, hole / 2 + side / 2, y, 0);
  };
  frame(S, 0.22, 0.11);
  frame(S - 0.6, 0.18, 0.31);
  // 가운데 덮개돌 (열리면 옆으로 밀려남)
  const slab = new THREE.Group();
  slab.position.set(0, 0.42, 0);
  mesh(box(1.9, 0.12, 1.9), M.granite, slab);
  const taeguk = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: taegukTexture(), roughness: 0.6 }));
  taeguk.position.y = 0.065;
  slab.add(taeguk);
  g.add(slab);
  // 네 방위의 홈
  const sockets = {};
  const dirs = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  const hanja = { N: '北', S: '南', E: '東', W: '西' };
  for (const [k, [dx, dz]] of Object.entries(dirs)) {
    const sg = new THREE.Group();
    sg.position.set(dx * (S / 2 - 0.55), 0.4, dz * (S / 2 - 0.55));
    mesh(cyl(0.34, 0.38, 0.16, 20), M.granite, sg, 0, 0.0, 0);
    const hole = mesh(cyl(0.24, 0.24, 0.02, 20), M.dark, sg, 0, 0.085, 0, { cast: false });
    const labelTex = textBoardTexture(hanja[k], { w: 128, h: 128, bg: '#8f877b', fg: '#3a2a20', border: null, size: 92, weight: 900 });
    const label = mesh(new THREE.PlaneGeometry(0.5, 0.5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.9 }), g, dx * (S / 2 - 0.18), 0.225, dz * (S / 2 - 0.18), { cast: false });
    label.rotation.y = dx ? -dx * Math.PI / 2 : dz > 0 ? 0 : Math.PI;
    const glow = mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), M.glow.clone(), sg, 0, 0.12, 0, { cast: false });
    glow.material.opacity = 0;
    g.add(sg);
    sockets[k] = { group: sg, hole, glow, tablet: null };
  }
  return { group: g, size: { w: S, d: S }, slab, sockets };
}

function taegukTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8f877b'; ctx.fillRect(0, 0, 256, 256);
  ctx.translate(128, 128);
  ctx.fillStyle = '#b8352c';
  ctx.beginPath(); ctx.arc(0, 0, 110, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#23466e';
  ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#b8352c';
  ctx.beginPath(); ctx.arc(-55, 0, 55, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#23466e';
  ctx.beginPath(); ctx.arc(55, 0, 55, Math.PI, 0); ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 옥패 (사신)
export const TABLET_COLORS = { cheongryong: 0x2f8f6a, baekho: 0xe9e4da, jujak: 0xc8402e, hyeonmu: 0x26262e };
export function buildTablet(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.1, emissive: color, emissiveIntensity: 0.35 });
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.46, 0.08, 2, 0.04), mat);
  m.position.y = 0.3;
  m.castShadow = true;
  g.add(m);
  return { group: g, mesh: m, mat };
}

// 지하 계단 (마당 아래)
export function buildStairwell(M, size = 1.7, depth = 3.0) {
  const g = new THREE.Group();
  const steps = 10;
  const stepD = size / steps;
  for (let i = 0; i < steps; i++) {
    const y = -((i + 1) * depth) / steps;
    mesh(box(size - 0.1, 0.12, stepD + 0.02), M.granite, g, 0, y + 0.06, -size / 2 + (i + 0.5) * stepD);
  }
  for (const s of [-1, 1]) mesh(box(0.1, depth, size), M.stoneWall, g, s * size / 2, -depth / 2, 0);
  mesh(box(size, depth, 0.1), M.stoneWall, g, 0, -depth / 2, -size / 2);
  mesh(box(size, depth, 0.1), M.stoneWall, g, 0, -depth / 2, size / 2);
  const glow = mesh(new THREE.PlaneGeometry(size * 1.2, size * 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTexture('255,190,90'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }), g, 0, -depth + 0.2, size * 0.3, { cast: false });
  return { group: g, glow };
}

// =====================================================================
// 실내
// =====================================================================
// 방 껍데기: (0,0)~(w,d), 뒷벽(z=0)과 왼쪽 벽(x=0)만 높게 세움 (카메라 쪽은 낮은 문지방)
export function buildRoomShell(M, w, d, { wallH = 3.0, floor = 'jangpan', wallMat = null } = {}) {
  const g = new THREE.Group();
  const fm = (floor === 'board' ? M.board : M.jangpan).clone();
  fm.map = fm.map.clone();
  fm.map.needsUpdate = true;
  fm.map.wrapS = fm.map.wrapT = THREE.RepeatWrapping;
  fm.map.repeat.set(w / 3, d / 3);
  const fl = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), fm, g, w / 2, 0, d / 2, { cast: false });
  fl.receiveShadow = true;
  mesh(box(w + 0.6, 0.5, d + 0.6), M.woodDark, g, w / 2 - 0.1, -0.251, d / 2 - 0.1, { cast: false });
  const wm = wallMat || M.plaster;
  // 뒷벽 / 왼쪽 벽
  mesh(box(w + 0.2, wallH, 0.2), wm, g, w / 2 - 0.1, wallH / 2, -0.1);
  mesh(box(0.2, wallH, d), wm, g, -0.1, wallH / 2, d / 2);
  // 기둥·인방
  for (const x of [0, w / 2, w]) mesh(box(0.24, wallH, 0.24), M.wood, g, x, wallH / 2, 0.02);
  for (const z of [0, d / 2, d]) mesh(box(0.24, wallH, 0.24), M.wood, g, 0.02, wallH / 2, z);
  mesh(box(w, 0.2, 0.12), M.wood, g, w / 2, wallH - 0.1, 0.06);
  mesh(box(0.12, 0.2, d), M.wood, g, 0.06, wallH - 0.1, d / 2);
  mesh(box(w, 0.25, 0.1), M.woodLight, g, w / 2, 0.125, 0.05);
  mesh(box(0.1, 0.25, d), M.woodLight, g, 0.05, 0.125, d / 2);
  // 앞·오른쪽 문지방 (낮게)
  mesh(box(w + 0.24, 0.18, 0.2), M.wood, g, w / 2, 0.09, d + 0.1);
  mesh(box(0.2, 0.18, d + 0.2), M.wood, g, w + 0.1, 0.09, d / 2);
  for (const x of [w]) mesh(box(0.24, 0.5, 0.24), M.wood, g, x, 0.25, d);
  // 뒷벽 창호
  const win = mesh(new THREE.PlaneGeometry(1.4, 1.1), M.window, g, w * 0.75, 1.75, 0.005, { cast: false });
  void win;
  return { group: g, size: { w, d } };
}

// 앞쪽 출입문 (나가기)
export function buildExitDoor(M) {
  const g = new THREE.Group();
  mesh(box(1.6, 0.06, 0.6), M.granite, g, 0, 0.03, 0.55);
  // 신발 한 켤레
  for (const s of [-1, 1]) {
    const shoe = mesh(new THREE.CapsuleGeometry(0.06, 0.16, 4, 8), M.iron, g, s * 0.09, 0.1, 0.55);
    shoe.rotation.x = Math.PI / 2;
  }
  const mat = new THREE.MeshBasicMaterial({ map: glowTexture('255,230,170'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
  const glow = mesh(new THREE.PlaneGeometry(2.2, 1.6).rotateX(-Math.PI / 2), mat, g, 0, 0.02, 0.1, { cast: false });
  return { group: g, glow };
}

export function buildBandaji(M) {
  const g = new THREE.Group();
  mesh(box(1.3, 0.75, 0.6), M.woodDark, g, 0, 0.42, 0);
  for (const sx of [-1, 1]) mesh(box(0.08, 0.08, 0.6), M.woodDark, g, sx * 0.6, 0.04, 0);
  // 장석
  for (const [x, y] of [[-0.55, 0.72], [0.55, 0.72], [-0.55, 0.12], [0.55, 0.12]]) mesh(box(0.14, 0.14, 0.02), M.brass, g, x, y, 0.31);
  const lid = new THREE.Group();
  lid.position.set(0, 0.8, -0.3);
  mesh(box(1.32, 0.06, 0.62), M.woodDark, lid, 0, 0, 0.3);
  g.add(lid);
  const lock = mesh(box(0.2, 0.14, 0.06), M.brass, g, 0, 0.64, 0.33);
  mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), M.brass, lock, 0, 0.07, 0);
  return { group: g, size: { w: 1.3, d: 0.6 }, lid, lock };
}

export function buildSeoan(M) {
  const g = new THREE.Group();
  mesh(box(1.2, 0.05, 0.5), M.wood, g, 0, 0.36, 0);
  for (const sx of [-1, 1]) mesh(box(0.06, 0.34, 0.46), M.wood, g, sx * 0.55, 0.17, 0);
  mesh(box(0.42, 0.01, 0.3), M.paper, g, -0.1, 0.39, 0);
  mesh(box(0.12, 0.03, 0.18), M.iron, g, 0.38, 0.4, 0); // 벼루
  const brush = mesh(cyl(0.01, 0.01, 0.3, 5), M.woodLight, g, 0.22, 0.4, 0.1);
  brush.rotation.z = Math.PI / 2;
  // 방석
  mesh(new RoundedBoxGeometry(0.6, 0.08, 0.6, 2, 0.03), M.cushion, g, 0, 0.04, 0.65);
  return { group: g, size: { w: 1.2, d: 0.5 } };
}

export function buildBookshelf(M) {
  const g = new THREE.Group();
  const W = 1.4, H = 1.8, D = 0.4;
  mesh(box(W, H, 0.04), M.woodDark, g, 0, H / 2, -D / 2);
  for (const sx of [-1, 1]) mesh(box(0.05, H, D), M.woodDark, g, sx * W / 2, H / 2, 0);
  const r = rand(401);
  const cols = [0x6a3a2a, 0x2a4a6a, 0x5a5a3a, 0x7a6a4a, 0x3a2a2a, 0xc8b48a];
  for (let s = 0; s < 4; s++) {
    const y = 0.05 + s * 0.45;
    mesh(box(W, 0.04, D), M.woodDark, g, 0, y, 0);
    let x = -W / 2 + 0.08;
    while (x < W / 2 - 0.12 && s < 3) {
      const bw = 0.06 + r() * 0.05, bh = 0.26 + r() * 0.1;
      mesh(box(bw, bh, 0.26), new THREE.MeshStandardMaterial({ color: cols[Math.floor(r() * cols.length)], roughness: 0.9 }), g, x + bw / 2, y + 0.02 + bh / 2, 0);
      x += bw + 0.01;
      if (r() > 0.85) {
        // 눕혀 쌓은 책
        x += 0.1;
      }
    }
  }
  return { group: g, size: { w: W, d: D } };
}

export function buildScroll(lines, { w = 0.7, h = 1.6 } = {}) {
  const g = new THREE.Group();
  const tex = textBoardTexture(lines, { w: 256, h: 600, bg: '#efe4c8', fg: '#1a120c', border: '#5a7a6a', size: 40, vertical: true, paper: true, weight: 700 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffd28a, emissiveIntensity: 0 }));
  g.add(m);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, w + 0.12, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a2414 }));
  rod.position.y = -h / 2;
  g.add(rod);
  const top = rod.clone(); top.position.y = h / 2; g.add(top);
  return { group: g, mesh: m };
}

// 병풍 (사군자 4폭) — order: 왼쪽부터 그림 종류
export function buildFoldingScreen(M, order) {
  const g = new THREE.Group();
  const pw = 0.62, ph = 1.6;
  const panels = [];
  order.forEach((kind, i) => {
    const p = new THREE.Group();
    const x = (i - (order.length - 1) / 2) * pw * 0.97;
    p.position.set(x, 0, (i % 2) * 0.12);
    p.rotation.y = (i % 2 ? -1 : 1) * 0.2;
    const mat = new THREE.MeshStandardMaterial({ map: plantPanelTexture(kind), roughness: 0.85, emissive: 0xffd28a, emissiveIntensity: 0 });
    const face = mesh(new THREE.BoxGeometry(pw, ph, 0.03), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, mat, M.woodDark], p, 0, ph / 2 + 0.08, 0);
    mesh(box(pw + 0.04, 0.06, 0.05), M.woodDark, p, 0, ph + 0.11, 0);
    mesh(box(pw + 0.04, 0.08, 0.05), M.woodDark, p, 0, 0.06, 0);
    g.add(p);
    panels.push({ group: p, mat, face, kind });
  });
  return { group: g, size: { w: pw * order.length, d: 0.5 }, panels };
}

export function buildMirrorStand(M) {
  const g = new THREE.Group();
  mesh(box(0.6, 0.3, 0.4), M.red, g, 0, 0.15, 0);
  mesh(box(0.1, 0.02, 0.02), M.brass, g, 0, 0.2, 0.21);
  const frame = mesh(box(0.44, 0.52, 0.04), M.red, g, 0, 0.62, -0.08);
  frame.rotation.x = -0.15;
  const glass = mesh(new THREE.PlaneGeometry(0.36, 0.44), new THREE.MeshStandardMaterial({ color: 0xc9d6dc, metalness: 1, roughness: 0.08 }), frame, 0, 0, 0.025, { cast: false });
  void glass;
  return { group: g, size: { w: 0.6, d: 0.4 } };
}

// 등잔 (작은 기름등)
export function buildOilLamp(M) {
  const g = new THREE.Group();
  mesh(cyl(0.14, 0.16, 0.04, 14), M.brass, g, 0, 0.02, 0);
  mesh(cyl(0.025, 0.03, 0.55, 8), M.brass, g, 0, 0.3, 0);
  mesh(cyl(0.1, 0.06, 0.06, 14), M.brass, g, 0, 0.6, 0);
  const flame = mesh(new THREE.ConeGeometry(0.03, 0.1, 8), M.flame, g, 0, 0.68, 0, { cast: false });
  const glow = mesh(new THREE.PlaneGeometry(0.8, 0.8), M.glow, g, 0, 0.68, 0, { cast: false });
  return { group: g, size: { w: 0.35, d: 0.35 }, flame, glow };
}

// 약장 (서랍 4x4)
export function buildMedicineCabinet(M, labels) {
  const g = new THREE.Group();
  const cols = 4, rows = Math.ceil(labels.length / cols);
  const cw = 0.42, ch = 0.32;
  const W = cols * cw + 0.12, H = rows * ch + 0.5;
  mesh(box(W, H, 0.45), M.wood, g, 0, H / 2, 0);
  const drawers = [];
  labels.forEach((label, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = -W / 2 + 0.06 + (c + 0.5) * cw;
    const y = H - 0.08 - (r + 0.5) * ch;
    const tex = textBoardTexture(label, { w: 256, h: 192, bg: '#9a6d43', fg: '#1a0f08', border: '#4a2d18', size: 64, weight: 900 });
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffd28a, emissiveIntensity: 0 });
    const d = mesh(box(cw - 0.04, ch - 0.04, 0.04), [M.woodLight, M.woodLight, M.woodLight, M.woodLight, mat, M.woodLight], g, x, y, 0.24);
    mesh(new THREE.SphereGeometry(0.02, 6, 5), M.brass, d, 0, -0.07, 0.03);
    drawers.push({ mesh: d, mat, label });
  });
  return { group: g, size: { w: W, d: 0.5 }, drawers, height: H };
}

// 자개함 (작은 상 위)
export function buildNajeonBox(M) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), M.red, g, 0, 0.4, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = mesh(box(0.05, 0.38, 0.05), M.red, g, Math.cos(a) * 0.3, 0.19, Math.sin(a) * 0.3);
    void leg;
  }
  const b = mesh(new RoundedBoxGeometry(0.5, 0.22, 0.36, 2, 0.03), M.najeon, g, 0, 0.53, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.64, -0.18);
  mesh(new RoundedBoxGeometry(0.52, 0.06, 0.38, 2, 0.02), M.najeon, lid, 0, 0.01, 0.18);
  g.add(lid);
  const colors = [0x2f5fa8, 0xc8402e, 0xe0b43a, 0xf2ede2, 0x1d1d22];
  const buttons = colors.map((c, i) => mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, emissive: c, emissiveIntensity: 0.25 }), g, -0.16 + i * 0.08, 0.56, 0.185));
  void b;
  return { group: g, size: { w: 0.85, d: 0.85 }, lid, buttons };
}

export function buildLowTable(M) {
  const g = new THREE.Group();
  mesh(box(0.9, 0.05, 0.6), M.wood, g, 0, 0.34, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.05, 0.32, 0.05), M.wood, g, sx * 0.4, 0.16, sz * 0.25);
  return { group: g, size: { w: 0.9, d: 0.6 } };
}

export function buildHerbTray(M, seed = 1) {
  const g = new THREE.Group();
  mesh(cyl(0.45, 0.4, 0.08, 18), M.rope, g, 0, 0.04, 0);
  const r = rand(seed * 91);
  const cols = [0x6b5a2a, 0x8a4a2a, 0x4a5a2a, 0xa08050];
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, rr = r() * 0.35;
    const m = mesh(new THREE.BoxGeometry(0.06, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 1 }), g, Math.cos(a) * rr, 0.09, Math.sin(a) * rr, { cast: false });
    m.rotation.y = r() * 3;
  }
  return { group: g, size: { w: 0.9, d: 0.9 } };
}

// 가야금
export function buildGayageum(M) {
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(1.6, 0.08, 0.3, 2, 0.03), M.woodLight, g, 0, 0.12, 0);
  body.rotation.y = 0.2;
  for (let i = 0; i < 12; i++) {
    const s = mesh(cyl(0.004, 0.004, 1.4, 3).rotateZ(Math.PI / 2), M.paper, body, 0, 0.05, -0.12 + i * 0.022, { cast: false });
    void s;
  }
  return { group: g, size: { w: 1.6, d: 0.6 } };
}

// 벽 횃불 / 촛대 (지하 보물창고)
export function buildTorch(M) {
  const g = new THREE.Group();
  mesh(cyl(0.04, 0.03, 0.5, 6), M.iron, g, 0, 0, 0);
  mesh(cyl(0.09, 0.05, 0.14, 8), M.iron, g, 0, 0.28, 0);
  const flame = mesh(new THREE.ConeGeometry(0.08, 0.26, 8), M.flame, g, 0, 0.44, 0, { cast: false });
  const glow = mesh(new THREE.PlaneGeometry(1.6, 1.6), M.glow, g, 0, 0.45, 0.05, { cast: false });
  return { group: g, flame, glow };
}

export function buildTreasureChest(M) {
  const g = new THREE.Group();
  mesh(box(1.5, 0.6, 1.5), M.granite, g, 0, 0.3, 0);
  const chest = new THREE.Group();
  chest.position.y = 0.6;
  mesh(box(1.1, 0.55, 0.7), M.red, chest, 0, 0.275, 0);
  for (const sx of [-0.4, 0, 0.4]) mesh(box(0.06, 0.57, 0.72), M.gold, chest, sx, 0.275, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.55, -0.35);
  const lidMesh = mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), M.red, lid, 0, 0, 0.35);
  lidMesh.rotation.y = 0;
  for (const sx of [-0.4, 0, 0.4]) {
    const band = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), M.gold, lid, sx, 0, 0.35);
    void band;
  }
  chest.add(lid);
  mesh(box(0.16, 0.18, 0.04), M.gold, chest, 0, 0.45, 0.37);
  // 안쪽 금빛
  const goldPile = mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffd26a, emissive: 0xffa82a, emissiveIntensity: 0.8, metalness: 1, roughness: 0.3 }), chest, 0, 0.42, 0, { cast: false });
  goldPile.scale.set(1.25, 0.35, 0.8);
  g.add(chest);
  const glow = mesh(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTexture('255,200,90'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }), g, 0, 0.02, 0, { cast: false });
  return { group: g, size: { w: 1.5, d: 1.5 }, lid, glow, chest };
}

// =====================================================================
// 겨울 소품
// =====================================================================
// 눈사람 (석판을 들고 있을 수 있음)
export function buildSnowman(M, { slate = null, scale = 1, hat = true, seed = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  mesh(new THREE.SphereGeometry(0.55 * s, 18, 14), M.snow, g, 0, 0.48 * s, 0);
  mesh(new THREE.SphereGeometry(0.4 * s, 18, 14), M.snow, g, 0, 1.18 * s, 0);
  mesh(new THREE.SphereGeometry(0.3 * s, 16, 12), M.snow, g, 0, 1.7 * s, 0);
  for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(0.04 * s, 8, 6), M.coal, g, sx * 0.1 * s, 1.78 * s, 0.26 * s);
  const nose = mesh(new THREE.ConeGeometry(0.045 * s, 0.25 * s, 8), M.carrot, g, 0, 1.7 * s, 0.38 * s);
  nose.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.035 * s, 8, 6), M.coal, g, 0, (1.05 + i * 0.13) * s, 0.385 * s);
  // 목도리
  const sc = mesh(new THREE.TorusGeometry(0.3 * s, 0.06 * s, 8, 20), seed % 2 ? M.red : M.blue, g, 0, 1.47 * s, 0);
  sc.rotation.x = Math.PI / 2;
  // 나뭇가지 팔
  for (const sx of [-1, 1]) {
    const arm = mesh(cyl(0.02 * s, 0.03 * s, 0.7 * s, 5), M.trunk, g, sx * 0.6 * s, 1.3 * s, slate ? 0.15 * s : 0);
    arm.rotation.z = sx * (slate ? 1.0 : 0.9);
    if (slate) arm.rotation.x = 0.6;
  }
  if (hat) {
    // 삿갓 모양 모자
    mesh(new THREE.ConeGeometry(0.42 * s, 0.22 * s, 18), M.rope, g, 0, 2.02 * s, 0);
  }
  let slateMesh = null;
  if (slate) {
    const tex = slateTexture(slate);
    slateMesh = mesh(new THREE.BoxGeometry(0.7 * s, 0.52 * s, 0.04), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), M.woodDark], g, 0, 1.12 * s, 0.5 * s);
    slateMesh.rotation.x = -0.25;
  }
  return { group: g, size: { w: 1.1 * s, d: 1.1 * s }, slate: slateMesh };
}

// 눈 더미
export function buildSnowPile(M, seed = 1, scale = 1) {
  const g = new THREE.Group();
  const r = rand(seed * 53 + 1);
  for (let i = 0; i < 4; i++) {
    const p = mesh(new THREE.SphereGeometry((0.4 + r() * 0.4) * scale, 12, 8), M.snow, g, (r() - 0.5) * scale, 0, (r() - 0.5) * scale);
    p.scale.y = 0.45;
  }
  return { group: g, size: { w: 1.2 * scale, d: 1.2 * scale } };
}

// 작은 함 (정자 위 자물쇠 함)
export function buildLockBox(M) {
  const g = new THREE.Group();
  mesh(box(0.7, 0.42, 0.45), M.woodDark, g, 0, 0.21, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.42, -0.225);
  mesh(box(0.72, 0.06, 0.47), M.woodDark, lid, 0, 0.03, 0.225);
  g.add(lid);
  for (const sx of [-0.25, 0.25]) mesh(box(0.06, 0.44, 0.47), M.brass, g, sx, 0.22, 0);
  mesh(box(0.14, 0.12, 0.04), M.brass, g, 0, 0.32, 0.24);
  const sn = mesh(box(0.66, 0.05, 0.4), M.snow, lid, 0, 0.085, 0.225);
  void sn;
  return { group: g, size: { w: 0.8, d: 0.6 }, lid };
}
