export type PackId =
  "quinta" | "brasil" | "escola" | "economia" | "memes" | "acido";
export interface Card {
  id: string;
  text: string;
  pack: PackId | "custom";
  pick: number;
  active?: boolean;
  theme?: string;
  tone?: "irreverente" | "nonsense" | "acido";
  grammar?: "nominal" | "nominal-slots";
}
export interface Player {
  id: string;
  name: string;
  emoji: string;
  score: number;
  hand: Card[];
  seen: number;
}
export interface Submission {
  id: string;
  player: string;
  cards: Card[];
}
export interface Reaction {
  id: string;
  text: string;
  at: number;
}
export type Phase = "lobby" | "answering" | "revealing" | "result" | "finished";
export interface Room {
  version: 1;
  code: string;
  host: string;
  players: Player[];
  phase: Phase;
  packs: PackId[];
  excludedThemes?: string[];
  target: number;
  mode: "classic" | "democracy";
  round: number;
  judge: string;
  prompt: Card | null;
  submissions: Submission[];
  votes: Record<string, string>;
  winner: string | null;
  deck: Card[];
  questions: Card[];
  custom: Card[];
  reactions: Reaction[];
}
export interface View extends Omit<Room, "deck" | "questions" | "submissions"> {
  submissions: Submission[];
  submitted: string[];
  voteCount: number;
  myVote: string | null;
}
export type Action = { type: string; [key: string]: unknown };
export const emojis = [
  "💀",
  "🤡",
  "🦆",
  "👽",
  "🐸",
  "🧻",
  "🔥",
  "🦖",
  "🪩",
  "🛸",
  "🍄",
  "🐀",
];
export const reactions = [
  "💀",
  "😂",
  "😭",
  "🤡",
  "🤯",
  "KKKKKKK!",
  "CARAI BORRACHA!",
  "NÃO TANKO!",
  "LÁ ELE!",
  "RECEBA!",
];
