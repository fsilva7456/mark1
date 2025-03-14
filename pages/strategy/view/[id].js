import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../utils/supabaseClient';
import styles from '../../../styles/Strategy.module.css';
import { toast } from 'react-hot-toast';

export default function ViewStrategy() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    // Fetch strategy details when ID is available
    if (id && user) {
      console.log("Fetching strategy with ID:", id);
      fetchStrategyDetails(id);
    }
  }, [id, user, loading, router]);
  
  const fetchStrategyDetails = async (strategyId) => {
    try {
      setIsLoading(true);
      
      console.log("Fetching strategy with ID:", strategyId);
      
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        console.log("Retrieved strategy details:", {
          id: data.id,
          name: data.name,
          id_type: typeof data.id
        });
        
        // Ensure the ID is correctly set
        if (!data.id || typeof data.id !== 'string' || data.id.includes(' ')) {
          console.error("Warning: Strategy has an invalid ID format:", data.id);
        }
        
        setStrategy(data);
      } else {
        setError('Strategy not found.');
      }
    } catch (err) {
      console.error('Error fetching strategy:', err);
      setError('Failed to load strategy details.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateContent = async () => {
    try {
      // IMPORTANT: Use the ID from the URL, not from the strategy object
      const strategyIdFromUrl = id; // This is the UUID from the URL
      
      console.log("URL ID (should be UUID):", strategyIdFromUrl);
      console.log("Strategy object:", {
        id: strategy?.id, 
        name: strategy?.name
      });
      
      // Always use the URL parameter ID which is guaranteed to be the UUID
      router.push(`/content/new?strategy=${encodeURIComponent(strategyIdFromUrl)}`);
    } catch (error) {
      console.error("Error preparing content generation:", error);
      toast.error("Failed to prepare content generation. Please try again.");
    }
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>View Strategy | Mark1</title>
        <meta name="description" content="View your marketing strategy" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>{strategy?.name || 'Marketing Strategy'}</h1>
            <p>Review your strategy and create content based on it.</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading your strategy...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Error</h3>
              <p>{error}</p>
              <button 
                onClick={() => router.push('/dashboard')} 
                className={styles.returnButton}
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className={styles.matrixLayout}>
              <div className={styles.matrixContainer}>
                <h2>Your Marketing Strategy</h2>
                <div className={styles.matrix}>
                  <div className={styles.matrixSection}>
                    <h3>Target Audience</h3>
                    <ul>
                      {strategy.target_audience?.map((audience, index) => (
                        <li key={index}>{audience}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className={styles.matrixSection}>
                    <h3>Objectives</h3>
                    <ul>
                      {strategy.objectives?.map((objective, index) => (
                        <li key={index}>{objective}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className={styles.matrixSection}>
                    <h3>Key Messages</h3>
                    <ul>
                      {strategy.key_messages?.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className={styles.matrixActions}>
                  {/* Debug output */}
                  {process.env.NODE_ENV !== 'production' && (
                    <div style={{marginBottom: '10px', fontSize: '12px', color: '#666'}}>
                      <p>Strategy ID: {strategy.id}</p>
                      <p>Strategy ID Type: {typeof strategy.id}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleGenerateContent}
                    className={styles.outlineButton}
                  >
                    Generate Content Outline
                  </button>
                  
                  <button
                    onClick={() => router.push('/dashboard')}
                    className={styles.cancelButton}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 