import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import styles from '../styles/Setup.module.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Setup() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
    }
    
    // Check if user has already completed setup
    if (user) {
      checkSetupStatus();
    }
  }, [user, loading]);

  const checkSetupStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('website_data')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setSetupComplete(true);
        setWebsiteUrl(data.url);
      }
    } catch (error) {
      console.error("Error checking setup status:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!websiteUrl.trim()) {
      setMessage({ type: 'error', content: 'Please enter a valid website URL' });
      return;
    }
    
    setIsProcessing(true);
    setMessage({ type: '', content: '' });
    
    try {
      console.log("Submitting website for analysis:", websiteUrl);
      
      const response = await fetch('/api/setup/analyze-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: websiteUrl,
          userId: user.id
        }),
      });
      
      const data = await response.json();
      
      // Log the full response for debugging
      console.log("API response:", data);
      
      if (!response.ok) {
        // Show more specific error based on response
        const errorDetails = data.details || 'Unknown error';
        const errorType = data.errorType || '';
        
        throw new Error(`${errorType}: ${errorDetails}`);
      }
      
      setMessage({ 
        type: 'success', 
        content: 'Website successfully analyzed! You can now create marketing strategies based on your website content.' 
      });
      setSetupComplete(true);
    } catch (error) {
      console.error("Error analyzing website:", error);
      
      // Provide more specific guidance based on the error
      let errorMessage = `Error analyzing website: ${error.message}.`;
      
      if (error.message.includes('CORS') || error.message.includes('Network Error')) {
        errorMessage += " We're having trouble accessing your website. Please check that the URL is accessible and not blocking our requests.";
      } else if (error.message.includes('Database')) {
        errorMessage += " There was an issue storing your website data.";
      } else if (error.message.includes('content')) {
        errorMessage += " We couldn't extract enough useful content from your website.";
      } else {
        errorMessage += " Please try again or contact support.";
      }
      
      setMessage({ 
        type: 'error', 
        content: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReanalyze = () => {
    setSetupComplete(false);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>User Setup | Mark1</title>
        <meta name="description" content="Set up your website information" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Website Setup</h1>
            <p>Let's analyze your website to provide you with better marketing strategies</p>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.setupCard}>
            {!setupComplete ? (
              <>
                <h2>Website Analysis</h2>
                <p>
                  Enter the URL to your fitness business website. We'll analyze it to understand your 
                  business, services, and approach, which helps us create more relevant marketing strategies.
                </p>
                
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="websiteUrl">Website URL</label>
                    <input
                      type="text"
                      id="websiteUrl"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="e.g., www.yourfitnessbusiness.com"
                      disabled={isProcessing}
                      className={styles.input}
                    />
                  </div>
                  
                  {message.content && (
                    <div className={`${styles.message} ${styles[message.type]}`}>
                      {message.content}
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    disabled={isProcessing || !websiteUrl.trim()}
                    className={styles.button}
                  >
                    {isProcessing ? (
                      <>
                        <span className={styles.spinner}></span>
                        Analyzing Website...
                      </>
                    ) : 'Analyze Website'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2>Setup Complete</h2>
                <p className={styles.successMessage}>
                  Your website has been successfully analyzed! We now have the information 
                  needed to create personalized marketing strategies for your fitness business.
                </p>
                
                <div className={styles.urlDisplay}>
                  <strong>Analyzed Website:</strong> {websiteUrl}
                </div>
                
                <div className={styles.actionButtons}>
                  <button 
                    onClick={() => router.push('/marketing-plan')}
                    className={styles.primaryButton}
                  >
                    Go to Dashboard
                  </button>
                  <button 
                    onClick={handleReanalyze}
                    className={styles.secondaryButton}
                  >
                    Re-analyze Website
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 