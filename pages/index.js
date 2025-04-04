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

  console.log('Home component rendering client-side. Auth State:', { loading, user: !!user });

  // Client-side redirect logic after authentication state is resolved
  useEffect(() => {
    console.log('Home component useEffect running. Auth State:', { loading, user: !!user });
    // Wait until the auth state is determined
    if (!loading) {
      if (user) {
        console.log('Home useEffect: User found, redirecting to /projects/select');
        router.push('/projects/select');
      } else {
        console.log('Home useEffect: No user found, redirecting to /login');
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Render a loading indicator while auth state is being checked client-side
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Head>
        <title>Loading...</title>
      </Head>
      <p style={{ color: '#555', fontSize: '1.1rem' }}>Loading application...</p> 
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