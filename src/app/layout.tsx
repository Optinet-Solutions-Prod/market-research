import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Opportunity Radar",
  description: "Cross-industry affiliate market intelligence: search demand × SERP weakness × payout × risk.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen font-sans">
        <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
          <Nav />
          <main className="min-w-0 p-4 sm:p-7">{children}</main>
        </div>
      </body>
    </html>
  );
}
