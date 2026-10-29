import { describe, expect, it } from "vitest";
import { completePhrase } from "./phrases";
describe("frase completa", () => {
  it("substitui lacunas em ordem e mantém conteúdo como texto", () => {
    expect(
      completePhrase("De ________ para ________.", [
        { text: "Um pato." },
        { text: "<script>alert(1)</script>" },
      ]),
    ).toBe("De Um pato para <script>alert(1)</script>.");
    expect(completePhrase("Cadê ________?", [])).toBe("Cadê ________?");
  });
});
