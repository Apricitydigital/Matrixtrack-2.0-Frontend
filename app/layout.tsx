import type { Metadata, Viewport } from "next";
import { Providers } from "@components/Providers";
import { AppShell } from "@components/AppShell";
import { SearchableSelectEnhancer } from "@components/SearchableSelectEnhancer";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatrixTrack 2.0",
  description: "Enterprise Urban Infrastructure & Sanitation Management System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <SearchableSelectEnhancer />
      </body>
    </html>
  );
}
