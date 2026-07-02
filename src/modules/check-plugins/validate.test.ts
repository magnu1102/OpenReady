import { describe, expect, it } from "vitest";
import { validatePackManifest } from "./validate";

const valid = {
  schema: "openready.pack.v1",
  name: "Acme Checks",
  version: "1.0.0",
  author: "Acme",
  checkIds: ["acme/has-changelog", "acme/license"],
};

describe("validatePackManifest", () => {
  it("accepts a well-formed manifest", () => {
    const result = validatePackManifest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.manifest.name).toBe("Acme Checks");
  });

  it("rejects wrong schema, missing fields, and bad ids", () => {
    expect(validatePackManifest(null).ok).toBe(false);
    expect(validatePackManifest({ ...valid, schema: "openready.pack.v2" }).ok).toBe(false);
    expect(validatePackManifest({ ...valid, name: "" }).ok).toBe(false);
    expect(validatePackManifest({ ...valid, checkIds: [] }).ok).toBe(false);
    expect(validatePackManifest({ ...valid, checkIds: ["NoNamespace"] }).ok).toBe(false);
  });
});
