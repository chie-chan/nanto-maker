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

export interface DrawOptions {
  scheme: Scheme;
  impactText: string;
  textPos: "top" | "bottom" | "both";
  lineCount: number;
  intensity: number;
  burstEdge: boolean;
  halftone: boolean;
  textSize: number; // percent of canvas width
}

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

  // shadow
  ctx.fillStyle = scheme.cardBorder;
  ctx.beginPath();
  (ctx as any).roundRect(cardX + 5, cardY + 5, cardW, cardH, rx);
  ctx.fill();

  // bg
  ctx.fillStyle = scheme.card;
  ctx.beginPath();
  (ctx as any).roundRect(cardX, cardY, cardW, cardH, rx);
  ctx.fill();

  // border
  ctx.strokeStyle = scheme.cardBorder;
  ctx.lineWidth = 3;
  ctx.beginPath();
  (ctx as any).roundRect(cardX, cardY, cardW, cardH, rx);
  ctx.stroke();

  // text
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

export function drawAll(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  opts: DrawOptions
) {
  const { scheme, impactText, textPos, lineCount, intensity, burstEdge, halftone, textSize } = opts;
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const maxDist = Math.sqrt(W * W + H * H);

  // --- Background ---
  ctx.fillStyle = scheme.bg;
  ctx.fillRect(0, 0, W, H);

  // --- Halftone dots ---
  if (halftone) {
    const dotGap = Math.round(W / 20);
    ctx.fillStyle = scheme.line + "22";
    for (let x = 0; x < W; x += dotGap) {
      for (let y = 0; y < H; y += dotGap) {
        const r = dotGap * 0.18;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- Burst background ---
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

  // --- Concentration lines ---
  ctx.strokeStyle = scheme.line;
  for (let i = 0; i < lineCount; i++) {
    const baseAngle = (i / lineCount) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 0.08;
    const angle = baseAngle + jitter;
    const gap = (0.2 + Math.random() * 0.4) * ((Math.PI * 2) / lineCount);
    const startR = 25 + Math.random() * 20;
    ctx.lineWidth = (0.6 + Math.random() * 2.5) * intensity;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
    ctx.lineTo(cx + Math.cos(angle + gap / 2) * maxDist, cy + Math.sin(angle + gap / 2) * maxDist);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // --- Image ---
  if (img) {
    const pad = 0.08;
    const scale = Math.min((W * (1 - pad * 2)) / img.width, (H * (1 - pad * 2)) / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
  }

  // --- Placard text ---
  if (!impactText) return;
  const tSize = Math.round(W * (textSize / 100));
  const margin = 16;

  if (textPos === "top" || textPos === "both") {
    drawPlacard(ctx, W, scheme, impactText, tSize, true, margin);
  }
  if (textPos === "bottom" || textPos === "both") {
    drawPlacard(ctx, W, scheme, impactText, tSize, false, margin);
  }
}
