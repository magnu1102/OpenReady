import { copy } from "@/lib/copy";

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
  navigate: copy.commands.groups.navigate,
  repository: copy.commands.groups.repository,
  action: copy.commands.groups.action,
  view: copy.commands.groups.view,
};
