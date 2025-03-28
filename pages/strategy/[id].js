import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import StrategyDisplay from '../../components/StrategyDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from '../../styles/Strategy.module.css';
import { toast } from 'react-hot-toast';

export default function StrategyDetail() {
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
      
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        console.log("Strategy data loaded:", data);
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

  const handleCreateVariation = () => {
    router.push(`/strategy/new?base=${id}`);
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Strategy Details | Mark1</title>
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
                onClick={() => router.push('/marketing-plan')} 
                className={styles.returnButton}
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <StrategyDisplay 
              strategy={strategy}
              showEditButton={true}
              onEdit={handleCreateVariation}
            />
          )}
        </div>
      </main>
    </div>
  );
}
