import { beforeEach, describe, expect, it } from "vitest";
import {
  ANALYSIS_CACHE_RETENTION_LIMIT,
  ANALYSIS_CACHE_STALE_MS,
  clearAnalysisCache,
  createAnalysisCacheSnapshot,
  getCachedAnalysis,
  isAnalysisSnapshotStale,
  listCachedAnalyses,
  saveAnalysisSnapshot,
} from "./analysisCache";
import type { AnalysisResult, Repository } from "@/types";

const repository: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: null,
  language: "TypeScript",
  topics: ["desktop"],
  license: null,
  defaultBranch: "main",
  stars: 1,
  forks: 0,
  archived: false,
  fork: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
  pushedAt: "2026-05-28T00:00:00.000Z",
};

function analysis(repositoryOverride: Partial<Repository> = {}): AnalysisResult {
  const repo = { ...repository, ...repositoryOverride };
  return {
    repository: repo,
    checks: [],
    analyzedAt: "2026-05-28T10:00:00.000Z",
    healthLabel: "Portfolio-ready",
    score: {
      total: 100,
      categories: [],
      weakestCategory: null,
      strongestCategory: null,
    },
    passedCount: 0,
    failedCount: 0,
    unknownCount: 0,
    missingSignals: [],
    recommendations: [],
  };
}

function snapshot(username: string, savedAt: string) {
  const repo = { ...repository, id: username, name: username, fullName: `${username}/repo` };
  return createAnalysisCacheSnapshot({
    username,
    repositories: [repo],
    readmes: {},
    trees: {},
    analyses: [analysis(repo)],
    fetchedAt: savedAt,
    savedAt,
  });
}

beforeEach(async () => {
  await clearAnalysisCache();
});

describe("analysisCache", () => {
  it("saves and restores a full analysis snapshot by normalized username", async () => {
    const current = snapshot("OctoCat", "2026-05-28T10:00:00.000Z");

    await saveAnalysisSnapshot(current);

    await expect(getCachedAnalysis(" octocat ")).resolves.toMatchObject({
      username: "octocat",
      repositories: [expect.objectContaining({ fullName: "OctoCat/repo" })],
      analyses: [expect.objectContaining({ healthLabel: "Portfolio-ready" })],
    });
  });

  it("keeps only the five most recently saved users", async () => {
    for (let index = 0; index < ANALYSIS_CACHE_RETENTION_LIMIT + 2; index += 1) {
      await saveAnalysisSnapshot(snapshot(`user-${index}`, `2026-05-28T10:0${index}:00.000Z`));
    }

    const cached = await listCachedAnalyses();

    expect(cached).toHaveLength(ANALYSIS_CACHE_RETENTION_LIMIT);
    expect(cached.map((entry) => entry.username)).toEqual([
      "user-6",
      "user-5",
      "user-4",
      "user-3",
      "user-2",
    ]);
  });

  it("replaces an existing username instead of creating duplicates", async () => {
    await saveAnalysisSnapshot(snapshot("octocat", "2026-05-28T10:00:00.000Z"));
    await saveAnalysisSnapshot(snapshot("OctoCat", "2026-05-28T11:00:00.000Z"));

    const cached = await listCachedAnalyses();

    expect(cached).toHaveLength(1);
    expect(cached[0]).toMatchObject({
      username: "octocat",
      savedAt: "2026-05-28T11:00:00.000Z",
    });
  });

  it("marks snapshots stale after 24 hours", () => {
    const fresh = snapshot("fresh", "2026-05-28T10:00:00.000Z");
    const stale = snapshot(
      "stale",
      new Date(Date.parse("2026-05-28T10:00:00.000Z") - ANALYSIS_CACHE_STALE_MS - 1).toISOString(),
    );

    expect(isAnalysisSnapshotStale(fresh, new Date("2026-05-28T12:00:00.000Z"))).toBe(false);
    expect(isAnalysisSnapshotStale(stale, new Date("2026-05-28T10:00:00.000Z"))).toBe(true);
  });

  it("clears all cached snapshots", async () => {
    await saveAnalysisSnapshot(snapshot("octocat", "2026-05-28T10:00:00.000Z"));

    await clearAnalysisCache();

    await expect(listCachedAnalyses()).resolves.toEqual([]);
  });
});
