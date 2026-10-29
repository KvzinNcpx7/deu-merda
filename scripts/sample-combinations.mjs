import { readFileSync, writeFileSync } from "node:fs";
const cards = JSON.parse(readFileSync("src/data/cards.json", "utf8"));
// Seeded random sample: stable for editorial review; it does not alter gameplay RNG.
let state = 0xdecaf;
const random = (length) => {
  state = (Math.imul(1664525, state) + 1013904223) >>> 0;
  return Math.floor((state / 0x100000000) * length);
};
const sections = [];
for (const acid of [false, true]) {
  const pool = cards.filter((c) => acid || c.pack !== "acido");
  const questions = pool.filter((c) => c.pick);
  const answers = pool.filter((c) => !c.pick);
  const lines = [];
  for (let i = 0; i < 24; i++) {
    const q = questions[random(questions.length)];
    const used = new Set();
    const selected = Array.from({ length: q.pick }, () => {
      let a;
      do {
        a = answers[random(answers.length)];
      } while (used.has(a.id));
      used.add(a.id);
      return a;
    });
    let n = 0;
    // Brackets retain the original wording, including articles and capitalisation.
    const text = q.text.replace(
      /________/g,
      () => `[${selected[n++].text.replace(/[.!?]$/, "")}]`,
    );
    lines.push(`- ${text} (${q.id}; ${selected.map((a) => a.id).join(", ")})`);
  }
  sections.push(
    `## ${acid ? "Todos os pacotes, incluindo Ácido e Tabus" : "Padrão, sem Ácido e Tabus"}\n\n${lines.join("\n")}`,
  );
}
writeFileSync(
  "docs/COMBINACOES.md",
  `# Amostra de combinações\n\n48 combinações pseudoaleatórias reproduzíveis (seed 0xdecaf). Colchetes delimitam a resposta; não são texto de jogo. Esta amostra ajuda a revisão humana; não mede se a piada é engraçada. Regere com \`npm run cards:sample\`.\n\n${sections.join("\n\n")}\n`,
);
