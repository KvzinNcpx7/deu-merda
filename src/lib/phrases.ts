import type { Card } from "./types";
export function completePhrase(
  question: string,
  answers: Pick<Card, "text">[],
) {
  let index = 0;
  return question.replace(
    /________/g,
    () => answers[index++]?.text.replace(/[.!?]$/, "") ?? "________",
  );
}
