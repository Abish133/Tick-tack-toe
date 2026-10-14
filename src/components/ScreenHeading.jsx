"use client";
import { useState, Children, cloneElement, isValidElement } from "react";
import { Info } from "lucide-react";
import { GameButton, Modal } from "./ui";

export default function ScreenHeading({
  title,
  displayTitle,
  description,
  aside,
}) {
  const [info, setInfo] = useState(false);
  const action = isValidElement(aside)
    ? cloneElement(
        aside,
        {
          className: `${aside.props.className || ""} screen-action`,
          title:
            typeof aside.props.children === "string"
              ? aside.props.children
              : undefined,
        },
        <>
          <span className="screen-action-copy">{aside.props.children}</span>
          <span className="screen-action-glyph" aria-hidden="true">
            {Children.toArray(aside.props.children).find(isValidElement)}
          </span>
        </>,
      )
    : aside;
  return (
    <>
      <header className="screen-heading">
        <h1 aria-label={typeof title === "string" ? title : undefined}>
          {displayTitle || title}
        </h1>
        <div className="help-info">
          {action}
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
