export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPPORT' | 'FINANCE' | 'OPERATIONS';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' | 'OPERATIONS';
export type PlanType = '7d' | '15d' | '1m';
export type SubscriptionStatus = 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type RideStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  adminRole?: AdminRole;
  buddyScore: number;
  rating: number;
  referralCode: string;
  createdAt: string;
  profile?: Profile;
}

export interface Profile {
  bio?: string;
  avatarUrl?: string;
  companyOrCollege?: string;
  isIdVerified: boolean;
  isCompanyVerified: boolean;
}

export interface Ride {
  id: string;
  hostId: string;
  origin: string;
  destination: string;
  distanceKm: number;
  departureDate: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  perKmRate: number;
  totalCost: number;
  status: RideStatus;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  distanceKm: number;
  finalPrice: number;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  isLocked: boolean;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export interface PricingCalculation {
  role: 'guest' | 'host';
  planType: PlanType;
  distanceKm: number;
  basePrice: number;
  multiplier?: number;
  planPrice?: number;
  credit: number;
  cashback: number;
  finalPrice: number;
  distSlab?: number;
  planCost?: number;
  payout?: number;
}
