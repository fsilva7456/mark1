import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import SuggestionCard from './SuggestionCard';
import styles from '../styles/Calendar.module.css';

const SuggestionsPanel = ({ suggestions, onSuggestionAction }) => {
  // Default suggestions if none provided
  const defaultSuggestions = [
    {
      id: 1,
      title: 'Boost engagement with video',
      description: 'Our analysis shows videos get 2x more engagement. Try adding a Reel next week.',
      actionLabel: 'Add Video Post',
      priority: 'high',
    },
    {
      id: 2,
      title: 'Content gap detected',
      description: 'You have no content scheduled for next Tuesday. Consider adding a post.',
      actionLabel: 'Schedule Post',
      priority: 'medium',
    },
    {
      id: 3,
      title: 'Trending hashtag opportunity',
      description: '#SummerVibes is trending in your industry. Consider incorporating it.',
      actionLabel: 'View Details',
      priority: 'low',
    },
  ];

  const displaySuggestions = suggestions || defaultSuggestions;

  const handleAction = (suggestion) => {
    if (onSuggestionAction) {
      onSuggestionAction(suggestion);
    } else {
      console.log('Action clicked for suggestion:', suggestion);
    }
  };

  return (
    <div className={styles.suggestionsPanel}>
      <div className={styles.suggestionsPanelHeader}>
        <h3 className={styles.suggestionsPanelTitle}>
          <SparklesIcon className={styles.suggestionsPanelIcon} />
          AI Content Suggestions
        </h3>
      </div>

      <div className={styles.suggestionsPanelContent}>
        {displaySuggestions.length > 0 ? (
          displaySuggestions.map((suggestion) => (
            <SuggestionCard 
              key={suggestion.id} 
              suggestion={suggestion} 
              onAction={handleAction}
            />
          ))
        ) : (
          <div className={styles.noSuggestions}>
            <p>No suggestions available at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionsPanel; 