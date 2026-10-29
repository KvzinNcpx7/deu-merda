import { format } from "prettier";
import { readFileSync, writeFileSync } from "node:fs";
const cards = JSON.parse(readFileSync("src/data/cards.json", "utf8"));
// Editorial sampling only; game RNG and rendering remain unchanged.
let state = 0xdecaf;
const random = (length) => {
  state = (Math.imul(1664525, state) + 1013904223) >>> 0;
  return Math.floor((state / 0x100000000) * length);
};
const choose = (pool) => pool[random(pool.length)];
const sections = [],
  samples = [],
  used = new Set();
for (const acid of [false, true]) {
  const pool = cards.filter((c) => acid || c.pack !== "acido");
  const packs = [...new Set(pool.map((c) => c.pack))];
  const lines = [];
  for (let i = 0; i < 60; i++) {
    // Cover both slots and every question pack, instead of relying on chance.
    const pack = packs[i % packs.length];
    const pick = Math.floor(i / packs.length) % 3 === 0 ? 2 : 1;
    let q, selected, key;
    do {
      q = choose(pool.filter((c) => c.pack === pack && c.pick === pick));
      const usedPacks = new Set([q.pack]);
      selected = Array.from({ length: q.pick }, (_, slot) => {
        const available = pool.filter((c) => !c.pick && !usedPacks.has(c.pack));
        // Alternate very short fragments and longer scenes for contrast.
        const short = available.filter((c) => c.text.split(/\s+/).length <= 3);
        const candidates =
          (i + slot) % 3 === 0 && short.length ? short : available;
        const answer = choose(candidates);
        usedPacks.add(answer.pack);
        return answer;
      });
      key = `${q.id}; ${selected.map((a) => a.id).join(", ")}`;
    } while (used.has(key));
    used.add(key);
    let n = 0;
    const text = q.text.replace(
      /________/g,
      () => `[${selected[n++].text.replace(/[.!?]$/, "")}]`,
    );
    const id = `V3-${String(samples.length + 1).padStart(3, "0")}`;
    samples.push({
      id,
      tabus: acid,
      pergunta: q.id,
      respostas: selected.map((c) => c.id),
      texto: text,
    });
    lines.push(`- ${text} (${key})`);
  }
  sections.push(
    `## ${acid ? "Todos os pacotes, incluindo Ácido e Tabus" : "Padrão, sem Ácido e Tabus"}\n\n${lines.join("\n")}`,
  );
}
writeFileSync(
  "docs/COMBINACOES.md",
  `# Amostra de combinações\n\n120 combinações reproduzíveis (seed 0xdecaf): 60 sem Tabus e 60 com todos os pacotes. Pergunta e respostas vêm sempre de pacotes diferentes; em duplas, as duas respostas também são de pacotes distintos. A amostra alterna perguntas simples/duplas e fragmentos curtos/cenas. Colchetes conservam o texto original: não fazem parte do jogo nem corrigem concordância automaticamente. Regere com \`npm run cards:sample\`.\n\nA avaliação editorial dos 120 casos está em [editorial/AVALIACAO-COMBINACOES-V3.md](editorial/AVALIACAO-COMBINACOES-V3.md). Sorteio não mede graça nem substitui testes com pessoas.\n\n${sections.join("\n\n")}\n`,
);
writeFileSync(
  "docs/editorial/AMOSTRA-V3.json",
  await format(JSON.stringify(samples), { parser: "json" }),
);
console.log(
  `${samples.length} combinações únicas, com cruzamentos de pacotes, geradas.`,
);
