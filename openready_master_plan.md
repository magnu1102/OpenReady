# OpenReady Master Plan

Mission statement, product constitution, architecture outlook and long-term roadmap.

---

## 1. Working identity

**Working name:** OpenReady  
**Product type:** Open-source desktop application, with optional CLI, web, GitHub Action and AI-assisted extensions later  
**Primary platform target:** Windows first, then macOS/Linux if practical  
**Recommended app framework:** Tauri + React + TypeScript  
**Primary purpose:** Help developers understand, improve and present their GitHub repositories clearly.

OpenReady is a local-first desktop application that analyzes public GitHub repositories and turns repository metadata, documentation signals and project structure into clear, actionable feedback.

The product should be useful for individual developers, students, job seekers, maintainers, small teams and portfolio builders. It should help users answer a simple but valuable question:

> Which of my repositories are actually ready to show to someone else, and what should I improve next?

OpenReady should not be just another GitHub statistics dashboard. It should combine repository health, documentation quality, portfolio readiness and developer-facing guidance into a simple, well-designed desktop tool.

---

## 2. Product mission

OpenReady exists to make GitHub repositories easier to evaluate, improve and present.

Many developers have useful projects that are difficult for others to understand because the repositories lack clear READMEs, screenshots, setup instructions, license information, CI status, examples, architecture notes or visible project purpose. This is especially common for students, junior developers, portfolio builders and people who work on many side projects over time.

OpenReady should help users turn scattered repositories into a coherent, understandable technical portfolio.

The long-term mission is:

> OpenReady helps developers maintain a healthier, clearer and more presentable GitHub presence by analyzing repositories, explaining what is missing, and generating practical next steps.

---

## 3. Product constitution

These principles should guide all future planning and implementation.

### 3.1 Open-source first

OpenReady should be open-source from the beginning. The project should be easy to inspect, run, fork and improve.

The application itself should demonstrate the same values it promotes:

- clear README
- clean setup instructions
- visible roadmap
- good issue templates later
- transparent limitations
- maintainable code
- useful screenshots
- thoughtful release notes

The project should be designed as a real tool for other users, not only as a personal portfolio helper.

### 3.2 Useful in under five minutes

A new user should be able to get value quickly.

The ideal first experience:

1. Download or run OpenReady.
2. Enter a GitHub username.
3. Analyze public repositories.
4. See clear repository health and readiness insights.
5. Export a useful report.

The first useful version should not require:

- a database
- a cloud account
- OAuth setup
- Docker
- paid AI keys
- private repository access
- complex configuration

Advanced features can be added later, but the default mode should stay simple.

### 3.3 Local-first by default

OpenReady should do as much work locally as possible.

The default mode should:

- analyze public repositories
- use deterministic checks
- store data locally if needed
- avoid uploading repository contents elsewhere
- avoid requiring accounts or external services beyond GitHub’s public API

If private repository analysis, sync or AI features are added later, they should be explicit opt-in features.

### 3.4 AI-compatible, not AI-dependent

OpenReady may eventually include optional AI-assisted features, but the core product should not depend on AI.

The application should be useful without:

- OpenAI keys
- Anthropic keys
- local LLM setup
- paid inference
- cloud model calls

AI can later support:

- README critique
- project summaries
- CV bullets
- homepage text suggestions
- category inference
- tone/style improvements
- role-specific portfolio recommendations

But deterministic analysis must remain the foundation.

### 3.5 Transparent scoring

OpenReady should never give a mysterious score without explanation.

If a repository gets a readiness score, the app must explain what contributed to it.

Example:

```text
Portfolio readiness: 74/100

Strong signals:
- README exists
- Tech stack detected
- GitHub Actions workflow found
- Dockerfile found

Missing signals:
- No screenshots found
- No license detected
- No setup instructions found
- No demo link configured
```

Scores should be understandable, inspectable and adjustable in later versions.

### 3.6 Helpful, not judgmental

OpenReady should act like a practical project coach, not a linter that shames the user.

Avoid:

```text
Your README is bad.
```

Prefer:

```text
This README would be easier to evaluate if it included screenshots, setup instructions and a short explanation of why the project exists.
```

The tone should be calm, constructive and useful.

### 3.7 General repository health first, job-market mode later

The first versions should focus on general repository health and presentation quality.

Job-market and portfolio-specific guidance should be part of the master plan, but not the first dependency.

Initial focus:

- documentation quality
- project clarity
- maintainability signals
- setup quality
- licensing
- CI/build signals
- activity and metadata
- technology detection

Later expansion:

- job role matching
- portfolio homepage export
- CV bullet generation
- recruiter-friendly summaries
- interview talking points

### 3.8 Designed for multiple personas

OpenReady should eventually serve several user types:

- students building their first portfolio
- junior developers applying for jobs
- experienced developers cleaning up public repositories
- maintainers improving open-source project onboarding
- bootcamp/course participants
- small teams wanting a repo quality overview
- consultants who want presentable project showcases

The product should stay simple enough for beginners, but useful enough for experienced users.

### 3.9 Presentation matters

OpenReady should not be visually generic.

The app should have a polished desktop interface that communicates quality:

- strong typography
- intentional spacing
- clear visual hierarchy
- calm dashboard design
- good empty states
- helpful onboarding
- smooth interactions
- accessible color contrast
- keyboard-friendly navigation
- dark/light mode eventually

OpenReady should itself feel portfolio-ready.

### 3.10 Contribution and AI-agent policy

AI agents must not add themselves as contributors.

Do not add any of the following as contributors, co-authors, maintainers or collaborators:

- Claude
- ChatGPT
- Codex
- OpenAI
- Anthropic
- any AI model
- any AI coding agent

Do not add:

- “Generated by Claude”
- “Generated by ChatGPT”
- “Co-authored-by” lines for AI tools
- AI attribution footers
- AI metadata in README files, commits, comments or documentation

The project should remain the user’s own public portfolio and open-source project.

---

## 4. Strategic product decision

The project should start as a desktop application, not as a backend-heavy web platform.

Recommended direction:

> OpenReady Desktop: a local-first desktop app that analyzes GitHub repositories and exports actionable reports.

Why desktop first:

- easier for non-technical users than a self-hosted web app
- no backend server required
- no database required in early phases
- produces a concrete `.exe` / installer deliverable
- strong portfolio signal because it shows real app packaging
- easier to keep local-first and privacy-respecting
- avoids the project becoming overbuilt too early

The long-term project can still grow into:

- CLI tool
- reusable analysis engine
- web dashboard
- homepage export format
- GitHub Action
- optional AI assistant
- plugin system

But the first product shape should be a real desktop app.

---

## 5. Technology direction

### 5.1 Recommended core stack

- **Tauri** for desktop app shell
- **React** for UI
- **TypeScript** for frontend correctness
- **Rust** for Tauri backend commands where needed
- **GitHub REST API** for public repository data
- **Local storage** for cached analysis results and settings
- **Markdown/JSON export** for reports

### 5.2 Why Tauri

Tauri allows building desktop applications with a web frontend while using a Rust-based backend/runtime. It is a strong fit because OpenReady benefits from a polished frontend, local desktop packaging and lightweight distribution.

The project should not overuse Rust early. Rust should mostly be used where Tauri requires it or where local filesystem/app integration is needed. The main product logic can start in TypeScript and later be moved into a reusable core if needed.

### 5.3 Why not a traditional web app first

A web app would require more setup decisions early:

- hosting
- backend
- API server
- database
- authentication
- rate limit handling across users
- secrets management
- deployment

Those may be valuable later, but they make the first useful product harder.

### 5.4 Why not AI first

AI could be useful later, but it introduces:

- cost
- API keys
- privacy questions
- unpredictable outputs
- dependency on external services
- harder open-source onboarding

OpenReady should prove its usefulness with deterministic analysis first.

---

## 6. Core user experience

### 6.1 First-use flow

A first-time user should experience something like this:

1. Launch OpenReady.
2. See a short explanation of what the app does.
3. Enter a GitHub username.
4. Optionally add a GitHub token for higher rate limits.
5. Click “Analyze repositories”.
6. See progress while repositories are fetched and checked.
7. Land on a dashboard with grouped repository results.
8. Click into a repository for detailed findings.
9. Export a Markdown or JSON report.

### 6.2 Primary screens

#### Welcome / Start screen

Purpose:

- explain the product simply
- ask for GitHub username
- explain optional token support
- show privacy/local-first note

#### Analysis progress screen

Purpose:

- show what is being checked
- prevent the app from feeling frozen
- expose rate-limit or API issues clearly

Possible progress steps:

- fetching repositories
- checking repository metadata
- checking README files
- checking license files
- checking workflows
- detecting technologies
- generating scores
- preparing dashboard

#### Dashboard screen

Purpose:

- give a high-level overview of all analyzed repositories

Possible sections:

- repository count
- average health score
- portfolio-ready count
- repositories needing attention
- missing common signals
- technology distribution
- recently updated repos
- hidden gems

#### Repository detail screen

Purpose:

- show transparent scoring and concrete next steps for one repository

Possible sections:

- summary
- score breakdown
- detected technologies
- documentation checks
- build/setup checks
- maintainability checks
- presentation checks
- suggested improvements
- export snippets

#### Export screen

Purpose:

- generate reusable outputs

Export formats:

- Markdown report
- JSON project list
- homepage cards JSON
- portfolio summary Markdown
- CSV later

#### Settings screen

Purpose:

- manage local settings
- optional GitHub token
- cache behavior
- scoring preferences later
- theme
- AI features later

---

## 7. Repository analysis model

OpenReady should analyze repositories through layered checks.

### 7.1 Repository metadata checks

Signals from GitHub repository metadata:

- name
- description
- topics
- homepage/demo URL
- language
- stars/forks/watchers
- archived status
- fork status
- visibility
- created date
- last pushed date
- default branch
- license field if available

Useful questions:

- Does the repository have a clear description?
- Is it recently maintained?
- Is it archived?
- Does it have topics/tags?
- Does it point to a live demo or homepage?
- Is it a fork or original project?

### 7.2 Documentation checks

Core files:

- README.md
- LICENSE
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- SECURITY.md
- CHANGELOG.md
- docs/ folder

README section detection:

- project purpose
- features
- screenshots/demo
- tech stack
- installation/setup
- usage
- architecture
- configuration
- testing
- deployment
- limitations
- roadmap/future work

Initial section detection can be rule-based and pattern-based.

### 7.3 Buildability checks

Detect setup/build files:

- package.json
- pnpm-lock.yaml / yarn.lock / package-lock.json
- pyproject.toml
- requirements.txt
- Cargo.toml
- go.mod
- build.gradle / build.gradle.kts
- Dockerfile
- docker-compose.yml
- Makefile
- justfile
- .env.example

Useful questions:

- Can a user infer how to run the project?
- Are dependencies visible?
- Is there an example environment file?
- Is there Docker support?
- Are build commands documented?

### 7.4 Testing and CI checks

Detect:

- tests/ folder
- **tests** folder
- test scripts in package.json
- pytest config
- GitHub Actions workflows
- CI badges in README
- coverage config

Useful questions:

- Are tests present?
- Is there a CI workflow?
- Does README show build status?
- Is the project likely maintained with automated checks?

### 7.5 Deployment and operations checks

Detect:

- Dockerfile
- docker-compose.yml
- Kubernetes manifests
- Helm charts
- Terraform/OpenTofu files
- deployment documentation
- health endpoints mentioned
- monitoring/observability docs
- runbooks

These checks matter especially for infrastructure, backend and full-stack repositories.

### 7.6 Presentation checks

Detect:

- screenshots in README
- images in docs/assets
- demo GIFs
- video links
- GitHub Pages/homepage URL
- badges
- architecture diagrams

Useful questions:

- Can someone understand the project quickly?
- Does the repository show what the project looks like?
- Are there visuals for complex architecture?

### 7.7 Security hygiene checks

Initial checks should be light and safe:

- .env.example exists
- no obvious `.env` committed
- SECURITY.md exists for larger projects
- dependency scanning workflow later
- secret scanning warning if suspicious filenames are present

OpenReady should not attempt deep security scanning early. That can become a separate advanced module.

---

## 8. Project type classification

Repositories should not all be evaluated the same way.

OpenReady should eventually classify repositories into broad types and apply relevant expectations.

### 8.1 Initial project types

- Frontend app
- Backend/API
- Full-stack app
- Desktop app
- CLI tool
- Android/mobile app
- AI/LLM project
- Data/analytics project
- Infrastructure/DevOps project
- Library/package
- Documentation/research project
- Experimental/prototype
- Archived/inactive

### 8.2 Type-specific expectations

#### Frontend app

Important signals:

- screenshots
- demo link
- install/run instructions
- component structure
- responsive design notes
- accessibility notes if relevant

#### Backend/API

Important signals:

- API documentation
- environment config
- tests
- Docker support
- health endpoint
- database setup

#### Full-stack app

Important signals:

- architecture diagram
- frontend/backend setup
- database setup
- Docker Compose
- screenshots
- deployment notes

#### Desktop app

Important signals:

- install/run instructions
- screenshots
- release artifacts
- platform support
- signing/distribution notes

#### Android/mobile app

Important signals:

- screenshots
- build instructions
- minimum SDK
- feature list
- accessibility notes
- privacy notes

#### AI/LLM project

Important signals:

- limitations
- data/source explanation
- evaluation method
- cost/API-key notes
- deterministic fallback if relevant
- safety/guardrail notes

#### Infrastructure/DevOps project

Important signals:

- architecture diagrams
- runbooks
- Docker/Kubernetes/IaC files
- monitoring notes
- failure scenarios
- safe usage warnings

#### Library/package

Important signals:

- installation
- usage examples
- API reference
- versioning
- tests
- license

---

## 9. Scoring system outlook

The scoring system should start simple and grow over time.

### 9.1 Score categories

Suggested top-level categories:

1. Documentation
2. Presentation
3. Buildability
4. Maintainability
5. Testing/CI
6. Deployment/operations
7. Metadata/discoverability
8. Security hygiene

### 9.2 Score labels

Use human-readable labels alongside numeric scores.

Possible labels:

- Portfolio-ready
- Almost ready
- Needs documentation
- Needs setup instructions
- Needs presentation polish
- Experimental
- Archived
- Hidden gem

### 9.3 Hidden gem concept

A “hidden gem” is a repository that appears technically substantial but poorly presented.

Possible hidden gem signals:

- many source files
- clear tech stack
- recent activity
- tests or CI present
- weak README
- no screenshots
- no repo description

This could become one of OpenReady’s most useful features.

### 9.4 Scoring transparency

Every score must be explainable.

The app should show:

- what was checked
- what passed
- what failed
- what was not applicable
- what was unknown

Never show a score without the evidence behind it.

### 9.5 Custom scoring later

Advanced users may eventually define their own scoring rules:

- strict open-source maintainer mode
- job-seeker portfolio mode
- classroom/course mode
- enterprise/team repository mode
- minimal/private mode

This is a later feature, not an MVP requirement.

---

## 10. AI expansion model

AI is deferred, but the architecture should leave room for it.

### 10.1 AI should be optional

AI features should require explicit enablement.

The user should be able to choose:

- no AI
- bring your own API key
- local model later
- perhaps hosted mode much later

### 10.2 AI should not replace deterministic checks

AI can enhance interpretation, wording and prioritization. It should not replace core evidence collection.

Bad:

```text
AI decides whether the repo is good.
```

Good:

```text
OpenReady detects missing screenshots, weak setup instructions and no license. AI optionally suggests a clearer README summary.
```

### 10.3 Possible AI features later

- README critique
- README rewrite suggestions
- generated project summary
- homepage card copy
- CV bullet generation
- LinkedIn project description
- role-specific project selection
- interview talking points
- documentation gap explanation
- issue/roadmap suggestions

### 10.4 AI privacy and cost principles

If AI is added:

- users must understand what content is sent
- users must opt in
- users should be able to redact or limit content
- costs should be clear
- no hidden background model calls
- deterministic mode must remain available

---

## 11. Export and integration vision

OpenReady should not only analyze repositories. It should help users reuse the results.

### 11.1 Export formats

Potential exports:

- Markdown report
- JSON summary
- homepage project cards JSON
- CSV overview
- GitHub profile README section
- LinkedIn-ready project summaries later
- CV bullet suggestions later

### 11.2 Homepage integration

OpenReady could export a file like:

```json
{
  "projects": [
    {
      "name": "OpenReady",
      "summary": "Desktop app for analyzing GitHub repository health and portfolio readiness.",
      "technologies": ["Tauri", "React", "TypeScript"],
      "status": "In development",
      "githubUrl": "https://github.com/...",
      "featured": true
    }
  ]
}
```

A personal homepage could then consume this file.

### 11.3 GitHub profile README integration

OpenReady could generate a project section like:

```md
## Featured Projects

### OpenReady

Desktop app for analyzing GitHub repository health, documentation quality and portfolio readiness.

**Tech:** Tauri, React, TypeScript, GitHub API
```

### 11.4 Future API / plugin possibility

If the project grows, OpenReady could expose:

- CLI command output
- JSON schema
- plugin-based checks
- GitHub Action integration
- static site export

---

## 12. Architecture outlook

The architecture should support gradual growth without forcing all complexity into the first release.

### 12.1 Early architecture

```text
Tauri desktop app
  ├── React/TypeScript UI
  ├── GitHub API client
  ├── deterministic analyzer
  ├── local cache/settings
  └── report exporter
```

### 12.2 Mature architecture

```text
OpenReady
  ├── apps/
  │   ├── desktop/
  │   ├── cli/
  │   └── web/                 optional later
  │
  ├── packages/
  │   ├── analyzer-core/
  │   ├── github-client/
  │   ├── scoring-engine/
  │   ├── report-exporters/
  │   ├── ai-adapters/         optional later
  │   └── shared-types/
  │
  ├── docs/
  ├── examples/
  └── tests/
```

This structure should not necessarily be implemented immediately. It represents a long-term direction.

### 12.3 Core modules

#### GitHub client

Responsibilities:

- fetch user repositories
- fetch repository contents
- fetch README
- fetch workflows
- handle rate limits
- handle authentication token if provided

#### Repository analyzer

Responsibilities:

- run deterministic checks
- classify project type
- detect tech stack
- detect documentation signals
- detect setup/build signals

#### Scoring engine

Responsibilities:

- apply scoring rules
- produce transparent score breakdown
- mark checks as passed/failed/not applicable/unknown

#### Recommendation engine

Responsibilities:

- convert findings into next steps
- prioritize highest-impact improvements
- provide constructive wording

#### Export engine

Responsibilities:

- Markdown report
- JSON output
- homepage cards
- future CV/homepage outputs

#### UI layer

Responsibilities:

- dashboard
- detail views
- filtering/sorting
- export controls
- settings
- onboarding

#### AI adapter layer later

Responsibilities:

- optional AI provider configuration
- prompt templates
- content redaction rules
- cost/usage visibility
- generated suggestions

---

## 13. Suggested long-term phase outlook

This is not an implementation plan. Each phase should receive its own focused planning session before implementation.

### Phase 0: Product foundation and design direction

Goal: Define product identity, core principles, basic UX direction and initial technical choices.

Possible outputs:

- this master plan
- README skeleton
- initial issue roadmap
- design inspiration notes
- contribution policy

### Phase 1: Desktop app skeleton

Goal: Create the first runnable desktop application.

Possible outputs:

- Tauri app created
- React/TypeScript frontend running
- basic navigation
- app shell layout
- welcome screen
- settings placeholder
- initial styling system

### Phase 2: GitHub public repository fetch

Goal: Fetch public repositories for a username.

Possible outputs:

- username input
- GitHub API client
- public repository list
- loading/error/rate-limit states
- basic repo cards
- no scoring yet

### Phase 3: Basic deterministic checks

Goal: Analyze simple repository signals.

Possible outputs:

- README presence
- license presence
- description presence
- topics presence
- homepage/demo URL presence
- recent activity
- archived/fork status
- basic health labels

### Phase 4: Detailed file and tech-stack detection

Goal: Inspect repository contents and detect technologies.

Possible outputs:

- package.json detection
- Python config detection
- Docker detection
- GitHub Actions detection
- Android/Gradle detection
- Terraform/Kubernetes detection
- docs folder detection
- test folder detection

### Phase 5: Scoring engine v1

Goal: Turn findings into transparent scores and labels.

Possible outputs:

- category scores
- total score
- evidence list
- not-applicable handling
- initial labels such as portfolio-ready/almost-ready/needs-docs

### Phase 6: Repository detail view

Goal: Make findings useful per repository.

Possible outputs:

- detailed repository page
- score breakdown
- detected tech stack
- documentation checklist
- setup/build checklist
- next improvement recommendation

### Phase 7: Export system v1

Goal: Export useful reports.

Possible outputs:

- Markdown report export
- JSON summary export
- homepage cards export
- save file through desktop dialog

### Phase 8: Local cache and settings

Goal: Improve usability and reduce repeated API usage.

Possible outputs:

- local cache
- refresh analysis
- optional GitHub token storage/handling
- theme settings
- analysis preferences

### Phase 9: Project classification

Goal: Apply more relevant checks by repository type.

Possible outputs:

- frontend/backend/full-stack/desktop/mobile/AI/infrastructure classifications
- type-specific scoring adjustments
- confidence indicators
- manual override if classification is wrong

### Phase 10: UI polish and onboarding

Goal: Make the app feel production-quality.

Possible outputs:

- refined visual design
- dark/light mode
- empty states
- onboarding flow
- keyboard navigation
- accessibility pass
- animations/transitions
- polished app icon

### Phase 11: CLI version

Goal: Make OpenReady useful in developer workflows.

Possible outputs:

- `openready analyze <username>`
- terminal summary
- JSON/Markdown output
- reusable analyzer core extraction if needed

### Phase 12: Release packaging

Goal: Create distributable desktop builds.

Possible outputs:

- Windows `.exe` or installer
- release artifacts
- GitHub Releases workflow
- versioning
- changelog
- signing notes/limitations

### Phase 13: Advanced recommendations

Goal: Improve guidance quality.

Possible outputs:

- prioritized recommendations
- hidden gem detection
- role-independent improvement suggestions
- customizable scoring weights
- repository comparison

### Phase 14: Job-market and portfolio mode

Goal: Add job-seeker-specific value.

Possible outputs:

- role selection
- recommended projects to feature
- portfolio homepage export
- CV bullet templates
- interview talking points
- personal homepage sync/export

### Phase 15: Optional AI assist

Goal: Add opt-in AI features without weakening the deterministic core.

Possible outputs:

- AI provider settings
- bring-your-own-key support
- README critique
- generated project summaries
- CV/homepage wording suggestions
- privacy/cost warnings

### Working constraint: offline git workflow (Phase 16 onward)

The development machine currently cannot push to GitHub. Until that changes,
every phase below follows this workflow:

- Feature work happens on a local branch and is merged into local `main`
  directly (no PR flow from this machine).
- Completed work is exported with `git bundle` (including annotated tags) and
  pushed to GitHub later from a connected machine.
- Steps that require GitHub itself — running CI, publishing releases, closing
  issues, npm or Marketplace publishing — are listed per phase as **post-push
  steps** and are queued, not attempted locally.

Everything else (code, tests, docs, local builds, local tags) is fully
implementable offline, and each phase is scoped so its definition of done is
reachable without network access.

### Phase 16: Plugin and ecosystem direction

Goal: Allow advanced extensibility.

Status: In progress. The core work already exists on the
`phase-16-plugins-and-ecosystem` branch (commit `c977c4c`): versioned JSON
Schemas for export/pack/profile with Ajv conformance tests, a check-plugins
system (Node loader, safe runner with id/output validation and evidence
clipping, official reference pack), CLI gating flags (`--fail-under`,
`--require-check`, `--plugins`, `--profile`, `--allow-plugins`), and a pure
gating evaluator.

Remaining outputs:

- rebase the branch onto current `main` and merge locally
- resolve conflicts with the Phase 15 AI-assist changes if any
- plugin authoring guide (`docs/plugins.md`) and gating docs in `docs/cli.md`
- link `docs/json-schema.md` from the README documentation list
- organization/team profile examples beyond the reference pack
- changelog entry and green quality gates on merged `main`

Post-push steps:

- push merged `main` via bundle; verify `lint-and-test` passes on GitHub

### Phase 17: Ship v0.1.0 for real

Goal: Produce the first actual tagged release. The changelog describes a
v0.1.0 release, but no tag or GitHub Release exists yet and the release
workflow has never run.

Possible outputs:

- screenshots in the README (replace "Coming soon")
- decide the release version: fold the Unreleased changelog section
  (Phases 12–16) into the release notes and pick `v0.1.0` or `v0.2.0`
- run `scripts/bump-version.mjs` so `package.json`, `tauri.conf.json` and
  `Cargo.toml` agree
- verify the release builds locally: `pnpm build`, `pnpm build:cli`,
  `pnpm tauri build` on this machine's platform
- create the annotated tag locally
- prepare the transfer bundle including the tag

Post-push steps:

- push tag; let `release.yml` build macOS/Windows/Linux bundles — expect
  first-run failures and budget one fix iteration
- close issue #12 (already fixed by `fa5946f`)

### Phase 18: CI gate and GitHub Action

Goal: Let any project enforce OpenReady scores in CI, building on the
Phase 16 gating evaluator. This is the widest-reach feature: it requires no
install and feeds adoption.

Possible outputs:

- composite GitHub Action wrapping the CLI (`analyze` + gating flags),
  developed and unit-tested locally
- score badge generation from the schema-validated JSON export
  (shields.io-compatible endpoint JSON or static SVG)
- example workflows (`gate on PR`, `badge refresh on push`)
- `docs/github-action.md` with inputs/outputs reference

Post-push steps:

- publish the action (same repo or `openready-action`); optional Marketplace
  listing

### Phase 19: Aurora — visual and text revamp

Goal: Give the whole product a modern premium feel. The app is itself the
portfolio piece; its presentation quality is the product's best advertisement
(principle: presentation matters).

Planned outputs (5 sequential PRs):

- Aurora design language: glass token layer (translucent surfaces, backdrop
  blur on static shell surfaces only, violet-blue accent, gradient glow),
  full light/dark parity, WCAG AA verified against composited glass colors
- full framer-motion choreography from a shared `src/lib/motion.ts`
  (entrance-only, reduced-motion gated, tour anchors animate opacity-only)
- complete copy rewrite in a confident-and-precise voice; all strings in a
  typed `src/lib/copy.ts`; `docs/voice-and-tone.md` and
  `docs/design-system.md` document the rules
- glass toast system (aria-live) replacing scattered inline status text
- floating glass sidebar rail; phase badge replaced by a version badge
- tier-gradient score rings, glow empty-state discs, geometric line-art spot
  illustrations
- new geometric SVG brand mark + wordmark, regenerated Tauri icon set,
  restructured README with five fresh screenshots

Ships as v0.4.0. (v0.3.0 was tagged from main first so the GitHub Action has
a stable ref while the revamp lands.)

### Phase 20: Distribution hardening

Goal: Make installing, trusting and updating OpenReady realistic for
strangers.

Possible outputs:

- npm packaging of the CLI: split or un-private the package, `files`/`exports`
  fields, `npx openready` flow verified against the local bundle
- `tauri-plugin-updater` groundwork behind a config flag (endpoints can stay
  unset until releases are signed)
- signing/notarization checklist expanded in `docs/signing.md` (macOS
  notarization first)
- `cargo clippy` and `cargo test` steps added to `lint-and-test.yml`; first
  Rust-side tests for the keyring/fs commands in `src-tauri/src/lib.rs`
- one end-to-end smoke test: app boots, analyzes a mocked profile (MSW
  fixtures), dashboard renders — via tauri-driver/WebdriverIO or Playwright
  against `pnpm dev`

Post-push steps:

- `npm publish` the CLI package
- CI must confirm the new Rust steps pass on all three OS runners

### Phase 21: GitHub client efficiency and organization support

Goal: Reduce rate-limit pressure (60 req/h unauthenticated) and widen the
audience beyond personal profiles.

Possible outputs:

- conditional requests with ETags so refreshes of unchanged repos cost no
  rate-limit budget
- visible request-budget indicator during analysis
- optional GraphQL path that batches repo metadata + README + tree info
- analyze organizations, not just users (near-identical API shape)
- smarter refresh: re-analyze only repos whose `pushed_at` changed

### Phase 22: History and trends

Goal: Show improvement over time — the retention feature the local snapshot
cache already almost supports.

Possible outputs:

- retain a bounded history of snapshots per profile (cache schema v4)
- score deltas since last analysis ("+13 pts since June")
- per-repository trend view and dashboard sparklines
- exportable progress report (Markdown)
- deterministic, local-only; no telemetry

### Phase 23: Local AI providers

Goal: Extend Phase 15's opt-in AI assist to zero-cloud setups, matching the
project's privacy identity.

Possible outputs:

- verify and document Ollama's OpenAI-compatible endpoint
  (`localhost:11434/v1`) against the existing ai-adapter
- provider presets (OpenAI-compatible cloud vs. local) with a model picker
- "local model — nothing leaves this machine" badge distinct from the cloud
  AI badge
- graceful capability degradation for small local models
- `docs/ai-expansion.md` update covering the local path

---

## 14. UI and design philosophy

OpenReady should feel like a serious desktop tool, not a quick script with a UI.

### 14.1 Visual tone

The design should be:

- clean
- calm
- modern
- trustworthy
- developer-oriented
- slightly portfolio-coach-like
- not too corporate
- not too playful

### 14.2 Combined identity

The user wanted the app to cover several identities:

- developer dashboard
- portfolio coach
- GitHub analytics tool

OpenReady can combine all three by separating modes/areas:

- Dashboard: analytics overview
- Repository detail: developer health checks
- Recommendations/export: portfolio coach

### 14.3 Interaction principles

- make the first action obvious
- show progress during analysis
- make findings easy to scan
- allow drilling down into evidence
- keep recommendations short and prioritized
- make export actions visible
- support keyboard navigation
- provide helpful empty/error states

### 14.4 Motion and polish

Phase 19 codified this as the **Aurora design language** (see
`docs/design-system.md`): layered glass surfaces, a violet-blue accent with
gradient glow, and full choreographed motion from a shared motion module —
executed calmly. Purposeful choreography:

- staggered dashboard card entrances (capped under ~600ms total)
- score count-up and ring-draw reveals
- entrance-only route and tab transitions
- transform-only hover lifts and subtle focus states
- skeleton loading states

Still avoid:

- decorative or blocking animation
- distracting effects (motion never competes with data)
- generic template look
- motion that conflicts with accessibility — everything is gated behind
  `prefers-reduced-motion`, and tour-anchored elements animate opacity-only

---

## 15. Data and privacy model

### 15.1 Public mode

Default mode analyzes public repositories by GitHub username.

No authentication required, but rate limits may be lower.

### 15.2 Token mode

Optional GitHub token mode can provide higher rate limits and possibly private repository access later.

Requirements:

- explain why token is useful
- explain what scopes are needed
- use minimum permissions
- do not store token unless user chooses to
- if stored, use secure local storage if available
- provide clear delete/reset option

### 15.3 Private repository mode later

Private repository analysis should not be part of the earliest product unless it is easy and safe.

If added:

- must be opt-in
- must make privacy implications clear
- should not send contents to AI by default
- should separate local deterministic analysis from optional cloud/AI features

---

## 16. Error handling and edge cases

OpenReady should handle real-world GitHub messiness.

Important cases:

- username not found
- no public repositories
- rate limit exceeded
- network failure
- API error
- repository with huge file tree
- repository without README
- archived repository
- forked repository
- empty repository
- repository with non-default branch issues
- binary-heavy repository
- monorepo
- multiple package managers
- private repo hidden from public view

Errors should be user-friendly and actionable.

---

## 17. Quality and testing outlook

OpenReady should eventually include tests for:

- GitHub API response handling
- scoring logic
- README section detection
- tech stack detection
- project classification
- export formatting
- recommendation prioritization
- UI states

Testing should focus heavily on deterministic logic because this is the heart of the product.

Useful fixtures:

- mock repository with great README
- repo missing README
- frontend app repo
- Python backend repo
- Android repo
- infrastructure repo
- AI project repo
- archived repo
- forked repo
- empty repo

---

## 18. Documentation requirements

OpenReady should have strong documentation because documentation quality is central to the product.

Suggested docs:

- README.md
- docs/mission.md
- docs/product-principles.md
- docs/architecture.md
- docs/scoring-model.md
- docs/privacy.md
- docs/ai-expansion.md
- docs/release-process.md
- docs/contributing.md later
- docs/roadmap.md

The README should clearly explain:

- what OpenReady does
- who it is for
- how to run it
- what it checks
- what it does not check
- privacy model
- AI status
- roadmap

---

## 19. Release strategy outlook

OpenReady should eventually publish real releases.

### 19.1 Early releases

- source-only development releases
- manual local build instructions
- screenshots

### 19.2 Desktop releases

- Windows installer or `.exe`
- GitHub Releases
- release notes
- checksums if practical
- unsigned build warning documented

### 19.3 Later cross-platform releases

- macOS build
- Linux build
- signing/notarization notes
- auto-update later if feasible

Signing can be documented as a serious distribution consideration even if not implemented early.

---

## 20. Open-source community direction

OpenReady should be friendly to outside users and contributors eventually.

Possible future community features:

- issue templates
- feature request template
- good first issues
- contribution guide
- plugin/check contribution guide
- public roadmap
- example analysis reports
- discussion templates

Do not add this too early if it slows the product down, but design the project so it can grow into this.

---

## 21. Potential feature backlog

This backlog intentionally includes more than the first version should build.

### Core analysis

- public repo fetch by username
- repo metadata analysis
- README detection
- README section detection
- license detection
- CI detection
- Docker detection
- test detection
- docs detection
- topic/description/homepage detection
- recent activity detection
- tech stack detection

### Scoring and recommendations

- transparent score breakdown
- category scores
- repository labels
- hidden gem detection
- next best improvement
- type-specific checks
- customizable scoring later

### UX and presentation

- polished dashboard
- repo detail views
- filters and sorting
- grouping by project type
- dark/light mode
- onboarding
- settings
- local cache
- accessible UI

### Export

- Markdown report
- JSON summary
- homepage cards
- GitHub profile README section
- CV bullets later
- LinkedIn text later

### Integrations

- GitHub token support
- private repos later
- CLI
- GitHub Action
- personal homepage export
- optional AI providers

### Advanced

- AI-assisted README critique
- AI-generated project summaries
- role-specific job-market mode
- plugin system
- organization/team analysis
- trend tracking over time
- dependency/security signal checks

---

## 22. Definition of success

OpenReady is successful if:

- someone can download or run it without complex setup
- it can analyze a public GitHub profile
- it explains findings clearly
- it helps users improve repositories
- it produces useful exportable reports
- it stays useful without AI
- it feels polished enough to be trusted
- it is open-source and easy to understand
- it can grow into AI, CLI, homepage and job-market features later

For the user’s portfolio, it is successful if it demonstrates:

- desktop app development
- React/TypeScript frontend quality
- Tauri/local app packaging
- GitHub API integration
- deterministic analysis and scoring
- product thinking
- open-source thinking
- documentation quality
- privacy-aware design
- long-term architecture planning

---

## 23. Suggested README opening

```md
# OpenReady

OpenReady is an open-source desktop app that analyzes GitHub repositories and helps developers understand which projects are clear, healthy and ready to share. It checks public repositories for documentation, setup instructions, licensing, CI, technology signals, presentation quality and other practical indicators, then turns the findings into transparent scores and actionable improvement suggestions.

OpenReady is designed to be useful without AI, accounts or cloud setup. Optional AI-assisted suggestions may be added later, but the core product is deterministic, local-first and free to use.
```

---

## 24. Suggested portfolio description

```text
OpenReady is an open-source desktop application for analyzing GitHub repository health and portfolio readiness. Built with Tauri, React and TypeScript, it uses deterministic checks against public GitHub repositories to detect documentation quality, setup signals, licensing, CI, technology stack and presentation gaps, then generates transparent scores and exportable improvement reports.
```

---

## 25. Suggested first planning prompt

Use this when starting the first implementation phase with a planning agent.

```text
/plan

We are starting the OpenReady project.

Before planning, read the OpenReady master plan if it exists in the repository and treat it as the source of truth. Do not attempt to implement the entire product. This project is intentionally large and should be developed in many careful phases.

OpenReady is an open-source, local-first desktop application for analyzing GitHub repository health and portfolio readiness. It should be designed for other users from day one, not only for my own GitHub profile. The app should be useful without AI, accounts, cloud setup or a database. Optional AI features are part of the long-term expansion path, but should not be part of the first implementation phase.

Strategic direction:
- Desktop app first
- Tauri + React + TypeScript preferred
- Public GitHub repository analysis first
- Deterministic checks first
- No AI in MVP
- No backend server in MVP
- No database in MVP
- Export and optional token support later
- Keep architecture open for CLI, web, homepage export and AI expansion later

Important contribution policy:
- Do not add yourself, Claude, ChatGPT, Codex, OpenAI, Anthropic or any AI agent as a contributor, co-author, maintainer or collaborator.
- Do not add “Generated by”, “Co-authored-by”, “AI assisted by”, or similar attribution lines in files, commits, documentation, comments or metadata.
- Do not modify contributor lists unless explicitly asked.

For Phase 1, focus only on product foundation and the first runnable desktop app shell.

Possible Phase 1 target:
- create a Tauri + React + TypeScript desktop app
- create a polished app shell
- create welcome/start screen
- create placeholder dashboard screen
- create placeholder repository detail screen
- create settings placeholder
- define initial styling/design system
- add README skeleton
- add docs skeleton
- do not implement full GitHub analysis yet unless explicitly approved

Please inspect the repository state first. Then produce a detailed Phase 1 implementation plan only.

The plan should include:
1. current repository assessment
2. recommended project setup
3. proposed folder structure
4. app shell/navigation design
5. visual design direction
6. first screens/components
7. development commands
8. testing/quality checks
9. documentation updates
10. risks and tradeoffs
11. definition of done for Phase 1

Do not write a large amount of code yet. The goal is to produce a careful, stable implementation plan that I can approve before coding.
```

---

## 26. Decision log

- OpenReady should be designed for other users from day one.
- OpenReady should be production-minded and open-source, not a personal-only script.
- The app should start as a desktop application and eventually produce a real Windows executable/installer.
- Tauri + React + TypeScript is the preferred direction.
- The first versions should focus on general repository health, not job-market mode.
- Job-market/portfolio mode remains part of th
