import { useState, useEffect, useRef, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import StatusDashboard from '../components/StatusDashboard';
import WorkflowDiagram from '../components/WorkflowDiagram';
import ContentPipeline from '../components/ContentPipeline';
import BreadcrumbNavigation from '../components/BreadcrumbNavigation';
import styles from '../styles/MarketingPlan.module.css';
import { useAuth } from '../contexts/AuthContext';
import { useMarketingPlan, MarketingPlanContext } from '../contexts/MarketingPlanContext';
import logger from '../lib/logger';
import { toast } from 'react-hot-toast';
import { useProject } from '../contexts/ProjectContext';

const log = logger.createLogger('MarketingPlanPage');

export default function MarketingPlanDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentProject } = useProject();
  const {
    strategies,
    contentOutlines,
    calendars,
    isLoading: marketingPlanLoading,
    error: marketingPlanError,
    refreshData,
    getOutlinesForStrategy,
    getCalendarsForStrategy,
    deleteMarketingEntity,
    logAction
  } = useMarketingPlan();

  const [viewMode, setViewMode] = useState('workflow');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState({ type: '', id: '', name: '' });
  
  useEffect(() => {
    if (!authLoading && !user) {
      log.info('User not authenticated, redirecting to login.');
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user && currentProject && !marketingPlanLoading && strategies) {
        if (strategies.length === 0) {
            log.info('No strategies found for current project, redirecting to /strategy/new', { projectId: currentProject.id });
            router.push('/strategy/new');
        }
    }
  }, [user, authLoading, currentProject, strategies, marketingPlanLoading, router]);
  
  useEffect(() => {
      if (user && currentProject) {
          log.info('Project changed or component mounted with project, refreshing marketing data.', { projectId: currentProject.id });
          refreshData();
      }
  }, [user, currentProject, refreshData]);

  useEffect(() => {
    if (user && strategies && strategies.length > 0) {
      log.info('Marketing plan dashboard viewed', { userId: user.id, projectId: currentProject?.id });
      if (typeof logAction === 'function') {
        logAction('view_marketing_dashboard', { timestamp: new Date().toISOString() });
      } else {
        console.warn('MarketingPlanPage: logAction is not a function during page view log effect.', { logActionType: typeof logAction });
      }
    }
  }, [user, strategies, currentProject, logAction]);

  if (authLoading || marketingPlanLoading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Loading Dashboard... | Mark1</title>
        </Head>
        <Navbar /> 
        <main className={styles.main}>
          <div className={styles.loading}> 
            <div className={styles.spinner}></div>
            <p>Checking project status...</p> 
          </div>
        </main>
      </div>
    );
  }

   if (!currentProject) {
     return (
       <div className={styles.container}>
         <Head><title>Select Project | Mark1</title></Head>
         <Navbar />
         <main className={styles.main}>
           <p>Loading project or redirecting...</p>
         </main>
       </div>
     );
   }

  if (marketingPlanError) {
    return (
      <div className={styles.container}>
        <Head><title>Error | Mark1</title></Head>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Error Loading Dashboard</h3>
            <p>{marketingPlanError}</p>
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

  if (!marketingPlanLoading && strategies && strategies.length === 0) {
      return (
         <div className={styles.container}>
            <Head><title>Loading Strategy Flow... | Mark1</title></Head>
            <Navbar />
            <main className={styles.main}>
               <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <p>Redirecting to strategy creation...</p>
               </div>
            </main>
         </div>
      );
  }
  
  const handleEntitySelect = (type, id) => {
    log.debug('Entity selected', { type, id });
    setSelectedEntity({ type, id });
  };

  const handleDeleteClick = (type, id, name) => {
    log.debug('Delete clicked for entity', { type, id, name });
    setDeleteModalData({ type, id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const { type, id } = deleteModalData;
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
      setShowDeleteModal(false);
    }
  };

  const navigateToEntity = (type, id) => {
    if (type === 'strategy') {
      router.push(`/strategy/${id}`);
    } else if (type === 'outline') {
      router.push(`/content/new?strategy=${id}`);
    } else if (type === 'calendar') {
      router.push(`/calendar/${id}`);
    }
  };

  const getEntityDetails = (type, id) => {
    switch (type) {
      case 'strategy': return strategies.find(s => s.id === id);
      case 'outline': return contentOutlines.find(o => o.id === id);
      case 'calendar': return calendars.find(c => c.id === id);
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
  };
  
  const determineWorkflowStep = () => {
     if (!strategies || strategies.length === 0) return null;
     const strategyId = strategies[0].id;

     if (!contentOutlines || contentOutlines.length === 0) {
       return {
         step: 2,
         message: 'Now, create a content outline based on your strategy',
         action: `/content/new?strategy=${strategyId}`,
         actionText: 'Create Content Outline'
       };
     } else if (!calendars || calendars.length === 0) {
       return {
         step: 3,
         message: 'Next, set up your content calendar',
         action: `/content/calendar-params?strategyId=${strategyId}`,
         actionText: 'Create Content Calendar'
       };
     } else {
       return {
         step: 4,
         message: 'Your marketing plan is set up! Manage your content calendar.',
         action: `/calendar/${calendars[0].id}`,
         actionText: 'Manage Content Calendar'
       };
     }
  };
  
  const workflowStep = determineWorkflowStep();

  const workflowData = strategies ? strategies.map(strategy => {
    const relatedOutlines = getOutlinesForStrategy(strategy.id);
    const relatedCalendars = getCalendarsForStrategy(strategy.id);
    return {
      strategy,
      outlines: relatedOutlines,
      calendars: relatedCalendars
    };
  }) : [];

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
          {currentProject && <p className={styles.projectName}>Project: {currentProject.name}</p>}
        </div>
        
        {strategies && contentOutlines && calendars && (
             <StatusDashboard 
              strategies={strategies.length}
              outlines={contentOutlines.length}
              calendars={calendars.length}
              postsScheduled={calendars.reduce((acc, cal) => acc + (cal.posts_scheduled || 0), 0)}
              postsPublished={calendars.reduce((acc, cal) => acc + (cal.posts_published || 0), 0)}
            />
        )}
       
        {workflowStep && (
            <div className={styles.workflowGuide}>
                <p>{workflowStep.message}</p>
                <Link href={workflowStep.action} className={styles.workflowActionButton}>
                    {workflowStep.actionText}
                </Link>
            </div>
        )}

        <div className={styles.viewToggle}>
            <button 
                onClick={() => setViewMode('workflow')} 
                className={viewMode === 'workflow' ? styles.activeView : ''}
            >
                Workflow View
            </button>
            <button 
                onClick={() => setViewMode('list')} 
                className={viewMode === 'list' ? styles.activeView : ''}
            >
                List View
            </button>
        </div>
        
        <div className={styles.content}>
          {viewMode === 'workflow' ? (
            <div className={styles.workflowView}>
               {workflowData.length > 0 ? (
                <WorkflowDiagram workflowData={workflowData} />
              ) : (
                 <p>Loading workflow diagram...</p>
              )}
            </div>
          ) : (
            <div className={styles.listView}>
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
                     <div className={styles.listColumn}>Target Audience</div>
                     <div className={styles.listColumn}>Objectives</div>
                     <div className={styles.listColumn}>Created</div>
                     <div className={styles.listColumn}>Actions</div>
                  </div>
                  {strategies.map((strategy) => (
                     <div key={strategy.id} className={styles.listRow}>
                       <div className={styles.listColumn}><div className={styles.listItemName}>{strategy.name}</div></div>
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
                          <div className={styles.listColumn}>{formatDate(strategy.created_at)}</div>
                          <div className={styles.listColumn}>
                            <div className={styles.actionButtons}>
                              <button className={styles.viewButton} onClick={() => navigateToEntity('strategy', strategy.id)}>View</button>
                              <button className={styles.deleteButton} onClick={() => handleDeleteClick('strategy', strategy.id, strategy.name)}>Delete</button>
                            </div>
                          </div>
                     </div>
                   ))}
                </div>
              </div>

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
            <ContentPipeline posts={[]} />
          </div>
        </div>
      </main>
      
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirm Deletion</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
               <p>Are you sure you want to delete this {deleteModalData.type}? <strong>{deleteModalData.name}</strong></p>
                {deleteModalData.type === 'strategy' && (
                   <p className={styles.warningText}>This will also delete associated outlines and calendars.</p>
                 )}
             </div>
            <div className={styles.modalActions}>
              <button className={styles.confirmButton} onClick={handleConfirmDelete}>Delete</button>
              <button className={styles.cancelButton} onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EntityDetailsPanel({ entity, type, onNavigate }) {
  if (!entity) {
    return <div className={styles.emptyDetails}>No details available</div>;
  }
  
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

export async function getServerSideProps() {
  return {
    props: {}, 
  };
} 