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

  shell: {
    skipLink: "Skip to main content",
    nav: {
      welcome: "Welcome",
      dashboard: "Dashboard",
      portfolio: "Portfolio",
      settings: "Settings",
    },
    sidebar: {
      collapse: "Collapse sidebar",
      expand: "Expand sidebar",
    },
    topBar: {
      welcome: "Welcome",
      dashboard: "Dashboard",
      repository: "Repository",
      compare: "Compare",
      portfolio: "Portfolio",
      settings: "Settings",
    },
  },

  welcome: {
    heading: "See which repositories are ready to show.",
    subheading:
      "OpenReady analyzes public GitHub repositories and turns metadata, README, build and presentation signals into transparent scores, per-repository recommendations and exportable reports. Every check is deterministic and runs against public data only.",
    form: {
      label: "GitHub username",
      hint: "Enter a public GitHub account. OpenReady fetches public repository metadata only.",
      placeholder: "octocat",
      submit: "Analyze",
      submitting: "Fetching",
      validationError: "Enter a GitHub username, not a URL or repository path.",
      keyboardHint: "An optional token in Settings raises the GitHub API limit.",
    },
    cache: {
      fresh: "Recent cache",
      stale: "Refresh suggested",
      summary: (count: number, fetchedAt: string) =>
        `${count} repositories saved locally. Last fetched ${fetchedAt}.`,
      open: "Open cached",
      refresh: "Refresh",
      fallbackDate: "recently",
    },
    principles: [
      {
        title: "Local-first",
        body: "Analysis runs on your machine. Repository contents stay where they belong.",
      },
      {
        title: "Deterministic",
        body: "Every score lists the checks behind it. Same repository, same result.",
      },
      {
        title: "Open source",
        body: "Free, inspectable, and built to the same standards it measures.",
      },
    ],
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

  tour: {
    controls: {
      progress: (current: number, total: number) => `Step ${current} of ${total}`,
      skip: "Skip tour",
      back: "Back",
      next: "Next",
      done: "Done",
    },
    steps: [
      {
        title: "Start with a GitHub username",
        body: "OpenReady runs deterministic checks on public repositories. Enter any GitHub username here to begin — results are cached locally.",
      },
      {
        title: "Read the dashboard at a glance",
        body: "Each card shows a health label, a project-type classification, and a score. Open a card to see the evidence behind every number.",
      },
      {
        title: "Export the analysis",
        body: "Save the current analysis as Markdown, JSON, or homepage cards. Exports stay local — nothing leaves your machine.",
      },
      {
        title: "Replay this tour anytime",
        body: "Replay the tour from Settings whenever you want, manage the local cache, and add an optional GitHub token for higher rate limits.",
      },
    ],
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
