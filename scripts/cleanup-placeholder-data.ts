import { prisma } from "../backend/prisma";

const PLACEHOLDER_PATTERNS = ["usr_", "Start usr_", "End usr_"];

function isPlaceholder(val: string | null | undefined): boolean {
  if (!val) return false;
  return PLACEHOLDER_PATTERNS.some(p => val.includes(p));
}

async function cleanup() {
  console.log("=== Junk data cleanup ===");

  // ── Subscriptions with placeholder origin/destination ──
  const allSubs = await prisma.subscription.findMany();
  const junkSubs = allSubs.filter(
    (s: any) => isPlaceholder(s.origin) || isPlaceholder(s.destination)
  );
  console.log(`Found ${junkSubs.length} subscriptions with placeholder addresses`);
  for (const sub of junkSubs) {
    console.log(`  Deleting sub ${sub.id}: origin="${sub.origin}", destination="${sub.destination}"`);
    await prisma.subscription.delete({ where: { id: sub.id } });
  }

  // ── Rides with placeholder origin/destination ──
  const allRides = await prisma.ride.findMany();
  const junkRides = allRides.filter(
    (r: any) => isPlaceholder(r.origin) || isPlaceholder(r.destination)
  );
  console.log(`Found ${junkRides.length} rides with placeholder addresses`);
  for (const ride of junkRides) {
    console.log(`  Deleting ride ${ride.id}: origin="${ride.origin}", destination="${ride.destination}"`);
    // Cascade deletes related ride_requests, route_schedules, tracking events, etc.
    await prisma.ride.delete({ where: { id: ride.id } });
  }

  // ── RideRequests referencing deleted rides are cascaded ──

  await prisma.$disconnect();
  console.log("=== Cleanup complete ===");
}

cleanup().catch((e) => {
  console.error("Cleanup failed:", e);
  process.exit(1);
});
