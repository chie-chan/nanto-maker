import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ShareBar from "./ShareBar";

// ── 結果メッセージ ──────────────────────────────────────────
function getMessage(correct: number, total: number): string {
  if (correct === total)                 return "ふふ。あなた、わかってるわね。🌹";
  if (correct >= Math.ceil(total * 0.6)) return "まあ。もう少しで及第点よ。💅";
  if (correct >= 1)                      return "あら。まだまだ修行が必要ね。😤";
  return "まあ！出直してらっしゃい。👋";
}

// ── シャッフル ──────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── クイズデータ encode / decode ────────────────────────────
interface QuizData {
  name: string;
  questions: Array<{ q: string; a: string; d1: string; d2: string }>;
}
function encodeQuiz(data: QuizData): string {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}
function decodeQuiz(s: string): QuizData | null {
  try { return JSON.parse(decodeURIComponent(atob(s))); } catch { return null; }
}

// ── 結果画像（集中線） ──────────────────────────────────────
function drawQuizResult(
  canvas: HTMLCanvasElement,
  creatorName: string,
  correct: number,
  total: number,
  message: string
) {
  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, S, S);

  const cx = S / 2, cy = S / 2;
  const maxR = S * 0.87;
  const count = 120;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const spread = (Math.PI / count) * 0.55;
    const r0 = 28 + Math.random() * 22;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle - spread) * r0, cy + Math.sin(angle - spread) * r0);
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
    ctx.moveTo(cx + Math.cos(angle + spread) * r0, cy + Math.sin(angle + spread) * r0);
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
    ctx.strokeStyle = `rgba(0,0,0,${0.45 + Math.random() * 0.55})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.stroke();
  }

  const bw = 880, bh = 500;
  const bx = (S - bw) / 2, by = (S - bh) / 2;
  ctx.fillStyle = "#FFE600";
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 9;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.textAlign = "center";
  ctx.fillStyle = "#111";

  ctx.font = "bold 44px 'Arial Black', Arial, sans-serif";
  ctx.fillText(`${creatorName}のクイズ`, cx, by + 88);
  ctx.fillRect(bx + 50, by + 108, bw - 100, 5);

  ctx.font = "900 108px 'Arial Black', Arial, sans-serif";
  ctx.fillText(`${correct}/${total}問正解！`, cx, by + 268);

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(bx + 50, by + 298, bw - 100, 3);
  ctx.fillStyle = "#111";

  ctx.font = "bold 38px 'Arial Black', Arial, sans-serif";
  const parts = message.split("。").filter(Boolean);
  if (parts.length >= 2) {
    ctx.fillText(parts[0] + "。", cx, by + 375);
    ctx.fillText(parts.slice(1).join("。"), cx, by + 430);
  } else {
    ctx.fillText(message, cx, by + 405);
  }

  ctx.font = "600 26px Arial, sans-serif";
  ctx.fillStyle = "#999";
  ctx.fillText("🐾 うちのこメーカー", cx, S - 44);
}

// ── Props ───────────────────────────────────────────────────
interface Props { isMobile: boolean; dark: boolean; text: string; bg: string; }

// ── メインコンポーネント ────────────────────────────────────
export default function QuizPage({ isMobile, dark, text, bg }: Props) {
  const [params] = useSearchParams();
  const quizParam = params.get("q");
  const quizData = quizParam ? decodeQuiz(quizParam) : null;

  if (quizData) {
    return <QuizPlayer isMobile={isMobile} dark={dark} text={text} bg={bg} data={quizData} />;
  }
  return <QuizCreator isMobile={isMobile} dark={dark} text={text} bg={bg} />;
}

// ── 出題者画面 ──────────────────────────────────────────────
function QuizCreator({ isMobile, dark, text, bg }: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState([
    { q: "", a: "", d1: "", d2: "" },
    { q: "", a: "", d1: "", d2: "" },
    { q: "", a: "", d1: "", d2: "" },
  ]);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const addQuestion = () => setQuestions(qs => [...qs, { q: "", a: "", d1: "", d2: "" }]);
  const removeQuestion = (i: number) => setQuestions(qs => qs.filter((_, idx) => idx !== i));
  const updateQ = (i: number, field: "q" | "a" | "d1" | "d2", val: string) =>
    setQuestions(qs => qs.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const generateUrl = () => {
    if (!name.trim()) { alert("名前を入力してください"); return; }
    const filled = questions.filter(q => q.q.trim() && q.a.trim() && q.d1.trim() && q.d2.trim());
    if (filled.length === 0) { alert("全ての欄を入力してください"); return; }
    const data: QuizData = { name: name.trim(), questions: filled };
    const url = `${window.location.origin}/quiz?q=${encodeQuiz(data)}`;
    setGeneratedUrl(url);
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(generatedUrl); }
    catch {
      const el = document.createElement("textarea");
      el.value = generatedUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const inp = (extra?: object) => ({
    border: "3px solid #111", padding: "10px 12px", fontSize: 15,
    fontFamily: "sans-serif", background: "#fff", color: "#111",
    width: "100%", boxSizing: "border-box" as const, outline: "none", ...extra,
  });

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "3px solid #111", background: "#FFE600", alignItems: "center" }}>
        <div style={{ padding: isMobile ? "8px 12px" : "10px 22px", fontSize: isMobile ? 12 : 14, fontWeight: 900, color: "#111" }}>
          🌹 あなた、わかってる？
        </div>
        <button onClick={() => navigate("/")} style={{
          marginLeft: "auto", padding: isMobile ? "8px 12px" : "10px 18px",
          fontSize: isMobile ? 11 : 13, fontWeight: 700,
          border: "none", background: "transparent", cursor: "pointer", color: "#555",
        }}>← ホームへ</button>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: isMobile ? "24px 16px" : "36px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, marginBottom: 6 }}>
            あなた、わかってる？メーカー
          </div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
            3択クイズを作ってURLをシェア。友達がどれだけ知ってるか試そう🌹
          </div>
        </div>

        {/* 名前 */}
        <SLabel>あなたの名前</SLabel>
        <input placeholder="例：あいこ" value={name}
          onChange={e => setName(e.target.value)}
          style={{ ...inp(), marginBottom: 24 }} />

        {/* 問題リスト */}
        <SLabel>問題と選択肢</SLabel>
        {questions.map((item, i) => (
          <div key={i} style={{
            border: "3px solid #111", padding: 14, marginBottom: 14,
            background: "#fff", position: "relative",
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2, color: "#999", marginBottom: 10 }}>
              Q{i + 1}
            </div>
            <input placeholder="質問（例：好きな食べ物は？）" value={item.q}
              onChange={e => updateQ(i, "q", e.target.value)}
              style={{ ...inp(), marginBottom: 10 }} />

            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <div style={{
                background: "#4CAF50", color: "#fff",
                fontSize: 10, fontWeight: 900, padding: "4px 8px",
                display: "flex", alignItems: "center", flexShrink: 0,
              }}>✅ 正解</div>
              <input placeholder="正解の答え（例：バナナ）" value={item.a}
                onChange={e => updateQ(i, "a", e.target.value)}
                style={{ ...inp({ flex: 1 }) }} />
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <div style={{
                background: "#e07050", color: "#fff",
                fontSize: 10, fontWeight: 900, padding: "4px 8px",
                display: "flex", alignItems: "center", flexShrink: 0,
              }}>❌ ダミー</div>
              <input placeholder="ダミーの答え1（例：りんご）" value={item.d1}
                onChange={e => updateQ(i, "d1", e.target.value)}
                style={{ ...inp({ flex: 1 }) }} />
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <div style={{
                background: "#e07050", color: "#fff",
                fontSize: 10, fontWeight: 900, padding: "4px 8px",
                display: "flex", alignItems: "center", flexShrink: 0,
              }}>❌ ダミー</div>
              <input placeholder="ダミーの答え2（例：みかん）" value={item.d2}
                onChange={e => updateQ(i, "d2", e.target.value)}
                style={{ ...inp({ flex: 1 }) }} />
            </div>

            {questions.length > 1 && (
              <button onClick={() => removeQuestion(i)} style={{
                position: "absolute", top: 8, right: 10,
                border: "none", background: "none",
                fontSize: 16, cursor: "pointer", color: "#bbb",
              }}>✕</button>
            )}
          </div>
        ))}

        <button onClick={addQuestion} style={{
          width: "100%", padding: "13px",
          border: "3px dashed #bbb", background: "transparent",
          fontSize: 14, fontWeight: 900, cursor: "pointer", color: "#888",
          marginBottom: 20, fontFamily: "sans-serif",
        }}>＋ 問題を追加</button>

        <button onClick={generateUrl} style={{
          width: "100%", padding: "16px",
          border: "3px solid #111", background: "#FFE600",
          fontSize: 16, fontWeight: 900, cursor: "pointer", color: "#111",
          marginBottom: 20, fontFamily: "sans-serif",
        }}>クイズURLを生成する →</button>

        {generatedUrl && (
          <div style={{ border: "4px solid #111", padding: 16, background: "#fff" }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: "#999", marginBottom: 8 }}>
              生成されたURL
            </div>
            <div style={{
              fontSize: 12, wordBreak: "break-all", color: "#333",
              background: "#f5f5f5", padding: 10, marginBottom: 12, lineHeight: 1.6,
            }}>{generatedUrl}</div>
            <button onClick={copyUrl} style={{
              width: "100%", padding: "14px",
              border: "3px solid #111",
              background: copied ? "#4CAF50" : "#111",
              color: copied ? "#fff" : "#FFE600",
              fontSize: 15, fontWeight: 900, cursor: "pointer",
              transition: "background 0.2s", fontFamily: "sans-serif",
            }}>{copied ? "✓ コピーしました！" : "URLをコピー"}</button>
            <div style={{ fontSize: 11, color: "#888", marginTop: 10, textAlign: "center" }}>
              このURLをSNSやDMでシェアしよう🐾
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 挑戦者画面（3択・即時フィードバック） ──────────────────
function QuizPlayer({ isMobile, dark, text, bg, data }: Props & { data: QuizData }) {
  const navigate = useNavigate();

  // 問題ごとにシャッフルした選択肢（初回のみ）
  const [shuffled] = useState(() =>
    data.questions.map(q => shuffle([q.a, q.d1, q.d2]))
  );

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected]  = useState<string | null>(null);
  const [phase, setPhase]        = useState<"play" | "result">("play");

  const scoreRef   = useRef(0);
  const canvasRef  = useRef<HTMLCanvasElement>(null);

  const q = data.questions[currentQ];
  const opts = shuffled[currentQ];

  const handleAnswer = (opt: string) => {
    if (selected !== null) return; // 連打防止
    setSelected(opt);
    if (opt === q.a) scoreRef.current += 1;

    setTimeout(() => {
      setSelected(null);
      const next = currentQ + 1;
      if (next >= data.questions.length) {
        setPhase("result");
        setTimeout(() => {
          if (!canvasRef.current) return;
          const c = scoreRef.current;
          drawQuizResult(canvasRef.current, data.name, c, data.questions.length, getMessage(c, data.questions.length));
        }, 50);
      } else {
        setCurrentQ(next);
      }
    }, 1300);
  };

  const retry = () => {
    scoreRef.current = 0;
    setCurrentQ(0);
    setSelected(null);
    setPhase("play");
  };

  const getBlob = (): Promise<Blob | null> =>
    new Promise(resolve => {
      if (!canvasRef.current) { resolve(null); return; }
      canvasRef.current.toBlob(resolve, "image/png");
    });

  const correct = scoreRef.current;
  const total   = data.questions.length;

  // ── 選択肢ボタンの色 ──
  const btnBg = (opt: string) => {
    if (selected === null) return "#fff";
    if (opt === q.a) return "#4CAF50";          // 正解は常に緑
    if (opt === selected) return "#e07050";      // 選んだハズレは赤
    return "#f0f0f0";                             // それ以外はグレー
  };
  const btnColor = (opt: string) => {
    if (selected === null) return "#111";
    if (opt === q.a || opt === selected) return "#fff";
    return "#bbb";
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: isMobile ? "24px 16px" : "36px 24px" }}>

      {phase === "play" && (
        <>
          {/* ヘッダー */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: "inline-block", background: "#e07050", color: "#fff",
              fontSize: 12, fontWeight: 900, padding: "4px 10px", letterSpacing: 1, marginBottom: 10,
            }}>
              {data.name}からの挑戦状 🌹
            </div>

            {/* 進捗バー */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {data.questions.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6,
                  background: i < currentQ ? "#4CAF50" : i === currentQ ? "#FFE600" : "#ddd",
                  border: "1.5px solid #111",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>

            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
              {currentQ + 1} / {total}問
            </div>
          </div>

          {/* 問題 */}
          <div style={{
            background: "#111", color: "#FFE600",
            padding: isMobile ? "18px 16px" : "22px 24px",
            fontWeight: 900, fontSize: isMobile ? 18 : 22,
            marginBottom: 20, lineHeight: 1.4,
          }}>
            Q{currentQ + 1}. {q.q}
          </div>

          {/* 3択ボタン */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {opts.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(opt)}
                disabled={selected !== null}
                style={{
                  padding: isMobile ? "16px 14px" : "18px 20px",
                  border: `3px solid ${selected !== null && opt === q.a ? "#4CAF50" : selected === opt ? "#e07050" : "#111"}`,
                  background: btnBg(opt),
                  color: btnColor(opt),
                  fontSize: isMobile ? 16 : 18, fontWeight: 900,
                  cursor: selected !== null ? "default" : "pointer",
                  textAlign: "left", transition: "all 0.2s",
                  fontFamily: "sans-serif",
                }}>
                {opt}
                {selected !== null && opt === q.a && <span style={{ float: "right" }}>✅</span>}
                {selected !== null && opt === selected && opt !== q.a && <span style={{ float: "right" }}>❌</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "result" && (
        <>
          {/* 結果サマリー */}
          <div style={{
            background: "#111", color: "#FFE600",
            padding: "24px", marginBottom: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{data.name}のクイズ 結果発表</div>
            <div style={{ fontSize: isMobile ? 36 : 44, fontWeight: 900 }}>
              {correct}/{total}問正解！
            </div>
            <div style={{ fontSize: 15, marginTop: 8, color: "#fff" }}>
              {getMessage(correct, total)}
            </div>
          </div>

          {/* 結果画像 */}
          <canvas ref={canvasRef} style={{ width: "100%", border: "4px solid #111", display: "block", marginBottom: 10 }} />
          <ShareBar getBlob={getBlob} dark={dark} />

          {/* ボタン */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={retry} style={{
              flex: 1, padding: "12px",
              border: "3px solid #111", background: "transparent",
              fontSize: 13, fontWeight: 900, cursor: "pointer", color: "#111",
            }}>もう一度挑戦</button>
            <button onClick={() => navigate("/quiz")} style={{
              flex: 1, padding: "12px",
              border: "3px solid #111", background: "#111",
              fontSize: 13, fontWeight: 900, cursor: "pointer", color: "#FFE600",
            }}>自分もクイズを作る</button>
          </div>
        </>
      )}
    </div>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}
