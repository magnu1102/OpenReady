import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Settings as SettingsIcon,
  Briefcase,
  PanelLeft,
} from "lucide-react";
import { useNavigationStore } from "@/store/navigationStore";
import { APP_NAME, APP_VERSION } from "@/lib/env";
import { copy } from "@/lib/copy";
import { Logo } from "./Logo";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", label: copy.shell.nav.welcome, icon: Sparkles, end: true },
  { to: "/dashboard", label: copy.shell.nav.dashboard, icon: LayoutDashboard, end: false },
  { to: "/portfolio", label: copy.shell.nav.portfolio, icon: Briefcase, end: false },
  { to: "/settings", label: copy.shell.nav.settings, icon: SettingsIcon, end: false },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useNavigationStore();
  const w = sidebarCollapsed ? "w-[64px]" : "w-[240px]";

  return (
    <aside
      className={cn(
        "glass-panel flex shrink-0 flex-col rounded-xl transition-[width] duration-soft ease-soft",
        w,
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-glass-border px-3",
          sidebarCollapsed ? "justify-center" : "justify-between",
        )}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Logo />
          {!sidebarCollapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-semibold text-text-primary">{APP_NAME}</span>
              <span className="truncate font-mono text-[10px] text-text-muted">
                {copy.app.versionBadge(APP_VERSION)}
              </span>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <Tooltip content={copy.shell.sidebar.collapse}>
            <button
              onClick={toggleSidebar}
              aria-label={copy.shell.sidebar.collapse}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-subtle hover:text-text-primary"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>

      <nav aria-label="Primary" className="scrollbar-thin flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium",
                    "text-text-secondary transition-colors duration-micro ease-soft",
                    "hover:bg-subtle hover:text-text-primary",
                    isActive &&
                      "bg-accent-subtle text-text-primary before:absolute before:-left-2 before:top-1.5 before:h-6 before:w-0.5 before:rounded-full before:bg-accent",
                    sidebarCollapsed && "justify-center",
                  )
                }
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {sidebarCollapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {sidebarCollapsed && (
        <div className="flex justify-center border-t border-glass-border p-2">
          <Tooltip content={copy.shell.sidebar.expand} side="right">
            <button
              onClick={toggleSidebar}
              aria-label={copy.shell.sidebar.expand}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-subtle hover:text-text-primary"
            >
              <PanelLeft className="h-4 w-4 rotate-180" />
            </button>
          </Tooltip>
        </div>
      )}
    </aside>
  );
}
