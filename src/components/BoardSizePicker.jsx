"use client";
import { useState } from "react";
import { ChevronDown, Layers3 } from "lucide-react";

const RULES = {
  first: "First line wins",
  scored: "Highest three-in-a-row score wins",
};
const DETAIL = {
  first: "The classic arena: complete a line of three to win.",
  scored:
    "Every horizontal, vertical or diagonal run of three earns a point. Overlapping runs count. Highest score on the filled board wins; equal scores draw.",
};

// `compact` shows the current choice as a chip that expands into the options.
export default function BoardSizePicker({
  value = 3,
  onChange,
  disabled = false,
  compact = false,
}) {
  const [open, setOpen] = useState(!compact);
  const kind = value === 3 ? "first" : "scored";
  return (
    <section
      className={`board-size-picker ${compact ? "compact" : ""}`}
      aria-label="Choose board size"
    >
      {compact ? (
        <button
          type="button"
          className="board-size-chip"
          aria-expanded={open}
          aria-label={`Battlefield ${value} by ${value}. Change board size`}
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
        >
          <Layers3 size={16} />
          <span>BATTLEFIELD</span>
          <strong>
            {value} × {value}
          </strong>
          <ChevronDown size={16} />
        </button>
      ) : (
        <div>
          <Layers3 size={17} />
          <span>CHOOSE YOUR BATTLEFIELD</span>
        </div>
      )}
      {open && (
        <div className="board-size-options">
          {[3, 4, 5, 6].map((size) => (
            <button
              type="button"
              key={size}
              aria-label={`${size} by ${size} board`}
              aria-pressed={value === size}
              disabled={disabled}
              onClick={() => {
                onChange(size);
                if (compact) setOpen(false);
              }}
              className={value === size ? "selected" : ""}
            >
              <i
                className="board-mini"
                style={{ "--mini-size": size }}
                aria-hidden="true"
              >
                {Array.from({ length: size * size }, (_, index) => (
                  <i key={index} />
                ))}
              </i>
              <span>
                {size} × {size}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="battlefield-info" title={DETAIL[kind]}>
        {RULES[kind]}
      </p>
    </section>
  );
}
