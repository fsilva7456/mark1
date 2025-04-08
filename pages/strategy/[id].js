import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from '../../styles/Strategy.module.css';
import { toast } from 'react-hot-toast';

export default function ViewStrategy() {
  const router = useRouter();
  const { id, enhanced } = router.query;
  const { user, loading } = useAuth();
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceEnhancedView, setForceEnhancedView] = useState(false);
  const [aestheticModal, setAestheticModal] = useState({
    visible: false,
    value: ''
  });
  
  useEffect(() => {
    // Set force enhanced view based on query parameter
    if (enhanced === 'true') {
      setForceEnhancedView(true);
    }
  }, [enhanced]);
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    // Fetch strategy details when ID is available
    if (id && user) {
      console.log("Fetching strategy with ID:", id);
      fetchStrategyDetails(id);
    }
  }, [id, user, loading, router]);
  
  const fetchStrategyDetails = async (strategyId) => {
    try {
      setIsLoading(true);
      
      console.log("Fetching strategy with ID:", strategyId);
      
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        console.log("Retrieved strategy details:", {
          id: data.id,
          name: data.name,
          id_type: typeof data.id
        });
        
        // Ensure the ID is correctly set
        if (!data.id || typeof data.id !== 'string' || data.id.includes(' ')) {
          console.error("Warning: Strategy has an invalid ID format:", data.id);
        }
        
        // Check if we have enhanced_data, if not try to parse it from the original strategy data
        if (!data.enhanced_data) {
          try {
            console.log("No enhanced_data found, attempting to extract from other fields");
            
            // Try to extract from strategy_data
            if (data.strategy_data) {
              const strategyData = typeof data.strategy_data === 'string' 
                ? JSON.parse(data.strategy_data) 
                : data.strategy_data;
                
              // Option 1: enhancedStrategy directly in strategy_data
              if (strategyData.enhancedStrategy) {
                data.enhanced_data = strategyData.enhancedStrategy;
                console.log("Found enhanced strategy data in strategy_data.enhancedStrategy");
              } 
              // Option 2: matrix.enhancedStrategy in strategy_data
              else if (strategyData.matrix && strategyData.matrix.enhancedStrategy) {
                data.enhanced_data = strategyData.matrix.enhancedStrategy;
                console.log("Found enhanced strategy data in strategy_data.matrix.enhancedStrategy");
              }
              // Option 3: Try to reconstruct from simple matrix data if no enhanced data exists
              else if (data.target_audience && data.objectives && data.key_messages) {
                console.log("Reconstructing enhanced_data from simple matrix data");
                
                // Create a basic enhanced data structure from the simple fields
                data.enhanced_data = {
                  audiences: [
                    {
                      segment: "Target Audience",
                      objectives: data.objectives.map(obj => ({
                        objective: obj,
                        successMetrics: "Not specified in simple format",
                        contentTypes: ["Not specified in simple format"]
                      })),
                      keyMessages: data.key_messages,
                      channels: ["Not specified in simple format"]
                    }
                  ]
                };
              }
            }
            
            // If we still don't have enhanced_data, try to parse from the "matrix" field directly
            if (!data.enhanced_data && data.matrix) {
              const matrixData = typeof data.matrix === 'string'
                ? JSON.parse(data.matrix)
                : data.matrix;
                
              if (matrixData.enhancedStrategy) {
                data.enhanced_data = matrixData.enhancedStrategy;
                console.log("Found enhanced strategy data in matrix.enhancedStrategy");
              }
            }
            
            // Log if we found enhanced data
            if (data.enhanced_data) {
              console.log("Successfully extracted enhanced data structure");
            } else {
              console.log("Could not extract enhanced data structure, will use simple view");
            }
          } catch (parseError) {
            console.error("Error parsing strategy data:", parseError);
            console.log("Will fallback to simple view");
          }
        }
        
        // Add console logging of the data structure to help with debugging
        console.log("Strategy data structure:", {
          hasEnhancedData: !!data.enhanced_data,
          hasTargetAudience: !!data.target_audience,
          hasObjectives: !!data.objectives,
          hasKeyMessages: !!data.key_messages,
          hasStrategyData: !!data.strategy_data,
          strategyDataType: data.strategy_data ? typeof data.strategy_data : 'none'
        });
        
        setStrategy(data);
      } else {
        setError('Strategy not found.');
      }
    } catch (err) {
      console.error('Error fetching strategy:', err);
      setError('Failed to load strategy details.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateContent = async () => {
    try {
      // IMPORTANT: Use the ID from the URL, not from the strategy object
      const strategyIdFromUrl = id; // This is the UUID from the URL
      
      console.log("URL ID (should be UUID):", strategyIdFromUrl);
      console.log("Strategy object:", {
        id: strategy?.id, 
        name: strategy?.name
      });
      
      // Always use the URL parameter ID which is guaranteed to be the UUID
      router.push(`/content/new?strategy=${encodeURIComponent(strategyIdFromUrl)}`);
    } catch (error) {
      console.error("Error preparing content generation:", error);
      toast.error("Failed to prepare content generation. Please try again.");
    }
  };
  
  const handleAestheticChange = (e) => {
    setAestheticModal({
      ...aestheticModal,
      value: e.target.value
    });
  };

  const handleAestheticSubmit = () => {
    if (!aestheticModal.value.trim()) return;
    
    // Navigate with the aesthetic parameter
    router.push(`/content/new?strategy=${id}&aesthetic=${encodeURIComponent(aestheticModal.value)}`);
    
    // Close the modal
    setAestheticModal({
      visible: false,
      value: ''
    });
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>{strategy ? strategy.name : 'Strategy'} | Mark1</title>
        <meta name="description" content="View your marketing strategy" />
      </Head>
      
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>{strategy?.name || 'Marketing Strategy'}</h1>
            <p>Review your strategy and create content based on it.</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading your strategy...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Error</h3>
              <p>{error}</p>
              <button 
                onClick={() => router.push('/marketing-plan')} 
                className={styles.returnButton}
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className={styles.matrixLayout}>
              <div className={styles.matrixContainer}>
                <h2>Your Marketing Strategy</h2>
                {(strategy.enhanced_data || forceEnhancedView) ? (
                  // Enhanced matrix display when enhanced_data is available or forced
                  <div className={styles.enhancedMatrix}>
                    {!strategy.enhanced_data && forceEnhancedView ? (
                      // Fallback for when forceEnhancedView is true but no enhanced_data exists
                      <div className={styles.audienceSection}>
                        <div>
                          <h3 className={styles.audienceTitle}>
                            Target Audience
                          </h3>
                        </div>
                        
                        <div className={styles.audienceContent}>
                          <div className={styles.objectivesColumn}>
                            <h4>Objectives</h4>
                            <ul>
                              {strategy.objectives && strategy.objectives.map((obj, index) => (
                                <li key={index} className={styles.objectiveItem} style={{ listStyleType: 'none' }}>
                                  <div className={styles.objectiveHeader}>{obj}</div>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className={styles.messagesColumn}>
                            <h4>Key Messages</h4>
                            <ul>
                              {strategy.key_messages && strategy.key_messages.map((message, index) => (
                                <li key={index} className={styles.messageItem} style={{ listStyleType: 'none' }}>
                                  {message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Standard enhanced view when the data exists
                      <>
                        {strategy.enhanced_data && strategy.enhanced_data.audiences && strategy.enhanced_data.audiences.map((audience, audienceIndex) => (
                          <div key={audienceIndex} className={styles.audienceSection}>
                            <div>
                              <h3 className={styles.audienceTitle}>
                                {audience.segment || `Audience ${audienceIndex + 1}`}
                              </h3>
                            </div>
                            
                            <div className={styles.audienceContent}>
                              <div className={styles.objectivesColumn}>
                                <h4>Objectives</h4>
                                <ul>
                                  {audience.objectives && audience.objectives.map((obj, objIndex) => (
                                    <li 
                                      key={objIndex} 
                                      className={styles.objectiveItem}
                                      style={{ listStyleType: 'none' }}
                                    >
                                      <div className={styles.objectiveHeader}>
                                        {typeof obj === 'string' ? obj : obj.objective || 'No objective specified'}
                                      </div>
                                      {typeof obj !== 'string' && obj.successMetrics && (
                                        <div className={styles.objectiveMeta}>
                                          <span className={styles.metaLabel}>Success Metrics:</span> {obj.successMetrics}
                                        </div>
                                      )}
                                      {typeof obj !== 'string' && obj.contentTypes && (
                                        <div className={styles.objectiveMeta}>
                                          <span className={styles.metaLabel}>Content Types:</span> {Array.isArray(obj.contentTypes) ? obj.contentTypes.join(', ') : obj.contentTypes}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className={styles.messagesColumn}>
                                <h4>Key Messages</h4>
                                <ul>
                                  {audience.keyMessages && audience.keyMessages.map((message, msgIndex) => (
                                    <li 
                                      key={msgIndex} 
                                      className={styles.messageItem}
                                      style={{ listStyleType: 'none' }}
                                    >
                                      {message}
                                    </li>
                                  ))}
                                </ul>
                                
                                {audience.channels && (
                                  <div className={styles.channelsInfo}>
                                    <h4>Primary Channels</h4>
                                    <div className={styles.channelsList}>
                                      {audience.channels.map((channel, chIndex) => (
                                        <span key={chIndex} className={styles.channelTag}>{channel}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {strategy.enhanced_data && strategy.enhanced_data.implementationPlan && (
                          <div className={styles.strategySection}>
                            <div className={styles.timelineSection}>
                              <h3>90-Day Implementation Plan</h3>
                              <div className={styles.timelinePhases}>
                                {strategy.enhanced_data.implementationPlan.map((phase, phaseIndex) => (
                                  <div key={phaseIndex} className={styles.timelinePhase}>
                                    <h4>{phase.title || `Phase ${phaseIndex + 1}`}</h4>
                                    <ul>
                                      {phase.tasks && phase.tasks.map((task, taskIndex) => (
                                        <li key={taskIndex} style={{ listStyleType: 'none' }}>{task}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {strategy.enhanced_data && strategy.enhanced_data.competitiveAnalysis && (
                          <div className={styles.strategySection}>
                            <div className={styles.competitiveSection}>
                              <h3>Competitive Gap Analysis</h3>
                              <div className={styles.gapsGrid}>
                                {strategy.enhanced_data.competitiveAnalysis.gaps && (
                                  <div className={styles.gapsColumn}>
                                    <h4>Identified Gaps</h4>
                                    <ul>
                                      {strategy.enhanced_data.competitiveAnalysis.gaps.map((gap, gapIndex) => (
                                        <li key={gapIndex} style={{ listStyleType: 'none' }}>{gap}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {strategy.enhanced_data.competitiveAnalysis.exploitations && (
                                  <div className={styles.gapsColumn}>
                                    <h4>Exploitation Strategies</h4>
                                    <ul>
                                      {strategy.enhanced_data.competitiveAnalysis.exploitations.map((ex, exIndex) => (
                                        <li key={exIndex} style={{ listStyleType: 'none' }}>{ex}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {strategy.enhanced_data && strategy.enhanced_data.contentStrategy && (
                          <div className={styles.strategySection}>
                            <div className={styles.contentStrategySection}>
                              <h3>Content Strategy Guidelines</h3>
                              <div className={styles.contentStrategyInfo}>
                                {strategy.enhanced_data.contentStrategy.tone && (
                                  <div className={styles.strategyInfoRow}>
                                    <span className={styles.strategyLabel}>Tone & Style:</span>
                                    <span className={styles.strategyValue}>{strategy.enhanced_data.contentStrategy.tone}</span>
                                  </div>
                                )}
                                {strategy.enhanced_data.contentStrategy.frequency && (
                                  <div className={styles.strategyInfoRow}>
                                    <span className={styles.strategyLabel}>Posting Frequency:</span>
                                    <span className={styles.strategyValue}>{strategy.enhanced_data.contentStrategy.frequency}</span>
                                  </div>
                                )}
                                
                                {strategy.enhanced_data.contentStrategy.ctas && (
                                  <div className={styles.ctaLibrary}>
                                    <h4>Call-to-Action Library</h4>
                                    <div className={styles.ctaList}>
                                      {strategy.enhanced_data.contentStrategy.ctas.map((cta, ctaIndex) => (
                                        <div key={ctaIndex} className={styles.ctaItem}>{cta}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {strategy.enhanced_data.contentStrategy.abTests && (
                                  <div className={styles.abTests}>
                                    <h4>Recommended A/B Tests</h4>
                                    <ul>
                                      {strategy.enhanced_data.contentStrategy.abTests.map((test, testIndex) => (
                                        <li key={testIndex} style={{ listStyleType: 'none' }}>{test}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  // Fallback to simple matrix when no enhanced data is available
                  <div className={styles.matrix}>
                    <div className={styles.matrixSection}>
                      <h3>Target Audience</h3>
                      <ul>
                        {strategy.target_audience?.map((audience, index) => (
                          <li key={index}>{audience}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className={styles.matrixSection}>
                      <h3>Objectives</h3>
                      <ul>
                        {strategy.objectives?.map((objective, index) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className={styles.matrixSection}>
                      <h3>Key Messages</h3>
                      <ul>
                        {strategy.key_messages?.map((message, index) => (
                          <li key={index}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className={styles.matrixActions}>
                  {/* Debug output */}
                  {process.env.NODE_ENV !== 'production' && (
                    <div style={{marginBottom: '10px', fontSize: '12px', color: '#666'}}>
                      <p>Strategy ID: {strategy.id}</p>
                      <p>Strategy ID Type: {typeof strategy.id}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      // Show the aesthetic modal instead of directly navigating
                      setAestheticModal({
                        visible: true,
                        value: ''
                      });
                    }}
                    className={styles.outlineButton}
                    disabled={isLoading}
                  >
                    Generate Content Outline
                  </button>
                  
                  <button
                    onClick={() => router.push('/marketing-plan')}
                    className={styles.cancelButton}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {aestheticModal.visible && (
        <div className={styles.modalOverlay}>
          <div className={styles.feedbackModal}>
            <div className={styles.modalHeader}>
              <h3>Describe Your Content Style</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setAestheticModal({...aestheticModal, visible: false})}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.feedbackInputContainer}>
                <label htmlFor="aesthetic">What's the aesthetic or vibe you want for your content?</label>
                <textarea
                  id="aesthetic"
                  value={aestheticModal.value}
                  onChange={handleAestheticChange}
                  placeholder="For example: professional and educational, friendly and motivational, bold and high-energy, calm and supportive..."
                  className={styles.feedbackTextarea}
                />
                <button 
                  onClick={handleAestheticSubmit}
                  className={styles.saveButton}
                  disabled={!aestheticModal.value.trim()}
                >
                  Generate Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 