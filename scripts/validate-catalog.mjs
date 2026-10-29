import { readFileSync } from "node:fs";
const cards = JSON.parse(readFileSync("src/data/cards.json", "utf8"));
const packs = JSON.parse(readFileSync("src/data/packs.json", "utf8"));
const themes = JSON.parse(readFileSync("src/data/themes.json", "utf8"));
const ids = new Set(),
  texts = new Set(),
  errors = [];
const counts = [0, 0, 0],
  distribution = {};
for (const card of cards) {
  const text = card.text?.trim();
  const key = text?.normalize("NFKC").toLocaleLowerCase("pt-BR");
  if (!card.id || ids.has(card.id))
    errors.push(`ID duplicado/inválido: ${card.id}`);
  if (!text || text !== card.text || text.length > 180 || texts.has(key))
    errors.push(`Texto inválido/duplicado: ${card.id}`);
  if (
    ![0, 1, 2].includes(card.pick) ||
    (text?.match(/________/g) ?? []).length !== card.pick ||
    (text?.match(/_{2,}/g) ?? []).some((run) => run.length !== 8)
  )
    errors.push(`Lacunas inválidas: ${card.id}`);
  if (
    !packs.some((p) => p.id === card.pack) ||
    !Object.hasOwn(themes, card.theme)
  )
    errors.push(`Classificação inválida: ${card.id}`);
  if (card.grammar !== (card.pick ? "nominal-slots" : "nominal"))
    errors.push(`Compatibilidade inválida: ${card.id}`);
  ids.add(card.id);
  texts.add(key);
  counts[card.pick]++;
  distribution[card.theme] = (distribution[card.theme] ?? 0) + 1;
}
if (JSON.stringify(counts) !== JSON.stringify([427, 150, 30]))
  errors.push(`Contagens incorretas: ${counts}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      total: cards.length,
      answers: counts[0],
      single: counts[1],
      double: counts[2],
      themes: distribution,
    },
    null,
    2,
  ),
);
