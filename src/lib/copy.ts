/*
 * Central copy module — every user-facing string in the app lives here,
 * grouped per screen. Written in the project voice (confident and precise;
 * see docs/voice-and-tone.md): present tense, no exclamation marks, no blame.
 *
 * Tests import these constants instead of re-typing strings, so rewording
 * copy never breaks a text assertion. Interpolated strings are plain
 * functions. UI-only: this module must never enter the CLI bundle graph.
 *
 * Screen groups (welcome, dashboard, repoDetail, compare, portfolio,
 * settings, tour, commands, …) are added in the same PR that migrates the
 * screen's strings and tests.
 */

export const copy = {
  app: {
    name: "OpenReady",
    tagline: "Know which repositories are ready to show.",
    versionBadge: (version: string) => `v${version}`,
  },

  common: {
    loading: "Loading",
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    remove: "Remove",
    close: "Close",
    copy: "Copy",
    copied: "Copied",
    back: "Back",
    next: "Next",
    done: "Done",
    notAvailable: "—",
  },

  toasts: {
    exportSaved: "Export saved.",
    exportFailed: (reason: string) => `Export failed: ${reason}`,
    copied: "Copied to clipboard.",
    tokenSaved: "GitHub token stored in the system credential store.",
    tokenRemoved: "GitHub token removed.",
    aiKeySaved: "API key stored in the system credential store.",
    aiKeyRemoved: "API key removed.",
    aiKeyVerified: "Provider connection verified.",
    aiKeyVerifyFailed: (reason: string) => `Provider check failed: ${reason}`,
    cacheCleared: "Cached analyses cleared.",
  },
} as const;

export type Copy = typeof copy;
