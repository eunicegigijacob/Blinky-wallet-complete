export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED", "EXPIRED"],
  PAID: [],
  FAILED: [],
  EXPIRED: [],
};

export class InvalidPaymentTransitionError extends Error {
  constructor(
    public readonly from: PaymentStatus,
    public readonly to: PaymentStatus,
  ) {
    super(`Invalid payment transition: ${from} → ${to}`);
    this.name = "InvalidPaymentTransitionError";
  }
}

export function isTerminalStatus(status: PaymentStatus): boolean {
  return status === "PAID" || status === "FAILED" || status === "EXPIRED";
}

export function isNoopTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return from === to;
}

export function canTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED[from].includes(to);
}

export type TransitionResult = "applied" | "noop";

export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): TransitionResult {
  if (from === to) {
    return "noop";
  }
  if (!ALLOWED[from].includes(to)) {
    throw new InvalidPaymentTransitionError(from, to);
  }
  return "applied";
}
