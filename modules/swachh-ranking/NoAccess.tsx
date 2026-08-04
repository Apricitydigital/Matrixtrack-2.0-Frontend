import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function NoAccess() {
  return (
    <div style={{
      padding: '48px 24px',
      textAlign: 'center',
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      maxWidth: 500,
      margin: '40px auto'
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#fef2f2',
        color: '#ef4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px'
      }}>
        <ShieldAlert size={28} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
        Access Restricted
      </h3>
      <p style={{ color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
        You do not have permission to view this section. Please contact your administrator for access.
      </p>
    </div>
  );
}
