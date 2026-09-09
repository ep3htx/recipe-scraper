const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Minimal duration-string parser ("15m", "30d", "1h") — avoids pulling in
// the `ms` package for a single conversion used by token expiry math.
export default function ms(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}"`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
