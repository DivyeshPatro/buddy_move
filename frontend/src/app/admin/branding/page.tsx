'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { useToast } from '@/frontend/src/components/ui/toast';
import { Save, Image } from 'lucide-react';

interface BrandingConfig {
  logoUrl?: string;
  appName?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export default function AdminBrandingPage() {
  const { addToast } = useToast();
  const [config, setConfig] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<BrandingConfig>('/branding');
      setConfig(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load branding config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/admin/branding', config);
      addToast('success', 'Branding updated', 'Changes have been saved');
    } catch (e) {
      addToast('error', 'Save failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof BrandingConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  return (
    <AdminPageLayout
      title="Branding"
      description="Customize platform appearance"
      loading={loading} error={error} onRetry={fetchConfig}
      action={
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
        </button>
      }
    >
      {config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">General</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
                <input value={config.appName ?? ''} onChange={(e) => update('appName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                <input value={config.tagline ?? ''} onChange={(e) => update('tagline', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <div className="flex gap-2">
                  <input value={config.logoUrl ?? ''} onChange={(e) => update('logoUrl', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  <div className="p-2 border border-gray-200 rounded-lg bg-gray-50"><Image className="w-5 h-5 text-gray-400" /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Colors</h3>
            <div className="space-y-4">
              {([
                { key: 'primaryColor' as const, label: 'Primary' },
                { key: 'secondaryColor' as const, label: 'Secondary' },
                { key: 'accentColor' as const, label: 'Accent' },
              ]).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={config[field.key] ?? '#000000'} onChange={(e) => update(field.key, e.target.value)} className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
                    <input value={config[field.key] ?? ''} onChange={(e) => update(field.key, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Preview</p>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: config.primaryColor ?? '#7C3AED' }} />
                <div className="w-8 h-8 rounded" style={{ backgroundColor: config.secondaryColor ?? '#374151' }} />
                <div className="w-8 h-8 rounded" style={{ backgroundColor: config.accentColor ?? '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
