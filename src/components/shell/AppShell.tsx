import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { useNavigationStore } from "@/store/navigationStore";

export function AppShell() {
  useGlobalShortcuts();
  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 bg-canvas">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-[1200px] px-8 py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function useGlobalShortcuts() {
  const toggle = useNavigationStore((s) => s.toggleSidebar);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
}
