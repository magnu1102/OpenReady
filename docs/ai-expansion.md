# AI expansion (Phase 15)

OpenReady's analysis is fully deterministic. Phase 15 adds a single, clearly
labeled, **opt-in** AI layer on top of that output. It is off by default, requires
the user to bring their own key, and never replaces the deterministic core.

## Principles (master plan §10)

- AI is **opt-in** and **bring-your-own-key**. OpenReady makes no AI calls in the
  default configuration.
- AI **augments — it never replaces** — the deterministic checks. Every AI panel
  renders beneath the deterministic output, which is always shown first.
- Users see what content would be sent, and how many characters, before and after
  each call.
- A no-AI mode is always available; the app is fully usable with AI disabled.

## Provider model

One **OpenAI-compatible** integration rather than per-vendor adapters. The user
configures three things in **Settings → AI features**:

- **Base URL** — e.g. `https://api.openai.com/v1`, a Groq/OpenRouter endpoint, or a
  local `http://localhost:11434/v1` (Ollama) / LM Studio server.
- **Model** — e.g. `gpt-4o-mini`, `llama3`.
- **API key** — optional for keyless local models; required for hosted providers.

All requests are `POST {baseUrl}/chat/completions` with a
`{ model, messages, temperature, max_tokens }` body, mirroring the OpenAI shape.

## Where the key lives

The API key **never reaches the webview** and is never embedded in client JS. It is
stored in the operating-system credential store via the Rust `keyring` crate
(service `dev.openready.app`, user `ai-provider-key`), exactly like the GitHub token.

Only **non-secret** configuration (`enabled`, `baseUrl`, `model`) is persisted in the
plaintext Zustand store (`openready-ai`). The key is read server-side inside the Rust
`ai_chat` command; it is never accepted as an argument from JS and never logged.

The Rust commands — `get_ai_config_status`, `store_ai_config`, `delete_ai_config`,
`ai_chat` — enforce a request timeout, cap `max_tokens`, and require an http(s) base
URL and a non-empty model. The webview cannot call arbitrary external hosts (CSP),
so every provider call is proxied through Rust, just like the GitHub fetch.

## What content is sent

AI surfaces are grounded in the existing deterministic findings, not re-derived:

- **README critique** — the repository README plus the deterministic
  `missingSignals` and failed-check labels.
- **Project summary** — repository metadata, project type, health label, and the
  passing signals.
- **CV/homepage wording** — the deterministic CV/homepage draft text, refined.

Each prompt instructs the model to **only reword and prioritize the supplied
evidence — never invent facts**.

## Redaction

Before any text leaves the machine, `redactSecrets` (`src/modules/ai-adapter/redact.ts`)
strips obvious secret-shaped strings: GitHub tokens (`ghp_…`, `github_pat_…`), OpenAI
keys (`sk-…`), AWS/Google keys, Slack tokens, `Bearer` headers, and `.env`-style
`SECRET=`/`TOKEN=`/`PASSWORD=`/`API_KEY=` assignments. Ordinary prose and benign
`KEY=value` pairs are left untouched.

## Cost and transparency

Every AI panel shows the model used and the exact character count sent after
redaction, so users can reason about cost and visibility before and after each call.

## Out of scope (this phase)

- Per-vendor native adapters beyond the OpenAI-compatible shape.
- Streaming responses (single request/response only).
- Any change to deterministic scoring, checks, or export content.

See master plan §10.
