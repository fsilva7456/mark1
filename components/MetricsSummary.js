import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import styles from '../styles/Calendar.module.css';
import { supabase } from '../lib/supabase';
import { subDays, parseISO } from 'date-fns';

const MetricsSummary = ({ calendarId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (calendarId) {
      fetchEngagementMetrics();
    }
  }, [calendarId]);

  const fetchEngagementMetrics = async () => {
    setIsLoading(true);
    
    try {
      // Calculate date for 7 days ago
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      // Fetch published posts with engagement data from the last 7 days
      const { data: postsData, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('status', 'published')
        .gte('scheduled_date', sevenDaysAgo)
        .order('scheduled_date', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Calculate totals from posts with engagement data
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalReach = 0;
      let postsWithData = 0;
      
      postsData.forEach(post => {
        if (post.engagement) {
          totalLikes += post.engagement.likes || 0;
          totalComments += post.engagement.comments || 0;
          totalShares += post.engagement.shares || 0;
          totalReach += post.engagement.reach || 0;
          if (post.engagement.likes || post.engagement.comments || post.engagement.shares) {
            postsWithData++;
          }
        }
      });
      
      // Calculate engagement rate
      const totalEngagements = totalLikes + totalComments + totalShares;
      const engagementRate = totalReach > 0 
        ? ((totalEngagements / totalReach) * 100).toFixed(1) 
        : 0;
      
      // Set metrics state
      setMetrics({
        period: '7 days',
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        totalReach: totalReach,
        engagementRate: engagementRate,
        hasData: postsWithData > 0
      });
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  };

  // If still loading or no metrics available
  if (isLoading) {
    return (
      <div className={styles.metricsSummary}>
        <div className={styles.metricsHeader}>
          <h3 className={styles.metricsTitle}>
            <ChartBarIcon className={styles.metricsIcon} />
            Engagement Summary
          </h3>
          <span className={styles.metricsPeriod}>Loading...</span>
        </div>
        <div className={`${styles.metricsLoadingState} ${styles.metricsGrid}`}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  // No data state
  if (!metrics || !metrics.hasData) {
    return (
      <div className={styles.metricsSummary}>
        <div className={styles.metricsHeader}>
          <h3 className={styles.metricsTitle}>
            <ChartBarIcon className={styles.metricsIcon} />
            Engagement Summary
          </h3>
          <span className={styles.metricsPeriod}>Last 7 days</span>
        </div>
        <div className={styles.metricsEmptyState}>
          <p>No engagement data yet.</p>
          <Link 
            href={`/engagement?calendarId=${calendarId}`} 
            className={styles.enterMetricsButton}
          >
            Enter Metrics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.metricsSummary}>
      <div className={styles.metricsHeader}>
        <h3 className={styles.metricsTitle}>
          <ChartBarIcon className={styles.metricsIcon} />
          Engagement Summary
        </h3>
        <span className={styles.metricsPeriod}>
          Last {metrics.period}
        </span>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricBox}>
          <div className={styles.metricValue}>{metrics.likes}</div>
          <div className={styles.metricLabel}>Likes</div>
        </div>
        <div className={styles.metricBox}>
          <div className={styles.metricValue}>{metrics.comments}</div>
          <div className={styles.metricLabel}>Comments</div>
        </div>
        <div className={styles.metricBox}>
          <div className={styles.metricValue}>{metrics.shares}</div>
          <div className={styles.metricLabel}>Shares</div>
        </div>
      </div>

      <div className={styles.metricsSummaryFooter}>
        <div className={styles.totalReach}>
          <span className={styles.totalReachLabel}>Total Reach:</span>
          <span className={styles.totalReachValue}>{metrics.totalReach}</span>
        </div>
        <div className={styles.engagementRate}>
          <span className={styles.engagementRateLabel}>Engagement Rate:</span>
          <span className={styles.engagementRateValue}>{metrics.engagementRate}%</span>
        </div>
      </div>

      <Link 
        href={`/engagement?calendarId=${calendarId}`} 
        className={styles.enterMetricsButton}
      >
        Enter Metrics
      </Link>
    </div>
  );
};

export default MetricsSummary; 