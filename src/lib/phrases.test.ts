import { describe, expect, it } from "vitest";
import { completePhrase } from "./phrases";
describe("frase completa", () => {
  it("substitui lacunas em ordem e mantém conteúdo como texto", () => {
    expect(
      completePhrase("De ________ para ________.", [
        { text: "Um pato." },
        { text: "<script>alert(1)</script>" },
      ]),
    ).toBe("De um pato para <script>alert(1)</script>.");
    expect(completePhrase("Cadê ________?", [])).toBe("Cadê ________?");
  });
});

it("faz contrações apenas na borda da lacuna, sem alterar o texto da carta", () => {
  const card = { text: "O banheiro do ônibus." };
  expect(completePhrase("Por causa de ________.", [card])).toBe(
    "Por causa do banheiro do ônibus.",
  );
  expect(card.text).toBe("O banheiro do ônibus.");
  expect(completePhrase("Em ________.", [{ text: "A fila." }])).toBe(
    "Na fila.",
  );
  expect(
    completePhrase("Entregue a ________.", [{ text: "As capivaras." }]),
  ).toBe("Entregue às capivaras.");
  expect(
    completePhrase("Passou por ________.", [{ text: "Os fiscais." }]),
  ).toBe("Passou pelos fiscais.");
  expect(
    completePhrase("De ________ para ________.", [
      { text: "Uma carta." },
      { text: "A BOSTA3." },
    ]),
  ).toBe("De uma carta para a BOSTA3.");
  expect(completePhrase("________ apareceu.", [{ text: "Um pombo." }])).toBe(
    "Um pombo apareceu.",
  );
  expect(
    completePhrase("A frase: ________.", [{ text: "“A BOSTA3 caiu”." }]),
  ).toBe("A frase: “A BOSTA3 caiu”.");
});
