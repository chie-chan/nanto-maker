import { useState, useRef, useEffect, useCallback } from "react";
import { removeBackground } from "@imgly/background-removal";

const FRAMES = [
  { id: "sakura", label: "🌸 さくら", src: "/frame-sakura.png" },
];

const SIZE = 1080;

interface Props {
  isMobile: boolean;
  dark: boolean;
  text: string;
  bg: string;
}

export default function FaceHame({ isMobile, dark, text, bg }: Props) {
  const [imgFile, setImgFile]       = useState<File | null>(null);
  const [imgSrc, setImgSrc]         = useState<string | null>(null);
  const [removedSrc, setRemovedSrc] = useState<string | null>(null);
  const [frameId, setFrameId]       = useState("sakura");
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState("");
  const [scale, setScale]           = useState(1.0);
  const [offsetX, setOffsetX]       = useState(0);
  const [offsetY, setOffsetY]       = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frame = FRAMES.find(f => f.id === frameId) ?? FRAMES[0];

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = SIZE;
    canvas.height = SIZE;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // 白背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const drawFrame = (subjectSrc: string | null) => {
      const frameImg = new Image();
      frameImg.onload = () => {
        if (subjectSrc) {
          const subImg = new Image();
          subImg.onload = () => {
            // 被写体を中央に描画（位置・スケール調整あり）
            const s = scale;
            const sw = SIZE * s;
            const sh = SIZE * s;
            const sx = (SIZE - sw) / 2 + offsetX * SIZE * 0.01;
            const sy = (SIZE - sh) / 2 + offsetY * SIZE * 0.01;
            ctx.drawImage(subImg, sx, sy, sw, sh);
            // フレームを上に重ねる
            ctx.drawImage(frameImg, 0, 0, SIZE, SIZE);
          };
          subImg.src = subjectSrc;
        } else {
          ctx.drawImage(frameImg, 0, 0, SIZE, SIZE);
        }
      };
      frameImg.src = frame.src;
    };

    drawFrame(removedSrc);
  }, [removedSrc, frame.src, scale, offsetX, offsetY]);

  useEffect(() => { render(); }, [render]);

  const handleFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImgFile(file);
    setRemovedSrc(null);
    const url = URL.createObjectURL(file);
    setImgSrc(url);
  };

  const handleRemoveBg = async () => {
    if (!imgFile) return;
    setLoading(true);
    setProgress("AIモデルを読み込み中…（初回は少し時間がかかります）");
    try {
      const blob = await removeBackground(imgFile, {
        progress: (key: string, current: number, total: number) => {
          if (key === "compute:inference") {
            setProgress(`背景を除去中… ${Math.round((current / total) * 100)}%`);
          } else if (key.startsWith("fetch")) {
            setProgress(`AIモデルをダウンロード中… ${Math.round((current / total) * 100)}%`);
          }
        },
      });
      const url = URL.createObjectURL(blob);
      setRemovedSrc(url);
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
    a.download = `facehame-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const panel = dark ? "#1a1a2e" : "#fff";
  const border = dark ? "#333" : "#ddd";
  const labelStyle = { fontSize: 11, fontWeight: 700, color: dark ? "#aaa" : "#666", marginBottom: 4, display: "block" as const };

  return (
    <div style={{
      maxWidth: 1080, margin: "0 auto", padding: isMobile ? 12 : 20,
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
      gap: isMobile ? 12 : 20,
      alignItems: "start",
    }}>

      {/* ── Canvas ── */}
      <div>
        {!imgSrc ? (
          <div
            onClick={() => document.getElementById("fh-fi")?.click()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={e => e.preventDefault()}
            style={{
              aspectRatio: "1", border: `4px dashed ${dark ? "#333" : "#bbb"}`,
              borderRadius: 4, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: dark ? "#555" : "#aaa", gap: 8,
            }}
          >
            <div style={{ fontSize: 48 }}>🌸</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>写真をアップロード</div>
            <div style={{ fontSize: 11 }}>クリックまたはドラッグ＆ドロップ</div>
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ width: "100%", display: "block", borderRadius: 4, border: `1px solid ${border}` }} />
        )}
        <input id="fh-fi" type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0] ?? null)} />
      </div>

      {/* ── Controls ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* フレーム選択 */}
        <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
          <span style={labelStyle}>フレーム</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FRAMES.map(f => (
              <button key={f.id} onClick={() => setFrameId(f.id)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", border: `2px solid ${frameId === f.id ? "#e07050" : border}`,
                  background: frameId === f.id ? "#fff0ec" : panel, color: text,
                }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* 写真アップロード */}
        <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
          <span style={labelStyle}>写真</span>
          <button onClick={() => document.getElementById("fh-fi")?.click()}
            style={{ width: "100%", padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
              cursor: "pointer", border: `2px dashed ${border}`, background: "transparent", color: text }}>
            {imgSrc ? "📷 写真を変更" : "📷 写真を選ぶ"}
          </button>
        </div>

        {/* 背景除去ボタン */}
        {imgSrc && !removedSrc && (
          <button onClick={handleRemoveBg} disabled={loading}
            style={{
              padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#ccc" : "#e07050", color: "#fff", border: "none",
            }}>
            {loading ? "⏳ 処理中..." : "✨ 背景を除去する"}
          </button>
        )}

        {progress && (
          <div style={{ fontSize: 12, color: "#e07050", fontWeight: 700, textAlign: "center" }}>
            {progress}
          </div>
        )}

        {/* 位置・サイズ調整 */}
        {removedSrc && (
          <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={labelStyle}>位置・サイズ調整</span>
            <label style={{ fontSize: 12, color: text }}>大きさ
              <input type="range" min={0.5} max={2.0} step={0.05} value={scale}
                onChange={e => setScale(Number(e.target.value))}
                style={{ width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, color: text }}>左右
              <input type="range" min={-30} max={30} step={1} value={offsetX}
                onChange={e => setOffsetX(Number(e.target.value))}
                style={{ width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, color: text }}>上下
              <input type="range" min={-30} max={30} step={1} value={offsetY}
                onChange={e => setOffsetY(Number(e.target.value))}
                style={{ width: "100%", marginTop: 4 }} />
            </label>
          </div>
        )}

        {/* ダウンロード */}
        {removedSrc && (
          <button onClick={handleDownload}
            style={{
              padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 900,
              cursor: "pointer", background: "#FFE600", color: "#111", border: "3px solid #111",
            }}>
            ⬇️ ダウンロード
          </button>
        )}
      </div>
    </div>
  );
}
