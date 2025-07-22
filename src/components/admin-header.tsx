'use client'

import React from 'react';
import { useAdminContext } from '@/contexts/admin-context';

export default function AdminHeader() {
  const { state, logout } = useAdminContext();

  const handleLogout = async () => {
    await logout();
  };

  // Don't render anything if not authenticated
  if (!state.isAuthenticated) {
    return null;
  }

  return (
    <>
      |&nbsp;
      <button
        onClick={handleLogout}
        className="visibleLink"
        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, margin: 0 }}
      >
        Logout
      </button>
    </>
  );
} 