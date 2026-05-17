import { useEffect, useMemo, useState } from "react";

interface Props {
  isMobile: boolean;
  dark: boolean;
  text: string;
  bg: string;
}

type Phase = "intro" | "playing" | "result";
type FlowerKind = "sunflower" | "rose" | "hibiscus" | "hydrangea" | "pansy" | "daisy" | "tulip" | "cosmos";

type FlowerCard = {
  id: string;
  kind: FlowerKind | "leaf";
  trap?: boolean;
};

type Rule = {
  kind: FlowerKind;
  label: string;
  hint: string;
};

const GAME_SECONDS = 38;
const BOARD_SIZE = 9;
const MIN_TARGET_CARDS = 1;
const RULE_CHANGE_MS = 7000;
const TRAP_CHANCE = 0.24;

const FLOWERS: Array<{ kind: FlowerKind; label: string; src: string }> = [
  { kind: "sunflower", label: "ひまわり", src: "/flower-game/sunflower.png" },
  { kind: "rose", label: "バラ", src: "/flower-game/rose.png" },
  { kind: "hibiscus", label: "ハイビスカス", src: "/flower-game/hibiscus.png" },
  { kind: "hydrangea", label: "あじさい", src: "/flower-game/hydrangea.png" },
  { kind: "pansy", label: "パンジー", src: "/flower-game/pansy.png" },
  { kind: "daisy", label: "デイジー", src: "/flower-game/daisy.png" },
  { kind: "tulip", label: "チューリップ", src: "/flower-game/tulip.png" },
  { kind: "cosmos", label: "コスモス", src: "/flower-game/cosmos.png" },
];

const FLOWER_LABEL = Object.fromEntries(FLOWERS.map((flower) => [flower.kind, flower.label])) as Record<FlowerKind, string>;
const FLOWER_SRC = Object.fromEntries(FLOWERS.map((flower) => [flower.kind, flower.src])) as Record<FlowerKind, string>;
const GAME_IMAGE_SOURCES = [...FLOWERS.map((flower) => flower.src), "/flower-game/leaf.png"];

const RULES: Rule[] = FLOWERS.map((flower) => ({
  kind: flower.kind,
  label: flower.label,
  hint: `${flower.label}だけを見つけてタップしてね`,
}));

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function createCard(seed = Date.now()): FlowerCard {
  const trap = Math.random() < TRAP_CHANCE;
  return {
    id: `${seed}-${Math.random().toString(36).slice(2)}`,
    kind: trap ? "leaf" : randomFrom(FLOWERS).kind,
    trap,
  };
}

function isMatch(card: FlowerCard, rule: Rule) {
  return !card.trap && card.kind === rule.kind;
}

function createBoard(rule: Rule) {
  const board = Array.from({ length: BOARD_SIZE }, (_, index) => createCard(index));
  const matchingCount = board.filter((card) => isMatch(card, rule)).length;

  if (matchingCount >= MIN_TARGET_CARDS) return board;

  for (let i = 0; i < MIN_TARGET_CARDS - matchingCount; i += 1) {
    board[i] = {
      id: `rescue-${i}-${Math.random().toString(36).slice(2)}`,
      kind: rule.kind,
      trap: false,
    };
  }

  return board.sort(() => Math.random() - 0.5);
}

function chooseNextRule(current?: Rule) {
  const candidates = current ? RULES.filter((rule) => rule.kind !== current.kind) : RULES;
  return randomFrom(candidates);
}

const RANKS = [
  { min: 520, title: "お花あつめの女王", message: "判断が速くて正確。ブーケ作りの達人です。" },
  { min: 390, title: "きらめきブーケ名人", message: "かなりいい集中力。もう一回で女王級が見えます。" },
  { min: 260, title: "ふんわり花束さん", message: "かわいく集められました。お題チェンジにもついていけています。" },
  { min: 130, title: "つぼみチャレンジャー", message: "目が慣れると一気に伸びます。次はコンボを狙ってみてね。" },
  { min: 0, title: "はじめてのお庭番", message: "まずはお題を見てゆっくり。お花は逃げません。" },
];

function getRank(score: number) {
  return RANKS.find((rank) => score >= rank.min) ?? RANKS[RANKS.length - 1];
}

function getNextRank(score: number) {
  return [...RANKS].reverse().find((rank) => rank.min > score);
}

export default function GamePage({ isMobile }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rule, setRule] = useState<Rule>(() => chooseNextRule());
  const [board, setBoard] = useState<FlowerCard[]>(() => createBoard(RULES[0]));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [lives, setLives] = useState(3);
  const [collected, setCollected] = useState(0);
  const [message, setMessage] = useState("お題に合うお花だけを集めてね");
  const [spark, setSpark] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState(0);

  const rank = useMemo(() => getRank(score), [score]);
  const nextRank = useMemo(() => getNextRank(score), [score]);
  const progress = Math.max(0, Math.min(100, (timeLeft / GAME_SECONDS) * 100));
  const imagesReady = loadedImages >= GAME_IMAGE_SOURCES.length;

  useEffect(() => {
    let cancelled = false;
    let finished = 0;

    GAME_IMAGE_SOURCES.forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => {
        if (cancelled) return;
        finished += 1;
        setLoadedImages(finished);
      };
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function startGame() {
    if (!imagesReady) {
      setMessage("お花画像を準備中です。もう少し待ってね");
      return;
    }

    const firstRule = chooseNextRule();
    setRule(firstRule);
    setBoard(createBoard(firstRule));
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(GAME_SECONDS);
    setLives(3);
    setCollected(0);
    setMessage("お題に合うお花だけを集めてね");
    setSpark(null);
    setPhase("playing");
  }

  function changeRule() {
    setRule((current) => {
      const next = chooseNextRule(current);
      setBoard(createBoard(next));
      setMessage(`お題チェンジ。今度は「${next.label}」だよ`);
      return next;
    });
  }

  useEffect(() => {
    if (phase !== "playing") return;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    const ruleTimer = window.setInterval(() => {
      changeRule();
      setCombo(0);
    }, RULE_CHANGE_MS);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(ruleTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && (timeLeft <= 0 || lives <= 0)) {
      setPhase("result");
    }
  }, [phase, timeLeft, lives]);

  function replaceCell(index: number, currentRule = rule) {
    setBoard((current) => {
      const next = [...current];
      next[index] = createCard(index + Date.now());
      if (next.filter((card) => isMatch(card, currentRule)).length === 0) {
        next[(index + 1) % next.length] = {
          id: `rescue-${index}-${Math.random().toString(36).slice(2)}`,
          kind: currentRule.kind,
          trap: false,
        };
      }
      return next;
    });
  }

  function handlePick(card: FlowerCard, index: number) {
    if (phase !== "playing") return;

    if (isMatch(card, rule)) {
      const nextCombo = combo + 1;
      const bonus = Math.min(18, nextCombo * 2);
      setScore((current) => current + 16 + bonus);
      setCombo(nextCombo);
      setBestCombo((current) => Math.max(current, nextCombo));
      setCollected((current) => current + 1);
      setMessage(nextCombo >= 4 ? `${nextCombo}コンボ。いい手つきです` : "正解。ブーケに入りました");
      setSpark(card.id);
      window.setTimeout(() => setSpark(null), 280);
      replaceCell(index);

      if ((collected + 1) % 6 === 0) {
        window.setTimeout(changeRule, 240);
      }
      return;
    }

    setLives((current) => current - 1);
    setCombo(0);
    setScore((current) => Math.max(0, current - 20));
    setMessage(card.trap ? "葉っぱは休憩中。お花だけ集めよう" : `惜しい。今は「${rule.label}」だけです`);
    replaceCell(index);
  }

  const shareText = `あいこのお花あつめで「${rank.title}」になったよ。スコア ${score} 点 / 最大 ${bestCombo} コンボ`;

  return (
    <main className="flower-game-page">
      {phase === "intro" && (
        <section className="flower-hero">
          <div className="flower-hero-copy">
            <p className="flower-kicker">AIKO FLOWER BRAIN TRAINING</p>
            <h1>あいこのお花あつめ</h1>
            <p>
              お題に合うお花だけをタップする、やさしいミニ脳トレです。
              用意したお花画像を見ながら、同じ種類だけ集めます。
            </p>
          </div>
          <div className="flower-mascot" aria-hidden="true">
            <img src="/aiko-logo.png" alt="" />
            <span>お花をあつめよう</span>
          </div>
        </section>
      )}

      {phase === "intro" && (
        <section className="flower-start-panel">
          <div className="flower-rule-card">
            <span>1</span>
            <strong>お題を見る</strong>
            <p>集めるお花の名前を確認します。</p>
          </div>
          <div className="flower-rule-card">
            <span>2</span>
            <strong>同じ花だけタップ</strong>
            <p>違う花や葉っぱはライフが減ります。</p>
          </div>
          <div className="flower-rule-card">
            <span>3</span>
            <strong>コンボをつなぐ</strong>
            <p>連続正解でボーナスが入ります。</p>
          </div>
          <button className="flower-primary" type="button" onClick={startGame} disabled={!imagesReady}>
            {imagesReady ? "ゲームをはじめる" : `お花を準備中 ${loadedImages}/${GAME_IMAGE_SOURCES.length}`}
          </button>
          {!imagesReady && (
            <p className="flower-load-note" aria-live="polite">
              画像がそろってからスタートします。
            </p>
          )}
        </section>
      )}

      {phase === "playing" && (
        <section className="flower-game-shell">
          <div className="flower-rule-spotlight">
            <small>いまのお題</small>
            <strong>{rule.label}</strong>
            <span>{rule.hint}</span>
          </div>

          <div className="flower-meter" aria-label={`残り時間 ${timeLeft} 秒`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="flower-stats-grid">
            <div className="flower-stat">
              <small>残り時間</small>
              <b>{timeLeft}<i>秒</i></b>
            </div>
            <div className="flower-stat is-life">
              <small>ライフ</small>
              <b>
                <span className="life-on">{"♥".repeat(Math.max(0, lives))}</span>
                <span className="life-off">{"♡".repeat(Math.max(0, 3 - lives))}</span>
              </b>
            </div>
            <div className="flower-stat">
              <small>コンボ</small>
              <b>{combo}<i>x</i></b>
            </div>
            <div className="flower-stat is-score">
              <small>スコア</small>
              <b>{score}</b>
            </div>
          </div>

          <div className="flower-board flower-board-art" aria-label="お花ボード">
            {board.map((card, index) => {
              const label = card.trap ? "葉っぱ" : FLOWER_LABEL[card.kind as FlowerKind];
              const src = card.trap ? "/flower-game/leaf.png" : FLOWER_SRC[card.kind as FlowerKind];
              return (
                <button
                  key={card.id}
                  className={`flower-cell flower-image-cell flower-art-${card.kind}${spark === card.id ? " is-spark" : ""}${card.trap ? " is-trap" : ""}`}
                  type="button"
                  onClick={() => handlePick(card, index)}
                  aria-label={card.trap ? "葉っぱ（おやすみ）" : label}
                >
                  <span className="flower-kind-name">{label}</span>
                  <span className="flower-image-wrap">
                    <img src={src} alt="" draggable={false} loading="eager" decoding="sync" />
                  </span>
                  <small className="flower-label">{card.trap ? "おやすみ" : "タップ"}</small>
                </button>
              );
            })}
          </div>

          <p className="flower-message" aria-live="polite">{message}</p>
        </section>
      )}

      {phase === "result" && (
        <section className="flower-result">
          <p className="flower-kicker">RESULT</p>
          <h2>{rank.title}</h2>
          <div className="flower-result-score">{score}<span>点</span></div>
          <p>{rank.message}</p>
          <div className="flower-result-stats">
            <span>集めたお花 <b>{collected}</b></span>
            <span>最大コンボ <b>{bestCombo}</b></span>
          </div>
          <div className="flower-rank-guide" aria-label="ランク目安">
            <strong>ランク目安</strong>
            <div className="flower-rank-list">
              {RANKS.map((item) => (
                <span key={item.title} className={rank.title === item.title ? "is-current" : ""}>
                  <b>{item.min}点〜</b>{item.title}
                </span>
              ))}
            </div>
            <p>
              {nextRank
                ? `次は ${nextRank.min}点で「${nextRank.title}」`
                : "520点以上で最高ランク。これはかなり強いです。"}
            </p>
          </div>
          <div className="flower-result-actions">
            <button className="flower-primary" type="button" onClick={startGame}>
              もう一回あそぶ
            </button>
            <button
              className="flower-secondary"
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(shareText);
                setMessage("結果テキストをコピーしました");
              }}
            >
              結果をコピー
            </button>
          </div>
        </section>
      )}

      {isMobile && <div className="mobile-bottom-space" />}
    </main>
  );
}
