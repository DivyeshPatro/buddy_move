'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { DataTable, type Column } from '@/frontend/src/components/admin/data-table';
import { ConfirmDialog } from '@/frontend/src/components/ui/confirm-dialog';
import { useToast } from '@/frontend/src/components/ui/toast';
import { statusColor } from '@/frontend/src/lib/constants';
import { CheckCircle, XCircle } from 'lucide-react';

interface KycRecord {
  id: string;
  userId: string;
  user?: { name: string; email: string };
  name?: string;
  email?: string;
  documentType?: string;
  status: string;
  submittedAt?: string;
}

export default function AdminKycPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ action: 'verify' | 'reject'; record: KycRecord } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchKyc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<KycRecord[]>('/admin/kyc-queue');
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load KYC records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

  const handleReview = async () => {
    if (!reviewTarget) return;
    const { action, record } = reviewTarget;
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${record.userId}/action`, { action, reason: action === 'reject' ? 'Documents did not meet verification requirements' : undefined });
      addToast('success', `KYC ${action === 'verify' ? 'approved' : 'rejected'}`, `${record.user?.name ?? record.name}'s documents have been ${action === 'verify' ? 'approved' : 'rejected'}`);
      setReviewTarget(null);
      fetchKyc();
    } catch (e) {
      addToast('error', 'Action failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<KycRecord>[] = [
    { key: 'user', header: 'User', render: (r) => <span className="font-medium">{r.user?.name ?? r.name ?? 'N/A'}</span> },
    { key: 'email', header: 'Email', render: (r) => r.user?.email ?? r.email ?? '-' },
    { key: 'documentType', header: 'Document', render: (r) => r.documentType ?? '-' },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const c = statusColor(r.status);
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>{r.status}</span>;
      },
    },
    {
      key: 'actions', header: 'Actions', className: 'text-right',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReviewTarget({ action: 'verify', record: r })}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setReviewTarget({ action: 'reject', record: r })}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Reject"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <AdminPageLayout title="KYC" description="Review and manage identity verifications" loading={loading} error={error} onRetry={fetchKyc}>
      <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />

      <ConfirmDialog
        open={!!reviewTarget}
        title={reviewTarget?.action === 'verify' ? 'Approve KYC' : 'Reject KYC'}
        message={reviewTarget ? (reviewTarget.action === 'verify' ? `Approve ${reviewTarget.record.user?.name ?? reviewTarget.record.name}'s identity verification?` : `Reject ${reviewTarget.record.user?.name ?? reviewTarget.record.name}'s identity verification?`) : ''}
        variant={reviewTarget?.action === 'verify' ? 'default' : 'danger'}
        confirmLabel={reviewTarget?.action === 'verify' ? 'Approve' : 'Reject'}
        loading={actionLoading}
        onConfirm={handleReview}
        onCancel={() => setReviewTarget(null)}
      />
    </AdminPageLayout>
  );
}
