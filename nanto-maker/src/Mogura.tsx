import { useState, useRef, useEffect, useCallback } from "react";
import ShareBar from "./ShareBar";

const HOLE_COUNT = 9;
const GAME_DURATION = 30;
const MOLE_STAY_MS = 1200;

const PINK = "#ff7aa8";
const PINK_DARK = "#c94279";
const PINK_BG = "#ffe1ec";

type Phase = "upload" | "ready" | "playing" | "gameover";

interface Props { isMobile: boolean; dark: boolean; text: string; bg: string; }

export default function Mogura({ isMobile, dark, text }: Props) {
  const [phase, setPhase]       = useState<Phase>("upload");
  const [score, setScore]       = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [holes, setHoles]       = useState<boolean[]>(Array(HOLE_COUNT).fill(false));
  const [hitIdx, setHitIdx]     = useState<number | null>(null);
  const [petSrc, setPetSrc]     = useState<string | null>(null);

  const scoreRef    = useRef(0);
  const timeLeftRef = useRef(GAME_DURATION);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreCanvas = useRef<HTMLCanvasElement>(null);

  const holeSize = isMobile ? 90 : 130;

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleRef.current) clearInterval(moleRef.current);
  };

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    timeLeftRef.current = GAME_DURATION;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setHoles(Array(HOLE_COUNT).fill(false));
    setHitIdx(null);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const next = t <= 1 ? 0 : t - 1;
        timeLeftRef.current = next;
        if (next === 0) {
          clearTimers();
          setHoles(Array(HOLE_COUNT).fill(false));
          setPhase("gameover");
        }
        return next;
      });
    }, 1000);

    let interval = 800;
    const spawnOne = () => {
      const idx = Math.floor(Math.random() * HOLE_COUNT);
      setHoles(prev => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      setTimeout(() => {
        setHoles(prev => { const n = [...prev]; n[idx] = false; return n; });
      }, MOLE_STAY_MS);
    };

    const spawnMoles = () => {
      spawnOne();
      if (timeLeftRef.current <= 15) setTimeout(() => spawnOne(), 150);
    };

    moleRef.current = setInterval(() => {
      spawnMoles();
      if (interval > 400) interval -= 20;
    }, interval);
  }, []);

  useEffect(() => () => clearTimers(), []);

  const handleWhack = (i: number) => {
    if (phase !== "playing" || !holes[i]) return;
    setHoles(prev => { const n = [...prev]; n[i] = false; return n; });
    setHitIdx(i);
    setTimeout(() => setHitIdx(null), 300);
    scoreRef.current += 1;
    setScore(scoreRef.current);
  };

  const handleFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (petSrc && petSrc.startsWith("blob:")) URL.revokeObjectURL(petSrc);
    setPetSrc(URL.createObjectURL(file));
  };

  const getBlob = (): Promise<Blob | null> => new Promise(resolve => {
    const canvas = scoreCanvas.current;
    if (!canvas || !petSrc) { resolve(null); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { resolve(null); return; }
    canvas.width = 600; canvas.height = 600;
    ctx.fillStyle = PINK_BG;
    ctx.fillRect(0, 0, 600, 600);
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(300, 240, 180, 0, Math.PI * 2);
      ctx.clip();
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 120, 60, 360, 360);
      ctx.restore();
      ctx.fillStyle = PINK_DARK;
      ctx.font = "bold 52px 'Arial Black', sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 6;
      ctx.strokeText(`${scoreRef.current}点！`, 300, 480);
      ctx.fillText(`${scoreRef.current}点！`, 300, 480);
      ctx.font = "bold 26px 'Arial Black', sans-serif";
      ctx.strokeText("うちのこもぐらたたき🐾", 300, 540);
      ctx.fillText("うちのこもぐらたたき🐾", 300, 540);
      canvas.toBlob(resolve, "image/png");
    };
    img.src = petSrc;
  });

  const panel  = dark ? "#1a1a2e" : "#fff";
  const border = dark ? "#333" : "#f5d5e3";
  const labelStyle = { fontSize: 11, fontWeight: 700, color: dark ? "#aaa" : "#666", marginBottom: 6, display: "block" as const };

  // ── アップロード画面 ──
  if (phase === "upload") return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: isMobile ? 12 : 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: panel, borderRadius: 12, padding: 14, border: `1px solid ${border}` }}>
        <span style={labelStyle}>うちの子の写真をアップロード</span>
        <button onClick={() => document.getElementById("mogura-fi")?.click()}
          style={{ width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: "pointer", border: `2px dashed ${border}`,
            background: petSrc ? "#fff7fb" : "transparent", color: text }}>
          {petSrc ? "✅ 写真を変更" : "📷 写真を選ぶ"}
        </button>
      </div>

      {petSrc && (
        <div style={{ textAlign: "center" }}>
          <img src={petSrc} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "50%", border: `3px solid ${PINK}` }} />
        </div>
      )}

      {petSrc && (
        <button onClick={() => setPhase("ready")}
          style={{ padding: "16px", borderRadius: 12, fontSize: 16, fontWeight: 900,
            background: PINK, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 6px 14px rgba(255,122,168,0.4)" }}>
          ゲームスタート準備 →
        </button>
      )}
      <input id="mogura-fi" type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files?.[0] ?? null)} />
    </div>
  );

  // ── 準備画面 ──
  if (phase === "ready") return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 20, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: text }}>うちのこもぐらたたき🐾</div>
      <img src={petSrc!} style={{ width: 140, height: 140, objectFit: "cover", borderRadius: "50%", border: `4px solid ${PINK}` }} />
      <div style={{ fontSize: 14, color: dark ? "#aaa" : "#666", lineHeight: 1.8 }}>
        出てきたうちの子をタップ！<br />
        制限時間：{GAME_DURATION}秒
      </div>
      <button onClick={startGame}
        style={{ padding: "18px 48px", borderRadius: 999, fontSize: 20, fontWeight: 900,
          background: PINK, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 8px 18px rgba(255,122,168,0.4)" }}>
        🎮 スタート！
      </button>
      <button onClick={() => setPhase("upload")}
        style={{ fontSize: 13, color: dark ? "#aaa" : "#888", background: "none", border: "none", cursor: "pointer" }}>
        ← 写真を変え直す
      </button>
    </div>
  );

  // ── ゲームオーバー画面 ──
  if (phase === "gameover") return (
    <div style={{ maxWidth: 500, margin: "30px auto", padding: 20, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, color: text }}>ゲーム終了！🎉</div>
      <img src={petSrc!} style={{ width: 130, height: 130, objectFit: "cover", borderRadius: "50%", border: `4px solid ${PINK}` }} />
      <div style={{ fontSize: 52, fontWeight: 900, color: PINK_DARK }}>{score}<span style={{ fontSize: 24 }}>点</span></div>
      <div style={{ fontSize: 13, color: dark ? "#aaa" : "#666" }}>
        {score >= 40 ? "パーフェクト！天才すぎる！🎖️" : score >= 30 ? "すごい！さすが！🏆" : score >= 20 ? "なかなかやるね😄" : score >= 10 ? "もう少し！惜しい！💪" : "もう一回チャレンジ！🔥"}
      </div>
      <canvas ref={scoreCanvas} style={{ display: "none" }} />
      <ShareBar getBlob={getBlob} dark={dark} />
      <button onClick={startGame}
        style={{ marginTop: 8, padding: "14px 36px", borderRadius: 999, fontSize: 16, fontWeight: 900,
          background: PINK, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 6px 14px rgba(255,122,168,0.4)" }}>
        🔄 もう一度
      </button>
      <button onClick={() => { setPhase("upload"); setPetSrc(null); }}
        style={{ fontSize: 13, color: dark ? "#aaa" : "#888", background: "none", border: "none", cursor: "pointer" }}>
        別の写真で遊ぶ
      </button>
    </div>
  );

  // ── ゲーム画面 ──
  const gridSize = holeSize * 3 + 24;
  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: isMobile ? 8 : 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>

      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px",
        background: PINK, border: "none", borderRadius: 12, boxShadow: "0 6px 14px rgba(255,122,168,0.32)" }}>
        <div style={{ fontWeight: 900, fontSize: 20, color: "#fff" }}>🏆 {score}点</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: timeLeft <= 10 ? "#fff45c" : "#fff" }}>⏱ {timeLeft}秒</div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: `repeat(3, ${holeSize}px)`,
        gap: 8, padding: 12, background: "#ffd1e0", borderRadius: 18, border: `4px solid ${PINK}`,
        width: gridSize, userSelect: "none",
      }}>
        {holes.map((active, i) => (
          <div key={i}
            onClick={() => handleWhack(i)}
            onTouchStart={e => { e.preventDefault(); handleWhack(i); }}
            style={{
              width: holeSize, height: holeSize, borderRadius: "50%",
              background: "#5a3a4a", border: "4px solid #3d2233",
              position: "relative", overflow: "hidden", cursor: active ? "pointer" : "default",
              boxShadow: "inset 0 8px 16px rgba(0,0,0,0.5)",
            }}>
            <div style={{
              position: "absolute", bottom: active ? "5%" : "-100%",
              left: "50%", transform: "translateX(-50%)",
              width: "88%", height: "88%",
              transition: active ? "bottom 0.12s ease-out" : "bottom 0.2s ease-in",
              borderRadius: "50%", overflow: "hidden",
              border: hitIdx === i ? `4px solid ${PINK_DARK}` : "3px solid #fff",
              boxShadow: hitIdx === i ? `0 0 20px ${PINK}` : "none",
              background: "#fff",
            }}>
              {petSrc && (
                <img src={petSrc} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
            </div>
            {hitIdx === i && (
              <div style={{
                position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
                fontSize: holeSize * 0.22, fontWeight: 900, color: "#fff",
                textShadow: `0 2px 4px ${PINK_DARK}`, pointerEvents: "none", zIndex: 10,
              }}>ぽこん！</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: timeLeft <= 15 ? PINK_DARK : dark ? "#888" : "#999" }}>
        {timeLeft <= 15 ? "⚡ 2匹同時出現！急いで！" : "出てきたうちの子をタップ！"}
      </div>
    </div>
  );
}
