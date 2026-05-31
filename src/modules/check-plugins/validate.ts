import type { PackManifest } from "./types";

export type ManifestValidation =
  | { ok: true; manifest: PackManifest }
  | { ok: false; error: string };

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

/**
 * Structurally validates a pack manifest (the shape in
 * schemas/openready.pack.v1.schema.json). Pure and offline — no code is executed and
 * nothing is fetched. Returns a typed manifest or a human-readable reason.
 */
export function validatePackManifest(value: unknown): ManifestValidation {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Manifest must be a JSON object." };
  }
  const manifest = value as Record<string, unknown>;

  if (manifest.schema !== "openready.pack.v1") {
    return { ok: false, error: 'Manifest "schema" must be "openready.pack.v1".' };
  }
  if (!isNonEmptyString(manifest.name)) {
    return { ok: false, error: 'Manifest "name" is required.' };
  }
  if (!isNonEmptyString(manifest.version)) {
    return { ok: false, error: 'Manifest "version" is required.' };
  }
  if (manifest.author !== undefined && typeof manifest.author !== "string") {
    return { ok: false, error: 'Manifest "author" must be a string.' };
  }
  if (manifest.description !== undefined && typeof manifest.description !== "string") {
    return { ok: false, error: 'Manifest "description" must be a string.' };
  }
  if (
    !Array.isArray(manifest.checkIds) ||
    manifest.checkIds.length === 0 ||
    !manifest.checkIds.every((id) => typeof id === "string" && ID_PATTERN.test(id))
  ) {
    return {
      ok: false,
      error: 'Manifest "checkIds" must be a non-empty array of "vendor/check-name" ids.',
    };
  }

  return {
    ok: true,
    manifest: {
      schema: "openready.pack.v1",
      name: manifest.name,
      version: manifest.version,
      author: manifest.author as string | undefined,
      description: manifest.description as string | undefined,
      checkIds: manifest.checkIds as string[],
    },
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
