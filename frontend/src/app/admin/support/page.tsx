'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type PaginatedResponse, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { DataTable, type Column } from '@/frontend/src/components/admin/data-table';
import { Pagination } from '@/frontend/src/components/ui/pagination';
import { ConfirmDialog } from '@/frontend/src/components/ui/confirm-dialog';
import { useToast } from '@/frontend/src/components/ui/toast';
import { statusColor } from '@/frontend/src/lib/constants';
import { CheckCircle, Trash2 } from 'lucide-react';

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  status: string;
  ticketType?: string;
  createdAt: string;
}

export default function AdminSupportPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ action: 'resolve' | 'reject'; ticket: Ticket } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedResponse<Ticket>>('/admin/tickets', { page, limit: 10 });
      setData(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleAction = async () => {
    if (!actionTarget) return;
    const { action, ticket } = actionTarget;
    setActionLoading(true);
    try {
      await api.post('/admin/tickets/action', { ticketId: ticket.id, action });
      addToast('success', `Ticket ${action === 'resolve' ? 'resolved' : 'rejected'}`, `"${ticket.subject}" has been ${action === 'resolve' ? 'resolved' : 'rejected'}`);
      setActionTarget(null);
      fetchTickets();
    } catch (e) {
      addToast('error', 'Action failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Ticket>[] = [
    { key: 'subject', header: 'Subject', render: (t) => <span className="max-w-xs truncate block font-medium">{t.subject}</span> },
    { key: 'ticketType', header: 'Type', render: (t) => t.ticketType ?? '-' },
    {
      key: 'status', header: 'Status',
      render: (t) => {
        const c = statusColor(t.status === 'open' ? 'PENDING' : t.status === 'resolved' || t.status === 'approved' ? 'COMPLETED' : t.status === 'rejected' ? 'FAILED' : t.status);
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>{t.status}</span>;
      },
    },
    { key: 'createdAt', header: 'Created', render: (t) => t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-' },
    {
      key: 'actions', header: 'Actions', className: 'text-right',
      render: (t) => (
        <div className="flex justify-end gap-2">
          {t.status === 'open' && (
            <button
              onClick={() => setActionTarget({ action: 'resolve', ticket: t })}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
              title="Resolve ticket"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {(t.status === 'open' || t.status === 'pending') && (
            <button
              onClick={() => setActionTarget({ action: 'reject', ticket: t })}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Reject ticket"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout title="Support" description="Manage support tickets" loading={loading} error={error} onRetry={fetchTickets}>
      <DataTable columns={columns} data={data} keyExtractor={(t) => t.id} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={!!actionTarget}
        title={actionTarget?.action === 'resolve' ? 'Resolve Ticket' : 'Reject Ticket'}
        message={actionTarget ? (actionTarget.action === 'resolve' ? `Resolve "${actionTarget.ticket.subject}"?` : `Reject "${actionTarget.ticket.subject}"?`) : ''}
        variant={actionTarget?.action === 'reject' ? 'danger' : 'default'}
        confirmLabel={actionTarget?.action === 'resolve' ? 'Resolve' : 'Reject'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionTarget(null)}
      />
    </AdminPageLayout>
  );
}
