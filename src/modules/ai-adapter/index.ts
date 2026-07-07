import type { AnalysisResult } from "@/types";
import { runAiChat, type AiChatMessage } from "@/lib/aiConfig";
import { PROJECT_TYPE_LABELS } from "@/modules/project-classifier/types";
import { redactSecrets } from "./redact";
import {
  buildProjectSummaryPrompt,
  buildReadmeCritiquePrompt,
  buildWordingPrompt,
  type WordingKind,
} from "./prompts";

export type { WordingKind } from "./prompts";
export { redactSecrets } from "./redact";

/** A single AI-generated suggestion plus transparency metadata for the UI. */
export interface AiSuggestion {
  text: string;
  model: string;
  /** Total input characters, so the UI can surface cost and visibility. */
  promptCharCount: number;
}

/** Provider settings needed for a request; the API key stays in the keychain. */
export interface AiRunConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Seam for tests: the real implementation proxies through Rust (`runAiChat`).
 * Tests inject a fake to assert the redacted, well-formed message array.
 */
export type ChatRunner = (messages: AiChatMessage[], config: AiRunConfig) => Promise<string>;

const defaultRunner: ChatRunner = (messages, config) =>
  runAiChat(messages, {
    baseUrl: config.baseUrl,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });

export async function critiqueReadme(
  input: { result: AnalysisResult; readme: string },
  config: AiRunConfig,
  run: ChatRunner = defaultRunner,
): Promise<AiSuggestion> {
  const { result, readme } = input;
  const messages = buildReadmeCritiquePrompt({
    repoName: result.repository.name,
    language: result.repository.language,
    projectType: projectTypeLabel(result),
    readme,
    missingSignals: result.missingSignals,
    failedCheckLabels: failedLabels(result),
  });
  return runRedacted(messages, config, run);
}

export async function summarizeProject(
  result: AnalysisResult,
  config: AiRunConfig,
  run: ChatRunner = defaultRunner,
): Promise<AiSuggestion> {
  const messages = buildProjectSummaryPrompt({
    repoName: result.repository.name,
    description: result.repository.description,
    language: result.repository.language,
    topics: result.repository.topics,
    projectType: projectTypeLabel(result),
    healthLabel: result.healthLabel,
    strongSignals: passedLabels(result),
  });
  return runRedacted(messages, config, run);
}

export async function suggestWording(
  input: { result: AnalysisResult; kind: WordingKind; draft: string },
  config: AiRunConfig,
  run: ChatRunner = defaultRunner,
): Promise<AiSuggestion> {
  const { result, kind, draft } = input;
  const messages = buildWordingPrompt(
    {
      repoName: result.repository.name,
      description: result.repository.description,
      language: result.repository.language,
      projectType: projectTypeLabel(result),
      draft,
    },
    kind,
  );
  return runRedacted(messages, config, run);
}

/** Redacts every message, runs the request, and packages the metadata. */
async function runRedacted(
  messages: AiChatMessage[],
  config: AiRunConfig,
  run: ChatRunner,
): Promise<AiSuggestion> {
  const redacted = messages.map((message) => ({
    ...message,
    content: redactSecrets(message.content),
  }));
  const text = await run(redacted, config);
  return {
    text,
    model: config.model,
    promptCharCount: redacted.reduce((sum, message) => sum + message.content.length, 0),
  };
}

function projectTypeLabel(result: AnalysisResult): string {
  return PROJECT_TYPE_LABELS[result.classification.type];
}

function failedLabels(result: AnalysisResult): string[] {
  return result.checks.filter((check) => check.status === "failed").map((check) => check.label);
}

function passedLabels(result: AnalysisResult): string[] {
  return result.checks.filter((check) => check.status === "passed").map((check) => check.label);
}
