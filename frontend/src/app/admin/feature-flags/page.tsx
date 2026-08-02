'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { useToast } from '@/frontend/src/components/ui/toast';

interface FeatureFlags {
  [key: string]: boolean;
}

export default function AdminFeatureFlagsPage() {
  const { addToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<FeatureFlags>('/feature-flags');
      setFlags(res ?? {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const handleToggle = async (key: string) => {
    setToggling(key);
    const next = { ...flags, [key]: !flags[key] };
    try {
      await api.put('/admin/feature-flags', next);
      setFlags(next);
      addToast('success', `Flag "${key}" ${next[key] ? 'enabled' : 'disabled'}`);
    } catch (e) {
      addToast('error', 'Toggle failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setToggling(null);
    }
  };

  return (
    <AdminPageLayout title="Feature Flags" description="Enable or disable platform features" loading={loading} error={error} onRetry={fetchFlags}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
        {Object.entries(flags).length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">No feature flags configured</div>
        )}
        {Object.entries(flags).map(([key, enabled]) => (
          <div key={key} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <p className="text-sm font-medium text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            <button
              onClick={() => handleToggle(key)}
              disabled={toggling === key}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
    </AdminPageLayout>
  );
}
