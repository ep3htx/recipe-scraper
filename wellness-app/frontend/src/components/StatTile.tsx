import type { ReactNode } from "react";

export default function StatTile({
  icon,
  label,
  value,
  unit,
  progress,
}: {
  icon?: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  progress?: { current: number; target: number };
}) {
  const pct = progress && progress.target > 0 ? Math.max(0, Math.min(100, (progress.current / progress.target) * 100)) : null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-xl font-bold text-gray-900 dark:text-gray-50">{value}</span>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
      {pct != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
