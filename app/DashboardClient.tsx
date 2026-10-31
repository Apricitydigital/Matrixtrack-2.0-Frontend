'use client';

import dynamic from 'next/dynamic';

// Existing dashboard uses sessionStorage, browser maps and client-only role navigation.
const Dashboard = dynamic(async () => {
  const [{ default: App }, { initializeTheme }] = await Promise.all([
    import('../src/App'),
    import('../src/components/common/ThemeToggle'),
  ]);
  initializeTheme();
  return App;
}, { ssr: false });

export default function DashboardClient() {
  return <Dashboard />;
}
