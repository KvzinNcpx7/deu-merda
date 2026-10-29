import type { Card } from "./types";
// Presentation only: stored cards and server state keep their original wording.
const contractions: Record<string, Record<string, string>> = {
  de: { o: "do", a: "da", os: "dos", as: "das" },
  em: { o: "no", a: "na", os: "nos", as: "nas" },
  a: { o: "ao", a: "à", os: "aos", as: "às" },
  por: { o: "pelo", a: "pela", os: "pelos", as: "pelas" },
};
export function completePhrase(
  question: string,
  answers: Pick<Card, "text">[],
) {
  const pieces = question.split("________");
  let text = pieces[0];
  for (let index = 0; index < pieces.length - 1; index++) {
    let answer = answers[index]?.text.replace(/[.!?]$/, "");
    if (!answer) {
      text += "________" + pieces[index + 1];
      continue;
    }
    const article = answer.match(/^(o|a|os|as|um|uma|uns|umas)\s/i);
    const preposition = text.match(/(^|\s)(de|em|a|por)\s$/i);
    const contracted =
      article &&
      preposition &&
      contractions[preposition[2].toLowerCase()]?.[article[1].toLowerCase()];
    if (contracted && preposition) {
      const word =
        preposition[2][0] === preposition[2][0].toUpperCase()
          ? contracted[0].toUpperCase() + contracted.slice(1)
          : contracted;
      text = text.slice(0, -preposition[2].length - 1);
      answer = word + " " + answer.slice(article![0].length);
    } else if (article && text.trim() && !/[.!?]\s*$/.test(text)) {
      answer = answer[0].toLocaleLowerCase("pt-BR") + answer.slice(1);
    }
    text += answer + pieces[index + 1];
  }
  return text;
}
