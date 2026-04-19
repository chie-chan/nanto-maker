import { useNavigate } from "react-router-dom";
import Mogura from "./Mogura";

interface Props { isMobile: boolean; dark: boolean; text: string; bg: string; }

export default function GamePage({ isMobile, dark, text, bg }: Props) {
  const navigate = useNavigate();

  return (
    <div>
      {/* タブバー（将来ゲームが増えた時用） */}
      <div style={{ display: "flex", borderBottom: "3px solid #111", background: "#FFE600" }}>
        <button style={{
          padding: isMobile ? "8px 12px" : "10px 22px",
          fontSize: isMobile ? 12 : 14, fontWeight: 900,
          border: "none", borderBottom: "3px solid #e07050",
          background: "#fff", cursor: "pointer", color: "#111",
          marginBottom: -3, whiteSpace: "nowrap",
        }}>🎮 もぐらたたき</button>

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

      <Mogura isMobile={isMobile} dark={dark} text={text} bg={bg} />
    </div>
  );
}
