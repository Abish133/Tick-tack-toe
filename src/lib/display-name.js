// Guest accounts are named "Spark <12 hex>"; show a short, readable tag instead.
export function displayName(name) {
  if (typeof name !== "string") return name;
  const guest = name.match(/^Spark ([0-9a-f]{12})$/);
  return guest ? `Spark #${guest[1].slice(0, 4).toUpperCase()}` : name;
}
