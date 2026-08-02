import prisma from "../prisma";

const plans = [
    { id: "plan_g7", role: "guest", planType: "PLAN_7D", name: "7 Day Pass", durationDays: 7, multiplier: 1.0, isActive: true, badge: "", features: ["1 commute route", "Auto-matched buddy", "In-app safety SOS"] },
    { id: "plan_g15", role: "guest", planType: "PLAN_15D", name: "15 Day Pass", durationDays: 15, multiplier: 1.0, isActive: true, badge: "Popular", features: ["1 route · both peaks", "Priority matching", "Ride guarantee", "Safety SOS"] },
    { id: "plan_g1m", role: "guest", planType: "PLAN_1M", name: "Monthly Pass", durationDays: 30, multiplier: 1.0, isActive: true, badge: "Best Value", features: ["All-hours matching", "Loyalty credit", "Partner lock", "Priority support"] },
    { id: "plan_h7", role: "host", planType: "PLAN_7D", name: "Host 7 Day", durationDays: 7, multiplier: 1.0, isActive: true, badge: "", features: ["Join matching network", "Basic visibility", "Activity-based payout"] },
    { id: "plan_h15", role: "host", planType: "PLAN_15D", name: "Host 15 Day", durationDays: 15, multiplier: 1.0, isActive: true, badge: "Popular", features: ["Boosted visibility", "More guest matches", "Activity payout + analytics"] },
    { id: "plan_h1m", role: "host", planType: "PLAN_1M", name: "Host Monthly", durationDays: 30, multiplier: 1.0, isActive: true, badge: "Best Value", features: ["Top visibility", "Max guest matches", "Highest payout ceiling", "Priority support"] },
];

async function main() {
    console.log("Seeding subscription plans...");
    for (const plan of plans) {
        await prisma.subscriptionPlan.upsert({
            where: { id: plan.id },
            create: plan as any,
            update: plan as any,
        });
        console.log(`✓ ${plan.name} (${plan.role})`);
    }
    console.log("\nDone — 6 plans seeded.");
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });