interface Props {
  getBlob: () => Promise<Blob | null>;
  dark: boolean;
}

const HASHTAG_TEXT = "#あいこあにまる #うちのこメーカー";
const X_URL        = `https://twitter.com/intent/tweet?text=${encodeURIComponent(HASHTAG_TEXT + "\n")}`;
const THREADS_URL  = `https://www.threads.net/intent/post?text=${encodeURIComponent(HASHTAG_TEXT + "\n")}`;

export default function ShareBar({ getBlob, dark }: Props) {
  const save = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const filename = `uchino-ko-${Date.now()}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch (_) {}
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = filename;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const postToX = async () => {
    // まず画像を保存してからXを開く
    await save();
    window.open(X_URL, "_blank", "noopener,noreferrer");
  };

  const postToThreads = async () => {
    await save();
    window.open(THREADS_URL, "_blank", "noopener,noreferrer");
  };

  const btn = (label: string, bg: string, color: string, onClick: () => void) => (
    <button onClick={onClick} style={{
      flex: 1, padding: "12px 4px", fontSize: 14, fontWeight: 900,
      background: bg, color, border: "none", borderRadius: 8,
      cursor: "pointer", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 6, whiteSpace: "nowrap",
    }}>{label}</button>
  );

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{
        margin: 0, textAlign: "center", fontSize: 13, fontWeight: 700,
        color: dark ? "#ccc" : "#444", lineHeight: 1.6,
      }}>
        シェアするときは{" "}
        <span style={{ color: "#e07050" }}>#あいこあにまる</span>
        {" "}をつけてもらえると嬉しいです！🐾
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {btn("𝕏 ポスト",     "#111",    "#fff", postToX)}
        {btn("🧵 スレッズ",  "#0095f6", "#fff", postToThreads)}
        {btn("💾 保存",      "#FFE600", "#111", save)}
      </div>
    </div>
  );
}
