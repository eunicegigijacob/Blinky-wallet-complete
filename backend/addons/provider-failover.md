# Provider Failover Strategy

Primary and extension path:

1. Blink remains the Lightning invoice rail.
2. After `paid`, dispatch off-ramp by corridor and currency policy.
3. Prefer Bitnob for corridor A, Mava Pay for corridor B.
4. On off-ramp failure, queue retry job and mark transfer as `failed` only after retry policy is exhausted.

Implementation notes:

- Keep `LightningProvider` independent from `OfframpProvider`.
- Persist correlation ids (`invoiceId`, `paymentHash`, `disbursementId`) for auditing.
