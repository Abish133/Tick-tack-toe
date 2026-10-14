"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { GameButton, Modal } from "./ui";

export default function ScreenHeading({ title, description, aside }) {
  const [info, setInfo] = useState(false);
  return (
    <>
      <header className="screen-heading">
        <h1>{title}</h1>
        <div className="help-info">
          {aside}
          {description && (
            <GameButton
              variant="icon"
              aria-label={`About ${typeof title === "string" ? title : "this screen"}`}
              onClick={() => setInfo(true)}
            >
              <Info size={21} />
            </GameButton>
          )}
        </div>
      </header>
      <Modal open={info} title={title} onClose={() => setInfo(false)}>
        <p>{description}</p>
      </Modal>
    </>
  );
}
