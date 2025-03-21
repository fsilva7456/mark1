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
 */
export default function ContextualActionButtons({
  currentContext,
  strategy,
  outline,
  calendar,
  post
}) {
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