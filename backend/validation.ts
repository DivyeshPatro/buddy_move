import { z } from "zod";

export const CommuteDirectionEnum = z.enum(["forward", "return"]);
export const UserRoleEnum = z.enum(["guest", "host", "admin"]);
export const AdminRoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "FINANCE", "SUPPORT", "OPERATIONS"]);
export const PlanTypeEnum = z.enum(["7d", "15d", "1m"]);
export const TripStatusEnum = z.enum(["scheduled", "pickup_confirmed", "in_progress", "awaiting_confirmation", "completed", "cancelled"]);
export const MatchStatusEnum = z.enum(["active", "cancelled", "completed"]);
export const SubscriptionStatusEnum = z.enum(["active", "expired", "cancelled"]);
export const TicketStatusEnum = z.enum(["open", "resolved", "approved", "rejected"]);
export const TicketTypeEnum = z.enum(["issue", "refund", "dispute", "other"]);
export const VehicleTypeEnum = z.enum(["car", "bike", "scooter", "auto"]);
export const PickupMethodEnum = z.enum(["otp", "qr", "manual"]);
export const NotificationChannelEnum = z.enum(["push", "sms", "email"]);
export const PaymentStatusEnum = z.enum(["created", "success", "failed"]);

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  filter: z.string().optional(),
  search: z.string().optional(),
});

// ── Auth ──
export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional().or(z.literal("")),
  role: UserRoleEnum.optional().default("guest"),
  gender: z.enum(["male", "female", "other"]).optional(),
});

export const LoginSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const VerifyOtpSchema = z.object({
  userId: z.string().min(1),
  code: z.string().min(4).max(8).optional(),
  firebaseIdToken: z.string().optional(),
});

// ── Profile ──
export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  bio: z.string().max(500).optional(),
  companyOrCollege: z.string().max(200).optional(),
});

// ── Subscription ──
export const ActivateSubscriptionSchema = z.object({
  role: UserRoleEnum,
  direction: CommuteDirectionEnum.optional(),
  planName: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  originGeo: GeoPointSchema.optional(),
  destGeo: GeoPointSchema.optional(),
  departureTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  forwardTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  returnTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  distanceKm: z.number().min(0).optional(),
  amountPaid: z.number().min(0),
  paymentId: z.string().optional(),
  pickupRadiusM: z.number().int().min(50).max(5000).optional(),
  dropRadiusM: z.number().int().min(50).max(5000).optional(),
});

// ── Ride ──
export const CreateRideSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureDate: z.string().min(1),
  departureTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  availableSeats: z.number().int().min(1).max(10),
  vehicleType: VehicleTypeEnum,
  perKmRate: z.number().min(0),
  distanceKm: z.number().min(0),
  isRecurring: z.boolean().optional(),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).optional(),
  genderRestriction: z.enum(["male", "female", "any"]).optional(),
});

// ── Trip ──
export const StartTripSchema = z.object({
  matchId: z.string().min(1),
  method: PickupMethodEnum.optional().default("otp"),
});

export const ConfirmPickupSchema = z.object({
  geo: GeoPointSchema.optional(),
});

export const CompleteRideSchema = z.object({
  geo: GeoPointSchema,
});

export const ForceCompleteSchema = z.object({
  reason: z.string().min(1),
});

export const CancelTripSchema = z.object({
  reason: z.string().min(1).optional(),
});

// ── Payments ──
export const CreateOrderSchema = z.object({
  planName: z.string().min(1),
  role: UserRoleEnum,
  distanceKm: z.number().min(0).optional(),
});

export const VerifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  subscriptionData: z.string().optional(),
});

// ── Chat ──
export const SendMessageSchema = z.object({
  receiverId: z.string().min(1),
  text: z.string().min(1).max(2000),
  rideId: z.string().optional(),
});

// ── Support ──
export const CreateTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  ticketType: TicketTypeEnum.optional(),
  category: z.string().optional(),
  description: z.string().min(1).max(5000),
  screenshotUrl: z.string().optional(),
});

// ── Admin ──
export const AdminCreditWalletSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["credit", "deduct"]),
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
});

export const CreatePromoSchema = z.object({
  code: z.string().min(1).max(50),
  discountPercent: z.number().min(0).max(100),
  usageLimit: z.number().int().positive(),
  expiryDate: z.string().optional(),
  description: z.string().max(500).optional(),
  announce: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const CreateVoucherSchema = z.object({
  code: z.string().min(1).max(50),
  amount: z.number().positive(),
  usageLimit: z.number().int().positive(),
  expiryDate: z.string().optional(),
  description: z.string().max(500).optional(),
  announce: z.boolean().optional(),
});

export const CreatePlanSchema = z.object({
  role: UserRoleEnum,
  planType: PlanTypeEnum,
  name: z.string().min(1),
  durationDays: z.number().int().positive(),
  multiplier: z.number().min(0),
  basePrice: z.number().min(0).optional(),
  badge: z.string().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const UpdatePlanSchema = CreatePlanSchema.partial();

export const AdminSettingsSchema = z.object({
  logoUrl: z.string().optional(),
  bannerText: z.string().max(200).optional(),
  perKmRate: z.number().positive().optional(),
  allowWomenOnlyMode: z.boolean().optional(),
});

export const AdminBrandingSchema = z.object({
  appName: z.string().max(100).optional(),
  tagline: z.string().max(200).optional(),
  logoUrl: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(20).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export const AdminPricingConfigSchema = z.object({
  guestBaseKmLimit: z.number().finite().nonnegative().optional(),
  guestBasePrice: z.number().finite().nonnegative().optional(),
  guestIncrementPerKm: z.number().finite().nonnegative().optional(),
  guest7dWorkingDays: z.number().int().nonnegative().optional(),
  guest15dWorkingDays: z.number().int().nonnegative().optional(),
  guestMonthlyWorkingDays: z.number().int().nonnegative().optional(),
  guest7dMultiplier: z.number().finite().nonnegative().optional(),
  guest15dMultiplier: z.number().finite().nonnegative().optional(),
  guestMonthlyMultiplier: z.number().finite().nonnegative().optional(),
  hostUpto5kmSlab: z.number().finite().nonnegative().optional(),
  hostAbove5kmSlab: z.number().finite().nonnegative().optional(),
  hostRatePerKm: z.number().finite().nonnegative().optional(),
  welcomeCreditFlat: z.number().int().nonnegative().optional(),
  welcomeCreditPercent: z.number().min(0).max(100).optional(),
  welcomeCreditCap: z.number().int().nonnegative().optional(),
  upgradeIncentivePercent: z.number().min(0).max(100).optional(),
  upgradeIncentiveCap: z.number().int().nonnegative().optional(),
  loyaltyCreditPercent: z.number().min(0).max(100).optional(),
  loyaltyCreditMin: z.number().int().nonnegative().optional(),
  loyaltyCreditMax: z.number().int().nonnegative().optional(),
});

export const AdminUserActionSchema = z.object({
  action: z.enum(["suspend", "ban", "activate", "verify", "reject", "reset"]),
  reason: z.string().max(500).optional(),
});

export const AdminMatchActionSchema = z.object({
  action: z.enum(["cancel", "complete", "reassign"]),
  reason: z.string().max(500).optional(),
});

export const AdminRideActionSchema = z.object({
  action: z.string().min(1).max(50),
  reason: z.string().max(500).optional(),
});

export const AdminFeatureFlagsSchema = z.record(z.string(), z.boolean());

export const AdminCmsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});

export const AdminPromoSchema = CreatePromoSchema;

export const AdminUpdatePromoSchema = z.object({
  discountPercent: z.number().min(0).max(100).optional(),
  usageLimit: z.number().int().positive().optional(),
  expiryDate: z.string().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const AdminVoucherSchema = CreateVoucherSchema;

export const AdminNotificationTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

export const AdminBroadcastSchema = z.object({
  templateId: z.string().optional(),
  audience: z.enum(["all", "subscribers", "college", "active"]),
  customMessage: z.string().max(2000).optional(),
});

export const AdminTripValidationConfigSchema = z.object({
  maxDriftMeters: z.number().nonnegative().optional(),
  minDurationMinutes: z.number().nonnegative().optional(),
  manualOverride: z.boolean().optional(),
});

// ── Voucher ──
export const RedeemVoucherSchema = z.object({
  code: z.string().min(1),
});

// ── Notifications ──
export const UpdateNotificationPreferencesSchema = z.object({
  channel: NotificationChannelEnum,
  enabled: z.boolean(),
});

// ── Socket events ──
export const SocketJoinTripSchema = z.object({
  tripId: z.string().min(1),
});

export const SocketPingSchema = z.object({
  tripId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ── Middleware helper ──
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    req[source] = result.data;
    next();
  };
}
