import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import StatusDashboard from '../components/StatusDashboard';
import WorkflowDiagram from '../components/WorkflowDiagram';
import ContextualActionButtons from '../components/ContextualActionButtons';
import ContentPipeline from '../components/ContentPipeline';
import BreadcrumbNavigation from '../components/BreadcrumbNavigation';
import styles from '../styles/MarketingPlan.module.css';
import contextualStyles from '../styles/ContextualActionButtons.module.css';
import { useAuth } from '../contexts/AuthContext';
import { useMarketingPlan, MarketingPlanContext } from '../contexts/MarketingPlanContext';
import logger from '../lib/logger';
import { toast } from 'react-hot-toast';
import { useContext } from 'react';
import { useProject } from '../contexts/ProjectContext';

const log = logger.createLogger('MarketingPlanPage');

export default function MarketingPlanDashboard() {
  // Check if we're rendering outside of MarketingPlanProvider context (e.g., during static generation)
  const marketingPlanContext = useContext(MarketingPlanContext);
  if (!marketingPlanContext) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Marketing Plan Dashboard | Mark1</title>
          <meta name="description" content="Unified dashboard for managing your marketing plan workflow" />
        </Head>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading marketing plan dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    strategies, 
    contentOutlines, 
    calendars, 
    isLoading, 
    error,
    refreshData,
    getOutlinesForStrategy,
    getCalendarsForStrategy,
    deleteMarketingEntity,
    logAction
  } = useMarketingPlan();
  
  const { setShowProjectSelector, projects } = useProject();
  
  const [viewMode, setViewMode] = useState('workflow'); // 'workflow' or 'list'
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ type: '', id: '', name: '' });
  
  // Add state for aesthetic modal
  const [aestheticModal, setAestheticModal] = useState({
    visible: false,
    value: '',
    strategyId: null
  });
  
  // Create ref at the component level, not inside a hook
  const isInitialMount = useRef(true);

  // Initialize project selector on first page load
  useEffect(() => {
    console.log('Marketing plan page mounted, user:', user?.id);
    
    if (user && isInitialMount.current) {
      console.log('Setting showProjectSelector to true on initial mount');
      setShowProjectSelector(true);
      isInitialMount.current = false;
    }
  }, [user]);

  // Early return for unauthenticated users - this will run immediately on render
  if (!authLoading && !user) {
    // Instead of redirecting, show loading until auth state is resolved
    return (
      <div className={styles.container}>
        <Head>
          <title>Marketing Plan Dashboard | Mark1</title>
          <meta name="description" content="Unified dashboard for managing your marketing plan workflow" />
        </Head>
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Check for user login (still keep this for effect-based redirect)
  useEffect(() => {
    // No redirect needed - we'll handle auth in the project context
  }, [user, authLoading, router]);
  
  // Log page view
  useEffect(() => {
    if (user) {
      log.info('Marketing plan dashboard viewed', { userId: user.id });
      logAction('view_marketing_dashboard', { timestamp: new Date().toISOString() });
    }
  }, [user]);

  // Handle entity selection
  const handleEntitySelect = (type, id) => {
    log.debug('Entity selected', { type, id });
    setSelectedEntity({ type, id });
  };

  // Handle entity deletion
  const handleDeleteClick = (type, id, name) => {
    log.debug('Delete clicked for entity', { type, id, name });
    setModalData({ type, id, name });
    setShowModal(true);
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    try {
      const { type, id } = modalData;
      log.info('Confirming deletion', { type, id });
      
      const success = await deleteMarketingEntity(id, type);
      
      if (success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
        setSelectedEntity(null);
      } else {
        toast.error(`Failed to delete ${type}`);
      }
    } catch (error) {
      log.error('Error deleting entity', error);
      toast.error('An error occurred while deleting');
    } finally {
      setShowModal(false);
    }
  };

  // Navigate to entity detail page
  const navigateToEntity = (type, id) => {
    if (type === 'strategy') {
      router.push(`/strategy/${id}`);
    } else if (type === 'outline') {
      router.push(`/content/new?strategy=${id}`);
    } else if (type === 'calendar') {
      router.push(`/calendar/${id}`);
    }
  };

  // Get details of an entity for display
  const getEntityDetails = (type, id) => {
    switch (type) {
      case 'strategy':
        return strategies.find(s => s.id === id);
      case 'outline':
        return contentOutlines.find(o => o.id === id);
      case 'calendar':
        return calendars.find(c => c.id === id);
      default:
        return null;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Determine the current workflow step for guided experience
  const determineWorkflowStep = () => {
    if (strategies.length === 0) {
      return {
        step: 1,
        message: 'Create a marketing strategy to get started',
        action: '/strategy/new',
        actionText: 'Create Strategy'
      };
    } else if (contentOutlines.length === 0) {
      const strategyId = strategies[0].id;
      return {
        step: 2,
        message: 'Now, create a content outline based on your strategy',
        action: `/content/new?strategy=${strategyId}`,
        actionText: 'Create Content Outline'
      };
    } else if (calendars.length === 0) {
      const strategyId = strategies[0].id;
      return {
        step: 3,
        message: 'Finally, set up your content calendar',
        action: `/content/calendar-params?strategyId=${strategyId}`,
        actionText: 'Create Content Calendar'
      };
    } else {
      return {
        step: 4,
        message: 'Your marketing plan is complete! You can now manage your content.',
        action: `/calendar/${calendars[0].id}`,
        actionText: 'Manage Content Calendar'
      };
    }
  };
  
  const workflowStep = determineWorkflowStep();

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Marketing Plan Dashboard | Mark1</title>
          <meta name="description" content="Unified dashboard for managing your marketing plan workflow" />
        </Head>
        
        <Navbar />
        
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading your marketing plan data...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Error | Mark1</title>
        </Head>
        
        <Navbar />
        
        <main className={styles.main}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Error</h3>
            <p>{error}</p>
            <button 
              onClick={() => refreshData()}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Compute workflow data
  const workflowData = strategies.map(strategy => {
    const relatedOutlines = getOutlinesForStrategy(strategy.id);
    const relatedCalendars = getCalendarsForStrategy(strategy.id);
    
    return {
      strategy,
      outlines: relatedOutlines,
      calendars: relatedCalendars
    };
  });

  // Handle the aesthetic selection
  const handleAestheticSubmit = (value) => {
    if (!aestheticModal.strategyId) return;
    
    // Navigate to content outline with aesthetic parameter
    router.push(`/content/new?strategy=${aestheticModal.strategyId}&aesthetic=${encodeURIComponent(value)}`);
  };

  // Show aesthetic modal for content outline creation
  const handleShowAestheticModal = (strategyId) => {
    setAestheticModal({
      visible: true,
      value: '',
      strategyId
    });
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Marketing Plan Dashboard | Mark1</title>
        <meta name="description" content="Unified dashboard for managing your marketing plan workflow" />
      </Head>
      
      <Navbar />
      
      <main className={styles.main}>
        <BreadcrumbNavigation 
          path={[
            { label: "Marketing Plan", href: "/marketing-plan" }
          ]}
        />
        
        <div className={styles.header}>
          <h1>Marketing Plan Dashboard</h1>
        </div>
        
        <StatusDashboard 
          strategies={strategies.length}
          outlines={contentOutlines.length}
          calendars={calendars.length}
          postsScheduled={calendars.reduce((acc, cal) => acc + (cal.posts_scheduled || 0), 0)}
          postsPublished={calendars.reduce((acc, cal) => acc + (cal.posts_published || 0), 0)}
        />
        
        <div className={styles.content}>
          {viewMode === 'workflow' ? (
            <div className={styles.workflowView}>
              {workflowData.length > 0 ? (
                <WorkflowDiagram workflowData={workflowData} />
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📊</div>
                  <h2>No marketing plans yet</h2>
                  <Link href="/strategy/new" className={styles.createButton}>
                    Create Strategy
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.listView}>
              {/* Strategies Section */}
              <div className={styles.listSection}>
                <div className={styles.listHeader}>
                  <h2>Marketing Strategies</h2>
                  {strategies.length === 0 && (
                    <Link href="/strategy/new" className={styles.addButton}>
                      New Strategy
                    </Link>
                  )}
                </div>
                
                <div className={styles.listTable}>
                  <div className={styles.listTableHeader}>
                    <div className={styles.listColumn}>Name</div>
                    <div className={styles.listColumn}>Target Audience</div>
                    <div className={styles.listColumn}>Objectives</div>
                    <div className={styles.listColumn}>Created</div>
                    <div className={styles.listColumn}>Actions</div>
                  </div>
                  
                  {strategies.length > 0 ? (
                    strategies.map((strategy) => {
                      const strategyOutlines = getOutlinesForStrategy(strategy.id);
                      const strategyCalendars = getCalendarsForStrategy(strategy.id);
                      
                      return (
                        <div key={strategy.id} className={styles.listRow}>
                          <div className={styles.listColumn}>
                            <div className={styles.listItemName}>{strategy.name}</div>
                          </div>
                          <div className={styles.listColumn}>
                            <div className={styles.audiencePreview}>
                              {strategy.target_audience && strategy.target_audience.length > 0 ? (
                                <div className={styles.tagsList}>
                                  {strategy.target_audience.slice(0, 2).map((audience, index) => (
                                    <span key={index} className={styles.audienceTag}>
                                      {audience.length > 30 ? audience.substring(0, 27) + '...' : audience}
                                    </span>
                                  ))}
                                  {strategy.target_audience.length > 2 && (
                                    <span className={styles.moreTag}>+{strategy.target_audience.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <span className={styles.emptyValue}>No audience defined</span>
                              )}
                            </div>
                          </div>
                          <div className={styles.listColumn}>
                            <div className={styles.objectivesPreview}>
                              {strategy.objectives && strategy.objectives.length > 0 ? (
                                <div className={styles.objectivesText}>
                                  {strategy.objectives[0].length > 40 
                                    ? strategy.objectives[0].substring(0, 37) + '...' 
                                    : strategy.objectives[0]}
                                  {strategy.objectives.length > 1 && (
                                    <span className={styles.moreText}>+{strategy.objectives.length - 1} more</span>
                                  )}
                                </div>
                              ) : (
                                <span className={styles.emptyValue}>No objectives defined</span>
                              )}
                            </div>
                          </div>
                          <div className={styles.listColumn}>
                            {formatDate(strategy.created_at)}
                          </div>
                          <div className={styles.listColumn}>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.viewButton}
                                onClick={() => navigateToEntity('strategy', strategy.id)}
                              >
                                View
                              </button>
                              <button
                                className={styles.viewButton}
                                onClick={() => router.push(`/content/new?strategy=${strategy.id}`)}
                                style={{ backgroundColor: '#4a69bd', marginLeft: '5px' }}
                              >
                                Content Builder
                              </button>
                              <button
                                className={styles.deleteButton}
                                data-testid={`delete-strategy-${strategy.id}`}
                                onClick={() => handleDeleteClick('strategy', strategy.id, strategy.name)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyList}>
                      <p>No strategies found</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Content Outlines Section */}
              <div className={styles.listSection}>
                <div className={styles.listHeader}>
                  <h2>Content Outlines</h2>
                </div>
                
                <div className={styles.listTable}>
                  <div className={styles.listTableHeader}>
                    <div className={styles.listColumn}>Strategy</div>
                    <div className={styles.listColumn}>Created</div>
                    <div className={styles.listColumn}>Status</div>
                    <div className={styles.listColumn}>Actions</div>
                  </div>
                  
                  {contentOutlines.length > 0 ? (
                    contentOutlines.map((outline) => {
                      const parentStrategy = strategies.find(s => s.id === outline.strategy_id);
                      
                      return (
                        <div key={outline.id} className={styles.listRow}>
                          <div className={styles.listColumn}>
                            <div className={styles.listItemName}>{parentStrategy?.name || 'Unknown Strategy'}</div>
                          </div>
                          <div className={styles.listColumn}>
                            {formatDate(outline.created_at)}
                          </div>
                          <div className={styles.listColumn}>
                            <span className={styles.statusBadge}>Active</span>
                          </div>
                          <div className={styles.listColumn}>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.viewButton}
                                onClick={() => navigateToEntity('outline', outline.strategy_id)}
                              >
                                View
                              </button>
                              <button
                                className={styles.deleteButton}
                                data-testid={`delete-outline-${outline.id}`}
                                onClick={() => handleDeleteClick('outline', outline.id, 'Content Outline')}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyList}>
                      <p>No content outlines found</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Calendars Section */}
              <div className={styles.listSection}>
                <div className={styles.listHeader}>
                  <h2>Content Calendars</h2>
                </div>
                
                <div className={styles.listTable}>
                  <div className={styles.listTableHeader}>
                    <div className={styles.listColumn}>Name</div>
                    <div className={styles.listColumn}>Strategy</div>
                    <div className={styles.listColumn}>Progress</div>
                    <div className={styles.listColumn}>Posts</div>
                    <div className={styles.listColumn}>Actions</div>
                  </div>
                  
                  {calendars.length > 0 ? (
                    calendars.map((calendar) => {
                      const parentStrategy = strategies.find(s => s.id === calendar.strategy_id);
                      
                      return (
                        <div key={calendar.id} className={styles.listRow}>
                          <div className={styles.listColumn}>
                            <div className={styles.listItemName}>{calendar.name || 'Unnamed Calendar'}</div>
                          </div>
                          <div className={styles.listColumn}>
                            {parentStrategy?.name || 'Unknown Strategy'}
                          </div>
                          <div className={styles.listColumn}>
                            <div className={styles.progressBarSmall}>
                              <div 
                                className={styles.progressFillSmall}
                                style={{ width: `${calendar.progress || 0}%` }}
                              ></div>
                            </div>
                            <span data-testid={`progress-small-${calendar.id}`}>{calendar.progress || 0}%</span>
                          </div>
                          <div className={styles.listColumn}>
                            {calendar.posts_scheduled || 0} scheduled, {calendar.posts_published || 0} published
                          </div>
                          <div className={styles.listColumn}>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.viewButton}
                                onClick={() => navigateToEntity('calendar', calendar.id)}
                              >
                                Manage
                              </button>
                              <button
                                className={styles.deleteButton}
                                data-testid={`delete-calendar-${calendar.id}`}
                                onClick={() => handleDeleteClick('calendar', calendar.id, calendar.name || 'Calendar')}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyList}>
                      <p>No calendars found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Selected Entity Details */}
          {selectedEntity && (
            <div className={styles.entityDetails}>
              <div className={styles.detailsHeader}>
                <h3>
                  {selectedEntity.type.charAt(0).toUpperCase() + selectedEntity.type.slice(1)} Details
                </h3>
                <button 
                  className={styles.closeButton}
                  onClick={() => setSelectedEntity(null)}
                >
                  ×
                </button>
              </div>
              
              <EntityDetailsPanel 
                entity={getEntityDetails(selectedEntity.type, selectedEntity.id)} 
                type={selectedEntity.type}
                onNavigate={navigateToEntity}
              />
            </div>
          )}
          
          <div className={styles.contentSection}>
            <h2>Content Pipeline</h2>
            <ContentPipeline posts={[]} /> {/* We'll need to implement post retrieval */}
          </div>
        </div>
      </main>
      
      {/* Add Aesthetic Selection Modal */}
      <AestheticSelectionModal
        isOpen={aestheticModal.visible}
        onClose={() => setAestheticModal({...aestheticModal, visible: false})}
        onSelect={(value) => {
          setAestheticModal({value: value, visible: false, strategyId: aestheticModal.strategyId});
          handleAestheticSubmit(value);
        }}
        selectedValue={aestheticModal.value}
      />
      
      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirm Deletion</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to delete this {modalData.type}?
                {modalData.type === 'strategy' && (
                  <span className={styles.warningText}>
                    This will also delete all associated content outlines and calendars.
                  </span>
                )}
              </p>
              <p><strong>{modalData.name}</strong></p>
            </div>
            
            <div className={styles.modalActions}>
              <button
                className={styles.confirmButton}
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Entity Details Panel Component
function EntityDetailsPanel({ entity, type, onNavigate }) {
  if (!entity) {
    return <div className={styles.emptyDetails}>No details available</div>;
  }
  
  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  switch (type) {
    case 'strategy':
      return (
        <div className={styles.detailsContent}>
          <div className={styles.detailItem}>
            <strong>Name:</strong>
            <span>{entity.name}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Created:</strong>
            <span>{formatDate(entity.created_at)}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Business Description:</strong>
            <p className={styles.detailText}>{entity.business_description}</p>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Target Audiences:</strong>
            <ul className={styles.detailList}>
              {(Array.isArray(entity.target_audience) ? entity.target_audience : []).map((audience, index) => (
                <li key={index}>{audience}</li>
              ))}
            </ul>
          </div>
          
          <div className={styles.detailActions}>
            <button
              className={styles.detailActionButton}
              onClick={() => onNavigate('strategy', entity.id)}
            >
              View Strategy
            </button>
          </div>
        </div>
      );
      
    case 'outline':
      const outlineData = entity.outline || [];
      return (
        <div className={styles.detailsContent}>
          <div className={styles.detailItem}>
            <strong>Strategy ID:</strong>
            <span>{entity.strategy_id}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Created:</strong>
            <span>{formatDate(entity.created_at)}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Weeks:</strong>
            <span>{outlineData.length}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Content Overview:</strong>
            <ul className={styles.detailList}>
              {outlineData.map((week, index) => (
                <li key={index}>
                  Week {week.week}: {week.theme} ({week.posts?.length || 0} posts)
                </li>
              ))}
            </ul>
          </div>
          
          <div className={styles.detailActions}>
            <button
              className={styles.detailActionButton}
              onClick={() => onNavigate('outline', entity.strategy_id)}
            >
              View Content
            </button>
          </div>
        </div>
      );
      
    case 'calendar':
      return (
        <div className={styles.detailsContent}>
          <div className={styles.detailItem}>
            <strong>Name:</strong>
            <span>{entity.name || 'Unnamed Calendar'}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Strategy ID:</strong>
            <span>{entity.strategy_id}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Created:</strong>
            <span>{formatDate(entity.created_at)}</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Progress:</strong>
            <div className={styles.progressBarDetail}>
              <div 
                className={styles.progressFillDetail}
                style={{ width: `${entity.progress || 0}%` }}
              ></div>
            </div>
            <span>{entity.progress || 0}% complete</span>
          </div>
          
          <div className={styles.detailItem}>
            <strong>Posts:</strong>
            <span>
              {entity.posts_scheduled || 0} scheduled, {entity.posts_published || 0} published
            </span>
          </div>
          
          <div className={styles.detailActions}>
            <button
              className={styles.detailActionButton}
              onClick={() => onNavigate('calendar', entity.id)}
            >
              Manage Calendar
            </button>
          </div>
        </div>
      );
      
    default:
      return <div className={styles.emptyDetails}>No details available for this entity type</div>;
  }
}

// Aesthetic Selection Modal Component
const AestheticSelectionModal = ({ isOpen, onClose, onSelect, selectedValue }) => {
  const aestheticOptions = [
    {
      id: 'professional',
      name: 'Professional & Educational',
      description: 'Expert-driven content with an emphasis on knowledge and credibility',
    },
    {
      id: 'motivational',
      name: 'Motivational & Energetic',
      description: 'High-energy content focused on inspiration and motivation',
    },
    {
      id: 'community',
      name: 'Community & Supportive',
      description: 'Warm, inclusive content that emphasizes connection and belonging',
    },
    {
      id: 'premium',
      name: 'Premium & Exclusive',
      description: 'Sophisticated content highlighting premium quality and exclusivity',
    },
    {
      id: 'authentic',
      name: 'Authentic & Raw',
      description: 'Real, unfiltered content showcasing genuine moments and transformations',
    },
    {
      id: 'custom',
      name: 'Custom Style',
      description: 'Describe your own unique aesthetic',
    }
  ];
  
  const [customAesthetic, setCustomAesthetic] = useState('');
  const [selected, setSelected] = useState(selectedValue || '');
  
  if (!isOpen) return null;
  
  const handleSelect = (aestheticId) => {
    setSelected(aestheticId);
    if (aestheticId !== 'custom') {
      const option = aestheticOptions.find(o => o.id === aestheticId);
      onSelect(option.name);
    }
  };
  
  const handleCustomSubmit = () => {
    if (customAesthetic.trim()) {
      onSelect(customAesthetic);
    }
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.aestheticModal}>
        <div className={styles.modalHeader}>
          <h3>Select Your Content Aesthetic</h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.modalDescription}>
            Choose the visual style and tone that best represents your brand
          </p>
          
          <div className={styles.aestheticGrid}>
            {aestheticOptions.map(option => (
              <div 
                key={option.id}
                className={`${styles.aestheticCard} ${selected === option.id ? styles.selectedAesthetic : ''}`}
                onClick={() => handleSelect(option.id)}
              >
                <div className={styles.aestheticInfo}>
                  <h4>{option.name}</h4>
                  <p>{option.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {selected === 'custom' && (
            <div className={styles.customAestheticInput}>
              <label htmlFor="customAesthetic">Describe your preferred content style:</label>
              <input
                type="text"
                placeholder="Describe your custom aesthetic style..."
                value={customAesthetic}
                onChange={(e) => setCustomAesthetic(e.target.value)}
                className={styles.customInput}
              />
              
              <div className={styles.modalActions}>
                <button 
                  onClick={onClose} 
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCustomSubmit} 
                  className={styles.saveButton}
                  disabled={!customAesthetic.trim()}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 