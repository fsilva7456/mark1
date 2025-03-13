import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../utils/supabaseClient';
import styles from '../../../styles/Strategy.module.css';

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
      
      console.log("Making Supabase query for strategy ID:", strategyId);
      
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        console.log("Retrieved strategy:", data);
        console.log("Strategy ID from database:", data.id);
        console.log("Strategy ID type:", typeof data.id);
        
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
                  
                  <Link 
                    href={`/content/new?strategy=${encodeURIComponent(strategy.id)}`}
                    className={styles.outlineButton}
                    onClick={(e) => {
                      // Enhanced debugging and validation
                      console.log("Generate Content - Strategy Data:", {
                        id: strategy.id,
                        name: strategy.name,
                        idType: typeof strategy.id,
                        obj: JSON.stringify(strategy)
                      });
                      
                      // Check if strategy.id is definitely a UUID (simple check)
                      if (!strategy.id || typeof strategy.id !== 'string' || strategy.id.includes(' ')) {
                        e.preventDefault();
                        console.error("Invalid strategy ID detected:", strategy.id);
                        alert('Invalid strategy ID. Please go back to the dashboard and try again.');
                      }
                    }}
                  >
                    Generate Content Outline
                  </Link>
                  
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