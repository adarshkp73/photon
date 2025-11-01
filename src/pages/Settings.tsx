import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/core/Input';
import { Button } from '../components/core/Button';
import { getFriendlyErrorMessage } from '../lib/errors';
import { Link, useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // For success
  const [loading, setLoading] = useState(false);
  
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current one.');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setMessage('Success! Your password has been changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = 
    loading ||
    currentPassword.length === 0 ||
    newPassword.length < 8 ||
    newPassword !== confirmPassword;

  return (
    // This component will be rendered inside the Dashboard's <Outlet>
    <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
      <div className="w-full max-w-lg">
        <h2 className="text-3xl font-bold text-night dark:text-pure-white mb-6 pb-4 border-b border-grey-mid/20 dark:border-grey-dark">
          Settings
        </h2>

        {/* --- Change Password Form --- */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-xl font-semibold text-night dark:text-pure-white">
            Change Password
          </h3>
          
          <p className="text-sm text-grey-dark dark:text-grey-mid">
            Changing your password will re-encrypt your entire vault.
            This is the only secure way to manage your account.
            We strongly recommend you <span className="font-bold">never</span> forget your password.
          </p>

          <div>
            <label className="block text-sm font-medium text-grey-dark dark:text-grey-light mb-1">
              Current Password
            </label>
            <Input
              type="password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-grey-dark dark:text-grey-light mb-1">
              New Password
            </label>
            <Input
              type="password"
              placeholder="Enter at least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-grey-dark dark:text-grey-light mb-1">
              Confirm New Password
            </label>
            <Input
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          {message && <p className="text-green-600 dark:text-green-500 text-sm">{message}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          {/* --- THIS IS THE UPDATED BLOCK --- */}
          {/* We now use `justify-end` and `gap-4` to create space */}
          <div className="flex justify-end items-center pt-4 gap-4">
            {/* The "Cancel" button is a secondary Button */}
            <Button
              type="button" // Important: prevents form submission
              variant="secondary"
              className="w-auto px-6" // Matches the "Save" button's size
              onClick={() => navigate('/')} // Navigates home on click
            >
              Cancel
            </Button>

            {/* The "Save" button remains the primary action */}
            <Button 
              type="submit" 
              isLoading={loading} 
              disabled={isButtonDisabled}
              className="w-auto px-6"
            >
              Save Changes
            </Button> 
          </div>
        </form>

      </div>
    </div>
  );
};

export default Settings;