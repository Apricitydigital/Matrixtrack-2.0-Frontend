'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Lock, Sparkles, Key } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SwachhErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Swachh Module Error Boundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || '';
      const isAuthError = errMsg.toLowerCase().includes('auth') || errMsg.toLowerCase().includes('token') || errMsg.toLowerCase().includes('router');

      return (
        <div style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#ffffff',
          borderRadius: 24,
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)',
          margin: '24px',
          textAlign: 'center',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          {/* Animated Pulsing Shield Icon */}
          <div style={{
            position: 'relative',
            width: 84,
            height: 84,
            marginBottom: 24,
            display: 'grid',
            placeItems: 'center'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: '#eff6ff',
              animation: 'pulseGlow 2s infinite ease-in-out',
              boxShadow: '0 0 0 10px rgba(37, 99, 235, 0.08)'
            }} />
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
              position: 'relative',
              zIndex: 2
            }}>
              {isAuthError ? <Lock size={32} /> : <ShieldAlert size={32} />}
            </div>
          </div>

          <style jsx>{`
            @keyframes pulseGlow {
              0% { transform: scale(0.95); opacity: 0.8; }
              50% { transform: scale(1.1); opacity: 0.4; }
              100% { transform: scale(0.95); opacity: 0.8; }
            }
          `}</style>

          <span style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#2563eb',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '4px 12px',
            borderRadius: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 12
          }}>
            {isAuthError ? 'Authentication & Scope Syncing' : 'Operational Scope Initializing'}
          </span>

          <h2 style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 10px',
            letterSpacing: '-0.02em'
          }}>
            {isAuthError ? 'Session Verification In Progress' : 'Module View Scope Initializing'}
          </h2>

          <p style={{
            fontSize: 14,
            color: '#64748b',
            maxWidth: 480,
            lineHeight: 1.6,
            margin: '0 0 28px'
          }}>
            {isAuthError
              ? 'Your SSO access token & role privileges are syncing with the backend governance microservice. Click below to refresh your authenticated session.'
              : 'The requested module view is synchronizing data structures. Re-establishing live microservice connection...'}
          </p>

          {/* Action Button */}
          <button
            onClick={this.handleRetry}
            style={{
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} /> Sync Session & Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SwachhErrorBoundary;
