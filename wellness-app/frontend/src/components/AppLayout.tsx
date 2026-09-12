import { Outlet, Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

// Wide dashboard shell on desktop (fixed sidebar + a wide content area for
// grids of panels/boards), the original single-column bottom-nav app on
// mobile — same routes and pages serve both, they just lay out differently
// past the md breakpoint.
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="md:pl-60">
        <main className="page-scroll safe-top mx-auto w-full max-w-lg md:max-w-none md:px-8 md:py-6">
          <Outlet />
        </main>
      </div>
      <SettingsLink />
      <BottomNav />
    </div>
  );
}

// Mobile-only gear icon — the desktop sidebar already has a Settings entry.
function SettingsLink() {
  const location = useLocation();
  if (location.pathname === "/settings") return null;
  return (
    <Link
      to="/settings"
      className="safe-top fixed right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur md:hidden dark:bg-gray-900/90 dark:text-gray-300"
      aria-label="Settings"
    >
      <Settings size={18} />
    </Link>
  );
}
