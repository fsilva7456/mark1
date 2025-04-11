import React from 'react';
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
        {suggestion.actionLabel && (
          <button 
            className={styles.suggestionCardAction}
            onClick={() => onAction && onAction(suggestion)}
          >
            {suggestion.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default SuggestionCard; 