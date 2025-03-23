import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Strategy.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ViewStrategy() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    // Redirect to view page when ID is available
    if (id) {
      router.replace(`/strategy/view/${id}`);
    }
  }, [id, user, loading, router]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Redirecting... | Mark1</title>
        <meta name="description" content="Redirecting to strategy view page" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Redirecting to strategy view page...</p>
        </div>
      </main>
    </div>
  );
} 