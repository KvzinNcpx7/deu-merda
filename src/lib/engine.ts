import themes from "../data/themes.json";
import packs from "../data/packs.json";
import rawCards from "../data/cards.json";
import {
  type Action,
  type Card,
  type Room,
  type View,
  type Player,
  type PackId,
  emojis,
  reactions,
} from "./types";
export const catalog = rawCards as Card[];
export const packIds = packs.map((p) => p.id);
export function included(
  c: Card,
  room: Pick<Room, "packs" | "excludedThemes">,
) {
  return (
    room.packs.includes(c.pack as PackId) &&
    !room.excludedThemes?.includes(c.theme ?? "")
  );
}
export const shuffle = <T>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
function fail(message: string): never {
  throw new Error(message);
}
export function profile(name: unknown, emoji: unknown) {
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 24
  )
    fail("Use um apelido de 2 a 24 caracteres.");
  if (!emojis.includes(String(emoji))) fail("Escolha um dos avatares.");
  return { name: (name as string).trim(), emoji: String(emoji) };
}
export function createRoom(id: string, name: string, emoji: string): Room {
  return {
    version: 1,
    code: Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (x) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 31],
    ).join(""),
    host: id,
    players: [
      { id, ...profile(name, emoji), score: 0, hand: [], seen: Date.now() },
    ],
    phase: "lobby",
    packs: ["quinta", "brasil", "escola", "economia", "memes"],
    target: 5,
    mode: "classic",
    round: 0,
    judge: "",
    prompt: null,
    submissions: [],
    votes: {},
    winner: null,
    deck: [],
    questions: [],
    custom: [],
    reactions: [],
  };
}
function available(r: Room) {
  return [
    ...catalog.filter((c) => included(c, r)),
    ...r.custom.filter((c) => c.active !== false),
  ];
}
function refill(r: Room) {
  const occupied = new Set(r.players.flatMap((p) => p.hand.map((c) => c.id)));
  r.deck = shuffle(available(r).filter((c) => !c.pick && !occupied.has(c.id)));
  for (const p of r.players)
    while (p.hand.length < 10) {
      const c = r.deck.pop();
      if (!c)
        fail("Ative mais baralhos para distribuir dez cartas por pessoa.");
      p.hand.push(c);
    }
}
function newRound(r: Room) {
  r.round++;
  r.phase = "answering";
  r.submissions = [];
  r.votes = {};
  r.winner = null;
  r.revealIndex = 0;
  if (!r.questions.length)
    r.questions = shuffle(available(r).filter((c) => c.pick > 0));
  r.prompt = r.questions.pop() ?? fail("Adicione perguntas ao baralho.");
}
export function transition(input: Room, actor: string, action: Action): Room {
  const r = structuredClone(input);
  const p = r.players.find((p) => p.id === actor);
  if (action.type === "join") {
    if (p) {
      p.seen = Date.now();
      return r;
    }
    if (r.phase !== "lobby" || r.players.length >= 12)
      fail("A sala já começou ou está lotada.");
    r.players.push({
      id: actor,
      ...profile(action.name, action.emoji),
      score: 0,
      hand: [],
      seen: Date.now(),
    });
    return r;
  }
  if (!p) fail("Você não participa desta sala.");
  const host = () => {
    if (actor !== r.host) fail("Só o anfitrião pode fazer isso.");
  };
  const phase = (s: string) => {
    if (r.phase !== s) fail("Essa ação não está disponível agora.");
  };
  if (action.expectedRound !== undefined && action.expectedRound !== r.round)
    fail("A rodada mudou. Atualize a sala antes de tentar novamente.");
  p.seen = Date.now();
  switch (action.type) {
    case "ping":
      break;
    case "config": {
      host();
      phase("lobby");
      const packs = action.packs;
      if (
        !Array.isArray(packs) ||
        !packs.length ||
        packs.some((x) => !packIds.includes(x))
      )
        fail("Selecione baralhos válidos.");
      if (![5, 7, 10].includes(Number(action.target)))
        fail("Pontuação inválida.");
      if (!["classic", "democracy"].includes(String(action.mode)))
        fail("Modo inválido.");
      if (action.excludedThemes !== undefined) {
        if (
          !Array.isArray(action.excludedThemes) ||
          action.excludedThemes.some(
            (t) => typeof t !== "string" || !Object.hasOwn(themes, t),
          )
        )
          fail("Temas inválidos.");
        r.excludedThemes = [...new Set(action.excludedThemes)] as string[];
      }
      r.packs = [...new Set(packs)] as Room["packs"];
      r.target = Number(action.target);
      r.mode = action.mode as Room["mode"];
      break;
    }
    case "custom":
    case "editCustom": {
      host();
      phase("lobby");
      if (action.type === "custom" && r.custom.length >= 100)
        fail("Limite de 100 cartas.");
      const text = String(action.text ?? "").trim(),
        pick = Number(action.pick);
      if (
        text.length < 3 ||
        text.length > 180 ||
        ![0, 1, 2].includes(pick) ||
        (text.match(/________/g) || []).length !== pick ||
        text.replaceAll("________", "").includes("_")
      )
        fail(
          "Use 3–180 caracteres e exatamente uma sequência ________ por lacuna.",
        );
      if (action.type === "editCustom") {
        const c =
          r.custom.find((c) => c.id === action.id) ??
          fail("Carta inexistente.");
        c.text = text;
        c.pick = pick;
      } else
        r.custom.push({
          id: crypto.randomUUID(),
          text,
          pick,
          pack: "custom",
          active: true,
        });
      break;
    }
    case "toggleCustom": {
      host();
      phase("lobby");
      const c =
        r.custom.find((c) => c.id === action.id) ?? fail("Carta inexistente.");
      c.active = c.active === false;
      break;
    }
    case "deleteCustom":
      host();
      phase("lobby");
      if (!r.custom.some((c) => c.id === action.id)) fail("Carta inexistente.");
      r.custom = r.custom.filter((c) => c.id !== action.id);
      break;
    case "start":
      host();
      phase("lobby");
      if (r.players.length < 3) fail("Chame pelo menos três jogadores.");
      r.players.forEach((p) => {
        p.score = 0;
        p.hand = [];
      });
      refill(r);
      r.judge = r.players[0].id;
      r.round = 0;
      r.questions = [];
      newRound(r);
      break;
    case "submit": {
      phase("answering");
      if (actor === r.judge) fail("O juiz não envia cartas.");
      if (r.submissions.some((s) => s.player === actor))
        fail("Você já enviou nesta rodada.");
      const ids = action.cards as string[];
      if (
        !Array.isArray(ids) ||
        ids.length !== r.prompt?.pick ||
        new Set(ids).size !== ids.length
      )
        fail("Selecione as cartas exigidas, sem repetir.");
      const cards = ids.map(
        (id) =>
          p.hand.find((c) => c.id === id) ?? fail("Esta carta não é sua."),
      );
      r.submissions = shuffle([
        ...r.submissions,
        { id: crypto.randomUUID(), player: actor, cards },
      ]);
      break;
    }
    case "reveal":
      phase("answering");
      if (actor !== r.judge) fail("Espere o juiz revelar.");
      if (r.submissions.length !== r.players.length - 1)
        fail("Ainda faltam respostas.");
      r.phase = "revealing";
      r.revealIndex = 0;
      break;
    case "browse":
      phase("revealing");
      if (actor !== r.judge) fail("Somente o juiz conduz a revelação.");
      if (
        !Number.isInteger(action.index) ||
        Number(action.index) < 0 ||
        Number(action.index) >= r.submissions.length
      )
        fail("Resposta inválida.");
      r.revealIndex = Number(action.index);
      break;
    case "choose": {
      phase("revealing");
      if (r.mode !== "classic" || actor !== r.judge)
        fail("Somente o juiz pode decidir neste modo.");
      award(r, String(action.id));
      break;
    }
    case "vote": {
      phase("revealing");
      if (r.mode !== "democracy") fail("Votação desativada.");
      if (r.votes[actor]) fail("Seu voto já foi registrado.");
      const s = r.submissions.find((s) => s.id === action.id);
      if (!s || s.player === actor) fail("Você não pode votar nessa resposta.");
      r.votes[actor] = s.id;
      if (Object.keys(r.votes).length === r.players.length) {
        const counts = (id: string) =>
          Object.values(r.votes).filter((v) => v === id).length;
        const winner = [...r.submissions].sort(
          (a, b) => counts(b.id) - counts(a.id),
        )[0];
        award(r, winner.id);
      }
      break;
    }
    case "next":
      host();
      phase("result");
      for (const p of r.players) {
        const used =
          r.submissions
            .find((s) => s.player === p.id)
            ?.cards.map((c) => c.id) || [];
        p.hand = p.hand.filter((c) => !used.includes(c.id));
      }
      refill(r);
      r.judge =
        r.players[
          (r.players.findIndex((p) => p.id === r.judge) + 1) % r.players.length
        ].id;
      newRound(r);
      break;
    case "reaction":
      if (r.phase !== "revealing" && r.phase !== "result")
        fail("Reaja durante a revelação.");
      if (!reactions.includes(String(action.text))) fail("Reação inválida.");
      if (
        r.reactions.some(
          (x) => x.id.startsWith(actor + ":") && Date.now() - x.at < 2000,
        )
      )
        fail("Respira! Uma reação a cada dois segundos.");
      r.reactions = [
        ...r.reactions.filter((x) => Date.now() - x.at < 6000),
        {
          id: actor + ":" + crypto.randomUUID(),
          text: String(action.text),
          at: Date.now(),
        },
      ].slice(-25);
      break;
    case "leave": {
      r.players = r.players.filter((x) => x.id !== actor);
      if (r.host === actor) r.host = r.players[0]?.id ?? "";
      if (r.phase !== "lobby") {
        if (r.players.length < 3) {
          r.phase = "lobby";
          r.players.forEach((p) => {
            p.hand = [];
            p.score = 0;
          });
          r.submissions = [];
          r.prompt = null;
        } else if (actor === r.judge || r.phase === "revealing") {
          r.judge = r.players[0].id;
          newRound(r);
        } else r.submissions = r.submissions.filter((s) => s.player !== actor);
      }
      break;
    }
    default:
      fail("Ação desconhecida.");
  }
  return r;
}
function award(r: Room, id: string) {
  const s =
    r.submissions.find((s) => s.id === id) ?? fail("Resposta inexistente.");
  const winner =
    r.players.find((p) => p.id === s.player) ?? fail("Jogador ausente.");
  winner.score++;
  r.winner = winner.id;
  r.phase = winner.score >= r.target ? "finished" : "result";
}
export function view(r: Room, actor: string): View {
  if (!r.players.some((p) => p.id === actor)) fail("Entre na sala primeiro.");
  const { deck: _deck, questions: _questions, ...base } = structuredClone(r);
  return {
    ...base,
    players: r.players.map((p) => ({
      ...p,
      hand: p.id === actor ? [...p.hand] : [],
    })),
    custom: r.phase === "lobby" ? r.custom : [],
    submissions:
      r.phase === "answering" || r.phase === "lobby"
        ? []
        : r.submissions.map((s) => ({
            ...s,
            player: ["result", "finished"].includes(r.phase) ? s.player : "",
          })),
    votes: {},
    submitted: r.submissions.map((s) => s.player),
    voteCount: Object.keys(r.votes).length,
    myVote: r.votes[actor] ?? null,
  };
}
export function restore(raw: string): Room {
  let r: Room;
  try {
    r = JSON.parse(raw);
  } catch {
    fail("Sessão local incompatível. Inicie uma nova demonstração.");
  }
  const isCard = (c: Card) =>
    c &&
    typeof c.id === "string" &&
    typeof c.text === "string" &&
    [0, 1, 2].includes(c.pick);
  if (
    !r ||
    r.version !== 1 ||
    !Array.isArray(r.players) ||
    r.players.length === 0 ||
    r.players.length > 12 ||
    r.players.some(
      (p) =>
        !p ||
        typeof p.id !== "string" ||
        typeof p.name !== "string" ||
        !emojis.includes(p.emoji) ||
        !Number.isInteger(p.score) ||
        p.score < 0 ||
        !Number.isFinite(p.seen) ||
        !Array.isArray(p.hand) ||
        p.hand.length > 10 ||
        !p.hand.every(isCard),
    ) ||
    new Set(r.players.map((p) => p.id)).size !== r.players.length ||
    !r.players.some((p) => p.id === r.host) ||
    typeof r.code !== "string" ||
    !/^[A-Z0-9]{6}$/.test(r.code) ||
    ![5, 7, 10].includes(r.target) ||
    !["classic", "democracy"].includes(r.mode) ||
    !Number.isInteger(r.round) ||
    r.round < 0 ||
    !Array.isArray(r.packs) ||
    !r.packs.every((p) => packIds.includes(p)) ||
    (r.excludedThemes !== undefined &&
      (!Array.isArray(r.excludedThemes) ||
        !r.excludedThemes.every((t) => Object.hasOwn(themes, t)))) ||
    !Array.isArray(r.custom) ||
    !r.custom.every(isCard) ||
    !Array.isArray(r.deck) ||
    !r.deck.every(isCard) ||
    !Array.isArray(r.questions) ||
    !r.questions.every(isCard) ||
    !Array.isArray(r.submissions) ||
    r.submissions.some(
      (s) =>
        !s ||
        typeof s.id !== "string" ||
        typeof s.player !== "string" ||
        !Array.isArray(s.cards) ||
        !s.cards.every(isCard),
    ) ||
    !Array.isArray(r.reactions) ||
    r.reactions.some(
      (x) =>
        !x ||
        typeof x.id !== "string" ||
        !reactions.includes(x.text) ||
        !Number.isFinite(x.at),
    ) ||
    !r.votes ||
    typeof r.votes !== "object" ||
    Array.isArray(r.votes) ||
    (r.phase !== "lobby" &&
      (!r.prompt ||
        !isCard(r.prompt) ||
        !r.players.some((p) => p.id === r.judge))) ||
    !["lobby", "answering", "revealing", "result", "finished"].includes(r.phase)
  )
    fail("Sessão local incompatível. Inicie uma nova demonstração.");
  return r;
}
