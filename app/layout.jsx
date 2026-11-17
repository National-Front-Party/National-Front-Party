import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Layouts/Navbar";
import Footer from "@/components/Layouts/Footer";

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
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="font-sans flex min-h-dvh flex-col [&>header]:shrink-0 [&>footer]:shrink-0">
        <Navbar />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}