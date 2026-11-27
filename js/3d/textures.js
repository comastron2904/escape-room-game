// 한옥마을용 절차적 텍스처 (이미지 파일 없이 캔버스로 그립니다)
import * as THREE from 'three';

export const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
export const SERIF = '"Noto Serif KR", "Nanum Myeongjo", "AppleMyungjo", "Batang", serif';

export function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let maxAniso = 8;
let TEX_SEASON = 'winter';
export function setTextureSeason(v) { TEX_SEASON = v || 'winter'; }
export function setMaxAnisotropy(v) { maxAniso = Math.min(16, v || 1); }

export function canvasTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function grain(ctx, w, h, amount, r, light = 0.05, dark = 0.08, size = 1.6) {
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * light})` : `rgba(0,0,0,${r() * dark})`;
    ctx.fillRect(r() * w, r() * h, size, size);
  }
}

// 흙 마당 (다진 황토)
export function earthTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(11);
    ctx.fillStyle = '#c9ad84';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = r() * w, y = r() * h, s = 20 + r() * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      const c = r() > 0.5 ? '214,190,150' : '170,140,100';
      g.addColorStop(0, `rgba(${c},0.35)`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    // 잔돌
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(${120 + r() * 80},${100 + r() * 70},${80 + r() * 50},${0.4 + r() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 1 + r() * 2.6, 1 + r() * 2, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, w, h, 9000, r, 0.06, 0.08);
  }, { repeat: [1, 1] });
}

// 잔디
export function grassTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(23);
    ctx.fillStyle = '#6f8f46';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = r() * h, s = 30 + r() * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      const c = r() > 0.5 ? '140,170,80' : '80,110,50';
      g.addColorStop(0, `rgba(${c},0.4)`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    for (let i = 0; i < 7000; i++) {
      const x = r() * w, y = r() * h;
      ctx.strokeStyle = `rgba(${60 + r() * 90},${100 + r() * 90},${30 + r() * 40},${0.35 + r() * 0.4})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5);
      ctx.stroke();
    }
  }, { repeat: [1, 1] });
}

// 박석 길 (넓적한 돌을 깐 길)
export function flagstoneTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(37);
    ctx.fillStyle = '#7d7468';
    ctx.fillRect(0, 0, w, h);
    const rows = 4;
    for (let row = 0; row < rows; row++) {
      let x = -r() * 60;
      const y0 = (row * h) / rows;
      while (x < w) {
        const sw = 70 + r() * 70;
        const shade = 150 + r() * 40;
        ctx.fillStyle = `rgb(${shade},${shade - 6},${shade - 14})`;
        const pad = 4;
        ctx.beginPath();
        ctx.roundRect(x + pad, y0 + pad, sw - pad * 2, h / rows - pad * 2, 14);
        ctx.fill();
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
          ctx.fillRect(x + r() * sw, y0 + r() * (h / rows), 2 + r() * 6, 2 + r() * 4);
        }
        x += sw;
      }
    }
    grain(ctx, w, h, 6000, r, 0.07, 0.07);
  }, { repeat: [1, 1] });
}

// 기와 (암키와/수키와 줄)
export function roofTileTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(41);
    ctx.fillStyle = '#3a3c40';
    ctx.fillRect(0, 0, w, h);
    const cols = 8;
    const cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      // 골 (암키와)
      const g = ctx.createLinearGradient(x, 0, x + cw, 0);
      g.addColorStop(0, '#2a2c30');
      g.addColorStop(0.5, '#45484d');
      g.addColorStop(1, '#2a2c30');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, cw, h);
      // 수키와 (둥근 줄)
      const g2 = ctx.createLinearGradient(x + cw * 0.78, 0, x + cw * 1.22, 0);
      g2.addColorStop(0, '#1c1d20');
      g2.addColorStop(0.45, '#6a6d72');
      g2.addColorStop(1, '#1c1d20');
      ctx.fillStyle = g2;
      ctx.fillRect(x + cw * 0.78, 0, cw * 0.44, h);
    }
    // 기와 마디
    for (let y = 0; y < h; y += h / 6) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, y + 2, w, 2);
    }
    grain(ctx, w, h, 2500, r, 0.05, 0.1);
  }, { repeat: [1, 1] });
}

// 초가 지붕 (볏짚)
export function thatchTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(53);
    ctx.fillStyle = '#b2915a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3500; i++) {
      const x = r() * w, y = r() * h;
      ctx.strokeStyle = `rgba(${150 + r() * 80},${120 + r() * 60},${60 + r() * 40},${0.5 + r() * 0.5})`;
      ctx.lineWidth = 0.8 + r();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 3, y + 8 + r() * 14);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 42) {
      ctx.fillStyle = 'rgba(70,50,20,0.25)';
      ctx.fillRect(0, y, w, 3);
    }
  }, { repeat: [1, 1] });
}

// 회벽 (흰 벽)
export function plasterTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(61);
    ctx.fillStyle = '#efe8da';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const x = r() * w, y = r() * h, s = 20 + r() * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, 'rgba(180,165,140,0.12)');
      g.addColorStop(1, 'rgba(180,165,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    grain(ctx, w, h, 4000, r, 0.05, 0.05);
  }, { repeat: [1, 1] });
}

// 창호지 + 띠살 문살
export function latticeTexture({ paper = '#f4ead2', wood = '#6b4527', kind = 'ttisal' } = {}) {
  return canvasTexture(256, 512, (ctx, w, h) => {
    const r = rand(71);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 2500, r, 0.08, 0.04);
    ctx.fillStyle = wood;
    const frame = 14;
    ctx.fillRect(0, 0, w, frame); ctx.fillRect(0, h - frame, w, frame);
    ctx.fillRect(0, 0, frame, h); ctx.fillRect(w - frame, 0, frame, h);
    if (kind === 'ttisal') {
      for (let i = 1; i < 6; i++) ctx.fillRect((w * i) / 6 - 2, 0, 4, h);
      for (const band of [0.12, 0.5, 0.88]) {
        for (let k = -2; k <= 2; k++) ctx.fillRect(0, h * band + k * 9 - 2, w, 4);
      }
    } else {
      // 용자살 / 격자
      for (let i = 1; i < 4; i++) ctx.fillRect((w * i) / 4 - 2, 0, 4, h);
      for (let i = 1; i < 8; i++) ctx.fillRect(0, (h * i) / 8 - 2, w, 4);
    }
  });
}

// 나뭇결
export function woodTexture(base = '#7a5232', seed = 81) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = r() > 0.5 ? `rgba(30,15,5,${0.08 + r() * 0.15})` : `rgba(255,220,170,${0.04 + r() * 0.06})`;
      ctx.lineWidth = 0.6 + r() * 2;
      ctx.beginPath();
      let x = r() * w;
      ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) { x += (r() - 0.5) * 5; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }, { repeat: [1, 1] });
}

// 마루 (긴 널빤지)
export function floorBoardTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(91);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const y = (h * i) / n;
      const shade = 120 + r() * 26;
      ctx.fillStyle = `rgb(${shade + 20},${shade - 18},${shade - 58})`;
      ctx.fillRect(0, y, w, h / n);
      for (let k = 0; k < 18; k++) {
        ctx.strokeStyle = `rgba(40,20,5,${0.06 + r() * 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const yy = y + r() * (h / n);
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 6, w * 0.6, yy + (r() - 0.5) * 6, w, yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,15,5,0.55)';
      ctx.fillRect(0, y, w, 2);
      const cut = r() * w;
      ctx.fillRect(cut, y, 2, h / n);
    }
  }, { repeat: [1, 1] });
}

// 장판 (콩기름 먹인 노란 바닥)
export function jangpanTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(101);
    ctx.fillStyle = '#d9a75a';
    ctx.fillRect(0, 0, w, h);
    const n = 4;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const s = r() * 0.12;
        ctx.fillStyle = `rgba(150,90,30,${s})`;
        ctx.fillRect((i * w) / n, (j * h) / n, w / n, h / n);
      }
    }
    ctx.strokeStyle = 'rgba(120,70,20,0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo((i * w) / n, 0); ctx.lineTo((i * w) / n, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i * h) / n); ctx.lineTo(w, (i * h) / n); ctx.stroke();
    }
    grain(ctx, w, h, 5000, r, 0.06, 0.05);
  }, { repeat: [1, 1] });
}

// 돌담 (둥근 돌 + 흙)
export function stoneWallTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    const r = rand(111);
    ctx.fillStyle = '#9b8a6e';
    ctx.fillRect(0, 0, w, h);
    const rows = 5;
    for (let row = 0; row < rows; row++) {
      let x = -r() * 40;
      const y = (row + 0.5) * (h / rows);
      while (x < w + 40) {
        const sw = 36 + r() * 46, sh = h / rows * (0.75 + r() * 0.25);
        const s = 110 + r() * 70;
        const g = ctx.createRadialGradient(x + sw * 0.4, y - sh * 0.2, 2, x + sw / 2, y, sw * 0.7);
        g.addColorStop(0, `rgb(${s + 30},${s + 26},${s + 18})`);
        g.addColorStop(1, `rgb(${s - 30},${s - 32},${s - 38})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + sw / 2, y, sw / 2 - 2, sh / 2 - 1, (r() - 0.5) * 0.3, 0, Math.PI * 2);
        ctx.fill();
        x += sw;
      }
    }
    grain(ctx, w, h, 4000, r, 0.05, 0.08);
  }, { repeat: [1, 1] });
}

// 석재 (기단, 비석)
export function graniteTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(121);
    ctx.fillStyle = '#a49c90';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = r();
      ctx.fillStyle = v > 0.6 ? `rgba(240,235,225,${r() * 0.25})` : v > 0.3 ? `rgba(40,35,30,${r() * 0.25})` : `rgba(150,120,100,${r() * 0.2})`;
      ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  }, { repeat: [1, 1] });
}

// 물 (연못)
export function waterTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(131);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2f5f66');
    g.addColorStop(1, '#244b55');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = `rgba(200,235,240,${0.05 + r() * 0.12})`;
      ctx.lineWidth = 1 + r();
      ctx.beginPath();
      const x = r() * w, y = r() * h, l = 10 + r() * 30;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + l / 2, y - 3, x + l, y);
      ctx.stroke();
    }
  }, { repeat: [1, 1] });
}

// 글씨 판 (현판·족자·비석 글씨 등)
export function textBoardTexture(lines, {
  w = 512, h = 256, bg = '#2b1a10', fg = '#f1d79a', font = SERIF, weight = 700, size = 64, border = '#a87a3a', vertical = false, paper = false,
} = {}) {
  return canvasTexture(w, h, (ctx) => {
    if (paper) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const r = rand(141);
      grain(ctx, w, h, 3000, r, 0.1, 0.05);
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const r = rand(151);
      grain(ctx, w, h, 2000, r, 0.04, 0.12);
    }
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(6, w * 0.02);
      ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${size}px ${font}`;
    const arr = Array.isArray(lines) ? lines : [lines];
    if (vertical) {
      // 세로쓰기: 오른쪽 줄부터
      const colW = w / (arr.length + 1);
      arr.forEach((line, i) => {
        const chars = [...line];
        const x = w - colW * (i + 1);
        const step = Math.min(size * 1.15, (h * 0.86) / chars.length);
        const y0 = h / 2 - (step * (chars.length - 1)) / 2;
        chars.forEach((ch, k) => ctx.fillText(ch, x, y0 + k * step));
      });
    } else {
      const lh = size * 1.25;
      const y0 = h / 2 - (lh * (arr.length - 1)) / 2;
      arr.forEach((line, i) => ctx.fillText(line, w / 2, y0 + i * lh, w * 0.9));
    }
  });
}

// 장승 얼굴
export function jangseungTexture(title, female = false) {
  return canvasTexture(256, 768, (ctx, w, h) => {
    const r = rand(female ? 161 : 171);
    ctx.fillStyle = '#9a7652';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(40,20,5,${0.08 + r() * 0.15})`;
      ctx.beginPath();
      let x = r() * w; ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 24) { x += (r() - 0.5) * 6; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // 관모
    ctx.fillStyle = female ? '#2a4a7a' : '#1d1a18';
    ctx.fillRect(0, 0, w, 120);
    // 눈썹·눈
    ctx.strokeStyle = '#1a120c'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(w / 2 + s * 20, 170); ctx.quadraticCurveTo(w / 2 + s * 60, 140, w / 2 + s * 100, 175); ctx.stroke();
      ctx.fillStyle = '#f6ecd8';
      ctx.beginPath(); ctx.ellipse(w / 2 + s * 58, 205, 30, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141010';
      ctx.beginPath(); ctx.arc(w / 2 + s * 58, 207, 14, 0, Math.PI * 2); ctx.fill();
    }
    // 코
    ctx.fillStyle = '#7a5838';
    ctx.beginPath(); ctx.ellipse(w / 2, 270, 26, 34, 0, 0, Math.PI * 2); ctx.fill();
    // 입 + 이빨
    ctx.fillStyle = '#7a1e16';
    ctx.beginPath(); ctx.ellipse(w / 2, 335, 62, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2ead6';
    for (let i = -3; i <= 3; i++) ctx.fillRect(w / 2 + i * 15 - 6, 318, 12, 14);
    if (!female) {
      ctx.fillStyle = '#f2ead6';
      ctx.beginPath(); ctx.moveTo(w / 2 - 50, 335); ctx.lineTo(w / 2 - 40, 372); ctx.lineTo(w / 2 - 32, 335); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w / 2 + 50, 335); ctx.lineTo(w / 2 + 40, 372); ctx.lineTo(w / 2 + 32, 335); ctx.fill();
    }
    if (female) {
      ctx.fillStyle = 'rgba(200,60,60,0.5)';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(w / 2 + s * 80, 280, 18, 0, Math.PI * 2); ctx.fill(); }
    }
    // 글씨 (세로)
    ctx.fillStyle = '#1a120c';
    ctx.font = `900 50px ${SERIF}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [...title].forEach((ch, i) => ctx.fillText(ch, w / 2, 430 + i * 62));
  });
}

// 바닥 원형 그림자
export function softShadowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
}

// 빛 번짐
export function glowTexture(color = '255,215,140') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, `rgba(${color},0.95)`);
    g.addColorStop(0.35, `rgba(${color},0.35)`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// 반짝이 (조사할 수 있는 곳 표시)
export function sparkleTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(0.18, 'rgba(255,225,140,0.85)');
    g.addColorStop(0.5, 'rgba(255,200,100,0.15)');
    g.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,240,0.95)';
    ctx.beginPath();
    const c = w / 2;
    ctx.moveTo(c, 6); ctx.quadraticCurveTo(c, c, w - 6, c); ctx.quadraticCurveTo(c, c, c, h - 6);
    ctx.quadraticCurveTo(c, c, 6, c); ctx.quadraticCurveTo(c, c, c, 6);
    ctx.fill();
  });
}

// 단청 띠 (처마 아래 색 띠)
export function dancheongTexture() {
  return canvasTexture(512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#2f6e5a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b8352c';
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = '#e8c35a';
      ctx.beginPath(); ctx.arc(x + 32, h / 2, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8352c';
      ctx.beginPath(); ctx.arc(x + 32, h / 2, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3ecdc';
      ctx.fillRect(x + 2, 14, 6, h - 28);
    }
  }, { repeat: [1, 1] });
}

// 윷판 (말판)
export function yutBoardTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e9dcc0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#7a1e16'; ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
    const m = 70, s = w - m * 2;
    ctx.strokeRect(m, m, s, s);
    ctx.beginPath(); ctx.moveTo(m, m); ctx.lineTo(m + s, m + s); ctx.moveTo(m + s, m); ctx.lineTo(m, m + s); ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    for (let i = 0; i <= 5; i++) {
      for (const [x, y] of [[m + (s * i) / 5, m], [m + (s * i) / 5, m + s], [m, m + (s * i) / 5], [m + s, m + (s * i) / 5]]) {
        ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 16 : 10, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const t of [1 / 6, 2 / 6, 4 / 6, 5 / 6]) {
      for (const [x, y] of [[m + s * t, m + s * t], [m + s * (1 - t), m + s * t]]) {
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 18, 0, Math.PI * 2); ctx.fill();
  });
}

// 병풍 그림 (사군자 한 폭)
export function plantPanelTexture(kind) {
  return canvasTexture(256, 512, (ctx, w, h) => {
    const r = rand(kind.length * 31 + 7);
    ctx.fillStyle = '#efe4c8';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 2500, r, 0.08, 0.05);
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.lineCap = 'round';
    if (kind === 'plum') {
      ctx.strokeStyle = '#2d2016'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(40, 470); ctx.bezierCurveTo(90, 360, 60, 260, 150, 160); ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(90, 320); ctx.lineTo(190, 280); ctx.moveTo(120, 220); ctx.lineTo(70, 140); ctx.stroke();
      for (let i = 0; i < 22; i++) {
        const x = 50 + r() * 160, y = 120 + r() * 300;
        ctx.fillStyle = '#d2475a';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#f5d36a';
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'orchid') {
      ctx.strokeStyle = '#26402a'; ctx.lineWidth = 4;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath(); ctx.moveTo(128, 470);
        const tx = 20 + r() * 216, ty = 120 + r() * 200;
        ctx.quadraticCurveTo(128 + (tx - 128) * 0.2, 300, tx, ty);
        ctx.stroke();
      }
      ctx.fillStyle = '#7b4c9a';
      for (let i = 0; i < 4; i++) {
        const x = 90 + r() * 80, y = 280 + r() * 100;
        ctx.beginPath(); ctx.ellipse(x, y, 12, 6, r() * 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 8, y - 6, 10, 5, r() * 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'chrys') {
      ctx.strokeStyle = '#33482c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(120, 480); ctx.lineTo(110, 230); ctx.moveTo(120, 400); ctx.lineTo(180, 280); ctx.moveTo(115, 350); ctx.lineTo(60, 300); ctx.stroke();
      for (const [x, y] of [[110, 220], [185, 270], [58, 290]]) {
        for (let p = 0; p < 16; p++) {
          const a = (p / 16) * Math.PI * 2;
          ctx.fillStyle = '#e2a52a';
          ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 12, 4, a, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#a8641a';
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#3d5a34';
      for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.ellipse(80 + r() * 90, 330 + r() * 130, 14, 7, r() * 3, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // 대나무
      for (const [x, wd] of [[80, 14], [150, 11], [195, 8]]) {
        ctx.strokeStyle = '#2f5a2e'; ctx.lineWidth = wd;
        ctx.beginPath(); ctx.moveTo(x, 490); ctx.lineTo(x + 6, 30); ctx.stroke();
        ctx.strokeStyle = '#1d3a1c'; ctx.lineWidth = wd + 4;
        for (let y = 80; y < 490; y += 70) { ctx.beginPath(); ctx.moveTo(x - wd / 2, y); ctx.lineTo(x + wd / 2 + 2, y); ctx.stroke(); }
      }
      ctx.fillStyle = '#2f5a2e';
      for (let i = 0; i < 18; i++) {
        const x = 60 + r() * 150, y = 40 + r() * 300;
        ctx.beginPath(); ctx.ellipse(x, y, 22, 5, -0.6 + r() * 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
}

// 자개 무늬
export function najeonTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(181);
    ctx.fillStyle = '#16110f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = r() * w, y = r() * h;
      const g = ctx.createLinearGradient(x - 10, y - 10, x + 10, y + 10);
      g.addColorStop(0, '#bfe6e0'); g.addColorStop(0.5, '#f2d9ef'); g.addColorStop(1, '#b8d3f5');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, 4 + r() * 10, 2 + r() * 4, r() * 3, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// ================= 겨울 =================
// 눈 덮인 땅
export function snowTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(901);
    ctx.fillStyle = '#eef2f7';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      const x = r() * w, y = r() * h, s = 20 + r() * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      const c = r() > 0.5 ? '255,255,255' : '190,205,225';
      g.addColorStop(0, `rgba(${c},0.45)`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = r() > 0.4 ? `rgba(255,255,255,${r() * 0.7})` : `rgba(150,170,200,${r() * 0.12})`;
      ctx.fillRect(r() * w, r() * h, 1.4, 1.4);
    }
  }, { repeat: [1, 1] });
}

// 사람이 다닌 눈길 (박석이 군데군데 드러남)
export function snowPathTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(911);
    ctx.fillStyle = '#c9ced6';
    ctx.fillRect(0, 0, w, h);
    const rows = 4;
    for (let row = 0; row < rows; row++) {
      let x = -r() * 60;
      const y0 = (row * h) / rows;
      while (x < w) {
        const sw = 70 + r() * 70;
        const s = 120 + r() * 30;
        ctx.fillStyle = `rgb(${s},${s - 4},${s - 10})`;
        ctx.beginPath();
        ctx.roundRect(x + 5, y0 + 5, sw - 10, h / rows - 10, 14);
        ctx.fill();
        x += sw;
      }
    }
    // 눈 얼룩
    for (let i = 0; i < 160; i++) {
      const x = r() * w, y = r() * h, s = 8 + r() * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, 'rgba(245,248,252,0.95)');
      g.addColorStop(1, 'rgba(245,248,252,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    grain(ctx, w, h, 4000, r, 0.08, 0.05);
  }, { repeat: [1, 1] });
}

// 눈 쌓인 기와
export function snowyRoofTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(921);
    ctx.fillStyle = '#3a3c40';
    ctx.fillRect(0, 0, w, h);
    const cols = 8, cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const g2 = ctx.createLinearGradient(x + cw * 0.78, 0, x + cw * 1.22, 0);
      g2.addColorStop(0, '#1c1d20'); g2.addColorStop(0.45, '#5a5d62'); g2.addColorStop(1, '#1c1d20');
      ctx.fillStyle = g2;
      ctx.fillRect(x + cw * 0.78, 0, cw * 0.44, h);
      // 골에 쌓인 눈
      const g = ctx.createLinearGradient(x, 0, x + cw * 0.8, 0);
      g.addColorStop(0, 'rgba(240,244,250,0.2)'); g.addColorStop(0.5, 'rgba(250,252,255,0.97)'); g.addColorStop(1, 'rgba(240,244,250,0.2)');
      ctx.fillStyle = g;
      ctx.fillRect(x + cw * 0.05, 0, cw * 0.7, h);
    }
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.6})`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
  }, { repeat: [1, 1] });
}

// 언 연못
export function iceTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(931);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#b9d4e3'); g.addColorStop(1, '#9fc0d4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = 0.6 + r();
      ctx.beginPath();
      let x = r() * w, y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, s = 10 + r() * 30;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, s);
      gg.addColorStop(0, 'rgba(255,255,255,0.5)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
  }, { repeat: [1, 1] });
}

// 눈송이
export function snowflakeTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// 석판 (눈사람이 든 칠판)
export function slateTexture(lines) {
  return textBoardTexture(lines, { w: 256, h: 192, bg: '#2c3a33', fg: '#f4f1e6', border: '#7a5232', size: 44, font: SERIF, weight: 700 });
}

// ================= 수풀 (알파 카드) =================
// kind: 'shrub' 상록 관목 잎 · 'needle' 솔잎 · 'twig' 잎 진 가지 · 'grass' 마른 풀(억새)
// 카드 위쪽일수록 눈이 얹힌 것처럼 그립니다.
export function foliageTexture(kind, seed = 1) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(seed * 7919 + kind.length * 31);
    ctx.clearRect(0, 0, w, h);
    const snowAt = (y) => TEX_SEASON === 'winter' && r() < Math.max(0, 0.55 - y / h) * 1.2; // 위쪽에 눈
    if (kind === 'shrub') {
      // 가운데가 빽빽한 둥근 잎 덩어리
      for (let i = 0; i < 520; i++) {
        const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * w * 0.46;
        const x = w / 2 + Math.cos(a) * rr, y = h * 0.55 + Math.sin(a) * rr * 0.85;
        if (y < 6 || y > h - 4) continue;
        const g = 55 + r() * 70;
        ctx.fillStyle = snowAt(y) && r() < 0.5 ? `rgb(${236 + r() * 15},${240 + r() * 12},${248})` : `rgb(${g * 0.45},${g},${g * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 4 + r() * 5, 2.5 + r() * 3, r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'needle') {
      // 아래로 처진 솔잎 가지 여러 개
      for (let b = 0; b < 7; b++) {
        const x0 = w * (0.1 + r() * 0.8), y0 = h * (0.1 + r() * 0.6);
        const len = 50 + r() * 70, dir = r() > 0.5 ? 1 : -1;
        ctx.strokeStyle = 'rgba(70,45,25,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dir * len, y0 + len * 0.25); ctx.stroke();
        for (let k = 0; k < 60; k++) {
          const t = r();
          const px = x0 + dir * len * t, py = y0 + len * 0.25 * t;
          const a = (r() - 0.5) * 2.4 + Math.PI / 2;
          const l = 7 + r() * 9;
          const snow = py < h * 0.45 && r() < 0.35;
          ctx.strokeStyle = snow ? 'rgba(245,248,252,0.95)' : `rgba(${30 + r() * 25},${70 + r() * 40},${35 + r() * 20},0.95)`;
          ctx.lineWidth = snow ? 2.4 : 1.3;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); ctx.stroke();
        }
      }
    } else if (kind === 'twig') {
      // 잎 진 관목 가지 (아래에서 위로 갈라짐)
      const branch = (x, y, ang, len, wd, depth) => {
        const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
        ctx.strokeStyle = `rgba(${80 + r() * 30},${55 + r() * 20},${40},1)`;
        ctx.lineWidth = wd;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        if (y2 < h * 0.5 && r() < 0.6) { ctx.strokeStyle = 'rgba(248,250,253,0.95)'; ctx.lineWidth = wd + 1.2; ctx.beginPath(); ctx.moveTo(x + 1, y - 1.5); ctx.lineTo(x2 + 1, y2 - 1.5); ctx.stroke(); }
        if (depth > 0) for (let k = 0; k < 2; k++) branch(x2, y2, ang + (r() - 0.5) * 1.1, len * (0.6 + r() * 0.2), Math.max(1, wd * 0.65), depth - 1);
      };
      for (let i = 0; i < 4; i++) branch(w / 2 + (r() - 0.5) * 30, h, -Math.PI / 2 + (r() - 0.5) * 0.8, 60 + r() * 25, 4, 4);
    } else {
      // 마른 풀 + 억새 이삭
      for (let i = 0; i < 70; i++) {
        const x = w * (0.15 + r() * 0.7), top = h * (0.08 + r() * 0.45);
        const bend = (r() - 0.5) * 50;
        const c = 150 + r() * 60;
        ctx.strokeStyle = `rgba(${c},${c * 0.8},${c * 0.5},0.95)`;
        ctx.lineWidth = 1 + r() * 1.5;
        ctx.beginPath(); ctx.moveTo(x, h); ctx.quadraticCurveTo(x, (h + top) / 2, x + bend, top); ctx.stroke();
        if (r() < 0.25) {
          ctx.fillStyle = 'rgba(235,225,205,0.9)';
          for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.ellipse(x + bend + (r() - 0.5) * 6, top + k * 2.5, 3, 1.2, 0.4, 0, Math.PI * 2); ctx.fill(); }
        }
      }
    }
  });
}

// ================= 조사 표시 (핀 모양) =================
// 흰 눈 배경에서도 잘 보이도록 진한 색 + 흰 테두리 + 어두운 외곽선
export const MARKER_STYLE = {
  puzzle: { fill: '#d63a2a', glyph: '?', label: '문제' },
  final: { fill: '#7b3fd1', glyph: '★', label: '석단' },
  story: { fill: '#2468d8', glyph: '!', label: '이야기' },
  door: { fill: '#23875a', glyph: '門', label: '집' },
  exit: { fill: '#2b8a95', glyph: '出', label: '나가기' },
  done: { fill: '#7d8794', glyph: '✓', label: '완료' },
  flavor: { fill: '#55657d', glyph: '…', label: '조사' },
};
export function markerTexture(kind) {
  const st = MARKER_STYLE[kind] || MARKER_STYLE.flavor;
  return canvasTexture(128, 160, (ctx, w) => {
    const cx = w / 2, cy = 56, R = 46;
    const pin = () => {
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI * 0.82, Math.PI * 0.18);
      ctx.lineTo(cx, 152);
      ctx.closePath();
    };
    // 그림자 겸 외곽선
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    pin();
    ctx.fillStyle = '#1b1410';
    ctx.fill();
    ctx.restore();
    ctx.lineJoin = 'round';
    pin();
    ctx.lineWidth = 12; ctx.strokeStyle = '#1b1410'; ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    pin();
    const g = ctx.createLinearGradient(0, cy - R, 0, 150);
    g.addColorStop(0, st.fill);
    g.addColorStop(1, shadeHex(st.fill, -0.18));
    ctx.fillStyle = g;
    ctx.fill();
    // 윗부분 광택
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy - 22, 22, 11, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
    // 글자
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const serif = /[門出]/.test(st.glyph);
    ctx.font = `900 ${serif ? 50 : 62}px ${serif ? SERIF : FONT}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeText(st.glyph, cx, cy + 3);
    ctx.fillText(st.glyph, cx, cy + 3);
  });
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}


// =====================================================================
// 테마별 텍스처
// =====================================================================
// 빗줄기 (세로로 긴 하얀 선)
export function rainTexture() {
  return canvasTexture(32, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(210,225,255,0)');
    g.addColorStop(0.6, 'rgba(210,225,255,0.55)');
    g.addColorStop(1, 'rgba(230,240,255,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(w / 2 - 1.5, 0, 3, h);
  });
}
// 낙엽 (흰색으로 그려 정점 색으로 물들임)
export function leafTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a2) * 12, Math.sin(a2) * 12);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.stroke();
  });
}
// 눈꽃 얼음판 (육각 눈꽃 무늬)
export function snowflakePlateTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#e8f6ff');
    g.addColorStop(0.7, '#9fd2ee');
    g.addColorStop(1, '#5d9ec8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * Math.PI * 2);
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -210); ctx.stroke();
      ctx.lineWidth = 8;
      for (const [y, l] of [[-70, 50], [-125, 62], [-175, 40]]) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(-l, y - l * 0.8); ctx.moveTo(0, y); ctx.lineTo(l, y - l * 0.8); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  });
}
// 팔괘 (팔각 석단 윗면)
export function trigramTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(717);
    ctx.fillStyle = '#5b5a5e';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 5000, r, 0.06, 0.12);
    ctx.translate(w / 2, h / 2);
    // 건·태·리·진·손·감·간·곤 (1=양효, 0=음효)
    const TRI = ['111', '011', '101', '001', '110', '010', '100', '000'];
    ctx.fillStyle = '#e8d6a0';
    TRI.forEach((t, i) => {
      ctx.save();
      ctx.rotate((i / 8) * Math.PI * 2);
      for (let k = 0; k < 3; k++) {
        const y = -200 + k * 22;
        if (t[k] === '1') ctx.fillRect(-46, y, 92, 13);
        else { ctx.fillRect(-46, y, 40, 13); ctx.fillRect(6, y, 40, 13); }
      }
      ctx.restore();
    });
    ctx.strokeStyle = 'rgba(232,214,160,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI * 2); ctx.stroke();
  });
}
// 부적 (노란 종이에 붉은 글씨)
export function talismanTexture(text = '勅令') {
  return canvasTexture(128, 256, (ctx, w, h) => {
    const r = rand(text.length * 97);
    ctx.fillStyle = '#e9c94e';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 900, r, 0.08, 0.06);
    ctx.strokeStyle = '#b1241a';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#b1241a';
    ctx.font = `900 46px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [...text].forEach((ch, i) => ctx.fillText(ch, w / 2, 56 + i * 52));
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w / 2, 56 + text.length * 52 - 10);
    for (let i = 0; i < 6; i++) ctx.lineTo(w / 2 + (i % 2 ? 18 : -18), 56 + text.length * 52 + i * 12);
    ctx.stroke();
  });
}
// 갈라진 얼음 / 번개 맞은 금 (빛나는 금)
export function crackTexture(color = '160,220,255') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const r = rand(999);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(${color},0.95)`;
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      ctx.lineWidth = 2 + r() * 3;
      ctx.beginPath();
      let x = w / 2, y = h / 2;
      ctx.moveTo(x, y);
      const a0 = (k / 7) * Math.PI * 2;
      for (let i = 0; i < 6; i++) {
        const a = a0 + (r() - 0.5) * 0.8;
        x += Math.cos(a) * 20; y += Math.sin(a) * 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}
// 바닥에 떨어진 단풍잎들 (알파)
export function leafLitterTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(4242);
    ctx.clearRect(0, 0, w, h);
    const cols = ['#b8401c', '#d8661e', '#e0a12a', '#9a2e1c', '#c8862a', '#7a4a1e'];
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = r() * h, s = 6 + r() * 9;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI * 2);
      ctx.fillStyle = cols[Math.floor(r() * cols.length)];
      ctx.globalAlpha = 0.75 + r() * 0.25;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.lineTo(Math.cos(a + 0.63) * s * 0.45, Math.sin(a + 0.63) * s * 0.45);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }, { repeat: [1, 1] });
}
// 젖은 흙 / 마른 흙 (색만 다른 흙 마당)
export function dirtTexture(base = '#5a4a3a', seed = 19) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rand(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const x = r() * w, y = r() * h, s = 20 + r() * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      const c = r() > 0.5 ? '255,255,255' : '0,0,0';
      g.addColorStop(0, `rgba(${c},0.08)`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${90 + r() * 60},${80 + r() * 50},${70 + r() * 40},${0.4 + r() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 1 + r() * 2.6, 1 + r() * 2, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, w, h, 9000, r, 0.05, 0.1);
  }, { repeat: [1, 1] });
}
