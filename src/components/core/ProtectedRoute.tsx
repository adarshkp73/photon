import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isVaultUnlocked, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-grey-light dark:bg-night">
        <LoadingSpinner />
      </div>
    );
  }

  // 1. First, check if vault is unlocked.
  // If not, they MUST go to /login (this is our security model)
  if (!isVaultUnlocked) {
    return <Navigate to="/login" replace />;
  }

  // 2. Vault is unlocked, so we have a `currentUser`.
  // Now, check if their email is verified.
  if (currentUser && !currentUser.emailVerified) {
    // If not verified, send them to the verification page.
    return <Navigate to="/verify-email" replace />;
  }

  // 3. If we are not loading, vault is unlocked, AND email is verified,
  // show the main app.
  return <>{children}</>;
};