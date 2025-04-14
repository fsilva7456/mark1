import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import styles from '../styles/Calendar.module.css';

const MetricsSummary = ({ calendarId, metrics = null }) => {
  const [isLoading, setIsLoading] = useState(!metrics);
  const [localMetrics, setLocalMetrics] = useState(metrics || {
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0
    },
    engagementRate: 0,
    performanceScore: 0
  });
  
  // If no metrics are passed in props, we could fetch them here
  useEffect(() => {
    if (metrics) {
      setLocalMetrics(metrics);
      setIsLoading(false);
    }
  }, [metrics]);
  
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  };
  
  if (isLoading) {
    return (
      <div className={styles.metricsSummary}>
        <div className={styles.metricsHeader}>
          <h3 className={styles.metricsTitle}>
            <ChartBarIcon className={styles.metricsIcon} />
            Engagement Metrics
          </h3>
          <span className={styles.metricsPeriod}>Last 7 days</span>
        </div>
        <div className={styles.metricsLoadingState}>
          <div className={styles.spinner}></div>
          <p>Loading metrics...</p>
        </div>
      </div>
    );
  }
  
  const { engagement, engagementRate } = localMetrics;
  
  return (
    <div className={styles.metricsSummary}>
      <div className={styles.metricsHeader}>
        <h3 className={styles.metricsTitle}>
          <ChartBarIcon className={styles.metricsIcon} />
          Engagement Metrics
        </h3>
        <span className={styles.metricsPeriod}>Last 7 days</span>
      </div>
      
      <div className={styles.metricsGrid}>
        <div className={styles.metricBox}>
          <p className={styles.metricValue}>{formatNumber(engagement.likes)}</p>
          <p className={styles.metricLabel}>Likes</p>
        </div>
        <div className={styles.metricBox}>
          <p className={styles.metricValue}>{formatNumber(engagement.comments)}</p>
          <p className={styles.metricLabel}>Comments</p>
        </div>
        <div className={styles.metricBox}>
          <p className={styles.metricValue}>{formatNumber(engagement.shares)}</p>
          <p className={styles.metricLabel}>Shares</p>
        </div>
        <div className={styles.metricBox}>
          <p className={styles.metricValue}>{formatNumber(engagement.reach)}</p>
          <p className={styles.metricLabel}>Reach</p>
        </div>
      </div>
      
      <div className={styles.metricsSummaryFooter}>
        <div className={styles.engagementRate}>
          <span className={styles.engagementRateLabel}>Engagement Rate</span>
          <span className={styles.engagementRateValue}>{engagementRate.toFixed(2)}%</span>
        </div>
        
        <Link 
          href={`/engagement?calendarId=${calendarId}`}
          className={styles.enterMetricsButton}
        >
          Update Metrics
        </Link>
      </div>
    </div>
  );
};

export default MetricsSummary; 