import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  VerifyOtpSchema,
  ActivateSubscriptionSchema,
  CreateOrderSchema,
  RedeemVoucherSchema,
  StartTripSchema,
  SendMessageSchema,
  CreateTicketSchema,
  GeoPointSchema,
  AdminCreditWalletSchema,
} from "../backend/validation";

describe("RegisterSchema", () => {
  it("accepts valid registration", () => {
    const r = RegisterSchema.safeParse({ name: "Alice", phone: "+919876543210", role: "guest" });
    expect(r.success).toBe(true);
  });

  it("rejects missing name", () => {
    const r = RegisterSchema.safeParse({ phone: "+919876543210" });
    expect(r.success).toBe(false);
  });

  it("accepts optional email", () => {
    const r = RegisterSchema.safeParse({ name: "Alice", phone: "+919876543210", email: "alice@example.com" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = RegisterSchema.safeParse({ name: "Alice", phone: "+919876543210", email: "not-an-email" });
    expect(r.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid phone", () => {
    const r = LoginSchema.safeParse({ phone: "+919876543210" });
    expect(r.success).toBe(true);
  });

  it("rejects empty phone", () => {
    const r = LoginSchema.safeParse({ phone: "" });
    expect(r.success).toBe(false);
  });
});

describe("VerifyOtpSchema", () => {
  it("accepts valid OTP payload", () => {
    const r = VerifyOtpSchema.safeParse({ userId: "usr_abc", code: "123456" });
    expect(r.success).toBe(true);
  });

  it("accepts OTP without code (Firebase path)", () => {
    const r = VerifyOtpSchema.safeParse({ userId: "usr_abc", firebaseIdToken: "some_token" });
    expect(r.success).toBe(true);
  });
});

describe("ActivateSubscriptionSchema", () => {
  it("accepts valid subscription payload", () => {
    const r = ActivateSubscriptionSchema.safeParse({
      role: "guest",
      planName: "22 Day Plan",
      origin: "Station A",
      destination: "Office B",
      amountPaid: 500,
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing origin", () => {
    const r = ActivateSubscriptionSchema.safeParse({
      role: "guest",
      planName: "22 Day Plan",
      destination: "Office B",
      amountPaid: 500,
    });
    expect(r.success).toBe(false);
  });

  it("accepts host subscription", () => {
    const r = ActivateSubscriptionSchema.safeParse({
      role: "host",
      planName: "Monthly",
      origin: "Home",
      destination: "Work",
      amountPaid: 49,
    });
    expect(r.success).toBe(true);
  });
});

describe("CreateOrderSchema", () => {
  it("accepts valid order", () => {
    const r = CreateOrderSchema.safeParse({ planName: "22 Day Plan", role: "guest", distanceKm: 8 });
    expect(r.success).toBe(true);
  });
});

describe("RedeemVoucherSchema", () => {
  it("accepts valid code", () => {
    const r = RedeemVoucherSchema.safeParse({ code: "SAVE50" });
    expect(r.success).toBe(true);
  });

  it("rejects empty code", () => {
    const r = RedeemVoucherSchema.safeParse({ code: "" });
    expect(r.success).toBe(false);
  });
});

describe("SendMessageSchema", () => {
  it("accepts valid message", () => {
    const r = SendMessageSchema.safeParse({ receiverId: "usr_abc", text: "Hello!" });
    expect(r.success).toBe(true);
  });

  it("rejects empty text", () => {
    const r = SendMessageSchema.safeParse({ receiverId: "usr_abc", text: "" });
    expect(r.success).toBe(false);
  });
});

describe("CreateTicketSchema", () => {
  it("accepts valid ticket", () => {
    const r = CreateTicketSchema.safeParse({ subject: "Issue", description: "Something broke" });
    expect(r.success).toBe(true);
  });
});

describe("GeoPointSchema", () => {
  it("accepts valid coords", () => {
    const r = GeoPointSchema.safeParse({ lat: 12.34, lng: 56.78 });
    expect(r.success).toBe(true);
  });

  it("rejects invalid lat", () => {
    const r = GeoPointSchema.safeParse({ lat: 100, lng: 56.78 });
    expect(r.success).toBe(false);
  });
});

describe("AdminCreditWalletSchema", () => {
  it("accepts valid credit", () => {
    const r = AdminCreditWalletSchema.safeParse({ userId: "usr_1", action: "credit", amount: 100, reason: "Refund" });
    expect(r.success).toBe(true);
  });

  it("accepts valid deduct", () => {
    const r = AdminCreditWalletSchema.safeParse({ userId: "usr_1", action: "deduct", amount: 50 });
    expect(r.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const r = AdminCreditWalletSchema.safeParse({ userId: "usr_1", action: "credit", amount: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects invalid action", () => {
    const r = AdminCreditWalletSchema.safeParse({ userId: "usr_1", action: "refund", amount: 100 });
    expect(r.success).toBe(false);
  });
});
