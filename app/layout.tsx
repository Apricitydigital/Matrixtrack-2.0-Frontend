import type { Metadata } from "next";
import { Providers } from "@components/Providers";
import { AppShell } from "@components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskforce 20",
  description: "Enterprise administration for cities and modules"
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
