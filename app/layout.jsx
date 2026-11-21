import localFont from "next/font/local";
import "./globals.css";
import PublicShell from "@/components/Layouts/PublicShell";

const plex = localFont({
  src: [
    { path: "./fonts/IBMPlexSansArabic-Regular.woff2", weight: "400" },
    { path: "./fonts/IBMPlexSansArabic-Medium.woff2", weight: "500" },
    { path: "./fonts/IBMPlexSansArabic-SemiBold.woff2", weight: "600" },
    { path: "./fonts/IBMPlexSansArabic-Bold.woff2", weight: "700" },
  ],
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
