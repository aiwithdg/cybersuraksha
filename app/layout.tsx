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
        className={`${geistSans.variable} ${geistMono.variable} bg-[#eef3f8] text-slate-950 antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#071a33]/95 text-white shadow-lg shadow-slate-950/10 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
              <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#14b8a6] text-sm font-black text-[#071a33]">
                  CS
                </span>
                <span>CyberSuraksha</span>
              </Link>
              <nav aria-label="Primary navigation" className="flex flex-wrap gap-2 text-sm font-medium">
                <Link className="rounded-md px-3 py-2 text-blue-50 transition hover:bg-white/10" href="/">
                  Check
                </Link>
                <Link className="rounded-md px-3 py-2 text-blue-50 transition hover:bg-white/10" href="/report">
                  Report
                </Link>
                <Link className="rounded-md px-3 py-2 text-blue-50 transition hover:bg-white/10" href="/track">
                  Track
                </Link>
              </nav>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-sm leading-6 text-slate-600 sm:px-8 lg:px-10">
              <p className="font-semibold text-slate-900">Hackathon prototype</p>
              <p>
                CyberSuraksha is for demonstration only. It is not an official government service and should not replace reporting through authorized channels.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
