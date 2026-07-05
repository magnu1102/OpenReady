import { readFile, writeFile } from "node:fs/promises";
import { badgeFromExport, renderBadgeEndpoint, renderBadgeSvg } from "@/modules/badge";
import type { BadgeArgs } from "./args";

export interface RunBadgeResult {
  exitCode: number;
}

export async function runBadge(args: BadgeArgs): Promise<RunBadgeResult> {
  let raw: string;
  try {
    raw = await readFile(args.from, "utf8");
  } catch {
    process.stderr.write(`openready: report file not found or unreadable: ${args.from}\n`);
    return { exitCode: 2 };
  }

  let summary: unknown;
  try {
    summary = JSON.parse(raw);
  } catch {
    process.stderr.write(`openready: report file is not valid JSON: ${args.from}\n`);
    return { exitCode: 2 };
  }

  const result = badgeFromExport(summary, { repo: args.repo, label: args.label });
  if (!result.ok) {
    process.stderr.write(`openready: ${result.error}\n`);
    return { exitCode: result.code === "repo-not-found" ? 3 : 2 };
  }

  const rendered =
    args.format === "svg" ? renderBadgeSvg(result.badge) : renderBadgeEndpoint(result.badge);
  await emit(rendered, args.out);
  return { exitCode: 0 };
}

async function emit(content: string, out: string | null): Promise<void> {
  if (out) {
    await writeFile(out, content.endsWith("\n") ? content : content + "\n");
    process.stderr.write(`Wrote badge to ${out}\n`);
    return;
  }
  process.stdout.write(content.endsWith("\n") ? content : content + "\n");
}
