'use client';

import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { Palette } from 'lucide-react';

export default function AdminThemesPage() {
  return (
    <AdminPageLayout title="Themes" description="Manage visual themes">
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Palette className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">Not yet available</p>
        <p className="text-xs text-gray-400">The themes endpoint will be added in a future release.</p>
      </div>
    </AdminPageLayout>
  );
}
