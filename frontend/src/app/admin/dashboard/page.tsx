'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { Users, Car, CreditCard, AlertTriangle, DollarSign, Activity } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalRides: number;
  activeSubs: number;
  totalRevenues: number;
  pendingKYC?: number;
  verifiedUsers?: number;
  systemSettings?: Record<string, unknown>;
  tickets?: unknown[];
}

const statCards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'bg-blue-500' },
  { key: 'totalRides', label: 'Total Rides', icon: Car, color: 'bg-green-500' },
  { key: 'totalRevenues', label: 'Revenue', icon: DollarSign, color: 'bg-purple-500', prefix: '$' },
  { key: 'pendingKYC', label: 'Pending KYC', icon: AlertTriangle, color: 'bg-yellow-500' },
  { key: 'activeSubs', label: 'Active Subs', icon: CreditCard, color: 'bg-indigo-500' },
  { key: 'verifiedUsers', label: 'Verified', icon: Activity, color: 'bg-pink-500' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DashboardStats>('/admin/metrics');
      setStats(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <AdminPageLayout title="Dashboard" description="Platform overview" loading={loading} error={error} onRetry={fetchStats}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats ? (stats as unknown as Record<string, number>)[card.key] : 0;
          const display = card.prefix ? `${card.prefix}${typeof value === 'number' ? value.toLocaleString() : value}` : (value ?? '-');

          return (
            <div key={card.key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{display}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                  <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminPageLayout>
  );
}
