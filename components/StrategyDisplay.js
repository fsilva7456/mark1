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
      console.log('Strategy data structure:', {
        id: strategy.id,
        name: strategy.name,
        audiences: strategy.target_audience || strategy.audiences,
        objectives: strategy.objectives,
        keyMessages: strategy.key_messages || strategy.keyMessages
      });
    }
  }, [strategy]);

  const handleAestheticSubmit = (value) => {
    router.push(`/content/new?strategy=${strategy.id}&aesthetic=${encodeURIComponent(value)}`);
  };

  const handleClose = () => {
    setShowAestheticModal(false);
  };

  return (
    <div className={styles.matrixLayout}>
      <div className={styles.matrixContainer}>
        <h2>{isNew ? 'New Strategy Preview' : 'Strategy Details'}</h2>
        
        <div className={styles.matrixDisplay}>
          {strategy && (
            <>
              <div className={styles.matrixSection}>
                <h3>Target Audiences</h3>
                <ul>
                  {(strategy.target_audience || strategy.audiences || []).map((audience, i) => (
                    <li key={i}>{audience}</li>
                  ))}
                </ul>
              </div>
              
              <div className={styles.matrixSection}>
                <h3>Key Objectives</h3>
                <ul>
                  {(strategy.objectives || []).map((objective, i) => (
                    <li key={i}>{objective}</li>
                  ))}
                </ul>
              </div>
              
              <div className={styles.matrixSection}>
                <h3>Key Messages</h3>
                <ul>
                  {(strategy.key_messages || strategy.keyMessages || []).map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                </ul>
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
