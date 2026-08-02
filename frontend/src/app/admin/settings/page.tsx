'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { useToast } from '@/frontend/src/components/ui/toast';
import { Save } from 'lucide-react';

interface AppSettings {
  logoUrl?: string;
  bannerText?: string;
  perKmRate?: number;
  allowWomenOnlyMode?: boolean;
}

export default function AdminSettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ systemSettings: AppSettings }>('/admin/metrics');
      setSettings(res.systemSettings ?? {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/admin/settings', settings);
      addToast('success', 'Settings saved', 'Platform settings have been updated');
    } catch (e) {
      addToast('error', 'Save failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof AppSettings, value: string | boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AdminPageLayout
      title="Settings"
      description="Configure platform settings"
      loading={loading}
      error={error}
      onRetry={fetchSettings}
      action={
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
        </button>
      }
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Text</label>
            <input value={settings.bannerText ?? ''} onChange={(e) => update('bannerText', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input value={settings.logoUrl ?? ''} onChange={(e) => update('logoUrl', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per Km Rate ($)</label>
            <input type="number" step="0.01" value={settings.perKmRate ?? 0} onChange={(e) => update('perKmRate', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Women-Only Mode</p>
              <p className="text-xs text-gray-500">Allow women-only ride mode</p>
            </div>
            <button onClick={() => update('allowWomenOnlyMode', !settings.allowWomenOnlyMode)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${settings.allowWomenOnlyMode ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${settings.allowWomenOnlyMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
