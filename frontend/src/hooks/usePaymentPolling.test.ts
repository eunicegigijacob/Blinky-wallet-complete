import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldContinuePolling } from "./paymentPolling.ts";

describe("shouldContinuePolling", () => {
  it("stops after PAID", () => {
    assert.equal(shouldContinuePolling("PAID", 1000), false);
  });

  it("stops after FAILED", () => {
    assert.equal(shouldContinuePolling("FAILED", 1000), false);
  });

  it("stops after EXPIRED", () => {
    assert.equal(shouldContinuePolling("EXPIRED", 1000), false);
  });

  it("continues while PENDING before timeout", () => {
    assert.equal(shouldContinuePolling("PENDING", 1000), true);
  });

  it("stops after timeout even if still PENDING", () => {
    assert.equal(shouldContinuePolling("PENDING", 16 * 60 * 1000), false);
  });
});
