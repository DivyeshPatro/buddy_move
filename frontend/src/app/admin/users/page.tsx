'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type PaginatedResponse, ApiError } from '@/frontend/src/services/api';
import type { User } from '@/frontend/src/types';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { DataTable, type Column } from '@/frontend/src/components/admin/data-table';
import { Pagination } from '@/frontend/src/components/ui/pagination';
import { ConfirmDialog } from '@/frontend/src/components/ui/confirm-dialog';
import { useToast } from '@/frontend/src/components/ui/toast';
import { statusColor, roleColor } from '@/frontend/src/lib/constants';
import { Shield, ShieldOff, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'ban' | 'activate' | 'suspend'; user: User } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedResponse<User>>('/admin/users', { page, limit: 10 });
      setData(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${user.id}/action`, { action: type });
      addToast('success', `User ${type === 'ban' ? 'banned' : type === 'activate' ? 'activated' : 'suspended'}`, `${user.name} has been ${type === 'ban' ? 'banned' : type === 'activate' ? 'activated' : 'suspended'}`);
      setConfirmAction(null);
      fetchUsers();
    } catch (e) {
      addToast('error', 'Action failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium">{u.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'role', header: 'Role',
      render: (u) => {
        const c = roleColor(u.adminRole ?? u.role);
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>{u.adminRole ?? u.role}</span>;
      },
    },
    { key: 'buddyScore', header: 'Score' },
    { key: 'rating', header: 'Rating' },
    {
      key: 'createdAt', header: 'Created',
      render: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions', header: 'Actions', className: 'text-right',
      render: (u) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmAction({ type: 'ban', user: u })}
            className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"
            title="Ban user"
          >
            <ShieldOff className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'activate', user: u })}
            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
            title="Activate user"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'suspend', user: u })}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Suspend user"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const dialogConfig = () => {
    if (!confirmAction) return { title: '', message: '', label: '', variant: 'danger' as const };
    const { type, user } = confirmAction;
    if (type === 'ban') return { title: 'Ban User', message: `Are you sure you want to ban ${user.name}?`, label: 'Ban', variant: 'danger' as const };
    if (type === 'activate') return { title: 'Activate User', message: `Are you sure you want to activate ${user.name}?`, label: 'Activate', variant: 'default' as const };
    return { title: 'Suspend User', message: `Are you sure you want to suspend ${user.name}?`, label: 'Suspend', variant: 'warning' as const };
  };

  const dialog = dialogConfig();

  return (
    <AdminPageLayout title="Users" description="Manage platform users" loading={loading} error={error} onRetry={fetchUsers}>
      <DataTable columns={columns} data={data} keyExtractor={(u) => u.id} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={!!confirmAction}
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        confirmLabel={dialog.label}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setConfirmAction(null)}
      />
    </AdminPageLayout>
  );
}
