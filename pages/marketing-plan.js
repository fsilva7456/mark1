import { useState, useEffect } from 'react';
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

  // Force project selector to appear when page loads if multiple projects exist
  useEffect(() => {
    if (user) {
      setShowProjectSelector(true);
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
    log.debug('Navigating to entity page', { type, id });
    
    switch (type) {
      case 'strategy':
        router.push(`/strategy/${id}`);
        break;
      case 'outline':
        router.push(`/content/new?strategy=${id}`);
        break;
      case 'calendar':
        router.push(`/calendar/${id}`);
        break;
      default:
        log.warn('Invalid entity type for navigation', { type });
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
          <div className={styles.actionButtons}>
            <ContextualActionButtons 
              onCreateStrategy={() => router.push('/strategy/new')}
              onViewDashboard={() => setViewMode('workflow')}
              onViewList={() => setViewMode('list')}
              activeView={viewMode}
            />
          </div>
        </div>
        
        {/* Guided Workflow Component */}
        <div className={styles.guidedWorkflow}>
          <div className={styles.workflowSteps}>
            <div className={`${styles.workflowStep} ${workflowStep.step >= 1 ? styles.active : ''} ${workflowStep.step > 1 ? styles.completed : ''}`}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepLabel}>Strategy</div>
            </div>
            <div className={styles.stepConnector}></div>
            <div className={`${styles.workflowStep} ${workflowStep.step >= 2 ? styles.active : ''} ${workflowStep.step > 2 ? styles.completed : ''}`}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepLabel}>Content Outline</div>
            </div>
            <div className={styles.stepConnector}></div>
            <div className={`${styles.workflowStep} ${workflowStep.step >= 3 ? styles.active : ''} ${workflowStep.step > 3 ? styles.completed : ''}`}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepLabel}>Content Calendar</div>
            </div>
          </div>
          <div className={styles.workflowMessage}>
            <p>{workflowStep.message}</p>
            <Link href={workflowStep.action} className={styles.workflowAction}>
              {workflowStep.actionText}
            </Link>
          </div>
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
                  <p>Start by creating a marketing strategy</p>
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
                  <Link href="/strategy/new" className={styles.addButton}>
                    New Strategy
                  </Link>
                </div>
                
                <div className={styles.listTable}>
                  <div className={styles.listTableHeader}>
                    <div className={styles.listColumn}>Name</div>
                    <div className={styles.listColumn}>Created</div>
                    <div className={styles.listColumn}>Outlines</div>
                    <div className={styles.listColumn}>Calendars</div>
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
                            {formatDate(strategy.created_at)}
                          </div>
                          <div className={styles.listColumn}>
                            {strategyOutlines.length}
                          </div>
                          <div className={styles.listColumn}>
                            {strategyCalendars.length}
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
                                className={styles.outlineButton}
                                onClick={() => router.push(`/content/new?strategy=${strategy.id}`)}
                              >
                                Generate Content
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
                                className={styles.calendarButton}
                                onClick={() => router.push(`/content/calendar-params?strategyId=${outline.strategy_id}&contentOutline=${encodeURIComponent(JSON.stringify(outline.outline))}`)}
                              >
                                Generate Calendar
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
          
          <ContextualActionButtons 
            strategies={strategies} 
            outlines={contentOutlines} 
            calendars={calendars} 
            selectedEntity={selectedEntity}
          />
        </div>
      </main>
      
      {/* Confirmation Modal */}
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
            <button
              className={styles.detailActionButton}
              onClick={() => onNavigate('outline', entity.id)}
            >
              Generate Content
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