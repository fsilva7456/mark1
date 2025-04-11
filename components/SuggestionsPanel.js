import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import SuggestionCard from './SuggestionCard';
import styles from '../styles/Calendar.module.css';
import { generateSuggestions } from '../utils/generateSuggestions';

const SuggestionsPanel = ({ calendarId }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (calendarId) {
      fetchSuggestions();
    }
  }, [calendarId]);

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const suggestionsData = await generateSuggestions(calendarId);
      setSuggestions(suggestionsData);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to generate suggestions. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSuggestions();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.suggestionsPanel}>
        <div className={styles.suggestionsPanelHeader}>
          <h3 className={styles.suggestionsPanelTitle}>
            <SparklesIcon className={styles.suggestionsPanelIcon} />
            AI Content Suggestions
          </h3>
        </div>
        <div className={`${styles.suggestionsPanelContent} ${styles.suggestionLoading}`}>
          <div className={styles.spinner}></div>
          <p>Generating smart suggestions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.suggestionsPanel}>
        <div className={styles.suggestionsPanelHeader}>
          <h3 className={styles.suggestionsPanelTitle}>
            <SparklesIcon className={styles.suggestionsPanelIcon} />
            AI Content Suggestions
          </h3>
        </div>
        <div className={`${styles.suggestionsPanelContent} ${styles.suggestionError}`}>
          <p>{error}</p>
          <button 
            onClick={handleRefresh}
            className={styles.suggestionRefreshButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.suggestionsPanel}>
      <div className={styles.suggestionsPanelHeader}>
        <h3 className={styles.suggestionsPanelTitle}>
          <SparklesIcon className={styles.suggestionsPanelIcon} />
          AI Content Suggestions
          <button 
            onClick={handleRefresh} 
            className={styles.suggestionRefreshIcon}
            aria-label="Refresh suggestions"
          >
            ↻
          </button>
        </h3>
      </div>

      <div className={styles.suggestionsPanelContent}>
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <SuggestionCard 
              key={suggestion.id} 
              suggestion={suggestion}
            />
          ))
        ) : (
          <div className={styles.noSuggestions}>
            <p>No new suggestions right now. Try updating your metrics or strategy.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionsPanel; 