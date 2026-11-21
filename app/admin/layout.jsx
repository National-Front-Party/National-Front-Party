import { Suspense } from "react";
import { AdminAuthProvider } from "@/lib/admin/auth-context";
import { ToastProvider } from "@/lib/admin/toast-context";
import AppShell from "@/components/Admin/AppShell";
import Spinner from "@/components/Admin/ui/Spinner";

export const instant = false;

export const metadata = {
  title: "لوحة التحكم | حزب الجبهة الوطنية",
  description: "لوحة التحكم والإدارة لحزب الجبهة الوطنية",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center gap-3 bg-ink text-sm font-bold text-gold" dir="rtl">
            <Spinner size="sm" color="gold" />
            <span>جاري تحميل لوحة التحكم...</span>
          </div>
        }
      >
        <AdminAuthProvider>
          <AppShell>{children}</AppShell>
        </AdminAuthProvider>
      </Suspense>
    </ToastProvider>
  );
}
