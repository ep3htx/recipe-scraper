import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import clsx from "clsx";

// `goodDirection` says which direction counts as "good" for this metric
// (e.g. down is good for weight, up is good for steps) so the color always
// communicates progress, not just raw sign.
export default function TrendArrow({ value, goodDirection = "down", suffix = "" }: { value: number | null | undefined; goodDirection?: "up" | "down"; suffix?: string }) {
  if (value == null || Number.isNaN(value) || Math.abs(value) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-400">
        <ArrowRight size={14} /> steady
      </span>
    );
  }
  const isUp = value > 0;
  const isGood = isUp ? goodDirection === "up" : goodDirection === "down";
  return (
    <span className={clsx("inline-flex items-center gap-0.5 text-xs font-medium", isGood ? "text-brand-600 dark:text-brand-400" : "text-rose-500")}>
      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}
