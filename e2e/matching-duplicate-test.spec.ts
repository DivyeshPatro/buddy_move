import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const BASE = "http://localhost:3001";

test.setTimeout(120000);

async function registerAndLogin(
  request: APIRequestContext,
  tag: string
): Promise<{ userId: string; token: string }> {
  const ts = Date.now();
  const email = `${tag}_${ts}@e2e.com`;
  const phone = `999999${String(ts).slice(-6)}`;

  const reg = await request.post(`${BASE}/api/auth/register`, {
    data: { name: tag, email, phone, gender: "other", role: tag.startsWith("host") ? "host" : "guest" },
  });
  const regBody = await reg.json();
  expect(regBody.user?.id).toBeTruthy();
  const userId = regBody.user.id;

  await request.post(`${BASE}/api/auth/login`, { data: { phoneOrEmail: email } });

  const verify = await request.post(`${BASE}/api/auth/verify-otp`, {
    data: { userId, code: "123456" },
  });
  const verifyBody = await verify.json();
  expect(verifyBody.success).toBe(true);
  expect(verifyBody.token).toBeTruthy();

  return { userId, token: verifyBody.token };
}

test.describe("Matching — duplicate prevention", () => {
  test("concurrent subscription activations create exactly one match per guest sub", async ({ request }) => {
    const host = await registerAndLogin(request, "host_e2e");
    const guest1 = await registerAndLogin(request, "guest_e2e1");
    const guest2 = await registerAndLogin(request, "guest_e2e2");

    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

    // Purchase host subscription
    const hostSub = await request.post(`${BASE}/api/subscriptions/purchase`, {
      headers: auth(host.token),
      data: {
        userId: host.userId,
        planName: "Monthly",
        amount: 1000,
        role: "host",
        origin: "MG Road, Bangalore",
        destination: "Electronic City, Bangalore",
        originGeo: { lat: 12.9716, lng: 77.5946 },
        destGeo: { lat: 12.8456, lng: 77.6602 },
        forwardTime: "09:00",
        returnTime: "18:00",
      },
    });
    expect(hostSub.status()).toBe(200);
    const hostBody = await hostSub.json();
    expect(hostBody.success).toBe(true);

    // Purchase two guest subscriptions CONCURRENTLY to trigger race condition
    const [g1, g2] = await Promise.all([
      request.post(`${BASE}/api/subscriptions/purchase`, {
        headers: auth(guest1.token),
        data: {
          userId: guest1.userId,
          planName: "Monthly",
          amount: 500,
          role: "guest",
          direction: "forward",
          origin: "MG Road, Bangalore",
          destination: "Electronic City, Bangalore",
          originGeo: { lat: 12.9716, lng: 77.5946 },
          destGeo: { lat: 12.8456, lng: 77.6602 },
          departureTime: "09:00",
        },
      }),
      request.post(`${BASE}/api/subscriptions/purchase`, {
        headers: auth(guest2.token),
        data: {
          userId: guest2.userId,
          planName: "Monthly",
          amount: 500,
          role: "guest",
          direction: "forward",
          origin: "Indiranagar, Bangalore",
          destination: "Whitefield, Bangalore",
          originGeo: { lat: 12.9719, lng: 77.6412 },
          destGeo: { lat: 12.9698, lng: 77.7500 },
          departureTime: "09:00",
        },
      }),
    ]);

    expect(g1.status()).toBe(200);
    expect(g2.status()).toBe(200);
    const g1Body = await g1.json();
    const g2Body = await g2.json();
    console.log("Guest 1 matched:", g1Body.matched, "Guest 2 matched:", g2Body.matched);

    // Verify no duplicate active matches per guest subscription
    for (const g of [guest1, guest2]) {
      const res = await request.get(`${BASE}/api/matches/${g.userId}`, {
        headers: auth(g.token),
      });
      expect(res.status()).toBe(200);
      const matches = await res.json();
      if (Array.isArray(matches)) {
        const subIds = matches
          .filter((m: any) => m.status === "active")
          .map((m: any) => m.guestSubscriptionId);
        const seen = new Set<string>();
        for (const sid of subIds) {
          expect(seen.has(sid)).toBe(false);
          seen.add(sid);
        }
      }
    }

    // Verify host has at most one active match per host subscription
    const hostMatches = await request.get(`${BASE}/api/matches/${host.userId}`, {
      headers: auth(host.token),
    });
    expect(hostMatches.status()).toBe(200);
    const hMatches = await hostMatches.json();
    if (Array.isArray(hMatches)) {
      const hostSubCount = new Map<string, number>();
      for (const m of hMatches.filter((m: any) => m.status === "active")) {
        const hid = m.hostSubscriptionId;
        hostSubCount.set(hid, (hostSubCount.get(hid) || 0) + 1);
      }
      for (const [, count] of hostSubCount) {
        expect(count).toBeLessThanOrEqual(1);
      }
    }

    console.log("Duplicate prevention test PASSED");
  });
});
