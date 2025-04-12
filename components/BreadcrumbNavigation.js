import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import styles from '../styles/Breadcrumb.module.css';

/**
 * A reusable breadcrumb navigation component
 * @param {Object[]} path - Array of breadcrumb items
 * @param {string} path[].name - Display text for the breadcrumb item
 * @param {string} path[].href - URL for the breadcrumb item
 */
export default function BreadcrumbNavigation({ path = [] }) {
  return (
    <nav className={styles.breadcrumbNav} aria-label="breadcrumb">
      <ol className={styles.breadcrumbList}>
        {path.map((item, index) => (
          <li key={item.href || index} className={styles.breadcrumbItem}>
            {index === path.length - 1 ? (
              // Current page (last item) is not clickable
              <span className={styles.breadcrumbCurrent}>{item.name}</span>
            ) : (
              // Earlier items are clickable
              <>
                <Link href={item.href} className={styles.breadcrumbLink}>
                  {item.name}
                </Link>
                <ChevronRightIcon className={styles.breadcrumbSeparator} aria-hidden="true" />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 