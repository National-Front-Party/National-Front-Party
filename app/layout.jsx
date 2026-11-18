import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import PublicShell from "@/components/Layouts/PublicShell";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "حزب الجبهة الوطنية",
  description: "الموقع الإلكتروني الرسمي لحزب الجبهة الوطنية",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable} suppressHydrationWarning>
      <body className="font-sans flex min-h-dvh flex-col [&>header]:shrink-0 [&>footer]:shrink-0" suppressHydrationWarning>
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}