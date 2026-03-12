import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email.trim(), password);
      if (success) {
        const role = email.includes('@driver') ? 'driver' : 'manager';
        if (role === 'driver') {
          navigate('/route');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert('Password reset flow - To be implemented');
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 24 }}>
          <img src="/EZTrakLogo-fancy.svg" alt="EZTrak Logo" style={{ width: 160, height: 40, display: 'block' }} />
        </div>
        {/* Removed Dumpster Tracker title */}
        <p className="subtitle">Business Management & Route Optimization</p>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={onLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="Enter your email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="emailInput"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="passwordInput"
              required
              disabled={loading}
            />
          </div>

          <button 
            className="login-btn" 
            type="submit"
            data-testid="loginButton"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <button 
          className="forgot-btn" 
          onClick={handleForgotPassword}
          data-testid="forgotPassword"
          type="button"
          disabled={loading}
        >
          Forgot password?
        </button>

        <div className="demo-credentials">
          <p className="text-muted">Demo Credentials:</p>
          <p><strong>Manager:</strong> manager@company.com</p>
          <p><strong>Driver:</strong> driver@company.com</p>
          <p><strong>Password:</strong> any password</p>
        </div>
      </div>
    </div>
  );
}
