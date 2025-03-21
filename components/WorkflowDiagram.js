import React from 'react';
import Link from 'next/link';
import styles from '../styles/WorkflowDiagram.module.css';

export default function WorkflowDiagram({ workflowData }) {
  if (!workflowData || workflowData.length === 0) {
    return (
      <div className={styles.emptyWorkflow}>
        <p>No workflow data available. Create a strategy to start your marketing workflow.</p>
        <Link href="/strategy/new" className={styles.createButton}>
          Create Strategy
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.workflowDiagram}>
      {workflowData.map((item, index) => (
        <div key={item.strategy.id} className={styles.workflowItem}>
          {/* Strategy Node */}
          <div className={styles.strategyNode}>
            <div className={styles.nodeHeader}>
              <h3 className={styles.nodeTitle}>{item.strategy.name}</h3>
              <div className={styles.nodeActions}>
                <Link href={`/strategy/${item.strategy.id}`} className={styles.nodeActionBtn}>
                  View
                </Link>
              </div>
            </div>
            <div className={styles.nodeContent}>
              <p className={styles.nodeDescription}>
                {item.strategy.business_description?.substring(0, 100)}
                {item.strategy.business_description?.length > 100 ? '...' : ''}
              </p>
              <div className={styles.nodeMeta}>
                <span className={styles.nodeMetaItem}>
                  {item.outlines.length} outlines
                </span>
                <span className={styles.nodeMetaItem}>
                  {item.calendars.length} calendars
                </span>
              </div>
            </div>
            {/* Create Outline CTA button */}
            <div className={styles.nodeCta}>
              <Link 
                href={`/content/new?strategy=${item.strategy.id}`} 
                className={styles.createEntityButton}
              >
                + Create Outline
              </Link>
            </div>
          </div>

          {/* Connection Line */}
          <div className={styles.connectionLine}>
            <svg height="50" width="100%">
              <line x1="50%" y1="0" x2="50%" y2="50" stroke="#cccccc" strokeWidth="2" strokeDasharray="5,5" />
              <polygon points="50%,50 45%,40 55%,40" fill="#cccccc" />
            </svg>
          </div>

          {/* Outlines Node */}
          <div className={styles.outlinesContainer}>
            {item.outlines.length > 0 ? (
              item.outlines.map(outline => (
                <div key={outline.id} className={styles.outlineNode}>
                  <div className={styles.nodeHeader}>
                    <h3 className={styles.nodeTitle}>Content Outline</h3>
                    <div className={styles.nodeActions}>
                      <Link href={`/content/new?strategy=${item.strategy.id}&outline=${outline.id}`} className={styles.nodeActionBtn}>
                        View
                      </Link>
                    </div>
                  </div>
                  <div className={styles.nodeContent}>
                    <div className={styles.outlineMeta}>
                      <span className={styles.outlineDate}>
                        Created: {new Date(outline.created_at).toLocaleDateString()}
                      </span>
                      <span className={styles.outlineThemes}>
                        {outline.outline && outline.outline.length} themes
                      </span>
                    </div>
                    {outline.outline && outline.outline.slice(0, 2).map((week, i) => (
                      <div key={i} className={styles.weekTheme}>
                        <span className={styles.weekLabel}>Week {week.week}:</span> {week.theme}
                      </div>
                    ))}
                    {outline.outline && outline.outline.length > 2 && (
                      <div className={styles.moreIndicator}>+{outline.outline.length - 2} more weeks</div>
                    )}
                  </div>
                  {/* Create Calendar CTA */}
                  <div className={styles.nodeCta}>
                    <Link 
                      href={`/calendar/new?strategy=${item.strategy.id}&outline=${outline.id}`} 
                      className={styles.createEntityButton}
                    >
                      + Create Calendar
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyNode}>
                <p>No outlines created yet</p>
                <Link 
                  href={`/content/new?strategy=${item.strategy.id}`} 
                  className={styles.createEntityButton}
                >
                  + Create Outline
                </Link>
              </div>
            )}
          </div>

          {/* Connection Line */}
          <div className={styles.connectionLine}>
            <svg height="50" width="100%">
              <line x1="50%" y1="0" x2="50%" y2="50" stroke="#cccccc" strokeWidth="2" strokeDasharray="5,5" />
              <polygon points="50%,50 45%,40 55%,40" fill="#cccccc" />
            </svg>
          </div>

          {/* Calendars Node */}
          <div className={styles.calendarsContainer}>
            {item.calendars.length > 0 ? (
              item.calendars.map(calendar => (
                <div key={calendar.id} className={styles.calendarNode}>
                  <div className={styles.nodeHeader}>
                    <h3 className={styles.nodeTitle}>{calendar.name}</h3>
                    <div className={styles.nodeActions}>
                      <Link href={`/calendar/${calendar.id}`} className={styles.nodeActionBtn}>
                        View
                      </Link>
                    </div>
                  </div>
                  <div className={styles.nodeContent}>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${calendar.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className={styles.progressText} data-testid={`progress-text-calendar-${calendar.id}`}>
                        {calendar.progress || 0}% complete
                      </span>
                    </div>
                    <div className={styles.calendarStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Posts:</span>
                        <span className={styles.statValue}>{calendar.posts_scheduled || 0}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Published:</span>
                        <span className={styles.statValue}>{calendar.posts_published || 0}</span>
                      </div>
                    </div>
                  </div>
                  {/* Add Posts CTA */}
                  <div className={styles.nodeCta}>
                    <Link 
                      href={`/calendar/${calendar.id}/post/new`} 
                      className={styles.createEntityButton}
                    >
                      + Add Posts
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyNode}>
                <p>No calendars created yet</p>
                <Link 
                  href={`/calendar/new?strategy=${item.strategy.id}`} 
                  className={styles.createEntityButton}
                >
                  + Create Calendar
                </Link>
              </div>
            )}
          </div>

          {index < workflowData.length - 1 && (
            <div className={styles.strategySeparator}></div>
          )}
        </div>
      ))}
    </div>
  );
} 