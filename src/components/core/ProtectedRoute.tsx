import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Get the new isDecoyMode state
  const { currentUser, isVaultUnlocked, loading, isDecoyMode } = useAuth();
  const location = useLocation();

  // 2. Show a loading spinner while Firebase auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-grey-light dark:bg-night">
        <LoadingSpinner />
      </div>
    );
  }

  // --- 3. THE CRITICAL FIX ---
  // The user is authenticated if EITHER the vault is unlocked OR we are in decoy mode.
  const isUserAllowedInApp = isVaultUnlocked || isDecoyMode;


  // 4. Check if the user is authenticated (security check)
  if (!isUserAllowedInApp) {
    // If vault is locked AND we are NOT in decoy mode, force to /login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 5. Check Email Verification (only applies if we are NOT in decoy mode)
  // We should NOT require verification in decoy mode, as it would expose the fake user.
  if (currentUser && !currentUser.emailVerified && !isDecoyMode) {
    // If they are NOT verified, force them to the verify page.
    return <Navigate to="/verify-email" replace />;
  }

  // 6. Final check: User is either fully real OR in decoy mode.
  // Check the path for proper routing.
  if (currentUser && isUserAllowedInApp) {
    if (location.pathname === '/verify-email') {
      // If they are verified/decoy mode and try to go to the verify page, send them to the app.
      return <Navigate to="/" replace />;
    } else {
      // Otherwise, let them access the protected page.
      return <>{children}</>;
    }
  }

  // Default fallback (should be unreachable)
  return <Navigate to="/login" replace />;
};