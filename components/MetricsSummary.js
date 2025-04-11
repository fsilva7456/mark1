import React from 'react';
import Link from 'next/link';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import styles from '../styles/Calendar.module.css';

const MetricsSummary = ({ metrics, calendarId }) => {
  // Default metrics if none provided
  const defaultMetrics = {
    period: '7 days',
    likes: 328,
    comments: 74,
    shares: 23,
    totalReach: 3482,
    engagementRate: 4.6,
  };

  const displayMetrics = metrics || defaultMetrics;

  return (
    <div className={styles.metricsSummary}>
      <div className={styles.metricsHeader}>
        <h3 className={styles.metricsTitle}>
          <ChartBarIcon className={styles.metricsIcon} />
          Engagement Summary
        </h3>
        <span className={styles.metricsPeriod}>
          Last {displayMetrics.period}
        </span>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricBox}>
          <div className={styles.metricValue}>{displayMetrics.likes}</div>
          <div className={styles.metricLabel}>Likes</div>
        </div>
        <div className={styles.metricBox}>
          <div className={styles.metricValue}>{displayMetrics.comments}</div>
          <div className={styles.metricLabel}>Comments</div>
        </div>
        <div className={styles.metricBox}>
          <div className={styles.metricValue}>{displayMetrics.shares}</div>
          <div className={styles.metricLabel}>Shares</div>
        </div>
      </div>

      <div className={styles.metricsSummaryFooter}>
        <div className={styles.totalReach}>
          <span className={styles.totalReachLabel}>Total Reach:</span>
          <span className={styles.totalReachValue}>{displayMetrics.totalReach}</span>
        </div>
        <div className={styles.engagementRate}>
          <span className={styles.engagementRateLabel}>Engagement Rate:</span>
          <span className={styles.engagementRateValue}>{displayMetrics.engagementRate}%</span>
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