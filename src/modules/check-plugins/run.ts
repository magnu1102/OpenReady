import type { CheckStatus } from "@/types";
import type { CheckPlugin, CheckSnapshot, CustomCheckResult } from "./types";
import { createCheckContext } from "./snapshot";

const VALID_STATUSES: ReadonlySet<CheckStatus> = new Set<CheckStatus>([
  "passed",
  "failed",
  "not-applicable",
  "unknown",
]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;
const MAX_EVIDENCE = 300;

/**
 * Runs custom checks over a snapshot and returns one result each. This is pure and
 * synchronous; a misbehaving plugin can never crash analysis — a throw or an invalid
 * return becomes an `unknown` result with a captured message. Wall-clock timeouts are
 * enforced by the host that runs this inside a terminable Web Worker (desktop) or
 * process (CLI), not here.
 */
export function runCheckPlugins(
  plugins: CheckPlugin[],
  snapshot: CheckSnapshot,
): CustomCheckResult[] {
  const context = createCheckContext(snapshot);
  const seen = new Set<string>();
  const results: CustomCheckResult[] = [];

  for (const plugin of plugins) {
    const id = typeof plugin?.id === "string" ? plugin.id.trim() : "";
    const label =
      typeof plugin?.label === "string" && plugin.label ? plugin.label : id || "Unnamed check";

    if (!ID_PATTERN.test(id)) {
      results.push(
        unknownResult(id || "invalid", label, `Invalid check id "${id}". Use "vendor/check-name".`),
      );
      continue;
    }
    if (seen.has(id)) {
      results.push(
        unknownResult(id, label, `Duplicate check id "${id}" — only the first is used.`),
      );
      continue;
    }
    seen.add(id);

    try {
      const output = plugin.run(context);
      if (!output || !VALID_STATUSES.has(output.status)) {
        results.push(unknownResult(id, label, "Check returned an invalid status."));
        continue;
      }
      results.push({
        id,
        label,
        category: plugin.category ?? "custom",
        status: output.status,
        evidence: clip(output.evidence),
        source: "plugin",
        pluginId: id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push(unknownResult(id, label, `Check threw an error: ${message}`));
    }
  }

  return results;
}

function unknownResult(id: string, label: string, evidence: string): CustomCheckResult {
  return {
    id,
    label,
    category: "custom",
    status: "unknown",
    evidence: clip(evidence),
    source: "plugin",
    pluginId: id,
  };
}

function clip(evidence: string | undefined): string | undefined {
  if (typeof evidence !== "string" || evidence.length === 0) return undefined;
  return evidence.length > MAX_EVIDENCE ? `${evidence.slice(0, MAX_EVIDENCE - 1)}…` : evidence;
}
