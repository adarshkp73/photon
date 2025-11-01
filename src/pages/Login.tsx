import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/core/Input';
import { Button } from '../components/core/Button';
import { getFriendlyErrorMessage } from '../lib/errors'; 

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      {/* Container for Password Input */}
      <div>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        {/* --- THIS BLOCK IS NOW REMOVED ---
        <div className="text-right mt-2">
          <Link 
            to="/forgot-password" 
            className="text-sm text-night dark:text-pure-white hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
        */}
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
  );
};

export default Login;