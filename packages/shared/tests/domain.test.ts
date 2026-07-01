import { describe, expect, it } from "vitest";
import { canTransition } from "../src/transitions.js";
import { computeBackoffMs, shouldRetry } from "../src/retry.js";

describe("transition rules", () => {
  it("allows valid transitions", () => {
    expect(canTransition("PENDING", "LEASED")).toBe(true);
    expect(canTransition("RUNNING", "SUCCESS")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransition("SUCCESS", "PENDING")).toBe(false);
    expect(canTransition("CANCELLED", "RUNNING")).toBe(false);
  });
});

describe("retry logic", () => {
  it("computes exponential backoff", () => {
    expect(computeBackoffMs(1)).toBe(2000);
    expect(computeBackoffMs(2)).toBe(4000);
  });

  it("respects max attempts", () => {
    expect(shouldRetry(0, 3)).toBe(true);
    expect(shouldRetry(3, 3)).toBe(false);
  });
});
