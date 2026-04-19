import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { drawAll, SCHEMES } from "./canvas";
import type { Scheme, DrawOptions } from "./canvas";
import Kourin from "./Kourin";
import ShareBar from "./ShareBar";

const TEXT_POSITIONS = [
  { id: "top"    as const, label: "上" },
  { id: "bottom" as const, label: "下" },
];

const SIZE = 1080;
const SIMPLE_PRESETS = ["なんと！？", "え！？", "！？"];

interface Props { isMobile: boolean; dark: boolean; text: string; bg: string; }

export default function MakerPage({ isMobile, dark, text, bg }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"kourin" | "nanto">("kourin");

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
    <div>
      {/* タブバー */}
      <div style={{ display: "flex", borderBottom: "3px solid #111", background: "#FFE600" }}>
        {([["kourin", "🐾 降臨"], ["nanto", "⚡ なんと"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: isMobile ? "8px 12px" : "10px 22px",
            fontSize: isMobile ? 12 : 14, fontWeight: 900,
            border: "none", borderBottom: tab === id ? "3px solid #e07050" : "3px solid transparent",
            background: tab === id ? "#fff" : "transparent",
            cursor: "pointer", color: "#111", marginBottom: -3, whiteSpace: "nowrap",
          }}>{label}</button>
        ))}

        <button
          onClick={() => navigate("/")}
          style={{
            marginLeft: "auto",
            padding: isMobile ? "8px 12px" : "10px 18px",
            fontSize: isMobile ? 11 : 13, fontWeight: 700,
            border: "none", background: "transparent",
            cursor: "pointer", color: "#555", whiteSpace: "nowrap",
          }}
        >← ホームへ</button>
      </div>

      {tab === "kourin" ? (
        <Kourin isMobile={isMobile} dark={dark} text={text} bg={bg} />
      ) : (
        <>
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
                    aspectRatio: "1", border: `4px dashed ${dark ? "#333" : "#bbb"}`, borderRadius: 4,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 12, cursor: "pointer", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: dark ? "#555" : "#aaa" }}>UPLOAD PHOTO</div>
                  <div style={{ fontSize: 60 }}>🐱</div>
                  <div style={{ background: "#FFE600", color: "#111", fontWeight: 900, fontSize: 13, padding: "8px 20px", border: "2px solid #111", cursor: "pointer", letterSpacing: 1 }}>
                    写真を選ぶ
                  </div>
                  <div style={{ fontSize: 11, color: dark ? "#444" : "#bbb" }}>ドラッグ＆ドロップもOK</div>
                </div>
              ) : (
                <div>
                  <canvas ref={canvasRef} style={{ width: "100%", display: "block", border: "4px solid #111" }} />
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
                    border: "3px solid #111", background: "#FFE600", color: "#111",
                    fontFamily: "'Arial Black',sans-serif", letterSpacing: -0.5, marginBottom: 8,
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {SIMPLE_PRESETS.map(t => (
                    <button key={t} onClick={() => setImpactText(t)} style={{
                      flex: 1, padding: "10px 4px", fontSize: 13, fontWeight: 900,
                      border: `3px solid ${impactText === t ? "#111" : "#ccc"}`,
                      background: impactText === t ? "#FFE600" : "transparent",
                      color: "#111", cursor: "pointer",
                    }}>{t}</button>
                  ))}
                </div>
              </Panel>

              <Panel dark={dark} label="テキスト位置">
                <div style={{ display: "flex", gap: 6 }}>
                  {TEXT_POSITIONS.map(p => (
                    <button key={p.id} onClick={() => setTextPos(p.id)} style={{
                      flex: 1, padding: "10px 0", fontWeight: 900, fontSize: 16,
                      border: `3px solid ${textPos === p.id ? "#111" : "#ccc"}`,
                      background: textPos === p.id ? "#FFE600" : "transparent",
                      color: "#111", cursor: "pointer",
                    }}>{p.label}</button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <input id="fi-maker" type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files?.[0] ?? null)} />
        </>
      )}
    </div>
  );
}

function Panel({ children, dark, label }: { children: React.ReactNode; dark: boolean; label: string }) {
  return (
    <div style={{ border: `3px solid ${dark ? "#333" : "#111"}`, padding: 12, background: dark ? "rgba(255,255,255,0.04)" : "#fff" }}>
      <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 3, color: dark ? "#555" : "#999", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "10px 8px",
      border: "3px solid #111", background: "transparent",
      color: "#111", fontWeight: 900, fontSize: 12, cursor: "pointer",
      fontFamily: "'Arial Black',sans-serif",
    }}>{children}</button>
  );
}
