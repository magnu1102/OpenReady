# Voice and tone

OpenReady speaks with one voice everywhere text appears: the app, the README,
release notes, and exports. The voice is **confident and precise** — calm,
expert, and specific. Encouragement comes from clarity, not enthusiasm.

All app strings live in [`src/lib/copy.ts`](../src/lib/copy.ts). Tests import
those constants, so copy edits happen in one reviewed place.

## Rules

1. **Present tense, active voice.** "OpenReady analyzes public repositories" —
   not "repositories will be analyzed".
2. **No exclamation marks.** Confidence does not shout. (Enforced by
   `copy.test.ts`.)
3. **No blame.** Findings describe the repository, never the person. "This
   repository has no license" — not "you forgot a license". This keeps
   product principle 6 (helpful, not judgmental) intact inside the firmer
   voice.
4. **Specific beats vague.** Name the thing and the next step: "Add a README
   with setup instructions" — not "improve documentation".
5. **Short sentences, front-loaded.** The first words carry the point. Hints
   and qualifiers come after, or not at all.
6. **Numbers are facts, not drama.** "3 of 12 repositories are
   portfolio-ready" — no "only", no "already".
7. **Technical terms stay technical.** README, license, CI, fork — never
   folksy paraphrases. But no internal jargon either: users see "analysis",
   not "pipeline" or "run".

## Vocabulary

| Say                                   | Not                                            |
| ------------------------------------- | ---------------------------------------------- |
| analysis, analyze                     | scan, crawl, audit                             |
| repository                            | repo (in UI copy; "repo" is fine in CLI flags) |
| portfolio-ready                       | good, great, complete                          |
| score                                 | grade, rating                                  |
| stored in the system credential store | saved securely                                 |
| cached analysis                       | snapshot (except in schema/docs contexts)      |

## Surface guidance

- **Headings**: noun phrases or imperatives, 2–6 words, no trailing period.
- **Body/hints**: full sentences with periods. One idea per sentence.
- **Buttons**: imperative verb first — "Analyze", "Save token", "Replay tour".
- **Empty states**: one sentence naming what's missing + one naming the next
  action. The illustration is decoration; text carries the meaning.
- **Errors**: what happened, then what to do. Never apologize twice; usually
  never apologize at all — state the fix. "GitHub rate limit reached. Add a
  token in Settings to continue."
- **Toasts**: events, past tense, under eight words. "Export saved." Persistent
  state descriptions stay inline in the screen, not in toasts.
- **Tour steps**: second person, one capability per step, no marketing.

## Examples

| Before                                            | After                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| "Oops, something went wrong fetching your repos!" | "GitHub did not respond. Check your connection and retry."          |
| "Your awesome portfolio is almost ready!"         | "Two repositories meet the portfolio threshold. One more is close." |
| "Don't forget to add a license!"                  | "Add a license so others know how they can use this project."       |
