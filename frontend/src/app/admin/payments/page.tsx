'use client';

import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { CreditCard } from 'lucide-react';

export default function AdminPaymentsPage() {
  return (
    <AdminPageLayout title="Payments" description="View and manage all transactions">
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <CreditCard className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">Not yet available</p>
        <p className="text-xs text-gray-400">The payments endpoint will be added in a future release.</p>
      </div>
    </AdminPageLayout>
  );
}
