# Failure scenarios

How Blinky behaves in the cases that actually show up with Lightning + webhooks.

## Duplicate webhook

Blink/Svix may deliver `receive.lightning` more than once.

Each event is stored with unique `(provider, eventId)`. The first insert wins. Later deliveries return `{ status: "duplicate" }` and do not change the payment. A second `PAID` on an already `PAID` payment is also a no-op at the state layer.

## Payment arrives late

If the user pays after the invoice `expiresAt`, expire-on-read can already have moved the record to `EXPIRED`. A late `PAID` webhook then hits an invalid transition (`EXPIRED → PAID`) and is ignored. The payment stays `EXPIRED`.

This is a real Lightning edge case: the invoice may still be payable at the protocol layer after our app expiry window. Blinky prefers not to revive expired local records.

## Payment already completed

Another completion event after `PAID` is acknowledged and ignored. Status stays `PAID`. `paidAt` is not overwritten.

## Blink unavailable

Invoice create and pay map provider failures to `503 Lightning provider is unavailable`. Timeouts map to `504 Lightning provider timed out`. The API does not return GraphQL internals or stack traces.

## Frontend loses connection

Polling treats HTTP errors as `Unable to check payment status. Please try again.` Polling continues until a terminal status or the 16-minute timeout, and stops if the page unmounts. The user can retry.

## Invoice expires

Incoming invoices expire after 15 minutes (Blink `expiresIn`). `GET /invoices/:id` marks `PENDING` records `EXPIRED` when `expiresAt` is in the past. The UI shows `Invoice expired` and stops polling.

## Webhook arrives out of order

Blink's documented `receive.lightning` payload is a successful settlement; it does not include a reliable event-time ordering vector.

Blinky therefore treats terminal states as sticky: `PAID` cannot move to `PENDING`, `FAILED`, or `EXPIRED`. A late pending event after a successful payment leaves the record `PAID`.

## Unsigned webhooks

Blink signs callbacks with Svix (`svix-id`, `svix-timestamp`, `svix-signature`). Production must set `BLINK_WEBHOOK_SECRET` (`whsec_…`). Unsigned webhooks are accepted only in `NODE_ENV=test` or `PAYMENT_PROVIDER=mock` so local and CI tests can run without Blink.
