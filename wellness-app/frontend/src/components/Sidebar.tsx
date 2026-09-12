import { NavLink } from "react-router-dom";
import { Home, ClipboardList, UtensilsCrossed, Sparkles, TrendingUp, Dumbbell, Settings, Heart } from "lucide-react";
import clsx from "clsx";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/log", label: "Log", icon: ClipboardList },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/coach", label: "Coach", icon: Sparkles },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/programs", label: "Programs", icon: Dumbbell },
];

// Desktop-only nav — wide dashboard shell uses a persistent left sidebar
// instead of the mobile bottom nav (see AppLayout). Programs and Settings
// live here only; on mobile they're reachable from within Log and the
// header gear icon respectively, keeping the bottom nav at its 5 primary tabs.
export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-gray-200 bg-white md:flex dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Heart size={18} />
        </span>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-50">Wellness</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-3 dark:border-gray-800">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
            )
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
