export interface Scheme {
  id: string;
  label: string;
  bg: string;
  line: string;
  accent: string;
  tFill: string;
  tStroke: string;
  card: string;
  cardBorder: string;
}

export const SCHEMES: Scheme[] = [
  { id: "manga",  label: "マンガ",   bg: "#ffffff", line: "#111111", accent: "#FFE600", tFill: "#111111", tStroke: "#ffffff", card: "#ffffff", cardBorder: "#111111" },
  { id: "shock",  label: "衝撃",     bg: "#111111", line: "#FFE600", accent: "#ffffff", tFill: "#ff2d55", tStroke: "#ffffff", card: "#ffffff", cardBorder: "#FFE600" },
  { id: "retro",  label: "昭和",     bg: "#f5ecd7", line: "#3b2a14", accent: "#cc3300", tFill: "#cc3300", tStroke: "#f5ecd7", card: "#fffff0", cardBorder: "#3b2a14" },
  { id: "neon",   label: "ネオン",   bg: "#0a0020", line: "#00ffcc", accent: "#ff00ff", tFill: "#ff00ff", tStroke: "#ffffff", card: "#ffffff", cardBorder: "#00ffcc" },
];

export const IMPACT_PRESETS = ["なんと！？", "マジか！", "えっ！？", "信じられない！", "ウソだろ！", "やばすぎる", "天才！！"];

// ---- キラキラカラープリセット ----
export const SPARKLE_COLORS: Record<string, { color: string; label: string }> = {
  white:  { color: "#ffffff", label: "白" },
  gold:   { color: "#ffd700", label: "金" },
  pink:   { color: "#ffb0d0", label: "桜" },
  rainbow: { color: "rainbow", label: "虹" },
};

export interface DrawOptions {
  scheme: Scheme;
  impactText: string;
  textPos: "top" | "bottom";
  lineCount: number;
  intensity: number;
  burstEdge: boolean;
  halftone: boolean;
  textSize: number;
  watercolor: boolean;
  watercolorStrength: number;
  sparkle: boolean;
  sparkleCount: number;
  sparkleColorId: string;
}

// ================================================================
// ---- 水彩エフェクト ----
// ================================================================

function clamp(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}

function posterizeVal(v: number, levels: number): number {
  return Math.round(Math.round((v / 255) * levels) / levels * 255);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function applyWatercolor(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  strength: number
) {
  const W = Math.round(dw), H = Math.round(dh);
  const src = makeCanvas(W, H);
  const sc = src.getContext("2d")!;
  sc.drawImage(img, 0, 0, W, H);

  const bAmt = Math.max(3, Math.round(W * 0.015 * strength));
  const blur1 = makeCanvas(W, H);
  const b1 = blur1.getContext("2d")!;
  b1.filter = `blur(${bAmt}px)`;
  b1.drawImage(src, 0, 0);
  b1.filter = "none";

  const blur2 = makeCanvas(W, H);
  const b2 = blur2.getContext("2d")!;
  b2.filter = `blur(${Math.max(1, Math.round(bAmt * 0.3))}px)`;
  b2.drawImage(src, 0, 0);
  b2.filter = "none";

  const combined = makeCanvas(W, H);
  const cc = combined.getContext("2d")!;
  cc.drawImage(blur1, 0, 0);
  cc.globalAlpha = 0.55;
  cc.drawImage(blur2, 0, 0);
  cc.globalAlpha = 1;

  const imgd = cc.getImageData(0, 0, W, H);
  const d = imgd.data;
  const levels = Math.round(6 - strength * 2.5);
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = posterizeVal(d[i],     levels);
    d[i + 1] = posterizeVal(d[i + 1], levels);
    d[i + 2] = posterizeVal(d[i + 2], levels);
  }
  const nAmp = 22 * strength;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * nAmp;
    d[i]     = clamp(d[i]     + n);
    d[i + 1] = clamp(d[i + 1] + n);
    d[i + 2] = clamp(d[i + 2] + n);
  }
  const sat = 1 + 0.25 * strength;
  for (let i = 0; i < d.length; i += 4) {
    const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
    d[i]     = clamp(avg + (d[i]     - avg) * sat);
    d[i + 1] = clamp(avg + (d[i + 1] - avg) * sat);
    d[i + 2] = clamp(avg + (d[i + 2] - avg) * sat);
  }
  cc.putImageData(imgd, 0, 0);

  ctx.save();
  ctx.drawImage(combined, dx, dy, dw, dh);
  const edge = makeCanvas(W, H);
  const ec = edge.getContext("2d")!;
  ec.filter = "blur(1px)";
  ec.drawImage(src, 0, 0);
  ec.filter = "none";
  ctx.globalAlpha = 0.18 * strength;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(edge, dx, dy, dw, dh);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(dx, dy, dw, dh);
  ctx.restore();
}

// ================================================================
// ---- キラキラ（✨）描画 ----
// ================================================================

const RAINBOW_HUE = ["#ff6b6b", "#ffd700", "#69ff69", "#6bf", "#c084fc", "#ff8ad8"];

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
  color: string,
  rotation: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // グロー
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.9);
  grd.addColorStop(0, color + "cc");
  grd.addColorStop(1, color + "00");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.9, 0, Math.PI * 2);
  ctx.fill();

  // 長い光芒（4方向）
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.13, size * 0.36);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.13, size * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 短い光芒（斜め4方向）
  ctx.globalAlpha = 0.52;
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * Math.PI * 2 + Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.09, size * 0.21);
    ctx.lineTo(0, size * 0.56);
    ctx.lineTo(-size * 0.09, size * 0.21);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 中心の白丸
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSparkles(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  count: number,
  colorId: string
) {
  const isRainbow = colorId === "rainbow";
  const baseColor = SPARKLE_COLORS[colorId]?.color ?? "#ffffff";

  for (let i = 0; i < count; i++) {
    // 疑似ランダム（シード固定なので再描画で位置が変わらない）
    const rng = (n: number) => {
      const x = Math.sin(i * 9301 + n * 49297 + 233) * 43758.5453;
      return x - Math.floor(x);
    };
    const x    = rng(1) * W;
    const y    = rng(2) * H;
    const size = (rng(3) * 0.5 + 0.28) * W * 0.023;
    const rot  = rng(4) * Math.PI;
    const color = isRainbow
      ? RAINBOW_HUE[Math.floor(rng(5) * RAINBOW_HUE.length)]
      : baseColor;

    ctx.save();
    ctx.globalAlpha = 0.62 + rng(6) * 0.38;
    drawSparkle(ctx, x, y, size, color, rot);
    ctx.restore();
  }
}

// ================================================================
// ---- プラカードテキスト ----
// ================================================================

function drawPlacard(
  ctx: CanvasRenderingContext2D,
  W: number,
  scheme: Scheme,
  text: string,
  tSize: number,
  alignTop: boolean,
  edgeMargin: number
) {
  const cx = W / 2;
  const padX = 32, padY = 14;
  ctx.font = `900 ${tSize}px 'Arial Black', Impact, sans-serif`;
  const tw = ctx.measureText(text).width;
  const cardW = Math.min(tw + padX * 2, W - 24);
  const cardH = tSize + padY * 2;
  const cardX = cx - cardW / 2;
  const cardY = alignTop ? edgeMargin : W - edgeMargin - cardH;
  const rx = 8;

  ctx.fillStyle = scheme.cardBorder;
  ctx.beginPath();
  (ctx as any).roundRect(cardX + 5, cardY + 5, cardW, cardH, rx);
  ctx.fill();

  ctx.fillStyle = scheme.card;
  ctx.beginPath();
  (ctx as any).roundRect(cardX, cardY, cardW, cardH, rx);
  ctx.fill();

  ctx.strokeStyle = scheme.cardBorder;
  ctx.lineWidth = 3;
  ctx.beginPath();
  (ctx as any).roundRect(cardX, cardY, cardW, cardH, rx);
  ctx.stroke();

  ctx.save();
  ctx.font = `900 ${tSize}px 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = tSize * 0.12;
  ctx.strokeStyle = scheme.tStroke;
  ctx.lineJoin = "round";
  ctx.strokeText(text, cx, cardY + padY);
  ctx.fillStyle = scheme.tFill;
  ctx.fillText(text, cx, cardY + padY);
  ctx.restore();
}

// ================================================================
// ---- メイン描画 ----
// ================================================================

export function drawAll(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  opts: DrawOptions
) {
  const {
    scheme, impactText, textPos, lineCount, intensity,
    burstEdge, halftone, textSize,
    watercolor, watercolorStrength,
    sparkle, sparkleCount, sparkleColorId,
  } = opts;

  const ctx = canvas.getContext("2d")!;
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const maxDist = Math.sqrt(W * W + H * H);

  // --- 背景 ---
  ctx.fillStyle = scheme.bg;
  ctx.fillRect(0, 0, W, H);

  // --- ハーフトーン ---
  if (halftone) {
    const dotGap = Math.round(W / 20);
    ctx.fillStyle = scheme.line + "22";
    for (let x = 0; x < W; x += dotGap) {
      for (let y = 0; y < H; y += dotGap) {
        ctx.beginPath();
        ctx.arc(x, y, dotGap * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- バースト背景 ---
  if (burstEdge) {
    const spikes = 28;
    const outerR = maxDist / 1.7;
    const innerR = outerR * 0.72;
    ctx.fillStyle = scheme.accent + "28";
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // --- 集中線 ---
  ctx.strokeStyle = scheme.line;
  const lineAlpha = watercolor ? 0.4 : 1.0;
  for (let i = 0; i < lineCount; i++) {
    const baseAngle = (i / lineCount) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 0.08;
    const angle = baseAngle + jitter;
    const gap = (0.2 + Math.random() * 0.4) * ((Math.PI * 2) / lineCount);
    const startR = 25 + Math.random() * 20;
    ctx.lineWidth = (0.6 + Math.random() * 2.5) * intensity;
    ctx.globalAlpha = (0.5 + Math.random() * 0.5) * lineAlpha;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
    ctx.lineTo(cx + Math.cos(angle + gap / 2) * maxDist, cy + Math.sin(angle + gap / 2) * maxDist);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // --- 画像（水彩エフェクト含む）---
  if (img) {
    const pad = 0.08;
    const scale = Math.min((W * (1 - pad * 2)) / img.width, (H * (1 - pad * 2)) / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const ix = (W - iw) / 2;
    const iy = (H - ih) / 2;
    if (watercolor) {
      applyWatercolor(ctx, img, ix, iy, iw, ih, watercolorStrength);
    } else {
      ctx.drawImage(img, ix, iy, iw, ih);
    }
  }

  // --- ✨キラキラ ---
  if (sparkle) {
    drawSparkles(ctx, W, H, sparkleCount, sparkleColorId);
  }

  // --- テキスト ---
  if (!impactText) return;
  const tSize = Math.round(W * (textSize / 100));
  const margin = 16;
  if (textPos === "top")    drawPlacard(ctx, W, scheme, impactText, tSize, true,  margin);
  if (textPos === "bottom") drawPlacard(ctx, W, scheme, impactText, tSize, false, margin);
}
