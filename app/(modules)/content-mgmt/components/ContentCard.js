import React from 'react';
import Link from 'next/link';
import { PencilIcon } from '@heroicons/react/24/outline';
import styles from '../styles/Calendar.module.css';

const ContentCard = ({ post, calendarId }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Determine the status color and label
  const getStatusBadge = () => {
    switch (post.status) {
      case 'published':
        return <span className={`${styles.statusBadge} ${styles.published}`}>Published</span>;
      case 'scheduled':
        return <span className={`${styles.statusBadge} ${styles.scheduled}`}>Scheduled</span>;
      case 'draft':
        return <span className={`${styles.statusBadge} ${styles.draft}`}>Draft</span>;
      default:
        return <span className={`${styles.statusBadge} ${styles.draft}`}>Draft</span>;
    }
  };

  return (
    <div className={styles.contentCard}>
      <div className={styles.contentCardHeader}>
        <div className={styles.contentCardDate}>
          {formatDate(post.scheduled_date)}
        </div>
        {getStatusBadge()}
      </div>
      
      <h3 className={styles.contentCardTitle}>
        {post.title || 'Untitled Post'}
      </h3>
      
      <div className={styles.contentCardPlatform}>
        <span className={styles.platformBadge}>
          {post.channel || 'Instagram'}
        </span>
        <span className={styles.contentType}>
          {post.post_type || 'Post'}
        </span>
      </div>
      
      <p className={styles.contentCardPreview}>
        {post.content 
          ? (post.content.length > 60 
              ? post.content.substring(0, 60) + '...' 
              : post.content)
          : 'No content yet'}
      </p>
      
      <div className={styles.contentCardActions}>
        <Link 
          href={`/post-editor/${post.id}?calendarId=${calendarId}`} 
          className={styles.editButton}
        >
          <PencilIcon className={styles.buttonIcon} />
          Edit
        </Link>
      </div>
    </div>
  );
};

export default ContentCard; 