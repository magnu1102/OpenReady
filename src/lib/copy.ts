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

  dashboard: {
    title: "Dashboard",
    subtitle: (username: string) =>
      `Public repositories for ${username}. Every check runs locally and deterministically.`,
    subtitleNoUser: "Enter a GitHub username to fetch public repositories.",
    cacheStale: "Cached snapshot is older than 24 hours.",
    cacheFresh: "Loaded locally.",
    cacheFetched: (date: string) => `Last fetched ${date}.`,
    refresh: "Refresh",
    stats: {
      repositories: {
        label: "Repositories",
        hint: "Public repositories fetched from GitHub.",
        sub: "Fetched public metadata",
      },
      portfolioReady: {
        label: "Portfolio-ready",
        hint: "Repositories scoring at least 85 across the eight categories.",
        sub: "From category scores",
      },
      needsWork: {
        label: "Needs work",
        hint: "Repositories in the Needs work or Experimental tiers.",
        sub: "From category scores",
      },
      hiddenGems: {
        label: "Hidden gems",
        hint: "Repositories scoring at least 70 with few stars and missing discoverability signals — strong work that deserves more visibility.",
        sub: "From category scores",
      },
      avgScore: {
        label: "Avg score",
        hint: "Mean total score across repositories with at least one resolved category.",
        sub: "From category scores",
      },
    },
    repoSection: {
      heading: "Repositories",
      count: (n: number) => `${n} fetched`,
      pending: "Public fetch",
      loading: "Loading repositories",
    },
    errors: {
      notFound: "GitHub user not found",
      rateLimit: "GitHub rate limit reached",
      network: "Network connection failed",
      generic: "Repository fetch failed",
      changeUsername: "Change username",
      tryAgain: "Try again",
    },
    empty: {
      noReposTitle: "No public repositories found",
      noReposBody: "GitHub found that user, but there are no public repositories to show.",
      noReposAction: "Analyze another username",
      idleTitle: "No analysis yet",
      idleBody:
        "Start with a public GitHub username. OpenReady fetches repository metadata and keeps it on this machine.",
      idleAction: "Back to Welcome",
    },
    card: {
      noDescription: "No repository description provided.",
      scoreLabel: "Score",
      scorePending: "Score pending",
      scoreSummary: (score: number, label: string) => `Score ${score} · ${label}`,
      noGaps: "No critical gaps detected.",
      updated: (date: string) => `Updated ${date}`,
      github: "GitHub",
      homepage: "Homepage",
      hiddenGem: "Hidden gem",
      fork: "Fork",
      archived: "Archived",
      compare: "Compare",
      compareSelected: "Selected",
      compareLimit: (max: number) => `Compare up to ${max} repositories at once`,
    },
    compareBar: {
      selected: (n: number) => `${n} selected to compare`,
      compare: "Compare",
      clear: "Clear",
    },
    exportPanel: {
      heading: "Exports",
      description:
        "Save the current analysis as a report, a machine-readable summary, or homepage project cards.",
      preparing: "Preparing export...",
      markdown: "Markdown",
      json: "JSON",
      homepageCards: "Homepage cards",
      exportError: "OpenReady could not save the export. Choose a writable location and retry.",
    },
  },

  compare: {
    title: "Compare repositories",
    subtitle: "Side-by-side scores, classification, and gaps for up to three repositories.",
    backToDashboard: "Back to dashboard",
    clearSelection: "Clear selection",
    empty: {
      title: "Select at least two repositories",
      description:
        "Use the Compare toggle on repository cards in the dashboard to add up to three repositories here.",
      action: "Go to dashboard",
    },
    column: {
      remove: (name: string) => `Remove ${name} from comparison`,
      scoreLabel: "Score",
      topGaps: "Top gaps",
      noGaps: "No critical gaps detected.",
      hiddenGem: "Hidden gem",
      weight: (value: number) => `x${value}`,
    },
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
