'use client';

import React, { useState, useEffect } from 'react';
import './index.css';
import './App.css';
import MatrixTrackApp from './App';

export default function WorkforceDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        Loading Matrix Track Admin Panel...
      </div>
    );
  }

  return <MatrixTrackApp />;
}
