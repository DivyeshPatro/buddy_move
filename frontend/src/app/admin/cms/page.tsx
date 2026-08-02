'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/frontend/src/services/api';
import { AdminPageLayout } from '@/frontend/src/components/admin/admin-page-layout';
import { useToast } from '@/frontend/src/components/ui/toast';
import { Save, FileText } from 'lucide-react';

interface CmsPage {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export default function AdminCmsPage() {
  const { addToast } = useToast();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [selected, setSelected] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CmsPage[]>('/admin/cms');
      setPages(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load CMS pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/admin/cms/${selected.slug}`, { title: selected.title, content: selected.content });
      addToast('success', 'Page updated', `"${selected.title}" has been saved`);
    } catch (e) {
      addToast('error', 'Save failed', e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading || error) {
    return <AdminPageLayout title="CMS" description="Manage content pages" loading={loading} error={error} onRetry={fetchPages} />;
  }

  return (
    <AdminPageLayout
      title="CMS"
      description="Manage content pages"
      action={selected && (
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
        </button>
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pages</h3>
          <div className="space-y-1">
            {pages.map((p) => (
              <button
                key={p.slug}
                onClick={() => setSelected(p)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left ${selected?.slug === p.slug ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <input value={selected.title} onChange={(e) => setSelected({ ...selected, title: e.target.value })} className="w-full text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 focus:outline-none focus:border-blue-500" />
              <textarea value={selected.content} onChange={(e) => setSelected({ ...selected, content: e.target.value })} rows={15} className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">Select a page to edit</div>
          )}
        </div>
      </div>
    </AdminPageLayout>
  );
}
