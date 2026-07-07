#!/usr/bin/env node

// src/cli/index.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolve2 } from "node:path";

// src/cli/args.ts
import { parseArgs } from "node:util";
var VALID_FORMATS = ["table", "json", "markdown"];
var VALID_BADGE_FORMATS = ["endpoint", "svg"];
function parseCliArgs(argv) {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  if (args.length === 0) return { kind: "help" };
  if (args.includes("--help") || args.includes("-h")) return { kind: "help" };
  if (args.includes("--version") || args.includes("-v")) return { kind: "version" };
  const [command, ...rest] = args;
  if (command === "badge") {
    return parseBadgeArgs(rest);
  }
  if (command !== "analyze") {
    return { kind: "error", message: `Unknown command: ${command}. Try \`openready --help\`.` };
  }
  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      options: {
        format: { type: "string" },
        limit: { type: "string" },
        repo: { type: "string" },
        out: { type: "string" },
        token: { type: "string" },
        "no-readme": { type: "boolean" },
        "no-tree": { type: "boolean" },
        "fail-under": { type: "string" },
        "require-check": { type: "string", multiple: true },
        plugins: { type: "string", multiple: true },
        profile: { type: "string" },
        "allow-plugins": { type: "boolean" }
      },
      allowPositionals: true,
      strict: true
    });
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
  const username = parsed.positionals[0];
  if (!username) {
    return {
      kind: "error",
      message: "analyze requires a GitHub username, e.g. `openready analyze octocat`."
    };
  }
  if (parsed.positionals.length > 1) {
    return {
      kind: "error",
      message: `Unexpected extra arguments: ${parsed.positionals.slice(1).join(" ")}`
    };
  }
  const format = parsed.values.format ?? "table";
  if (!VALID_FORMATS.includes(format)) {
    return {
      kind: "error",
      message: `Unknown --format value: ${format}. Expected one of ${VALID_FORMATS.join(", ")}.`
    };
  }
  const limitRaw = parsed.values.limit;
  let limit = 30;
  if (limitRaw !== void 0) {
    const parsedLimit = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return { kind: "error", message: `Invalid --limit value: ${limitRaw}` };
    }
    limit = parsedLimit;
  }
  const failUnderRaw = parsed.values["fail-under"];
  let failUnder = null;
  if (failUnderRaw !== void 0) {
    const parsedFailUnder = Number(failUnderRaw);
    if (!Number.isFinite(parsedFailUnder) || parsedFailUnder < 0 || parsedFailUnder > 100) {
      return {
        kind: "error",
        message: `Invalid --fail-under value: ${failUnderRaw}. Expected 0\u2013100.`
      };
    }
    failUnder = parsedFailUnder;
  }
  const plugins = parsed.values.plugins ?? [];
  const requireChecks = parsed.values["require-check"] ?? [];
  const allowPlugins = Boolean(parsed.values["allow-plugins"]);
  if (plugins.length > 0 && !allowPlugins) {
    return {
      kind: "error",
      message: "Refusing to load --plugins without --allow-plugins (plugins run third-party code)."
    };
  }
  return {
    kind: "analyze",
    username,
    format,
    limit,
    repo: parsed.values.repo ?? null,
    out: parsed.values.out ?? null,
    token: parsed.values.token ?? null,
    fetchReadme: !parsed.values["no-readme"],
    fetchTree: !parsed.values["no-tree"],
    failUnder,
    requireChecks,
    plugins,
    profile: parsed.values.profile ?? null,
    allowPlugins
  };
}
function parseBadgeArgs(rest) {
  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      options: {
        from: { type: "string" },
        repo: { type: "string" },
        format: { type: "string" },
        out: { type: "string" },
        label: { type: "string" }
      },
      allowPositionals: true,
      strict: true
    });
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
  if (parsed.positionals.length > 0) {
    return {
      kind: "error",
      message: `Unexpected extra arguments: ${parsed.positionals.join(" ")}`
    };
  }
  const from = parsed.values.from;
  if (!from) {
    return {
      kind: "error",
      message: "badge requires --from <report.json> (produced by `openready analyze --format json`)."
    };
  }
  const format = parsed.values.format ?? "endpoint";
  if (!VALID_BADGE_FORMATS.includes(format)) {
    return {
      kind: "error",
      message: `Unknown --format value: ${format}. Expected one of ${VALID_BADGE_FORMATS.join(", ")}.`
    };
  }
  return {
    kind: "badge",
    from,
    repo: parsed.values.repo ?? null,
    format,
    out: parsed.values.out ?? null,
    label: parsed.values.label ?? null
  };
}

// src/cli/run.ts
import { readFile as readFile2, writeFile } from "node:fs/promises";

// src/modules/github-client/index.ts
var GITHUB_API_BASE_URL = "https://api.github.com";
var USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
var GitHubClientError = class extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "GitHubClientError";
  }
  code;
  status;
};
function normalizeGitHubUsername(username) {
  return username.trim();
}
function isValidGitHubUsername(username) {
  return USERNAME_PATTERN.test(normalizeGitHubUsername(username));
}
async function fetchUserRepositories(username) {
  const normalized = normalizeGitHubUsername(username);
  if (!isValidGitHubUsername(normalized)) {
    throw new GitHubClientError(
      "invalid-username",
      "Enter a valid GitHub username using letters, numbers, or single hyphens."
    );
  }
  const response = await githubGet(
    `/users/${encodeURIComponent(normalized)}/repos`,
    [
      ["sort", "pushed"],
      ["direction", "desc"],
      ["per_page", "100"]
    ],
    "Could not reach GitHub. Check your connection and try again."
  );
  if (!response.ok) {
    throw await toGitHubClientError(response);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new GitHubClientError(
      "invalid-response",
      "GitHub returned an unexpected response. Try again later."
    );
  }
  return data.map(mapRepository);
}
async function fetchRepositoryReadme(owner, repo) {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();
  if (!normalizedOwner || !normalizedRepo || normalizedOwner.includes("/") || normalizedRepo.includes("/")) {
    throw new GitHubClientError("invalid-username", "Enter a valid repository owner and name.");
  }
  const path = `/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(
    normalizedRepo
  )}/readme`;
  const response = await githubGet(path, [], "Could not reach GitHub while checking the README.");
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await toGitHubClientError(response);
  }
  const data = await response.json();
  if (!isGitHubReadmeResponse(data) || data.encoding !== "base64") {
    throw new GitHubClientError(
      "invalid-response",
      "GitHub returned an unexpected README response."
    );
  }
  return {
    repositoryFullName: `${normalizedOwner}/${normalizedRepo}`,
    path: data.path,
    htmlUrl: data.html_url,
    content: decodeBase64(data.content)
  };
}
async function fetchRepositoryTree(owner, repo, branch) {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();
  const normalizedBranch = branch.trim();
  if (!normalizedOwner || !normalizedRepo || !normalizedBranch || normalizedOwner.includes("/") || normalizedRepo.includes("/")) {
    throw new GitHubClientError(
      "invalid-username",
      "Enter a valid repository owner, name, and branch."
    );
  }
  const path = `/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(
    normalizedRepo
  )}/git/trees/${encodeURIComponent(normalizedBranch)}`;
  const response = await githubGet(
    path,
    [["recursive", "1"]],
    "Could not reach GitHub while checking the repository file tree."
  );
  if (response.status === 404 || response.status === 409) {
    return null;
  }
  if (!response.ok) {
    throw await toGitHubClientError(response);
  }
  const data = await response.json();
  if (!isGitHubTreeResponse(data)) {
    throw new GitHubClientError(
      "invalid-response",
      "GitHub returned an unexpected repository tree response."
    );
  }
  const entries = [];
  for (const entry of data.tree) {
    if (typeof entry.path === "string" && (entry.type === "blob" || entry.type === "tree")) {
      entries.push({ path: entry.path, type: entry.type });
    }
  }
  return {
    repositoryFullName: `${normalizedOwner}/${normalizedRepo}`,
    entries,
    truncated: data.truncated
  };
}
async function githubGet(path, query, networkMessage) {
  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const response = await invoke("github_get", {
        input: { path, query }
      });
      return toProxyHttpResponse(response);
    } catch (error) {
      throw new GitHubClientError("network", errorMessage(error) || networkMessage);
    }
  }
  const url = new URL(path, GITHUB_API_BASE_URL);
  for (const [key, value] of query) {
    url.searchParams.set(key, value);
  }
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (cliAuthToken) {
    headers.Authorization = `Bearer ${cliAuthToken}`;
  }
  try {
    return await fetch(url, { headers });
  } catch {
    throw new GitHubClientError("network", networkMessage);
  }
}
var cliAuthToken = null;
function setGitHubAuthToken(token) {
  cliAuthToken = token && token.trim().length > 0 ? token.trim() : null;
}
function toProxyHttpResponse(response) {
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    headers: {
      get: (name) => name.toLowerCase() === "x-ratelimit-remaining" ? response.rate_limit_remaining : null
    },
    json: async () => JSON.parse(response.body)
  };
}
async function toGitHubClientError(response) {
  const message = await readGitHubErrorMessage(response);
  if (response.status === 404) {
    return new GitHubClientError(
      "not-found",
      "No GitHub user was found for that username.",
      response.status
    );
  }
  if (response.status === 403 && isRateLimitResponse(response, message)) {
    return new GitHubClientError(
      "rate-limit",
      "GitHub rate limit reached. Wait a while and try again.",
      response.status
    );
  }
  return new GitHubClientError(
    "api-error",
    message || "GitHub could not complete the request. Try again later.",
    response.status
  );
}
async function readGitHubErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    return "";
  }
  return "";
}
function isRateLimitResponse(response, message) {
  return response.headers.get("x-ratelimit-remaining") === "0" || message.toLowerCase().includes("rate limit");
}
function errorMessage(error) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}
function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
function mapRepository(repo) {
  return {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    homepageUrl: repo.homepage || null,
    language: repo.language,
    topics: repo.topics ?? [],
    license: repo.license ? {
      key: repo.license.key,
      name: repo.license.name,
      spdxId: repo.license.spdx_id,
      url: repo.license.url
    } : null,
    defaultBranch: repo.default_branch,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    archived: repo.archived,
    fork: repo.fork,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at
  };
}
function isGitHubTreeResponse(value) {
  return typeof value === "object" && value !== null && "tree" in value && Array.isArray(value.tree) && "truncated" in value && typeof value.truncated === "boolean";
}
function isGitHubReadmeResponse(value) {
  return typeof value === "object" && value !== null && "path" in value && typeof value.path === "string" && "html_url" in value && typeof value.html_url === "string" && "content" in value && typeof value.content === "string" && "encoding" in value && typeof value.encoding === "string";
}
function decodeBase64(content) {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// src/modules/scoring-engine/index.ts
var PRESENTATION_CHECK_IDS = /* @__PURE__ */ new Set([
  "homepage",
  "readme-screenshots-demo",
  "release-artifact-link-in-readme"
]);
var categoryDefinitions = [
  {
    id: "documentation",
    label: "Documentation",
    match: (check) => check.category === "documentation" && !PRESENTATION_CHECK_IDS.has(check.id)
  },
  {
    id: "presentation",
    label: "Presentation",
    match: (check) => PRESENTATION_CHECK_IDS.has(check.id)
  },
  {
    id: "buildability",
    label: "Buildability",
    match: (check) => check.category === "buildability"
  },
  {
    id: "maintainability",
    label: "Maintainability",
    match: (check) => check.category === "activity" || check.category === "status"
  },
  {
    id: "testing-ci",
    label: "Testing & CI",
    match: (check) => check.category === "tests" || check.category === "ci"
  },
  {
    id: "deployment-operations",
    label: "Deployment & operations",
    match: (check) => check.category === "containerization" || check.category === "infrastructure"
  },
  {
    id: "metadata-discoverability",
    label: "Metadata & discoverability",
    match: (check) => check.category === "metadata"
  },
  {
    id: "security",
    label: "Security hygiene",
    match: (check) => check.category === "security"
  }
];
function categoryForCheck(check) {
  return categoryDefinitions.find((definition) => definition.match(check))?.id ?? null;
}
var SCORE_CATEGORIES = categoryDefinitions.map(({ id, label }) => ({ id, label }));
function scoreChecks(checks2, weights = {}) {
  const categories = categoryDefinitions.map((definition) => {
    const contributing = checks2.filter(definition.match);
    const passed = contributing.filter((check) => check.status === "passed").length;
    const failed = contributing.filter((check) => check.status === "failed").length;
    const applicable = passed + failed;
    const score = applicable === 0 ? null : Math.round(passed / applicable * 100);
    const weight = weights[definition.id] ?? 1;
    return {
      category: definition.id,
      label: definition.label,
      score,
      passed,
      failed,
      applicable,
      weight,
      contributingCheckIds: contributing.map((check) => check.id)
    };
  });
  const applicableCategories = categories.filter(
    (category) => category.score !== null
  );
  const weightSum = applicableCategories.reduce((sum, category) => sum + category.weight, 0);
  const total = applicableCategories.length === 0 || weightSum === 0 ? null : Math.round(
    applicableCategories.reduce(
      (sum, category) => sum + category.score * category.weight,
      0
    ) / weightSum
  );
  const ranked = [...applicableCategories].sort((a, b) => a.score - b.score);
  const weakestCategory = ranked.length > 0 ? ranked[0].category : null;
  const strongestCategory = ranked.length > 0 ? ranked[ranked.length - 1].category : null;
  return { total, categories, weakestCategory, strongestCategory };
}

// src/modules/recommendation-engine/index.ts
var RECOMMENDATION_RULES = {
  description: {
    title: "Add a repository description",
    description: "A clear description helps visitors understand what your project does immediately without having to read the source code or README.",
    priority: "high"
  },
  topics: {
    title: "Add repository topics",
    description: "Topics make your repository discoverable and help classify your project by its technologies and purpose.",
    priority: "medium"
  },
  homepage: {
    title: "Link to a homepage or demo",
    description: "If this project is deployed or has a dedicated documentation site, linking it in the 'About' section makes it much easier to explore.",
    priority: "high"
  },
  license: {
    title: "Add a license",
    description: "Without a license, default copyright laws apply, meaning others cannot legally use or modify your work. Choose an open-source license to clarify permissions.",
    priority: "high"
  },
  "recent-activity": {
    title: "Update or archive the repository",
    description: "There has been no activity in the last 12 months. Consider archiving it if it is complete or abandoned, or push a small update to show it is still maintained.",
    priority: "low"
  },
  readme: {
    title: "Add a README.md",
    description: "A README is the entry point to your project. It is the single most important document for explaining what the project is, why it exists, and how to use it.",
    priority: "high"
  },
  "readme-purpose": {
    title: "Explain the project purpose",
    description: "Add a short 'About' or 'Overview' section to your README that explains what problem this project solves.",
    priority: "high"
  },
  "readme-setup": {
    title: "Document setup instructions",
    description: "Add a 'Getting Started' or 'Installation' section explaining how someone else can run this project locally.",
    priority: "high"
  },
  "readme-usage": {
    title: "Add usage examples",
    description: "Show how to use the project with code snippets, command line examples, or expected outputs.",
    priority: "medium"
  },
  "readme-screenshots-demo": {
    title: "Add screenshots or a demo link",
    description: "Visuals help visitors quickly grasp what a UI or CLI tool looks like without having to install it.",
    priority: "high"
  },
  "readme-tech-stack": {
    title: "List the technologies used",
    description: "A brief 'Tech Stack' or 'Built With' section helps recruiters and other developers immediately understand the architecture.",
    priority: "medium"
  },
  "readme-testing": {
    title: "Document testing commands",
    description: "Explain how to run the test suite so contributors know how to verify their changes.",
    priority: "medium"
  },
  "readme-roadmap": {
    title: "Add a roadmap or future plans",
    description: "Documenting known limitations or planned features shows that you have thought beyond the current implementation.",
    priority: "low"
  },
  "build-manifest": {
    title: "Commit a build manifest",
    description: "No package.json, pyproject.toml, Cargo.toml, or equivalent was found. A manifest is essential for defining dependencies.",
    priority: "high"
  },
  lockfile: {
    title: "Commit a dependency lockfile",
    description: "Lockfiles (like package-lock.json or yarn.lock) ensure that builds are reproducible by pinning exact dependency versions.",
    priority: "high"
  },
  dockerfile: {
    title: "Add a Dockerfile",
    description: "For backend or full-stack projects, a Dockerfile makes it significantly easier for others to run the project in an isolated environment.",
    priority: "medium"
  },
  "github-actions": {
    title: "Set up Continuous Integration",
    description: "Adding a GitHub Actions workflow to run your tests or linter on every push gives readers confidence in the project's stability.",
    priority: "medium"
  },
  "tests-present": {
    title: "Add automated tests",
    description: "Adding even a few basic unit tests demonstrates a commitment to code quality and maintainability.",
    priority: "medium"
  },
  "security-md": {
    title: "Add a SECURITY.md",
    description: "A brief security policy explains how vulnerabilities should be reported, which is good practice for public repositories.",
    priority: "low"
  },
  "env-example": {
    title: "Add a .env.example file",
    description: "A committed .env.example file safely documents which environment variables are required to run the project without exposing secrets.",
    priority: "medium"
  },
  "docs-folder": {
    title: "Create a docs folder",
    description: "As projects grow, moving detailed documentation (like architecture or deployment guides) into a dedicated docs/ folder keeps the README clean.",
    priority: "low"
  },
  "api-section-in-readme": {
    title: "Document the API surface",
    description: "Backend and full-stack projects benefit from an API, Endpoints or Routes section in the README so consumers can see what is exposed.",
    priority: "high"
  },
  "release-artifact-link-in-readme": {
    title: "Link to release artifacts",
    description: "Desktop apps should point readers to a Releases page, installer or download link so users don't have to build from source.",
    priority: "medium"
  },
  "cli-usage-example-in-readme": {
    title: "Show a command-line example",
    description: "CLI tools are easier to evaluate when the README shows at least one shell invocation that demonstrates real usage.",
    priority: "high"
  },
  "api-or-usage-section-in-readme": {
    title: "Document the public API or usage",
    description: "Libraries need an API, Usage or Reference section so consumers can adopt them without reading the source.",
    priority: "high"
  }
};
var PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1
};
function generateRecommendations(checks2, weights = {}) {
  const baseTotal = scoreChecks(checks2, weights).total;
  const recommendations = [];
  for (const check of checks2) {
    if (check.status !== "failed") continue;
    const rule = RECOMMENDATION_RULES[check.id];
    if (!rule) continue;
    recommendations.push({
      id: `rec-${check.id}`,
      checkId: check.id,
      title: rule.title,
      description: rule.description,
      priority: rule.priority,
      category: categoryForCheck(check),
      scoreImpact: projectedImpact(checks2, check, weights, baseTotal)
    });
  }
  return recommendations.sort(
    (a, b) => PRIORITY_WEIGHTS[b.priority] * 10 + b.scoreImpact - (PRIORITY_WEIGHTS[a.priority] * 10 + a.scoreImpact)
  );
}
function projectedImpact(checks2, target, weights, baseTotal) {
  if (baseTotal === null) return 0;
  const simulated = checks2.map(
    (check) => check === target ? { ...check, status: "passed" } : check
  );
  const newTotal = scoreChecks(simulated, weights).total;
  if (newTotal === null) return 0;
  return Math.max(0, newTotal - baseTotal);
}

// src/modules/analyzer-core/tech-stack.ts
var EVIDENCE_LIMIT = 3;
var signalDefinitions = [
  {
    id: "node",
    label: "Node.js",
    match: (entry) => isBlobNamed(entry, "package.json") || isBlobNamed(entry, "pnpm-lock.yaml") || isBlobNamed(entry, "yarn.lock") || isBlobNamed(entry, "package-lock.json") || isBlobNamed(entry, "bun.lockb")
  },
  {
    id: "python",
    label: "Python",
    match: (entry) => isBlobNamed(entry, "pyproject.toml") || isBlobNamed(entry, "requirements.txt") || isBlobNamed(entry, "Pipfile") || isBlobNamed(entry, "Pipfile.lock") || isBlobNamed(entry, "setup.py") || isBlobNamed(entry, "setup.cfg") || isBlobNamed(entry, "poetry.lock")
  },
  {
    id: "rust",
    label: "Rust",
    match: (entry) => isBlobNamed(entry, "Cargo.toml") || isBlobNamed(entry, "Cargo.lock")
  },
  {
    id: "go",
    label: "Go",
    match: (entry) => isBlobNamed(entry, "go.mod") || isBlobNamed(entry, "go.sum")
  },
  {
    id: "java-gradle",
    label: "Java / Gradle",
    match: (entry) => entry.type === "blob" && (basename(entry.path) === "build.gradle" || basename(entry.path) === "build.gradle.kts" || basename(entry.path).startsWith("settings.gradle"))
  },
  {
    id: "android",
    label: "Android",
    match: (entry) => isBlobNamed(entry, "AndroidManifest.xml")
  },
  {
    id: "docker",
    label: "Docker",
    match: (entry) => isBlobNamed(entry, "Dockerfile") || isBlobNamed(entry, "docker-compose.yml") || isBlobNamed(entry, "docker-compose.yaml") || isBlobNamed(entry, ".dockerignore")
  },
  {
    id: "github-actions",
    label: "GitHub Actions",
    match: (entry) => entry.type === "blob" && entry.path.startsWith(".github/workflows/") && (entry.path.endsWith(".yml") || entry.path.endsWith(".yaml"))
  },
  {
    id: "terraform",
    label: "Terraform",
    match: (entry) => entry.type === "blob" && (entry.path.endsWith(".tf") || entry.path.endsWith(".tfvars"))
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    match: (entry) => entry.type === "blob" && (basename(entry.path) === "Chart.yaml" || basename(entry.path) === "values.yaml") || entry.type === "blob" && (entry.path.endsWith(".yml") || entry.path.endsWith(".yaml")) && isInsideAny(entry.path, ["k8s/", "kubernetes/", "manifests/", "deploy/"])
  },
  {
    id: "docs-folder",
    label: "docs/ folder",
    match: (entry) => entry.path === "docs" || entry.path === "documentation" || entry.path.startsWith("docs/") || entry.path.startsWith("documentation/")
  },
  {
    id: "tests",
    label: "Tests",
    match: (entry) => isTestEntry(entry)
  }
];
function detectTechSignals(tree) {
  const buckets = /* @__PURE__ */ new Map();
  for (const entry of tree.entries) {
    for (const definition of signalDefinitions) {
      if (!definition.match(entry)) continue;
      const evidence = buckets.get(definition.id) ?? [];
      if (evidence.length < EVIDENCE_LIMIT && !evidence.includes(entry.path)) {
        evidence.push(entry.path);
      }
      buckets.set(definition.id, evidence);
    }
  }
  return signalDefinitions.filter((definition) => buckets.has(definition.id)).map((definition) => ({
    id: definition.id,
    label: definition.label,
    evidence: buckets.get(definition.id) ?? []
  }));
}
function hasTechSignal(signals, id) {
  return signals.some((signal) => signal.id === id);
}
function findTechSignal(signals, id) {
  return signals.find((signal) => signal.id === id);
}
function isBlobNamed(entry, name) {
  return entry.type === "blob" && basename(entry.path) === name;
}
function basename(path) {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}
function isInsideAny(path, prefixes) {
  return prefixes.some((prefix) => path.startsWith(prefix));
}
function isTestEntry(entry) {
  if (entry.type === "tree") {
    const name2 = basename(entry.path);
    return name2 === "tests" || name2 === "test" || name2 === "__tests__" || name2 === "spec" || entry.path === "tests" || entry.path === "test" || entry.path === "__tests__" || entry.path === "spec";
  }
  if (entry.type !== "blob") return false;
  const name = basename(entry.path);
  if (name.endsWith(".test.ts") || name.endsWith(".test.tsx") || name.endsWith(".test.js") || name.endsWith(".test.jsx") || name.endsWith(".spec.ts") || name.endsWith(".spec.tsx") || name.endsWith(".spec.js") || name.endsWith(".spec.jsx")) {
    return true;
  }
  if (name.endsWith("_test.go") || name.endsWith("_test.py") || name.endsWith("_spec.rb")) {
    return true;
  }
  if (name.startsWith("test_") && name.endsWith(".py")) return true;
  return false;
}

// src/modules/project-classifier/types.ts
var PROJECT_TYPE_LABELS = {
  frontend: "Frontend app",
  backend: "Backend / API",
  "full-stack": "Full-stack app",
  desktop: "Desktop app",
  cli: "CLI tool",
  library: "Library / package",
  unknown: "Unclassified"
};

// src/modules/project-classifier/profiles.ts
var NEUTRAL = {
  categoryWeights: {},
  extraChecks: () => []
};
function profileFor(type) {
  switch (type) {
    case "frontend":
      return FRONTEND;
    case "backend":
      return BACKEND;
    case "full-stack":
      return FULLSTACK;
    case "desktop":
      return DESKTOP;
    case "cli":
      return CLI;
    case "library":
      return LIBRARY;
    case "unknown":
    default:
      return NEUTRAL;
  }
}
var FRONTEND = {
  categoryWeights: {
    presentation: 2,
    "deployment-operations": 0.5
  },
  extraChecks: () => []
};
var BACKEND = {
  categoryWeights: {
    "testing-ci": 1.5,
    "deployment-operations": 1.5,
    security: 1.25,
    presentation: 0.5
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "api-section-in-readme",
      label: "README documents the API surface",
      category: "documentation",
      patterns: [/^#{1,4}\s+(api|endpoints?|routes?|reference)\b/im],
      failedEvidence: "No API, endpoints or routes section found in the README."
    })
  ]
};
var FULLSTACK = {
  categoryWeights: {
    presentation: 1.5,
    "testing-ci": 1.25,
    "deployment-operations": 1.25
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "api-section-in-readme",
      label: "README documents the API surface",
      category: "documentation",
      patterns: [/^#{1,4}\s+(api|endpoints?|routes?|reference)\b/im],
      failedEvidence: "No API, endpoints or routes section found in the README."
    })
  ]
};
var DESKTOP = {
  categoryWeights: {
    presentation: 1.5,
    "deployment-operations": 1.25
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "release-artifact-link-in-readme",
      label: "README links to release artifacts",
      category: "documentation",
      patterns: [
        /\bhttps?:\/\/[^\s)]*\/releases?\b/i,
        /^#{1,4}\s+(download|install|releases?)\b/im,
        /\b(installer|\.dmg|\.exe|\.appimage|\.msi)\b/i
      ],
      failedEvidence: "No installer, download link or Releases reference found in the README."
    })
  ]
};
var CLI = {
  categoryWeights: {
    documentation: 1.25,
    "testing-ci": 1.25,
    presentation: 0.25
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "cli-usage-example-in-readme",
      label: "README shows command-line usage",
      category: "documentation",
      patterns: [/```(sh|bash|console|shell)?\s*\n[^`]*\$\s+\w+/i, /^\$\s+\w+/m, /\bnpx\s+\w+/i],
      failedEvidence: "No shell example or command-line invocation found in the README."
    })
  ]
};
var LIBRARY = {
  categoryWeights: {
    documentation: 1.5,
    "testing-ci": 1.5,
    presentation: 0.25,
    "deployment-operations": 0.25
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "api-or-usage-section-in-readme",
      label: "README documents the public API or usage",
      category: "documentation",
      patterns: [/^#{1,4}\s+(api|usage|reference|examples?)\b/im],
      failedEvidence: "No API, usage or reference section found in the README."
    })
  ]
};
function readmeSectionCheck(ctx, input) {
  const readme = ctx.readmeState;
  if (!readme) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "unknown",
      evidence: "README content is unavailable for this repository."
    };
  }
  if (readme.status === "unknown") {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "unknown",
      evidence: readme.message
    };
  }
  if (readme.status === "missing") {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "not-applicable",
      evidence: "README is missing."
    };
  }
  const passed = input.patterns.some((pattern) => pattern.test(readme.readme.content));
  return {
    id: input.id,
    label: input.label,
    category: input.category,
    status: passed ? "passed" : "failed",
    evidence: passed ? void 0 : input.failedEvidence
  };
}

// src/modules/project-classifier/index.ts
function classifyRepository(_repository, treeState, techSignals, override) {
  const detected = autoDetect(treeState, techSignals);
  if (override && override !== detected.type) {
    return {
      ...detected,
      type: override,
      overridden: true
    };
  }
  return detected;
}
function autoDetect(treeState, techSignals) {
  const entries = readableEntries(treeState);
  if (!entries) {
    return {
      type: "unknown",
      detectedType: "unknown",
      confidence: "low",
      reasons: ["Repository file tree is unavailable."],
      runnerUp: null,
      overridden: false
    };
  }
  const paths = new Set(entries.map((entry) => entry.path));
  const tops = topLevelDirs(entries);
  const collected = [];
  collected.push(...frontendSignals(paths));
  collected.push(...backendSignals(paths, tops, techSignals));
  collected.push(...desktopSignals(paths, tops));
  collected.push(...cliSignals(paths, tops, techSignals));
  collected.push(...librarySignals(paths, tops, techSignals));
  const scores = /* @__PURE__ */ new Map();
  for (const signal of collected) {
    const list = scores.get(signal.type) ?? [];
    list.push(signal.reason);
    scores.set(signal.type, list);
  }
  if ((scores.get("desktop")?.length ?? 0) >= 1) {
    scores.delete("frontend");
  }
  const frontendCount = scores.get("frontend")?.length ?? 0;
  const backendCount = scores.get("backend")?.length ?? 0;
  if (frontendCount >= 1 && backendCount >= 1) {
    const reasons = [...scores.get("frontend") ?? [], ...scores.get("backend") ?? []];
    scores.set("full-stack", reasons);
    scores.delete("frontend");
    scores.delete("backend");
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1].length - a[1].length);
  if (ranked.length === 0) {
    return {
      type: "unknown",
      detectedType: "unknown",
      confidence: "low",
      reasons: ["No identifying files were detected in the repository tree."],
      runnerUp: null,
      overridden: false
    };
  }
  const [winner, winnerReasons] = ranked[0];
  const runnerUp = ranked[1] ?? null;
  const lead = winnerReasons.length - (runnerUp ? runnerUp[1].length : 0);
  const confidence = lead >= 2 ? "high" : lead === 1 ? "medium" : "low";
  return {
    type: winner,
    detectedType: winner,
    confidence,
    reasons: winnerReasons.slice(0, 4),
    runnerUp: runnerUp ? runnerUp[0] : null,
    overridden: false
  };
}
function readableEntries(treeState) {
  if (!treeState) return null;
  if (treeState.status === "found" || treeState.status === "truncated") {
    return treeState.tree.entries;
  }
  return null;
}
function topLevelDirs(entries) {
  const dirs = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const slash = entry.path.indexOf("/");
    if (entry.type === "tree" && slash === -1) {
      dirs.add(entry.path);
    } else if (slash > 0) {
      dirs.add(entry.path.slice(0, slash));
    }
  }
  return dirs;
}
function hasFile(paths, name) {
  return paths.has(name);
}
function anyPathMatches(paths, predicate) {
  for (const path of paths) {
    if (predicate(path)) return true;
  }
  return false;
}
function frontendSignals(paths) {
  const signals = [];
  if (hasFile(paths, "index.html")) {
    signals.push({ type: "frontend", reason: "index.html at the repository root" });
  }
  const frameworkConfigs = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "astro.config.mjs",
    "astro.config.ts",
    "svelte.config.js",
    "svelte.config.ts",
    "angular.json",
    "nuxt.config.ts",
    "nuxt.config.js",
    "gatsby-config.js",
    "gatsby-config.ts",
    "remix.config.js",
    "remix.config.ts"
  ];
  const framework = frameworkConfigs.find((name) => hasFile(paths, name));
  if (framework) {
    signals.push({ type: "frontend", reason: `${framework} present` });
  }
  if (anyPathMatches(paths, (path) => path.startsWith("public/"))) {
    signals.push({ type: "frontend", reason: "public/ asset directory" });
  }
  if (anyPathMatches(paths, (path) => path.startsWith("src/components/")) || anyPathMatches(paths, (path) => path.startsWith("src/pages/")) || anyPathMatches(paths, (path) => path.startsWith("src/app/"))) {
    signals.push({ type: "frontend", reason: "src/components or src/pages directory" });
  }
  return signals;
}
function backendSignals(paths, tops, techSignals) {
  const signals = [];
  if (hasFile(paths, "Procfile")) {
    signals.push({ type: "backend", reason: "Procfile present" });
  }
  for (const file of ["manage.py", "wsgi.py", "asgi.py"]) {
    if (hasFile(paths, file)) {
      signals.push({ type: "backend", reason: `${file} present` });
      break;
    }
  }
  if (hasFile(paths, "main.go") && hasTechSignal(techSignals, "go")) {
    signals.push({ type: "backend", reason: "main.go entry point" });
  }
  for (const dir of ["api", "server", "backend"]) {
    if (tops.has(dir)) {
      signals.push({ type: "backend", reason: `${dir}/ directory at root` });
      break;
    }
  }
  if (hasTechSignal(techSignals, "docker") && (hasTechSignal(techSignals, "python") || hasTechSignal(techSignals, "go") || hasTechSignal(techSignals, "java-gradle")) && !anyPathMatches(paths, (p) => p === "index.html") && !hasFile(paths, "vite.config.ts")) {
    signals.push({ type: "backend", reason: "Dockerfile with server-language manifest" });
  }
  return signals;
}
function desktopSignals(paths, tops) {
  const signals = [];
  if (tops.has("src-tauri") || hasFile(paths, "tauri.conf.json")) {
    signals.push({ type: "desktop", reason: "Tauri configuration detected" });
  }
  if (hasFile(paths, "electron.js") || hasFile(paths, "electron-builder.json") || hasFile(paths, "electron-builder.yml") || anyPathMatches(paths, (path) => path === "forge.config.js" || path === "forge.config.ts")) {
    signals.push({ type: "desktop", reason: "Electron / Forge configuration detected" });
  }
  if (anyPathMatches(paths, (path) => path.endsWith(".iss"))) {
    signals.push({ type: "desktop", reason: "Inno Setup installer script present" });
  }
  return signals;
}
function cliSignals(paths, tops, techSignals) {
  const signals = [];
  if (tops.has("bin")) {
    signals.push({ type: "cli", reason: "bin/ directory at root" });
  }
  if (tops.has("cmd") && hasTechSignal(techSignals, "go")) {
    signals.push({ type: "cli", reason: "cmd/ directory with Go module" });
  }
  if (hasFile(paths, "src/main.rs") && hasTechSignal(techSignals, "rust") && !anyPathMatches(paths, (path) => path === "src-tauri" || path.startsWith("src-tauri/"))) {
    signals.push({ type: "cli", reason: "Rust main.rs without Tauri shell" });
  }
  return signals;
}
function librarySignals(paths, tops, techSignals) {
  const signals = [];
  const hasManifest = hasTechSignal(techSignals, "node") || hasTechSignal(techSignals, "python") || hasTechSignal(techSignals, "rust") || hasTechSignal(techSignals, "go");
  if (!hasManifest) return signals;
  if (tops.has("lib")) {
    signals.push({ type: "library", reason: "lib/ directory at root" });
  }
  const indicatesExports = hasFile(paths, "src/index.ts") || hasFile(paths, "src/index.js") || hasFile(paths, "src/lib.rs");
  const noAppHints = !hasFile(paths, "index.html") && !tops.has("api") && !tops.has("server") && !tops.has("bin") && !tops.has("src-tauri") && !hasFile(paths, "manage.py");
  if (indicatesExports && noAppHints) {
    signals.push({ type: "library", reason: "package entry point without app shell" });
  }
  return signals;
}

// src/modules/analyzer-core/index.ts
var RECENT_ACTIVITY_DAYS = 365;
var DOCKER_REQUIRED_PROJECT_TYPES = /* @__PURE__ */ new Set(["backend", "full-stack"]);
var readmeSections = [
  {
    id: "purpose",
    label: "README explains project purpose",
    missingSignal: "README purpose is unclear",
    patterns: [/^#{1,3}\s+(about|overview|introduction|purpose|what is)/im]
  },
  {
    id: "setup",
    label: "README includes setup instructions",
    missingSignal: "No setup instructions found",
    patterns: [/^#{1,3}\s+(installation|install|setup|getting started|quickstart|run locally)/im]
  },
  {
    id: "usage",
    label: "README includes usage guidance",
    missingSignal: "No usage guidance found",
    patterns: [/^#{1,3}\s+(usage|examples?|how to use)/im]
  },
  {
    id: "screenshots-demo",
    label: "README includes screenshots or demo",
    missingSignal: "No screenshots or demo found",
    patterns: [
      /^#{1,3}\s+(screenshots?|demo|preview|gallery|video)/im,
      /!\[[^\]]*]\([^)]+\)/,
      /\b(demo|screenshot|preview|gif|video)\b/i
    ]
  },
  {
    id: "tech-stack",
    label: "README names the tech stack",
    missingSignal: "Tech stack is not described",
    patterns: [/^#{1,3}\s+(tech stack|technologies|built with|stack)/im]
  },
  {
    id: "testing",
    label: "README mentions testing",
    missingSignal: "Testing is not documented",
    patterns: [/^#{1,3}\s+(test|tests|testing)/im, /\b(pnpm test|npm test|pytest|cargo test)\b/i]
  },
  {
    id: "roadmap",
    label: "README includes roadmap or future work",
    missingSignal: "Roadmap or future work is not documented",
    patterns: [/^#{1,3}\s+(roadmap|future|planned|todo|next steps)/im]
  }
];
function analyzeRepositories(repositories, readmes = {}, trees = {}, now = /* @__PURE__ */ new Date(), overrides = {}, userWeights = {}) {
  return repositories.map(
    (repository) => analyzeRepository(
      repository,
      readmes[repository.id],
      trees[repository.id],
      now,
      overrides[repository.id],
      userWeights
    )
  );
}
function analyzeRepository(repository, readmeState, treeState = void 0, now = /* @__PURE__ */ new Date(), override, userWeights = {}) {
  const techSignals = collectTechSignals(treeState);
  const classification = classifyRepository(repository, treeState, techSignals, override);
  const profile = profileFor(classification.type);
  const weights = mergeWeights(profile.categoryWeights, userWeights);
  const profileChecks = profile.extraChecks({ repository, readmeState, treeState });
  const checks2 = [
    metadataCheck(
      "description",
      "Repository has a description",
      Boolean(repository.description?.trim()),
      "No repository description provided"
    ),
    metadataCheck(
      "topics",
      "Repository has topics",
      repository.topics.length > 0,
      "No repository topics configured"
    ),
    metadataCheck(
      "homepage",
      "Repository links to a homepage or demo",
      Boolean(repository.homepageUrl?.trim()),
      "No homepage or demo link configured"
    ),
    metadataCheck(
      "license",
      "Repository declares a license",
      Boolean(repository.license),
      "No license metadata found"
    ),
    recentActivityCheck(repository, now),
    {
      id: "not-archived",
      label: "Repository is not archived",
      category: "status",
      status: repository.archived ? "failed" : "passed",
      evidence: repository.archived ? "Archived repositories are not active candidates." : void 0
    },
    {
      id: "original-repository",
      label: "Repository is original work",
      category: "status",
      status: repository.fork ? "not-applicable" : "passed",
      evidence: repository.fork ? "Forked repositories are shown but labeled separately." : void 0
    },
    ...readmeChecks(readmeState),
    ...buildabilityChecks(treeState, techSignals, classification.type),
    ...ciChecks(treeState, techSignals),
    ...testsChecks(treeState, techSignals),
    ...infrastructureChecks(treeState, techSignals),
    ...docsFolderChecks(treeState, techSignals),
    ...securityChecks(treeState),
    ...profileChecks
  ];
  const passedCount = checks2.filter((check) => check.status === "passed").length;
  const failedChecks = checks2.filter((check) => check.status === "failed");
  const unknownCount = checks2.filter((check) => check.status === "unknown").length;
  const missingSignals = failedChecks.map((check) => check.evidence).filter((signal) => Boolean(signal)).slice(0, 3);
  const score = scoreChecks(checks2, weights);
  const recommendations = generateRecommendations(checks2, weights);
  return {
    repository,
    checks: checks2,
    analyzedAt: now.toISOString(),
    healthLabel: chooseHealthLabel(repository, checks2, score.total),
    score,
    passedCount,
    failedCount: failedChecks.length,
    unknownCount,
    missingSignals,
    recommendations,
    classification,
    classificationOverride: override,
    hiddenGem: detectHiddenGem(repository, score)
  };
}
var HIDDEN_GEM_MIN_SCORE = 70;
var HIDDEN_GEM_MAX_STARS = 5;
function detectHiddenGem(repository, score) {
  const noGem = { isHiddenGem: false, reasons: [] };
  if (repository.archived || repository.fork) return noGem;
  if (score.total === null || score.total < HIDDEN_GEM_MIN_SCORE) return noGem;
  if (repository.stars > HIDDEN_GEM_MAX_STARS) return noGem;
  const gaps = [];
  if (repository.topics.length === 0) gaps.push("no topics set");
  if (!repository.homepageUrl?.trim()) gaps.push("no homepage or demo link");
  if (!repository.description?.trim()) gaps.push("no description");
  if (gaps.length === 0) return noGem;
  const starLabel = repository.stars === 1 ? "1 star" : `${repository.stars} stars`;
  return {
    isHiddenGem: true,
    reasons: [`Scores ${score.total} but has only ${starLabel}`, ...gaps]
  };
}
function metadataCheck(id, label, passed, missingSignal) {
  return {
    id,
    label,
    category: "metadata",
    status: passed ? "passed" : "failed",
    evidence: passed ? void 0 : missingSignal
  };
}
function recentActivityCheck(repository, now) {
  const activityDate = parseDate(repository.pushedAt ?? repository.updatedAt);
  if (!activityDate) {
    return {
      id: "recent-activity",
      label: "Repository was active in the last 12 months",
      category: "activity",
      status: "unknown",
      evidence: "GitHub did not provide a usable activity date."
    };
  }
  const daysSinceActivity = Math.floor((now.getTime() - activityDate.getTime()) / 864e5);
  return {
    id: "recent-activity",
    label: "Repository was active in the last 12 months",
    category: "activity",
    status: daysSinceActivity <= RECENT_ACTIVITY_DAYS ? "passed" : "failed",
    evidence: daysSinceActivity <= RECENT_ACTIVITY_DAYS ? void 0 : `Last activity was ${daysSinceActivity} days ago`
  };
}
function readmeChecks(readmeState) {
  if (!readmeState) {
    return [
      unknownCheck(
        "readme",
        "README status is known",
        "README content is unavailable for this repository."
      ),
      ...readmeSections.map(
        (section) => unknownCheck(
          `readme-${section.id}`,
          section.label,
          "README content is unavailable for this repository."
        )
      )
    ];
  }
  if (readmeState.status === "unknown") {
    return [
      unknownCheck("readme", "README exists", readmeState.message),
      ...readmeSections.map(
        (section) => unknownCheck(`readme-${section.id}`, section.label, readmeState.message)
      )
    ];
  }
  if (readmeState.status === "missing") {
    return [
      {
        id: "readme",
        label: "README exists",
        category: "documentation",
        status: "failed",
        evidence: "No README found"
      },
      ...readmeSections.map((section) => ({
        id: `readme-${section.id}`,
        label: section.label,
        category: "documentation",
        status: "not-applicable",
        evidence: "README is missing."
      }))
    ];
  }
  const content = readmeState.readme.content;
  return [
    {
      id: "readme",
      label: "README exists",
      category: "documentation",
      status: "passed",
      evidence: readmeState.readme.path
    },
    ...readmeSections.map((section) => {
      const passed = section.id === "purpose" ? hasPurpose(content) : hasSection(content, section);
      return {
        id: `readme-${section.id}`,
        label: section.label,
        category: "documentation",
        status: passed ? "passed" : "failed",
        evidence: passed ? void 0 : section.missingSignal
      };
    })
  ];
}
function unknownCheck(id, label, evidence) {
  return {
    id,
    label,
    category: "documentation",
    status: "unknown",
    evidence
  };
}
function hasSection(content, section) {
  return section.patterns.some((pattern) => pattern.test(content));
}
function hasPurpose(content) {
  if (hasSection(content, readmeSections[0])) return true;
  const bodyWithoutTitle = content.replace(/^#\s+.+$/m, "").trim();
  return bodyWithoutTitle.length >= 120;
}
function chooseHealthLabel(repository, checks2, total) {
  if (repository.archived) return "Archived";
  if (repository.fork) return "Fork";
  if (checkStatus(checks2, "recent-activity") === "failed") return "Stale";
  if (total === null) return "Analyzing";
  if (total >= 85) return "Portfolio-ready";
  if (total >= 70) return "Almost ready";
  if (total >= 50) return "Needs work";
  return "Experimental";
}
function checkStatus(checks2, id) {
  return checks2.find((check) => check.id === id)?.status;
}
function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function mergeWeights(profileWeights, userWeights) {
  const categories = /* @__PURE__ */ new Set([
    ...Object.keys(profileWeights),
    ...Object.keys(userWeights)
  ]);
  const merged = {};
  for (const category of categories) {
    merged[category] = (profileWeights[category] ?? 1) * (userWeights[category] ?? 1);
  }
  return merged;
}
function collectTechSignals(treeState) {
  if (!treeState) return [];
  if (treeState.status === "found" || treeState.status === "truncated") {
    return detectTechSignals(treeState.tree);
  }
  return [];
}
function buildabilityChecks(treeState, techSignals, projectType) {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const manifestSignal = ["node", "python", "rust", "go", "java-gradle"].map((id) => findTechSignal(techSignals, id)).find((signal) => Boolean(signal));
  const lockfileEvidence = findLockfileEvidence(treeState);
  const dockerSignal = findTechSignal(techSignals, "docker");
  return [
    deriveCheck({
      id: "build-manifest",
      label: "Repository declares a build manifest",
      category: "buildability",
      treeUnknown,
      treeEmpty,
      passed: Boolean(manifestSignal),
      passedEvidence: manifestSignal?.evidence.join(", "),
      failedEvidence: "No package manifest detected (package.json, pyproject.toml, Cargo.toml, go.mod, build.gradle*)."
    }),
    deriveCheck({
      id: "lockfile",
      label: "Dependency lockfile is committed",
      category: "buildability",
      treeUnknown,
      treeEmpty,
      passed: lockfileEvidence !== null,
      passedEvidence: lockfileEvidence ?? void 0,
      failedEvidence: "No lockfile committed \u2014 installs may not be reproducible."
    }),
    dockerfileCheck({ dockerSignal, treeUnknown, treeEmpty, projectType })
  ];
}
function dockerfileCheck(input) {
  const base = {
    id: "dockerfile",
    label: "Repository ships a Dockerfile or Compose file",
    category: "containerization"
  };
  if (input.dockerSignal) {
    return {
      ...base,
      status: "passed",
      evidence: input.dockerSignal.evidence.join(", ")
    };
  }
  if (input.treeUnknown) {
    return {
      ...base,
      status: "unknown",
      evidence: "Repository file tree was not available."
    };
  }
  if (input.treeEmpty) {
    return {
      ...base,
      status: "not-applicable",
      evidence: "Repository is empty."
    };
  }
  if (!DOCKER_REQUIRED_PROJECT_TYPES.has(input.projectType)) {
    return {
      ...base,
      status: "not-applicable",
      evidence: "Container packaging is not expected for this project type."
    };
  }
  return {
    ...base,
    status: "failed",
    evidence: "No Dockerfile or docker-compose file found."
  };
}
function ciChecks(treeState, techSignals) {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const ciSignal = findTechSignal(techSignals, "github-actions");
  return [
    deriveCheck({
      id: "github-actions",
      label: "GitHub Actions workflows are configured",
      category: "ci",
      treeUnknown,
      treeEmpty,
      passed: Boolean(ciSignal),
      passedEvidence: ciSignal?.evidence.join(", "),
      failedEvidence: "No GitHub Actions workflows found under .github/workflows."
    })
  ];
}
function testsChecks(treeState, techSignals) {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const testSignal = findTechSignal(techSignals, "tests");
  return [
    deriveCheck({
      id: "tests-present",
      label: "Repository contains test files or directories",
      category: "tests",
      treeUnknown,
      treeEmpty,
      passed: Boolean(testSignal),
      passedEvidence: testSignal?.evidence.join(", "),
      failedEvidence: "No test directories or test files detected."
    })
  ];
}
function infrastructureChecks(treeState, techSignals) {
  if (isTreeUnknown(treeState)) {
    return [
      {
        id: "infrastructure-as-code",
        label: "Repository declares infrastructure as code",
        category: "infrastructure",
        status: "unknown",
        evidence: "Repository file tree was not available."
      }
    ];
  }
  const terraform = findTechSignal(techSignals, "terraform");
  const kubernetes = findTechSignal(techSignals, "kubernetes");
  const evidence = [terraform, kubernetes].filter((signal) => Boolean(signal)).flatMap((signal) => signal.evidence).slice(0, 3);
  if (terraform || kubernetes) {
    return [
      {
        id: "infrastructure-as-code",
        label: "Repository declares infrastructure as code",
        category: "infrastructure",
        status: "passed",
        evidence: evidence.join(", ")
      }
    ];
  }
  return [
    {
      id: "infrastructure-as-code",
      label: "Repository declares infrastructure as code",
      category: "infrastructure",
      status: "not-applicable",
      evidence: "No Terraform, Helm or Kubernetes manifests detected."
    }
  ];
}
function securityChecks(treeState) {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const securityMd = findEntry(treeState, (path) => /(^|\/)SECURITY\.md$/i.test(path));
  const envExample = findEntry(treeState, (path) => {
    const slash = path.lastIndexOf("/");
    const name = slash === -1 ? path : path.slice(slash + 1);
    return name === ".env.example" || name === ".env.sample" || name === ".env.template" || name === ".env.dist";
  });
  return [
    deriveCheck({
      id: "security-md",
      label: "Repository ships a SECURITY.md",
      category: "security",
      treeUnknown,
      treeEmpty,
      passed: securityMd !== null,
      passedEvidence: securityMd ?? void 0,
      failedEvidence: "No SECURITY.md found \u2014 a short security policy helps reporters reach you."
    }),
    deriveCheck({
      id: "env-example",
      label: "Repository ships an example env file",
      category: "security",
      treeUnknown,
      treeEmpty,
      passed: envExample !== null,
      passedEvidence: envExample ?? void 0,
      failedEvidence: "No .env.example or equivalent template found \u2014 committed example env files document configuration safely."
    })
  ];
}
function findEntry(treeState, predicate) {
  if (!treeState || treeState.status !== "found" && treeState.status !== "truncated") {
    return null;
  }
  for (const entry of treeState.tree.entries) {
    if (entry.type === "blob" && predicate(entry.path)) {
      return entry.path;
    }
  }
  return null;
}
function docsFolderChecks(treeState, techSignals) {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const docsSignal = findTechSignal(techSignals, "docs-folder");
  return [
    deriveCheck({
      id: "docs-folder",
      label: "Repository ships a dedicated docs/ folder",
      category: "documentation",
      treeUnknown,
      treeEmpty,
      passed: Boolean(docsSignal),
      passedEvidence: docsSignal?.evidence.join(", "),
      failedEvidence: "No docs/ or documentation/ folder found."
    })
  ];
}
function deriveCheck(input) {
  if (input.passed) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "passed",
      evidence: input.passedEvidence
    };
  }
  if (input.treeUnknown) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "unknown",
      evidence: "Repository file tree was not available."
    };
  }
  if (input.treeEmpty) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "not-applicable",
      evidence: "Repository is empty."
    };
  }
  return {
    id: input.id,
    label: input.label,
    category: input.category,
    status: "failed",
    evidence: input.failedEvidence
  };
}
function isTreeUnknown(treeState) {
  return !treeState || treeState.status === "unknown" || treeState.status === "truncated";
}
var LOCKFILE_NAMES = /* @__PURE__ */ new Set([
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lockb",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
  "Pipfile.lock"
]);
function findLockfileEvidence(treeState) {
  if (!treeState || treeState.status !== "found" && treeState.status !== "truncated") {
    return null;
  }
  for (const entry of treeState.tree.entries) {
    if (entry.type !== "blob") continue;
    const slash = entry.path.lastIndexOf("/");
    const name = slash === -1 ? entry.path : entry.path.slice(slash + 1);
    if (LOCKFILE_NAMES.has(name)) {
      return entry.path;
    }
  }
  return null;
}

// src/modules/portfolio/roles.ts
var ROLE_PRESETS = [
  {
    id: "frontend",
    label: "Frontend Engineer",
    blurb: "UI-focused work: web apps, component systems, and presentation.",
    projectTypes: ["frontend", "full-stack"],
    techSignals: ["node"],
    languages: ["typescript", "javascript", "html", "css", "vue", "svelte"]
  },
  {
    id: "backend",
    label: "Backend Engineer",
    blurb: "Services, APIs, and libraries with an emphasis on testing and operations.",
    projectTypes: ["backend", "cli", "library"],
    techSignals: ["node", "python", "go", "rust", "java-gradle", "docker"],
    languages: ["python", "go", "rust", "java", "ruby", "c#", "php", "typescript"]
  },
  {
    id: "full-stack",
    label: "Full-stack Engineer",
    blurb: "End-to-end products spanning frontend and backend.",
    projectTypes: ["full-stack", "frontend", "backend"],
    techSignals: ["node", "docker"],
    languages: ["typescript", "javascript", "python"]
  },
  {
    id: "mobile",
    label: "Mobile Engineer",
    blurb: "Native and cross-platform mobile applications.",
    projectTypes: ["frontend"],
    techSignals: ["android"],
    languages: ["kotlin", "swift", "java", "dart", "objective-c"]
  },
  {
    id: "devops",
    label: "DevOps / Platform Engineer",
    blurb: "CI/CD, containers, infrastructure as code, and orchestration.",
    projectTypes: ["backend"],
    techSignals: ["docker", "github-actions", "terraform", "kubernetes"],
    languages: ["hcl", "shell", "go", "dockerfile"]
  },
  {
    id: "data",
    label: "Data / ML Engineer",
    blurb: "Data pipelines, analysis, and machine-learning projects.",
    projectTypes: ["library", "cli"],
    techSignals: ["python"],
    languages: ["python", "jupyter notebook", "r"]
  },
  {
    id: "generalist",
    label: "Generalist Developer",
    blurb: "A broad mix of work \u2014 no single specialization stands out.",
    projectTypes: [],
    techSignals: [],
    languages: []
  }
];
var ROLE_LABELS = ROLE_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset.label;
    return acc;
  },
  {}
);
var SELECTABLE_ROLES = ROLE_PRESETS.map((preset) => preset.id);

// src/modules/export-engine/index.ts
var DEFAULT_GENERATED_AT = "unknown";
function exportMarkdownReport(input) {
  const generatedAt = input.generatedAt ?? DEFAULT_GENERATED_AT;
  const lines = [
    `# OpenReady report for ${input.username || "unknown user"}`,
    "",
    `Generated: ${generatedAt}`,
    "",
    `Repositories analyzed: ${input.analyses.length}`,
    ""
  ];
  if (input.analyses.length === 0) {
    return [...lines, "No repositories were available for export.", ""].join("\n");
  }
  const totals = input.analyses.map((analysis) => analysis.score.total).filter((score) => score !== null);
  const averageScore = totals.length === 0 ? "N/A" : Math.round(totals.reduce((sum, score) => sum + score, 0) / totals.length).toString();
  const portfolioReady = input.analyses.filter(
    (analysis) => analysis.healthLabel === "Portfolio-ready"
  ).length;
  lines.push("## Profile summary", "");
  lines.push(`- Average score: ${averageScore}`);
  lines.push(`- Portfolio-ready repositories: ${portfolioReady}`);
  lines.push(`- Repositories needing work: ${countNeedsWork(input.analyses)}`);
  lines.push("");
  lines.push("## Repositories", "");
  for (const analysis of sortAnalyses(input.analyses)) {
    lines.push(`### ${analysis.repository.fullName}`);
    lines.push("");
    lines.push(`- Score: ${formatScore(analysis.score.total)}`);
    lines.push(`- Label: ${analysis.healthLabel}`);
    lines.push(`- URL: ${analysis.repository.url}`);
    if (analysis.repository.homepageUrl) {
      lines.push(`- Homepage: ${analysis.repository.homepageUrl}`);
    }
    lines.push(`- Strongest category: ${formatCategory(analysis, "strongest")}`);
    lines.push(`- Weakest category: ${formatCategory(analysis, "weakest")}`);
    lines.push(`- Missing signals: ${formatList(analysis.missingSignals)}`);
    lines.push("");
    lines.push("Top recommendations:");
    for (const recommendation of analysis.recommendations.slice(0, 3)) {
      lines.push(`- ${recommendation.title} (${recommendation.priority})`);
    }
    if (analysis.recommendations.length === 0) {
      lines.push("- No major missing signals detected.");
    }
    lines.push("");
  }
  return lines.join("\n");
}
function exportJsonSummary(input) {
  const summary = {
    schema: "openready.export.v1",
    generatedAt: input.generatedAt ?? DEFAULT_GENERATED_AT,
    username: input.username,
    repositoryCount: input.analyses.length,
    repositories: sortAnalyses(input.analyses).map((analysis) => ({
      ...input.customChecksByRepo ? { customChecks: input.customChecksByRepo[analysis.repository.id] ?? [] } : {},
      id: analysis.repository.id,
      name: analysis.repository.name,
      fullName: analysis.repository.fullName,
      url: analysis.repository.url,
      homepageUrl: analysis.repository.homepageUrl,
      description: analysis.repository.description,
      language: analysis.repository.language,
      topics: analysis.repository.topics,
      stars: analysis.repository.stars,
      forks: analysis.repository.forks,
      archived: analysis.repository.archived,
      fork: analysis.repository.fork,
      updatedAt: analysis.repository.updatedAt,
      pushedAt: analysis.repository.pushedAt,
      healthLabel: analysis.healthLabel,
      score: analysis.score,
      passedCount: analysis.passedCount,
      failedCount: analysis.failedCount,
      unknownCount: analysis.unknownCount,
      missingSignals: analysis.missingSignals,
      failedChecks: analysis.checks.filter((check) => check.status === "failed"),
      unknownChecks: analysis.checks.filter((check) => check.status === "unknown"),
      recommendations: analysis.recommendations
    }))
  };
  return `${JSON.stringify(summary, null, 2)}
`;
}
function sortAnalyses(analyses) {
  return [...analyses].sort((a, b) => {
    const scoreDelta = (b.score.total ?? -1) - (a.score.total ?? -1);
    if (scoreDelta !== 0) return scoreDelta;
    const starDelta = b.repository.stars - a.repository.stars;
    if (starDelta !== 0) return starDelta;
    return a.repository.fullName.localeCompare(b.repository.fullName);
  });
}
function countNeedsWork(analyses) {
  return analyses.filter(
    (analysis) => analysis.healthLabel === "Needs work" || analysis.healthLabel === "Experimental"
  ).length;
}
function formatScore(score) {
  return score === null ? "N/A" : `${score}/100`;
}
function formatCategory(analysis, type) {
  const categoryId = type === "strongest" ? analysis.score.strongestCategory : analysis.score.weakestCategory;
  const category = analysis.score.categories.find((candidate) => candidate.category === categoryId);
  if (!category) return "N/A";
  return `${category.label} (${formatScore(category.score)})`;
}
function formatList(values) {
  return values.length === 0 ? "None" : values.join("; ");
}

// src/modules/check-plugins/snapshot.ts
function buildCheckSnapshot(repository, readmeState, treeState, techSignals) {
  const readmeFound = readmeState?.status === "found";
  const readmeContent = readmeFound ? readmeState.readme.content : "";
  let treeAvailable = false;
  let truncated = false;
  let paths = [];
  if (treeState && (treeState.status === "found" || treeState.status === "truncated")) {
    treeAvailable = true;
    truncated = treeState.status === "truncated" || treeState.tree.truncated;
    paths = treeState.tree.entries.map((entry) => entry.path);
  }
  return {
    repository: { ...repository, topics: [...repository.topics] },
    readme: { found: readmeFound, content: readmeContent },
    tree: { available: treeAvailable, truncated, paths },
    techSignals: techSignals.map((signal) => ({ ...signal, evidence: [...signal.evidence] }))
  };
}
function createCheckContext(snapshot) {
  const topics = new Set(snapshot.repository.topics.map((topic) => topic.toLowerCase()));
  return {
    ...snapshot,
    hasPath(pattern) {
      if (!snapshot.tree.available) return false;
      const matcher = typeof pattern === "string" ? globToRegExp(pattern) : pattern;
      return snapshot.tree.paths.some((path) => matcher.test(path) || matcher.test(basename2(path)));
    },
    readmeMatches(pattern) {
      return pattern.test(snapshot.readme.content);
    },
    hasTopic(name) {
      return topics.has(name.toLowerCase());
    }
  };
}
function basename2(path) {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}
function globToRegExp(glob) {
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*") {
      if (glob[index + 1] === "*") {
        source += ".*";
        index += 1;
      } else {
        source += "[^/]*";
      }
    } else if (/[.+?^${}()|[\]\\]/.test(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }
  return new RegExp(`^${source}$`, "i");
}

// src/modules/check-plugins/run.ts
var VALID_STATUSES = /* @__PURE__ */ new Set([
  "passed",
  "failed",
  "not-applicable",
  "unknown"
]);
var ID_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
var MAX_EVIDENCE = 300;
function runCheckPlugins(plugins, snapshot) {
  const context = createCheckContext(snapshot);
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const plugin of plugins) {
    const id = typeof plugin?.id === "string" ? plugin.id.trim() : "";
    const label = typeof plugin?.label === "string" && plugin.label ? plugin.label : id || "Unnamed check";
    if (!ID_PATTERN.test(id)) {
      results.push(
        unknownResult(id || "invalid", label, `Invalid check id "${id}". Use "vendor/check-name".`)
      );
      continue;
    }
    if (seen.has(id)) {
      results.push(
        unknownResult(id, label, `Duplicate check id "${id}" \u2014 only the first is used.`)
      );
      continue;
    }
    seen.add(id);
    try {
      const output = plugin.run(context);
      if (!output || !VALID_STATUSES.has(output.status)) {
        results.push(unknownResult(id, label, "Check returned an invalid status."));
        continue;
      }
      results.push({
        id,
        label,
        category: plugin.category ?? "custom",
        status: output.status,
        evidence: clip(output.evidence),
        source: "plugin",
        pluginId: id
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push(unknownResult(id, label, `Check threw an error: ${message}`));
    }
  }
  return results;
}
function unknownResult(id, label, evidence) {
  return {
    id,
    label,
    category: "custom",
    status: "unknown",
    evidence: clip(evidence),
    source: "plugin",
    pluginId: id
  };
}
function clip(evidence) {
  if (typeof evidence !== "string" || evidence.length === 0) return void 0;
  return evidence.length > MAX_EVIDENCE ? `${evidence.slice(0, MAX_EVIDENCE - 1)}\u2026` : evidence;
}

// src/modules/check-plugins/validate.ts
var ID_PATTERN2 = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
function validatePackManifest(value) {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Manifest must be a JSON object." };
  }
  const manifest = value;
  if (manifest.schema !== "openready.pack.v1") {
    return { ok: false, error: 'Manifest "schema" must be "openready.pack.v1".' };
  }
  if (!isNonEmptyString(manifest.name)) {
    return { ok: false, error: 'Manifest "name" is required.' };
  }
  if (!isNonEmptyString(manifest.version)) {
    return { ok: false, error: 'Manifest "version" is required.' };
  }
  if (manifest.author !== void 0 && typeof manifest.author !== "string") {
    return { ok: false, error: 'Manifest "author" must be a string.' };
  }
  if (manifest.description !== void 0 && typeof manifest.description !== "string") {
    return { ok: false, error: 'Manifest "description" must be a string.' };
  }
  if (!Array.isArray(manifest.checkIds) || manifest.checkIds.length === 0 || !manifest.checkIds.every((id) => typeof id === "string" && ID_PATTERN2.test(id))) {
    return {
      ok: false,
      error: 'Manifest "checkIds" must be a non-empty array of "vendor/check-name" ids.'
    };
  }
  return {
    ok: true,
    manifest: {
      schema: "openready.pack.v1",
      name: manifest.name,
      version: manifest.version,
      author: manifest.author,
      description: manifest.description,
      checkIds: manifest.checkIds
    }
  };
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// src/modules/check-plugins/official/index.ts
var checks = [
  {
    id: "openready/changelog",
    label: "Repository ships a CHANGELOG",
    category: "documentation",
    run: (ctx) => ({
      status: ctx.hasPath("CHANGELOG*") ? "passed" : "failed",
      evidence: ctx.hasPath("CHANGELOG*") ? void 0 : "No CHANGELOG file found \u2014 a changelog helps users track releases."
    })
  },
  {
    id: "openready/contributing",
    label: "Repository has contribution guidelines",
    category: "documentation",
    run: (ctx) => ({
      status: ctx.hasPath("CONTRIBUTING*") ? "passed" : "failed",
      evidence: ctx.hasPath("CONTRIBUTING*") ? void 0 : "No CONTRIBUTING file found \u2014 contribution guidelines lower the barrier for collaborators."
    })
  },
  {
    id: "openready/issue-templates",
    label: "Repository provides issue templates",
    category: "metadata",
    run: (ctx) => ({
      status: ctx.hasPath(".github/ISSUE_TEMPLATE/**") ? "passed" : "failed",
      evidence: ctx.hasPath(".github/ISSUE_TEMPLATE/**") ? void 0 : "No .github/ISSUE_TEMPLATE found \u2014 templates make bug reports more actionable."
    })
  },
  {
    id: "openready/license-file",
    label: "Repository commits a LICENSE file",
    category: "metadata",
    run: (ctx) => ({
      status: ctx.hasPath("LICENSE*") || ctx.hasPath("COPYING*") ? "passed" : "failed",
      evidence: ctx.hasPath("LICENSE*") || ctx.hasPath("COPYING*") ? void 0 : "No LICENSE file committed \u2014 a license file states reuse terms unambiguously."
    })
  }
];
var officialPack = {
  manifest: {
    schema: "openready.pack.v1",
    name: "OpenReady Official",
    version: "1.0.0",
    author: "OpenReady",
    description: "Reference repository-hygiene checks (changelog, contributing, issue templates, license file). Informational; never affects the built-in score.",
    checkIds: checks.map((check) => check.id)
  },
  checks
};

// src/modules/check-plugins/loadNode.ts
import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve, basename as basename3, join } from "node:path";
async function loadPacks(paths) {
  const packs = [];
  for (const path of paths) {
    packs.push(await loadPack(path));
  }
  return packs;
}
async function loadPack(path) {
  const absolute = resolve(path);
  const stats = await stat(absolute).catch(() => null);
  if (!stats) throw new Error(`Plugin path not found: ${path}`);
  if (stats.isDirectory()) {
    const manifestRaw = await readFile(join(absolute, "openready-pack.json"), "utf8").catch(() => {
      throw new Error(`Pack directory ${path} is missing openready-pack.json.`);
    });
    const validation = validatePackManifest(JSON.parse(manifestRaw));
    if (!validation.ok) throw new Error(`Invalid manifest in ${path}: ${validation.error}`);
    const entry = await firstExisting(absolute, ["index.mjs", "index.js", "pack.mjs"]);
    if (!entry) throw new Error(`Pack directory ${path} has no entry module (index.mjs/js).`);
    const checks3 = await importChecks(entry);
    return { manifest: validation.manifest, checks: checks3 };
  }
  const checks2 = await importChecks(absolute);
  return {
    manifest: {
      schema: "openready.pack.v1",
      name: basename3(absolute),
      version: "0.0.0",
      checkIds: checks2.map((check) => check.id)
    },
    checks: checks2
  };
}
async function importChecks(file) {
  const module = await import(
    /* @vite-ignore */
    pathToFileURL(file).href
  );
  const candidate = module.default ?? module.pack ?? module;
  if (isPack(candidate)) return candidate.checks;
  if (hasChecksArray(candidate)) return candidate.checks;
  if (Array.isArray(candidate) && candidate.every(isPlugin)) return candidate;
  throw new Error(`Module ${file} must default-export a CheckPack or an array of checks.`);
}
async function firstExisting(dir, names) {
  for (const name of names) {
    const candidate = join(dir, name);
    if (await stat(candidate).then(() => true).catch(() => false))
      return candidate;
  }
  return null;
}
function isPlugin(value) {
  return typeof value === "object" && value !== null && typeof value.id === "string" && typeof value.run === "function";
}
function hasChecksArray(value) {
  return typeof value === "object" && value !== null && Array.isArray(value.checks) && value.checks.every(isPlugin);
}
function isPack(value) {
  return typeof value === "object" && value !== null && typeof value.manifest === "object" && hasChecksArray(value);
}

// src/modules/profiles/index.ts
var SCORE_CATEGORIES2 = [
  "documentation",
  "presentation",
  "buildability",
  "maintainability",
  "testing-ci",
  "deployment-operations",
  "metadata-discoverability",
  "security"
];
function parseProfile(value) {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Profile must be a JSON object." };
  }
  const raw = value;
  if (raw.schema !== "openready.profile.v1") {
    return { ok: false, error: 'Profile "schema" must be "openready.profile.v1".' };
  }
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    return { ok: false, error: 'Profile "name" is required.' };
  }
  const weights = normalizeWeights(raw.categoryWeights);
  if (weights === null) {
    return {
      ok: false,
      error: 'Profile "categoryWeights" must map known categories to numbers \u2265 0.'
    };
  }
  let thresholds;
  if (raw.thresholds !== void 0) {
    if (typeof raw.thresholds !== "object" || raw.thresholds === null) {
      return { ok: false, error: 'Profile "thresholds" must be an object.' };
    }
    const failUnder = raw.thresholds.failUnder;
    if (failUnder !== void 0) {
      if (typeof failUnder !== "number" || failUnder < 0 || failUnder > 100) {
        return { ok: false, error: 'Profile "thresholds.failUnder" must be a number 0\u2013100.' };
      }
      thresholds = { failUnder };
    } else {
      thresholds = {};
    }
  }
  if (raw.role !== void 0 && typeof raw.role !== "string") {
    return { ok: false, error: 'Profile "role" must be a string.' };
  }
  if (raw.enabledPacks !== void 0 && (!Array.isArray(raw.enabledPacks) || !raw.enabledPacks.every((p) => typeof p === "string"))) {
    return { ok: false, error: 'Profile "enabledPacks" must be an array of strings.' };
  }
  return {
    ok: true,
    profile: {
      schema: "openready.profile.v1",
      name: raw.name,
      categoryWeights: weights,
      thresholds,
      role: raw.role,
      enabledPacks: raw.enabledPacks
    }
  };
}
function normalizeWeights(value) {
  if (typeof value !== "object" || value === null) return null;
  const entries = value;
  const weights = {};
  for (const [key, raw] of Object.entries(entries)) {
    if (!SCORE_CATEGORIES2.includes(key)) return null;
    if (typeof raw !== "number" || Number.isNaN(raw) || raw < 0) return null;
    weights[key] = raw;
  }
  return weights;
}

// src/cli/auth.ts
function applyGitHubAuth(flagToken, env) {
  const candidates = [flagToken, env.OPENREADY_GITHUB_TOKEN, env.GITHUB_TOKEN];
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      const trimmed = candidate.trim();
      setGitHubAuthToken(trimmed);
      return trimmed;
    }
  }
  setGitHubAuthToken(null);
  return null;
}

// src/cli/gating.ts
function evaluateGating(analyses, customByRepo, config) {
  const reasons = [];
  if (config.failUnder !== null) {
    for (const analysis of analyses) {
      const total = analysis.score.total;
      if (total !== null && total < config.failUnder) {
        reasons.push(
          `${analysis.repository.fullName} scored ${total}, below --fail-under ${config.failUnder}.`
        );
      }
    }
  }
  if (config.requireChecks.length > 0) {
    for (const analysis of analyses) {
      const results = customByRepo[analysis.repository.id] ?? [];
      for (const required of config.requireChecks) {
        const match = results.find((result) => result.id === required);
        if (!match) {
          reasons.push(`${analysis.repository.fullName} is missing required check ${required}.`);
        } else if (match.status !== "passed") {
          reasons.push(
            `${analysis.repository.fullName} failed required check ${required} (${match.status}).`
          );
        }
      }
    }
  }
  return { passed: reasons.length === 0, reasons };
}

// src/cli/renderers/color.ts
var SUPPORTS_COLOR = typeof process !== "undefined" && !process.env.NO_COLOR && Boolean(process.stdout && "isTTY" in process.stdout && process.stdout.isTTY);
function wrap(code, text) {
  if (!SUPPORTS_COLOR) return text;
  return `\x1B[${code}m${text}\x1B[0m`;
}
var color = {
  enabled: SUPPORTS_COLOR,
  dim: (text) => wrap(2, text),
  bold: (text) => wrap(1, text),
  red: (text) => wrap(31, text),
  green: (text) => wrap(32, text),
  yellow: (text) => wrap(33, text),
  blue: (text) => wrap(34, text),
  magenta: (text) => wrap(35, text),
  cyan: (text) => wrap(36, text),
  gray: (text) => wrap(90, text)
};

// src/cli/renderers/table.ts
var columns = [
  {
    header: "Repository",
    width: 28,
    cell: (a) => a.repository.name
  },
  {
    header: "Type",
    width: 18,
    cell: (a) => PROJECT_TYPE_LABELS[a.classification.type]
  },
  {
    header: "Health",
    width: 16,
    cell: (a) => a.healthLabel
  },
  {
    header: "Score",
    width: 6,
    align: "right",
    cell: (a) => a.score.total === null ? "\u2014" : String(a.score.total)
  },
  {
    header: "Weakest",
    width: 22,
    cell: (a) => a.score.categories.find((c) => c.category === a.score.weakestCategory)?.label ?? "\u2014"
  }
];
function renderTable(analyses, options) {
  const lines = [];
  lines.push(color.bold(`OpenReady analysis \xB7 ${options.username}`));
  const meta = `${options.analyzedCount}/${options.totalFetched} repositories${options.tokenInUse ? " \xB7 token: yes" : ""}`;
  lines.push(color.dim(meta));
  lines.push("");
  lines.push(
    columns.map((column) => color.bold(padCell(column.header, column.width, column.align ?? "left"))).join("  ")
  );
  lines.push(columns.map((column) => color.dim("\u2500".repeat(column.width))).join("  "));
  for (const analysis of analyses) {
    lines.push(
      columns.map((column) => {
        const value = column.cell(analysis);
        const padded = padCell(value, column.width, column.align ?? "left");
        return tintCell(column, analysis, padded);
      }).join("  ")
    );
    if (analysis.missingSignals[0]) {
      lines.push(`    ${color.gray("\u21B3 " + analysis.missingSignals[0])}`);
    }
  }
  lines.push("");
  lines.push(legend());
  return lines.join("\n");
}
function tintCell(column, analysis, padded) {
  if (column.header === "Score") return scoreColor(analysis.score.total)(padded);
  if (column.header === "Health") return healthColor(analysis.healthLabel)(padded);
  return padded;
}
function scoreColor(score) {
  if (score === null) return color.gray;
  if (score >= 85) return color.green;
  if (score >= 70) return color.cyan;
  if (score >= 50) return color.yellow;
  return color.red;
}
function healthColor(label) {
  switch (label) {
    case "Portfolio-ready":
      return color.green;
    case "Almost ready":
      return color.cyan;
    case "Needs work":
    case "Stale":
      return color.yellow;
    case "Experimental":
    case "Archived":
      return color.red;
    case "Fork":
    case "Analyzing":
      return color.gray;
  }
}
function legend() {
  return color.dim(
    "Legend: green \u2265 85 \xB7 cyan \u2265 70 \xB7 yellow \u2265 50 \xB7 red < 50. Use --format json/markdown for full evidence."
  );
}
function padCell(value, width, align) {
  const truncated = value.length > width ? value.slice(0, Math.max(0, width - 1)) + "\u2026" : value;
  if (truncated.length >= width) return truncated;
  const pad = " ".repeat(width - truncated.length);
  return align === "right" ? pad + truncated : truncated + pad;
}

// src/cli/run.ts
async function runAnalyze(args) {
  const token = applyGitHubAuth(args.token, process.env);
  let profile = null;
  if (args.profile) {
    try {
      profile = await loadProfileFile(args.profile);
    } catch (error) {
      return usageFail(error);
    }
  }
  let packs = [];
  if (args.plugins.length > 0 && args.allowPlugins) {
    try {
      packs = await loadPacks(args.plugins);
    } catch (error) {
      return usageFail(error);
    }
  }
  const plugins = packs.flatMap((pack) => pack.checks);
  let repositories;
  try {
    repositories = await fetchUserRepositories(args.username);
  } catch (error) {
    return fail(error);
  }
  let selected = repositories;
  if (args.repo) {
    const needle = args.repo.toLowerCase();
    selected = repositories.filter(
      (repository) => repository.name.toLowerCase() === needle || repository.fullName.toLowerCase() === needle
    );
    if (selected.length === 0) {
      process.stderr.write(
        `openready: no repository matched --repo ${args.repo} for user ${args.username}.
`
      );
      return { exitCode: 3 };
    }
  }
  const limited = selected.slice(0, args.limit);
  if (limited.length === 0) {
    process.stderr.write(`openready: ${args.username} has no public repositories to analyze.
`);
    return { exitCode: 0 };
  }
  const readmes = {};
  if (args.fetchReadme) {
    await Promise.all(
      limited.map(async (repository) => {
        const [owner, repo] = repository.fullName.split("/");
        try {
          const readme = await fetchRepositoryReadme(owner, repo);
          readmes[repository.id] = readme ? { status: "found", readme } : { status: "missing" };
        } catch (error) {
          readmes[repository.id] = {
            status: "unknown",
            message: error instanceof Error ? error.message : "README could not be fetched."
          };
        }
      })
    );
  }
  const trees = {};
  if (args.fetchTree) {
    await Promise.all(
      limited.map(async (repository) => {
        const [owner, repo] = repository.fullName.split("/");
        try {
          const tree = await fetchRepositoryTree(owner, repo, repository.defaultBranch);
          if (!tree) {
            trees[repository.id] = { status: "empty" };
            return;
          }
          trees[repository.id] = tree.truncated ? { status: "truncated", tree } : { status: "found", tree };
        } catch (error) {
          trees[repository.id] = {
            status: "unknown",
            message: error instanceof Error ? error.message : "Tree could not be fetched."
          };
        }
      })
    );
  }
  const analyses = analyzeRepositories(
    limited,
    readmes,
    trees,
    /* @__PURE__ */ new Date(),
    {},
    profile?.categoryWeights ?? {}
  );
  const customChecksByRepo = {};
  if (plugins.length > 0) {
    for (const repository of limited) {
      const snapshot = buildCheckSnapshot(
        repository,
        readmes[repository.id],
        trees[repository.id],
        collectTechSignals(trees[repository.id])
      );
      customChecksByRepo[repository.id] = runCheckPlugins(plugins, snapshot);
    }
  }
  const rendered = render(args.format, analyses, {
    username: args.username,
    tokenInUse: Boolean(token),
    totalFetched: repositories.length,
    analyzedCount: analyses.length,
    customChecksByRepo: plugins.length > 0 ? customChecksByRepo : void 0
  });
  await emit(rendered, args.out);
  const failUnder = args.failUnder ?? profile?.thresholds?.failUnder ?? null;
  const gate = evaluateGating(analyses, customChecksByRepo, {
    failUnder,
    requireChecks: args.requireChecks
  });
  if (!gate.passed) {
    for (const reason of gate.reasons) {
      process.stderr.write(`openready: gate: ${reason}
`);
    }
    const noun = gate.reasons.length === 1 ? "violation" : "violations";
    process.stderr.write(`openready: gate failed with ${gate.reasons.length} ${noun}.
`);
    return { exitCode: 4 };
  }
  return { exitCode: 0 };
}
async function loadProfileFile(path) {
  let raw;
  try {
    raw = await readFile2(path, "utf8");
  } catch {
    throw new Error(`Profile file not found or unreadable: ${path}`);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Profile file is not valid JSON: ${path}`);
  }
  const parsed = parseProfile(json);
  if (!parsed.ok) throw new Error(`Invalid profile ${path}: ${parsed.error}`);
  return parsed.profile;
}
function render(format, analyses, options) {
  if (format === "json") {
    return exportJsonSummary({
      username: options.username,
      analyses,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      customChecksByRepo: options.customChecksByRepo
    });
  }
  if (format === "markdown") {
    return exportMarkdownReport({
      username: options.username,
      analyses,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return renderTable(analyses, options);
}
async function emit(content, out) {
  if (out) {
    await writeFile(out, content.endsWith("\n") ? content : content + "\n");
    process.stderr.write(`Wrote analysis to ${out}
`);
    return;
  }
  process.stdout.write(content.endsWith("\n") ? content : content + "\n");
}
function usageFail(error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`openready: ${message}
`);
  return { exitCode: 2 };
}
function fail(error) {
  if (error instanceof GitHubClientError) {
    process.stderr.write(`openready: ${error.message}
`);
    return { exitCode: 1 };
  }
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`openready: ${message}
`);
  return { exitCode: 1 };
}

// src/cli/badge.ts
import { readFile as readFile3, writeFile as writeFile2 } from "node:fs/promises";

// src/modules/badge/index.ts
var DEFAULT_LABEL = "openready";
function scoreToColor(total) {
  if (total === null) return "lightgrey";
  if (total >= 85) return "brightgreen";
  if (total >= 70) return "green";
  if (total >= 50) return "yellow";
  return "red";
}
function badgeFromExport(summary, options = {}) {
  const repositories = readRepositories(summary);
  if (repositories === null) {
    return {
      ok: false,
      code: "invalid-input",
      error: "expected an openready.export.v1 JSON summary (from `analyze --format json`)."
    };
  }
  let selected = repositories;
  if (options.repo) {
    const needle = options.repo.toLowerCase();
    selected = repositories.filter(
      (repository) => repository.name.toLowerCase() === needle || repository.fullName.toLowerCase() === needle
    );
    if (selected.length === 0) {
      return {
        ok: false,
        code: "repo-not-found",
        error: `no repository matched --repo ${options.repo} in the report.`
      };
    }
  }
  const totals = selected.map((repository) => repository.total).filter((total) => total !== null);
  const score = totals.length === 0 ? null : Math.round(totals.reduce((sum, total) => sum + total, 0) / totals.length);
  return {
    ok: true,
    badge: {
      label: options.label?.trim() || DEFAULT_LABEL,
      message: score === null ? "unavailable" : `${score}/100`,
      color: scoreToColor(score)
    }
  };
}
function renderBadgeEndpoint(badge) {
  const endpoint = {
    schemaVersion: 1,
    label: badge.label,
    message: badge.message,
    color: badge.color
  };
  return `${JSON.stringify(endpoint, null, 2)}
`;
}
var COLOR_HEX = {
  brightgreen: "#4c1",
  green: "#97ca00",
  yellow: "#dfb317",
  red: "#e05d44",
  lightgrey: "#9f9f9f"
};
function renderBadgeSvg(badge) {
  const labelWidth = textWidth(badge.label);
  const messageWidth = textWidth(badge.message);
  const width = labelWidth + messageWidth;
  const hex = COLOR_HEX[badge.color];
  const label = escapeXml(badge.label);
  const message = escapeXml(badge.message);
  const title = `${label}: ${message}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${title}">
  <title>${title}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${hex}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${message}</text>
  </g>
</svg>
`;
}
function readRepositories(summary) {
  if (typeof summary !== "object" || summary === null) return null;
  const record = summary;
  if (record.schema !== "openready.export.v1") return null;
  if (!Array.isArray(record.repositories)) return null;
  const repositories = [];
  for (const entry of record.repositories) {
    if (typeof entry !== "object" || entry === null) return null;
    const repo = entry;
    if (typeof repo.name !== "string" || typeof repo.fullName !== "string") return null;
    const score = repo.score;
    const total = score && typeof score.total === "number" ? score.total : null;
    repositories.push({ name: repo.name, fullName: repo.fullName, total });
  }
  return repositories;
}
function textWidth(text) {
  return Math.round(text.length * 6.5) + 12;
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// src/cli/badge.ts
async function runBadge(args) {
  let raw;
  try {
    raw = await readFile3(args.from, "utf8");
  } catch {
    process.stderr.write(`openready: report file not found or unreadable: ${args.from}
`);
    return { exitCode: 2 };
  }
  let summary;
  try {
    summary = JSON.parse(raw);
  } catch {
    process.stderr.write(`openready: report file is not valid JSON: ${args.from}
`);
    return { exitCode: 2 };
  }
  const result = badgeFromExport(summary, { repo: args.repo, label: args.label });
  if (!result.ok) {
    process.stderr.write(`openready: ${result.error}
`);
    return { exitCode: result.code === "repo-not-found" ? 3 : 2 };
  }
  const rendered = args.format === "svg" ? renderBadgeSvg(result.badge) : renderBadgeEndpoint(result.badge);
  await emit2(rendered, args.out);
  return { exitCode: 0 };
}
async function emit2(content, out) {
  if (out) {
    await writeFile2(out, content.endsWith("\n") ? content : content + "\n");
    process.stderr.write(`Wrote badge to ${out}
`);
    return;
  }
  process.stdout.write(content.endsWith("\n") ? content : content + "\n");
}

// src/cli/index.ts
var HELP = `openready \u2014 deterministic GitHub repository analysis

Usage:
  openready analyze <username> [options]
  openready badge --from <report.json> [options]
  openready --help
  openready --version

Options (analyze):
  --format <table|json|markdown>   Output format (default: table)
  --limit <n>                      Max repositories to analyze (default: 30)
  --repo <name>                    Focus a single repository by name
  --out <path>                     Write output to a file instead of stdout
  --token <value>                  GitHub token (falls back to
                                   OPENREADY_GITHUB_TOKEN, then GITHUB_TOKEN)
  --no-readme                      Skip README fetches
  --no-tree                        Skip file-tree fetches
  --profile <path>                 Apply an openready.profile.v1 JSON file
                                   (category weights, failUnder threshold)
  --plugins <path>                 Load a check pack (file or directory).
                                   Repeatable. Requires --allow-plugins
  --allow-plugins                  Consent to run third-party pack code
  --fail-under <n>                 Exit 4 if any repository scores below n
  --require-check <id>             Exit 4 unless the custom check passes for
                                   every repository. Repeatable

Options (badge):
  --from <path>                    JSON report from \`analyze --format json\`
  --repo <name>                    Badge a single repository from the report
                                   (default: average across repositories)
  --format <endpoint|svg>          shields.io endpoint JSON or a static SVG
                                   (default: endpoint)
  --label <text>                   Badge label text (default: openready)
  --out <path>                     Write the badge to a file instead of stdout

Examples:
  openready analyze octocat
  openready analyze octocat --format json --out report.json
  openready analyze octocat --repo Hello-World --no-tree
  openready analyze octocat --fail-under 70 --profile team.json
  openready analyze octocat --plugins ./acme-pack --allow-plugins \\
    --require-check acme/has-changelog
  openready badge --from report.json --format svg --out badge.svg

Install:
  npm install -g openready         then: openready analyze octocat
  npx openready analyze octocat    one-off, no install

Running from a source checkout:
  pnpm cli -- analyze octocat
  node dist-cli/openready.mjs analyze octocat
`;
function readVersion() {
  if (true) return "0.5.5";
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve2(here, "../../package.json"), "utf8"));
    if (typeof pkg.version === "string") return pkg.version;
  } catch {
  }
  return "0.0.0";
}
async function main(argv) {
  const command = parseCliArgs(argv.slice(2));
  switch (command.kind) {
    case "help":
      process.stdout.write(HELP);
      return 0;
    case "version":
      process.stdout.write(`openready ${readVersion()}
`);
      return 0;
    case "error":
      process.stderr.write(`openready: ${command.message}
`);
      return 2;
    case "analyze": {
      const { exitCode } = await runAnalyze(command);
      return exitCode;
    }
    case "badge": {
      const { exitCode } = await runBadge(command);
      return exitCode;
    }
  }
}
main(process.argv).then(
  (code) => process.exit(code),
  (error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`openready: ${message}
`);
    process.exit(1);
  }
);
