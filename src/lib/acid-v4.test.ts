import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catalog, createRoom, restore, transition, view } from "./engine";
import { completePhrase } from "./phrases";
import type { Card } from "./types";
const load = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const baseline = load("docs/editorial/CATALOGO-PRE-V4.json") as Card[];
const revisions = load("docs/editorial/REVISAO-ACIDO-V4.json") as {
  id: string;
  antes: Card;
  depois: Card;
  motivo: string;
}[];
const added = catalog.filter((c) => !baseline.some((b) => b.id === c.id));
const lobby = () => {
  let r = createRoom("a", "Pessoa A", "💀");
  for (const id of ["b", "c"])
    r = transition(r, id, { type: "join", name: `Pessoa ${id}`, emoji: "🤡" });
  return r;
};
describe("expansão ácida V4", () => {
  it("conserva as 607 identidades, altera só 20 cartas ácidas auditadas e preserva integralmente os demais pacotes", () => {
    expect(baseline).toHaveLength(607);
    expect(revisions).toHaveLength(20);
    expect(new Set(revisions.map((r) => r.id)).size).toBe(20);
    for (const old of baseline) {
      const current = catalog.find((c) => c.id === old.id)!;
      const revision = revisions.find((r) => r.id === old.id);
      if (!revision) expect(current).toEqual(old);
      else {
        expect(old.pack).toBe("acido");
        expect(revision.antes).toEqual(old);
        expect(revision.depois).toEqual(current);
        expect(revision.motivo.length).toBeGreaterThan(40);
        expect(current.text).not.toBe(old.text);
        expect({ ...current, text: old.text }).toEqual(old);
      }
    }
    expect(catalog.filter((c) => c.pack === "escola")).toEqual(
      baseline.filter((c) => c.pack === "escola"),
    );
  });
  it("adiciona 80 respostas, 30 simples e 10 duplas somente no pacote existente", () => {
    expect(added).toHaveLength(120);
    expect(added.every((c) => c.pack === "acido")).toBe(true);
    expect(
      [0, 1, 2].map((pick) => added.filter((c) => c.pick === pick).length),
    ).toEqual([80, 30, 10]);
    expect(catalog.filter((c) => c.pack === "acido")).toHaveLength(216);
    const sql = readFileSync(
      "supabase/migrations/202610300012_humor_acido_v4.sql",
      "utf8",
    );
    const ids = [...sql.matchAll(/^\('(acido-[aq]\d+)'/gm)].map((m) => m[1]);
    expect(ids).toHaveLength(140);
    expect(new Set(ids)).toEqual(
      new Set([...added.map((c) => c.id), ...revisions.map((r) => r.id)]),
    );
    expect(sql).not.toMatch(
      /(?:update|delete\s+from|insert\s+into)\s+(?:private\.rooms|public\.room_signals)|\b(?:grant|revoke|policy|truncate)\b/i,
    );
  });
  it("continua desativado por padrão e inclui ou filtra o pacote inteiro no modo local", () => {
    let r = lobby();
    expect(r.packs).not.toContain("acido");
    const original = transition(r, "a", { type: "start" });
    expect(
      [
        ...original.deck,
        ...original.questions,
        original.prompt!,
        ...original.players.flatMap((p) => p.hand),
      ].some((c) => c.pack === "acido"),
    ).toBe(false);
    expect(() =>
      transition(r, "b", {
        type: "config",
        packs: ["acido"],
        target: 5,
        mode: "classic",
      }),
    ).toThrow("anfitrião");
    r = transition(r, "a", {
      type: "config",
      packs: ["acido"],
      target: 5,
      mode: "classic",
    });
    r = transition(r, "a", { type: "start" });
    const all = [
      ...r.deck,
      ...r.questions,
      r.prompt!,
      ...r.players.flatMap((p) => p.hand),
    ];
    expect(new Set(all.map((c) => c.id))).toEqual(
      new Set(catalog.filter((c) => c.pack === "acido").map((c) => c.id)),
    );
    expect(r.players.every((p) => p.hand.length === 10)).toBe(true);
    let filtered = transition(lobby(), "a", {
      type: "config",
      packs: ["acido", "escola"],
      target: 5,
      mode: "classic",
      excludedThemes: ["medicina", "escatologia", "religiao"],
    });
    filtered = transition(filtered, "a", { type: "start" });
    const available = [
      ...filtered.deck,
      ...filtered.questions,
      filtered.prompt!,
      ...filtered.players.flatMap((p) => p.hand),
    ];
    expect(
      available.every((c) => !filtered.excludedThemes!.includes(c.theme!)),
    ).toBe(true);
    expect(new Set(available.map((c) => c.pack))).toEqual(
      new Set(["acido", "escola"]),
    );
  });
  it("envia uma dupla nova em ordem, revela a frase e conserva anonimato até o juiz escolher", () => {
    let r = transition(lobby(), "a", {
      type: "config",
      packs: ["acido"],
      target: 5,
      mode: "classic",
    });
    r = transition(r, "a", { type: "start" });
    r.prompt = catalog.find((c) => c.id === "acido-q61")!;
    const hand = r.players[1].hand;
    const selected = [hand[1], hand[0]];
    expect(() =>
      transition(r, "b", { type: "submit", cards: [hand[0].id, hand[0].id] }),
    ).toThrow();
    expect(() =>
      transition(r, "b", { type: "submit", cards: [hand[0].id] }),
    ).toThrow();
    r = transition(r, "b", {
      type: "submit",
      cards: selected.map((c) => c.id),
    });
    r = transition(r, "c", {
      type: "submit",
      cards: r.players[2].hand.slice(0, 2).map((c) => c.id),
    });
    r = transition(r, "a", { type: "reveal" });
    const submission = r.submissions.find((s) => s.player === "b")!;
    expect(submission.cards).toEqual(selected);
    const phrase = completePhrase(r.prompt!.text, submission.cards);
    expect(phrase).not.toContain("________");
    const fragment = (c: Card) =>
      c.text
        .replace(/[.!?]$/, "")
        .replace(/^(O|A|Os|As|Um|Uma|Uns|Umas) /, (m) => m.toLowerCase());
    expect(phrase).toBe(
      `O primeiro exame revelou ${fragment(selected[0])}. O segundo confirmou ${fragment(selected[1])}.`,
    );
    for (const id of ["a", "b", "c"])
      expect(view(r, id).submissions.every((s) => s.player === "")).toBe(true);
    r = transition(r, "a", { type: "choose", id: submission.id });
    expect(
      view(r, "c").submissions.find((s) => s.id === submission.id)!.player,
    ).toBe("b");
    expect(r.players.find((p) => p.id === "b")!.score).toBe(1);
    expect(restore(JSON.stringify(r))).toEqual(r);
  });
  it("restaura textos ácidos antigos sem reescrever a mão ou o placar local", () => {
    const r = transition(lobby(), "a", { type: "start" });
    r.prompt = baseline.find((c) => c.id === "acido-q24")!;
    r.players[1].hand[0] = baseline.find((c) => c.id === "acido-a11")!;
    r.players[1].score = 2;
    expect(restore(JSON.stringify(r))).toEqual(r);
    expect(r.players[1].hand[0].text).not.toBe(
      catalog.find((c) => c.id === "acido-a11")!.text,
    );
  });
  it("reproduz 120 cruzamentos ácidos com parecer individual e uma amostra geral que separa o opt-in", () => {
    const samples = load("docs/editorial/AMOSTRA-ACIDO-V4.json") as {
      id: string;
      pergunta: string;
      respostas: string[];
      texto: string;
    }[];
    const reviews = load("docs/editorial/AVALIACAO-ACIDO-V4.json");
    expect(samples).toHaveLength(120);
    expect(reviews).toHaveLength(120);
    const keys = new Set<string>();
    const counts = [0, 0, 0];
    samples.forEach((s, i) => {
      const q = catalog.find((c) => c.id === s.pergunta)!;
      const answers = s.respostas.map((id) =>
        catalog.find((c) => c.id === id)!,
      );
      expect(answers).toHaveLength(q.pick);
      expect(answers.every((c) => c.pick === 0)).toBe(true);
      expect(new Set([q.pack, ...answers.map((c) => c.pack)]).size).toBe(
        q.pick + 1,
      );
      expect([q, ...answers].some((c) => c.pack === "acido")).toBe(true);
      expect(q.pack === "acido").toBe(i < 60);
      counts[q.pick]++;
      let slot = 0;
      expect(s.texto).toBe(
        q.text.replace(
          /________/g,
          () => `[${answers[slot++].text.replace(/[.!?]$/, "")}]`,
        ),
      );
      const { parecer, categorias, nota, ...same } = reviews[i];
      expect(same).toEqual(s);
      expect(["PROMISSORA", "MEDIA", "FRACA"]).toContain(parecer);
      expect(categorias.length).toBeGreaterThan(0);
      expect(nota.length).toBeGreaterThan(40);
      keys.add([s.pergunta, ...s.respostas].join(";"));
    });
    expect(keys.size).toBe(120);
    expect(counts.slice(1)).toEqual([80, 40]);
    const general = load("docs/editorial/AMOSTRA-V4-GERAL.json");
    expect(general.filter((s: { tabus: boolean }) => !s.tabus)).toHaveLength(
      60,
    );
    for (const s of general.filter((s: { tabus: boolean }) => !s.tabus))
      expect(
        [s.pergunta, ...s.respostas].some((id: string) =>
          id.startsWith("acido-"),
        ),
      ).toBe(false);
  });
});

it("mantém as vinte apostas editoriais vinculadas à frase exibida pelo jogo", () => {
  const bets = load("docs/editorial/20-COMBINACOES-ACIDO-V4.json") as {
    pergunta: string;
    respostas: string[];
    texto: string;
    nota: string;
  }[];
  expect(bets).toHaveLength(20);
  const packs = new Set<string>();
  for (const bet of bets) {
    const q = catalog.find((c) => c.id === bet.pergunta)!;
    const answers = bet.respostas.map((id) =>
      catalog.find((c) => c.id === id)!,
    );
    expect(answers).toHaveLength(q.pick);
    expect(answers.every((c) => c.pick === 0)).toBe(true);
    expect(new Set([q.pack, ...answers.map((c) => c.pack)]).size).toBe(
      q.pick + 1,
    );
    expect([q, ...answers].some((c) => c.pack === "acido")).toBe(true);
    expect(bet.texto).toBe(completePhrase(q.text, answers));
    expect(bet.nota.length).toBeGreaterThan(40);
    for (const c of [q, ...answers]) packs.add(c.pack);
  }
  expect(packs.size).toBe(6);
});
