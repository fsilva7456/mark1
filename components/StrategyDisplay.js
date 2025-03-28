import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Strategy.module.css';

export default function StrategyDisplay({ 
  strategy,
  onSave,
  isNew = false,
  showEditButton = false,
  onEdit
}) {
  const router = useRouter();
  const [showAestheticModal, setShowAestheticModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aestheticValue, setAestheticValue] = useState('');

  useEffect(() => {
    if (strategy) {
      console.log('Strategy data structure:', strategy);
    }
  }, [strategy]);

  const handleAestheticSubmit = (value) => {
    router.push(`/content/new?strategy=${strategy.id}&aesthetic=${encodeURIComponent(value)}`);
  };

  const handleClose = () => {
    setShowAestheticModal(false);
  };

  // Helper function to extract target audiences from any strategy format
  const getAudiences = () => {
    if (!strategy) return [];
    
    // Check all possible field names
    if (Array.isArray(strategy.target_audience)) return strategy.target_audience;
    if (Array.isArray(strategy.audiences)) return strategy.audiences;
    if (Array.isArray(strategy.audience)) return strategy.audience;
    
    // Handle matrix format
    if (strategy.matrix && Array.isArray(strategy.matrix.audiences)) {
      return strategy.matrix.audiences;
    }
    
    // Handle data structure from new.js
    if (typeof strategy.target_audience === 'string') {
      return strategy.target_audience.split(',').map(item => item.trim());
    }
    
    // Return empty array as fallback
    return [];
  };

  // Similar helpers for objectives and messages
  const getObjectives = () => {
    if (!strategy) return [];
    
    if (Array.isArray(strategy.objectives)) return strategy.objectives;
    if (Array.isArray(strategy.objective)) return strategy.objective;
    
    if (strategy.matrix && Array.isArray(strategy.matrix.objectives)) {
      return strategy.matrix.objectives;
    }
    
    if (typeof strategy.objectives === 'string') {
      return strategy.objectives.split(',').map(item => item.trim());
    }
    
    return [];
  };

  const getKeyMessages = () => {
    if (!strategy) return [];
    
    if (Array.isArray(strategy.key_messages)) return strategy.key_messages;
    if (Array.isArray(strategy.keyMessages)) return strategy.keyMessages;
    if (Array.isArray(strategy.messages)) return strategy.messages;
    
    if (strategy.matrix && Array.isArray(strategy.matrix.keyMessages)) {
      return strategy.matrix.keyMessages;
    }
    
    if (typeof strategy.key_messages === 'string') {
      return strategy.key_messages.split(',').map(item => item.trim());
    }
    
    return [];
  };

  return (
    <div className={styles.matrixLayout}>
      <div className={styles.matrixContainer}>
        <h2>{isNew ? 'New Strategy Preview' : (strategy?.name || 'Strategy Details')}</h2>
        
        <div className={styles.matrixDisplay}>
          {strategy && (
            <>
              <div className={styles.matrixSection}>
                <h3>Target Audiences</h3>
                {getAudiences().length > 0 ? (
                  <ul>
                    {getAudiences().map((audience, i) => (
                      <li key={i}>{audience}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyState}>No target audiences defined</p>
                )}
              </div>
              
              <div className={styles.matrixSection}>
                <h3>Key Objectives</h3>
                {getObjectives().length > 0 ? (
                  <ul>
                    {getObjectives().map((objective, i) => (
                      <li key={i}>{objective}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyState}>No objectives defined</p>
                )}
              </div>
              
              <div className={styles.matrixSection}>
                <h3>Key Messages</h3>
                {getKeyMessages().length > 0 ? (
                  <ul>
                    {getKeyMessages().map((message, i) => (
                      <li key={i}>{message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyState}>No key messages defined</p>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className={styles.matrixActions}>
          {isNew ? (
            <button 
              onClick={async () => {
                setIsProcessing(true);
                await onSave();
                setIsProcessing(false);
              }}
              className={styles.saveButton}
              disabled={isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Confirm & Save Strategy'}
            </button>
          ) : (
            showEditButton && (
              <button 
                onClick={onEdit}
                className={styles.outlineButton}
              >
                Create New Variation
              </button>
            )
          )}
          
          <button 
            onClick={() => setShowAestheticModal(true)}
            className={styles.primaryButton}
          >
            Generate Content Outline
          </button>
        </div>

        {showAestheticModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.feedbackModal}>
              <div className={styles.modalHeader}>
                <h3>Describe Your Content Style</h3>
                <button 
                  className={styles.closeButton}
                  onClick={handleClose}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.feedbackInputContainer}>
                  <label htmlFor="aesthetic">What's the aesthetic or vibe you want for your content?</label>
                  <textarea
                    id="aesthetic"
                    value={aestheticValue}
                    onChange={(e) => setAestheticValue(e.target.value)}
                    placeholder="For example: professional and educational, friendly and motivational, bold and high-energy, calm and supportive..."
                    className={styles.feedbackTextarea}
                  />
                  <button 
                    onClick={() => handleAestheticSubmit(aestheticValue)}
                    className={styles.saveButton}
                    disabled={!aestheticValue.trim()}
                  >
                    Generate Content
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
