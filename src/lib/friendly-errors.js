// Turn server error codes into short player-facing copy. Unknown codes keep the server text.
export function friendlyError(url = "", code, message) {
  const path = String(url).split("?")[0];
  if (code === "CONFLICT" && /already processed|already exists/i.test(message || "")) {
    if (path === "/rewards/daily") return "Already claimed — come back tomorrow!";
    if (/\/(missions|season-pass)\/claim$/.test(path)) return "Already claimed — nice work!";
    if (path === "/purchases") return "You already own this style.";
    return "Already done — no need to do that twice.";
  }
  if (code === "CONFLICT") return "Something changed just now. Please try again.";
  if (code === "RATE_LIMITED") return "Easy, challenger — try again in a moment.";
  if (code === "NOT_FOUND") return "That isn't available any more.";
  return message;
}
