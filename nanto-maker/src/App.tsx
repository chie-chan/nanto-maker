import { useState, useRef, useEffect, useCallback } from "react";
import { drawAll, SCHEMES, IMPACT_PRESETS, SPARKLE_COLORS } from "./canvas";
import type { Scheme, DrawOptions } from "./canvas";

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

export default function App() {
  const [imgSrc, setImgSrc]       = useState<string | null>(null);
  const [imgObj, setImgObj]       = useState<HTMLImageElement | null>(null);
  const [schemeIdx, setSchemeIdx] = useState(0);
  const [impactText, setImpactText] = useState("なんと！？");
  const [textPos, setTextPos]     = useState<DrawOptions["textPos"]>("top");
  const [lineCount, setLineCount] = useState(90);
  const [intensity, setIntensity] = useState(1.4);
  const [burstEdge, setBurstEdge] = useState(true);
  const [halftone, setHalftone]   = useState(false);
  const [textSize, setTextSize]   = useState(12);
  const [watercolor, setWatercolor]             = useState(false);
  const [watercolorStrength, setWatercolorStrength] = useState(0.7);
  const [sparkle, setSparkle]                   = useState(false);
  const [sparkleCount, setSparkleCount]         = useState(15);
  const [sparkleColorId, setSparkleColorId]     = useState("white");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scheme: Scheme = SCHEMES[schemeIdx];
  const dark = scheme.bg === "#111111" || scheme.bg === "#0a0020";
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 680;

  const render = useCallback(() => {
    if (!canvasRef.current) return;
    drawAll(canvasRef.current, imgObj, {
      scheme, impactText, textPos, lineCount, intensity, burstEdge, halftone, textSize,
      watercolor, watercolorStrength,
      sparkle, sparkleCount, sparkleColorId,
    });
  }, [imgObj, scheme, impactText, textPos, lineCount, intensity, burstEdge, halftone, textSize,
      watercolor, watercolorStrength, sparkle, sparkleCount, sparkleColorId]);

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

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = `nanto-${Date.now()}.png`;
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  const bg   = dark ? "#0a0010" : "#f0ece4";
  const text = dark ? "#fff" : "#111";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Arial Black','Helvetica Neue',sans-serif", color: text }}>

      {/* ── Header ── */}
      <div style={{ background: "#FFE600", padding: isMobile ? "10px 14px" : "14px 24px", display: "flex", alignItems: "center", gap: 10, borderBottom: "4px solid #111" }}>
        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#111", letterSpacing: -1, lineHeight: 1, whiteSpace: "nowrap" }}>なんと！？</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>衝撃SNS画像メーカー</div>
        {!isMobile && <div style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>for pets & daily life</div>}
      </div>

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
                <Btn primary onClick={handleDownload}>⬇ {isMobile ? "保存" : "ダウンロード（1080px）"}</Btn>
              </div>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {IMPACT_PRESETS.map(t => (
                <button key={t} onClick={() => setImpactText(t)} style={{
                  padding: "4px 8px", fontSize: 11, fontWeight: 700,
                  border: `2px solid ${impactText === t ? "#111" : dark ? "#333" : "#ccc"}`,
                  background: impactText === t ? "#FFE600" : "transparent",
                  color: impactText === t ? "#111" : dark ? "#aaa" : "#555",
                  cursor: "pointer",
                }}>{t}</button>
              ))}
            </div>
          </Panel>

          <Panel dark={dark} label="テキスト位置">
            <div style={{ display: "flex", gap: 6 }}>
              {TEXT_POSITIONS.map(p => (
                <button key={p.id} onClick={() => setTextPos(p.id)} style={{
                  flex: 1, padding: "8px 0", fontWeight: 900, fontSize: 14,
                  border: `3px solid ${textPos === p.id ? "#111" : dark ? "#333" : "#ccc"}`,
                  background: textPos === p.id ? "#FFE600" : "transparent",
                  color: textPos === p.id ? "#111" : dark ? "#aaa" : "#666",
                  cursor: "pointer",
                }}>{p.label}</button>
              ))}
            </div>
            <SliderRow label="文字サイズ" value={textSize} min={7} max={18} step={1}
              display={`${textSize}%`} onChange={setTextSize} dark={dark} />
          </Panel>

          <Panel dark={dark} label="カラー">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {SCHEMES.map((s, i) => (
                <button key={s.id} onClick={() => setSchemeIdx(i)} style={{
                  padding: "10px 6px",
                  border: `3px solid ${schemeIdx === i ? "#FFE600" : dark ? "#333" : "#ccc"}`,
                  outline: schemeIdx === i ? "2px solid #111" : "none",
                  background: s.bg, color: s.line, fontWeight: 900, fontSize: 12, cursor: "pointer",
                }}>{s.label}</button>
              ))}
            </div>
          </Panel>

          <Panel dark={dark} label="エフェクト">
            <SliderRow label="集中線の本数" value={lineCount} min={20} max={200} step={5} onChange={setLineCount} dark={dark} />
            <SliderRow label="線の太さ" value={intensity} min={0.3} max={3} step={0.1} display={intensity.toFixed(1)} onChange={setIntensity} dark={dark} />
            <ToggleRow label="爆発バースト背景" value={burstEdge} onChange={setBurstEdge} dark={dark} />
            <ToggleRow label="ハーフトーンドット" value={halftone} onChange={setHalftone} dark={dark} />
          </Panel>

          <Panel dark={dark} label="🎨 水彩画エフェクト">
            <ToggleRow label="水彩風にする" value={watercolor} onChange={setWatercolor} dark={dark} />
            {watercolor && (
              <SliderRow label="強さ" value={watercolorStrength} min={0.2} max={1.0} step={0.05}
                display={Math.round(watercolorStrength * 100) + "%"} onChange={setWatercolorStrength} dark={dark} />
            )}
          </Panel>

          <Panel dark={dark} label="✨ キラキラエフェクト">
            <ToggleRow label="キラキラを散らす" value={sparkle} onChange={setSparkle} dark={dark} />
            {sparkle && (
              <>
                <SliderRow label="数" value={sparkleCount} min={5} max={40} step={1}
                  display={`${sparkleCount}個`} onChange={setSparkleCount} dark={dark} />
                <div style={{ fontSize: 10, color: dark ? "#666" : "#999", marginBottom: 6, letterSpacing: 2 }}>色</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {Object.entries(SPARKLE_COLORS).map(([id, sc]) => (
                    <button key={id} onClick={() => setSparkleColorId(id)} style={{
                      flex: 1, minWidth: 48, padding: "8px 2px", fontSize: 11, fontWeight: 900, cursor: "pointer",
                      border: `3px solid ${sparkleColorId === id ? "#FFE600" : dark ? "#333" : "#ccc"}`,
                      outline: sparkleColorId === id ? "2px solid #111" : "none",
                      background: sc.color === "#ffffff" ? (dark ? "#333" : "#eee") : sc.color,
                      color: id === "white" ? "#111" : "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                    }}>{sc.label}</button>
                  ))}
                </div>
              </>
            )}
          </Panel>

        </div>
      </div>

      <input id="fi" type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files?.[0] ?? null)} />
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
