import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';

// Optional: A simple CSS module for the blank page if needed, or inline styles.
// import styles from '../styles/BlankIndex.module.css'; 

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if already logged in (or after OAuth callback is processed)
  useEffect(() => {
    if (user && !loading) {
      router.push('/marketing-plan');
    }
  }, [user, loading, router]);

  // Render nothing substantial, just a container or null 
  // while checking auth state or if not logged in yet.
  // A simple loading indicator can also be placed here.
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Head>
        <title>Loading...</title> {/* Simple title */}
      </Head>
      {/* Optional: Add a subtle loading indicator here if desired */}
      {/* e.g., <p style={{ textAlign: 'center', paddingTop: '2rem' }}>Loading...</p> */}
    </div>
  );
}

// Add getServerSideProps to force SSR and prevent build errors
export async function getServerSideProps() {
  // No data fetching needed here, just forcing SSR
  return {
    props: {}, 
  };
} 