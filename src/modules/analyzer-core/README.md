# analyzer-core

Deterministic repository analysis. Consumes raw GitHub data and produces structured findings: documentation, buildability, presentation, testing and metadata signals.

**Phase:** deterministic checks, scoring inputs and recommendations surfaced through the Phase 6 repository detail view.

**Public surface:** `analyzeRepository(repository, readmeState, treeState, now) -> AnalysisResult`, `analyzeRepositories(repositories, readmes, trees, now) -> AnalysisResult[]`.

Current checks:

- repository description
- topics
- homepage/demo URL
- license metadata
- recent activity within 12 months
- archived status
- fork status
- README presence
- README sections for purpose, setup, usage, screenshots/demo, tech stack, testing and roadmap
- build manifests and dependency lockfiles
- CI workflows, test files, Docker files and infrastructure-as-code signals
- docs folders, SECURITY.md and example environment files

Current labels:

- Portfolio-ready
- Almost ready
- Needs work
- Experimental
- Stale
- Archived
- Fork
- Analyzing

Designed to be lifted into `packages/analyzer-core` later.
