import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catalog, createRoom, restore, transition } from "./engine";
import type { Card } from "./types";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const revision = read("docs/editorial/REVISAO-V3.json") as {
  cartas: {
    id: string;
    decisao: string;
    antes: Card;
    depois: Card;
    criterios: Record<string, string>;
  }[];
};
const historicalCatalog = revision.cartas.map((row) => row.depois);
describe("contrato editorial V3", () => {
  it("registra cada ID uma vez, conserva pacote/tipo e distingue manter de alterar", () => {
    expect(revision.cartas).toHaveLength(580);
    expect(new Set(revision.cartas.map((c) => c.id)).size).toBe(580);
    expect(new Set(revision.cartas.map((c) => c.id))).toEqual(
      new Set(
        catalog
          .filter((c) => revision.cartas.some((r) => r.id === c.id))
          .map((c) => c.id),
      ),
    );
    for (const row of revision.cartas) {
      expect(row.depois.id).toBe(row.id);
      expect(row.antes.id).toBe(row.id);
      expect(row.depois.pick).toBe(row.antes.pick);
      expect(row.depois.pack).toBe(row.antes.pack);
      expect(Object.keys(row.criterios).sort()).toEqual([
        "compatibilidade",
        "humor",
        "naturalidade",
        "originalidade",
        "variedade",
      ]);
      if (row.decisao === "MANTER") expect(row.depois).toEqual(row.antes);
      else {
        expect(["AJUSTAR", "SUBSTITUIR"]).toContain(row.decisao);
        expect(row.depois).not.toEqual(row.antes);
      }
    }
  });
  it("a migração incremental cobre somente as cartas revistas", () => {
    const sql = readFileSync(
      "supabase/migrations/202610290008_curadoria_v3.sql",
      "utf8",
    );
    const ids = [...sql.matchAll(/^\('([a-z]+-[qa]\d+)'/gm)].map((m) => m[1]);
    expect(ids.length).toBe(new Set(ids).size);
    expect(new Set(ids)).toEqual(
      new Set(
        revision.cartas.filter((c) => c.decisao !== "MANTER").map((c) => c.id),
      ),
    );
    expect(sql).not.toMatch(
      /(?:update|delete\s+from|insert\s+into)\s+(?:private\.rooms|public\.room_signals)/i,
    );
  });
  it("mantém fragmentos curtos e limita as fórmulas, sem usar comprimento como nota de graça", () => {
    const answers = catalog.filter((c) => !c.pick);
    expect(
      answers.filter((c) => c.text.split(/\s+/).length <= 3).length,
    ).toBeGreaterThanOrEqual(40);
    expect(
      answers.filter((c) => c.text.split(/\s+/).length <= 7).length,
    ).toBeGreaterThanOrEqual(320);
    expect(
      answers.filter((c) => /\bque\b/i.test(c.text)).length,
    ).toBeLessThanOrEqual(20);
    expect(
      answers.filter((c) => /conceito de|com CNPJ|com advogado/i.test(c.text))
        .length,
    ).toBeLessThanOrEqual(2);
  });
  it("mantém os 120 pareceres vinculados aos textos e IDs da amostra atual", () => {
    const samples = read("docs/editorial/AMOSTRA-V3.json");
    const reviews = read("docs/editorial/AVALIACAO-COMBINACOES-V3.json");
    expect(samples).toHaveLength(120);
    expect(reviews).toHaveLength(120);
    expect(new Set(samples.map((s: { id: string }) => s.id)).size).toBe(120);
    const keys = new Set<string>();
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i],
        review = reviews[i];
      const { parecer, nota, ...same } = review;
      expect(same).toEqual(s);
      expect(["FORTE", "MEDIA", "FRACA"]).toContain(parecer);
      expect(nota.length).toBeGreaterThan(30);
      const question = historicalCatalog.find((c) => c.id === s.pergunta)!;
      const answers = s.respostas.map((id: string) =>
        historicalCatalog.find((c) => c.id === id)!,
      );
      expect(answers).toHaveLength(question.pick);
      expect(answers.every((c: Card) => c.pick === 0)).toBe(true);
      expect(
        new Set([question.pack, ...answers.map((c: Card) => c.pack)]).size,
      ).toBe(question.pick + 1);
      if (!s.tabus)
        expect(
          [question, ...answers].some((c: Card) => c.pack === "acido"),
        ).toBe(false);
      const key = [s.pergunta, ...s.respostas].join(";");
      expect(keys.has(key)).toBe(false);
      keys.add(key);
      let slot = 0;
      expect(s.texto).toBe(
        question.text.replace(
          /________/g,
          () => `[${answers[slot++].text.replace(/[.!?]$/, "")}]`,
        ),
      );
    }
  });
  it("restaura uma mão e pergunta antigas sem migrar seus textos localmente", () => {
    let room = createRoom("a", "Pessoa A", "💀");
    for (const id of ["b", "c"])
      room = transition(room, id, {
        type: "join",
        name: `Pessoa ${id}`,
        emoji: "🤡",
      });
    room = transition(room, "a", { type: "start" });
    const changed = revision.cartas.find(
      (c) => !c.antes.pick && c.decisao !== "MANTER",
    )!;
    const question = revision.cartas.find(
      (c) => c.antes.pick === 1 && c.decisao !== "MANTER",
    )!;
    room.players[0].hand[0] = changed.antes;
    room.prompt = question.antes;
    const recovered = restore(JSON.stringify(room));
    expect(recovered.players[0].hand[0].text).toBe(changed.antes.text);
    expect(recovered.prompt?.text).toBe(question.antes.text);
    expect(recovered.players[0].hand[0].text).not.toBe(changed.depois.text);
  });
});
