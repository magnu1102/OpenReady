# scoring-engine

Turns analyzer findings into transparent, evidence-based scores. Every score is explainable — `passed`, `failed`, `not-applicable` and `unknown` are first-class. See `docs/scoring-model.md` for the formula and category mapping.

**Public surface:** `scoreChecks(checks: CheckResult[]) -> RepositoryScore`.

Pure and dependency-free. The module is consumable by future CLI, web or AI-adapter builds without dragging in React or the GitHub client.
