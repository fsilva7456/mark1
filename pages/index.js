import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import styles from '../styles/Home.module.css';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signIn({ email, password });
      
      if (error) throw error;
      
      router.push('/dashboard');
    } catch (error) {
      setError(error.message || 'An error occurred during login.');
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
    <div className={styles.container}>
      <Head>
        <title>MARK1 | AI Marketing for Fitness Professionals</title>
        <meta name="description" content="AI-powered marketing strategy and content creation for fitness professionals" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <motion.div 
          className={styles.backgroundSection}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className={styles.backgroundOverlay} />
          
          <div className={styles.content}>
            <motion.h1
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className={styles.title}
            >
              AI-POWERED MARKETING FOR THE FITNESS INDUSTRY
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className={styles.subtitle}
            >
              MARK1 helps fitness professionals define their marketing strategy, create engaging content, and grow their business.
            </motion.p>
            
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className={styles.featureList}
            >
              {[
                'Generate engaging social media content',
                'Attract and convert more clients',
                'Track performance with AI insights',
                'Build a consistent marketing strategy'
              ].map((feature, index) => (
                <motion.li 
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + (index * 0.1), duration: 0.5 }}
                >
                  {feature}
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>
        
        <motion.div 
          className={styles.formSection}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>Welcome Back</h2>
            <p className={styles.formSubtitle}>Login to your account</p>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <motion.button 
                type="submit" 
                className={styles.loginButton}
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </motion.button>
            </form>
            
            <div className={styles.formFooter}>
              <p>Don't have an account? <Link href="/signup">Sign up</Link></p>
            </div>
          </div>
        </motion.div>
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