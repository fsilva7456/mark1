import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Strategy.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ViewStrategy() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (id) {
      fetchStrategy(id);
    }
  }, [id, user, loading, router]);

  const fetchStrategy = async (strategyId) => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();

      if (error) throw error;
      
      // Create enhanced strategy structure from the raw data
      const enhancedStrategy = {
        ...data,
        enhancedStrategy: {
          audiences: data.target_audience.map((audience, index) => {
            // Create objectives for each audience (3 per audience)
            const audienceObjectives = [
              {
                objective: "Increase brand awareness and visibility",
                successMetrics: "5% increase in website traffic, 10% growth in social media followers",
                contentTypes: ["Social media posts", "Blog articles", "Infographics"]
              },
              {
                objective: "Establish authority in fitness industry",
                successMetrics: "20% increase in content engagement rate, 15% growth in newsletter subscribers",
                contentTypes: ["Expert guides", "Case studies", "Video tutorials"]
              },
              {
                objective: "Drive lead generation and conversions",
                successMetrics: "8% conversion rate from leads, 12% increase in consultation bookings",
                contentTypes: ["Testimonials", "Limited-time offers", "Webinars"]
              }
            ];
            
            // Assign key messages to audiences (1-2 per audience)
            const startIndex = index % data.key_messages.length;
            const audienceMessages = [
              data.key_messages[startIndex],
              data.key_messages[(startIndex + 1) % data.key_messages.length]
            ];
            
            // Define channels based on audience
            const channels = ["Instagram", "Facebook", "Email"];
            
            return {
              segment: audience,
              objectives: audienceObjectives,
              keyMessages: audienceMessages,
              channels: channels
            };
          }),
          implementationTimeline: {
            phase1_days1_30: [
              "Develop content calendar for the first 30 days",
              "Set up analytics tracking for all marketing channels",
              "Create initial social media content batch"
            ],
            phase2_days31_60: [
              "Launch email newsletter campaign",
              "Start weekly blog post series",
              "Begin testing paid social media ads"
            ],
            phase3_days61_90: [
              "Analyze performance data and optimize strategy",
              "Launch referral program",
              "Develop content partnerships with complementary brands"
            ]
          },
          competitiveGaps: {
            identifiedGaps: [
              "Personalized fitness experiences",
              "Nutrition guidance integration",
              "Community-building focus"
            ],
            exploitationStrategies: [
              "Develop custom fitness programs for niche audiences",
              "Create comprehensive nutrition guides",
              "Launch online community platform for clients"
            ]
          },
          contentStrategy: {
            tone: "Motivational, knowledgeable, and approachable",
            frequencyRecommendation: "3-4 times per week on Instagram, 2 times per week on Facebook, weekly emails",
            callToActionLibrary: [
              "Book your free consultation",
              "Join our 7-day challenge",
              "Download our fitness guide",
              "Sign up for our newsletter"
            ],
            abTestRecommendations: [
              "Test different headline formats for email campaigns",
              "Compare video vs. image posts on Instagram",
              "Test various call-to-action placements and wording"
            ]
          }
        }
      };
      
      setStrategy(enhancedStrategy);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching strategy:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Strategy Details | Mark1</title>
        <meta name="description" content="View your marketing strategy" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>{strategy?.name || 'Marketing Strategy'}</h1>
            <p>Your personalized marketing strategy matrix</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading your strategy...</p>
            </div>
          ) : (
            <div className={styles.matrixLayout}>
              <div className={styles.matrixContainer}>
                <h2>Your Marketing Strategy</h2>
                
                {/* Enhanced 3x3x3 Matrix Structure */}
                <div className={styles.enhancedMatrix}>
                  {strategy.enhancedStrategy.audiences.map((audience, audienceIndex) => (
                    <div key={audienceIndex} className={styles.audienceSection}>
                      <h3 className={styles.audienceTitle}>
                        {audience.segment}
                      </h3>
                      
                      <div className={styles.audienceContent}>
                        <div className={styles.objectivesColumn}>
                          <h4>Objectives</h4>
                          <ul>
                            {audience.objectives.map((obj, objIndex) => (
                              <li 
                                key={objIndex} 
                                className={styles.objectiveItem}
                              >
                                <div className={styles.objectiveHeader}>
                                  {obj.objective}
                                </div>
                                <div className={styles.objectiveMeta}>
                                  <span className={styles.metaLabel}>Success Metrics:</span> {obj.successMetrics}
                                </div>
                                <div className={styles.objectiveMeta}>
                                  <span className={styles.metaLabel}>Content Types:</span> {obj.contentTypes.join(', ')}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className={styles.messagesColumn}>
                          <h4>Key Messages</h4>
                          <ul>
                            {audience.keyMessages.map((message, msgIndex) => (
                              <li 
                                key={msgIndex} 
                                className={styles.messageItem}
                              >
                                {message}
                              </li>
                            ))}
                          </ul>
                          
                          <div className={styles.channelsInfo}>
                            <h4>Primary Channels</h4>
                            <div className={styles.channelsList}>
                              {audience.channels.map((channel, chIndex) => (
                                <span key={chIndex} className={styles.channelTag}>{channel}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className={styles.strategySection}>
                    <div className={styles.timelineSection}>
                      <h3>90-Day Implementation Plan</h3>
                      <div className={styles.timelinePhases}>
                        <div className={styles.timelinePhase}>
                          <h4>Days 1-30</h4>
                          <ul>
                            {strategy.enhancedStrategy.implementationTimeline.phase1_days1_30.map((task, index) => (
                              <li key={index}>{task}</li>
                            ))}
                          </ul>
                        </div>
                        <div className={styles.timelinePhase}>
                          <h4>Days 31-60</h4>
                          <ul>
                            {strategy.enhancedStrategy.implementationTimeline.phase2_days31_60.map((task, index) => (
                              <li key={index}>{task}</li>
                            ))}
                          </ul>
                        </div>
                        <div className={styles.timelinePhase}>
                          <h4>Days 61-90</h4>
                          <ul>
                            {strategy.enhancedStrategy.implementationTimeline.phase3_days61_90.map((task, index) => (
                              <li key={index}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.competitiveSection}>
                      <h3>Competitive Gap Analysis</h3>
                      <div className={styles.gapsGrid}>
                        <div className={styles.gapsColumn}>
                          <h4>Identified Gaps</h4>
                          <ul>
                            {strategy.enhancedStrategy.competitiveGaps.identifiedGaps.map((gap, index) => (
                              <li key={index}>{gap}</li>
                            ))}
                          </ul>
                        </div>
                        <div className={styles.gapsColumn}>
                          <h4>Exploitation Strategies</h4>
                          <ul>
                            {strategy.enhancedStrategy.competitiveGaps.exploitationStrategies.map((strategy, index) => (
                              <li key={index}>{strategy}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.contentStrategySection}>
                      <h3>Content Strategy Guidelines</h3>
                      <div className={styles.contentStrategyInfo}>
                        <div className={styles.strategyInfoRow}>
                          <span className={styles.strategyLabel}>Tone & Style:</span>
                          <span className={styles.strategyValue}>{strategy.enhancedStrategy.contentStrategy.tone}</span>
                        </div>
                        <div className={styles.strategyInfoRow}>
                          <span className={styles.strategyLabel}>Posting Frequency:</span>
                          <span className={styles.strategyValue}>{strategy.enhancedStrategy.contentStrategy.frequencyRecommendation}</span>
                        </div>
                        
                        <div className={styles.ctaLibrary}>
                          <h4>Call-to-Action Library</h4>
                          <div className={styles.ctaList}>
                            {strategy.enhancedStrategy.contentStrategy.callToActionLibrary.map((cta, index) => (
                              <div key={index} className={styles.ctaItem}>{cta}</div>
                            ))}
                          </div>
                        </div>
                        
                        <div className={styles.abTests}>
                          <h4>Recommended A/B Tests</h4>
                          <ul>
                            {strategy.enhancedStrategy.contentStrategy.abTestRecommendations.map((test, index) => (
                              <li key={index}>{test}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.matrixActions}>
                  <button 
                    onClick={() => router.push(`/content/new?strategy=${strategy.id}`)} 
                    className={styles.outlineButton}
                  >
                    Create Content Outline
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
    </div>
  );
} 