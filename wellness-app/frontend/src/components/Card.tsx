import type { ReactNode } from "react";
import clsx from "clsx";

export default function Card({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className={clsx("rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
