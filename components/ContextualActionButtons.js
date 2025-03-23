import React from 'react';
import Link from 'next/link';
import styles from '../styles/ContextualActionButtons.module.css';

/**
 * ContextualActionButtons component displays action buttons that are relevant to the current context
 * 
 * @param {Object} props
 * @param {string} props.currentContext - The current context (strategy, outline, calendar, post)
 * @param {Object} props.strategy - Strategy object if available
 * @param {Object} props.outline - Outline object if available
 * @param {Object} props.calendar - Calendar object if available
 * @param {Object} props.post - Post object if available
 * @param {boolean} props.hideCreateStrategy - Whether to hide the Create Strategy button
 * @param {function} props.onCreateStrategy - Callback function to create a new strategy
 * @param {function} props.onViewDashboard - Callback function to view the dashboard
 * @param {function} props.onViewList - Callback function to view the list
 * @param {string} props.activeView - The active view (workflow or list)
 */
export default function ContextualActionButtons({
  currentContext,
  strategy,
  outline,
  calendar,
  post,
  hideCreateStrategy = false,
  onCreateStrategy,
  onViewDashboard,
  onViewList,
  activeView
}) {
  // Support for dashboard-specific version
  if (onCreateStrategy || onViewDashboard || onViewList) {
    const dashboardActions = [];
    
    // Only show create strategy if not hidden
    if (!hideCreateStrategy) {
      dashboardActions.push({
        label: 'Create Strategy',
        onClick: onCreateStrategy,
        primary: true,
        icon: '🚀'
      });
    }
    
    // Add view toggles
    dashboardActions.push(
      {
        label: 'Workflow View',
        onClick: onViewDashboard,
        primary: false,
        icon: '📊',
        active: activeView === 'workflow'
      },
      {
        label: 'List View',
        onClick: onViewList,
        primary: false,
        icon: '📋',
        active: activeView === 'list'
      }
    );
    
    return (
      <div className={styles.actionButtonsContainer}>
        {dashboardActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`${styles.actionButton} ${action.active ? styles.activeButton : ''}`}
          >
            <span>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    );
  }

  // Determine what actions to show based on context
  const getContextualActions = () => {
    switch (currentContext) {
      case 'strategy':
        return [
          {
            label: 'Create Outline from this Strategy',
            href: `/content/new?strategy=${strategy.id}`,
            primary: true,
            icon: '📝'
          },
          {
            label: 'Generate Content Ideas',
            href: `/strategy/${strategy.id}/ideas`,
            primary: false,
            icon: '💡'
          },
          {
            label: 'Edit Strategy',
            href: `/strategy/${strategy.id}/edit`,
            primary: false,
            icon: '✏️'
          }
        ];
        
      case 'outline':
        return [
          {
            label: 'Generate Calendar',
            href: `/calendar/new?strategy=${strategy.id}&outline=${outline.id}`,
            primary: true,
            icon: '📅'
          },
          {
            label: 'Edit Outline',
            href: `/content/new?strategy=${strategy.id}&outline=${outline.id}`,
            primary: false,
            icon: '✏️'
          },
          {
            label: 'View Strategy',
            href: `/strategy/${strategy.id}`,
            primary: false,
            icon: '👆'
          }
        ];
        
      case 'calendar':
        return [
          {
            label: 'Create Posts',
            href: `/calendar/${calendar.id}/post/new`,
            primary: true,
            icon: '📱'
          },
          {
            label: 'Bulk Schedule Posts',
            href: `/calendar/${calendar.id}/schedule`,
            primary: false,
            icon: '⏱️'
          },
          {
            label: 'View Calendar Report',
            href: `/calendar/${calendar.id}/report`,
            primary: false,
            icon: '📊'
          }
        ];
        
      case 'post':
        return [
          {
            label: 'Preview Post',
            href: `/calendar/${calendar.id}/post/${post.id}/preview`,
            primary: true,
            icon: '👁️'
          },
          {
            label: 'Schedule Post',
            href: `/calendar/${calendar.id}/post/${post.id}/schedule`,
            primary: false,
            icon: '⏱️'
          },
          {
            label: 'Back to Calendar',
            href: `/calendar/${calendar.id}`,
            primary: false,
            icon: '📅'
          }
        ];
        
      default:
        return [
          {
            label: 'Create Strategy',
            href: '/strategy/new',
            primary: true,
            icon: '🚀'
          },
          {
            label: 'View All Calendars',
            href: '/calendar/view',
            primary: false,
            icon: '📅'
          }
        ];
    }
  };
  
  const actions = getContextualActions();
  
  return (
    <div className={styles.contextualActions}>
      <div className={styles.actionsHeader}>
        <h3>Quick Actions</h3>
      </div>
      <div className={styles.actionsList}>
        {actions.map((action, index) => (
          <Link 
            key={index}
            href={action.href}
            className={`${styles.actionButton} ${action.primary ? styles.primaryAction : ''}`}
          >
            <span className={styles.actionIcon}>{action.icon}</span>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
} 