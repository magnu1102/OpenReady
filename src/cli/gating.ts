import type { AnalysisResult } from "@/types";
import type { CustomCheckResult } from "@/modules/check-plugins";

export interface GateConfig {
  /** Fail if any analyzed repo scores below this (0–100). Null disables the gate. */
  failUnder: number | null;
  /** Custom-check ids (e.g. "acme/has-changelog") that must pass for every repo. */
  requireChecks: string[];
}

export interface GateOutcome {
  passed: boolean;
  reasons: string[];
}

/**
 * Pure CI gate: decides whether an analysis run should fail. Deterministic and
 * side-effect free so it is fully unit-testable. Repos whose score is `null`
 * (not enough data) never trip the score gate.
 */
export function evaluateGating(
  analyses: AnalysisResult[],
  customByRepo: Record<string, CustomCheckResult[]>,
  config: GateConfig,
): GateOutcome {
  const reasons: string[] = [];

  if (config.failUnder !== null) {
    for (const analysis of analyses) {
      const total = analysis.score.total;
      if (total !== null && total < config.failUnder) {
        reasons.push(
          `${analysis.repository.fullName} scored ${total}, below --fail-under ${config.failUnder}.`,
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
            `${analysis.repository.fullName} failed required check ${required} (${match.status}).`,
          );
        }
      }
    }
  }

  return { passed: reasons.length === 0, reasons };
}
