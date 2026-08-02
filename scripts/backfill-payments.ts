// Backfill missing payment rows from subscriptions.
//
// Payments were never persisted (toDbPayment wrote a non-existent `metadata`
// column and a lowercase enum status, and safeUpsert swallowed the error), so
// the payments table stayed empty even though real purchases happened. Every
// paid purchase does have a subscription row, so this reconstructs one SUCCESS
// payment per subscription that has no payment row referencing it.
//
// Reconstructed rows have providerOrderId/providerPaymentId = null (the
// Razorpay ids were lost with the in-memory state) and notes.backfilled = true
// so they are distinguishable from organically recorded payments.
//
// Dry-run by default — prints what it would insert. Pass --apply to write:
//   npx tsx scripts/backfill-payments.ts
//   npx tsx scripts/backfill-payments.ts --apply
import { randomUUID } from "crypto";
import { prisma } from "../backend/prisma";

const apply = process.argv.includes("--apply");

async function backfill() {
  console.log(`=== Payment backfill (${apply ? "APPLY" : "dry-run"}) ===`);

  const [subs, payments] = await Promise.all([
    prisma.subscription.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.payment.findMany({ select: { subscriptionId: true } }),
  ]);
  const covered = new Set(payments.map((p) => p.subscriptionId).filter(Boolean));
  const missing = subs.filter((s) => !covered.has(s.id));

  console.log(
    `${subs.length} subscriptions, ${payments.length} existing payments, ${missing.length} missing payment rows`
  );

  let created = 0;
  for (const sub of missing) {
    const row = {
      id: "pay_" + randomUUID().replace(/-/g, "").substring(0, 8),
      userId: sub.userId,
      provider: "razorpay",
      providerOrderId: null,
      providerPaymentId: null,
      amount: sub.amountPaid,
      currency: "INR",
      status: "SUCCESS" as const,
      subscriptionId: sub.id,
      notes: { planName: sub.planName, role: sub.role, backfilled: true, source: "subscription" },
      createdAt: sub.createdAt ?? new Date(sub.startDate),
    };
    console.log(
      `  ${apply ? "insert" : "would insert"} ${row.id}: user=${sub.userId} INR ${sub.amountPaid} "${sub.planName}" (sub ${sub.id}, ${sub.startDate})`
    );
    if (apply) {
      await prisma.payment.create({ data: row });
      created++;
    }
  }

  console.log(
    apply
      ? `=== Backfill complete — ${created} payments created ===`
      : `=== Dry run complete — re-run with --apply to insert ${missing.length} rows ===`
  );
  await prisma.$disconnect();
}

backfill().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
