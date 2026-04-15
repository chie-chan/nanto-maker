import { useState, useRef, useEffect, useCallback } from "react";
import { removeBackground } from "@imgly/background-removal";

const SIZE = 1080;

interface Props {
  isMobile: boolean;
  dark: boolean;
  text: string;
  bg: string;
}

export default function Kourin({ isMobile, dark, text, bg }: Props) {
  const [bgFile, setBgFile]         = useState<File | null>(null);
  const [bgSrc, setBgSrc]           = useState<string | null>(null);
  const [petFile, setPetFile]       = useState<File | null>(null);
  const [petSrc, setPetSrc]         = useState<string | null>(null);
  const [removedSrc, setRemovedSrc] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState("");
  const [scale, setScale]           = useState(0.6);
  const [offsetX, setOffsetX]       = useState(20);
  const [offsetY, setOffsetY]       = useState(-20);
  const [opacity, setOpacity]       = useState(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // タッチ・マウス操作用のref（再レンダリングなしで追跡）
  const dragRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    pinching: false,
    lastDist: 0,
    initScale: 0.6,
  });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = SIZE;
    canvas.height = SIZE;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const bgImg = new Image();
    bgImg.onload = () => {
      const bw = bgImg.width, bh = bgImg.height;
      const scale_bg = Math.max(SIZE / bw, SIZE / bh);
      const dw = bw * scale_bg, dh = bh * scale_bg;
      const dx = (SIZE - dw) / 2, dy = (SIZE - dh) / 2;
      ctx.drawImage(bgImg, dx, dy, dw, dh);

      if (removedSrc) {
        const petImg = new Image();
        petImg.onload = () => {
          const pw = petImg.width, ph = petImg.height;
          const petW = SIZE * scale;
          const petH = (ph / pw) * petW;
          const px = (SIZE - petW) / 2 + offsetX * SIZE * 0.01;
          const py = (SIZE - petH) / 2 + offsetY * SIZE * 0.01;
          ctx.globalAlpha = opacity;
          ctx.drawImage(petImg, px, py, petW, petH);
          ctx.globalAlpha = 1.0;
        };
        petImg.src = removedSrc;
      }
    };
    bgImg.src = bgSrc;
  }, [bgSrc, removedSrc, scale, offsetX, offsetY, opacity]);

  useEffect(() => { render(); }, [render]);

  // 画面座標 → offset単位への変換
  const toOffsetUnit = (screenDelta: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const displayW = canvas.getBoundingClientRect().width;
    return screenDelta * (100 / displayW);
  };

  // ── タッチイベント ──
  const onTouchStart = (e: React.TouchEvent) => {
    if (!removedSrc) return;
    e.preventDefault();
    const touches = e.touches;
    if (touches.length === 1) {
      dragRef.current.dragging = true;
      dragRef.current.lastX = touches[0].clientX;
      dragRef.current.lastY = touches[0].clientY;
    } else if (touches.length === 2) {
      dragRef.current.dragging = false;
      dragRef.current.pinching = true;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      dragRef.current.lastDist = Math.hypot(dx, dy);
      dragRef.current.initScale = scale;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!removedSrc) return;
    e.preventDefault();
    const touches = e.touches;

    if (dragRef.current.pinching && touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / dragRef.current.lastDist;
      const newScale = Math.min(1.5, Math.max(0.1, dragRef.current.initScale * ratio));
      setScale(newScale);
      dragRef.current.initScale = newScale;
      dragRef.current.lastDist = dist;

    } else if (dragRef.current.dragging && touches.length === 1) {
      const dx = touches[0].clientX - dragRef.current.lastX;
      const dy = touches[0].clientY - dragRef.current.lastY;
      setOffsetX(prev => Math.min(50, Math.max(-50, prev + toOffsetUnit(dx))));
      setOffsetY(prev => Math.min(50, Math.max(-50, prev + toOffsetUnit(dy))));
      dragRef.current.lastX = touches[0].clientX;
      dragRef.current.lastY = touches[0].clientY;
    }
  };

  const onTouchEnd = () => {
    dragRef.current.dragging = false;
    dragRef.current.pinching = false;
  };

  // ── マウスイベント（PC用） ──
  const onMouseDown = (e: React.MouseEvent) => {
    if (!removedSrc) return;
    dragRef.current.dragging = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.dragging || !removedSrc) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    setOffsetX(prev => Math.min(50, Math.max(-50, prev + toOffsetUnit(dx))));
    setOffsetY(prev => Math.min(50, Math.max(-50, prev + toOffsetUnit(dy))));
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  };

  const onMouseUp = () => { dragRef.current.dragging = false; };

  const handleBgFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBgSrc(URL.createObjectURL(file));
    setBgFile(file);
  };

  const handlePetFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPetFile(file);
    setPetSrc(URL.createObjectURL(file));
    setRemovedSrc(null);
  };

  const handleRemoveBg = async () => {
    if (!petFile) return;
    setLoading(true);
    setProgress("AIモデルを読み込み中…（初回は少し時間がかかります）");
    try {
      const blob = await removeBackground(petFile, {
        progress: (key: string, current: number, total: number) => {
          if (key === "compute:inference") {
            setProgress(`背景を除去中… ${Math.round((current / total) * 100)}%`);
          } else if (key.startsWith("fetch")) {
            setProgress(`AIモデルをダウンロード中… ${Math.round((current / total) * 100)}%`);
          }
        },
      });
      setRemovedSrc(URL.createObjectURL(blob));
      setProgress("");
    } catch (e) {
      console.error(e);
      setProgress("エラーが発生しました。別の画像で試してください。");
    }
    setLoading(false);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `kourin-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const panel  = dark ? "#1a1a2e" : "#fff";
  const border = dark ? "#333" : "#ddd";
  const labelStyle = {
    fontSize: 11, fontWeight: 700,
    color: dark ? "#aaa" : "#666",
    marginBottom: 6, display: "block" as const,
  };

  // ── キャンバス ──
  const canvasEl = bgSrc ? (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%", display: "block", borderRadius: 4,
          border: `1px solid ${border}`,
          cursor: removedSrc ? "grab" : "default",
          touchAction: "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      {removedSrc && (
        <div style={{
          position: "absolute", bottom: 8, left: 0, right: 0,
          textAlign: "center", fontSize: 11, fontWeight: 700,
          color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.7)",
          pointerEvents: "none",
        }}>
          👆 ドラッグで移動｜🤏 ピンチで拡大縮小
        </div>
      )}
    </div>
  ) : (
    <div
      onClick={() => document.getElementById("kourin-bg")?.click()}
      onDrop={e => { e.preventDefault(); handleBgFile(e.dataTransfer.files[0]); }}
      onDragOver={e => e.preventDefault()}
      style={{
        aspectRatio: "1", border: `4px dashed ${dark ? "#333" : "#bbb"}`,
        borderRadius: 4, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: dark ? "#555" : "#aaa", gap: 8,
      }}
    >
      <div style={{ fontSize: 48 }}>🏔️</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>背景写真をアップロード</div>
      <div style={{ fontSize: 11 }}>クリックまたはドラッグ＆ドロップ</div>
    </div>
  );

  // ── STEP 1 ──
  const step1 = (
    <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
      <span style={labelStyle}>STEP 1｜背景写真</span>
      <button onClick={() => document.getElementById("kourin-bg")?.click()}
        style={{ width: "100%", padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
          cursor: "pointer", border: `2px dashed ${border}`,
          background: bgSrc ? "#f6fff6" : "transparent", color: text }}>
        {bgSrc ? "✅ 背景を変更" : "🏔️ 背景写真を選ぶ"}
      </button>
    </div>
  );

  // ── STEP 2 ──
  const step2 = (
    <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
      <span style={labelStyle}>STEP 2｜うちの子の写真</span>
      <button onClick={() => document.getElementById("kourin-pet")?.click()}
        style={{ width: "100%", padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
          cursor: "pointer", border: `2px dashed ${border}`,
          background: petSrc ? "#f6fff6" : "transparent", color: text }}>
        {petSrc ? "✅ 写真を変更" : "🐾 うちの子を選ぶ"}
      </button>
      {petSrc && !removedSrc && (
        <button onClick={handleRemoveBg} disabled={loading}
          style={{
            width: "100%", marginTop: 8, padding: "12px", borderRadius: 6,
            fontSize: 14, fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "#ccc" : "#e07050", color: "#fff", border: "none",
          }}>
          {loading ? "⏳ 処理中..." : "✨ 背景を除去する"}
        </button>
      )}
      {progress && (
        <div style={{ fontSize: 11, color: "#e07050", fontWeight: 700, textAlign: "center", marginTop: 6 }}>
          {progress}
        </div>
      )}
      {removedSrc && (
        <div style={{ fontSize: 11, color: "#4caf50", fontWeight: 700, textAlign: "center", marginTop: 6 }}>
          ✅ 背景除去完了！画像を直接操作できます
        </div>
      )}
    </div>
  );

  // ── 透明度スライダーのみ ──
  const opacitySlider = removedSrc ? (
    <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
      <span style={labelStyle}>透明度</span>
      <input type="range" min={0.1} max={1.0} step={0.05} value={opacity}
        onChange={e => setOpacity(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#FFE600", height: 24 }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: dark ? "#aaa" : "#888", marginTop: 2 }}>
        <span>薄く</span><span>濃く</span>
      </div>
    </div>
  ) : null;

  // ── ダウンロード ──
  const downloadBtn = removedSrc && bgSrc ? (
    <button onClick={handleDownload}
      style={{
        padding: "16px", borderRadius: 8, fontSize: 15, fontWeight: 900,
        cursor: "pointer", background: "#FFE600", color: "#111", border: "3px solid #111",
      }}>
      ⬇️ ダウンロード
    </button>
  ) : null;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: isMobile ? 12 : 20 }}>

      <input id="kourin-bg" type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleBgFile(e.target.files?.[0] ?? null)} />
      <input id="kourin-pet" type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handlePetFile(e.target.files?.[0] ?? null)} />

      {isMobile ? (
        /* ── モバイル：STEP1 → STEP2 → プレビュー → 透明度 → DL ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {step1}
          {step2}
          {bgSrc && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: dark ? "#aaa" : "#666", marginBottom: 6 }}>
                プレビュー
              </div>
              {canvasEl}
            </div>
          )}
          {opacitySlider}
          {downloadBtn}
        </div>
      ) : (
        /* ── PC：左キャンバス・右コントロール ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          <div>{canvasEl}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {step1}
            {step2}
            {opacitySlider}
            {downloadBtn}
          </div>
        </div>
      )}
    </div>
  );
}
