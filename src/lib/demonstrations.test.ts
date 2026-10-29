import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catalog } from "./engine";
import type { Card } from "./types";
const load = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const audit = load("docs/editorial/REVISAO-DEMONSTRACOES.json").cartas as {
  id: string;
  decisao: string;
  antes: Card;
  depois: Card;
}[];
describe("revisão baseada nas demonstrações", () => {
  it("encadeia a revisão com a V3 e conserva todos os IDs, pacotes e tipos", () => {
    const v3 = load("docs/editorial/REVISAO-V3.json").cartas as {
      id: string;
      depois: Card;
    }[];
    expect(audit).toHaveLength(580);
    expect(new Set(audit.map((r) => r.id)).size).toBe(580);
    for (const row of audit) {
      expect(row.antes).toEqual(v3.find((r) => r.id === row.id)!.depois);
      expect(row.depois).toEqual(catalog.find((c) => c.id === row.id));
      expect(row.depois.pick).toBe(row.antes.pick);
      expect(row.depois.pack).toBe(row.antes.pack);
      expect(row.decisao).toBe(
        JSON.stringify(row.antes) === JSON.stringify(row.depois)
          ? "MANTER"
          : "REVER",
      );
    }
  });
  it("registra 120 leituras entre pacotes sem confundir rótulo editorial com medição de humor", () => {
    const sample = load("docs/editorial/AMOSTRA-DEMONSTRACOES.json");
    const reviews = load("docs/editorial/AVALIACAO-DEMONSTRACOES.json");
    expect(sample).toHaveLength(120);
    expect(reviews).toHaveLength(120);
    const keys = new Set<string>();
    for (let i = 0; i < sample.length; i++) {
      const { parecer, categorias, nota, ...original } = reviews[i];
      expect(original).toEqual(sample[i]);
      expect(["PROMISSORA", "MEDIA", "FRACA"]).toContain(parecer);
      expect(categorias.length).toBeGreaterThan(0);
      expect(nota.length).toBeGreaterThan(30);
      const q = catalog.find((c) => c.id === original.pergunta)!;
      const answers = original.respostas.map((id: string) =>
        catalog.find((c) => c.id === id)!,
      );
      expect(answers).toHaveLength(q.pick);
      expect(answers.every((a: Card) => !a.pick)).toBe(true);
      expect(new Set([q.pack, ...answers.map((a: Card) => a.pack)]).size).toBe(
        q.pick + 1,
      );
      if (!original.tabus)
        expect([q, ...answers].some((c: Card) => c.pack === "acido")).toBe(
          false,
        );
      let index = 0;
      expect(original.texto).toBe(
        q.text.replace(
          /________/g,
          () => `[${answers[index++].text.replace(/[.!?]$/, "")}]`,
        ),
      );
      const key = [q.id, ...original.respostas].join(";");
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });
  it("aumenta fragmentos curtos sem remover cartas e migra só os registros revistos", () => {
    const before = audit.map((r) => r.antes).filter((c) => !c.pick);
    const after = catalog.filter((c) => !c.pick);
    const short = (a: Card[]) =>
      a.filter((c) => c.text.split(/\s+/).length <= 3).length;
    expect(short(after)).toBeGreaterThan(short(before));
    const sql = readFileSync(
      "supabase/migrations/202610290010_catalog_demonstracoes.sql",
      "utf8",
    );
    const ids = [...sql.matchAll(/^\('([a-z]+-[qa]\d+)'/gm)].map((m) => m[1]);
    expect(ids.length).toBe(new Set(ids).size);
    expect(new Set(ids)).toEqual(
      new Set(audit.filter((r) => r.decisao === "REVER").map((r) => r.id)),
    );
    expect(sql).not.toMatch(
      /(?:update|insert into|delete from)\s+private\.rooms/i,
    );
  });
});
