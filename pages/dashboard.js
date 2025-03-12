import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import styles from '../styles/Dashboard.module.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [strategies, setStrategies] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedStrategies, setSavedStrategies] = useState([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);

  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchUserData();
      fetchSavedStrategies();
    }
  }, [user, loading, router]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('strategies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (strategiesError) throw strategiesError;
      
      // Fetch calendars
      const { data: calendarsData, error: calendarsError } = await supabase
        .from('calendars')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (calendarsError) throw calendarsError;
      
      setStrategies(strategiesData || []);
      setCalendars(calendarsData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedStrategies = async () => {
    try {
      setIsLoadingStrategies(true);
      
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSavedStrategies(data || []);
    } catch (error) {
      console.error('Error fetching saved strategies:', error);
    } finally {
      setIsLoadingStrategies(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Dashboard | Mark1</title>
        <meta name="description" content="Manage your marketing strategies and content calendars" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Welcome to your dashboard{user ? `, ${user.email.split('@')[0]}` : ''}</h1>
            <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading your marketing data...</p>
          </div>
        ) : (
          <div className={styles.dashboardContent}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Marketing Strategies</h2>
                <Link href="/strategy/new" className={styles.createButton}>
                  Create New Strategy
                </Link>
              </div>

              <div className={styles.cardsContainer}>
                {strategies.map(strategy => (
                  <div 
                    key={strategy.id} 
                    className={styles.strategyCard}
                    onClick={() => router.push(`/strategy/${strategy.id}`)}
                  >
                    <div className={styles.cardHeader}>
                      <h3>{strategy.name}</h3>
                      <span className={`${styles.statusBadge} ${styles[strategy.status]}`}>
                        {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
                      </span>
                    </div>
                    <p className={styles.lastUpdated}>Last updated: {strategy.lastUpdated}</p>
                    <div className={styles.cardActions}>
                      <Link href={`/strategy/${strategy.id}`} className={styles.actionButton}>
                        Edit Strategy
                      </Link>
                      <Link href={`/calendar/new?strategyId=${strategy.id}`} className={styles.actionButton}>
                        Create Calendar
                      </Link>
                    </div>
                  </div>
                ))}

                <div className={styles.emptyCard}>
                  <div className={styles.emptyCardIcon}>+</div>
                  <p>Create a new marketing strategy</p>
                  <Link href="/strategy/new" className={styles.emptyCardButton}>
                    Get Started
                  </Link>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Content Calendars</h2>
              </div>

              <div className={styles.cardsContainer}>
                {calendars.map(calendar => (
                  <div key={calendar.id} className={styles.calendarCard}>
                    <h3>{calendar.name}</h3>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressLabel}>
                        <span>Progress</span>
                        <span>{calendar.progress}%</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${calendar.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <p>{calendar.postsScheduled} posts scheduled</p>
                    <div className={styles.cardActions}>
                      <Link href={`/calendar/${calendar.id}`} className={styles.actionButton}>
                        Manage Calendar
                      </Link>
                    </div>
                  </div>
                ))}

                {strategies.length > 0 && (
                  <div className={styles.emptyCard}>
                    <div className={styles.emptyCardIcon}>📅</div>
                    <p>Create a new content calendar</p>
                    <Link href="/calendar/new" className={styles.emptyCardButton}>
                      Get Started
                    </Link>
                  </div>
                )}
              </div>

              {strategies.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📋</div>
                  <h3>No content calendars yet</h3>
                  <p>Create a marketing strategy first, then you can build content calendars.</p>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h2>Your Saved Strategies</h2>
              
              {isLoadingStrategies ? (
                <div className={styles.loading}>Loading your strategies...</div>
              ) : savedStrategies.length > 0 ? (
                <div className={styles.cardGrid}>
                  {savedStrategies.map((strategy) => (
                    <div key={strategy.id} className={styles.card}>
                      <h3>{strategy.name || 'Unnamed Strategy'}</h3>
                      <p>Created: {new Date(strategy.created_at || Date.now()).toLocaleDateString()}</p>
                      
                      <div className={styles.cardPreview}>
                        <div className={styles.previewItem}>
                          <strong>Target Audience:</strong> 
                          <span>
                            {Array.isArray(strategy.target_audience) && strategy.target_audience.length > 0
                              ? typeof strategy.target_audience[0] === 'string'
                                ? strategy.target_audience[0].substring(0, 40) + '...'
                                : 'Target audience defined'
                              : 'No target audience defined'}
                          </span>
                        </div>
                      </div>
                      
                      <div className={styles.cardActions}>
                        <Link 
                          href={`/strategy/view/${strategy.id}`} 
                          className={styles.viewButton}
                        >
                          View Strategy
                        </Link>
                        <Link 
                          href={`/content/new?strategy=${strategy.id}`}
                          className={styles.contentButton}
                        >
                          Create Content
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>You haven't created any strategies yet.</p>
                  <Link href="/strategy/new" className={styles.createButton}>
                    Create Your First Strategy
                  </Link>
                </div>
              )}
            </div>

            <div className={styles.quickTips}>
              <h3>Quick Tips</h3>
              <ul>
                <li>Start by creating a marketing strategy to define your goals</li>
                <li>Generate content ideas based on your strategy</li>
                <li>Schedule posts in your content calendar</li>
                <li>Track performance and adjust your strategy as needed</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 