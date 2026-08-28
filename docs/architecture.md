# Architecture

Blinky is a small Lightning payment app: a React UI talks to a NestJS API, which talks to Blink, which settles over the Lightning Network. Payment confirmation is asynchronous. The frontend learns about settlement by polling; the backend learns about settlement from Blink webhooks.

```text
              ┌──────────────┐
              │   Frontend   │
              └──────┬───────┘
                     │ create invoice / pay / poll status
                     ▼
              ┌──────────────┐
              │  NestJS API  │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │PaymentService│
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │PaymentProvider
              │Blink / Mock  │
              └──────┬───────┘
                     │
                     ▼
                Blink API
                     │
                     ▼
             Lightning Network


Blink Webhook (Svix)
      │
      ▼
Webhook Processor
      │  idempotent event store + state transitions
      ▼
Payment State (MongoDB)
      │
      ▼
Frontend polling
```

## 1. Frontend

React + Vite + Tailwind. Routes cover receive (`/invoice/create`), invoice detail with QR + polling (`/invoice/:invoiceId`), send (`/invoice/pay`), and history (`/history`).

`usePaymentPolling` asks `GET /api/v1/invoices/:id` every 3 seconds, stops on `PAID` / `FAILED` / `EXPIRED`, stops on unmount, and times out after 16 minutes.

## 2. Backend API

NestJS under `/api/v1`. Swagger UI lives at `/api/docs`.

Important routes:

- `POST /invoices` — create an incoming Lightning invoice
- `GET /invoices/:invoiceId` — current payment (expire-on-read if past `expiresAt`)
- `POST /payments/decode` — decode a bolt11 invoice
- `POST /payments/pay` — pay via Blink `lnInvoicePaymentSend`
- `GET /payments` — recent payment history
- `POST /webhooks/blink` — Blink/Svix callbacks
- `GET /health` — process + Mongo connectivity

## 3. Payment service

`PaymentsService` owns the Mongo `payments` collection. Each record has a public `invoiceId`, Blink `providerPaymentId` (payment hash), bolt11 invoice, amount, currency, direction (`incoming` | `outgoing`), and status.

Transitions are a small function, not a framework:

```text
PENDING → PAID | FAILED | EXPIRED
```

Terminal states never revert. Duplicate `PAID` is a no-op.

## 4. Blink provider

`PaymentProvider` is injected with token `PAYMENT_PROVIDER`.

- `BlinkProvider` calls Blink GraphQL: `lnInvoiceCreate` / `lnUsdInvoiceCreate`, `lnInvoicePaymentStatusByHash`, `lnInvoicePaymentSend`.
- `MockPaymentProvider` is used when `PAYMENT_PROVIDER=mock` or `BLINK_API_KEY` is empty, and in tests.

Controllers never call Blink directly.

## 5. Database

MongoDB via Mongoose.

- `payments` — payment records
- `webhook_events` — unique `(provider, eventId)` for webhook idempotency

## 6. Webhook processor

`POST /api/v1/webhooks/blink`

1. Verify Svix signature when `BLINK_WEBHOOK_SECRET` is set
2. Validate payload
3. Insert `WebhookEvent` (duplicate key → ack duplicate)
4. Find payment by payment hash
5. Apply status transition
6. Return 2xx

Supported events: `receive.lightning`, `send.lightning`.

## 7. Frontend polling

The UI does not use WebSockets. After invoice creation, it polls until a terminal status, a timeout, or the user leaves the page.
