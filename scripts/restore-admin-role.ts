/**
 * Restore the UserRole of accounts that carry an adminRole.
 *
 * Why this exists
 * ---------------
 * POST /api/auth/mode used to write `user.role = 'guest' | 'host'` with no guard,
 * and the guest/host toggle is rendered in the navbar for every signed-in user.
 * A single click on an admin account therefore overwrote role=ADMIN with HOST in
 * the database — permanently. Every admin endpoint then answered
 * 403 "Forbidden: not an admin account", and the UI offered no way back because
 * the admin panel itself was what got locked away.
 *
 * The endpoint and the Settings screen now refuse that switch for admins, but
 * already-corrupted rows still need repairing. That's this script.
 *
 * Usage
 * -----
 *   npx tsx scripts/restore-admin-role.ts            # dry run — reports only
 *   npx tsx scripts/restore-admin-role.ts --apply    # actually writes
 *
 * Safe by design: it only touches rows where adminRole IS NOT NULL, so it can
 * never promote a regular rider.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const staff = await prisma.user.findMany({
    where: { adminRole: { not: null } },
    select: { id: true, email: true, role: true, adminRole: true },
    orderBy: { email: "asc" },
  });

  if (staff.length === 0) {
    console.log("No accounts with an adminRole found — nothing to do.");
    return;
  }

  console.log(`Found ${staff.length} account(s) carrying an adminRole:\n`);
  const broken = staff.filter((u) => String(u.role) !== "ADMIN");

  for (const u of staff) {
    const ok = String(u.role) === "ADMIN";
    console.log(`  ${ok ? "OK  " : "FIX "} ${u.email}  role=${u.role}  adminRole=${u.adminRole}`);
  }

  if (broken.length === 0) {
    console.log("\nAll staff accounts already have role=ADMIN. Nothing to change.");
    return;
  }

  if (!APPLY) {
    console.log(`\n${broken.length} account(s) would be set to role=ADMIN.`);
    console.log("Dry run — no changes written. Re-run with --apply to commit.");
    return;
  }

  const result = await prisma.user.updateMany({
    where: { adminRole: { not: null }, role: { not: "ADMIN" } },
    data: { role: "ADMIN" },
  });
  console.log(`\nUpdated ${result.count} account(s) to role=ADMIN.`);
  console.log("Sign out and sign in again so a fresh JWT is issued with the corrected role.");
}

main()
  .catch((e) => {
    console.error("Failed:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
