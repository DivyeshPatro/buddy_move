import { prisma } from "../backend/prisma";

async function cleanup() {
  console.log(`Prisma models: ${Object.keys(prisma).filter(k => !k.startsWith('$')).join(', ')}`);
  const result = await prisma.subscription.updateMany({
    where: { role: "guest", status: "ACTIVE", matchId: null },
    data: { status: "EXPIRED" },
  });
  console.log(`Expired ${result.count} unmatched guest subscriptions`);
  await prisma.$disconnect();
}

cleanup();
