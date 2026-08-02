'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalUsers?: number;
  totalRides?: number;
  activeSubs?: number;
  totalRevenues?: number;
  pendingKYC?: number;
  verifiedUsers?: number;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AnalyticsData>('/admin/analytics');
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const metrics = data
    ? [
        { label: 'Total Users', value: (data.totalUsers ?? 0).toLocaleString() },
        { label: 'Total Rides', value: (data.totalRides ?? 0).toLocaleString() },
        { label: 'Active Subscriptions', value: (data.activeSubs ?? 0).toLocaleString() },
        { label: 'Revenue', value: `$${(data.totalRevenues ?? 0).toLocaleString()}` },
        { label: 'Pending KYC', value: (data.pendingKYC ?? 0).toLocaleString() },
        { label: 'Verified Users', value: (data.verifiedUsers ?? 0).toLocaleString() },
      ]
    : [];

  return (
    <AdminPageLayout title="Analytics" description="Platform performance metrics" loading={loading} error={error} onRetry={fetchAnalytics}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Analytics Overview</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Chart visualization coming soon</p>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
