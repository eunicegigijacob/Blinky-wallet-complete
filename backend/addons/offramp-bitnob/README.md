# Bitnob Off-ramp Adapter

This module shows how to extend paid Lightning transfers into fiat disbursement.

- Plug in after transfer status is `paid`.
- Input: `invoiceId`, recipient banking details, fiat currency.
- Output: disbursement reference + status.

Suggested integration point: webhook post-processing worker.
