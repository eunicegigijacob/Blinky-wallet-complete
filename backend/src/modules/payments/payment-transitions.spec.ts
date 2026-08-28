import {
  assertPaymentTransition,
  canTransition,
  InvalidPaymentTransitionError,
  isNoopTransition,
  isTerminalStatus,
} from "./payment-transitions";

describe("payment transitions", () => {
  it("allows PENDING → PAID", () => {
    expect(assertPaymentTransition("PENDING", "PAID")).toBe("applied");
  });

  it("allows PENDING → FAILED", () => {
    expect(assertPaymentTransition("PENDING", "FAILED")).toBe("applied");
  });

  it("allows PENDING → EXPIRED", () => {
    expect(assertPaymentTransition("PENDING", "EXPIRED")).toBe("applied");
  });

  it("treats duplicate PAID as a no-op", () => {
    expect(assertPaymentTransition("PAID", "PAID")).toBe("noop");
    expect(isNoopTransition("PAID", "PAID")).toBe(true);
  });

  it("rejects PAID → PENDING", () => {
    expect(() => assertPaymentTransition("PAID", "PENDING")).toThrow(
      InvalidPaymentTransitionError,
    );
  });

  it("rejects PAID → FAILED", () => {
    expect(() => assertPaymentTransition("PAID", "FAILED")).toThrow(
      InvalidPaymentTransitionError,
    );
  });

  it("rejects EXPIRED → PENDING", () => {
    expect(() => assertPaymentTransition("EXPIRED", "PENDING")).toThrow(
      InvalidPaymentTransitionError,
    );
  });

  it("does not allow a late PENDING event to overwrite PAID", () => {
    expect(canTransition("PAID", "PENDING")).toBe(false);
    expect(isTerminalStatus("PAID")).toBe(true);
  });

  it("does not allow out-of-order FAILED after PAID", () => {
    expect(canTransition("PAID", "FAILED")).toBe(false);
  });
});
