import type { ReactNode } from "react";
import { Skull, ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import type { Card } from "../lib/types";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <a
      href={import.meta.env.BASE_URL}
      className={"logo " + (small ? "small" : "")}
      aria-label="DEU MERDA! Início"
    >
      <span className="logo-icon">
        <Skull size={small ? 22 : 28} strokeWidth={2.6} />
      </span>
      <span>
        DEU
        <br />
        <b>MERDA!</b>
      </span>
    </a>
  );
}
export function Button({
  children,
  onClick,
  disabled = false,
  variant = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={"btn " + variant}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function SoundButton({
  muted,
  toggle,
}: {
  muted: boolean;
  toggle: () => void;
}) {
  return (
    <button
      className="icon-btn"
      title={muted ? "Ativar sons" : "Silenciar"}
      aria-label={muted ? "Ativar sons" : "Silenciar"}
      onClick={toggle}
    >
      {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
    </button>
  );
}
export function CardTile({
  card,
  index,
  selected,
  onClick,
}: {
  card: Card;
  index?: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={!onClick}
      aria-pressed={onClick ? !!selected : undefined}
      onClick={onClick}
      className={"answer-card " + (selected ? "selected" : "")}
    >
      <span className="card-label">
        DEU MERDA! <span>↗</span>
      </span>
      <strong>{card.text}</strong>
      <span className="card-bottom">
        {selected ? (
          <b className="selection-number">{index}</b>
        ) : (
          <span>RESPOSTA</span>
        )}
        <Skull size={17} />
      </span>
    </button>
  );
}
export function Prompt({ card, round }: { card: Card; round?: number }) {
  return (
    <div className="prompt">
      <div className="eyebrow">
        <span>PERGUNTA DA RODADA {round}</span>
        <Skull size={21} />
      </div>
      <h2>
        {card.text.split("________").map((t, i) => (
          <span key={i}>
            {i > 0 && <span className="blank">________</span>}
            {t}
          </span>
        ))}
      </h2>
      <div className="prompt-footer">
        <span>
          ESCOLHA {card.pick === 2 ? "2 CARTAS · A ORDEM IMPORTA" : "1 CARTA"}
        </span>
        <ArrowUpRight size={22} />
      </div>
    </div>
  );
}
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${i * 3.7}%`,
            background: ["#efff55", "#9254ff", "#ff637a"][i % 3],
            animationDelay: `${(i % 7) * 0.12}s`,
            transform: `rotate(${i * 17}deg)`,
          }}
        />
      ))}
    </div>
  );
}
