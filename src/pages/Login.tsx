import React, { useState, useEffect } from 'react'; 
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/core/Input';
import { Button } from '../components/core/Button';
import { getFriendlyErrorMessage } from '../lib/errors'; 
import { LoadingSpinner } from '../components/core/LoadingSpinner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // GET isDecoyMode
  const { login, isVaultUnlocked, loading: authLoading, isDecoyMode } = useAuth(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || "/";

  // New: Check for decoy mode after state updates
  useEffect(() => {
    if (isDecoyMode) {
      // If we are in decoy mode, the app should clean up and redirect to the dashboard
      // where the user will see an empty UI.
      setEmail('');
      setPassword('');
      // Redirect to home (which will show the decoy UI)
      navigate(from, { replace: true });
    }
  }, [isDecoyMode, navigate, from]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call the login function which now checks for Decoy/Duress password
      await login(email, password);
      
      // If successful (real login or decoy login), navigate.
      // The useEffect above handles navigation if isDecoyMode becomes true.
      if (!isDecoyMode) {
         navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-grey-light dark:bg-pure-black">
        <LoadingSpinner />
      </div>
    );
  }

  // If user is already logged in (vault is unlocked), redirect them
  if (isVaultUnlocked) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, show the login form
  return (
    <div className="flex items-center justify-center min-h-screen bg-grey-light dark:bg-pure-black">
      <div className="w-full max-w-md p-8 bg-pure-white dark:bg-night rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-center text-night dark:text-pure-white mb-8">
          PHOTON
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display alert if in decoy mode */}
          {isDecoyMode && (
            <div className="p-3 bg-red-800 text-pure-white rounded mb-4">
              <p className="font-bold text-center">Decoy Mode Activated.</p>
            </div>
          )}

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <Button type="submit" isLoading={loading}>
            Unlock Vault
          </Button> 

          <p className="text-center text-grey-dark dark:text-grey-mid">
            No account?{' '}
            <Link to="/signup" className="text-night dark:text-pure-white hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;