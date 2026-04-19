import { useState, useRef, useEffect, useCallback } from "react";
import { removeBackground } from "@imgly/background-removal";
import ShareBar from "./ShareBar";

const HOLE_COUNT = 9;
const GAME_DURATION = 30;
const MOLE_STAY_MS = 1200;

type Phase = "upload" | "ready" | "playing" | "gameover";

interface Props { isMobile: boolean; dark: boolean; text: string; bg: string; }

export default function Mogura({ isMobile, dark, text, bg }: Props) {
  const [phase, setPhase]           = useState<Phase>("upload");
  const [score, setScore]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(GAME_DURATION);
  const [holes, setHoles]           = useState<boolean[]>(Array(HOLE_COUNT).fill(false));
  const [hitIdx, setHitIdx]         = useState<number | null>(null);
  const [petFile, setPetFile]       = useState<File | null>(null);
  const [petSrc, setPetSrc]         = useState<string | null>(null);
  const [removedSrc, setRemovedSrc] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState("");

  const scoreRef    = useRef(0);
  const timeLeftRef = useRef(GAME_DURATION);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreCanvas = useRef<HTMLCanvasElement>(null);

  const displaySrc = removedSrc || petSrc;
  const holeSize   = isMobile ? 90 : 130;

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

    // カウントダウン
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

    // もぐら出現（残り15秒から2匹同時）
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
      // 残り15秒以下なら2匹目も出す（別の穴）
      if (timeLeftRef.current <= 15) {
        setTimeout(() => spawnOne(), 150);
      }
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

  const handleFile = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPetFile(file);
    setPetSrc(URL.createObjectURL(file));
    setRemovedSrc(null);
    // アップロードと同時に自動で背景除去開始
    setLoading(true);
    setProgress("背景除去の準備中です…（初回のみ時間がかかります）");
    try {
      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          if (key === "compute:inference")
            setProgress(`背景を除去中… ${Math.round((current / total) * 100)}%`);
          else if (key.startsWith("fetch"))
            setProgress(`準備中… ${Math.round((current / total) * 100)}%（初回のみ）`);
        },
      });
      setRemovedSrc(URL.createObjectURL(blob));
      setProgress("");
    } catch { setProgress("エラーが発生しました。もう一度試してください。"); }
    setLoading(false);
  };

  // スコア画像生成
  const getBlob = (): Promise<Blob | null> => new Promise(resolve => {
    const canvas = scoreCanvas.current;
    if (!canvas || !displaySrc) { resolve(null); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { resolve(null); return; }
    canvas.width = 600; canvas.height = 600;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 600, 600);
    const img = new Image();
    img.onload = () => {
      // 丸くクリップして中央に描画
      ctx.save();
      ctx.beginPath();
      ctx.arc(300, 240, 180, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 120, 60, 360, 360);
      ctx.restore();
      // テキスト
      ctx.fillStyle = "#111";
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
    img.src = displaySrc;
  });

  const panel  = dark ? "#1a1a2e" : "#fff";
  const border = dark ? "#333" : "#ddd";
  const labelStyle = { fontSize: 11, fontWeight: 700, color: dark ? "#aaa" : "#666", marginBottom: 6, display: "block" as const };

  // ── アップロード画面 ──
  if (phase === "upload") return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: isMobile ? 12 : 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: panel, borderRadius: 8, padding: 14, border: `1px solid ${border}` }}>
        <span style={labelStyle}>うちの子の写真をアップロード</span>
        <button onClick={() => document.getElementById("mogura-fi")?.click()} disabled={loading}
          style={{ width: "100%", padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", border: `2px dashed ${border}`,
            background: removedSrc ? "#f6fff6" : "transparent", color: text }}>
          {loading ? "⏳ 処理中..." : removedSrc ? "✅ 写真を変更" : "📷 写真を選ぶ"}
        </button>
        {progress && (
          <div style={{ fontSize: 11, color: "#e07050", fontWeight: 700, textAlign: "center", marginTop: 6 }}>
            {progress}
          </div>
        )}
        {removedSrc && !loading && (
          <div style={{ fontSize: 11, color: "#4caf50", fontWeight: 700, textAlign: "center", marginTop: 6 }}>
            ✅ 準備完了！
          </div>
        )}
      </div>

      {petSrc && (
        <div style={{ textAlign: "center" }}>
          <img src={removedSrc || petSrc} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "50%", border: "3px solid #FFE600" }} />
        </div>
      )}

      {petSrc && (
        <button onClick={() => setPhase("ready")}
          style={{ padding: "16px", borderRadius: 8, fontSize: 16, fontWeight: 900,
            background: "#FFE600", color: "#111", border: "3px solid #111", cursor: "pointer" }}>
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
      <img src={removedSrc || petSrc!} style={{ width: 140, height: 140, objectFit: "cover", borderRadius: "50%", border: "4px solid #FFE600" }} />
      <div style={{ fontSize: 14, color: dark ? "#aaa" : "#666", lineHeight: 1.8 }}>
        出てきたうちの子をタップ！<br />
        制限時間：{GAME_DURATION}秒
      </div>
      <button onClick={startGame}
        style={{ padding: "18px 48px", borderRadius: 8, fontSize: 20, fontWeight: 900,
          background: "#FFE600", color: "#111", border: "3px solid #111", cursor: "pointer" }}>
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
      <img src={removedSrc || petSrc!} style={{ width: 130, height: 130, objectFit: "cover", borderRadius: "50%", border: "4px solid #FFE600" }} />
      <div style={{ fontSize: 52, fontWeight: 900, color: "#e07050" }}>{score}<span style={{ fontSize: 24 }}>点</span></div>
      <div style={{ fontSize: 13, color: dark ? "#aaa" : "#666" }}>
        {score >= 40 ? "パーフェクト！天才すぎる！🎖️" : score >= 30 ? "すごい！さすが！🏆" : score >= 20 ? "なかなかやるね😄" : score >= 10 ? "もう少し！惜しい！💪" : "もう一回チャレンジ！🔥"}
      </div>
      <canvas ref={scoreCanvas} style={{ display: "none" }} />
      <ShareBar getBlob={getBlob} dark={dark} />
      <button onClick={startGame}
        style={{ marginTop: 8, padding: "14px 36px", borderRadius: 8, fontSize: 16, fontWeight: 900,
          background: "#FFE600", color: "#111", border: "3px solid #111", cursor: "pointer" }}>
        🔄 もう一度
      </button>
      <button onClick={() => { setPhase("upload"); setPetSrc(null); setRemovedSrc(null); setPetFile(null); }}
        style={{ fontSize: 13, color: dark ? "#aaa" : "#888", background: "none", border: "none", cursor: "pointer" }}>
        別の写真で遊ぶ
      </button>
    </div>
  );

  // ── ゲーム画面 ──
  const gridSize = holeSize * 3 + 24;
  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: isMobile ? 8 : 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>

      {/* スコア・タイマー */}
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px",
        background: "#FFE600", border: "3px solid #111", borderRadius: 8 }}>
        <div style={{ fontWeight: 900, fontSize: 20, color: "#111" }}>🏆 {score}点</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: timeLeft <= 10 ? "#e07050" : "#111" }}>⏱ {timeLeft}秒</div>
      </div>

      {/* ゲームフィールド */}
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(3, ${holeSize}px)`,
        gap: 8, padding: 12, background: "#7dba5f", borderRadius: 16, border: "4px solid #5a9a44",
        width: gridSize, userSelect: "none",
      }}>
        {holes.map((active, i) => (
          <div key={i}
            onClick={() => handleWhack(i)}
            onTouchStart={e => { e.preventDefault(); handleWhack(i); }}
            style={{
              width: holeSize, height: holeSize, borderRadius: "50%",
              background: "#5a3a1a", border: "4px solid #3d2610",
              position: "relative", overflow: "hidden", cursor: active ? "pointer" : "default",
              boxShadow: "inset 0 8px 16px rgba(0,0,0,0.5)",
            }}>
            {/* もぐら（うちの子） */}
            <div style={{
              position: "absolute", bottom: active ? "5%" : "-100%",
              left: "50%", transform: "translateX(-50%)",
              width: "88%", height: "88%",
              transition: active ? "bottom 0.12s ease-out" : "bottom 0.2s ease-in",
              borderRadius: "50%", overflow: "hidden",
              border: hitIdx === i ? "4px solid #FFE600" : "3px solid #fff",
              boxShadow: hitIdx === i ? "0 0 20px #FFE600" : "none",
            }}>
              {displaySrc && (
                <img src={displaySrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            {/* ヒットエフェクト */}
            {hitIdx === i && (
              <div style={{
                position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
                fontSize: holeSize * 0.22, fontWeight: 900, color: "#FFE600",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)", pointerEvents: "none", zIndex: 10,
              }}>ぽこん！</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: timeLeft <= 15 ? "#e07050" : dark ? "#888" : "#999" }}>
        {timeLeft <= 15 ? "⚡ 2匹同時出現！急いで！" : "出てきたうちの子をタップ！"}
      </div>
    </div>
  );
}
