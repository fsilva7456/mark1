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
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (id) {
      fetchStrategy(id);
    }
  }, [id, user, loading, router]);

  const fetchStrategy = async (strategyId) => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();

      if (error) throw error;
      setStrategy(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching strategy:', error);
      setIsLoading(false);
    }
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
            <p>Your personalized marketing strategy matrix</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading your strategy...</p>
            </div>
          ) : (
            <div className={styles.matrixLayout}>
              <div className={styles.matrixContainer}>
                <h2>Your Marketing Strategy</h2>
                
                {/* Target Audience Sections */}
                <div className={styles.audienceContainer}>
                  {strategy.target_audience.map((audience, index) => (
                    <div key={index} className={styles.audienceSection}>
                      <div className={styles.audienceHeader}>
                        <h3>Target Audience: {audience}</h3>
                      </div>
                      <div className={styles.audienceContent}>
                        {/* Campaign Objectives */}
                        <div className={styles.campaignObjectives}>
                          <h4>Campaign Objectives</h4>
                          <div className={styles.objectivesGrid}>
                            <div className={styles.objectiveItem}>
                              <div className={styles.objectiveType}>Awareness</div>
                              <p>Increase brand visibility and recognition among {audience}</p>
                            </div>
                            <div className={styles.objectiveItem}>
                              <div className={styles.objectiveType}>Consideration</div>
                              <p>Drive engagement and information-seeking behavior</p>
                            </div>
                            <div className={styles.objectiveItem}>
                              <div className={styles.objectiveType}>Conversion</div>
                              <p>Convert prospects into paying customers</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Key Messages for this audience */}
                        <div className={styles.keyMessages}>
                          <h4>Key Messages</h4>
                          <div className={styles.messagesList}>
                            {strategy.key_messages.slice(index, index + 1).map((message, i) => (
                              <div key={i} className={styles.messageItem}>
                                {message}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Channels and Metrics */}
                      <div className={styles.channelsMetricsSection}>
                        <div className={styles.channelsSection}>
                          <h4>Recommended Channels</h4>
                          <div className={styles.channelsList}>
                            {["Instagram", "Facebook", "Email"].map((channel, i) => (
                              <span key={i} className={styles.channelTag}>{channel}</span>
                            ))}
                          </div>
                        </div>
                        <div className={styles.metricsSection}>
                          <h4>Success Metrics</h4>
                          <div className={styles.metricsList}>
                            <div className={styles.metricItem}>
                              <span className={styles.metricName}>Engagement Rate</span>
                              <span className={styles.metricValue}>{">"} 3%</span>
                            </div>
                            <div className={styles.metricItem}>
                              <span className={styles.metricName}>Click-through Rate</span>
                              <span className={styles.metricValue}>{">"} 2%</span>
                            </div>
                            <div className={styles.metricItem}>
                              <span className={styles.metricName}>Conversion Rate</span>
                              <span className={styles.metricValue}>{">"} 1%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Overall Strategy Objectives */}
                <div className={styles.overallObjectives}>
                  <h3>Overall Marketing Objectives</h3>
                  <div className={styles.objectivesList}>
                    {strategy.objectives.map((objective, index) => (
                      <div key={index} className={styles.overallObjectiveItem}>
                        {objective}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className={styles.matrixActions}>
                  <button 
                    onClick={() => router.push(`/content/new?strategy=${strategy.id}`)} 
                    className={styles.outlineButton}
                  >
                    Create Content Outline
                  </button>
                  <button 
                    onClick={() => router.push('/marketing-plan')} 
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