import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import styles from '../styles/MarketingPlan.module.css';
import { useAuth } from '../contexts/AuthContext';
import { useMarketingPlan } from '../contexts/MarketingPlanContext';
import logger from '../lib/logger';
import { toast } from 'react-hot-toast';

const log = logger.createLogger('MarketingPlanPage');

export default function MarketingPlanDashboard() {
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
  
  const [viewMode, setViewMode] = useState('workflow'); // 'workflow' or 'list'
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ type: '', id: '', name: '' });

  // Early return for unauthenticated users - this will run immediately on render
  if (!authLoading && !user) {
    router.push('/login');
    return null; // Return early to prevent rendering the rest of the component
  }

  // Check for user login (still keep this for effect-based redirect)
  useEffect(() => {
    if (!authLoading && !user) {
      log.info('Redirecting unauthenticated user to login page');
      router.push('/login');
    }
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
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Marketing Plan Dashboard</h1>
            <p>Manage your strategies, content outlines, and calendars in one unified view</p>
          </div>
          
          <div className={styles.viewControls}>
            <button 
              className={`${styles.viewButton} ${viewMode === 'workflow' ? styles.active : ''}`}
              onClick={() => setViewMode('workflow')}
            >
              Workflow View
            </button>
            <button 
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
          </div>
        </div>
        
        <div className={styles.content}>
          {viewMode === 'workflow' ? (
            <div className={styles.workflowView}>
              {workflowData.length > 0 ? (
                workflowData.map((workflow) => (
                  <div key={workflow.strategy.id} className={styles.workflowCard}>
                    <div className={styles.workflowHeader}>
                      <h2>{workflow.strategy.name}</h2>
                      <div className={styles.workflowStats}>
                        <span>{workflow.outlines.length} outlines</span>
                        <span>{workflow.calendars.length} calendars</span>
                      </div>
                    </div>
                    
                    <div className={styles.workflowPath}>
                      {/* Strategy */}
                      <div 
                        className={`${styles.entityNode} ${styles.strategyNode} ${selectedEntity?.type === 'strategy' && selectedEntity?.id === workflow.strategy.id ? styles.selected : ''}`}
                        onClick={() => handleEntitySelect('strategy', workflow.strategy.id)}
                      >
                        <div className={styles.nodeIcon}>📊</div>
                        <h3>Strategy</h3>
                        <p className={styles.nodeDate}>
                          Created: {formatDate(workflow.strategy.created_at)}
                        </p>
                        <div className={styles.nodeActions}>
                          <button
                            className={styles.viewAction}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToEntity('strategy', workflow.strategy.id);
                            }}
                          >
                            View
                          </button>
                          <button
                            className={styles.deleteAction}
                            data-testid={`delete-strategy-${workflow.strategy.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick('strategy', workflow.strategy.id, workflow.strategy.name);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className={styles.connector}></div>
                      
                      {/* Content Outlines */}
                      <div className={styles.entityNodeGroup}>
                        <h4 className={styles.nodeGroupTitle}>Content Outlines</h4>
                        {workflow.outlines.length > 0 ? (
                          workflow.outlines.map((outline) => (
                            <div 
                              key={outline.id}
                              className={`${styles.entityNode} ${styles.outlineNode} ${selectedEntity?.type === 'outline' && selectedEntity?.id === outline.id ? styles.selected : ''}`}
                              onClick={() => handleEntitySelect('outline', outline.id)}
                            >
                              <div className={styles.nodeIcon}>📝</div>
                              <h3>Content Outline</h3>
                              <p className={styles.nodeDate}>
                                Created: {formatDate(outline.created_at)}
                              </p>
                              <div className={styles.nodeActions}>
                                <button
                                  className={styles.viewAction}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToEntity('outline', outline.strategy_id);
                                  }}
                                >
                                  View
                                </button>
                                <button
                                  className={styles.deleteAction}
                                  data-testid={`delete-outline-${outline.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick('outline', outline.id, 'Content Outline');
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={styles.emptyNode}>
                            <p>No content outlines</p>
                            <button
                              className={styles.createAction}
                              onClick={() => router.push(`/content/new?strategy=${workflow.strategy.id}`)}
                            >
                              Create Outline
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.connector}></div>
                      
                      {/* Calendars */}
                      <div className={styles.entityNodeGroup}>
                        <h4 className={styles.nodeGroupTitle}>Content Calendars</h4>
                        {workflow.calendars.length > 0 ? (
                          workflow.calendars.map((calendar) => (
                            <div 
                              key={calendar.id}
                              className={`${styles.entityNode} ${styles.calendarNode} ${selectedEntity?.type === 'calendar' && selectedEntity?.id === calendar.id ? styles.selected : ''}`}
                              onClick={() => handleEntitySelect('calendar', calendar.id)}
                            >
                              <div className={styles.nodeIcon}>📅</div>
                              <h3>{calendar.name || 'Content Calendar'}</h3>
                              <div className={styles.progressBar}>
                                <div 
                                  className={styles.progressFill}
                                  style={{ width: `${calendar.progress || 0}%` }}
                                ></div>
                              </div>
                              <p className={styles.progressText} data-testid={`progress-text-${calendar.id}`}>
                                {calendar.progress || 0}% complete
                              </p>
                              <div className={styles.nodeActions}>
                                <button
                                  className={styles.viewAction}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToEntity('calendar', calendar.id);
                                  }}
                                >
                                  Manage
                                </button>
                                <button
                                  className={styles.deleteAction}
                                  data-testid={`delete-calendar-${calendar.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick('calendar', calendar.id, calendar.name || 'Calendar');
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={styles.emptyNode}>
                            <p>No calendars</p>
                            {workflow.outlines.length > 0 && (
                              <button
                                className={styles.createAction}
                                onClick={() => router.push(`/content/calendar-params?strategyId=${workflow.strategy.id}&contentOutline=${encodeURIComponent(JSON.stringify(workflow.outlines[0].outline))}`)}
                              >
                                Create Calendar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
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