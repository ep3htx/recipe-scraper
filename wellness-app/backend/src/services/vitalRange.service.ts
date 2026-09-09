// Neutral range-checking only — never a diagnosis. See AI safety layer for
// the same principle applied to the coach's language.

export interface RangeFlag {
  field: string;
  value: number;
  min: number | null;
  max: number | null;
  outOfRange: boolean;
}

export function flagRange(field: string, value: number | null | undefined, min?: number | null, max?: number | null): RangeFlag | null {
  if (value == null) return null;
  const outOfRange = (min != null && value < min) || (max != null && value > max);
  return { field, value, min: min ?? null, max: max ?? null, outOfRange };
}
