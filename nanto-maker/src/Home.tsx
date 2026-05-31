import { useNavigate } from "react-router-dom";

interface Props {
  isMobile: boolean;
}

const tools = [
  {
    id: "puzzle",
    path: "/puzzle",
    label: "GAME",
    title: "うちのこ回転パズル",
    sub: "写真をピースにして、ぐるっと並べて遊ぶジグソーパズル。",
    cta: "あそぶ",
    theme: "lavender",
    thumb: "/thumbs/puzzle.svg",
  },
  {
    id: "mogura",
    path: "/mogura",
    label: "GAME",
    title: "もぐらたたき",
    sub: "うちの子がぴょこっと出てくる、タップして遊ぶミニゲームです。",
    cta: "あそぶ",
    theme: "pink",
    thumb: "/thumbs/mogura.svg",
  },
  {
    id: "kourin",
    path: "/kourin",
    label: "FREE",
    title: "降臨メーカー",
    sub: "旅先でうちの子が頭から離れないあなたへ。",
    cta: "作ってみる",
    theme: "pink",
    thumb: "/thumbs/kourin.jpg",
  },
  {
    id: "pitadome",
    path: "/pet-drop-maker/",
    label: "NEW",
    title: "うちのこ ピタ止めメーカー",
    sub: "耳をなぞると上から落ちてくる。ピタッと止めてうちの子を完成させる動画が作れます。",
    cta: "作ってみる",
    theme: "lavender",
    thumb: "",
    external: true,
  },
];

export default function Home({ isMobile }: Props) {
  const navigate = useNavigate();

  return (
    <main className="home-page">
      <section className="home-hero">
        <p className="eyebrow">UCHINOKO PLAY ROOM</p>
        <h1>あいこのあそびば</h1>
        <p>うちの子で遊べるミニゲームと、SNSに使える小さなメーカーをまとめています。</p>
      </section>

      <section className="tool-list" aria-label="ミニツール一覧">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-card ${tool.theme}`}
            type="button"
            onClick={() => (tool.external ? (window.location.href = tool.path) : navigate(tool.path))}
          >
            {tool.thumb && (
              <span className="tool-thumb" aria-hidden="true">
                <img src={tool.thumb} alt="" />
              </span>
            )}
            <span className="tool-badge">{tool.label}</span>
            <span className="tool-title">{tool.title}</span>
            <span className="tool-sub">{tool.sub}</span>
            <span className="tool-cta">{tool.cta} →</span>
          </button>
        ))}
      </section>

      <section className="home-order">
        <div>
          <strong>自分で仕上げるのが難しい方へ</strong>
          <p>うちの子グッズのオーダーメイド制作を承ります。</p>
        </div>
        <a href="https://aikoanimal.base.shop/" target="_blank" rel="noopener noreferrer">
          BASE SHOPを見る
        </a>
      </section>

      {isMobile && <div className="mobile-bottom-space" />}
    </main>
  );
}
