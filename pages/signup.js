import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import styles from '../styles/Login.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Signup() {
  const router = useRouter();
  const { signUp, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push('/marketing-plan');
    }
  }, [user, loading, router]);

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Validate passwords match first
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return; // Don't proceed if passwords mismatch
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error } = await signUp(email, password);

      if (error) {
        setError(error.message); // Set error from Supabase
      } else if (data.user && data.user.identities?.length === 0) {
        // Handle case where user exists but email is not confirmed
        setError('User already exists, but email not confirmed. Please check your email or try logging in.');
      } else if (data.user) {
        setMessage('Signup successful! Please check your email to confirm your account.');
        // Optionally clear form fields
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        // Handle unexpected cases or specific scenarios if needed
        setError('An unexpected issue occurred during signup.')
      }
    } catch (err) {
      setError('Failed to sign up. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.formSection} style={{ minHeight: '100vh', background: '#f7f7f7' }}>
      <Head>
        <title>Sign Up</title>
        <meta name="description" content="Create a new account" />
      </Head>

      <div className={styles.loginBox}>
        <h2 className={styles.title}>Create Account</h2>
        
        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.message}>{message}</p>}
        
        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className={styles.signupText}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
} 