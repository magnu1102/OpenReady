import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { useRepositoryStore } from "@/store/repositoryStore";
import { TourOverlay, tourSteps, useTourStore } from "@/modules/tour";
import { CommandsRoot } from "@/modules/commands";

export function AppShell() {
  useTourAutoStart();
  return (
    <TooltipProvider>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div className="flex h-full min-h-0 bg-canvas">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            id="main"
            tabIndex={-1}
            className="scrollbar-thin flex-1 overflow-y-auto focus-visible:outline-none"
          >
            <div className="mx-auto w-full max-w-[1200px] px-8 py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <TourOverlay />
      <CommandsRoot />
    </TooltipProvider>
  );
}

function useTourAutoStart() {
  const seen = useTourStore((s) => s.seen);
  const activeStep = useTourStore((s) => s.activeStep);
  const startAt = useTourStore((s) => s.startAt);
  const status = useRepositoryStore((s) => s.status);
  const repositoryCount = useRepositoryStore((s) => s.repositories.length);
  const location = useLocation();

  useEffect(() => {
    if (seen) return;
    if (activeStep !== null) return;
    if (location.pathname !== "/dashboard") return;
    if (status !== "success" || repositoryCount === 0) return;
    // Auto-start at the first step anchored on the current route so we don't
    // bounce the user back to the welcome screen.
    const stepIndex = tourSteps.findIndex((step) => step.route === location.pathname);
    if (stepIndex < 0) return;
    startAt(stepIndex);
  }, [seen, activeStep, status, repositoryCount, location.pathname, startAt]);
}
