import type { Metadata } from "next";
import { Providers } from "@components/Providers";
import { AppShell } from "@components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatrixTrack 2.0",
  description: "Enterprise Urban Infrastructure & Sanitation Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
