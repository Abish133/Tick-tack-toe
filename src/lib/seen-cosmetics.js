// "NEW" ribbons: remember which catalog items this browser has seen.
// The first visit seeds everything as seen so only later additions show NEW.
const KEY = "ea:seen-cosmetics";

export function readSeen() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function markSeen(ids) {
  try {
    const seen = readSeen() || new Set();
    ids.forEach((id) => seen.add(id));
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {}
}

export function newIds(ids) {
  const seen = readSeen();
  if (!seen) {
    markSeen(ids);
    return new Set();
  }
  return new Set(ids.filter((id) => !seen.has(id)));
}
