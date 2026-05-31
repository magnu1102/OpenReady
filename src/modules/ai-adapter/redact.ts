/**
 * Best-effort removal of secret-shaped strings before any text leaves the
 * machine for an AI provider. This is a safety net, not a guarantee — the AI
 * features are opt-in and the user controls what is analyzed. Honors the master
 * plan privacy stance (§10.4): users should be able to limit what is sent.
 */

const REDACTION_PLACEHOLDER = "[redacted]";

interface SecretPattern {
  pattern: RegExp;
  /** When set, only this capture group is replaced (keeps surrounding context). */
  group?: number;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // GitHub tokens: classic, fine-grained, OAuth, app, refresh.
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{16,}\b/g },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g },
  // OpenAI / OpenAI-compatible keys.
  { pattern: /\bsk-[A-Za-z0-9-_]{16,}\b/g },
  // AWS access key id.
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  // Google API key.
  { pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
  // Slack token.
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  // Generic bearer tokens in headers.
  { pattern: /\b[Bb]earer\s+([A-Za-z0-9\-._~+/]{20,}=*)/g, group: 1 },
  // `.env`-style assignments to secret-looking keys.
  {
    pattern:
      /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|ACCESS[_-]?KEY|PRIVATE[_-]?KEY)[A-Z0-9_]*)\s*[:=]\s*["']?([^\s"'#]+)/gi,
    group: 2,
  },
];

/** Replaces secret-shaped substrings with a placeholder, preserving prose. */
export function redactSecrets(text: string): string {
  let output = text;
  for (const { pattern, group } of SECRET_PATTERNS) {
    output = output.replace(pattern, (match, ...captures) => {
      if (group === undefined) return REDACTION_PLACEHOLDER;
      const captured = captures[group - 1];
      if (typeof captured !== "string" || captured.length === 0) return match;
      return match.replace(captured, REDACTION_PLACEHOLDER);
    });
  }
  return output;
}
