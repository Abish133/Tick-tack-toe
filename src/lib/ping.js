// One scale for every ping readout (header and battle badge).
export function pingQuality(ms, connected = true) {
  if (!connected) return "offline";
  if (!Number.isFinite(ms)) return "measuring";
  if (ms < 80) return "good";
  if (ms < 150) return "fair";
  if (ms < 250) return "slow";
  return "poor";
}

export const pingLabel = (ms, connected = true) =>
  !connected ? "Offline" : Number.isFinite(ms) ? `${ms} ms` : "-- ms";
