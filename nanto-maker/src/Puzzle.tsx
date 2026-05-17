import { useCallback, useEffect, useRef, useState } from "react";
import ShareBar from "./ShareBar";

interface Props { isMobile: boolean; dark: boolean; text: string; bg: string; }

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY: Record<Difficulty, { rows: number; cols: number; label: string; count: string }> = {
  easy:   { rows: 4, cols: 4, label: "やさしい", count: "16ピース" },
  normal: { rows: 5, cols: 5, label: "ふつう",   count: "25ピース" },
  hard:   { rows: 6, cols: 6, label: "こまかい", count: "36ピース" },
};

const PINK = "#ff7aa8";
const PINK_DARK = "#c94279";
const LAVENDER = "#c8b4e8";
const CANVAS_SIZE = 1080;
const MOBILE_CANVAS_HEIGHT = 1560;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Piece {
  id: number;
  poly: { x: number; y: number }[];   // normalized 0-1, target shape
  angle: number;                       // 0/90/180/270
  x: number; y: number;                // current center (canvas px)
  solved: boolean;
  placed: boolean;
}

function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
function mulberry32(seed: number) { return function() { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function formatTime(ms: number) { const t = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; }

function getPuzzleLayout(cw: number, ch: number, mobile: boolean): { board: Rect; tray?: Rect } {
  if (!mobile) return { board: { x: 0, y: 0, w: cw, h: ch } };

  const pad = Math.round(cw * 0.056);
  const boardSize = cw - pad * 2;
  const board = { x: pad, y: pad, w: boardSize, h: boardSize };
  const trayTop = board.y + board.h + Math.round(cw * 0.05);
  const tray = {
    x: pad,
    y: trayTop,
    w: boardSize,
    h: Math.max(260, ch - trayTop - pad),
  };
  return { board, tray };
}

function mapPoly(poly: { x: number; y: number }[], rect: Rect) {
  return poly.map(pt => ({ x: rect.x + pt.x * rect.w, y: rect.y + pt.y * rect.h }));
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
  const r = Math.min(radius, rect.w / 2, rect.h / 2);
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.lineTo(rect.x + rect.w - r, rect.y);
  ctx.quadraticCurveTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + r);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h - r);
  ctx.quadraticCurveTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - r, rect.y + rect.h);
  ctx.lineTo(rect.x + r, rect.y + rect.h);
  ctx.quadraticCurveTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - r);
  ctx.lineTo(rect.x, rect.y + r);
  ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y);
  ctx.closePath();
}

export default function Puzzle({ isMobile, dark, text }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const completeImgRef = useRef<HTMLImageElement>(null);

  const [phase, setPhase]           = useState<"upload" | "play" | "complete">("upload");
  const [imageEl, setImageEl]       = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName]   = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [moves, setMoves]           = useState(0);
  const [pieceCount, setPieceCount] = useState(0);
  const [timeLabel, setTimeLabel]   = useState("00:00");

  // Game state refs (avoid re-renders on every frame)
  const piecesRef    = useRef<Piece[]>([]);
  const dragRef      = useRef<{ piece: Piece; sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedRef   = useRef(0);
  const timerIdRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const movesRef     = useRef(0);
  const completedRef = useRef(false);

  /* ---------- canvas helpers ---------- */
  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const layout = getPuzzleLayout(cw, ch, isMobile);

    // background
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, "#fffaf4"); grad.addColorStop(0.5, "#fff5f8"); grad.addColorStop(1, "#f4fcf8");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch);

    // soft dots
    const dots: [number, number, string][] = [[0.14, 0.18, "#ffb3c8"], [0.86, 0.22, "#ffd28a"], [0.22, 0.82, "#a8e6d6"], [0.78, 0.86, "#ffc6dc"]];
    dots.forEach(([rx, ry, color]) => {
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(rx * cw, ry * ch, cw * 0.018, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    if (isMobile && layout.tray) {
      ctx.save();
      drawRoundedRect(ctx, layout.board, 28);
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fill();
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,122,168,0.38)";
      ctx.stroke();
      ctx.restore();

      ctx.save();
      drawRoundedRect(ctx, layout.tray, 28);
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.fill();
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(200,180,232,0.5)";
      ctx.stroke();
      ctx.fillStyle = "rgba(122,74,94,0.74)";
      ctx.font = "800 28px sans-serif";
      ctx.fillText("ピース置き場", layout.tray.x + 28, layout.tray.y + 42);
      ctx.restore();
    }

    if (!imageEl) return;

    // target outlines (dashed)
    ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = PINK; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.4;
    piecesRef.current.forEach(p => {
      if (p.solved) return;
      const poly = mapPoly(p.poly, layout.board);
      const path = new Path2D();
      poly.forEach((pt, i) => { i === 0 ? path.moveTo(pt.x, pt.y) : path.lineTo(pt.x, pt.y); });
      path.closePath(); ctx.stroke(path);
    });
    ctx.setLineDash([]); ctx.restore();

    // pieces (active/dragging on top)
    const ordered = [...piecesRef.current].sort((a, b) => {
      const aActive = dragRef.current?.piece === a ? 1 : 0;
      const bActive = dragRef.current?.piece === b ? 1 : 0;
      return aActive - bActive;
    });
    ordered.forEach(p => drawPiece(ctx, p, layout.board, cw, ch));
  }, [imageEl, isMobile]);

  const drawPiece = (ctx: CanvasRenderingContext2D, piece: Piece, board: Rect, cw: number, ch: number) => {
    if (!imageEl) return;
    const target = mapPoly(piece.poly, board);
    const targetC = { x: target.reduce((s, p) => s + p.x, 0) / target.length, y: target.reduce((s, p) => s + p.y, 0) / target.length };
    const c = { x: piece.x, y: piece.y };
    const display = target.map(pt => {
      const sx = pt.x + c.x - targetC.x;
      const sy = pt.y + c.y - targetC.y;
      const rad = piece.angle * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const dx = sx - c.x, dy = sy - c.y;
      return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
    });
    const path = new Path2D();
    display.forEach((pt, i) => { i === 0 ? path.moveTo(pt.x, pt.y) : path.lineTo(pt.x, pt.y); });
    path.closePath();
    const isDragging = dragRef.current?.piece === piece;

    // shadow
    ctx.save();
    if (piece.solved) { ctx.shadowColor = "rgba(43,182,115,0.25)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    else if (isDragging) { ctx.shadowColor = "rgba(40,20,35,0.35)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 14; }
    else { ctx.shadowColor = "rgba(40,20,35,0.18)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5; }
    ctx.fillStyle = "#fff"; ctx.fill(path); ctx.restore();

    // image fill
    ctx.save(); ctx.clip(path);
    ctx.translate(c.x, c.y); ctx.rotate(piece.angle * Math.PI / 180); ctx.translate(-targetC.x, -targetC.y);
    drawImageCover(ctx, imageEl, board);
    ctx.restore();

    // inner highlight
    ctx.save(); ctx.clip(path);
    const ig = ctx.createLinearGradient(c.x - 80, c.y - 80, c.x + 80, c.y + 80);
    ig.addColorStop(0, "rgba(255,255,255,0.25)"); ig.addColorStop(0.5, "rgba(255,255,255,0)"); ig.addColorStop(1, "rgba(0,0,0,0.06)");
    ctx.fillStyle = ig; ctx.fillRect(0, 0, cw, ch); ctx.restore();

    // paper border
    ctx.save(); ctx.lineJoin = "round"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke(path); ctx.restore();

    // edge stroke
    ctx.save(); ctx.lineJoin = "round";
    if (piece.solved)      { ctx.strokeStyle = "#2bb673"; ctx.lineWidth = 2.5; }
    else if (isDragging)   { ctx.strokeStyle = PINK;       ctx.lineWidth = 4; }
    else if (piece.placed) { ctx.strokeStyle = "#ffb84d";  ctx.lineWidth = 2.5; }
    else                   { ctx.strokeStyle = "rgba(120,100,115,0.45)"; ctx.lineWidth = 1.4; }
    ctx.stroke(path); ctx.restore();
  };

  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, rect: Rect) => {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(rect.w / iw, rect.h / ih);
    const w = iw * scale, h = ih * scale;
    ctx.drawImage(img, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h);
  };

  /* ---------- piece generation ---------- */
  const generatePieces = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageEl) return;
    const cw = canvas.width, ch = canvas.height;
    const layout = getPuzzleLayout(cw, ch, isMobile);
    const { board, tray } = layout;
    const { rows, cols } = DIFFICULTY[difficulty];
    const rand = mulberry32(Date.now() & 0xffffff);
    const margin = 0.04;
    const w = 1 - margin * 2, h = 1 - margin * 2;
    const grid: { x: number; y: number }[][] = [];
    for (let y = 0; y <= rows; y++) {
      const row: { x: number; y: number }[] = [];
      for (let x = 0; x <= cols; x++) {
        const edge = x === 0 || x === cols || y === 0 || y === rows;
        const jx = edge ? 0 : (rand() - 0.5) * (w / cols) * 0.38;
        const jy = edge ? 0 : (rand() - 0.5) * (h / rows) * 0.38;
        row.push({ x: clamp(margin + w * (x / cols) + jx, margin, 1 - margin), y: clamp(margin + h * (y / rows) + jy, margin, 1 - margin) });
      }
      grid.push(row);
    }
    const pieces: Piece[] = [];
    const total = rows * cols;
    const trayCols = tray ? Math.ceil(Math.sqrt(total * (tray.w / tray.h))) : 0;
    const trayRows = tray ? Math.ceil(total / trayCols) : 0;
    const trayCellW = tray && trayCols ? tray.w / trayCols : 0;
    const trayCellH = tray && trayRows ? tray.h / trayRows : 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const poly = [grid[y][x], grid[y][x + 1], grid[y + 1][x + 1], grid[y + 1][x]];
        const targetCx = board.x + poly.reduce((s, p) => s + p.x, 0) / 4 * board.w;
        const targetCy = board.y + poly.reduce((s, p) => s + p.y, 0) / 4 * board.h;
        let px = targetCx, py = targetCy;

        if (tray && trayCols && trayRows) {
          const index = pieces.length;
          const col = index % trayCols;
          const row = Math.floor(index / trayCols);
          px = tray.x + trayCellW * (col + 0.5) + (rand() - 0.5) * trayCellW * 0.4;
          py = tray.y + trayCellH * (row + 0.5) + (rand() - 0.5) * trayCellH * 0.35;
          px = clamp(px, tray.x + trayCellW * 0.3, tray.x + tray.w - trayCellW * 0.3);
          py = clamp(py, tray.y + trayCellH * 0.45, tray.y + tray.h - trayCellH * 0.25);
        } else {
          // scatter around outer band
          const side = Math.floor(rand() * 4);
          const radius = Math.max(board.w / cols, board.h / rows) * 0.7;
          const xMin = radius + cw * 0.04, xMax = cw - radius - cw * 0.04;
          const yMin = radius + ch * 0.04, yMax = ch - radius - ch * 0.04;
          if (side === 0)      { px = xMin + rand() * (xMax - xMin); py = yMin + rand() * ch * 0.16; }
          else if (side === 1) { px = xMin + rand() * (xMax - xMin); py = yMax - rand() * ch * 0.16; }
          else if (side === 2) { px = xMin + rand() * cw * 0.18; py = yMin + rand() * (yMax - yMin); }
          else                 { px = xMax - rand() * cw * 0.18; py = yMin + rand() * (yMax - yMin); }
        }

        pieces.push({
          id: pieces.length + 1, poly, angle: [90, 180, 270][Math.floor(rand() * 3)],
          x: px, y: py, solved: false, placed: false,
        });
      }
    }
    piecesRef.current = pieces;
    setPieceCount(pieces.length);
    movesRef.current = 0; setMoves(0);
    startedAtRef.current = null; elapsedRef.current = 0; setTimeLabel("00:00");
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    completedRef.current = false;
    drawAll();
  }, [imageEl, difficulty, drawAll, isMobile]);

  /* ---------- timer ---------- */
  const startTimer = () => {
    if (startedAtRef.current) return;
    startedAtRef.current = Date.now();
    timerIdRef.current = setInterval(() => {
      const e = elapsedRef.current + (startedAtRef.current ? Date.now() - startedAtRef.current : 0);
      setTimeLabel(formatTime(e));
    }, 250);
  };
  const stopTimer = () => {
    if (startedAtRef.current) elapsedRef.current += Date.now() - startedAtRef.current;
    startedAtRef.current = null;
    if (timerIdRef.current) { clearInterval(timerIdRef.current); timerIdRef.current = null; }
    setTimeLabel(formatTime(elapsedRef.current));
  };

  /* ---------- interactions ---------- */
  const targetCenter = (piece: Piece, cw: number, ch: number) => {
    const { board } = getPuzzleLayout(cw, ch, isMobile);
    const cx = board.x + piece.poly.reduce((s, p) => s + p.x, 0) / 4 * board.w;
    const cy = board.y + piece.poly.reduce((s, p) => s + p.y, 0) / 4 * board.h;
    return { x: cx, y: cy };
  };

  const snapIfClose = (piece: Piece) => {
    const canvas = canvasRef.current!;
    const { board } = getPuzzleLayout(canvas.width, canvas.height, isMobile);
    const t = targetCenter(piece, canvas.width, canvas.height);
    const dist = Math.hypot(piece.x - t.x, piece.y - t.y);
    const snap = Math.max(34, board.w * 0.05);
    if (dist <= snap) {
      piece.x = t.x; piece.y = t.y; piece.placed = true;
      if (piece.angle === 0) piece.solved = true;
    } else { piece.placed = false; }
  };

  const checkComplete = () => {
    const all = piecesRef.current.length > 0 && piecesRef.current.every(p => p.solved);
    if (all && !completedRef.current) {
      completedRef.current = true;
      stopTimer();
      setPhase("complete");
      requestAnimationFrame(() => completeImgRef.current?.classList.add("show"));
    }
  };

  const getCanvasPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  };

  const pieceAt = (x: number, y: number) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { board } = getPuzzleLayout(canvas.width, canvas.height, isMobile);
    for (let i = piecesRef.current.length - 1; i >= 0; i--) {
      const p = piecesRef.current[i];
      if (p.solved) continue;
      const target = mapPoly(p.poly, board);
      const tc = { x: target.reduce((s, q) => s + q.x, 0) / 4, y: target.reduce((s, q) => s + q.y, 0) / 4 };
      const display = target.map(pt => {
        const sx = pt.x + p.x - tc.x, sy = pt.y + p.y - tc.y;
        const rad = p.angle * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
        const dx = sx - p.x, dy = sy - p.y;
        return { x: p.x + dx * cs - dy * sn, y: p.y + dx * sn + dy * cs };
      });
      const path = new Path2D();
      display.forEach((pt, i2) => { i2 === 0 ? path.moveTo(pt.x, pt.y) : path.lineTo(pt.x, pt.y); });
      path.closePath();
      if (ctx.isPointInPath(path, x, y)) return p;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!imageEl || completedRef.current) return;
    const pt = getCanvasPoint(e);
    const p = pieceAt(pt.x, pt.y);
    if (!p) return;
    e.preventDefault();
    dragRef.current = { piece: p, sx: pt.x, sy: pt.y, px: p.x, py: p.y, moved: false };
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawAll();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || completedRef.current) return;
    const pt = getCanvasPoint(e);
    const dx = pt.x - dragRef.current.sx, dy = pt.y - dragRef.current.sy;
    const moved = Math.hypot(dx, dy) > 7;
    if (!moved && !dragRef.current.moved) return;
    e.preventDefault();
    dragRef.current.moved = true;
    startTimer();
    const p = dragRef.current.piece;
    if (!p.solved) {
      const canvas = canvasRef.current!;
      p.x = clamp(dragRef.current.px + dx, 30, canvas.width - 30);
      p.y = clamp(dragRef.current.py + dy, 30, canvas.height - 30);
      p.placed = false;
    }
    drawAll();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { piece, moved } = dragRef.current;
    dragRef.current = null;
    if (moved) {
      movesRef.current += 1; setMoves(movesRef.current);
      snapIfClose(piece); checkComplete(); drawAll(); return;
    }
    // tap = rotate
    if (piece.solved) return;
    startTimer();
    piece.angle = (piece.angle + 90) % 360;
    movesRef.current += 1; setMoves(movesRef.current);
    snapIfClose(piece); checkComplete(); drawAll();
  };

  /* ---------- actions ---------- */
  const shuffle = () => {
    if (!imageEl) return;
    completedRef.current = false;
    completeImgRef.current?.classList.remove("show");
    if (phase === "play") {
      generatePieces();
    } else {
      setPhase("play"); // effect will regenerate
    }
  };

  const solveOne = () => {
    const p = piecesRef.current.find(q => !q.solved);
    if (!p) return;
    const canvas = canvasRef.current!;
    const t = targetCenter(p, canvas.width, canvas.height);
    p.angle = 0; p.x = t.x; p.y = t.y; p.placed = true; p.solved = true;
    movesRef.current += 1; setMoves(movesRef.current);
    checkComplete(); drawAll();
  };

  const getResultCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const { board } = getPuzzleLayout(canvas.width, canvas.height, isMobile);
    const out = document.createElement("canvas");
    out.width = CANVAS_SIZE;
    out.height = CANVAS_SIZE;
    out.getContext("2d")?.drawImage(canvas, board.x, board.y, board.w, board.h, 0, 0, out.width, out.height);
    return out;
  };

  const download = () => {
    const canvas = getResultCanvas(); if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `uchinoko-puzzle-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const getBlob = (): Promise<Blob | null> => new Promise(resolve => {
    const canvas = getResultCanvas();
    if (!canvas) {
      resolve(null);
      return;
    }
    canvas.toBlob(b => resolve(b), "image/png");
  });

  /* ---------- file upload ---------- */
  const handleFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (imageEl && imageEl.src.startsWith("blob:")) URL.revokeObjectURL(imageEl.src);
      setImageEl(img);
      setImageName(file.name.replace(/\.[^.]+$/, ""));
    };
    img.src = url;
  };

  /* ---------- effects ---------- */
  // 画像が読み込まれたら play 画面に遷移（canvas はそこで初めてマウントされる）
  useEffect(() => {
    if (imageEl && phase === "upload") setPhase("play");
  }, [imageEl, phase]);

  // canvas がマウントされたあとに初期化＋ピース生成
  useEffect(() => {
    if (phase !== "play" || !imageEl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_SIZE;
    canvas.height = isMobile ? MOBILE_CANVAS_HEIGHT : CANVAS_SIZE;
    generatePieces();
  }, [phase, imageEl, difficulty, generatePieces, isMobile]);

  useEffect(() => () => { if (timerIdRef.current) clearInterval(timerIdRef.current); }, []);

  /* ---------- UI ---------- */
  const panel = dark ? "#1a1a2e" : "#fff";
  const border = dark ? "#333" : "#f5d5e3";

  if (phase === "upload") return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: isMobile ? 12 : 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: text, textAlign: "center" }}>うちのこ回転パズル 🧩</div>
      <p style={{ margin: 0, color: dark ? "#aaa" : "#666", fontSize: 13, lineHeight: 1.7, textAlign: "center" }}>
        うちの子の写真でパズル！<br />ドラッグで動かす・タップで回転・近づくとピタッ。
      </p>
      <div style={{ background: panel, borderRadius: 14, padding: 16, border: `1.5px solid ${border}` }}>
        <button onClick={() => fileInput.current?.click()}
          style={{ width: "100%", padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 800,
            cursor: "pointer", border: `2px dashed ${border}`, background: "transparent", color: text }}>
          📷 写真を選ぶ
        </button>
        <input ref={fileInput} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0] ?? null)} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#5a4a55", marginBottom: 8 }}>こまかさ</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {(Object.keys(DIFFICULTY) as Difficulty[]).map(k => (
            <button key={k} type="button" onClick={() => setDifficulty(k)}
              style={{
                padding: "12px 6px", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer",
                border: `1.5px solid ${difficulty === k ? PINK : border}`,
                background: difficulty === k ? "#fff" : "#fdf1f6",
                color: difficulty === k ? PINK_DARK : "#5a4a55",
                boxShadow: difficulty === k ? `0 6px 14px rgba(255,122,168,0.22)` : "none",
              }}>
              <div>{DIFFICULTY[k].label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{DIFFICULTY[k].count}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: isMobile ? 8 : 16, display: "flex", flexDirection: "column", gap: 10 }}>

      {/* toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px",
        background: PINK, color: "#fff", borderRadius: 12, boxShadow: "0 6px 14px rgba(255,122,168,0.32)",
        fontWeight: 800, fontSize: 14, gap: 8, flexWrap: "wrap",
      }}>
        <span>🧩 {pieceCount} ピース</span>
        <span>⏱ {timeLabel}</span>
        <span>🎯 {moves} 手</span>
      </div>

      <div style={{
        fontSize: 11, color: "#7a4a5e", textAlign: "center", padding: "6px 10px",
        background: "linear-gradient(135deg, #fff3f7, #fff7e6)", borderRadius: 999,
      }}>
        ✋ ドラッグで動かす・タップで回転・近づくとピタッ
      </div>

      {/* canvas */}
      <div ref={wrapRef} style={{
        position: "relative", width: "100%", aspectRatio: isMobile ? `${CANVAS_SIZE} / ${MOBILE_CANVAS_HEIGHT}` : "1 / 1", borderRadius: 18,
        overflow: "hidden", background: "#fff", boxShadow: "0 14px 32px rgba(80,40,70,0.18)",
        border: `1.5px dashed ${PINK}55`,
      }}>
        <canvas ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }}
        />
        <img ref={completeImgRef} alt="" src={imageEl?.src ?? ""}
          style={{
            position: "absolute",
            ...(isMobile
              ? { left: "5.56%", top: "3.85%", width: "88.89%", height: "61.54%", borderRadius: 14 }
              : { inset: 0, width: "100%", height: "100%" }),
            objectFit: "cover",
            opacity: 0, transition: "opacity 0.9s ease", pointerEvents: "none",
          }}
          className=""
        />
        <style>{`.show{opacity:1 !important;}`}</style>
      </div>

      {phase === "complete" && (
        <div style={{
          padding: 16, borderRadius: 14, background: "#fff",
          border: `1.5px solid ${LAVENDER}55`, textAlign: "center",
          display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 10px 24px rgba(80,40,70,0.12)",
        }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: PINK_DARK }}>完成！おみごと 🎉</div>
          <div style={{ fontSize: 13, color: "#7a4a5e" }}>{imageName || "うちのこ"}・{timeLabel}・{moves}手</div>
          <canvas style={{ display: "none" }} />
          <ShareBar getBlob={getBlob} dark={dark} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={shuffle}
              style={{ padding: 12, borderRadius: 10, fontWeight: 800, color: "#fff", background: PINK, border: "none", cursor: "pointer" }}>
              🔄 もう一度
            </button>
            <button onClick={() => { setImageEl(null); setPhase("upload"); }}
              style={{ padding: 12, borderRadius: 10, fontWeight: 800, color: PINK_DARK, background: "#fff", border: `1.5px solid ${PINK}55`, cursor: "pointer" }}>
              📷 画像を変える
            </button>
          </div>
          <button onClick={download}
            style={{ padding: 10, borderRadius: 10, fontWeight: 800, color: "#fff", background: "#2a2330", border: "none", cursor: "pointer" }}>
            ↓ 保存
          </button>
        </div>
      )}

      {phase === "play" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button onClick={shuffle}
            style={{ padding: 10, borderRadius: 10, fontWeight: 800, color: "#fff", background: PINK, border: "none", cursor: "pointer" }}>
            {isMobile ? "混ぜる" : "🔄 シャッフル"}
          </button>
          <button onClick={solveOne}
            style={{ padding: 10, borderRadius: 10, fontWeight: 800, color: "#0f3b35", background: "linear-gradient(135deg, #5fe4d2, #2dc5b3)", border: "none", cursor: "pointer" }}>
            ✓ 1つ進める
          </button>
          <button onClick={() => { setImageEl(null); setPhase("upload"); }}
            style={{ padding: 10, borderRadius: 10, fontWeight: 800, color: PINK_DARK, background: "#fff", border: `1.5px solid ${PINK}55`, cursor: "pointer" }}>
            📷 写真
          </button>
        </div>
      )}
    </div>
  );
}
