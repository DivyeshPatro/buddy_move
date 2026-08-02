'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { useToast } from '@/frontend/src/components/ui/toast';
import { Save } from 'lucide-react';

interface PricingConfig {
  baseRate?: number;
  hostRatePerKm?: number;
  guestRatePerKm?: number;
  perKmRate?: number;
  hostMultiplier?: number;
  guestMultiplier?: number;
  creditPercent?: number;
  cashbackPercent?: number;
  welcomeCreditPercent?: number;
  upgradeIncentivePercent?: number;
  upgradeIncentiveCap?: number;
  loyaltyCreditPercent?: number;
  loyaltyCreditMin?: number;
  loyaltyCreditMax?: number;
}

export default function AdminPricingPage() {
  const { addToast } = useToast();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PricingConfig>('/admin/pricing-config');
      setConfig(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load pricing config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/admin/pricing-config', config);
      addToast('success', 'Pricing updated', 'Configuration has been saved');
    } catch (e) {
      addToast('error', 'Save failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof PricingConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: parseFloat(value) || 0 });
  };

  const fields: { key: keyof PricingConfig; label: string }[] = [
    { key: 'baseRate', label: 'Base Rate ($)' },
    { key: 'hostRatePerKm', label: 'Host Rate/km ($)' },
    { key: 'guestRatePerKm', label: 'Guest Rate/km ($)' },
    { key: 'hostMultiplier', label: 'Host Multiplier' },
    { key: 'guestMultiplier', label: 'Guest Multiplier' },
    { key: 'welcomeCreditPercent', label: 'Welcome Credit (%)' },
    { key: 'upgradeIncentivePercent', label: 'Upgrade Incentive (%)' },
    { key: 'loyaltyCreditPercent', label: 'Loyalty Credit (%)' },
  ];

  return (
    <AdminPageLayout
      title="Pricing"
      description="Configure platform pricing"
      loading={loading}
      error={error}
      onRetry={fetchConfig}
      action={
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
        </button>
      }
    >
      {config && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="number" step="0.01" value={(config[f.key] as number) ?? 0} onChange={(e) => update(f.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
