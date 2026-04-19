import { useNavigate } from "react-router-dom";

interface Props { isMobile: boolean; dark: boolean; }

export default function Home({ isMobile, dark }: Props) {
  const navigate = useNavigate();
  const bg  = dark ? "#0a0010" : "#f0ece4";
  const text = dark ? "#fff" : "#111";

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "32px 16px" : "60px 24px", gap: 16 }}>

      <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 900, letterSpacing: 4, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
        WHAT DO YOU WANT TO MAKE?
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20, width: "100%", maxWidth: 980 }}>

        {/* ゲーム */}
        <button
          onClick={() => navigate("/game")}
          style={{
            border: "4px solid #111", background: "#111", color: "#FFE600",
            padding: isMobile ? "36px 20px" : "48px 28px",
            cursor: "pointer", textAlign: "left",
            fontFamily: "'Arial Black','Helvetica Neue',sans-serif",
            display: "flex", flexDirection: "column", gap: 10,
            transition: "transform 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ fontSize: isMobile ? 44 : 56 }}>🎮</div>
          <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
            ゲーム
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", lineHeight: 1.6 }}>
            うちの子もぐらたたき<br />
            写真を入れて遊ぼう！
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: "#FFE600", letterSpacing: 1 }}>
            PLAY →
          </div>
        </button>

        {/* メーカー */}
        <button
          onClick={() => navigate("/maker")}
          style={{
            border: "4px solid #111", background: "#FFE600", color: "#111",
            padding: isMobile ? "36px 20px" : "48px 28px",
            cursor: "pointer", textAlign: "left",
            fontFamily: "'Arial Black','Helvetica Neue',sans-serif",
            display: "flex", flexDirection: "column", gap: 10,
            transition: "transform 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ fontSize: isMobile ? 44 : 56 }}>🖼️</div>
          <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
            画像メーカー
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", lineHeight: 1.6 }}>
            うちの子降臨メーカー<br />
            集中線なんとメーカー
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: "#111", letterSpacing: 1 }}>
            CREATE →
          </div>
        </button>

        {/* クイズ */}
        <button
          onClick={() => navigate("/quiz")}
          style={{
            border: "4px solid #111", background: "#e07050", color: "#fff",
            padding: isMobile ? "36px 20px" : "48px 28px",
            cursor: "pointer", textAlign: "left",
            fontFamily: "'Arial Black','Helvetica Neue',sans-serif",
            display: "flex", flexDirection: "column", gap: 10,
            transition: "transform 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ fontSize: isMobile ? 44 : 56 }}>🌹</div>
          <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
            クイズ
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
            あなた、わかってる？<br />
            クイズを作ってシェア！
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>
            START →
          </div>
        </button>

      </div>

      <p style={{ fontSize: 11, color: "#aaa", marginTop: 16, textAlign: "center", lineHeight: 1.8 }}>
        無料・ダウンロード不要・SNSにシェアできる🐾
      </p>
    </div>
  );
}
