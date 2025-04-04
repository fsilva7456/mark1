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
      
      // First try from strategies table
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) {
        console.log("Supabase error:", error);
        // If not found in main table, try the matrix table
        const { data: matrixData, error: matrixError } = await supabase
          .from('strategy_matrix')
          .select('*')
          .eq('strategy_id', strategyId)
          .single();
          
        if (matrixError) {
          throw new Error("Strategy not found in any table");
        }
        
        if (matrixData) {
          console.log("Strategy matrix data loaded:", matrixData);
          // Convert matrix data to strategy format
          setStrategy({
            id: matrixData.strategy_id,
            name: matrixData.name || "Marketing Strategy",
            matrix: matrixData,
            target_audience: matrixData.audiences || [],
            objectives: matrixData.objectives || [],
            key_messages: matrixData.key_messages || matrixData.keyMessages || []
          });
          return;
        }
      }
      
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

// Add getServerSideProps to force SSR and prevent build errors
// This is especially important for dynamic routes that need auth context
export async function getServerSideProps(context) {
  // You might want to fetch strategy data based on context.params.id here
  // But for now, just forcing SSR is enough
  return {
    props: { strategyId: context.params.id }, // Pass id if needed
  };
}
