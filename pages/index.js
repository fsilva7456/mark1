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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      });
      
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error(err);
    }
  };

  // Animation variants for staggered children animations
  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>MARK1 | AI Marketing for Fitness Professionals</title>
        <meta name="description" content="AI-powered marketing strategy and content creation for fitness professionals" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        {/* Background with gradient overlay */}
        <div className={styles.backgroundSection}></div>
        
        {/* Image background */}
        <div className={styles.backgroundOverlay}></div>
        
        {/* Content section - features and intro */}
        <div className={styles.content}>
          <motion.h1
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
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
            variants={listVariants}
            initial="hidden"
            animate="visible"
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
                variants={itemVariants}
              >
                {feature}
              </motion.li>
            ))}
          </motion.ul>
        </div>
        
        {/* Login form */}
        <div className={styles.formSection}>
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
                  placeholder="your@email.com"
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
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <motion.button 
                type="submit" 
                className={styles.loginButton}
                disabled={isLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </motion.button>
            </form>
            
            <div className={styles.divider}>or</div>
            
            {/* Comment out the Google login button temporarily */}
            {/*
            <button 
              onClick={handleGoogleLogin} 
              className={styles.googleButton}
            >
              <svg className={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" 
                fill="#4285F4"/>
              </svg>
              Sign in with Google
            </button>
            */}
            
            {/* If it's inside a container with other social logins, you might need to do: */}
            <div className={styles.socialLogins}>
              {/* Comment out just the Google button */}
              {/*
              <button 
                onClick={handleGoogleLogin} 
                className={styles.googleButton}
              >
                <img src="/icons/google.svg" alt="Google" />
                Sign in with Google
              </button>
              */}
              
              {/* Keep other social login buttons if they exist */}
            </div>
            
            <div className={styles.formFooter}>
              <p>Don't have an account? <Link href="/signup">Sign up</Link></p>
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