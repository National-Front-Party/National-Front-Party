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
      <body className="font-sans min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}