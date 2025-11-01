import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 1. useNavigate is GONE
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/core/Input';
import { Button } from '../components/core/Button';
import { getFriendlyErrorMessage } from '../lib/errors';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

// A simple regex for email format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Define status types for BOTH fields
type FieldStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid_format';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // This is for FORM submission

  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('idle');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const { signup } = useAuth();
  // const navigate = useNavigate(); // 2. This line is GONE

  // USERNAME CHECK EFFECT
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

  // EMAIL CHECK EFFECT
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

    setLoading(true);
    try {
      await signup(email, password, username);
      // 3. The `Maps('/')` call is GONE.
      // The router will now handle the redirect automatically.
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // HELPER to render username status
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

  // HELPER to render email status
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

  // CALCULATE if the button should be disabled
  const isButtonDisabled = 
    loading || 
    isCheckingUsername || 
    isCheckingEmail ||
    usernameStatus !== 'available' || 
    emailStatus !== 'available' ||
    password.length < 8;

  return (
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
  );
};

export default SignUp;