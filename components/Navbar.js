import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Navbar.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const isDashboard = router.pathname === '/dashboard';

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <img src="/mark1-logo.svg" alt="Mark1" className={styles.logoImage} />
        </Link>

        <div className={styles.navControls}>
          <button className={styles.menuButton} onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Only show these auth buttons when not logged in */}
          {!user && router.pathname !== '/' && router.pathname !== '/signup' && (
            <div className={styles.authButtons}>
              <Link href="/" className={styles.loginButton}>
                Log in
              </Link>
              <Link href="/signup" className={styles.signupButton}>
                Sign up
              </Link>
            </div>
          )}
          
          {/* Show logout when user is logged in AND not on dashboard */}
          {user && !isDashboard && (
            <button onClick={signOut} className={styles.logoutButton}>
              Logout
            </button>
          )}
        </div>

        <div className={`${styles.menu} ${menuOpen ? styles.active : ''}`}>
          <Link href="/features" className={router.pathname === '/features' ? styles.active : ''}>
            Features
          </Link>
          <Link href="/pricing" className={router.pathname === '/pricing' ? styles.active : ''}>
            Pricing
          </Link>
          <Link href="/blog" className={router.pathname === '/blog' ? styles.active : ''}>
            Blog
          </Link>
          <Link href="/about" className={router.pathname === '/about' ? styles.active : ''}>
            About
          </Link>
        </div>
      </div>
    </nav>
  );
} 