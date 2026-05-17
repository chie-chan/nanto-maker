import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import GamePage from "./GamePage";
import Home from "./Home";
import Kourin from "./Kourin";
import MakerPage from "./MakerPage";
import Mogura from "./Mogura";
import Puzzle from "./Puzzle";
import QuizPage from "./QuizPage";

const FONT = '"M PLUS Rounded 1c","Zen Maru Gothic","Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif';

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return width;
}

const navItems = [
  { path: "/", label: "あそびば" },
  { path: "/puzzle", label: "パズル" },
  { path: "/mogura", label: "もぐら" },
  { path: "/kourin", label: "降臨" },
];

export default function App() {
  const dark = false;
  const isMobile = useWindowWidth() < 680;
  const bg = "#fffaf7";
  const text = "#2d2340";

  return (
    <div className="app-shell" style={{ minHeight: "100vh", background: bg, fontFamily: FONT, color: text }}>
      <header className="app-header">
        <NavLink to="/" className="brand">
          <img src="/aiko-logo.png" alt="aiko animal" />
          <span>
            <strong>あいこのあそびば</strong>
            {!isMobile && <small>by aiko animal AI STUDIO</small>}
          </span>
        </NavLink>

        <nav className="header-nav" aria-label="メインメニュー">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {!isMobile && (
          <a className="order-link" href="https://aikoanimal.base.shop/" target="_blank" rel="noopener noreferrer">
            SHOP
          </a>
        )}
      </header>

      <Routes>
        <Route path="/" element={<Home isMobile={isMobile} />} />
        <Route path="/game" element={<GamePage isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
        <Route path="/kourin" element={<Kourin isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
        <Route path="/mogura" element={<Mogura isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
        <Route path="/puzzle" element={<Puzzle isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
        <Route path="/nanto" element={<MakerPage isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
        <Route path="/maker" element={<Navigate to="/nanto" replace />} />
        <Route path="/quiz" element={<QuizPage isMobile={isMobile} dark={dark} text={text} bg={bg} />} />
      </Routes>

      <footer className="app-footer">
        <a href="https://x.com/aiaiaigirl" target="_blank" rel="noopener noreferrer">
          Created by aiko animal @aiaiaigirl
        </a>
        <p>あいこあにまるの小さなミニゲームです。すきま時間に、ふわっと遊んでください。</p>
        <small>© {new Date().getFullYear()} aiko animal AI STUDIO</small>
      </footer>
    </div>
  );
}
