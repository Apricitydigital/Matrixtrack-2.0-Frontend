import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../src/index.css';
import '../src/styles/commissioner-insight.css';
import '../src/styles/commissioner-overview.css';
import '../src/styles/inspection-targets.css';
import '../src/styles/insight-history-map.css';
import '../src/styles/themes.css';
import '../src/styles/ulb-dashboard.css';

export const metadata: Metadata = {
  title: 'MatrixTrack 2.0 Municipal Command Center',
  description: 'Enterprise municipal management platform with four role-based workspaces for Super Admin, City Admin, ULB Officer, and Commissioner.',
  icons: { icon: '/matrixtrack-logo.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
    </head>
    <body className="bg-slate-50 text-slate-900 antialiased font-sans selection:bg-indigo-500 selection:text-white">{children}</body>
  </html>;
}
