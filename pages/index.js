import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import styles from '../styles/Home.module.css';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Home() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signIn({ provider: 'google' });
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Mark1 - AI Native Marketing for Fitness</title>
        <meta name="description" content="AI-powered marketing tools for the fitness industry" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.loginContainer}>
          <div className={styles.loginLeftPanel}>
            <div className={styles.loginContent}>
              <h1 className={styles.heroTitle}>
                AI-Powered Marketing <br/>
                <span className={styles.highlight}>For the Fitness Industry</span>
              </h1>
              <p className={styles.heroDescription}>
                Mark1 helps fitness professionals define their marketing strategy, plan compelling content, and grow their business through AI-powered marketing tools.
              </p>
              <div className={styles.features}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>✓</div>
                  <span>Generate engaging social media content</span>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>✓</div>
                  <span>Attract and convert more clients</span>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>✓</div>
                  <span>Track performance with AI insights</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.loginRightPanel}>
            <div className={styles.loginBox}>
              <h2>Log in to your account</h2>
              
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
                
                <div className={styles.forgotPassword}>
                  <Link href="/forgot-password">Forgot password?</Link>
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
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} Mark1 AI, Inc. All rights reserved.</p>
          <div className={styles.footerLegal}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
} 