import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

export const VerificationGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isVaultUnlocked, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-grey-light dark:bg-night">
        <LoadingSpinner />
      </div>
    );
  }

  // If you're not logged in (vault locked), you can't be here.
  if (!isVaultUnlocked) {
    return <Navigate to="/login" replace />;
  }

  // If you *are* logged in AND your email is verified,
  // you shouldn't be on this page. Send to main app.
  if (isVaultUnlocked && currentUser?.emailVerified) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, you are in the correct state (logged in, vault unlocked, not verified)
  // so we show the children (the VerifyEmail page).
  return <>{children}</>;
};