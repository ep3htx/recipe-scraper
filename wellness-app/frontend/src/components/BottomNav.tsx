import { NavLink } from "react-router-dom";
import { Home, ClipboardList, UtensilsCrossed, Sparkles, TrendingUp } from "lucide-react";
import clsx from "clsx";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/log", label: "Log", icon: ClipboardList },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/coach", label: "Coach", icon: Sparkles },
  { to: "/progress", label: "Progress", icon: TrendingUp },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur safe-bottom md:hidden dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
