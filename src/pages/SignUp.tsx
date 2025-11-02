import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom'; 
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/core/Input';
import { Button } from '../components/core/Button';
import { getFriendlyErrorMessage } from '../lib/errors';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { LoadingSpinner } from '../components/core/LoadingSpinner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type FieldStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid_format';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [duressPassword, setDuressPassword] = useState(''); // <-- NEW STATE
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 

  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('idle');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const { signup, isVaultUnlocked, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // ... (useEffect for username check is unchanged) ...
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setIsCheckingUsername(true);
    setUsernameStatus('checking');
    const debouncedCheck = setTimeout(async () => {
      const normalizedUsername = username.toUpperCase();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username_normalized', '==', normalizedUsername), limit(1));
      const querySnapshot = await getDocs(q);
      setUsernameStatus(querySnapshot.empty ? 'available' : 'taken');
      setIsCheckingUsername(false);
    }, 500);
    return () => clearTimeout(debouncedCheck);
  }, [username]);

  // ... (useEffect for email check is unchanged) ...
  useEffect(() => {
    if (email.length === 0) {
      setEmailStatus('idle');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailStatus('invalid_format');
      return;
    }
    setIsCheckingEmail(true);
    setEmailStatus('checking');
    const debouncedCheck = setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        setEmailStatus(methods.length === 0 ? 'available' : 'taken');
      } catch (err: any) {
        if (err.code === 'auth/invalid-email') {
          setEmailStatus('invalid_format');
        } else {
          console.error("Email check error:", err);
          setEmailStatus('idle');
        }
      }
      setIsCheckingEmail(false);
    }, 500);
    return () => clearTimeout(debouncedCheck);
  }, [email]);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (usernameStatus !== 'available') {
      setError("Please choose an available username.");
      return;
    }
    if (emailStatus !== 'available') {
      setError("Please use an available, valid email.");
      return;
    }
    // Duress password validation
    if (duressPassword.length > 0 && duressPassword.length < 4) {
        setError("Duress password must be at least 4 characters.");
        return;
    }
    if (duressPassword.length > 0 && duressPassword === password) {
        setError("Duress password cannot be the same as your main password.");
        return;
    }

    setLoading(true);
    try {
      // --- PASS THE DURESS PASSWORD TO SIGNUP ---
      await signup(email, password, username, duressPassword);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ... (renderUsernameStatus and renderEmailStatus remain unchanged) ...
  const renderUsernameStatus = () => {
    switch (usernameStatus) {
      case 'checking':
        return <p className="text-sm text-grey-mid">Checking availability...</p>;
      case 'available':
        return <p className="text-sm text-green-500">✅ Username is available!</p>;
      case 'taken':
        return <p className="text-sm text-red-500">❌ Username is already taken.</p>;
      case 'idle':
      default:
        if (username.length > 0 && username.length < 3) {
          return <p className="text-sm text-grey-mid">Username must be at least 3 characters.</p>;
        }
        return <div className="h-5" />;
    }
  };
  const renderEmailStatus = () => {
    switch (emailStatus) {
      case 'checking':
        return <p className="text-sm text-grey-mid">Checking email...</p>;
      case 'available':
        return <p className="text-sm text-green-500">✅ Email is available!</p>;
      case 'taken':
        return <p className="text-sm text-red-500">❌ Email is already in use.</p>;
      case 'invalid_format':
        return <p className="text-sm text-red-500">Please enter a valid email format.</p>;
      case 'idle':
      default:
        return <div className="h-5" />;
    }
  };

  const isButtonDisabled = 
    loading || 
    isCheckingUsername || 
    isCheckingEmail ||
    usernameStatus !== 'available' || 
    emailStatus !== 'available' ||
    password.length < 8 ||
    (duressPassword.length > 0 && duressPassword.length < 4) ||
    (duressPassword === password);


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-grey-light dark:bg-pure-black">
        <LoadingSpinner />
      </div>
    );
  }

  if (isVaultUnlocked) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-grey-light dark:bg-pure-black">
      <div className="w-full max-w-md p-8 bg-pure-white dark:bg-night rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-center text-night dark:text-pure-white mb-8">
          PHOTON
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="mt-1 pl-1 h-5">
              {renderEmailStatus()}
            </div>
          </div>
          
          <div>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <div className="mt-1 pl-1 h-5">
              {renderUsernameStatus()}
            </div>
          </div>

          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {/* --- NEW DURESS PASSWORD FIELD --- */}
          <div>
            <Input
              type="password"
              placeholder="Duress Password (Optional: For Plausible Deniability)"
              value={duressPassword}
              onChange={(e) => setDuressPassword(e.target.value)}
            />
            <p className="text-xs text-grey-mid mt-1 pl-1">
              Use a *different* password to open an empty decoy vault.
            </p>
          </div>
          {/* --- END NEW DURESS PASSWORD FIELD --- */}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <Button 
            type="submit" 
            isLoading={loading} 
            disabled={isButtonDisabled}
          >
            {isCheckingUsername || isCheckingEmail ? 'Validating...' : 'Create & Secure Vault'}
          </Button>
          
          <p className="text-center text-grey-dark dark:text-grey-mid">
            Already have an account?{' '}
            <Link to="/login" className="text-night dark:text-pure-white hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;