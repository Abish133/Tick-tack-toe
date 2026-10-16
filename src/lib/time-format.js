// Short, human countdowns for game UI: "2d 14h", "18h 44m", "12m", "45s".
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000)),
    days = Math.floor(total / 86400),
    hours = Math.floor((total % 86400) / 3600),
    minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${total % 60}s`;
}

export function countdownTo(target, now = Date.now()) {
  return formatCountdown(new Date(target).getTime() - now);
}

// Next 00:00 UTC, used when the server did not send a reset time.
export function nextUtcMidnight(now = Date.now()) {
  return Math.floor(now / 86400000) * 86400000 + 86400000;
}
