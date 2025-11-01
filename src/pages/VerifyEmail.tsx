import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sendEmailVerification } from 'firebase/auth';
import { Button } from '../components/core/Button';

const VerifyEmail: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleResendEmail = async () => {
    if (!currentUser) return;

    setLoading(true);
    setMessage('');
    try {
      await sendEmailVerification(currentUser);
      setMessage('A new verification email has been sent. Please check your inbox (and spam folder).');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/too-many-requests') {
        setMessage('You have requested an email too recently. Please wait a few minutes.');
      } else {
        setMessage('Failed to send email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // We use the AuthLayout's styling for a consistent feel
    <div className="flex items-center justify-center min-h-screen bg-grey-light dark:bg-pure-black">
      <div className="w-full max-w-md p-8 bg-pure-white dark:bg-night rounded-lg shadow-xl text-center">
        <h1 className="text-3xl font-bold text-night dark:text-pure-white mb-6">
          Check Your Inbox
        </h1>
        
        <p className="text-lg text-grey-dark dark:text-grey-light mb-4">
          We've sent a verification link to:
        </p>
        <p className="text-xl font-medium text-night dark:text-pure-white mb-8">
          {currentUser?.email}
        </p>
        
        <p className="text-grey-dark dark:text-grey-mid mb-6">
          Please click the link in that email to continue. You may need to check your spam folder.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={handleResendEmail} 
            isLoading={loading}
          >
            Resend Verification Email
          </Button>

          <Button 
            variant="secondary"
            onClick={logout}
          >
            Log Out
          </Button>
        </div>

        {message && (
          <p className="text-green-600 dark:text-green-500 mt-4">{message}</p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;