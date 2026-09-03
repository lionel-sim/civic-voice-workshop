export function maskIdentifier(identifier) {
  const value = String(identifier ?? "");
  if (value.length <= 3) return "•".repeat(value.length);

  return `${value.slice(0, 1)}${"•".repeat(value.length - 3)}${value.slice(-2)}`;
}
