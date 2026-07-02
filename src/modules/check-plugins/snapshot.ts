import type { Repository, RepositoryReadmeState, RepositoryTreeState } from "@/types";
import type { TechSignal } from "@/modules/analyzer-core";
import type { CheckContext, CheckSnapshot } from "./types";

/**
 * Builds the read-only, serializable snapshot handed to custom checks. Mirrors the
 * inputs the deterministic analyzer already has (README state, file tree, tech
 * signals) so checks reason over the same evidence without re-fetching anything.
 */
export function buildCheckSnapshot(
  repository: Repository,
  readmeState: RepositoryReadmeState | undefined,
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
): CheckSnapshot {
  const readmeFound = readmeState?.status === "found";
  const readmeContent = readmeFound ? readmeState.readme.content : "";

  let treeAvailable = false;
  let truncated = false;
  let paths: string[] = [];
  if (treeState && (treeState.status === "found" || treeState.status === "truncated")) {
    treeAvailable = true;
    truncated = treeState.status === "truncated" || treeState.tree.truncated;
    paths = treeState.tree.entries.map((entry) => entry.path);
  }

  return {
    repository: { ...repository, topics: [...repository.topics] },
    readme: { found: readmeFound, content: readmeContent },
    tree: { available: treeAvailable, truncated, paths },
    techSignals: techSignals.map((signal) => ({ ...signal, evidence: [...signal.evidence] })),
  };
}

/** Wraps a snapshot with the pure helper methods plugins call. */
export function createCheckContext(snapshot: CheckSnapshot): CheckContext {
  const topics = new Set(snapshot.repository.topics.map((topic) => topic.toLowerCase()));

  return {
    ...snapshot,
    hasPath(pattern: string | RegExp): boolean {
      if (!snapshot.tree.available) return false;
      const matcher = typeof pattern === "string" ? globToRegExp(pattern) : pattern;
      return snapshot.tree.paths.some((path) => matcher.test(path) || matcher.test(basename(path)));
    },
    readmeMatches(pattern: RegExp): boolean {
      return pattern.test(snapshot.readme.content);
    },
    hasTopic(name: string): boolean {
      return topics.has(name.toLowerCase());
    },
  };
}

function basename(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}

/** Minimal glob: `*` matches within a path segment, `**` matches across segments. */
function globToRegExp(glob: string): RegExp {
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*") {
      if (glob[index + 1] === "*") {
        source += ".*";
        index += 1;
      } else {
        source += "[^/]*";
      }
    } else if (/[.+?^${}()|[\]\\]/.test(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }
  return new RegExp(`^${source}$`, "i");
}
