# ai-adapter

Optional AI-assisted suggestions. Always opt-in, always bring-your-own-key, never
required and never replaces the deterministic core. Shipped in Phase 15.

## Public surface

- `critiqueReadme({ result, readme }, config, run?)` — critiques a README, grounded
  in the deterministic `missingSignals` and failed checks of its `AnalysisResult`.
- `summarizeProject(result, config, run?)` — a short, plain-English project summary
  built from repository metadata and the passing signals.
- `suggestWording({ result, kind, draft }, config, run?)` — refines deterministic
  CV (`kind: "cv"`) or homepage (`kind: "homepage"`) export wording.

Each returns an `AiSuggestion` — `{ text, model, promptCharCount }` — so the UI can
surface the model used and exactly how many characters were sent.

`config` is an `AiRunConfig` (`{ baseUrl, model, temperature?, maxTokens? }`). The
API key is **not** passed here — it lives in the OS keychain and is read server-side
by the Rust `ai_chat` command. The optional `run` parameter is a `ChatRunner` seam
for tests; by default it proxies through `runAiChat` in `@/lib/aiConfig`.

## Composition

The module imports nothing from React. It composes:

- `prompts.ts` — pure, unit-testable message-array builders. Every prompt instructs
  the model to only reword and prioritize the supplied evidence, never invent facts.
- `redact.ts` — `redactSecrets` strips secret-shaped strings (`ghp_…`, `sk-…`,
  `Bearer …`, `.env`-style assignments) from every message before it leaves the
  machine.
- `runAiChat` from `@/lib/aiConfig` — the Rust-proxied provider call.

Privacy-first: explicit content visibility, redaction, and cost surfacing are part of
the design. See `docs/ai-expansion.md` and master plan §10.
