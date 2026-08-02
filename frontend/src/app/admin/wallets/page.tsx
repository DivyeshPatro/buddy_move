'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type PaginatedResponse, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { DataTable, type Column } from '@/frontend/src/components/admin/data-table';
import { Pagination } from '@/frontend/src/components/ui/pagination';
import { ConfirmDialog } from '@/frontend/src/components/ui/confirm-dialog';
import { useToast } from '@/frontend/src/components/ui/toast';
import { Plus, Minus } from 'lucide-react';

interface WalletRecord {
  userId: string;
  credits: number;
  history: { id: string; amount: number; type: string; description: string; timestamp: string }[];
}

export default function AdminWalletsPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<WalletRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ action: 'credit' | 'deduct'; wallet: WalletRecord } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionAmount, setActionAmount] = useState(10);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedResponse<WalletRecord>>('/admin/wallets', { page, limit: 10 });
      setData(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const handleAction = async () => {
    if (!actionTarget) return;
    const { action, wallet } = actionTarget;
    setActionLoading(true);
    try {
      await api.post('/admin/wallet/action', { userId: wallet.userId, action, amount: actionAmount, reason: `Admin ${action}` });
      addToast('success', `Wallet ${action}ed`, `$${actionAmount} ${action}ed to wallet`);
      setActionTarget(null);
      setActionAmount(10);
      fetchWallets();
    } catch (e) {
      addToast('error', 'Action failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<WalletRecord>[] = [
    { key: 'userId', header: 'User ID', render: (w) => <span className="font-mono text-xs">{w.userId?.slice(0, 12) ?? '?'}</span> },
    { key: 'credits', header: 'Balance', render: (w) => <span className="font-mono font-medium">${(w.credits ?? 0).toFixed(2)}</span> },
    {
      key: 'transactions', header: 'Transactions',
      render: (w) => <span className="text-xs text-gray-500">{(w.history?.length ?? 0)} txns</span>,
    },
    {
      key: 'actions', header: 'Actions', className: 'text-right',
      render: (w) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => { setActionTarget({ action: 'credit', wallet: w }); setActionAmount(10); }} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Credit wallet">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => { setActionTarget({ action: 'deduct', wallet: w }); setActionAmount(10); }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Deduct from wallet">
            <Minus className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout title="Wallets" description="Manage user wallets" loading={loading} error={error} onRetry={fetchWallets}>
      <DataTable columns={columns} data={data} keyExtractor={(w) => w.userId} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={!!actionTarget}
        title={actionTarget?.action === 'credit' ? 'Credit Wallet' : 'Deduct from Wallet'}
        message={
          <div>
            <p className="mb-3">{actionTarget?.action === 'credit' ? 'Add funds to this wallet?' : 'Deduct funds from this wallet?'}</p>
            <input
              type="number"
              min={1}
              value={actionAmount}
              onChange={(e) => setActionAmount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        }
        variant={actionTarget?.action === 'credit' ? 'default' : 'warning'}
        confirmLabel={actionTarget?.action === 'credit' ? 'Credit' : 'Deduct'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionTarget(null)}
      />
    </AdminPageLayout>
  );
}
