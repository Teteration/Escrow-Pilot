import { describe, expect, test } from "bun:test";
import { initWorkflow, parseDecision } from "./main";

describe("TrustDApp status validation", () => {
  test("accepts only numeric release/refund decisions", () => {
    expect(parseDecision({ status: 1 })).toBe(1);
    expect(parseDecision({ status: 2 })).toBe(2);
  });
  test("rejects missing, malformed, and unexpected decisions", () => {
    for (const payload of [null, 1, {}, { status: "1" }, { status: 0 }, { status: 3 }]) {
      expect(() => parseDecision(payload)).toThrow();
    }
  });
  test("initializes one cron handler and rejects insecure endpoints", () => {
    const handlers = initWorkflow({ schedule: "*/30 * * * * *", apiUrl: "https://example.com/status" });
    expect(handlers).toHaveLength(1);
    expect(handlers[0].trigger.config.schedule).toBe("*/30 * * * * *");
    expect(() => initWorkflow({ schedule: "*/30 * * * * *", apiUrl: "http://example.com" })).toThrow();
  });
});
