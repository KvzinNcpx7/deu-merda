import { describe, expect, it } from "vitest";
import { catalog, createRoom, restore, transition as go, view } from "./engine";
import type { Room } from "./types";
function lobby() {
  let r = createRoom("a", "Pessoa A", "💀");
  for (const id of ["b", "c"])
    r = go(r, id, { type: "join", name: "Pessoa " + id, emoji: "🤡" });
  return r;
}
const start = () => go(lobby(), "a", { type: "start" });
function answer(r: Room) {
  for (const p of r.players.filter((p) => p.id !== r.judge))
    r = go(r, p.id, {
      type: "submit",
      cards: p.hand.slice(0, r.prompt!.pick).map((c) => c.id),
    });
  return go(r, r.judge, { type: "reveal" });
}
describe("motor de partida", () => {
  it("distribui 10 cartas únicas por jogador e só expõe a própria mão", () => {
    const r = start();
    expect(r.players.map((p) => p.hand.length)).toEqual([10, 10, 10]);
    expect(
      new Set(r.players.flatMap((p) => p.hand.map((c) => c.id))).size,
    ).toBe(30);
    const v = view(r, "b");
    expect(v.players.find((p) => p.id === "a")!.hand).toEqual([]);
    expect(v.players.find((p) => p.id === "b")!.hand).toHaveLength(10);
    expect(v).not.toHaveProperty("deck");
    expect(v).not.toHaveProperty("questions");
  });
  it("valida juiz, posse, duplicidade e fase", () => {
    const r = start();
    expect(() =>
      go(r, "a", { type: "submit", cards: [r.players[0].hand[0].id] }),
    ).toThrow("juiz");
    expect(() =>
      go(r, "b", {
        type: "submit",
        cards: r.players[0].hand.slice(0, r.prompt!.pick).map((c) => c.id),
      }),
    ).toThrow("não é sua");
    const sent = go(r, "b", {
      type: "submit",
      cards: r.players[1].hand.slice(0, r.prompt!.pick).map((c) => c.id),
    });
    expect(() => go(sent, "b", { type: "submit", cards: [] })).toThrow(
      "já enviou",
    );
    expect(() => go(sent, "a", { type: "reveal" })).toThrow("faltam");
    expect(() => go(r, "b", { type: "next" })).toThrow();
    expect(() => go(r, "outsider", { type: "ping" })).toThrow();
  });
  it("preserva ordem das duplas e impede repetir carta", () => {
    const r = start();
    r.prompt = catalog.find((c) => c.pick === 2)!;
    const p = r.players[1];
    expect(() =>
      go(r, "b", { type: "submit", cards: [p.hand[0].id, p.hand[0].id] }),
    ).toThrow("sem repetir");
    expect(() =>
      go(r, "b", { type: "submit", cards: [p.hand[0].id] }),
    ).toThrow();
    const next = go(r, "b", {
      type: "submit",
      cards: [p.hand[1].id, p.hand[0].id],
    });
    expect(next.submissions[0].cards.map((c) => c.id)).toEqual([
      p.hand[1].id,
      p.hand[0].id,
    ]);
  });
  it("não mostra autoria ou respostas antes do momento devido", () => {
    const r = answer(start());
    expect(view(r, "a").submissions.every((s) => s.player === "")).toBe(true);
    const result = go(r, r.judge, { type: "choose", id: r.submissions[0].id });
    expect(view(result, "a").submissions[0].player).not.toBe("");
    expect(result.players.find((p) => p.id === result.winner)!.score).toBe(1);
  });
  it("reabastece mãos e alterna juiz", () => {
    let r = answer(start());
    const used = r.submissions.flatMap((s) => s.cards.map((c) => c.id));
    r = go(r, r.judge, { type: "choose", id: r.submissions[0].id });
    r = go(r, "a", { type: "next" });
    expect(r.judge).toBe("b");
    expect(r.round).toBe(2);
    expect(r.players.every((p) => p.hand.length === 10)).toBe(true);
    expect(
      new Set(r.players.flatMap((p) => p.hand.map((c) => c.id))).size,
    ).toBe(30);
    expect(used.length).toBeGreaterThan(0);
  });
  it("vota uma vez, impede voto próprio, exige democracia e resolve empate", () => {
    let r = lobby();
    r = go(r, "a", {
      type: "config",
      packs: r.packs,
      target: 5,
      mode: "democracy",
    });
    r = answer(go(r, "a", { type: "start" }));
    const b = r.submissions.find((s) => s.player === "b")!,
      c = r.submissions.find((s) => s.player === "c")!;
    expect(() => go(r, "b", { type: "vote", id: b.id })).toThrow();
    r = go(r, "b", { type: "vote", id: c.id });
    expect(() => go(r, "b", { type: "vote", id: c.id })).toThrow();
    r = go(r, "c", { type: "vote", id: b.id });
    r = go(r, "a", { type: "vote", id: b.id });
    expect(r.winner).toBe("b");
    expect(r.phase).toBe("result");
    expect(() =>
      go(answer(start()), "b", { type: "vote", id: b.id }),
    ).toThrow();
  });
  it("encerra uma partida completa na pontuação escolhida", () => {
    let r = start();
    for (let i = 0; i < 40 && r.phase !== "finished"; i++) {
      r = answer(r);
      const preferred =
        r.submissions.find((s) => s.player === "b") ?? r.submissions[0];
      r = go(r, r.judge, { type: "choose", id: preferred.id });
      if (r.phase !== "finished") r = go(r, r.host, { type: "next" });
    }
    expect(r.phase).toBe("finished");
    expect(Math.max(...r.players.map((p) => p.score))).toBe(5);
    expect(() => go(r, "a", { type: "next" })).toThrow();
  });
  it("reconecta sem duplicar jogador e restaura sessões v1", () => {
    const r = start();
    const joined = go(r, "b", { type: "join" });
    expect(joined.players).toHaveLength(3);
    expect(joined.players[1].hand).toEqual(r.players[1].hand);
    expect(restore(JSON.stringify(r))).toEqual(r);
    expect(() => restore('{"version":0}')).toThrow("incompatível");
  });
  it("restringe entrada, configuração, cartas próprias e limite de sala", () => {
    let r = lobby();
    expect(r.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(() => go(r, "b", { type: "start" })).toThrow();
    expect(() =>
      go(r, "a", { type: "custom", text: "Sem lacuna", pick: 2 }),
    ).toThrow();
    r = go(r, "a", {
      type: "custom",
      text: "A privada pediu ________.",
      pick: 1,
    });
    const id = r.custom[0].id;
    r = go(r, "a", { type: "deleteCustom", id });
    expect(r.custom).toHaveLength(0);
    r = go(r, "a", { type: "start" });
    expect(() =>
      go(r, "d", { type: "join", name: "Novo", emoji: "💀" }),
    ).toThrow();
    expect(() =>
      go(r, "a", {
        type: "config",
        packs: ["quinta"],
        target: 5,
        mode: "classic",
      }),
    ).toThrow();
  });
  it("transfere anfitrião e retorna ao lobby se ficar abaixo de 3", () => {
    const r = go(start(), "a", { type: "leave" });
    expect(r.host).toBe("b");
    expect(r.phase).toBe("lobby");
    expect(r.players.every((p) => p.hand.length === 0)).toBe(true);
  });
  it("limita reações e aceita apenas a lista permitida", () => {
    let r = answer(start());
    r = go(r, "b", { type: "reaction", text: "💀" });
    expect(() => go(r, "b", { type: "reaction", text: "💀" })).toThrow(
      "Respira",
    );
    expect(() =>
      go(r, "c", { type: "reaction", text: "texto livre" }),
    ).toThrow();
  });
  it("catálogo curado tem 150 simples, 30 duplas e 427 respostas sem repetição", () => {
    expect(catalog.filter((c) => c.pick === 1)).toHaveLength(150);
    expect(catalog.filter((c) => c.pick === 2)).toHaveLength(30);
    expect(catalog.filter((c) => !c.pick)).toHaveLength(427);
    expect(new Set(catalog.map((c) => c.id)).size).toBe(607);
    expect(new Set(catalog.map((c) => c.text)).size).toBe(607);
    for (const c of catalog)
      expect((c.text.match(/________/g) ?? []).length).toBe(c.pick);
  });
});

describe("regressões V2", () => {
  it("guarda a revelação na sala, preserva anonimato e restaura o cursor", () => {
    let r = answer(start());
    expect(() => go(r, "b", { type: "browse", index: 1 })).toThrow("juiz");
    for (const index of [-1, 2, 0.5, null, "1"])
      expect(() => go(r, "a", { type: "browse", index })).toThrow();
    r = go(r, "a", { type: "browse", index: 1, expectedRound: r.round });
    expect(view(r, "b").revealIndex).toBe(1);
    expect(view(r, "c").submissions.every((s) => !s.player)).toBe(true);
    expect(restore(JSON.stringify(r)).revealIndex).toBe(1);
    r = go(r, "a", { type: "choose", id: r.submissions[1].id });
    r = go(r, "a", { type: "next" });
    expect(r.revealIndex).toBe(0);
  });
  it("recusa envio atrasado sem gastar a mão nem alterar o placar", () => {
    const r = start();
    expect(() =>
      go(r, "b", {
        type: "submit",
        expectedRound: r.round - 1,
        cards: r.players[1].hand.slice(0, r.prompt!.pick).map((c) => c.id),
      }),
    ).toThrow("rodada mudou");
    expect(r.players[1].hand).toHaveLength(10);
    expect(r.submissions).toHaveLength(0);
  });
  it("não aceita lacunas parciais ou sequências longas em cartas próprias", () => {
    for (const text of ["Teste _________", "Teste ___", "Teste ________ _"])
      expect(() =>
        go(lobby(), "a", { type: "custom", text, pick: 1 }),
      ).toThrow();
  });
});

it("separa a ordem do status da ordem das combinações anônimas", () => {
  const r = answer(start());
  r.submissions.sort((a, b) => b.player.localeCompare(a.player));
  const before = view(r, "a");
  expect(before.submitted).toEqual(["b", "c"]);
  expect(before.submissions.every((s) => s.player === "")).toBe(true);
  r.submissions.reverse();
  expect(view(r, "a").submitted).toEqual(before.submitted);
  const result = go(r, r.judge, { type: "choose", id: r.submissions[0].id });
  expect(view(result, "a").submissions.every((s) => s.player !== "")).toBe(
    true,
  );
});
