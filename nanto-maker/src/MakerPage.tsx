import { useState, useRef, useEffect, useCallback } from "react";
import { drawAll, SCHEMES } from "./canvas";
import type { Scheme, DrawOptions } from "./canvas";
import ShareBar from "./ShareBar";

const TEXT_POSITIONS = [
  { id: "top"    as const, label: "上" },
  { id: "bottom" as const, label: "下" },
];

const SIZE = 1080;
const SIMPLE_PRESETS = ["なんと！？", "え！？", "！？"];

interface Props { isMobile: boolean; dark: boolean; text: string; bg: string; }

export default function MakerPage({ isMobile, dark, text, bg }: Props) {
  // なんとメーカー state
  const [imgSrc, setImgSrc]         = useState<string | null>(null);
  const [imgObj, setImgObj]         = useState<HTMLImageElement | null>(null);
  const [impactText, setImpactText] = useState("なんと！？");
  const [textPos, setTextPos]       = useState<DrawOptions["textPos"]>("top");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scheme: Scheme = SCHEMES[0];

  const render = useCallback(() => {
    if (!canvasRef.current) return;
    drawAll(canvasRef.current, imgObj, {
      scheme, impactText, textPos,
      lineCount: 90, intensity: 1.4, burstEdge: true, halftone: false, textSize: 12,
      watercolor: false, watercolorStrength: 0.7,
      sparkle: false, sparkleCount: 15, sparkleColorId: "white",
    });
  }, [imgObj, scheme, impactText, textPos]);

  useEffect(() => { render(); }, [render]);

  const handleFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current) {
        canvasRef.current.width  = SIZE;
        canvasRef.current.height = SIZE;
      }
      setImgObj(img);
    };
    img.src = url;
  };

  const getBlob = (): Promise<Blob | null> =>
    new Promise(resolve => {
      if (!canvasRef.current) { resolve(null); return; }
      canvasRef.current.toBlob(resolve, "image/png");
    });

  return (
    <main className="maker-page nanto-page">
      <section className="maker-mini-hero">
        <p className="eyebrow">NANTO MAKER</p>
        <h1>なんとメーカー</h1>
        <p>写真に集中線と大きな文字を入れて、SNSで使いやすい一枚にします。</p>
      </section>
          <div style={{
            maxWidth: 1080, margin: "0 auto", padding: isMobile ? 12 : 20,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
            gap: isMobile ? 12 : 20,
            alignItems: "start",
          }}>

            {/* Canvas / Drop zone */}
            <div>
              {!imgSrc ? (
                <div
                  onClick={() => document.getElementById("fi-maker")?.click()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                  onDragOver={e => e.preventDefault()}
                  style={{
                    aspectRatio: isMobile ? "16 / 11" : "1", border: "2px dashed #efa3c5", borderRadius: 22,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 12, cursor: "pointer", background: "#fff7fb",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: "#c878a4" }}>UPLOAD PHOTO</div>
                  <div style={{ fontSize: 60 }}>🐱</div>
                  <div style={{ background: "linear-gradient(135deg, #f15f9b, #b89bea)", color: "#fff", fontWeight: 900, fontSize: 13, padding: "10px 22px", borderRadius: 999, cursor: "pointer", letterSpacing: 1 }}>
                    写真を選ぶ
                  </div>
                  <div style={{ fontSize: 11, color: "#9a95a8" }}>ドラッグ＆ドロップもOK</div>
                </div>
              ) : (
                <div>
                  <canvas ref={canvasRef} style={{ width: "100%", display: "block", border: "1px solid #f0d9e8", borderRadius: 18 }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Btn onClick={() => { setImgSrc(null); setImgObj(null); }}>別の写真</Btn>
                    <Btn onClick={render}>↺</Btn>
                  </div>
                  <ShareBar getBlob={getBlob} dark={dark} />
                </div>
              )}
              {!imgSrc && <canvas ref={canvasRef} style={{ display: "none" }} />}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Panel dark={dark} label="衝撃テキスト">
                <input
                  value={impactText}
                  onChange={e => setImpactText(e.target.value)}
                  maxLength={12}
                  style={{
                    width: "100%", fontSize: 20, fontWeight: 900, padding: "8px 10px",
                    border: "1.5px solid #efa3c5", borderRadius: 14, background: "#fff7fb", color: "#2d2340",
                    fontFamily: "'Arial Black',sans-serif", letterSpacing: -0.5, marginBottom: 8,
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {SIMPLE_PRESETS.map(t => (
                    <button key={t} onClick={() => setImpactText(t)} style={{
                      flex: 1, padding: "10px 4px", fontSize: 13, fontWeight: 900,
                      border: `1.5px solid ${impactText === t ? "#efa3c5" : "#f0d9e8"}`,
                      borderRadius: 999,
                      background: impactText === t ? "linear-gradient(135deg, #fce4ec, #f3e5f5)" : "#fff",
                      color: "#8b4b78", cursor: "pointer",
                    }}>{t}</button>
                  ))}
                </div>
              </Panel>

              <Panel dark={dark} label="テキスト位置">
                <div style={{ display: "flex", gap: 6 }}>
                  {TEXT_POSITIONS.map(p => (
                    <button key={p.id} onClick={() => setTextPos(p.id)} style={{
                      flex: 1, padding: "10px 0", fontWeight: 900, fontSize: 16,
                      border: `1.5px solid ${textPos === p.id ? "#efa3c5" : "#f0d9e8"}`,
                      borderRadius: 999,
                      background: textPos === p.id ? "linear-gradient(135deg, #fce4ec, #f3e5f5)" : "#fff",
                      color: "#8b4b78", cursor: "pointer",
                    }}>{p.label}</button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <input id="fi-maker" type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files?.[0] ?? null)} />
    </main>
  );
}

function Panel({ children, dark, label }: { children: React.ReactNode; dark: boolean; label: string }) {
  return (
    <div style={{ border: "1.5px solid #f0d9e8", borderRadius: 18, padding: 14, background: dark ? "rgba(255,255,255,0.04)" : "#fff" }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2, color: "#c878a4", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "10px 8px",
      border: "1.5px solid #f0d9e8", borderRadius: 999, background: "#fff",
      color: "#8b4b78", fontWeight: 900, fontSize: 12, cursor: "pointer",
    }}>{children}</button>
  );
}
