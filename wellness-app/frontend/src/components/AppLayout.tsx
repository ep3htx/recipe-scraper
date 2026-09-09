import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 dark:bg-gray-950">
      <main className="page-scroll safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
