"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Layouts/Navbar";
import Footer from "@/components/Layouts/Footer";

export default function PublicShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isUnauthorized = pathname === "/unauthorized";

  if (isAdmin || isUnauthorized) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col overflow-x-clip">{children}</main>
      <Footer />
    </>
  );
}
