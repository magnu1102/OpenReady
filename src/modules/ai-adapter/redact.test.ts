import { describe, expect, it } from "vitest";
import { redactSecrets } from "./redact";

describe("redactSecrets", () => {
  it("removes GitHub tokens", () => {
    const out = redactSecrets("token ghp_abcdefghijklmnopqrstuvwxyz0123 here");
    expect(out).toBe("token [redacted] here");
    expect(out).not.toContain("ghp_");
  });

  it("removes fine-grained GitHub PATs", () => {
    const out = redactSecrets("use github_pat_11ABCDEFG0aaaaaaaaaaaa_bbbbbbbb now");
    expect(out).not.toContain("github_pat_");
  });

  it("removes OpenAI-style keys", () => {
    const out = redactSecrets("OPENAI key sk-abcdEFGH1234ijklMNOP5678 end");
    expect(out).not.toContain("sk-abcd");
    expect(out).toContain("[redacted]");
  });

  it("redacts only the value of a secret-looking env assignment", () => {
    const out = redactSecrets("API_KEY=supersecretvalue123");
    expect(out).toBe("API_KEY=[redacted]");
  });

  it("redacts the credential after a Bearer header", () => {
    const out = redactSecrets("Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456");
    expect(out).toContain("Bearer [redacted]");
    expect(out).not.toContain("abcdefghijklmnopqrstuvwxyz123456");
  });

  it("leaves ordinary prose untouched", () => {
    const prose = "This README explains how to install and run the project locally.";
    expect(redactSecrets(prose)).toBe(prose);
  });

  it("does not redact ordinary KEY=value pairs that are not secrets", () => {
    const text = "VERSION=1.2.3 and NODE_ENV=production";
    expect(redactSecrets(text)).toBe(text);
  });
});
