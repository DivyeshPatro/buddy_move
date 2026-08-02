import { redirect } from 'next/navigation';
import { ToastProvider } from '@/frontend/src/components/ui/toast';

async function getAdminSession() {
  return null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/auth/login?redirect=/admin/dashboard');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 overflow-auto">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
