import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/filters/api-exception.filter";

describe("Blinky API (e2e)", () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    process.env.NODE_ENV = "test";
    process.env.PAYMENT_PROVIDER = "mock";
    process.env.BLINK_WEBHOOK_SECRET = "";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it("GET /health returns ok when Mongo is up", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.database).toBe("up");
  });

  it("rejects invalid invoice creation payloads", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/invoices")
      .send({ amount: -1, memo: "bad" })
      .expect(400);
  });

  it("creates an invoice and retrieves PENDING status", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/invoices")
      .send({ amount: 2100, memo: "e2e invoice" })
      .expect(201);

    expect(created.body.invoiceId).toMatch(/^pay_/);
    expect(created.body.status).toBe("PENDING");
    expect(created.body.paymentRequest).toMatch(/^lnbc/);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/invoices/${created.body.invoiceId}`)
      .expect(200);

    expect(fetched.body.status).toBe("PENDING");
    expect(fetched.body.amount).toBe(2100);
  });

  it("returns 404 for unknown payments", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/invoices/pay_doesnotexist01")
      .expect(404);
  });

  it("rejects invalid payment identifiers", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/invoices/not-valid")
      .expect(400);
  });

  it("processes a valid webhook and marks the payment PAID", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/invoices")
      .send({ amount: 500, memo: "webhook paid" })
      .expect(201);

    const webhook = await request(app.getHttpServer())
      .post("/api/v1/webhooks/blink")
      .send({
        eventType: "receive.lightning",
        transaction: {
          id: `tx-${created.body.invoiceId}`,
          status: "success",
          initiationVia: {
            type: "lightning",
            paymentHash: created.body.providerPaymentId,
          },
        },
      })
      .expect(200);

    expect(webhook.body.status).toBe("paid");

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/invoices/${created.body.invoiceId}`)
      .expect(200);
    expect(fetched.body.status).toBe("PAID");
  });

  it("rejects an invalid webhook payload missing a hash by ignoring it", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/webhooks/blink")
      .send({ eventType: "receive.lightning", transaction: { status: "success" } })
      .expect(200);
    expect(response.body.status).toBe("ignored");
  });

  it("processes the same webhook 10 times exactly once", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/invoices")
      .send({ amount: 777, memo: "duplicate webhook" })
      .expect(201);

    const payload = {
      eventType: "receive.lightning",
      transaction: {
        id: "evt-duplicate-10",
        status: "success",
        initiationVia: {
          type: "lightning",
          paymentHash: created.body.providerPaymentId,
        },
      },
    };

    const responses = [];
    for (let i = 0; i < 10; i += 1) {
      responses.push(
        await request(app.getHttpServer())
          .post("/api/v1/webhooks/blink")
          .send(payload)
          .expect(200),
      );
    }

    expect(responses[0].body.status).toBe("paid");
    expect(responses.slice(1).every((res) => res.body.status === "duplicate")).toBe(
      true,
    );

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/invoices/${created.body.invoiceId}`)
      .expect(200);
    expect(fetched.body.status).toBe("PAID");
  });

  it("ignores a late PENDING webhook after PAID", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/invoices")
      .send({ amount: 321, memo: "out of order" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/webhooks/blink")
      .send({
        eventType: "receive.lightning",
        transaction: {
          id: "evt-paid-first",
          status: "success",
          initiationVia: {
            paymentHash: created.body.providerPaymentId,
          },
        },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/v1/webhooks/blink")
      .send({
        eventType: "receive.lightning",
        transaction: {
          id: "evt-late-pending",
          status: "pending",
          initiationVia: {
            paymentHash: created.body.providerPaymentId,
          },
        },
      })
      .expect(200);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/invoices/${created.body.invoiceId}`)
      .expect(200);
    expect(fetched.body.status).toBe("PAID");
  });

  it("marks a payment FAILED from a failure webhook and keeps it failed", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/invoices")
      .send({ amount: 111, memo: "failed payment" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/webhooks/blink")
      .send({
        eventType: "receive.lightning",
        transaction: {
          id: "evt-failed",
          status: "failure",
          initiationVia: {
            paymentHash: created.body.providerPaymentId,
          },
        },
      })
      .expect(200);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/invoices/${created.body.invoiceId}`)
      .expect(200);
    expect(fetched.body.status).toBe("FAILED");
  });

  it("pays a mock invoice and records an outgoing payment", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/invoices")
      .send({ amount: 1000, memo: "to pay" })
      .expect(201);

    const paid = await request(app.getHttpServer())
      .post("/api/v1/payments/pay")
      .send({ paymentRequest: created.body.paymentRequest })
      .expect(201);

    expect(paid.body.direction).toBe("outgoing");
    expect(["PAID", "PENDING", "FAILED"]).toContain(paid.body.status);
  });
});
