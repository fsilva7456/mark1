import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase'; // Need Supabase client for server-side check
import { parse } from 'cookie'; // Helper to parse cookies

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
      <p style={{ textAlign: 'center', paddingTop: '2rem', color: '#ccc' }}>Loading application...</p>
    </div>
  );
}

// Check auth state server-side and redirect if logged in
export async function getServerSideProps(context) {
  const { req } = context;
  const cookies = parse(req.headers.cookie || '');
  
  // Construct the key Supabase uses for the auth token cookie
  // Note: This might vary slightly depending on Supabase version or config,
  // check browser dev tools -> Application -> Cookies to confirm the exact name.
  // It often looks like sb-<project_ref>-auth-token
  const supabaseTokenCookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`; 
  const token = cookies[supabaseTokenCookieName];

  let user = null;
  if (token) {
    try {
       // Verify the token server-side
       const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
       if (!error && supabaseUser) {
           user = supabaseUser;
       }
    } catch (e) {
        console.error("Error verifying token in index SSR:", e);
    }
  }

  // If user is found via server-side check, redirect immediately
  if (user) {
    return {
      redirect: {
        destination: '/projects/select', // Redirect to project selection
        permanent: false,
      },
    };
  }

  // If no user, render the basic page (which likely leads to /login via AuthContext later)
  return {
    props: {}, 
  };
} 