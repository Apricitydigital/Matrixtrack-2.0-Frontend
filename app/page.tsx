'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@hooks/useAuth';
import { getPostLoginRedirect } from '@utils/modules';
import { Shield, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashStatus, setSplashStatus] = useState('Initializing Enterprise Command Node...');

  // Animated Splash Screen Sequence -> Direct Auto-Navigation to /portal-home or /login
  useEffect(() => {
    const steps = [
      { p: 25, label: 'Connecting to State Command Core...' },
      { p: 55, label: 'Loading Multi-City Modules & ULBs...' },
      { p: 85, label: 'Syncing Live IST Data Feed...' },
      { p: 100, label: 'Enterprise Platform Ready' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSplashProgress(steps[currentStep].p);
        setSplashStatus(steps[currentStep].label);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          router.replace(user ? getPostLoginRedirect(user) : '/unified-login');
        }, 300);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [user, router]);

  const handleSkipSplash = () => {
    router.replace(user ? getPostLoginRedirect(user) : '/unified-login');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #090d16 0%, #0f172a 60%, #1e3a8a 100%)',
      color: '#ffffff',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* Glowing Animated Emblem */}
      <div style={{
        position: 'relative',
        width: 110,
        height: 110,
        marginBottom: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          inset: -14,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.65) 0%, transparent 70%)',
          animation: 'pulseGlow 2s infinite ease-in-out'
        }} />

        <div style={{
          width: 86,
          height: 86,
          borderRadius: 26,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 14px 36px rgba(37, 99, 235, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          animation: 'floatLogo 3s infinite ease-in-out'
        }}>
          <Shield size={48} />
        </div>
      </div>

      {/* Title Branding */}
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '6px 18px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: '#93c5fd',
          marginBottom: 14
        }}>
          <Sparkles size={14} /> HMS Enterprise Platform
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 10px', color: '#ffffff' }}>
          MatrixTrack 2.0
        </h1>

      </div>

      {/* Progress Bar & Status */}
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{
          height: 6,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 16,
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            height: '100%',
            width: `${splashProgress}%`,
            background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
            borderRadius: 10,
            transition: 'width 0.4s ease'
          }} />
        </div>

        <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{splashStatus}</span>
          <span style={{ fontWeight: 800, color: '#60a5fa' }}>{splashProgress}%</span>
        </div>
      </div>

      {/* Quick Skip Option */}
      <button
        onClick={handleSkipSplash}
        style={{
          position: 'absolute',
          bottom: 36,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#cbd5e1',
          padding: '8px 20px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Enter Portal Immediately &rarr;
      </button>
    </div>
  );
}
