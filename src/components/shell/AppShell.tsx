import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useRepositoryStore } from "@/store/repositoryStore";
import { useNavigationStore } from "@/store/navigationStore";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { routeVariants } from "@/lib/motion";
import { copy } from "@/lib/copy";
import { TourOverlay, tourSteps, useTourStore } from "@/modules/tour";
import { CommandsRoot } from "@/modules/commands";

export function AppShell() {
  useTourAutoStart();
  useResponsiveSidebar();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (typeof main.scrollTo === "function") {
      main.scrollTo({ top: 0, left: 0 });
      return;
    }
    main.scrollTop = 0;
    main.scrollLeft = 0;
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <a href="#main" className="skip-link">
          {copy.shell.skipLink}
        </a>
        <div className="flex h-full min-h-0 gap-3 p-3">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <TopBar />
            <main
              ref={mainRef}
              id="main"
              tabIndex={-1}
              className="scrollbar-thin min-h-0 flex-1 overflow-y-auto focus-visible:outline-none"
            >
              {/* Entrance-only: exit animations would double-mount routes and
                  break the focus traps and skip-link target. */}
              <motion.div
                key={pathname}
                variants={routeVariants}
                initial="hidden"
                animate="visible"
                className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6"
              >
                <Outlet />
              </motion.div>
            </main>
          </div>
        </div>
        <TourOverlay />
        <CommandsRoot />
        <ToastViewport />
      </TooltipProvider>
    </MotionConfig>
  );
}

// Below this width the full 240px sidebar squeezes content until it clips, so
// collapse it to the 64px icon rail. The user can still expand it manually.
function useResponsiveSidebar() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const setSidebarCollapsed = useNavigationStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    if (isNarrow) setSidebarCollapsed(true);
  }, [isNarrow, setSidebarCollapsed]);
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
