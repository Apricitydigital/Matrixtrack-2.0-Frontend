'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface WorkspaceLoadingProps {
  title?: string;
  subtitle?: string;
}

export function WorkspaceLoading({
  title = "Loading Workspace...",
  subtitle = "Please wait while operational data is synchronized."
}: WorkspaceLoadingProps) {
  return (
    <div style={{
      minHeight: '70vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '40px 20px',
      margin: '0 auto'
    }}>
      <style>{`
        @keyframes spinRing {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>

      {/* Circular Spinner Circle */}
      <div style={{
        position: 'relative',
        width: '64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        {/* Background Subtle Track */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '4px solid #e2e8f0'
        }} />

        {/* Animated Spinning Arc Circle */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '4px solid transparent',
          borderTopColor: '#2563eb',
          borderRightColor: '#1d4ed8',
          animation: 'spinRing 0.9s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite'
        }} />

        {/* Center Accent Icon */}
        <Loader2 size={24} color="#2563eb" style={{ animation: 'spinRing 1.5s linear infinite' }} />
      </div>

      {/* Title & Subtitle */}
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 6px 0',
          letterSpacing: '-0.01em'
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: '13px',
          color: '#64748b',
          margin: 0,
          fontWeight: 500,
          lineHeight: '1.4'
        }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
