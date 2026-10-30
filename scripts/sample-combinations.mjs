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
    const id = `V4-GERAL-${String(samples.length + 1).padStart(3, "0")}`;
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
  `# Amostra de combinações\n\n120 combinações reproduzíveis (seed 0xdecaf): 60 sem Tabus e 60 com todos os pacotes. Pergunta e respostas vêm sempre de pacotes diferentes; em duplas, as duas respostas também são de pacotes distintos. A amostra alterna perguntas simples/duplas e fragmentos curtos/cenas. Colchetes conservam o texto original: não fazem parte do jogo nem corrigem concordância automaticamente. Regere com \`npm run cards:sample\`.\n\nA avaliação dos 120 cruzamentos da amostra dedicada com ácido (separada desta amostra geral) está em [editorial/AVALIACAO-ACIDO-V4.md](editorial/AVALIACAO-ACIDO-V4.md). Sorteio não mede graça nem substitui testes com pessoas.\n\n${sections.join("\n\n")}\n`,
);
writeFileSync(
  "docs/editorial/AMOSTRA-V4-GERAL.json",
  await format(JSON.stringify(samples), { parser: "json" }),
);
console.log(
  `${samples.length} combinações únicas, com cruzamentos de pacotes, geradas.`,
);

// Separate, stratified acid-focused sample: every case crosses packs and
// contains acido. The first half uses acid questions; the second acid answers.
state = 0xac1d04;
const acidSamples = [],
  acidKeys = new Set();
const otherPacks = [
  ...new Set(cards.filter((c) => c.pack !== "acido").map((c) => c.pack)),
];
for (let i = 0; i < 120; i++) {
  const acidQuestion = i < 60;
  const otherPack = otherPacks[i % otherPacks.length];
  const pick = Math.floor(i / otherPacks.length) % 3 === 0 ? 2 : 1;
  let q, answers, key;
  do {
    q = choose(
      cards.filter(
        (c) =>
          c.pack === (acidQuestion ? "acido" : otherPack) && c.pick === pick,
      ),
    );
    const usedPacks = new Set([q.pack]);
    answers = Array.from({ length: pick }, (_, slot) => {
      const candidates = cards.filter(
        (c) =>
          !c.pick &&
          !usedPacks.has(c.pack) &&
          (slot === 0
            ? c.pack === (acidQuestion ? otherPack : "acido")
            : c.pack !== "acido"),
      );
      const a = choose(candidates);
      usedPacks.add(a.pack);
      return a;
    });
    key = [q.id, ...answers.map((a) => a.id)].join(";");
  } while (acidKeys.has(key));
  acidKeys.add(key);
  let slot = 0;
  acidSamples.push({
    id: `ACIDO-V4-${String(i + 1).padStart(3, "0")}`,
    pergunta: q.id,
    respostas: answers.map((a) => a.id),
    texto: q.text.replace(
      /________/g,
      () => `[${answers[slot++].text.replace(/[.!?]$/, "")}]`,
    ),
  });
}
writeFileSync(
  "docs/editorial/AMOSTRA-ACIDO-V4.json",
  await format(JSON.stringify(acidSamples), { parser: "json" }),
);
writeFileSync(
  "docs/editorial/AMOSTRA-ACIDO-V4.md",
  `# 120 cruzamentos com Humor Ácido e Tabus — V4\n\nSeed 0xac1d04; 60 perguntas ácidas com respostas de outros pacotes e 60 perguntas dos outros pacotes com ao menos uma resposta ácida. São 40 duplas, com cartas de três pacotes distintos, e 80 simples. Todas as respostas estão em ordem. Colchetes preservam os textos sem ajustes de apresentação.\n\n${acidSamples.map((s) => `- **${s.id}** ${s.texto} (${s.pergunta}; ${s.respostas.join(", ")})`).join("\n")}\n`,
);
console.log(
  `${acidSamples.length} cruzamentos adicionais com ácido gerados (seed 0xac1d04).`,
);
