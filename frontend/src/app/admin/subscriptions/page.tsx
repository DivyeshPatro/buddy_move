'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { DataTable, type Column } from '@/frontend/src/components/admin/data-table';
import { ConfirmDialog } from '@/frontend/src/components/ui/confirm-dialog';
import { useToast } from '@/frontend/src/components/ui/toast';
import { statusColor } from '@/frontend/src/lib/constants';
import { XCircle } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays?: number;
  price?: number;
  isActive?: boolean;
  description?: string;
}

export default function AdminSubscriptionsPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SubscriptionPlan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SubscriptionPlan[]>('/admin/subscription-plans');
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/subscription-plans/${deactivateTarget.id}`, { isActive: false });
      addToast('success', 'Plan deactivated', `${deactivateTarget.name} has been deactivated`);
      setDeactivateTarget(null);
      fetchPlans();
    } catch (e) {
      addToast('error', 'Failed to deactivate plan', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<SubscriptionPlan>[] = [
    { key: 'name', header: 'Name', render: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'description', header: 'Description', render: (s) => s.description ?? '-' },
    { key: 'durationDays', header: 'Duration', render: (s) => s.durationDays ? `${s.durationDays} days` : '-' },
    { key: 'price', header: 'Price', render: (s) => <span className="font-mono">${(s.price ?? 0).toFixed(2)}</span> },
    {
      key: 'isActive', header: 'Status',
      render: (s) => {
        const c = statusColor(s.isActive !== false ? 'ACTIVE' : 'CANCELLED');
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>{s.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span>;
      },
    },
    {
      key: 'actions', header: 'Actions', className: 'text-right',
      render: (s) =>
        s.isActive !== false ? (
          <div className="flex justify-end">
            <button onClick={() => setDeactivateTarget(s)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Deactivate plan">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <AdminPageLayout title="Subscription Plans" description="Manage available subscription plans" loading={loading} error={error} onRetry={fetchPlans}>
      <DataTable columns={columns} data={data} keyExtractor={(s) => s.id} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate Plan"
        message={deactivateTarget ? `Deactivate the "${deactivateTarget.name}" plan?` : ''}
        variant="danger"
        confirmLabel="Deactivate"
        loading={actionLoading}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </AdminPageLayout>
  );
}
