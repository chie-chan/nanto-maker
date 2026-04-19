import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import GamePage from "./GamePage";
import MakerPage from "./MakerPage";
import QuizPage from "./QuizPage";

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

export default function App() {
  const dark = false;
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 680;
  const bg   = dark ? "#0a0010" : "#f0ece4";
  const text = dark ? "#fff" : "#111";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Arial Black','Helvetica Neue',sans-serif", color: text }}>

      {/* ── Header ── */}
      <div style={{ background: "#FFE600", padding: isMobile ? "10px 14px" : "14px 24px", display: "flex", alignItems: "center", gap: 10, borderBottom: "4px solid #111" }}>
        <img src="/aiko-logo.png" alt="Aiko,animal" style={{ height: isMobile ? 28 : 36, objectFit: "contain" }} />
        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#111", letterSpacing: -1, lineHeight: 1, whiteSpace: "nowrap" }}>うちのこメーカー</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: 1 }}>うちのこあそびば</div>
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

      {/* ── Pages ── */}
      <Routes>
        <Route path="/"       element={<Home      isMobile={isMobile} dark={dark} />} />
        <Route path="/game"   element={<GamePage  isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
        <Route path="/maker"  element={<MakerPage isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
        <Route path="/quiz"   element={<QuizPage  isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
      </Routes>

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
        <p style={{ fontSize: 11, color: dark ? "#555" : "#999", lineHeight: 1.7, maxWidth: 480, margin: 0 }}>
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
