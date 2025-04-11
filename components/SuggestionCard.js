import React from 'react';
import Link from 'next/link';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import styles from '../styles/Calendar.module.css';

const SuggestionCard = ({ suggestion, onAction }) => {
  // Default icon if none provided
  const getIcon = () => {
    if (!suggestion.icon) {
      return <LightBulbIcon className={styles.suggestionIcon} />;
    }
    return suggestion.icon;
  };

  // Render action button/link based on the suggestion
  const renderAction = () => {
    if (!suggestion.actionLabel) return null;
    
    // If there's an actionRoute, use Next.js Link
    if (suggestion.actionRoute) {
      return (
        <Link href={suggestion.actionRoute} className={styles.suggestionCardAction}>
          {suggestion.actionLabel}
        </Link>
      );
    }
    
    // Otherwise use a regular button with the callback
    return (
      <button 
        className={styles.suggestionCardAction}
        onClick={() => onAction && onAction(suggestion)}
      >
        {suggestion.actionLabel}
      </button>
    );
  };

  return (
    <div className={`${styles.suggestionCard} ${suggestion.priority ? styles[suggestion.priority] : ''}`}>
      <div className={styles.suggestionCardIcon}>
        {getIcon()}
      </div>
      <div className={styles.suggestionCardContent}>
        <h4 className={styles.suggestionCardTitle}>
          {suggestion.title || 'AI Suggestion'}
        </h4>
        <p className={styles.suggestionCardDescription}>
          {suggestion.description || 'No description provided'}
        </p>
        {renderAction()}
      </div>
    </div>
  );
};

export default SuggestionCard; 