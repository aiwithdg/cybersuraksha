import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CyberSuraksha",
  description: "Cybercrime checking, reporting, and tracking portal for India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#f6f8fb] text-slate-950 antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-[#0b1f3a] text-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                CyberSuraksha
              </Link>
              <nav aria-label="Primary navigation" className="flex flex-wrap gap-2 text-sm font-medium">
                <Link className="px-3 py-2 text-blue-50 transition hover:bg-white/10" href="/">
                  Check
                </Link>
                <Link className="px-3 py-2 text-blue-50 transition hover:bg-white/10" href="/report">
                  Report
                </Link>
                <Link className="px-3 py-2 text-blue-50 transition hover:bg-white/10" href="/track">
                  Track
                </Link>
              </nav>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto w-full max-w-6xl px-6 py-5 text-sm leading-6 text-slate-600 sm:px-8 lg:px-10">
              CyberSuraksha is a hackathon prototype for demonstration only. It is not an official government service and should not replace reporting through authorized channels.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
