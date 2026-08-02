import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { RidesModule } from './rides/rides.module';
import { RideRequestsModule } from './ride-requests/ride-requests.module';
import { BookingsModule } from './bookings/bookings.module';
import { TrackingModule } from './tracking/tracking.module';
import { MapsModule } from './maps/maps.module';
import { ChatModule } from './chat/chat.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PricingModule } from './pricing/pricing.module';
import { GuestCreditsModule } from './guest-credits/guest-credits.module';
import { HostPayoutsModule } from './host-payouts/host-payouts.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletsModule } from './wallets/wallets.module';
import { ReferralsModule } from './referrals/referrals.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { RevenueModule } from './revenue/revenue.module';
import { KycModule } from './kyc/kyc.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TrustSafetyModule } from './trust-safety/trust-safety.module';
import { SosModule } from './sos/sos.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailsModule } from './emails/emails.module';
import { SmsModule } from './sms/sms.module';
import { CmsModule } from './cms/cms.module';
import { BrandingModule } from './branding/branding.module';
import { ThemesModule } from './themes/themes.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SupportModule } from './support/support.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { RouteMatchingModule } from './route-matching/route-matching.module';
import { CommutePatternModule } from './commute-patterns/commute-patterns.module';
import { StorageModule } from './storage/storage.module';
import { WebsocketModule } from './websocket/websocket.module';
import { QueuesModule } from './queues/queues.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    // ── Framework ──────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),

    // ── Database & Cache ────────────────────────────────────────
    PrismaModule,
    CacheModule,

    // ── Auth & Users ────────────────────────────────────────────
    AuthModule,
    UsersModule,
    ProfilesModule,

    // ── Rides & Mobility ────────────────────────────────────────
    RidesModule,
    RideRequestsModule,
    BookingsModule,
    RouteMatchingModule,
    CommutePatternModule,
    TrackingModule,
    MapsModule,
    ChatModule,

    // ── Pricing & Subscriptions ─────────────────────────────────
    PricingModule,
    SubscriptionsModule,
    GuestCreditsModule,
    HostPayoutsModule,

    // ── Payments & Wallet ───────────────────────────────────────
    PaymentsModule,
    WalletsModule,
    ReferralsModule,
    PromoCodesModule,
    RevenueModule,

    // ── Trust & Safety ──────────────────────────────────────────
    KycModule,
    VehiclesModule,
    TrustSafetyModule,
    SosModule,

    // ── Notifications ───────────────────────────────────────────
    NotificationsModule,
    EmailsModule,
    SmsModule,

    // ── Platform Config ─────────────────────────────────────────
    CmsModule,
    BrandingModule,
    ThemesModule,
    FeatureFlagsModule,

    // ── Insights ────────────────────────────────────────────────
    AnalyticsModule,
    SupportModule,
    FeedbackModule,
    AuditModule,

    // ── Admin ───────────────────────────────────────────────────
    AdminModule,

    // ── Infrastructure ──────────────────────────────────────────
    StorageModule,
    WebsocketModule,
    QueuesModule,
    MonitoringModule,
  ],
})
export class AppModule {}
