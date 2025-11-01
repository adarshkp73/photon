import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../core/LoadingSpinner';

const AuthLayout: React.FC = () => {
  const { currentUser, loading, isVaultUnlocked } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-grey-light dark:bg-pure-black">
        <LoadingSpinner />
      </div>
    );
  }
  
  // --- THIS IS THE CORRECTED LOGIC ---
  if (currentUser && isVaultUnlocked) {
    // The user is logged in and their vault is unlocked.
    // Now we check *where* to send them.
    
    if (currentUser.emailVerified) {
      // They are fully authenticated AND verified. Send them to the main app.
      return <Navigate to="/" replace />;
    } else {
      // They are authenticated but NOT verified.
      // Send them directly to the "Verify Email" page.
      // This fixes the race condition.
      return <Navigate to="/verify-email" replace />;
    }
  }

  // If the user is logged out (currentUser is null) OR their vault is locked,
  // we show the <Outlet />, which contains the Login, SignUp,
  // and ForgotPassword pages.
  return (
    <div className="flex items-center justify-center min-h-screen bg-grey-light dark:bg-pure-black">
      <div className="w-full max-w-md p-8 bg-pure-white dark:bg-night rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-center text-night dark:text-pure-white mb-8">
          PHOTON
        </h1>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;