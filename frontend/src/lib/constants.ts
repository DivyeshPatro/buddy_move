export const STATUS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  UPCOMING: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  COMPLETED: { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
  SUCCESS: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  REFUNDED: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  EXPIRED: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  NOT_SUBMITTED: { bg: 'bg-gray-50', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' },
  VERIFIED: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
};

export const ROLE_COLORS: Record<string, { badge: string }> = {
  SUPER_ADMIN: { badge: 'bg-purple-100 text-purple-800' },
  ADMIN: { badge: 'bg-blue-100 text-blue-800' },
  USER: { badge: 'bg-gray-100 text-gray-800' },
  SUPPORT: { badge: 'bg-cyan-100 text-cyan-800' },
  FINANCE: { badge: 'bg-emerald-100 text-emerald-800' },
  OPERATIONS: { badge: 'bg-amber-100 text-amber-800' },
};

export function statusColor(status: string) {
  return STATUS_COLORS[status] ?? { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' };
}

export function roleColor(role: string) {
  return ROLE_COLORS[role] ?? { badge: 'bg-gray-100 text-gray-800' };
}
