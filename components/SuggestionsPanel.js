import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LightBulbIcon, 
  ArrowPathIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  PencilIcon 
} from '@heroicons/react/24/outline';
import styles from '../styles/Calendar.module.css';

const SuggestionsPanel = ({ calendarId, suggestions = null, onSuggestionAction }) => {
  const [isLoading, setIsLoading] = useState(!suggestions);
  const [localSuggestions, setLocalSuggestions] = useState(suggestions || []);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (suggestions) {
      setLocalSuggestions(suggestions);
      setIsLoading(false);
    }
  }, [suggestions]);

  // Function to get the appropriate icon based on type
  const getIconForType = (iconType) => {
    switch (iconType) {
      case 'video':
        return <PencilIcon className={styles.suggestionIcon} />;
      case 'calendar':
        return <CalendarIcon className={styles.suggestionIcon} />;
      case 'chart':
        return <ChartBarIcon className={styles.suggestionIcon} />;
      case 'document':
        return <DocumentTextIcon className={styles.suggestionIcon} />;
      case 'refresh':
        return <ArrowPathIcon className={styles.suggestionIcon} />;
      default:
        return <LightBulbIcon className={styles.suggestionIcon} />;
    }
  };

  // Handle suggestion action clicks
  const handleAction = (suggestion) => {
    if (onSuggestionAction) {
      onSuggestionAction(suggestion);
    }
  };

  return (
    <div className={styles.suggestionsPanel}>
      <div className={styles.suggestionsPanelHeader}>
        <h3 className={styles.suggestionsPanelTitle}>
          AI Suggestions
        </h3>
      </div>
      
      <div className={styles.suggestionsPanelContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Analyzing your content...</p>
          </div>
        ) : error ? (
          <div className={styles.suggestionsError}>
            <p>{error}</p>
          </div>
        ) : localSuggestions.length === 0 ? (
          <div className={styles.noSuggestions}>
            <LightBulbIcon className={styles.noSuggestionsIcon} />
            <p>No suggestions available at this time.</p>
            <p className={styles.noSuggestionsSubtext}>
              Update your metrics or strategy to get more insights.
            </p>
          </div>
        ) : (
          <div className={styles.suggestionsList}>
            {localSuggestions.map(suggestion => (
              <div 
                key={suggestion.id} 
                className={`${styles.suggestionItem} ${suggestion.priority ? styles[`priority${suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)}`] : ''}`}
              >
                <div className={styles.suggestionIcon}>
                  {getIconForType(suggestion.iconType)}
                </div>
                <div className={styles.suggestionContent}>
                  <h4 className={styles.suggestionTitle}>
                    {suggestion.title}
                  </h4>
                  <p className={styles.suggestionDescription}>
                    {suggestion.description}
                  </p>
                  {suggestion.actionLabel && (
                    suggestion.actionRoute ? (
                      <Link 
                        href={suggestion.actionRoute} 
                        className={styles.suggestionAction}
                      >
                        {suggestion.actionLabel}
                      </Link>
                    ) : (
                      <button 
                        className={styles.suggestionAction}
                        onClick={() => handleAction(suggestion)}
                      >
                        {suggestion.actionLabel}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionsPanel; 