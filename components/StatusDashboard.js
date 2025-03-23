import React from 'react';
import Link from 'next/link';
import styles from '../styles/StatusDashboard.module.css';

export default function StatusDashboard({ strategies, outlines, calendars, posts = [] }) {
  // Calculate summary metrics
  const activeStrategies = strategies.length;
  const outlinesInProgress = outlines.length;
  const upcomingPosts = posts.filter(post => 
    post.status === 'scheduled' && 
    new Date(post.scheduled_date) > new Date()
  ).length;
  
  // Count posts by status
  const postsByStatus = {
    draft: posts.filter(post => post.status === 'draft').length,
    scheduled: posts.filter(post => post.status === 'scheduled').length,
    published: posts.filter(post => post.status === 'published').length
  };
  
  // Get next upcoming post
  const upcomingPostsList = posts
    .filter(post => post.status === 'scheduled' && new Date(post.scheduled_date) > new Date())
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  
  const nextPost = upcomingPostsList.length > 0 ? upcomingPostsList[0] : null;
  
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h2>Marketing Status</h2>
        <span className={styles.lastUpdated}>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
      
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📝</div>
          <div className={styles.metricContent}>
            <h3>{activeStrategies}</h3>
            <p>Active Strategies</p>
          </div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📋</div>
          <div className={styles.metricContent}>
            <h3>{outlinesInProgress}</h3>
            <p>Content Outlines</p>
          </div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📅</div>
          <div className={styles.metricContent}>
            <h3>{calendars.length}</h3>
            <p>Content Calendars</p>
          </div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>📱</div>
          <div className={styles.metricContent}>
            <h3>{upcomingPosts}</h3>
            <p>Upcoming Posts</p>
          </div>
        </div>
      </div>
      
      <div className={styles.postStatusSection}>
        <h3>Content Status</h3>
        <div className={styles.statusBars}>
          <div className={styles.statusItem}>
            <div className={styles.statusLabel}>Draft</div>
            <div className={styles.statusBarContainer}>
              <div 
                className={`${styles.statusBar} ${styles.draftBar}`} 
                style={{width: `${postsByStatus.draft > 0 ? (postsByStatus.draft / posts.length) * 100 : 0}%`}}
              ></div>
            </div>
            <div className={styles.statusCount}>{postsByStatus.draft}</div>
          </div>
          
          <div className={styles.statusItem}>
            <div className={styles.statusLabel}>Scheduled</div>
            <div className={styles.statusBarContainer}>
              <div 
                className={`${styles.statusBar} ${styles.scheduledBar}`} 
                style={{width: `${postsByStatus.scheduled > 0 ? (postsByStatus.scheduled / posts.length) * 100 : 0}%`}}
              ></div>
            </div>
            <div className={styles.statusCount}>{postsByStatus.scheduled}</div>
          </div>
          
          <div className={styles.statusItem}>
            <div className={styles.statusLabel}>Published</div>
            <div className={styles.statusBarContainer}>
              <div 
                className={`${styles.statusBar} ${styles.publishedBar}`} 
                style={{width: `${postsByStatus.published > 0 ? (postsByStatus.published / posts.length) * 100 : 0}%`}}
              ></div>
            </div>
            <div className={styles.statusCount}>{postsByStatus.published}</div>
          </div>
        </div>
      </div>
      
      {nextPost && (
        <div className={styles.upcomingPostSection}>
          <h3>Next Scheduled Post</h3>
          <div className={styles.postPreview}>
            <div className={styles.postMeta}>
              <span className={styles.postDate}>
                {new Date(nextPost.scheduled_date).toLocaleDateString()} at {new Date(nextPost.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
              <span className={`${styles.postPlatform} ${styles[nextPost.platform.toLowerCase()]}`}>
                {nextPost.platform}
              </span>
            </div>
            <h4 className={styles.postTitle}>{nextPost.title}</h4>
            <p className={styles.postExcerpt}>
              {nextPost.content.length > 100 
                ? nextPost.content.substring(0, 100) + '...' 
                : nextPost.content}
            </p>
          </div>
        </div>
      )}
      
      {/* Quick actions removed as requested */}
    </div>
  );
} 