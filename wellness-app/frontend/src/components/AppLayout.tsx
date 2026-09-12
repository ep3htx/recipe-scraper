import { Outlet, Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 dark:bg-gray-950">
      <main className="page-scroll safe-top">
        <Outlet />
      </main>
      <SettingsLink />
      <BottomNav />
    </div>
  );
}

// Fixed top-right gear icon, present on every tab — the bottom nav is
// deliberately just the 5 primary sections, so Settings/Goals lives here
// instead of taking a 6th slot.
function SettingsLink() {
  const location = useLocation();
  if (location.pathname === "/settings") return null;
  return (
    <Link
      to="/settings"
      className="safe-top fixed right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur dark:bg-gray-900/90 dark:text-gray-300"
      aria-label="Settings"
    >
      <Settings size={18} />
    </Link>
  );
}
