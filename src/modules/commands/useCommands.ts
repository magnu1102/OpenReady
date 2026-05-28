import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRepositoryStore } from "@/store/repositoryStore";
import { useThemeStore } from "@/store/themeStore";
import { useTourStore } from "@/modules/tour";
import { useNavigationStore } from "@/store/navigationStore";
import type { Command } from "./types";

export interface CommandOptions {
  openPalette: () => void;
  closePalette: () => void;
  openShortcuts: () => void;
}

/**
 * Builds the live command list. Static + dynamic (per-repo) commands compose into
 * a single array that both the palette and the shortcut sheet read from.
 */
export function useCommands(options: CommandOptions): Command[] {
  const navigate = useNavigate();
  const repositories = useRepositoryStore((s) => s.repositories);
  const username = useRepositoryStore((s) => s.username);
  const fetchRepositories = useRepositoryStore((s) => s.fetchRepositories);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const restartTour = useTourStore((s) => s.restart);
  const toggleSidebar = useNavigationStore((s) => s.toggleSidebar);

  return useMemo<Command[]>(() => {
    const navigateCommands: Command[] = [
      {
        id: "nav:welcome",
        label: "Go to Welcome",
        hint: "Return to the start screen",
        group: "navigate",
        run: () => navigate("/"),
      },
      {
        id: "nav:dashboard",
        label: "Go to Dashboard",
        hint: "Repository portfolio overview",
        group: "navigate",
        run: () => navigate("/dashboard"),
      },
      {
        id: "nav:settings",
        label: "Open Settings",
        hint: "Appearance, tour, GitHub token, cache",
        group: "navigate",
        shortcut: { key: ",", meta: true },
        run: () => navigate("/settings"),
      },
    ];

    const viewCommands: Command[] = [
      {
        id: "view:toggle-sidebar",
        label: "Toggle sidebar",
        group: "view",
        shortcut: { key: "b", meta: true },
        run: () => toggleSidebar(),
      },
      {
        id: "view:cycle-theme",
        label: `Switch theme (current: ${themeMode})`,
        group: "view",
        run: () => {
          const next = themeMode === "light" ? "dark" : themeMode === "dark" ? "system" : "light";
          setThemeMode(next);
        },
      },
      {
        id: "view:palette",
        label: "Open command palette",
        group: "view",
        shortcut: { key: "k", meta: true },
        run: () => options.openPalette(),
      },
      {
        id: "view:shortcuts",
        label: "Show keyboard shortcuts",
        group: "view",
        shortcut: { key: "/", meta: true },
        run: () => options.openShortcuts(),
      },
    ];

    const actionCommands: Command[] = [
      {
        id: "action:replay-tour",
        label: "Replay product tour",
        hint: "Restart the four-step walkthrough",
        group: "action",
        run: () => {
          restartTour();
          navigate("/dashboard");
        },
      },
    ];
    if (username) {
      actionCommands.push({
        id: "action:refresh",
        label: `Refresh analysis for ${username}`,
        hint: "Re-fetch repositories from GitHub",
        group: "action",
        run: async () => {
          try {
            await fetchRepositories(username, { forceRefresh: true });
          } catch {
            // Surface via the dashboard error state.
          }
          navigate("/dashboard");
        },
      });
    }

    const repositoryCommands: Command[] = repositories.slice(0, 50).map((repository) => ({
      id: `repo:${repository.id}`,
      label: `Open repo: ${repository.name}`,
      hint: repository.fullName,
      group: "repository",
      run: () => navigate(`/dashboard/repo/${encodeURIComponent(repository.id)}`),
    }));

    return [...navigateCommands, ...viewCommands, ...actionCommands, ...repositoryCommands];
  }, [
    navigate,
    repositories,
    username,
    fetchRepositories,
    themeMode,
    setThemeMode,
    restartTour,
    toggleSidebar,
    options,
  ]);
}

export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((command) => {
    const haystack = `${command.label} ${command.hint ?? ""}`.toLowerCase();
    return q.split(/\s+/).every((token) => haystack.includes(token));
  });
}
