import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import packs from "../data/packs.json";
import themes from "../data/themes.json";
import { catalog, createRoom, included, restore, transition } from "./engine";

describe("curadoria e combinações do baralho", () => {
  it("equilibra pacotes e temas, valida metadados e limita fórmulas repetidas", () => {
    for (const pack of packs) {
      const cards = catalog.filter((c) => c.pack === pack.id);
      expect(cards).toHaveLength(60);
      expect(cards.filter((c) => c.pick === 1)).toHaveLength(16);
      expect(cards.filter((c) => c.pick === 2)).toHaveLength(4);
      expect(cards.filter((c) => c.pick === 0)).toHaveLength(40);
    }
    for (const c of catalog) {
      expect(Object.hasOwn(themes, c.theme!)).toBe(true);
      expect(["irreverente", "acido", "nonsense"]).toContain(c.tone);
      expect(c.grammar).toBe(c.pick ? "nominal-slots" : "nominal");
      expect(c.text.length).toBeLessThanOrEqual(180);
      expect(c.text).toBe(c.text.trim());
      expect(c.text).not.toMatch(/[\r\n]| {2}|_{9}/);
      expect((c.text.match(/________/g) ?? []).length).toBe(c.pick);
      if (["morte", "medicina", "religiao"].includes(c.theme!))
        expect(c.pack).toBe("acido");
    }
    const answers = catalog.filter((c) => !c.pick);
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
    expect(
      new Set(catalog.map((c) => c.text.toLocaleLowerCase("pt-BR"))).size,
    ).toBe(catalog.length);
    for (const theme of Object.keys(themes))
      expect(
        answers.filter((c) => c.theme === theme).length / answers.length,
      ).toBeLessThan(0.3);
    const prefixes = answers.map((c) =>
      c.text.toLocaleLowerCase("pt-BR").split(/\s+/).slice(0, 3).join(" "),
    );
    for (const prefix of new Set(prefixes))
      expect(prefixes.filter((p) => p === prefix).length).toBeLessThanOrEqual(
        4,
      );
    // Catch near-duplicates with almost the same vocabulary; semantics still need editorial review.
    const words = answers.map(
      (c) =>
        new Set(
          c.text
            .toLocaleLowerCase("pt-BR")
            .replace(/[^\p{L}\p{N} ]/gu, "")
            .split(/\s+/),
        ),
    );
    for (let i = 0; i < words.length; i++)
      for (let j = i + 1; j < words.length; j++) {
        const intersection = [...words[i]].filter((w) =>
          words[j].has(w),
        ).length;
        expect(
          intersection / new Set([...words[i], ...words[j]]).size,
          `${answers[i].id} / ${answers[j].id}`,
        ).toBeLessThan(0.8);
      }
  });

  it("mantém tabus opcionais e aplica filtros também às perguntas e à restauração", () => {
    let room = createRoom("a", "Pessoa A", "💀");
    expect(room.packs).not.toContain("acido");
    for (const id of ["b", "c"])
      room = transition(room, id, {
        type: "join",
        name: "Pessoa " + id,
        emoji: "🤡",
      });
    expect(() =>
      transition(room, "b", {
        type: "config",
        packs: ["acido"],
        target: 5,
        mode: "classic",
      }),
    ).toThrow("anfitrião");
    const change = {
      type: "config",
      packs: packs.map((p) => p.id),
      target: 5,
      mode: "classic",
      excludedThemes: ["escatologia", "medicina", "religiao"],
    };
    room = transition(room, "a", change);
    expect(restore(JSON.stringify(room))).toEqual(room);
    expect(() =>
      transition(room, "a", { ...change, excludedThemes: ["inexistente"] }),
    ).toThrow("Temas");
    room = transition(room, "a", { type: "start" });
    const drawn = [
      ...room.players.flatMap((p) => p.hand),
      ...room.deck,
      ...room.questions,
      room.prompt!,
    ];
    expect(drawn.every((c) => included(c, room))).toBe(true);
    expect(drawn.some((c) => c.pack === "acido")).toBe(true);
    // Existing v1 sessions remain valid without new optional fields.
    delete room.excludedThemes;
    expect(restore(JSON.stringify(room))).toEqual(room);
  });

  it("gera combinações reproduzíveis sem lacunas ou respostas repetidas na mesma frase", () => {
    const sample = readFileSync("docs/COMBINACOES.md", "utf8");
    const lines = sample.split("\n").filter((l) => l.startsWith("- "));
    expect(lines).toHaveLength(48);
    expect(sample).not.toContain("________");
    const responseThemes = new Set<string>();
    const questionPacks = new Set<string>();
    for (const line of lines) {
      const ids = line.match(/\(([a-z]+-q\d+); ([^)]+)\)$/)!;
      expect(ids).not.toBeNull();
      const question = catalog.find((c) => c.id === ids[1])!;
      const answerIds = ids[2].split(", ");
      expect(answerIds).toHaveLength(question.pick);
      expect(new Set(answerIds).size).toBe(question.pick);
      let slot = 0;
      const rendered = question.text.replace(/________/g, () => {
        const answerId = answerIds[slot++];
        const answer = catalog.find((c) => c.id === answerId)!;
        expect(answer.pick).toBe(0);
        return `[${answer.text.replace(/[.!?]$/, "")}]`;
      });
      expect(line).toBe(
        `- ${rendered} (${question.id}; ${answerIds.join(", ")})`,
      );
      expect((line.match(/\[/g) ?? []).length).toBe(question.pick);
      questionPacks.add(question.pack);
      for (const id of answerIds)
        responseThemes.add(catalog.find((c) => c.id === id)!.theme!);
    }
    expect(questionPacks.size).toBe(6);
    expect(responseThemes.size).toBeGreaterThanOrEqual(10);
    const standard = sample.split("## Todos os pacotes")[0];
    expect(standard).not.toMatch(/acido-[qa]\d/);
  });
});
