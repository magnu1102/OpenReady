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

  repoDetail: {
    backToDashboard: "Back to Dashboard",
    noDescription: "No repository description provided.",
    github: "GitHub",
    fork: "Fork",
    archived: "Archived",
    scoreLabel: "Score",
    scoreCaption:
      "Weighted mean of eight category scores, adjusted by project type and your settings.",
    unavailable: {
      title: "Repository details unavailable",
      description:
        "Repository details live in memory. Fetch a GitHub username again to reopen this view.",
      action: "Analyze a username",
    },
    tabs: {
      overview: {
        label: "Overview",
        title: "Overview",
        body: "Summary, score breakdown and headline signals. Populated once analysis runs.",
      },
      documentation: {
        label: "Documentation",
        title: "Documentation checks",
        body: "README presence, section coverage and dedicated docs-folder detection.",
      },
      build: {
        label: "Build & Tests",
        title: "Build and tests",
        body: "Package manifests, lockfiles, Docker, CI workflows, test directories and infrastructure-as-code signals from the repository file tree.",
      },
      security: {
        label: "Security",
        title: "Security hygiene",
        body: "SECURITY.md and example environment-file checks from the repository file tree.",
      },
      presentation: {
        label: "Presentation",
        title: "Presentation checks",
        body: "Screenshots, demo links, badges and architecture diagrams: the signals that help a reader grasp a project quickly.",
      },
      recommendations: {
        label: "Recommendations",
        title: "Suggested improvements",
        body: "Prioritized next steps generated from failed deterministic checks.",
      },
    },
    overview: {
      signalsTitle: "Repository signals",
      signalsDescription: "Metadata, activity and repository status checks.",
      projectSummaryTitle: "Project summary",
      projectSummaryDescription:
        "Sends this repository's description, topics and detected signals to your provider to draft a short plain-English summary.",
      projectSummaryGenerate: "Draft summary",
    },
    documentation: {
      checksDescription:
        "README presence and section checks for the first 30 fetched repositories.",
      critiqueTitle: "README critique",
      critiqueDescription:
        "Sends the README text and the gaps OpenReady already detected to your provider for prioritized, constructive suggestions.",
      critiqueGenerate: "Critique README",
    },
    build: {
      title: "Build, CI and infrastructure",
      description:
        "Detected from the recursive repository file tree. Package manifests, lockfiles, Docker, GitHub Actions, tests, docs and infrastructure-as-code.",
    },
    security: {
      title: "Security hygiene",
      description: "Lightweight public-repository hygiene checks detected from committed files.",
    },
    presentation: {
      title: "Presentation checks",
      description: "README screenshot and demo signals.",
    },
    recommendations: {
      unavailableTitle: "Recommendations unavailable",
      unavailableDescription: "Run analysis again to generate improvement suggestions.",
      emptyTitle: "No major gaps detected",
      emptyDescription:
        "OpenReady did not find major missing signals for this repository. Keep the evidence fresh as the project changes.",
      high: "High priority",
      medium: "Medium priority",
      low: "Low priority",
      scoreImpactTitle: "Projected increase to the total score if resolved",
      scoreImpact: (points: number) => `+${points} pts`,
    },
    checks: {
      unavailableTitle: "Checks unavailable",
      unavailableDescription: "Run analysis again.",
      emptyTitle: "No checks in this section",
      emptyDescription:
        "This repository does not have any applicable checks for the selected section.",
    },
    techStack: {
      title: "Detected stack",
      truncated:
        "Detected from a partial file tree. GitHub truncated the response for this large repository.",
      detected: "Detected from filenames in the recursive Git tree.",
      loading: "Fetching the repository file tree. Detection appears here once it completes.",
      unavailable:
        "File-tree detection is unavailable for this repository. OpenReady checks the first 30 fetched repositories to stay within GitHub rate limits.",
      empty: "Repository is empty; nothing to detect.",
      none: "No recognised manifests, CI, container, infra or test signals were found in this tree.",
    },
    summary: {
      heading: "Score breakdown",
      onlyCategory: (label: string, score: number) =>
        `${label} is the only category with applicable checks (${score}/100).`,
      strongestWeakest: (
        strongest: string,
        strongestScore: number,
        weakest: string,
        weakestScore: number,
      ) => `Strongest: ${strongest} (${strongestScore}). Weakest: ${weakest} (${weakestScore}).`,
      inProgress: "Analysis is still in progress; scores appear as data resolves.",
      categoryValue: (score: number, passed: number, applicable: number) =>
        `${score} · ${passed}/${applicable}`,
      notApplicable: "N/A",
      weight: (value: number) => `x${value}`,
    },
    classification: {
      overridden: "overridden",
      confidence: (confidence: string) => `${confidence} confidence`,
      label: "Project type",
      autoDetect: (label: string) => `Auto-detect (${label})`,
    },
  },

  portfolio: {
    title: "Portfolio",
    subtitle: (owner: string) =>
      `A role-targeted view of ${owner} strongest work, with CV bullets and interview prep generated from the analysis.`,
    fallbackOwner: "your",
    empty: {
      title: "No analysis to build a portfolio from",
      description:
        "Analyze a GitHub username first. Portfolio mode turns those results into a role-targeted highlight reel, CV bullets, and interview prep.",
      action: "Go to dashboard",
    },
    role: {
      label: "Target role",
      auto: "Auto",
      autoDetected: (role: string) => `Auto-detected: ${role}`,
    },
    featured: {
      heading: "Featured projects",
      empty:
        "No repositories match this role yet. Pin repositories below or pick a different role.",
      pinned: "Pinned",
      auto: "Auto",
    },
    cv: {
      heading: "CV bullet points",
      empty: "Feature a repository to generate CV bullets.",
      aiTitle: "Refine wording",
      aiDescription:
        "Sends these deterministic bullets to your provider for a tighter rewrite. The bullets above stay as the source of truth.",
      aiGenerate: "Refine",
    },
    talking: {
      heading: "Interview talking points",
      highlights: "Highlights",
      questions: "Likely questions",
      gaps: "Gaps to own",
      noGaps: "No major gaps detected.",
    },
    exports: {
      heading: "Exports",
      description: (role: string) =>
        `Save the ${role} portfolio, CV bullets, or interview prep as Markdown.`,
      portfolio: "Portfolio",
      cv: "CV bullets",
      talkingPoints: "Talking points",
      error: "OpenReady could not save the export. Choose a writable location and retry.",
    },
  },

  settings: {
    title: "Settings",
    subtitle: "Configure how OpenReady looks and behaves.",
    statuses: {
      available: "Available",
      completed: "Completed",
      configured: "Configured",
      optional: "Optional",
      empty: "Empty",
      saved: (count: number) => `${count} saved`,
      customized: "Customized",
      default: "Default",
      keyNeeded: "Key needed",
      off: "Off",
      enabled: "Enabled",
    },
    appearance: {
      title: "Appearance",
      themeLabel: "Theme",
      themeHint: "Switch between light, dark, and matching your system.",
    },
    onboarding: {
      title: "Onboarding",
      productTourLabel: "Product tour",
      productTourHint:
        "A four-step walkthrough covering the welcome screen, dashboard, exports, and settings.",
      replay: "Replay tour",
    },
    github: {
      title: "GitHub",
      tokenLabel: "Personal access token",
      tokenHint:
        "Optional token raises GitHub API rate limits. It is stored in the operating system credential store, not browser local storage.",
      tokenPlaceholder: "ghp_... or github_pat_...",
      save: "Save token",
      remove: "Remove token",
      configured: "A token is configured in the operating system credential store.",
      notConfigured: "No token is configured.",
      unavailable: "Token storage is available in the desktop app.",
      validating: "Validating token with GitHub...",
      fallbackError: "OpenReady could not update GitHub token settings.",
    },
    cache: {
      title: "Cache",
      label: "Local analysis cache",
      hint: "Recent analysis snapshots are cached locally to avoid re-fetching repositories on every open.",
      clear: "Clear cache",
    },
    weights: {
      title: "Scoring weights",
      heading: "Tune how much each category counts",
      description: (defaultWeight: number | string, minWeight: number | string) =>
        `These multipliers layer on top of the project-type weights, so a CLI is still judged like a CLI. Changes re-score every repository immediately and persist locally. Leave a category at ${defaultWeight}x to keep its default weight; set it to ${minWeight}x to ignore it.`,
      reset: "Reset to defaults",
      value: (value: number | string) => `${value}x`,
    },
    ai: {
      title: "AI features",
      label: "AI-assisted suggestions",
      hint: "OpenReady is deterministic by design. AI suggestions are opt-in, bring-your-own-key, and never replace the core checks. When enabled, you trigger each suggestion manually.",
      switchLabel: "Enable AI features",
      baseUrlLabel: "Provider base URL",
      baseUrlHint:
        "Any OpenAI-compatible endpoint: OpenAI, Groq, OpenRouter, or a local model such as Ollama.",
      baseUrlPlaceholder: "https://api.openai.com/v1",
      modelLabel: "Model",
      modelHint: "The model name to request, e.g. gpt-4o-mini or llama3.",
      modelPlaceholder: "gpt-4o-mini",
      keyLabel: "API key",
      keyHint:
        "Stored in the operating system credential store, never in browser storage and never sent anywhere except your chosen provider. Optional for keyless local models.",
      keyPlaceholder: "sk-...",
      storedFallback: "Key stored",
      storedBadge: "Stored",
      verify: "Verify",
      delete: "Delete key",
      save: "Save key",
      configured: "An API key is stored in the operating system credential store.",
      notConfigured: "No API key is configured.",
      unavailable: "AI features are available in the desktop app.",
      saving: "Saving API key...",
      verifying: "Verifying with the provider...",
      disclosure:
        "When you generate a suggestion, OpenReady sends the relevant repository text to your provider after redacting secret-looking strings. Costs are billed by your provider.",
    },
  },

  aiSuggestion: {
    badge: "AI suggestion (beta)",
    defaultGenerate: "Generate",
    generating: "Generating",
    disabledTitle: "Enable AI features in Settings",
    disabledMessage:
      "Turn on AI features in Settings to use this. OpenReady stays fully usable without it.",
    metadata: (model: string, chars: number) => `${model} · ${chars} characters sent`,
    fallbackError: "OpenReady could not generate an AI suggestion.",
  },

  commands: {
    groups: {
      navigate: "Navigation",
      repository: "Repositories",
      action: "Actions",
      view: "View",
    },
    navigate: {
      welcome: { label: "Go to Welcome", hint: "Return to the start screen" },
      dashboard: { label: "Go to Dashboard", hint: "Repository portfolio overview" },
      portfolio: { label: "Open Portfolio", hint: "Role-targeted project highlights" },
      settings: { label: "Open Settings", hint: "Appearance, tour, GitHub token, cache" },
    },
    view: {
      toggleSidebar: "Toggle sidebar",
      cycleTheme: (mode: string) => `Switch theme (current: ${mode})`,
      palette: "Open command palette",
      shortcuts: "Show keyboard shortcuts",
    },
    actions: {
      replayTour: { label: "Replay product tour", hint: "Restart the four-step walkthrough" },
      refresh: (username: string) => ({
        label: `Refresh analysis for ${username}`,
        hint: "Re-fetch repositories from GitHub",
      }),
    },
    repositories: {
      open: (name: string) => `Open repo: ${name}`,
    },
    palette: {
      ariaLabel: "Command palette",
      placeholder: "Type a command, navigate, or open a repo...",
      inputLabel: "Filter commands",
      empty: "No matching commands.",
      move: "to move",
      run: "to run",
      count: (count: number) => `${count} commands`,
    },
    shortcuts: {
      title: "Keyboard shortcuts",
      empty: "No registered shortcuts yet.",
    },
  },

  theme: {
    ariaLabel: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
  },

  notFound: {
    title: "Page not found",
    description: "The route you tried to open does not exist.",
    action: "Back to Welcome",
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
