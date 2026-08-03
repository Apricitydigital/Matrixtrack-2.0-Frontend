'use client';

import { AuthProvider } from "@hooks/useAuth";
import { ToastProvider } from "@components/ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
