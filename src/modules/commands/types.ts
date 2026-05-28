export type CommandGroup = "navigate" | "repository" | "action" | "view";

export interface CommandShortcut {
  /** Lower-case key, e.g. "k", "/", ",". */
  key: string;
  /** Cmd on macOS, Ctrl elsewhere. */
  meta?: boolean;
  shift?: boolean;
}

export interface Command {
  id: string;
  label: string;
  hint?: string;
  group: CommandGroup;
  shortcut?: CommandShortcut;
  run: () => void | Promise<void>;
}

export const COMMAND_GROUP_LABELS: Record<CommandGroup, string> = {
  navigate: "Navigation",
  repository: "Repositories",
  action: "Actions",
  view: "View",
};
