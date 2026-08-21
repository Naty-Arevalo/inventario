import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inventario",
  description: "Gestión de inventario",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 sm:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventario</h1>
            </Link>
            <nav className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
              <Link
                href="/mercaderia"
                className="px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 transition"
              >
                Mercadería
              </Link>
              <Link
                href="/inventario"
                className="px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 transition"
              >
                Inventario
              </Link>
              <Link
                href="/stock"
                className="px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 transition"
              >
                Stock Total
              </Link>
              <Link
                href="/reposicion"
                className="px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 transition"
              >
                Reposición
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
