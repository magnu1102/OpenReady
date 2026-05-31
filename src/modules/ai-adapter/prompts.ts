import type { AiChatMessage } from "@/lib/aiConfig";

/** Cap README text sent to the provider, to bound cost and latency. */
export const MAX_README_CHARS = 6000;

export interface ReadmeCritiqueInput {
  repoName: string;
  language: string | null;
  projectType: string;
  readme: string;
  /** Deterministic findings: human-readable labels of missing/weak signals. */
  missingSignals: string[];
  failedCheckLabels: string[];
}

export interface ProjectSummaryInput {
  repoName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  projectType: string;
  healthLabel: string;
  strongSignals: string[];
}

export interface WordingInput {
  repoName: string;
  description: string | null;
  language: string | null;
  projectType: string;
  draft: string;
}

export type WordingKind = "cv" | "homepage";

const SYSTEM_PROMPT =
  "You are OpenReady's writing assistant. OpenReady is a deterministic tool that has already analyzed a GitHub repository. " +
  "Your job is only to reword and prioritize based on the evidence provided. " +
  "Do not invent facts, features, metrics, or technologies that are not given. " +
  "Be calm, constructive, and concise. Never shame the author.";

export function buildReadmeCritiquePrompt(input: ReadmeCritiqueInput): AiChatMessage[] {
  const readme = truncate(input.readme, MAX_README_CHARS);
  const findings = formatList(input.missingSignals.concat(input.failedCheckLabels));
  const user = [
    `Repository: ${input.repoName}`,
    `Primary language: ${input.language ?? "unknown"}`,
    `Detected project type: ${input.projectType}`,
    "",
    "OpenReady's deterministic checks already flagged these gaps:",
    findings,
    "",
    "Here is the current README (may be truncated):",
    "```markdown",
    readme,
    "```",
    "",
    "Based only on the gaps above and the README's actual content, give 3–6 short, prioritized, actionable suggestions to make this README clearer and more presentable. " +
      "Reference concrete sections (e.g. setup, screenshots, license). Do not repeat suggestions for things the README already does well.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

export function buildProjectSummaryPrompt(input: ProjectSummaryInput): AiChatMessage[] {
  const user = [
    `Repository: ${input.repoName}`,
    `Description: ${input.description ?? "(none provided)"}`,
    `Primary language: ${input.language ?? "unknown"}`,
    `Topics: ${input.topics.length > 0 ? input.topics.join(", ") : "(none)"}`,
    `Detected project type: ${input.projectType}`,
    `OpenReady health label: ${input.healthLabel}`,
    "",
    "Strong signals OpenReady detected:",
    formatList(input.strongSignals),
    "",
    "Write a single plain-English paragraph (2–3 sentences) summarizing what this project is and who it is for. " +
      "Use only the information above. Do not speculate about features that are not listed.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

export function buildWordingPrompt(input: WordingInput, kind: WordingKind): AiChatMessage[] {
  const target =
    kind === "cv"
      ? "a single res/CV bullet point (one line, action-oriented, past or present tense, no first person)"
      : "a short portfolio homepage blurb (1–2 sentences, written for a visitor browsing projects)";
  const user = [
    `Repository: ${input.repoName}`,
    `Description: ${input.description ?? "(none provided)"}`,
    `Primary language: ${input.language ?? "unknown"}`,
    `Detected project type: ${input.projectType}`,
    "",
    "OpenReady generated this deterministic draft:",
    `"${input.draft}"`,
    "",
    `Rewrite it as ${target}. Keep it truthful to the draft and the facts above. Return only the rewritten text, with no preamble.`,
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…(truncated)`;
}

function formatList(items: string[]): string {
  const cleaned = items.map((item) => item.trim()).filter((item) => item.length > 0);
  if (cleaned.length === 0) return "- (none detected)";
  return cleaned.map((item) => `- ${item}`).join("\n");
}
