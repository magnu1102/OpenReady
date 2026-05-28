/**
 * Tiny ANSI color helper. Honors NO_COLOR (https://no-color.org/) and falls
 * back to plain text when stdout is not a TTY. No dependencies — all styles
 * are inline escape codes.
 */
const SUPPORTS_COLOR =
  typeof process !== "undefined" &&
  !process.env.NO_COLOR &&
  Boolean(process.stdout && "isTTY" in process.stdout && process.stdout.isTTY);

function wrap(code: number, text: string): string {
  if (!SUPPORTS_COLOR) return text;
  return `[${code}m${text}[0m`;
}

export const color = {
  enabled: SUPPORTS_COLOR,
  dim: (text: string) => wrap(2, text),
  bold: (text: string) => wrap(1, text),
  red: (text: string) => wrap(31, text),
  green: (text: string) => wrap(32, text),
  yellow: (text: string) => wrap(33, text),
  blue: (text: string) => wrap(34, text),
  magenta: (text: string) => wrap(35, text),
  cyan: (text: string) => wrap(36, text),
  gray: (text: string) => wrap(90, text),
};
