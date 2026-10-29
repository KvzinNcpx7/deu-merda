import { completePhrase } from "./lib/phrases";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  DoorOpen,
  ExternalLink,
  HelpCircle,
  Layers,
  LoaderCircle,
  Pencil,
  Plus,
  Radio,
  Settings2,
  ShieldCheck,
  Skull,
  Sparkles,
  Trophy,
  Trash2,
  Users,
  Wifi,
  X,
} from "lucide-react";
import themes from "./data/themes.json";
import { included } from "./lib/engine";
import packs from "./data/packs.json";
import { catalog, createRoom, restore, transition, view } from "./lib/engine";
import { GameError, rpc, session, supabase } from "./lib/client";
import {
  type Action,
  type Room,
  type View,
  type PackId,
  emojis,
  reactions,
} from "./lib/types";
import {
  Button,
  CardTile,
  Confetti,
  Logo,
  Prompt,
  SoundButton,
} from "./components/ui";

const LOCAL_KEY = "deu-merda:local:v1",
  ROOM_KEY = "deu-merda:online:v1";
const jokes = [
  "CARAI BORRACHA! QUEM MANDOU ISSO? 💀",
  "A 5ª SÉRIE NUNCA MORRE.",
  "INFELIZMENTE, UM SER HUMANO ESCREVEU ISSO.",
  "IRINEU NÃO SABE QUEM MANDOU. NEM EU.",
  "KKKKKKKK ISSO NÃO DEVERIA EXISTIR.",
  "O JUIZ ESTÁ REPENSANDO SUAS AMIZADES.",
];
export default function App() {
  const [page, setPage] = useState<"home" | "decks" | "rules">("home");
  const [form, setForm] = useState<"create" | "join" | null>(() =>
    new URLSearchParams(location.search).has("sala") ? "join" : null,
  );
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💀");
  const [code, setCode] = useState(
    new URLSearchParams(location.search).get("sala")?.toUpperCase() ?? "",
  );
  const [game, setGame] = useState<View | null>(null);
  const [local, setLocal] = useState<Room | null>(null);
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(
    () => localStorage.getItem("deu-merda:muted") !== "false",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const reveal = game?.revealIndex ?? 0;
  const [ranking, setRanking] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customPick, setCustomPick] = useState(0);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const epoch = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!form && !confirm) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]',
        ),
      );
    const frame = requestAnimationFrame(() => focusable()[0]?.focus());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setForm(null);
        setConfirm(null);
      }
      if (event.key !== "Tab") return;
      const elements = focusable(),
        first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keyboard);
      if (previous?.isConnected) previous.focus();
    };
  }, [form, confirm]);
  const sound = useCallback(() => {
    if (muted) return;
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      void ctx.resume();
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(440, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(170, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch {
      /* Sons são opcionais. */
    }
  }, [muted]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    setSelected([]);
    setConfirm(null);
  }, [game?.round, uid, game?.phase]);
  useEffect(() => {
    if (local) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
      setGame(view(local, uid));
    }
  }, [local, uid]);
  useEffect(() => {
    const saved = localStorage.getItem(ROOM_KEY);
    const invited = new URLSearchParams(location.search)
      .get("sala")
      ?.toUpperCase();
    if (invited && invited !== saved) return;
    if (!saved || !supabase) return;
    let active = true;
    setBusy(true);
    session()
      .then(async (id) => {
        const v = await rpc(saved, { type: "join" });
        if (active) {
          setUid(id);
          setGame(v);
          setForm(null);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          if (
            e instanceof GameError &&
            ["ROOM_GONE", "NOT_MEMBER"].includes(e.code)
          ) {
            localStorage.removeItem(ROOM_KEY);
            setCode(saved);
            setForm("join");
          }
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!game || local || !supabase) return;
    const roomCode = game.code;
    let active = true;
    let refreshing = false;
    let lastRefresh = 0;
    const refresh = async (type = "sync") => {
      if (lock.current || refreshing || Date.now() - lastRefresh < 1500) return;
      refreshing = true;
      lastRefresh = Date.now();
      const token = ++epoch.current;
      try {
        const v = await rpc(roomCode, { type });
        if (active && token === epoch.current && !lock.current) {
          setGame(v);
          setReconnecting(false);
        }
      } catch (e) {
        if (active && token === epoch.current && !lock.current) {
          setError((e as Error).message);
          setReconnecting(true);
          if (
            e instanceof GameError &&
            ["ROOM_GONE", "NOT_MEMBER"].includes(e.code)
          ) {
            setGame(null);
            localStorage.removeItem(ROOM_KEY);
            setReconnecting(false);
          }
        }
      } finally {
        refreshing = false;
      }
    };
    const channel = supabase
      .channel("room:" + roomCode)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_signals",
          filter: "code=eq." + roomCode,
        },
        () => void refresh(),
      )
      .subscribe();
    const timer = setInterval(() => void refresh("ping"), 5000);
    const focus = () => void refresh("ping");
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      void supabase?.removeChannel(channel);
    };
  }, [game?.code, !!local]);
  useEffect(() => {
    setConfirm(null);
  }, [reveal]);
  async function act(action: Action) {
    if (game) action = { ...action, expectedRound: game.round };
    if (lock.current) return;
    lock.current = true;
    epoch.current++;
    setBusy(true);
    setError("");
    try {
      if (local) {
        const r = transition(local, uid, action);
        if (action.type === "leave") {
          setLocal(null);
          setGame(null);
          localStorage.removeItem(LOCAL_KEY);
        } else {
          setLocal(r);
          setGame(view(r, uid));
        }
      } else if (game) {
        const v = await rpc(game.code, action);
        setGame(v);
        if (action.type === "leave") {
          localStorage.removeItem(ROOM_KEY);
          history.replaceState(null, "", import.meta.env.BASE_URL);
        }
      }
      sound();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function connect() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const id = await session();
      const v = await rpc(code, {
        type: form === "create" ? "create" : "join",
        name,
        emoji,
      });
      setUid(id);
      setGame(v);
      setForm(null);
      setLocal(null);
      setReconnecting(false);
      localStorage.setItem(ROOM_KEY, v.code);
      history.replaceState(
        null,
        "",
        `${import.meta.env.BASE_URL}?sala=${v.code}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function demo(resume = false) {
    try {
      let r: Room;
      if (resume) {
        r = restore(localStorage.getItem(LOCAL_KEY) ?? "{}");
      } else {
        r = createRoom("local-1", name.trim() || "Pessoa 1", emoji);
        r = transition(r, "local-2", {
          type: "join",
          name: "Pessoa 2",
          emoji: "🤡",
        });
        r = transition(r, "local-3", {
          type: "join",
          name: "Pessoa 3",
          emoji: "🦆",
        });
      }
      setUid(r.players[0].id);
      setLocal(r);
      setGame(view(r, r.players[0].id));
      setForm(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copiado. Agora chama os desocupados!");
    } catch {
      setNotice(value);
    }
  }
  const me = game?.players.find((p) => p.id === uid);
  const host = game?.host === uid;
  const judge = game?.judge === uid;
  const submitted = game?.submitted.includes(uid);
  const judgePlayer = game?.players.find((p) => p.id === game.judge);
  const winner = game?.players.find((p) => p.id === game.winner);
  const winning = game?.submissions.find((s) => s.player === game.winner);
  const allAnswered =
    game &&
    game.players
      .filter((p) => p.id !== game.judge && (local || now - p.seen < 90000))
      .every((p) => game.submitted.includes(p.id));
  const config = (change: Record<string, unknown>) =>
    void act({
      type: "config",
      packs: game!.packs,
      target: game!.target,
      mode: game!.mode,
      ...change,
    });
  return (
    <>
      <header className="site-header">
        <Logo small />
        <nav aria-label="Navegação principal">
          {!game && (
            <>
              <button
                className={page === "home" ? "active" : ""}
                onClick={() => setPage("home")}
              >
                O jogo
              </button>
              <button
                className={page === "decks" ? "active" : ""}
                onClick={() => setPage("decks")}
              >
                Baralhos <span className="tiny-badge">{packs.length}</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              setPage("rules");
              if (game) setRanking(false);
            }}
            className={page === "rules" ? "active" : ""}
          >
            <HelpCircle size={15} /> Como jogar
          </button>
        </nav>
        <div className="header-right">
          <SoundButton
            muted={muted}
            toggle={() => {
              setMuted(!muted);
              localStorage.setItem("deu-merda:muted", String(!muted));
            }}
          />
          <span className="online-label">
            <i />{" "}
            {game
              ? local
                ? "MODO LOCAL"
                : "SALA ONLINE"
              : "100% SEM BOM SENSO"}
          </span>
        </div>
      </header>
      {error && (
        <div className="toast error" role="alert">
          <span>{error}</span>
          <button aria-label="Fechar erro" onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {local && game && (
        <div className="local-banner">
          <span>
            <b>DEMONSTRAÇÃO LOCAL</b> · 3 pessoas no mesmo dispositivo. Sem
            jogadores automáticos. O próximo jogador só deve olhar depois de
            trocar o assento.
          </span>
          <label>
            Você é{" "}
            <select
              aria-label="Trocar jogador local"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
            >
              {game.players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.emoji} {p.name}
                  {p.id === game.host ? " · anfitrião" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {page === "rules" ? (
        <main className="content narrow">
          <button className="text-btn" onClick={() => setPage("home")}>
            <ChevronLeft size={16} /> Voltar {game ? "à partida" : ""}
          </button>
          <div className="eyebrow accent">MANUAL DA FALTA DE NOÇÃO</div>
          <h1>
            Amizades fortes.
            <br />
            Respostas questionáveis.
          </h1>
          <div className="rules-grid">
            {[
              [
                "01",
                "Junte os desocupados",
                "Crie uma sala online e compartilhe o código com 3 a 12 pessoas. Cada pessoa recebe 10 cartas privadas.",
              ],
              [
                "02",
                "Complete o absurdo",
                "Uma pessoa vira juiz. As outras escolhem uma ou duas cartas para completar a pergunta. Nas duplas, a ordem da seleção importa.",
              ],
              [
                "03",
                "Não entregue o culpado",
                "Todos enviaram? O juiz abre a revelação. Passe pelas respostas anônimas, ria e escolha a mais engraçada.",
              ],
              [
                "04",
                "Ganhe sem dignidade",
                "O autor é revelado e ganha 1 ponto. As cartas são repostas e o juiz muda. Vence quem chegar a 5, 7 ou 10 pontos.",
              ],
            ].map(([n, t, d]) => (
              <article className="panel" key={n}>
                <span className="step">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
          <div className="panel">
            <h3>Democracia duvidosa</h3>
            <p>
              O juiz continua sem enviar cartas. Todos votam uma vez, sem votar
              na própria resposta. Empates seguem a ordem aleatória das
              respostas. A autoria aparece somente após a decisão.
            </p>
            <h3>Conexão caiu?</h3>
            <p>
              Atualize a página no mesmo navegador: seu assento e suas cartas
              continuam lá. Após 90 segundos sem contato, o anfitrião é
              transferido. Se o juiz cair, a rodada recomeça sem gastar cartas.
              O anfitrião pode remover ausentes; com menos de três pessoas a
              sala volta ao lobby.
            </p>
            <h3>Humor sem perseguição</h3>
            <p>
              Todos os personagens escolares são fictícios. Economia do Caos é
              sátira de um multiverso imaginário. Combine limites com seus
              amigos. Não use cartas próprias para expor dados ou humilhar
              pessoas reais.
            </p>
          </div>
        </main>
      ) : !game ? (
        <>
          {page === "home" ? (
            <main className="home">
              <section className="hero">
                <div className="hero-copy">
                  <div className="pill">
                    <span /> UM PARTY GAME DE PÉSSIMAS IDEIAS{" "}
                    <ArrowUpRight size={13} />
                  </div>
                  <h1>
                    A amizade acaba.
                    <br />A{" "}
                    <span className="resenha">
                      resenha
                      <svg viewBox="0 0 390 17" aria-hidden="true">
                        <path d="M3 12 Q180 -4 385 9 M15 16 Q200 4 369 13" />
                      </svg>
                    </span>
                    <br />
                    continua<span className="accent">.</span>
                  </h1>
                  <p>
                    Cartas absurdas. Combinações criminosas.
                    <br />
                    Seus amigos mostrando por que não podem
                    <br className="desktop" /> ter um microfone aberto.
                  </p>
                  <div className="hero-actions">
                    <Button
                      onClick={() => {
                        setForm("create");
                        setError("");
                      }}
                    >
                      <Plus size={19} /> Criar uma sala{" "}
                      <ArrowUpRight size={19} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setForm("join");
                        setError("");
                      }}
                    >
                      Entrar com código <ArrowRight size={18} />
                    </Button>
                  </div>
                  <div className="hero-meta">
                    <span>
                      <Users size={15} /> 3–12 jogadores
                    </span>
                    <span>
                      <Wifi size={15} /> Online e de graça
                    </span>
                    <span>⚠ Zero maturidade</span>
                  </div>
                  <button className="demo-link" onClick={() => demo()}>
                    Só dando uma olhada? Teste no mesmo dispositivo{" "}
                    <ArrowRight size={14} />
                  </button>
                  {localStorage.getItem(LOCAL_KEY) && (
                    <button className="demo-link" onClick={() => demo(true)}>
                      Continuar demonstração salva <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                <div
                  className="hero-art"
                  aria-label="Exemplo de combinação de cartas"
                >
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <span className="floating star-one">✳</span>
                  <span className="floating scribble">↯</span>
                  <div className="art-card dark-card">
                    <span className="card-label">
                      DEU MERDA! <Skull size={21} />
                    </span>
                    <p>
                      A reunião do
                      <br />
                      condomínio terminou
                      <br />
                      quando alguém
                      <br />
                      apresentou <span>________.</span>
                    </p>
                    <div className="card-bottom">
                      <span>ESCOLHA 1</span>
                      <span>💀</span>
                    </div>
                  </div>
                  <div className="art-card light-card">
                    <span className="card-label">
                      DEU MERDA! <ArrowUpRight size={20} />
                    </span>
                    <p>
                      Uma privada
                      <br />
                      abrindo um
                      <br />
                      chamado no RH.
                    </p>
                    <div className="card-bottom">
                      <span>5ª SÉRIE SEM FREIO</span>
                      <Skull size={22} />
                    </div>
                  </div>
                  <div className="reaction-sticker">
                    NÃO TANKO <span>💀</span>
                  </div>
                  <div className="stamp">
                    O BOM SENSO
                    <br />
                    NÃO FOI CONVIDADO
                  </div>
                </div>
              </section>
              <div className="marquee" aria-hidden="true">
                <span>CARAI BORRACHA!</span> ✳{" "}
                <span>A 5ª SÉRIE NUNCA MORRE</span> ✳ <span>NÃO TANKO</span> ✳{" "}
                <span>RECEBA!</span> ✳ <span>DEU MERDA!</span> ✳
              </div>
              <section className="pack-section">
                <div className="section-title">
                  <div>
                    <div className="eyebrow accent">
                      ESCOLHA SEU TIPO DE PROBLEMA
                    </div>
                    <h2>Cinco baralhos. Nenhum juízo.</h2>
                  </div>
                  <button className="text-btn" onClick={() => setPage("decks")}>
                    Explorar cartas <ArrowUpRight size={17} />
                  </button>
                </div>
                <PackGrid />
              </section>
              <section className="how-section">
                <div>
                  <div className="eyebrow accent">
                    FÁCIL DE JOGAR. DIFÍCIL DE EXPLICAR.
                  </div>
                  <h2>
                    Três passos para
                    <br />
                    perder o respeito.
                  </h2>
                  <button className="text-btn" onClick={() => setPage("rules")}>
                    Ler as regras <ArrowRight size={16} />
                  </button>
                </div>
                <div className="how-steps">
                  {[
                    ["01", "Chama a galera", "Um link. De 3 a 12 desocupados."],
                    [
                      "02",
                      "Solta a pior carta",
                      "Complete a frase. Enterre sua dignidade.",
                    ],
                    [
                      "03",
                      "O juiz que lute",
                      "A resposta mais absurda leva o ponto.",
                    ],
                  ].map(([n, t, d]) => (
                    <article key={n}>
                      <span>{n}</span>
                      <div>
                        <h3>{t}</h3>
                        <p>{d}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </main>
          ) : (
            <main className="content">
              <div className="eyebrow accent">CATÁLOGO DE PÉSSIMAS IDEIAS</div>
              <h1>
                {catalog.length} cartas.
                <br />
                Infinitas cagadas.
              </h1>
              <p className="lede">
                150 perguntas comuns, 30 duplas e 400 respostas originais.
                Misture os pacotes para criar combinações cada vez piores.
              </p>
              <PackGrid expanded />
              <div className="panel satire">
                <ShieldCheck />
                <p>
                  Personagens fictícios e sátira de universos imaginários.
                  Nenhuma carta faz alegações factuais sobre pessoas reais.
                </p>
              </div>
            </main>
          )}
          <footer>
            <Logo small />
            <span>Feito para perder a linha. Não a amizade.</span>
            <span>ORIGINAL · BRASILEIRO · QUESTIONÁVEL</span>
          </footer>
        </>
      ) : (
        <main className="game-shell">
          <div className="room-top">
            <div>
              <div className="eyebrow">
                {local ? "MESA NO MESMO DISPOSITIVO" : "SALA DA RESENHA"}
              </div>
              <button
                className="room-code"
                onClick={() => void copy(game.code)}
              >
                {game.code}
                <Copy size={17} />
              </button>
            </div>
            <div className="room-tools">
              <button className="text-btn" onClick={() => setRanking(!ranking)}>
                <Trophy size={17} /> Placar
              </button>
              {!local && (
                <button
                  className="text-btn"
                  onClick={() =>
                    void copy(
                      `${location.origin}${import.meta.env.BASE_URL}?sala=${game.code}`,
                    )
                  }
                >
                  <ExternalLink size={16} /> Convidar
                </button>
              )}
              <button
                className="icon-btn"
                title="Sair da sala"
                aria-label="Sair da sala"
                onClick={() => setConfirm("leave")}
              >
                <DoorOpen size={19} />
              </button>
            </div>
          </div>
          {!local && reconnecting && (
            <div className="setup-notice" role="status">
              <LoaderCircle className="spin" size={18} />
              <p>
                Reconectando à resenha. Sua mão continua no servidor; aguarde a
                conexão voltar.
              </p>
            </div>
          )}
          {!local && game.players.some((p) => now - p.seen > 90000) && (
            <section
              className="disconnect-panel panel"
              aria-label="Participantes desconectados"
            >
              <h3>Alguém caiu da resenha.</h3>
              <p>
                O assento e as cartas continuam reservados para reconexão no
                mesmo navegador. O anfitrião pode remover ausentes; com menos de
                três pessoas a sala volta ao lobby.
              </p>
              {game.players
                .filter((p) => now - p.seen > 90000)
                .map((p) => (
                  <div key={p.id}>
                    <span>
                      {p.emoji} {p.name} · desconectado
                    </span>
                    {host && (
                      <Button
                        variant="outline compact"
                        disabled={busy}
                        onClick={() => void act({ type: "kick", id: p.id })}
                      >
                        Remover ausente
                      </Button>
                    )}
                  </div>
                ))}
            </section>
          )}
          {ranking && (
            <section className="scoreboard panel">
              <div className="section-title">
                <h3>Ranking da falta de noção</h3>
                <button
                  className="icon-btn"
                  aria-label="Fechar placar"
                  onClick={() => setRanking(false)}
                >
                  <X size={18} />
                </button>
              </div>
              {[...game.players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div key={p.id}>
                    <span>
                      {i + 1}. {p.emoji} {p.name} {p.id === uid ? "(você)" : ""}
                    </span>
                    <b>{p.score} pts</b>
                  </div>
                ))}
            </section>
          )}
          {game.phase === "lobby" ? (
            <>
              <div className="lobby-heading">
                <span className="pill">
                  <i /> A RESENHA ESTÁ SE FORMANDO
                </span>
                <h1>
                  CADÊ ESSES
                  <br />
                  <span className="accent">DESOCUPADOS?</span>
                </h1>
                <p>
                  Mais um que deveria estar estudando. Convide a galera e
                  prepare o caos.
                </p>
              </div>
              <div className="lobby-layout">
                <section>
                  <div className="section-title">
                    <h3>
                      <Users size={19} /> Na sala{" "}
                      <span className="count">{game.players.length}/12</span>
                    </h3>
                    <span className="muted">mínimo de 3</span>
                  </div>
                  <div className="player-list">
                    {game.players.map((p) => (
                      <div className="player" key={p.id}>
                        <span className="avatar">{p.emoji}</span>
                        <div>
                          <b>
                            {p.name}
                            {p.id === uid && <small> você</small>}
                          </b>
                          <span>
                            {p.id === game.host
                              ? "Dono da bagunça"
                              : "Pronto para passar vergonha"}
                          </span>
                        </div>
                        {p.id === game.host ? (
                          <Crown size={18} className="accent" />
                        ) : (
                          <i
                            className={
                              "presence " +
                              (now - p.seen > 90000 && !local ? "away" : "")
                            }
                          />
                        )}
                        {host && !local && now - p.seen > 90000 && (
                          <button
                            className="icon-btn"
                            aria-label={"Remover " + p.name}
                            onClick={() => void act({ type: "kick", id: p.id })}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="invite-box">
                    <Radio size={23} />
                    <div>
                      <b>
                        {local ? "Uma mesa. Três pessoas." : "Manda no grupo."}
                      </b>
                      <p>
                        {local
                          ? "Troque o jogador no seletor acima. As mãos ficam no mesmo navegador."
                          : "Cada amigo entra com apelido, sem precisar de e-mail."}
                      </p>
                    </div>
                    {!local && (
                      <Button
                        variant="outline compact"
                        onClick={() =>
                          void copy(
                            `${location.origin}${import.meta.env.BASE_URL}?sala=${game.code}`,
                          )
                        }
                      >
                        <Copy size={15} /> Link
                      </Button>
                    )}
                  </div>
                  <div className="custom-box panel">
                    <h3>
                      <Sparkles size={18} /> Cartas da casa
                    </h3>
                    <p>
                      Privadas desta sala. Crie, edite e ative suas ideias antes
                      da partida.
                    </p>
                    {game.custom.map((c) => (
                      <div
                        className={
                          "custom-row " +
                          (c.active === false ? "inactive-card" : "")
                        }
                        key={c.id}
                      >
                        <span>
                          <small>
                            {c.pick ? `${c.pick} lacuna(s)` : "Resposta"} ·{" "}
                            {c.active === false ? "inativa" : "ativa"}
                          </small>
                          {c.text}
                        </span>
                        {host && (
                          <div className="custom-actions">
                            <button
                              className="icon-btn"
                              disabled={busy}
                              aria-label={
                                c.active === false
                                  ? "Ativar carta"
                                  : "Desativar carta"
                              }
                              aria-pressed={c.active !== false}
                              onClick={() =>
                                void act({ type: "toggleCustom", id: c.id })
                              }
                            >
                              <Check size={15} />
                            </button>
                            <button
                              className="icon-btn"
                              disabled={busy}
                              onClick={() => {
                                setEditingCard(c.id);
                                setCustomText(c.text);
                                setCustomPick(c.pick);
                              }}
                              aria-label="Editar carta"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-btn"
                              disabled={busy}
                              onClick={() =>
                                void act({ type: "deleteCustom", id: c.id })
                              }
                              aria-label="Excluir carta"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {host && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void act({
                            type: editingCard ? "editCustom" : "custom",
                            id: editingCard,
                            text: customText,
                            pick: customPick,
                          }).then((ok) => {
                            if (ok) {
                              setCustomText("");
                              setEditingCard(null);
                            }
                          });
                        }}
                      >
                        <label>
                          Tipo
                          <select
                            value={customPick}
                            onChange={(e) => setCustomPick(+e.target.value)}
                          >
                            <option value={0}>Resposta</option>
                            <option value={1}>Pergunta com 1 lacuna</option>
                            <option value={2}>Pergunta com 2 lacunas</option>
                          </select>
                        </label>
                        <label>
                          Texto da carta
                          <textarea
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            minLength={3}
                            maxLength={180}
                            placeholder={
                              customPick
                                ? "Use ________ em cada lacuna."
                                : "Uma péssima ideia original."
                            }
                            required
                          />
                        </label>
                        <Button
                          type="submit"
                          variant="outline compact"
                          disabled={busy || customText.trim().length < 3}
                        >
                          {editingCard ? (
                            <Check size={16} />
                          ) : (
                            <Plus size={16} />
                          )}{" "}
                          {editingCard ? "Salvar carta" : "Adicionar carta"}
                        </Button>
                        {editingCard && (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => {
                              setEditingCard(null);
                              setCustomText("");
                            }}
                          >
                            Cancelar edição
                          </button>
                        )}
                      </form>
                    )}
                  </div>
                </section>
                <aside className="settings panel">
                  <h3>
                    <Settings2 size={19} /> Prepara o estrago
                  </h3>
                  <label>
                    Vitória por
                    <div className="segments">
                      {[5, 7, 10].map((t) => (
                        <button
                          key={t}
                          disabled={!host || busy}
                          onClick={() => config({ target: t })}
                          className={game.target === t ? "chosen" : ""}
                        >
                          {t} pontos
                        </button>
                      ))}
                    </div>
                  </label>
                  <label>
                    Modo
                    <select
                      disabled={!host || busy}
                      value={game.mode}
                      onChange={(e) => config({ mode: e.target.value })}
                    >
                      <option value="classic">Clássico · juiz decide</option>
                      <option value="democracy">
                        Democracia duvidosa · todos votam
                      </option>
                    </select>
                  </label>
                  <label>
                    Baralhos ativos{" "}
                    <small>
                      {game.packs.length}/{packs.length}
                    </small>
                  </label>
                  <div className="pack-options">
                    {packs.map((p) => (
                      <button
                        disabled={!host || busy}
                        key={p.id}
                        aria-pressed={game.packs.includes(p.id as PackId)}
                        className={
                          game.packs.includes(p.id as PackId) ? "chosen" : ""
                        }
                        onClick={() =>
                          config({
                            packs: game.packs.includes(p.id as PackId)
                              ? game.packs.filter((id) => id !== p.id)
                              : [...game.packs, p.id],
                          })
                        }
                      >
                        <span>{p.emoji}</span>
                        <b>{p.name}</b>
                        <span className="checkbox">
                          {game.packs.includes(p.id as PackId) && (
                            <Check size={13} />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="small muted">
                    ⚠️ Humor Ácido e Tabus · 18+: morte, humor negro, situações
                    médicas constrangedoras, sátira religiosa e ditadores
                    ridicularizados. Desativado por padrão; o anfitrião pode
                    ativar ou desativar no lobby.
                  </p>
                  <details>
                    <summary>Temas incluídos · ajustar no lobby</summary>
                    <div className="pack-options">
                      {Object.entries(themes)
                        .filter(([id]) =>
                          catalog.some(
                            (c) =>
                              c.theme === id &&
                              game.packs.includes(c.pack as PackId),
                          ),
                        )
                        .map(([id, label]) => (
                          <button
                            key={id}
                            disabled={!host || busy}
                            aria-pressed={!game.excludedThemes?.includes(id)}
                            className={
                              !game.excludedThemes?.includes(id) ? "chosen" : ""
                            }
                            onClick={() =>
                              config({
                                excludedThemes: game.excludedThemes?.includes(
                                  id,
                                )
                                  ? game.excludedThemes.filter((t) => t !== id)
                                  : [...(game.excludedThemes ?? []), id],
                              })
                            }
                          >
                            <b>{label}</b>
                            <span className="checkbox">
                              {!game.excludedThemes?.includes(id) && (
                                <Check size={13} />
                              )}
                            </span>
                          </button>
                        ))}
                    </div>
                  </details>
                  <p className="small muted">
                    {catalog.filter((c) => !c.pick && included(c, game))
                      .length +
                      game.custom.filter((c) => !c.pick && c.active !== false)
                        .length}{" "}
                    respostas disponíveis · {game.players.length * 10}{" "}
                    necessárias para as mãos.
                  </p>
                  <Button
                    disabled={!host || busy || game.players.length < 3}
                    onClick={() => setConfirm("start")}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Skull size={18} />
                    )}{" "}
                    {host ? "Desativar o bom senso" : "Esperando o anfitrião"}{" "}
                    <ArrowRight size={17} />
                  </Button>
                  <p className="settings-foot">
                    A amizade de vocês não está coberta pela garantia.
                  </p>
                </aside>
              </div>
            </>
          ) : game.phase === "finished" ? (
            <section className="final-screen">
              <Confetti />
              <span className="pill">
                A AMIZADE NÃO ESTÁ COBERTA PELA GARANTIA
              </span>
              <div className="winner-emoji">{winner?.emoji}</div>
              <div className="eyebrow accent">CAMPEÃO DA FALTA DE NOÇÃO</div>
              <h1>{winner?.name}</h1>
              <p>
                PARABÉNS! VOCÊ GANHOU UMA COMPETIÇÃO
                <br />
                QUE NÃO DEVERIA EXISTIR.
              </p>
              <p className="panel combination">
                {game.prompt &&
                  completePhrase(game.prompt.text, winning?.cards ?? [])}
              </p>
              <div className="final-ranking">
                {[...game.players]
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <div key={p.id}>
                      <span>{i + 1}.</span>
                      <span>
                        {p.emoji} {p.name}
                      </span>
                      <b>{p.score} pts</b>
                    </div>
                  ))}
              </div>
              <p className="muted">
                Nem o Irineu sabe explicar o resto do desempenho.
              </p>
              <Button onClick={() => setConfirm("leave")}>
                Encerrar e sair <DoorOpen size={18} />
              </Button>
            </section>
          ) : (
            <>
              <div className="match-top">
                <span className="pill">
                  RODADA {String(game.round).padStart(2, "0")}
                </span>
                <span>
                  <Crown size={15} /> Juiz:{" "}
                  <b>
                    {judgePlayer?.emoji} {judgePlayer?.name}
                  </b>
                  {judge ? " (você)" : ""}
                </span>
                <span className="muted">Primeiro a {game.target} pontos</span>
              </div>
              {game.prompt && <Prompt card={game.prompt} round={game.round} />}
              {game.phase === "answering" ? (
                <>
                  <div className="answer-status">
                    <div>
                      <div className="eyebrow accent">
                        {judge
                          ? "VOCÊ TEM UM TRABALHO QUESTIONÁVEL"
                          : submitted
                            ? "TÁ FEITO. AGORA SUSTENTA."
                            : "ESCOLHA SUA PIOR IDEIA"}
                      </div>
                      <h2>
                        {judge
                          ? "Espere. Julgue. Questione suas amizades."
                          : submitted
                            ? "Sua resposta está no anonimato."
                            : game.prompt?.pick === 2
                              ? "Duas cartas. Na ordem do desastre."
                              : "Qual carta completa essa vergonha?"}
                      </h2>
                      <p>
                        {judge
                          ? game.round % 2
                            ? "O bom senso foi oficialmente desativado."
                            : "O juiz está repensando suas amizades."
                          : submitted
                            ? "Você pode continuar acompanhando quem já enviou."
                            : "Toque para selecionar. Só vale carta da sua mão."}
                      </p>
                    </div>
                    <span className="submission-count">
                      <CheckCheck size={20} /> {game.submitted.length}/
                      {game.players.length - 1} enviaram
                    </span>
                  </div>
                  <div className="player-chips">
                    {game.players.map((p) => (
                      <span
                        key={p.id}
                        aria-pressed={game.packs.includes(p.id as PackId)}
                        className={game.submitted.includes(p.id) ? "done" : ""}
                      >
                        {p.emoji} {p.name}{" "}
                        {p.id === game.judge ? (
                          <Crown size={12} />
                        ) : game.submitted.includes(p.id) ? (
                          <Check size={13} />
                        ) : (
                          <span className="dot" />
                        )}
                        {!local && now - p.seen > 90000 && " · reconectando"}
                      </span>
                    ))}
                  </div>
                  {judge ? (
                    <div className="judge-wait panel">
                      <span>⚖️</span>
                      <h3>
                        {allAnswered
                          ? "NINGUÉM FOI OBRIGADO A ESCREVER ESSAS COISAS."
                          : "Enquanto isso, pratique sua cara de decepção."}
                      </h3>
                      <p>
                        {allAnswered
                          ? "Respire fundo. A revelação é por sua conta."
                          : "A revelação libera quando os jogadores conectados enviarem."}
                      </p>
                      <Button
                        disabled={
                          busy || !allAnswered || game.submitted.length < 2
                        }
                        onClick={() => void act({ type: "reveal" })}
                      >
                        Abrir as atrocidades <ArrowRight size={18} />
                      </Button>
                    </div>
                  ) : !submitted ? (
                    <>
                      <div className="hand" aria-label="Sua mão privada">
                        {me?.hand.map((c) => (
                          <CardTile
                            key={c.id}
                            card={c}
                            selected={selected.includes(c.id)}
                            index={selected.indexOf(c.id) + 1}
                            onClick={() => {
                              sound();
                              setSelected((s) =>
                                s.includes(c.id)
                                  ? s.filter((x) => x !== c.id)
                                  : s.length < (game.prompt?.pick ?? 1)
                                    ? [...s, c.id]
                                    : s,
                              );
                            }}
                          />
                        ))}
                      </div>
                      <div className="send-bar">
                        <span>
                          <ShieldCheck size={15} /> Só você vê sua mão{" "}
                          {local ? "neste assento" : ""}.
                        </span>
                        <Button
                          disabled={
                            busy || selected.length !== game.prompt?.pick
                          }
                          onClick={() => setConfirm("submit")}
                        >
                          Enviar {selected.length}/{game.prompt?.pick}{" "}
                          <ArrowRight size={17} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="waiting-card panel">
                      <CheckCheck size={36} />
                      <h3>Uma péssima ideia a caminho.</h3>
                      <p>
                        {local
                          ? "Passe o dispositivo e troque o jogador no seletor acima."
                          : "Aguarde o juiz abrir a revelação."}
                      </p>
                    </div>
                  )}
                </>
              ) : game.phase === "revealing" ? (
                <section className="reveal-section">
                  <div className="eyebrow accent">
                    AUTORIA EM SEGREDO ·{" "}
                    {game.mode === "democracy"
                      ? "TODOS VOTAM"
                      : "O JUIZ DECIDE"}
                  </div>
                  <h2>{jokes[(game.round + reveal) % jokes.length]}</h2>
                  <div className="reveal-nav">
                    <button
                      className="icon-btn"
                      aria-label="Resposta anterior"
                      disabled={busy || !judge || reveal === 0}
                      onClick={() => {
                        void act({ type: "browse", index: reveal - 1 });
                      }}
                    >
                      <ChevronLeft />
                    </button>
                    <span>
                      RESPOSTA {reveal + 1} DE {game.submissions.length}
                    </span>
                    <button
                      className="icon-btn"
                      aria-label="Próxima resposta"
                      disabled={
                        busy || !judge || reveal >= game.submissions.length - 1
                      }
                      onClick={() => {
                        void act({ type: "browse", index: reveal + 1 });
                      }}
                    >
                      <ChevronRight />
                    </button>
                  </div>
                  <div
                    className="revealed-cards"
                    key={`${game.round}-${reveal}`}
                  >
                    {game.submissions[reveal]?.cards.map((c, i) => (
                      <div key={c.id}>
                        <span className="eyebrow">
                          {game.prompt?.pick === 2
                            ? `${i + 1}ª LACUNA`
                            : "A RESPOSTA"}
                        </span>
                        <CardTile card={c} />
                      </div>
                    ))}
                  </div>
                  <p className="panel combination" aria-live="polite">
                    {game.prompt &&
                      completePhrase(
                        game.prompt.text,
                        game.submissions[reveal]?.cards ?? [],
                      )}
                  </p>
                  <p className="muted">
                    O juiz conduz a revelação para toda a sala.
                  </p>
                  <div className="reveal-dots">
                    {game.submissions.map((s, i) => (
                      <button
                        aria-label={`Ver resposta ${i + 1}`}
                        className={reveal === i ? "current" : ""}
                        key={s.id}
                        disabled={busy || !judge}
                        aria-current={reveal === i ? "step" : undefined}
                        onClick={() => void act({ type: "browse", index: i })}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  {game.mode === "democracy" ? (
                    <>
                      <p className="muted">
                        {game.voteCount}/{game.players.length} votos · Seu
                        próprio envio é bloqueado pelo servidor.
                      </p>
                      <Button
                        disabled={busy || !!game.myVote}
                        onClick={() => setConfirm("vote")}
                      >
                        {game.myVote
                          ? "Voto registrado"
                          : "Votar nesta resposta"}{" "}
                        <Check size={17} />
                      </Button>
                    </>
                  ) : judge ? (
                    <Button
                      disabled={busy}
                      onClick={() => setConfirm("choose")}
                    >
                      Essa ganhou. Infelizmente. <Trophy size={18} />
                    </Button>
                  ) : (
                    <p className="muted">
                      O juiz foi cagar ou tá pensando? Espere a escolha.
                    </p>
                  )}
                  <ReactionBar
                    onReact={(text) => void act({ type: "reaction", text })}
                    disabled={busy}
                  />
                </section>
              ) : (
                <section className="result-screen">
                  <Confetti />
                  <div className="eyebrow accent">CULPADO IDENTIFICADO</div>
                  <div className="winner-emoji">{winner?.emoji}</div>
                  <h1>
                    {winner?.name}
                    <span className="accent"> +1</span>
                  </h1>
                  <p>PARABÉNS PELA FALTA DE NOÇÃO.</p>
                  <p className="panel combination">
                    {game.prompt &&
                      completePhrase(game.prompt.text, winning?.cards ?? [])}
                  </p>
                  <div className="revealed-cards">
                    {winning?.cards.map((c) => (
                      <CardTile card={c} key={c.id} />
                    ))}
                  </div>
                  <p className="muted">
                    {winner?.score} de {game.target} pontos · O próximo juiz
                    está se preparando psicologicamente.
                  </p>
                  <Button
                    disabled={!host || busy}
                    onClick={() => void act({ type: "next" })}
                  >
                    {host ? "Próxima rodada" : "Esperando o anfitrião"}{" "}
                    <ArrowRight size={18} />
                  </Button>
                  <ReactionBar
                    onReact={(text) => void act({ type: "reaction", text })}
                    disabled={busy}
                  />
                </section>
              )}
              <div className="reaction-float" aria-live="polite">
                {game.reactions
                  .filter((r) => now - r.at < 5000)
                  .slice(-5)
                  .map((r) => (
                    <span key={r.id}>{r.text}</span>
                  ))}
              </div>
            </>
          )}
        </main>
      )}
      {form && !game && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >
            <button
              className="modal-close icon-btn"
              aria-label="Fechar"
              onClick={() => setForm(null)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow accent">VEM PASSAR VERGONHA</div>
            <h2 id="form-title">
              {form === "create"
                ? "Comece a bagunça."
                : "Achou os desocupados?"}
            </h2>
            <p>Apelido fictício. Avatar duvidoso. Nenhum e-mail.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void connect();
              }}
            >
              <label>
                Como a galera te chama?
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={24}
                  placeholder="Seu apelido"
                  required
                  autoComplete="nickname"
                />
              </label>
              <label>Escolha sua cara de pau</label>
              <div className="emoji-picker">
                {emojis.map((e) => (
                  <button
                    type="button"
                    aria-label={"Avatar " + e}
                    aria-pressed={emoji === e}
                    className={emoji === e ? "chosen" : ""}
                    onClick={() => setEmoji(e)}
                    key={e}
                  >
                    {e}
                  </button>
                ))}
              </div>
              {form === "join" && (
                <label>
                  Código da sala
                  <input
                    className="code-input"
                    value={code}
                    onChange={(e) =>
                      setCode(
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 6),
                      )
                    }
                    minLength={6}
                    maxLength={6}
                    placeholder="ABC123"
                    required
                    autoComplete="off"
                  />
                </label>
              )}
              {!supabase && (
                <div className="setup-notice">
                  <ShieldCheck size={20} />
                  <p>
                    <b>Online aguardando configuração.</b> Conecte um projeto
                    Supabase novo seguindo o README. Você já pode testar a
                    partida local abaixo.
                  </p>
                </div>
              )}
              <Button type="submit" disabled={busy || !supabase}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}{" "}
                {form === "create" ? "Criar sala online" : "Entrar na resenha"}
              </Button>
              <button
                type="button"
                className="demo-link"
                onClick={() => demo()}
              >
                Testar com 3 pessoas neste dispositivo <ArrowRight size={14} />
              </button>
            </form>
          </section>
        </div>
      )}
      {confirm && game && (
        <div className="modal-backdrop">
          <section
            className="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">
              {confirm === "start"
                ? "Bora desativar o bom senso?"
                : confirm === "leave"
                  ? "Sair da resenha?"
                  : confirm === "submit"
                    ? "Vai mandar essa mesmo?"
                    : "É essa a pérola?"}
            </h2>
            <p>
              {confirm === "start"
                ? "Cada pessoa receberá dez cartas. As configurações e cartas próprias ficam fechadas durante a partida."
                : confirm === "leave"
                  ? "Seu assento será removido. Se você for o anfitrião, outra pessoa assume. Com menos de três pessoas a partida volta ao lobby."
                  : confirm === "submit"
                    ? "Depois de enviar, não dá para trocar. Nas perguntas duplas, confira a ordem."
                    : "A decisão é definitiva. O autor será revelado quando a rodada terminar."}
            </p>
            {confirm === "submit" && (
              <ol className="selected-preview">
                {selected.map((id) => (
                  <li key={id}>{me?.hand.find((c) => c.id === id)?.text}</li>
                ))}
              </ol>
            )}
            <div className="hero-actions">
              <Button
                disabled={busy}
                onClick={() => {
                  const type = confirm;
                  setConfirm(null);
                  void act(
                    type === "submit"
                      ? { type, cards: selected }
                      : type === "choose" || type === "vote"
                        ? { type, id: game.submissions[reveal]?.id }
                        : { type },
                  );
                }}
              >
                Confirmar <Check size={16} />
              </Button>
              <Button variant="outline" onClick={() => setConfirm(null)}>
                Voltar
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function PackGrid({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className={"pack-grid " + (expanded ? "expanded" : "")}>
      {packs.map((p, i) => (
        <article className={"pack-card pack-" + i} key={p.id}>
          <span className="pack-emoji">{p.emoji}</span>
          <span className="pack-number">
            0{i + 1} / 0{packs.length}
          </span>
          <h3>{p.name}</h3>
          <p>{p.description}</p>
          <div className="pack-foot">
            <span>60 CARTAS</span>
            <Layers size={16} />
          </div>
          {expanded && (
            <div className="pack-examples">
              <span className="eyebrow">UMA AMOSTRA DO ESTRAGO</span>
              {catalog
                .filter((c) => c.pack === p.id && c.pick === 1)
                .slice(0, 2)
                .map((c) => (
                  <blockquote key={c.id}>{c.text}</blockquote>
                ))}
              <p className="example-answer">
                {catalog.find((c) => c.pack === p.id && !c.pick)?.text}
              </p>
              <small>16 perguntas simples · 4 duplas · 40 respostas</small>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
function ReactionBar({
  onReact,
  disabled,
}: {
  onReact: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="reaction-bar" aria-label="Reações rápidas">
      {reactions.map((r) => (
        <button key={r} disabled={disabled} onClick={() => onReact(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}
