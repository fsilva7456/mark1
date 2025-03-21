import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Breadcrumb.module.css';

export default function BreadcrumbNavigation({ strategy, outline, calendar }) {
  const router = useRouter();
  
  // Determine the current path based on URL and provided context
  const buildBreadcrumbs = () => {
    const breadcrumbs = [
      { name: 'Marketing Plan', path: '/marketing-plan' }
    ];
    
    // If we have a strategy and related entities
    if (strategy) {
      breadcrumbs.push({
        name: `Strategy: ${strategy.name}`,
        path: `/strategy/${strategy.id}`
      });
      
      if (outline) {
        breadcrumbs.push({
          name: 'Content Outline',
          path: `/content/new?strategy=${strategy.id}&outline=${outline.id}`
        });
      }
      
      if (calendar) {
        breadcrumbs.push({
          name: `Calendar: ${calendar.name}`,
          path: `/calendar/${calendar.id}`
        });
      }
    } 
    // Otherwise construct based on the router path
    else {
      const { pathname, query } = router;
      
      if (pathname.includes('/strategy')) {
        breadcrumbs.push({
          name: pathname.includes('/new') ? 'New Strategy' : 'Strategy Details',
          path: pathname
        });
      }
      
      if (pathname.includes('/content')) {
        breadcrumbs.push({
          name: pathname.includes('/new') ? 'Content Outline' : 'Content Details',
          path: pathname
        });
      }
      
      if (pathname.includes('/calendar')) {
        if (pathname.includes('/post')) {
          breadcrumbs.push({
            name: 'Calendar',
            path: `/calendar/${query.id}`
          });
          
          breadcrumbs.push({
            name: pathname.includes('/new') ? 'New Post' : 'Edit Post',
            path: pathname
          });
        } else {
          breadcrumbs.push({
            name: pathname.includes('/new') ? 'New Calendar' : 'Calendar Details',
            path: pathname
          });
        }
      }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = buildBreadcrumbs();
  
  return (
    <nav className={styles.breadcrumbNav} aria-label="breadcrumb">
      <ol className={styles.breadcrumbList}>
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className={styles.breadcrumbItem}>
            {index === breadcrumbs.length - 1 ? (
              <span className={styles.breadcrumbCurrent}>{breadcrumb.name}</span>
            ) : (
              <>
                <Link href={breadcrumb.path} className={styles.breadcrumbLink}>
                  {breadcrumb.name}
                </Link>
                <span className={styles.breadcrumbSeparator}>/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 