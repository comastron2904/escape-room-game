// 3D 한옥마을 (Three.js) — 이동 · 카메라 · 구역(마을/집 안/지하) 전환 · 상호작용 · 연출
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAvatar } from './3d/avatar.js';
import { loadCharacterLibrary, instantiateCharacter, createCharacterPreview, prefetchCharacters } from './3d/characters.js';
import { createNavGrid } from './3d/pathfind.js';
import { bakeStatic } from './3d/bake.js';
import { createMaterials } from './3d/hanok.js';
import { softShadowTexture, setMaxAnisotropy, canvasTexture, snowflakeTexture, markerTexture, MARKER_STYLE } from './3d/textures.js';
import { buildAreas, CABINET_PUZZLE_DRAWER } from './areas.js';

const WALK_SPEED = 2.4;
const RUN_SPEED = 4.8;
const NEAR_DIST = 1.45;
const P_RADIUS = 0.28;
const CAM_AZ = 0.62;

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const sample = '書堂大監宅藥房別堂東西南北天下大將軍地下女將軍황기인삼천궁복령계피작약당귀대추생강감초진피오미자숙지황구기자백출맥문동사군자매화난초국화대나무현무자개함다섯빛깔단추마당바람나부끼는차례누르라감이붉게익는나무아래풀숲대감댁열쇠품고있다해뜨는쪽푸른비늘지키고지는흰털따뜻한붉은깃차가운검은등딱지지킨다';
  const loads = ['700', '900'].map((w) => document.fonts.load(`${w} 40px "Noto Serif KR"`, sample).catch(() => null));
  loads.push(document.fonts.load('700 40px "Pretendard Variable"', '가나다').catch(() => null));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 2500))]);
}

// ---------------- 구역 ----------------
class Area {
  constructor(scene, def) {
    Object.assign(this, { colliders: [], inters: [], pickables: [], fadeables: [], spawns: {}, dyn: new Set(), anims: {} }, def);
    this.root = new THREE.Group();
    this.root.position.set(this.ox, 0, this.oz || 0);
    scene.add(this.root);
  }
  box(cx, cz, w, d) { this.colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }); }
  add(obj, x = 0, z = 0, rot = 0, y = 0) {
    obj.position.set(x, y, z);
    obj.rotation.y = rot;
    this.root.add(obj);
    return obj;
  }
  // item = { group, size:{w,d} }  rot 은 0 또는 ±π/2 (π 도 가능)
  place(item, x, z, rot = 0, { collide = true, fade = false, dynamic = false, y = 0, cw = null, cd = null } = {}) {
    if (fade) makeFadeable(this, item);
    this.add(item.group, x, z, rot, y);
    if (dynamic) this.dyn.add(item.group);
    if (collide && item.size) {
      const quarter = Math.abs(Math.round(rot / (Math.PI / 2))) % 2 === 1;
      const w = cw ?? item.size.w, d = cd ?? item.size.d;
      this.box(x, z, quarter ? d : w, quarter ? w : d);
    }
    return item;
  }
  // 상호작용 지점 (x,z = 서서 누르는 위치, marker = 반짝이 위치)
  inter({ id, x, z, pick = [], marker = null, face = null, highlight = null }) {
    const list = [];
    for (const p of pick) p.traverse?.((o) => { if (o.isMesh) list.push(o); });
    list.forEach((m) => { m.userData.inter = id; });
    for (const p of pick) this.dyn.add(p);
    this.pickables.push(...list);
    const it = { id, area: this.id, x, z, pick: list, marker: marker || [x, 1.4, z], face, highlight, glowT: 0, near: 0 };
    this.inters.push(it);
    return it;
  }
  toWorld(x, z, y = 0, out = new THREE.Vector3()) { return out.set(this.ox + x, y, (this.oz || 0) + z); }
}

// 가려지면 반투명해지는 물체 (집·나무): 재질을 따로 복제한 뒤 미리 합쳐 둠
function makeFadeable(area, item) {
  const cache = new Map();
  item.group.traverse((o) => {
    if (!o.isMesh) return;
    const swap = (m) => {
      if (!cache.has(m.uuid)) {
        const c = m.clone();
        c.userData.baseOpacity = m.opacity;
        c.userData.baseTransparent = m.transparent;
        cache.set(m.uuid, c);
      }
      return cache.get(m.uuid);
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
  if (item.doorMeshes?.length) item.doorMat = item.doorMeshes[0].material;
  const keep = new Set(item.doorMeshes || []);
  if (item.keep) item.keep.forEach((k) => keep.add(k));
  bakeStatic(item.group, keep);
  const f = { item, mats: [...cache.values()], box: null, op: 1 };
  area.fadeables.push(f);
  area.dyn.add(item.group);
  return f;
}

// ---------------- 월드 ----------------
export async function createWorld(canvas, options) {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const [, charLib] = await Promise.all([loadFonts(), loadCharacterLibrary()]);
  const makeAvatar = async (look) => {
    const a = (charLib && (await instantiateCharacter(charLib, look.seed || 0))) || createAvatar(look);
    a.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    return a;
  };
  const firstAvatar = makeAvatar(options.look);
  let preview = null;
  let lookToken = 0;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const MAX_PR = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.5);
  let pixelRatio = MAX_PR;
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8d8b8, 30, 90);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;
  pmrem.dispose();

  const skyTex = canvasTexture(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#93a5bb');
    g.addColorStop(0.55, '#c9d3de');
    g.addColorStop(1, '#eef2f6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // ---------------- 조명 ----------------
  const hemi = new THREE.HemisphereLight(0xfff1d6, 0x6b5a3a, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe0b0, 2.2);
  key.castShadow = true;
  const SHADOW_MAP = isTouch ? 1024 : 2048;
  key.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.04;
  scene.add(key, key.target);
  const keyOffset = new THREE.Vector3(-9, 18, 11);
  const lamp = new THREE.PointLight(0xffb060, 0, 8, 1.6); // 등잔불 / 보물빛 (조명 1개만 재사용)
  scene.add(lamp);

  // ---------------- 마을 · 실내 만들기 ----------------
  const M = createMaterials();
  const areas = {};
  const mk = (def) => (areas[def.id] = new Area(scene, def));
  const built = buildAreas({ mk, M, options, story: options.story });

  // 움직이지 않는 물체 합치기 (그리기 횟수 줄이기)
  const exclude = new Set();
  for (const a of Object.values(areas)) a.dyn.forEach((o) => exclude.add(o));
  let before = 0, after = 0;
  for (const a of Object.values(areas)) {
    // 구역별로 합쳐야 구역을 숨길 때 함께 숨겨짐 (잠시 원점으로 옮겨 합친 뒤 되돌림)
    const p = a.root.position.clone();
    a.root.position.set(0, 0, 0);
    const r = bakeStatic(a.root, exclude);
    a.root.position.copy(p);
    before += r.before; after += r.after;
  }
  scene.updateMatrixWorld(true);
  console.info(`[hanok] 최적화: 메시 ${before}개 → ${after}개`);
  renderer.shadowMap.autoUpdate = false;

  for (const a of Object.values(areas)) {
    a.nav = createNavGrid(a.w, a.d, a.colliders, { radius: P_RADIUS + 0.05, margin: a.margin ?? 0.4 });
    for (const f of a.fadeables) f.box = new THREE.Box3().setFromObject(f.item.group);
  }

  // 눈 내림 (마을에서만) — 위치 계산을 GPU 셰이더에서 해서 CPU 부담 없음
  const SNOW_N = isTouch ? 1000 : 2200;
  const SNOW_BOX = { w: 36, h: 16, d: 36 };
  const snowPos = new Float32Array(SNOW_N * 3);
  const snowSpd = new Float32Array(SNOW_N);
  for (let i = 0; i < SNOW_N; i++) {
    snowPos[i * 3] = Math.random() * SNOW_BOX.w;
    snowPos[i * 3 + 1] = Math.random() * SNOW_BOX.h;
    snowPos[i * 3 + 2] = Math.random() * SNOW_BOX.d;
    snowSpd[i] = 0.6 + Math.random() * 0.9;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  snowGeo.setAttribute('aSpeed', new THREE.BufferAttribute(snowSpd, 1));
  const snowMat = new THREE.PointsMaterial({ map: snowflakeTexture(), size: 0.16, transparent: true, depthWrite: false, opacity: 0.95, sizeAttenuation: true });
  const snowU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(SNOW_BOX.w, SNOW_BOX.h, SNOW_BOX.d) } };
  snowMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, snowU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uCam;\nuniform vec3 uBox;\nattribute float aSpeed;')
      .replace('#include <begin_vertex>', `
        vec3 transformed = position;
        transformed.y = mod(position.y - uTime * aSpeed, uBox.y);
        float sway = sin(uTime * 0.7 + position.x * 3.1) * 0.35;
        // 카메라 주변 상자 안에서 월드 좌표 기준으로 반복 (걸어도 눈이 따라오지 않음)
        transformed.x = mod(position.x + sway - uCam.x + uBox.x * 0.5, uBox.x) - uBox.x * 0.5 + uCam.x;
        transformed.z = mod(position.z - uCam.z + uBox.z * 0.5, uBox.z) - uBox.z * 0.5 + uCam.z;`);
  };
  const snowPts = new THREE.Points(snowGeo, snowMat);
  snowPts.frustumCulled = false;
  snowPts.renderOrder = 6;
  scene.add(snowPts);
  function updateSnow(dt, t) {
    snowPts.visible = !!area.env.snow;
    if (!snowPts.visible) return;
    snowU.uTime.value = t;
    snowU.uCam.value.set(camTarget.x, 0, camTarget.z);
  }

  // 조사 표시: 머리 위 핀(화면에서 항상 같은 크기) + 문제 장소 바닥 고리
  const markerTex = Object.fromEntries(Object.keys(MARKER_STYLE).map((k) => [k, markerTexture(k)]));
  const RING_COLOR = { puzzle: 0xd63a2a, final: 0x7b3fd1 };
  const ringGeo = new THREE.RingGeometry(0.55, 0.72, 48);
  const kindOf = (id) => options.game?.markerKind?.(id) || 'flavor';
  for (const a of Object.values(areas)) {
    for (const it of a.inters) {
      const kind = kindOf(it.id);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex[kind], transparent: true, depthWrite: false, depthTest: false, opacity: 0, sizeAttenuation: false }));
      s.center.set(0.5, 0);
      s.position.copy(a.toWorld(it.marker[0], it.marker[2], it.marker[1] + 0.15));
      s.renderOrder = 20;
      scene.add(s);
      it.sprite = s;
      it.kind = kind;
      it.baseY = s.position.y;
      const g = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: RING_COLOR.puzzle, transparent: true, opacity: 0, depthWrite: false }));
      g.rotation.x = -Math.PI / 2;
      g.position.copy(a.toWorld(it.x, it.z, 0.03));
      g.renderOrder = 4;
      g.visible = false;
      scene.add(g);
      it.groundRing = g;
    }
  }

  // 가까이 갔을 때 바닥 링
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.54, 40), new THREE.MeshBasicMaterial({ color: 0xe8590c, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 3;
  scene.add(ring);

  // ---------------- 캐릭터 ----------------
  let avatar = await firstAvatar;
  scene.add(avatar.root);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, depthWrite: false, opacity: 0.7 }));
  blob.rotation.x = -Math.PI / 2;
  blob.renderOrder = 1;
  scene.add(blob);

  let area = areas.village;
  const player = { x: area.spawns.start.x, z: area.spawns.start.z, yaw: area.spawns.start.yaw, moving: false };
  const st = options.state;
  if (st?.area && areas[st.area]) {
    area = areas[st.area];
    const sp = st.pos && !blockedIn(area, st.pos.x, st.pos.z) ? st.pos : area.spawns.start;
    player.x = sp.x; player.z = sp.z; player.yaw = sp.yaw ?? Math.PI;
  }

  const tag = document.createElement('div');
  tag.className = 'name-tag3d';
  tag.textContent = options.nickname || '';
  tag.hidden = !options.nickname;
  document.body.appendChild(tag);

  // ---------------- 카메라 ----------------
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
  const portrait = () => window.innerHeight > window.innerWidth;
  let dist = 15, distTarget = 15;
  const camTarget = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  let camEl = 0.78;
  function setCamDir(el) {
    camEl = el;
    camDir.set(Math.sin(CAM_AZ) * Math.cos(el), Math.sin(el), Math.cos(CAM_AZ) * Math.cos(el));
  }
  setCamDir(0.78);
  let shake = 0;

  const msaa = renderer.capabilities.isWebGL2 !== false && !isTouch ? 4 : 0;
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaa }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 1.6);
  composer.addPass(bloom);
  let bloomAllowed = !isTouch;
  bloom.enabled = bloomAllowed;
  composer.addPass(new OutputPass());

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---------------- 구역 적용 ----------------
  function applyEnv(a) {
    const e = a.env;
    scene.background = e.sky ? skyTex : new THREE.Color(e.bg);
    scene.fog.color.set(e.fog[0]);
    scene.fog.near = e.fog[1];
    scene.fog.far = e.fog[2];
    hemi.color.set(e.hemi[0]); hemi.groundColor.set(e.hemi[1]); hemi.intensity = e.hemi[2];
    key.color.set(e.key[0]); key.intensity = e.key[1];
    renderer.toneMappingExposure = e.exposure ?? 1;
    scene.environmentIntensity = e.envI ?? 0.25;
    bloom.strength = e.bloom ?? 0.3;
    bloom.enabled = bloomAllowed && (e.bloom ?? 0.3) >= 0.3;
    lamp.intensity = e.lamp?.intensity ?? 0;
    if (e.lamp?.color) lamp.color.set(e.lamp.color);
    if (e.lamp?.distance) lamp.distance = e.lamp.distance;
    if (e.lamp?.at) lamp.position.copy(a.toWorld(e.lamp.at[0], e.lamp.at[2], e.lamp.at[1]));
    // 그림자 범위
    const c = a.toWorld(a.w / 2, a.d / 2);
    key.target.position.copy(c);
    key.position.copy(c).add(keyOffset);
    const ext = Math.max(a.w, a.d) * 0.72;
    Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 80 });
    key.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    setCamDir(e.el ?? 0.78);
    distTarget = (e.dist ?? 15) * (portrait() ? 1.25 : 1);
    dist = distTarget;
    for (const x of Object.values(areas)) x.root.visible = x === a;
    for (const x of Object.values(areas)) for (const it of x.inters) { it.sprite.visible = x === a; if (x !== a) it.groundRing.visible = false; }
  }

  function snapCamera() {
    const p = area.toWorld(player.x, player.z, 0.9);
    camTarget.copy(p);
  }

  // ---------------- 충돌 / 이동 ----------------
  function blockedIn(a, x, z) {
    const m = P_RADIUS + 0.12;
    if (x < m || z < m || x > a.w - m || z > a.d - m) return true;
    for (const o of a.colliders) {
      const cx = Math.max(o.x0, Math.min(x, o.x1));
      const cz = Math.max(o.z0, Math.min(z, o.z1));
      if ((x - cx) ** 2 + (z - cz) ** 2 < P_RADIUS * P_RADIUS) return true;
    }
    return false;
  }
  const blocked = (x, z) => blockedIn(area, x, z);
  function tryMove(dx, dz) {
    let moved = false;
    if (!blocked(player.x + dx, player.z)) { player.x += dx; moved = true; }
    if (!blocked(player.x, player.z + dz)) { player.z += dz; moved = true; }
    return moved;
  }

  // ---------------- 입력 ----------------
  const keys = new Set();
  let path = null;
  let pending = null;   // 눌러서 걸어가는 중인 상호작용 지점
  let stuck = 0;
  let paused = false;
  let busy = false;     // 구역 이동 중
  let near = null;
  let runToggle = false, shiftDown = false;
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const isTyping = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };

  function activate(it) {
    if (!it || paused || busy) return;
    pending = null; path = null;
    const fx = it.face ?? null;
    if (fx != null) player.yaw = fx;
    else {
      const dx = it.marker[0] - player.x, dz = it.marker[2] - player.z;
      if (Math.hypot(dx, dz) > 0.05) player.yaw = Math.atan2(dx, dz);
    }
    options.onActivate?.(it.id);
  }

  function onKeyDown(e) {
    if (e.key === 'Shift') shiftDown = true;
    if (paused || isTyping(e)) return;
    if (KEYMAP[e.code]) {
      keys.add(KEYMAP[e.code]);
      path = null; pending = null;
      e.preventDefault();
    } else if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && near) {
      e.preventDefault();
      activate(near);
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      distTarget = Math.max(7, distTarget - 2);
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      distTarget = Math.min(32, distTarget + 2);
    }
  }
  function onKeyUp(e) {
    if (e.key === 'Shift') shiftDown = false;
    if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]);
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  function walkTo(x, z) {
    const p = area.nav.findPath(player.x, player.z, x, z);
    path = p && p.length ? p : null;
    stuck = 0;
  }
  const visCache = new Map();
  let visT = 1;
  const visibleInter = (it) => {
    if (!visCache.has(it.id)) visCache.set(it.id, !!options.game?.labelFor(it.id));
    return visCache.get(it.id);
  };
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(area.pickables, false);
    for (const h of hits) {
      const it = area.inters.find((x) => x.id === h.object.userData.inter);
      if (it && visibleInter(it)) return { inter: it };
    }
    if (!raycaster.ray.intersectPlane(floorPlane, hit)) return null;
    const lx = hit.x - area.ox, lz = hit.z - (area.oz || 0);
    for (const it of area.inters) {
      if (visibleInter(it) && Math.hypot(lx - it.x, lz - it.z) < 0.8) return { inter: it };
    }
    return { x: Math.max(0.4, Math.min(area.w - 0.4, lx)), z: Math.max(0.4, Math.min(area.d - 0.4, lz)) };
  }

  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 40), new THREE.MeshBasicMaterial({ color: 0xe8590c, transparent: true, opacity: 0, depthWrite: false }));
  ripple.rotation.x = -Math.PI / 2;
  ripple.renderOrder = 3;
  scene.add(ripple);
  let rippleT = 1;
  function showRipple(x, z) { ripple.position.copy(area.toWorld(x, z, 0.05)); rippleT = 0; }

  let tripRun = false, steer = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  function handleTap(cx, cy, run) {
    if (paused || busy) return;
    const t = pickAt(cx, cy);
    if (!t) return;
    tripRun = !!run;
    if (t.inter) {
      if (near === t.inter) { activate(t.inter); return; }
      pending = t.inter;
      walkTo(t.inter.x, t.inter.z);
      showRipple(t.inter.x, t.inter.z);
      return;
    }
    pending = null;
    walkTo(t.x, t.z);
    showRipple(t.x, t.z);
  }

  const pointers = new Map();
  let pinchStart = 0, pinchDist0 = 0, downInfo = null, lastSteer = 0;
  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const now = performance.now();
      const dbl = now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 45;
      lastTap = { t: now, x: e.clientX, y: e.clientY };
      downInfo = { x: e.clientX, y: e.clientY, t: now, dragging: false };
      handleTap(e.clientX, e.clientY, dbl);
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      pinchDist0 = distTarget;
      downInfo = null; steer = null;
    }
  }
  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinchStart > 0) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      distTarget = Math.max(7, Math.min(32, pinchDist0 * (pinchStart / Math.max(20, d))));
      return;
    }
    if (pointers.size === 1 && downInfo && !paused && !busy) {
      if (!downInfo.dragging && Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 14) downInfo.dragging = true;
      const now = performance.now();
      if (downInfo.dragging && now - lastSteer > 50) {
        lastSteer = now;
        const t = pickAt(e.clientX, e.clientY);
        if (t) {
          steer = t.inter ? { x: t.inter.x, z: t.inter.z } : { x: t.x, z: t.z };
          pending = t.inter || null;
          path = null;
        }
      }
    }
  }
  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (pointers.size === 0) {
      if (steer) { walkTo(steer.x, steer.z); showRipple(steer.x, steer.z); }
      steer = null; downInfo = null;
    }
  }
  function onWheel(e) {
    e.preventDefault();
    distTarget = Math.max(7, Math.min(32, distTarget * (1 + Math.sign(e.deltaY) * 0.1)));
  }

  // ---------------- 연출 ----------------
  const tweens = [];
  function tween(dur, fn, ease = (k) => 1 - (1 - k) ** 3) {
    return new Promise((resolve) => tweens.push({ t: 0, dur, fn, ease, resolve }));
  }
  const fadeEl = document.getElementById('fade');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function enterArea(id, spawnKey = 'start') {
    const target = areas[id];
    if (!target || busy) return;
    busy = true;
    path = null; pending = null; steer = null; keys.clear();
    fadeEl?.classList.add('on');
    options.sfx?.('door');
    await sleep(380);
    area = target;
    const sp = area.spawns[spawnKey] || area.spawns.start;
    player.x = sp.x; player.z = sp.z; player.yaw = sp.yaw ?? Math.PI;
    applyEnv(area);
    near = null;
    options.onNear?.(null);
    snapCamera();
    options.onAreaChange?.(id);
    await sleep(120);
    fadeEl?.classList.remove('on');
    await sleep(300);
    busy = false;
  }

  const B = built; // 구역 빌더가 돌려준 움직이는 부품들
  const SOLVED_POSE = {
    well: () => {},
    snowman: () => {},
    pavilion: (k) => { B.lockbox.lid.rotation.x = -k * 1.3; },
    bandaji: (k) => { B.bandaji.lid.rotation.x = -k * 1.25; },
    screen: (k) => { B.screen.group.position.x = B.screen.group.userData.x0 - k * 1.6; B.secretDrawer.visible = k > 0.5; },
    cabinet: (k) => { const d = B.cabinet.drawers[CABINET_PUZZLE_DRAWER]; d.mesh.position.z = d.mesh.userData.z0 + k * 0.3; },
    najeon: (k) => { B.najeon.lid.rotation.x = -k * 1.4; },
  };
  async function fx(name, arg) {
    if (name.startsWith('solve_')) {
      const id = name.slice(6);
      if (id === 'well') {
        const b = B.well.bucket, rope = B.well.rope;
        options.sfx?.('bucket');
        await tween(0.9, (k) => { b.position.y = 0.85 - Math.sin(k * Math.PI) * 0.6; rope.scale.y = 1 + Math.sin(k * Math.PI) * 0.7; rope.position.y = 1.25 - Math.sin(k * Math.PI) * 0.3; });
        return;
      }
      if (id === 'snowman') {
        const g = B.snowman.group;
        await tween(0.8, (k) => { g.rotation.z = Math.sin(k * Math.PI * 6) * 0.06 * (1 - k); });
        return;
      }
      const pose = SOLVED_POSE[id];
      if (pose) await tween(id === 'screen' ? 1.1 : 0.7, pose);
      return;
    }
    switch (name) {
      case 'altarPress': {
        const s = B.altar.sockets[arg];
        if (s) tween(0.6, (k) => { s.glow.material.opacity = Math.sin(k * Math.PI) * 0.9; });
        break;
      }
      case 'unlockDoor': {
        const d = B.houses.daegam;
        await tween(0.6, (k) => { d.doorMat.emissiveIntensity = Math.sin(k * Math.PI) * 1.2; });
        break;
      }
      case 'openChest': {
        shake = 0.3;
        lamp.intensity = 6;
        await tween(1.2, (k) => {
          B.chest.lid.rotation.x = -k * 1.9;
          B.chest.glow.material.opacity = 0.5 + k * 0.5;
          lamp.intensity = 6 + k * 18;
        });
        B.sparkles.visible = true;
        break;
      }
      default: break;
    }
  }

  async function openStairs(animate) {
    const slab = B.altar.slab;
    B.stairwell.group.visible = true;
    for (const s of Object.values(B.altar.sockets)) s.glow.material.opacity = 0.7;
    if (!animate) {
      slab.position.set(2.25, 0.28, 0);
      slab.rotation.z = -0.12;
      renderer.shadowMap.needsUpdate = true;
      return;
    }
    shake = 1.2;
    await tween(2.0, (k) => {
      slab.position.x = k * 2.25;
      slab.position.y = 0.42 - k * 0.14;
      slab.rotation.z = -k * 0.12;
      shake = Math.max(shake, (1 - k) * 0.6);
    }, (k) => k * k * (3 - 2 * k));
    renderer.shadowMap.needsUpdate = true;
  }

  const SPOT_IDS = ['well', 'snowman', 'pavilion', 'bandaji', 'screen', 'cabinet', 'najeon'];
  function applyState(s) {
    for (const i of s.solved || []) SOLVED_POSE[SPOT_IDS[i]]?.(1);
    if (s.finished) { B.chest.lid.rotation.x = -1.9; B.chest.glow.material.opacity = 1; B.sparkles.visible = true; }
    if (s.flags?.stairs_open) openStairs(false);
  }

  // ---------------- 업데이트 ----------------
  const fwd = { x: -Math.sin(CAM_AZ), z: -Math.cos(CAM_AZ) };
  const right = { x: Math.cos(CAM_AZ), z: -Math.sin(CAM_AZ) };
  let time = 0;
  const tagPos = new THREE.Vector3();
  const chest = new THREE.Vector3();
  const ray = new THREE.Ray();
  const tmpV = new THREE.Vector3();
  const wpV = new THREE.Vector3();

  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function update(dt) {
    visT += dt;
    if (visT > 0.2) { visT = 0; visCache.clear(); }
    let dx = 0, dz = 0;
    if (!paused && !busy) {
      if (keys.has('up')) { dx += fwd.x; dz += fwd.z; }
      if (keys.has('down')) { dx -= fwd.x; dz -= fwd.z; }
      if (keys.has('right')) { dx += right.x; dz += right.z; }
      if (keys.has('left')) { dx -= right.x; dz -= right.z; }
      if (keys.size) { tripRun = false; steer = null; }
      if (!dx && !dz && steer) {
        const tx = steer.x - player.x, tz = steer.z - player.z;
        const d = Math.hypot(tx, tz);
        if (d > 0.12) { dx = tx / d; dz = tz / d; }
      }
      if (!dx && !dz && path) {
        const wp = path[0];
        const tx = wp.x - player.x, tz = wp.z - player.z;
        const d = Math.hypot(tx, tz);
        if (d < 0.08) { path.shift(); if (!path.length) path = null; } else { dx = tx / d; dz = tz / d; }
      }
    }
    player.moving = false;
    const len = Math.hypot(dx, dz);
    const running = runToggle || shiftDown || tripRun;
    if (len > 0) {
      let step = (running ? RUN_SPEED : WALK_SPEED) * dt;
      if (path && !keys.size) step = Math.min(step, Math.hypot(path[0].x - player.x, path[0].z - player.z));
      const moved = tryMove((dx / len) * step, (dz / len) * step);
      player.yaw = angleLerp(player.yaw, Math.atan2(dx, dz), Math.min(1, dt * 12));
      if (moved) { player.moving = true; stuck = 0; } else if (path) { stuck += dt; if (stuck > 0.3) path = null; }
    }

    // 가장 가까운 상호작용 지점
    let best = null, bestD = NEAR_DIST;
    for (const it of area.inters) {
      if (!visibleInter(it)) continue;
      const d = Math.hypot(player.x - it.x, player.z - it.z);
      if (d < bestD) { best = it; bestD = d; }
    }
    if (best !== near) {
      near = best;
      options.onNear?.(best ? best.id : null);
    }
    if (pending && !path && !steer) {
      const it = pending;
      pending = null;
      if (near === it) activate(it);
    }

    // 조사 표시 + 바닥 고리 + 하이라이트
    const refreshKinds = visT === 0;
    for (const it of area.inters) {
      const vis = visibleInter(it);
      if (refreshKinds) {
        const k = kindOf(it.id);
        if (k !== it.kind) { it.kind = k; it.sprite.material.map = markerTex[k]; }
      }
      const d = Math.hypot(player.x - it.x, player.z - it.z);
      const k = it.kind;
      // 문제·석단은 멀리서도 보이고, 나머지는 가까이 가야 보임
      const range = k === 'puzzle' || k === 'final' ? 60 : k === 'story' || k === 'door' || k === 'exit' ? 15 : 8;
      let prox = vis ? Math.max(0, Math.min(1, (range - d) / 3)) : 0;
      if ((k === 'story' || k === 'flavor') && !options.game?.isNew(it.id)) prox *= 0.55;
      it.glowT += ((it === near ? 1 : 0) - it.glowT) * Math.min(1, dt * 6);
      it.sprite.material.opacity = prox;
      it.sprite.position.y = it.baseY + Math.abs(Math.sin(time * 2.2 + it.z)) * 0.18;
      const sc = (k === 'flavor' || k === 'done' ? 0.032 : 0.042) * (1 + it.glowT * 0.18);
      it.sprite.scale.set(sc, sc * 1.25, 1);
      const ringOn = vis && (k === 'puzzle' || k === 'final') && it !== near;
      it.groundRing.visible = ringOn;
      if (ringOn) {
        it.groundRing.material.color.setHex(RING_COLOR[k]);
        const ph = (time * 0.9 + it.x * 0.1) % 1;
        it.groundRing.scale.setScalar(0.8 + ph * 0.7);
        it.groundRing.material.opacity = (1 - ph) * 0.85;
      }
      if (it.highlight) it.highlight(it.glowT, time);
    }
    if (near) {
      area.toWorld(near.x, near.z, 0.04, ring.position);
      ring.material.opacity = 0.55 + Math.sin(time * 4) * 0.25;
    } else ring.material.opacity = Math.max(0, ring.material.opacity - dt * 3);

    // 애니메이션
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      tw.fn(tw.ease(tw.t));
      if (tw.t >= 1) { tweens.splice(i, 1); tw.resolve(); }
    }
    B.update?.(dt, time, area.id);
    updateSnow(dt, time);
    if (area.env.followLamp) area.toWorld(player.x, player.z, 1.4, lamp.position);

    // 캐릭터
    const wp = area.toWorld(player.x, player.z, 0, wpV);
    avatar.root.position.copy(wp);
    avatar.root.rotation.y = player.yaw;
    avatar.update(dt, player.moving, time, player.moving && running);
    if (!path && !steer) tripRun = false;
    if (rippleT < 1) {
      rippleT = Math.min(1, rippleT + dt * 2.2);
      ripple.scale.setScalar(0.6 + rippleT * 1.4);
      ripple.material.opacity = (1 - rippleT) * 0.9;
    }
    blob.position.set(wp.x, 0.035, wp.z);

    // 카메라
    dist += (distTarget - dist) * Math.min(1, dt * 6);
    const k = Math.min(1, dt * 5);
    camTarget.x += (wp.x - camTarget.x) * k;
    camTarget.z += (wp.z - camTarget.z) * k;
    camTarget.y = 0.9;
    camera.position.copy(camTarget).addScaledVector(camDir, dist);
    if (shake > 0) {
      shake = Math.max(0, shake - dt);
      camera.position.x += (Math.random() - 0.5) * shake * 0.25;
      camera.position.y += (Math.random() - 0.5) * shake * 0.25;
    }
    camera.lookAt(camTarget);

    // 가리는 집·나무 반투명
    if (area.fadeables.length) {
      chest.set(wp.x, 1.0, wp.z);
      ray.origin.copy(camera.position);
      ray.direction.copy(chest).sub(camera.position);
      const toPlayer = ray.direction.length();
      ray.direction.normalize();
      for (const f of area.fadeables) {
        const hitP = ray.intersectBox(f.box, tmpV);
        const occl = hitP && camera.position.distanceTo(hitP) < toPlayer - 0.4 && (f.item.occludeTest ? f.item.occludeTest(player) : true);
        const target = occl ? 0.28 : 1;
        if (Math.abs(f.op - target) < 0.001) continue;
        f.op += (target - f.op) * Math.min(1, dt * 8);
        if (Math.abs(f.op - target) < 0.01) f.op = target;
        const trans = f.op < 0.999;
        for (const m of f.mats) {
          if (m.transparent !== (trans || m.userData.baseTransparent)) { m.transparent = trans || m.userData.baseTransparent; m.needsUpdate = true; }
          m.opacity = (m.userData.baseOpacity ?? 1) * f.op;
          m.depthWrite = !trans;
        }
      }
    }
  }

  function updateTag() {
    if (tag.hidden) return;
    tagPos.set(avatar.root.position.x, avatar.height + 0.3, avatar.root.position.z).project(camera);
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + (tagPos.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-tagPos.y * 0.5 + 0.5) * rect.height;
    tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  // ---------------- 시작 ----------------
  // 모든 구역 · 반투명 상태의 셰이더를 미리 만들어 둠 (처음 들어갈 때 멈칫하는 현상 방지)
  function precompile() {
    const all = Object.values(areas);
    const fadeMats = all.flatMap((a) => a.fadeables.flatMap((f) => f.mats));
    all.forEach((a) => { a.root.visible = true; });
    snowPts.visible = true;
    try {
      renderer.compile(scene, camera);
      fadeMats.forEach((m) => { m.transparent = true; m.needsUpdate = true; });
      renderer.compile(scene, camera);
    } catch (e) {
      console.warn('[hanok] 셰이더 미리 준비 실패 (계속 진행)', e);
    } finally {
      fadeMats.forEach((m) => { m.transparent = !!m.userData.baseTransparent; m.needsUpdate = true; });
    }
  }
  snapCamera();
  camera.position.copy(camTarget).addScaledVector(camDir, dist);
  camera.lookAt(camTarget);
  precompile();
  applyEnv(area);
  applyState(options.state || {});
  snapCamera();
  resize();
  update(0);
  try {
    composer.render();
  } catch (err) {
    tag.remove();
    renderer.dispose();
    throw err;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { keys.clear(); shiftDown = false; });
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); downInfo = null; });
  canvas.addEventListener('wheel', onWheel, { passive: false });

  let last = performance.now();
  let frameAcc = 0, frameN = 0, lastAdjust = 0, raf = 0, suspended = false;
  function loop(now) {
    if (suspended) { raf = 0; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    update(dt);
    composer.render();
    updateTag();
    // 프레임이 버거우면 빛 번짐 → 해상도 순으로 낮추고, 여유가 생기면 천천히 되돌림
    frameAcc += dt; frameN++;
    if (frameN >= 90) {
      const avg = frameAcc / frameN;
      frameAcc = 0; frameN = 0;
      if (time - lastAdjust > 2 && avg > 0.021) {
        if (bloom.enabled) { bloomAllowed = false; bloom.enabled = false; }
        else if (pixelRatio > 0.7) { pixelRatio = Math.max(0.7, +(pixelRatio - 0.15).toFixed(2)); renderer.setPixelRatio(pixelRatio); resize(); }
        lastAdjust = time;
      } else if (time - lastAdjust > 8 && avg < 0.0125 && pixelRatio < MAX_PR) {
        pixelRatio = Math.min(MAX_PR, +(pixelRatio + 0.1).toFixed(2));
        renderer.setPixelRatio(pixelRatio);
        resize();
        lastAdjust = time;
      }
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  setTimeout(() => { if (charLib) prefetchCharacters(charLib, [1, 2, 3, 4].map((k) => (options.look.seed || 0) + k)); }, 400);

  const api = {
    mode: '3d',
    enterArea,
    fx,
    openStairs,
    get area() { return area.id; },
    getPlayer: () => ({ x: player.x, z: player.z, yaw: player.yaw }),
    setLook(look, nickname) {
      tag.textContent = nickname || '';
      tag.hidden = !nickname;
      const token = (lookToken = lookToken + 1);
      makeAvatar(look).then((a) => {
        if (token !== lookToken) return;
        scene.remove(avatar.root);
        avatar = a;
        scene.add(avatar.root);
      });
    },
    setSuspended(v) {
      if (v === suspended) return;
      suspended = v;
      if (!v && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    },
    setPaused(p) { paused = p; keys.clear(); if (p) { path = null; pending = null; } },
    activateNear() { if (near) activate(near); },
    refreshNear() { near = null; },
    setRunning(v) { runToggle = !!v; },
    getPreview() {
      if (!charLib) return null;
      if (!preview) preview = createCharacterPreview(charLib);
      return preview;
    },
    destroy() { cancelAnimationFrame(raf); tag.remove(); renderer.dispose(); },
  };
  if (new URLSearchParams(location.search).has('debug')) {
    window.__hanok = { areas, player, api, teleport(x, z) { player.x = x; player.z = z; }, scene, camera };
  }
  return api;
}
