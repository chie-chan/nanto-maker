import { useState, useRef, useEffect, useCallback } from "react";
import { drawAll, SCHEMES } from "./canvas";
import type { Scheme, DrawOptions } from "./canvas";
import Kourin from "./Kourin";
import Filter from "./Filter";
import ShareBar from "./ShareBar";


function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

const TEXT_POSITIONS = [
  { id: "top"    as const, label: "上" },
  { id: "bottom" as const, label: "下" },
];

const SIZE = 1080;

const SIMPLE_PRESETS = ["なんと！？", "え！？", "！？"];

export default function App() {
  const [imgSrc, setImgSrc]         = useState<string | null>(null);
  const [imgObj, setImgObj]         = useState<HTMLImageElement | null>(null);
  const [impactText, setImpactText] = useState("なんと！？");
  const [textPos, setTextPos]       = useState<DrawOptions["textPos"]>("top");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scheme: Scheme = SCHEMES[0];
  const dark = false;
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 680;

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

  const handleDownload = () => {};  // 後方互換用（未使用）
  const getBlob = (): Promise<Blob | null> =>
    new Promise(resolve => {
      if (!canvasRef.current) { resolve(null); return; }
      canvasRef.current.toBlob(resolve, "image/png");
    });

  const bg   = dark ? "#0a0010" : "#f0ece4";
  const text = dark ? "#fff" : "#111";
  const [tab, setTab] = useState<"nanto" | "kourin" | "filter">("kourin");

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Arial Black','Helvetica Neue',sans-serif", color: text }}>

      {/* ── Header ── */}
      <div style={{ background: "#FFE600", padding: isMobile ? "10px 14px" : "14px 24px", display: "flex", alignItems: "center", gap: 10, borderBottom: "4px solid #111" }}>
        <img src="/aiko-logo.png" alt="Aiko,animal" style={{ height: isMobile ? 28 : 36, objectFit: "contain" }} />
        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#111", letterSpacing: -1, lineHeight: 1, whiteSpace: "nowrap" }}>うちのこメーカー</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>SNS画像メーカー</div>
        <a
          href="https://aikoanimal.base.shop/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: "auto", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", whiteSpace: "nowrap" }}>Aiko,animal AI STUDIO</div>
          <div style={{ fontSize: 11, color: "#e07050", fontWeight: 700, whiteSpace: "nowrap" }}>🐾 うちの子グッズはこちら →</div>
        </a>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "3px solid #111", background: "#FFE600" }}>
        {([["kourin", "🐾 降臨メーカー"], ["filter", "🖤 フィルターメーカー"], ["nanto", "⚡ なんとメーカー"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: isMobile ? "8px 12px" : "10px 22px",
            fontSize: isMobile ? 12 : 14, fontWeight: 900,
            border: "none", borderBottom: tab === id ? "3px solid #e07050" : "3px solid transparent",
            background: tab === id ? "#fff" : "transparent",
            cursor: "pointer", color: "#111", marginBottom: -3, whiteSpace: "nowrap",
          }}>{label}</button>
        ))}
      </div>

      {tab === "kourin" ? (
        <Kourin isMobile={isMobile} dark={dark} text={text} bg={bg} />
      ) : tab === "filter" ? (
        <Filter isMobile={isMobile} dark={dark} text={text} bg={bg} />
      ) : (
      <>
      <div style={{
        maxWidth: 1080, margin: "0 auto", padding: isMobile ? 12 : 20,
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
        gap: isMobile ? 12 : 20,
        alignItems: "start",
      }}>

        {/* ── Canvas / Drop zone ── */}
        <div>
          {!imgSrc ? (
            <div
              onClick={() => document.getElementById("fi")?.click()}
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

        {/* ── Controls ── */}
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

      <input id="fi" type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files?.[0] ?? null)} />
      </>
      )}

      {/* ── Footer ── */}
      <footer style={{
        marginTop: 40, borderTop: `3px solid ${dark ? "#222" : "#e0d8cc"}`,
        padding: "20px 24px", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        background: dark ? "#0a0010" : "#f0ece4",
      }}>
        <a
          href="https://x.com/aiaiaigirl"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}
        >
          <img src="/aiko-logo.png" alt="Aiko,animal" style={{ height: 28, objectFit: "contain" }} />
          <span style={{ fontSize: 13, fontWeight: 900, color: dark ? "#fff" : "#111", letterSpacing: 0.5 }}>
            Created by <span style={{ color: "#e07050" }}>Aiko,animal</span>
          </span>
          <span style={{ fontSize: 11, color: "#888" }}>@aiaiaigirl</span>
        </a>
        <p style={{
          fontSize: 11, color: dark ? "#555" : "#999", lineHeight: 1.7,
          maxWidth: 480, margin: 0,
        }}>
          本ツールで作成した画像の利用は自己責任でお願いします。<br />
          肖像権・著作権など第三者の権利を侵害しないようご注意ください。<br />
          Aiko,animal は画像の利用によって生じたいかなる損害についても責任を負いません。
        </p>
        <p style={{ fontSize: 10, color: dark ? "#444" : "#bbb", margin: 0 }}>
          © {new Date().getFullYear()} Aiko,animal AI STUDIO
        </p>
      </footer>

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

function SliderRow({ label, value, min, max, step, onChange, display, dark }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display?: string; dark: boolean;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: dark ? "#888" : "#666" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#FFE600", background: "#111", padding: "1px 5px" }}>{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#FFE600" }} />
    </div>
  );
}

function ToggleRow({ label, value, onChange, dark }: { label: string; value: boolean; onChange: (v: boolean) => void; dark: boolean }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, cursor: "pointer", padding: "4px 0", WebkitTapHighlightColor: "transparent" }}
    >
      <span style={{ fontSize: 12, color: dark ? "#888" : "#666" }}>{label}</span>
      <div style={{
        width: 48, height: 26, border: "2px solid #111", flexShrink: 0,
        background: value ? "#FFE600" : dark ? "#222" : "#eee",
        position: "relative",
      }}>
        <div style={{ width: 18, height: 18, background: "#111", position: "absolute", top: 2, left: value ? 26 : 4, transition: "left 0.15s" }} />
      </div>
    </div>
  );
}

function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: primary ? 2 : 1, padding: "10px 8px",
      border: "3px solid #111", background: primary ? "#FFE600" : "transparent",
      color: "#111", fontWeight: 900, fontSize: 12, cursor: "pointer",
      fontFamily: "'Arial Black',sans-serif",
    }}>{children}</button>
  );
}
