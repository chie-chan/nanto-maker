import { useState, useRef, useEffect, useCallback } from "react";
import { removeBackground } from "@imgly/background-removal";
import ShareBar from "./ShareBar";

const SIZE = 1080;
type FilterType = "mono" | "sepia";

interface Props {
  isMobile: boolean;
  dark: boolean;
  text: string;
  bg: string;
}

function applyFilter(ctx: CanvasRenderingContext2D, W: number, H: number, filter: FilterType) {
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (filter === "mono") {
      // グレースケール + 高コントラスト
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      gray = Math.max(0, Math.min(255, (gray - 128) * 1.6 + 128));
      d[i] = d[i + 1] = d[i + 2] = gray;
    } else {
      // セピア
      d[i]     = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      d[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      d[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function applyVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const r = Math.max(W, H) * 0.75;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

export default function Filter({ isMobile, dark, text, bg }: Props) {
  const [petFile, setPetFile]       = useState<File | null>(null);
  const [petSrc, setPetSrc]         = useState<string | null>(null);
  const [removedSrc, setRemovedSrc] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState("");
  const [filter, setFilter]         = useState<FilterType>("mono");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !removedSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = SIZE;
    canvas.height = SIZE;

    // 背景色
    ctx.fillStyle = filter === "mono" ? "#000000" : "#1a1008";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const img = new Image();
    img.onload = () => {
      // アスペクト比保ちつつ中央配置
      const iw = img.width, ih = img.height;
      const s = Math.min(SIZE / iw, SIZE / ih);
      const dw = iw * s, dh = ih * s;
      const dx = (SIZE - dw) / 2, dy = (SIZE - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // フィルター適用
      applyFilter(ctx, SIZE, SIZE, filter);
      // ビネット
      applyVignette(ctx, SIZE, SIZE);
    };
    img.src = removedSrc;
  }, [removedSrc, filter]);

  useEffect(() => { render(); }, [render]);

  const handleFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPetFile(file);
    setPetSrc(URL.createObjectURL(file));
    setRemovedSrc(null);
  };

  const handleRemoveBg = async () => {
    if (!petFile) return;
    setLoading(true);
    setProgress("背景除去の準備中です…しばらくお待ちください（初回のみ時間がかかります）");
    try {
      const blob = await removeBackground(petFile, {
        progress: (key: string, current: number, total: number) => {
          if (key === "compute:inference")
            setProgress(`背景を除去中… ${Math.round((current / total) * 100)}%`);
          else if (key.startsWith("fetch"))
            setProgress(`背景除去の準備中です… ${Math.round((current / total) * 100)}%（初回のみ）`);
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

  const getBlob = (): Promise<Blob | null> =>
    new Promise(resolve => {
      if (!canvasRef.current) { resolve(null); return; }
      canvasRef.current.toBlob(resolve, "image/png");
    });

  const panel  = dark ? "#1a1a2e" : "#fff";
  const border = dark ? "#333" : "#ddd";
  const labelStyle = { fontSize: 11, fontWeight: 700, color: dark ? "#aaa" : "#666", marginBottom: 6, display: "block" as const };

  // フィルター選択ボタン
  const filterSelect = (
    <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
      <span style={labelStyle}>フィルター</span>
      <div style={{ display: "flex", gap: 8 }}>
        {([["mono", "⬛ モノクロ", "#222", "#fff"], ["sepia", "🟫 セピア", "#5c3d1e", "#f5deb3"]] as const).map(([id, label, bg2, fg]) => (
          <button key={id} onClick={() => setFilter(id as FilterType)} style={{
            flex: 1, padding: "12px 6px", fontWeight: 900, fontSize: 13,
            border: `3px solid ${filter === id ? "#e07050" : border}`,
            background: filter === id ? bg2 : "transparent",
            color: filter === id ? fg : text,
            cursor: "pointer", borderRadius: 6,
          }}>{label}</button>
        ))}
      </div>
    </div>
  );

  // アップロード & 背景除去
  const uploadStep = (
    <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
      <span style={labelStyle}>写真をアップロード</span>
      <button onClick={() => document.getElementById("filter-fi")?.click()}
        style={{ width: "100%", padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
          cursor: "pointer", border: `2px dashed ${border}`,
          background: petSrc ? "#f6fff6" : "transparent", color: text }}>
        {petSrc ? "✅ 写真を変更" : "📷 写真を選ぶ"}
      </button>
      {petSrc && !removedSrc && (
        <button onClick={handleRemoveBg} disabled={loading} style={{
          width: "100%", marginTop: 8, padding: "12px", borderRadius: 6,
          fontSize: 14, fontWeight: 900, border: "none", color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "#ccc" : "#e07050",
        }}>
          {loading ? "⏳ 処理中..." : "✨ 背景を除去する"}
        </button>
      )}
      {progress && <div style={{ fontSize: 11, color: "#e07050", fontWeight: 700, textAlign: "center", marginTop: 6 }}>{progress}</div>}
      {removedSrc && <div style={{ fontSize: 11, color: "#4caf50", fontWeight: 700, textAlign: "center", marginTop: 6 }}>✅ 完了！フィルターを選んでください</div>}
    </div>
  );

  // キャンバス
  const canvasEl = removedSrc ? (
    <canvas ref={canvasRef} style={{ width: "100%", display: "block", borderRadius: 4, border: `1px solid ${border}` }} />
  ) : (
    <div onClick={() => document.getElementById("filter-fi")?.click()}
      onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      onDragOver={e => e.preventDefault()}
      style={{
        aspectRatio: "1", border: `4px dashed ${dark ? "#333" : "#bbb"}`, borderRadius: 4,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: dark ? "#555" : "#aaa", gap: 8,
      }}>
      <div style={{ fontSize: 48 }}>🖤</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>写真をアップロード</div>
      <div style={{ fontSize: 11 }}>クリックまたはドラッグ＆ドロップ</div>
    </div>
  );

  const shareBar = removedSrc ? <ShareBar getBlob={getBlob} dark={dark} /> : null;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: isMobile ? 12 : 20 }}>
      <input id="filter-fi" type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files?.[0] ?? null)} />

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {uploadStep}
          {filterSelect}
          {removedSrc && <div>{canvasEl}</div>}
          {shareBar}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          <div>{canvasEl}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {uploadStep}
            {filterSelect}
            {shareBar}
          </div>
        </div>
      )}
    </div>
  );
}
