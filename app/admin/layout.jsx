import { AdminAuthProvider } from "@/lib/admin/auth-context";
import { ToastProvider } from "@/lib/admin/toast-context";
import AppShell from "@/components/Admin/AppShell";

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
      <AdminAuthProvider>
        <AppShell>{children}</AppShell>
      </AdminAuthProvider>
    </ToastProvider>
  );
}
