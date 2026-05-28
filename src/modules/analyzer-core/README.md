# analyzer-core

Deterministic repository analysis. Consumes raw GitHub data and produces structured findings: documentation, buildability, presentation, testing and metadata signals.

**Phase:** basic deterministic checks implemented in Phase 3.

**Public surface:** `analyzeRepository(repository, readmeState, now) -> AnalysisResult`, `analyzeRepositories(repositories, readmes, now) -> AnalysisResult[]`.

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

Current labels:

- Strong start
- Needs README
- Needs metadata
- Needs presentation
- Stale
- Archived
- Fork

Designed to be lifted into `packages/analyzer-core` later.
