import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import styles from '../styles/Login.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const router = useRouter();
  const { signIn, signInWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
      } else {
        router.push('/project-picker');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const redirectUrl = `${window.location.origin}/project-picker`;

      const { error } = await signInWithOAuth({ 
        provider: 'google', 
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
      
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error('Google login error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.splitContainer}>
      <Head>
        <title>Login | Mark1</title>
        <meta name="description" content="Login to your Mark1 account" />
      </Head>

      <div className={styles.brandingSection}>
        <img 
          src="/images/fitness-background.jpg" 
          alt="Gym interior with fitness equipment"
          className={styles.backgroundImage}
        />
        <div className={styles.overlay}></div>
        <div className={styles.brandingContent}>
          <h1>Mark1</h1>
          <p>Your all-in-one digital marketing solution for fitness instructors.</p>
          <p className={styles.tagline}>Join thousands of fitness professionals growing their business with Mark1.</p>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.loginBox}>
          <h2 className={styles.title}>Login</h2>
          
          {error && <p className={styles.error}>{error}</p>}
          
          <form onSubmit={handleEmailLogin} className={styles.form}>
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
            
            <button 
              type="submit" 
              className={styles.loginButton}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          
          <div className={styles.divider}>
            <span>OR</span>
          </div>
          
          <button 
            onClick={handleGoogleLogin} 
            className={styles.googleButton}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1Z" fill="#4285F4" />
              </g>
            </svg>
            Sign in with Google
          </button>
          
          <p className={styles.signupText}>
            Don't have an account? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </div>

    </div>
  );
} 