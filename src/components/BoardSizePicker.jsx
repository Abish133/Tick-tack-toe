"use client";
import { useState } from "react";
import { Info, Layers3 } from "lucide-react";
import { Modal } from "./ui";
export default function BoardSizePicker({
  value = 3,
  onChange,
  disabled = false,
}) {
  const [info, setInfo] = useState(false);
  return (
    <section className="board-size-picker" aria-label="Choose board size">
      <div>
        <Layers3 size={17} />
        <span>CHOOSE YOUR BATTLEFIELD</span>
      </div>
      <div className="board-size-options">
        {[3, 4, 5, 6].map((size) => (
          <button
            type="button"
            key={size}
            aria-label={`${size} by ${size} board`}
            aria-pressed={value === size}
            disabled={disabled}
            onClick={() => onChange(size)}
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
      <div className="battlefield-info">
        <span>
          {value === 3
            ? "First line wins"
            : "Highest three-in-a-row score wins"}
        </span>
        <button aria-label="Board scoring rules" onClick={() => setInfo(true)}>
          <Info size={18} />
        </button>
      </div>
      <Modal
        open={info}
        title="Battlefield rules"
        onClose={() => setInfo(false)}
      >
        <p>
          {value === 3
            ? "The classic arena: complete a line of three to win."
            : "Every horizontal, vertical or diagonal run of three earns a point. Overlapping runs count. Highest score on the filled board wins; equal scores draw. Powers can change the lines on the board."}
        </p>
      </Modal>
    </section>
  );
}
