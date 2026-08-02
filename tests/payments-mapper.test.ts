import { describe, it, expect, vi } from "vitest";

// db.ts pulls in the real PrismaClient at module load — stub it out so these
// pure mapper tests run without a database.
vi.mock("../backend/prisma", () => ({ default: {}, prisma: {} }));

import { toDbPayment, fromDbPayment } from "../backend/db";

describe("toDbPayment", () => {
  it("uppercases status to match the PaymentStatus DB enum", () => {
    expect(toDbPayment({ id: "pay_1", status: "created" }).status).toBe("CREATED");
    expect(toDbPayment({ id: "pay_1", status: "success" }).status).toBe("SUCCESS");
    expect(toDbPayment({ id: "pay_1", status: "failed" }).status).toBe("FAILED");
  });

  it("keeps notes on the `notes` column (regression: was renamed to non-existent `metadata`)", () => {
    const out = toDbPayment({ id: "pay_1", status: "created", notes: { planName: "7 Day Pass", role: "guest" } });
    expect(out.notes).toEqual({ planName: "7 Day Pass", role: "guest" });
    expect(out).not.toHaveProperty("metadata");
  });

  it("converts ISO createdAt strings to Date and strips updatedAt", () => {
    const out = toDbPayment({ id: "pay_1", status: "created", createdAt: "2026-07-01T10:00:00.000Z", updatedAt: new Date() });
    expect(out.createdAt).toBeInstanceOf(Date);
    expect(out.createdAt.toISOString()).toBe("2026-07-01T10:00:00.000Z");
    expect(out).not.toHaveProperty("updatedAt");
  });

  it("defaults a missing status to CREATED and omits empty notes", () => {
    const out = toDbPayment({ id: "pay_1" });
    expect(out.status).toBe("CREATED");
    expect(out.notes).toBeUndefined();
    expect(out.createdAt).toBeUndefined();
  });
});

describe("fromDbPayment", () => {
  it("lowercases the DB enum status for in-memory use", () => {
    expect(fromDbPayment({ id: "pay_1", status: "SUCCESS" }).status).toBe("success");
  });

  it("reads notes from the `notes` column (regression: was read from `metadata`, wiping it)", () => {
    const out = fromDbPayment({ id: "pay_1", status: "SUCCESS", notes: { planName: "Monthly Pass" } });
    expect(out.notes).toEqual({ planName: "Monthly Pass" });
  });

  it("converts Date createdAt to ISO string and strips updatedAt", () => {
    const out = fromDbPayment({ id: "pay_1", status: "CREATED", createdAt: new Date("2026-07-01T10:00:00.000Z"), updatedAt: new Date() });
    expect(out.createdAt).toBe("2026-07-01T10:00:00.000Z");
    expect(out).not.toHaveProperty("updatedAt");
  });

  it("round-trips a payment through toDbPayment → fromDbPayment unchanged", () => {
    const payment = {
      id: "pay_abc12345",
      userId: "usr_1",
      provider: "razorpay",
      providerOrderId: "order_x",
      providerPaymentId: "rzp_pay_x",
      amount: 450,
      currency: "INR",
      status: "success",
      subscriptionId: "sub_1",
      notes: { planName: "15 Day Pass", role: "guest", distanceKm: 8 },
      createdAt: "2026-07-01T10:00:00.000Z",
    };
    expect(fromDbPayment(toDbPayment(payment))).toEqual(payment);
  });
});
