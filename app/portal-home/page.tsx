'use client';

// MATRIXTRACK_SUPER_ADMIN_HOME_V1
import React from 'react';
import { useAuth } from '@hooks/useAuth';
import SuperAdminHomeDashboard from './SuperAdminHomeDashboard';
import LegacyPortalHomePage from './LegacyPortalHomePage';

export default function PortalHomePage() {
  const { user } = useAuth();
  const roles = [user?.role, ...(user?.roles || [])].map((role) => String(role || '').toUpperCase());
  const isSuperAdmin = roles.includes('HMS_SUPER_ADMIN') || roles.includes('SUPER_ADMIN');
  return isSuperAdmin ? <SuperAdminHomeDashboard /> : <LegacyPortalHomePage />;
}
