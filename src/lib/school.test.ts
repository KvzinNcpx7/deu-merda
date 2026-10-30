import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catalog, createRoom, restore, transition } from "./engine";
import type { Card } from "./types";

it("preserva o catálogo anterior fora do ácido e as 27 adições escolares", () => {
  const baseline = JSON.parse(
    readFileSync("docs/editorial/REVISAO-DEMONSTRACOES.json", "utf8"),
  ).cartas as { depois: Card }[];
  for (const { depois } of baseline.filter((r) => r.depois.pack !== "acido"))
    expect(catalog.find((c) => c.id === depois.id)).toEqual(depois);
  const added = catalog.filter(
    (c) => c.pack === "escola" && !baseline.some((r) => r.depois.id === c.id),
  );
  expect(added).toHaveLength(27);
  expect(added.every((c) => c.pack === "escola" && c.pick === 0)).toBe(true);
  for (const name of [
    "Heide",
    "Érika",
    "Cristiane",
    "Natália",
    "Priscila",
    "Márcia",
    "Xirley",
    "Iara",
    "Michelle",
    "Bolsonaro",
    "Lula",
    "Vorcaro",
  ])
    expect(added.some((c) => c.text === name)).toBe(true);
  expect(new Set(catalog.map((c) => c.id)).size).toBe(727);
});

it("inclui todas as novas respostas no baralho local e restaura a sessão", () => {
  let room = createRoom("a", "Pessoa A", "💀");
  for (const id of ["b", "c"])
    room = transition(room, id, {
      type: "join",
      name: "Pessoa " + id,
      emoji: "🤡",
    });
  room = transition(room, "a", {
    type: "config",
    packs: ["escola"],
    target: 5,
    mode: "classic",
  });
  room = transition(room, "a", { type: "start" });
  const answers = [...room.deck, ...room.players.flatMap((p) => p.hand)];
  expect(answers).toHaveLength(94);
  for (let n = 68; n <= 94; n++)
    expect(answers.some((c) => c.id === `escola-a${n}`)).toBe(true);
  expect(restore(JSON.stringify(room))).toEqual(room);
});
