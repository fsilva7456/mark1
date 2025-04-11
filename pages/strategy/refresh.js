import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import BreadcrumbNavigation from '../../components/BreadcrumbNavigation';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/Strategy.module.css';
import { toast } from 'react-hot-toast';

export default function StrategyRefreshPage() {
  const router = useRouter();
  const { strategyId } = router.query;
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [strategy, setStrategy] = useState(null);
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    // Fetch strategy when strategyId is available
    if (strategyId && user) {
      fetchStrategy();
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [strategyId, user, loading, router]);
  
  const fetchStrategy = async () => {
    setIsLoading(true);
    
    // For now, just set a sample strategy
    // This would be replaced with an actual API call
    setTimeout(() => {
      setStrategy({
        id: strategyId || 'sample-strategy',
        name: 'Summer Marketing Strategy',
        target_audience: 'Millennials and Gen-Z interested in sustainable fashion',
        goals: [
          'Increase brand awareness by 15%',
          'Grow Instagram following to 10,000',
          'Achieve 3% engagement rate across all platforms'
        ],
        content_pillars: [
          'Product showcases',
          'Sustainability initiatives',
          'Customer testimonials',
          'Behind the scenes'
        ],
        channels: ['Instagram', 'TikTok', 'Facebook'],
        created_at: '2023-05-15T00:00:00Z',
        last_updated: '2023-05-15T00:00:00Z'
      });
      
      setIsLoading(false);
    }, 1000);
  };
  
  const handleRefreshSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // This would be replaced with an actual API call
    setTimeout(() => {
      toast.success('Strategy refreshed successfully!');
      setIsLoading(false);
      router.push(`/strategy/${strategyId || 'sample-strategy'}`);
    }, 1500);
  };
  
  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Refresh Marketing Strategy | Mark1</title>
        <meta name="description" content="Update and refresh your marketing strategy" />
      </Head>
      
      <main className={styles.mainContent}>
        <BreadcrumbNavigation
          path={[
            { name: 'Dashboard', href: '/' },
            { name: 'Marketing Plan', href: '/marketing-plan' },
            { name: 'Strategy Refresh', href: `/strategy/refresh${strategyId ? `?strategyId=${strategyId}` : ''}` }
          ]}
        />
        
        <h1 className={styles.pageTitle}>Refresh Your Marketing Strategy</h1>
        
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading strategy data...</p>
          </div>
        ) : (
          <div className={styles.strategyRefreshContainer}>
            <div className={styles.strategyOverview}>
              <h2 className={styles.sectionTitle}>Current Strategy Overview</h2>
              
              {strategy ? (
                <div className={styles.strategyCard}>
                  <h3 className={styles.strategyName}>{strategy.name}</h3>
                  <p className={styles.lastUpdated}>
                    Last updated: {new Date(strategy.last_updated).toLocaleDateString()}
                  </p>
                  
                  <div className={styles.strategySection}>
                    <h4 className={styles.sectionSubtitle}>Target Audience</h4>
                    <p>{strategy.target_audience}</p>
                  </div>
                  
                  <div className={styles.strategySection}>
                    <h4 className={styles.sectionSubtitle}>Goals</h4>
                    <ul className={styles.strategyList}>
                      {strategy.goals.map((goal, index) => (
                        <li key={index}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className={styles.strategySection}>
                    <h4 className={styles.sectionSubtitle}>Content Pillars</h4>
                    <div className={styles.pillarsContainer}>
                      {strategy.content_pillars.map((pillar, index) => (
                        <span key={index} className={styles.pillarBadge}>{pillar}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.strategySection}>
                    <h4 className={styles.sectionSubtitle}>Channels</h4>
                    <div className={styles.channelsContainer}>
                      {strategy.channels.map((channel, index) => (
                        <span key={index} className={styles.channelBadge}>{channel}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>No strategy data available.</p>
                </div>
              )}
            </div>
            
            <div className={styles.refreshOptions}>
              <h2 className={styles.sectionTitle}>Refresh Options</h2>
              
              <div className={styles.refreshCard}>
                <div className={styles.refreshOption}>
                  <input 
                    type="radio" 
                    id="option-full" 
                    name="refresh-option" 
                    defaultChecked 
                  />
                  <label htmlFor="option-full">
                    <h4>Full Strategy Refresh</h4>
                    <p>Analyze your performance and create a completely updated strategy.</p>
                  </label>
                </div>
                
                <div className={styles.refreshOption}>
                  <input 
                    type="radio" 
                    id="option-partial" 
                    name="refresh-option" 
                  />
                  <label htmlFor="option-partial">
                    <h4>Update Content Pillars</h4>
                    <p>Keep your audience and goals, but refresh your content pillars.</p>
                  </label>
                </div>
                
                <div className={styles.refreshOption}>
                  <input 
                    type="radio" 
                    id="option-channels" 
                    name="refresh-option" 
                  />
                  <label htmlFor="option-channels">
                    <h4>Channel Strategy Update</h4>
                    <p>Optimize your platform mix based on performance data.</p>
                  </label>
                </div>
              </div>
              
              <div className={styles.formActions}>
                <button 
                  className={styles.primaryButton} 
                  onClick={handleRefreshSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Generate Strategy Refresh'}
                </button>
                <Link 
                  href={`/strategy/${strategyId || 'sample-strategy'}`} 
                  className={styles.secondaryButton}
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 