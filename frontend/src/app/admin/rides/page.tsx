'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import type { Ride } from '@/frontend/src/types';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { DataTable, type Column } from '@/frontend/src/components/admin/data-table';
import { ConfirmDialog } from '@/frontend/src/components/ui/confirm-dialog';
import { useToast } from '@/frontend/src/components/ui/toast';
import { statusColor } from '@/frontend/src/lib/constants';
import { Ban } from 'lucide-react';

export default function AdminRidesPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Ride | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Ride[]>('/admin/rides');
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load rides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/rides/${cancelTarget.id}/action`, { action: 'cancel' });
      addToast('success', 'Ride cancelled', `Ride to ${cancelTarget.destination} has been cancelled`);
      setCancelTarget(null);
      fetchRides();
    } catch (e) {
      addToast('error', 'Failed to cancel ride', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Ride>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id?.slice(0, 8) ?? ''}...</span> },
    { key: 'origin', header: 'Origin' },
    { key: 'destination', header: 'Destination' },
    { key: 'distanceKm', header: 'Distance', render: (r) => `${r.distanceKm} km` },
    { key: 'departureDate', header: 'Date', render: (r) => r.departureDate ? new Date(r.departureDate).toLocaleDateString() : '-' },
    { key: 'totalSeats', header: 'Seats', render: (r) => `${r.availableSeats ?? '?'}/${r.totalSeats ?? '?'}` },
    { key: 'totalCost', header: 'Cost', render: (r) => `$${(r.totalCost ?? 0).toFixed(2)}` },
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
        r.status !== 'CANCELLED' && r.status !== 'COMPLETED' ? (
          <div className="flex justify-end">
            <button
              onClick={() => setCancelTarget(r)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Cancel ride"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <AdminPageLayout title="Rides" description="Monitor and manage all rides" loading={loading} error={error} onRetry={fetchRides}>
      <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Ride"
        message={cancelTarget ? `Cancel the ride from ${cancelTarget.origin} to ${cancelTarget.destination}?` : ''}
        variant="danger"
        confirmLabel="Cancel Ride"
        loading={actionLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </AdminPageLayout>
  );
}
