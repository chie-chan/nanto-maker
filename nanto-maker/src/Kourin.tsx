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

  // ── キャンバス要素（共通） ──
  const canvasEl = bgSrc ? (
    <canvas ref={canvasRef} style={{ width: "100%", display: "block", borderRadius: 4, border: `1px solid ${border}` }} />
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
          cursor: "pointer", border: `2px dashed ${border}`, background: bgSrc ? "#f6fff6" : "transparent",
          color: text }}>
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
          cursor: "pointer", border: `2px dashed ${border}`, background: petSrc ? "#f6fff6" : "transparent",
          color: text }}>
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
          ✅ 背景除去完了！
        </div>
      )}
    </div>
  );

  // ── STEP 3（スライダー） ──
  const step3 = removedSrc ? (
    <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={labelStyle}>STEP 3｜位置・サイズ調整</span>
      {[
        { label: "大きさ", min: 0.1, max: 1.5, step: 0.05, value: scale, onChange: setScale },
        { label: "左右", min: -50, max: 50, step: 1, value: offsetX, onChange: setOffsetX },
        { label: "上下", min: -50, max: 50, step: 1, value: offsetY, onChange: setOffsetY },
        { label: "透明度", min: 0.1, max: 1.0, step: 0.05, value: opacity, onChange: setOpacity },
      ].map(({ label, min, max, step, value, onChange }) => (
        <label key={label} style={{ fontSize: 13, fontWeight: 700, color: text, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{label}</span>
            <span style={{ fontSize: 11, color: dark ? "#aaa" : "#888" }}>{value.toFixed(2)}</span>
          </span>
          <input type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#FFE600", height: 24 }} />
        </label>
      ))}
    </div>
  ) : null;

  // ── ダウンロードボタン ──
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
        /* ── モバイル：縦並び STEP1 → STEP2 → プレビュー → STEP3 → DL ── */
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
          {step3}
          {downloadBtn}
        </div>
      ) : (
        /* ── PC：左にキャンバス、右にコントロール ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          <div>{canvasEl}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {step1}
            {step2}
            {step3}
            {downloadBtn}
          </div>
        </div>
      )}
    </div>
  );
}
