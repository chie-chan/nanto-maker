import type { ReactNode } from "react";

interface Props {
  getBlob: () => Promise<Blob | null>;
  dark: boolean;
}

const HASHTAG_TEXT = "#あいこあにまる #うちのこメーカー";
const X_URL        = `https://twitter.com/intent/tweet?text=${encodeURIComponent(HASHTAG_TEXT + "\n")}`;
const THREADS_URL  = `https://www.threads.net/intent/post?text=${encodeURIComponent(HASHTAG_TEXT + "\n")}`;

// タッチデバイス（スマホ・タブレット）かどうか判定
const isTouchDevice = () => navigator.maxTouchPoints > 0;

export default function ShareBar({ getBlob, dark }: Props) {
  const save = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const filename = `uchino-ko-${Date.now()}.png`;
    // スマホのみ共有シート、PCは直接ダウンロード
    if (isTouchDevice() && navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: "image/png" })] })) {
      try { await navigator.share({ files: [new File([blob], filename, { type: "image/png" })] }); } catch (_) {}
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

  const iconBtn = (icon: ReactNode, label: string, onClick: () => void) => (
    <button onClick={onClick} style={{
      flex: 1, background: "none", border: "none", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "4px 0",
    }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: dark ? "#ccc" : "#444" }}>{label}</span>
    </button>
  );

  // X ロゴ SVG
  const xIcon = (
    <svg viewBox="0 0 24 24" width="52" height="52" style={{ background: "#000", borderRadius: "50%", padding: 13 }}>
      <path fill="white" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  // Threads ロゴ SVG
  const threadsIcon = (
    <svg viewBox="0 0 192 192" width="52" height="52" style={{ background: "#000", borderRadius: "50%", padding: 11 }}>
      <path fill="white" d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.206 17.11 97.015 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 10.972 125.202 1.205 97.144 1h-.29C68.9 1.205 47.394 10.997 32.79 29.08 19.884 45.271 13.224 67.957 13.001 96c.223 28.043 6.883 50.729 19.789 66.92 14.605 18.083 36.111 27.875 64.062 28.08h.29c24.673-.176 42.257-6.648 56.551-20.933 18.741-18.73 18.244-42.097 12.031-56.463-4.474-10.443-13.033-18.944-24.187-24.616z"/>
    </svg>
  );

  // 保存アイコン
  const saveIcon = (
    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#FFE600", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox="0 0 24 24" width="26" height="26">
        <path fill="#111" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
    </div>
  );

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{
        margin: 0, textAlign: "center", fontSize: 12, fontWeight: 700,
        color: dark ? "#aaa" : "#666", lineHeight: 1.6,
      }}>
        シェアするときは{" "}
        <span style={{ color: "#e07050" }}>#あいこあにまる</span>
        {" "}をつけてもらえると嬉しいです！🐾
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        {iconBtn(xIcon, "X", postToX)}
        {iconBtn(threadsIcon, "Threads", postToThreads)}
        {iconBtn(saveIcon, "保存", save)}
      </div>
    </div>
  );
}
