import React, { useContext } from 'react';
import Link from 'next/link';
import { ProjectContext } from '../contexts/ProjectContext';
import styles from '../styles/HamburgerMenu.module.css'; // Create this next

const HamburgerMenu = ({ isOpen, closeMenu }) => {
  const { currentProject, projects } = useContext(ProjectContext); // Assuming projects list is available here

  if (!isOpen) return null;

  // Determine if content management dashboard is accessible
  // This logic needs refinement based on how project setup status is tracked
  const isProjectFullySetUp = currentProject && currentProject.status === 'active'; // Example condition

  return (
    <div className={styles.overlay} onClick={closeMenu}>
      <nav className={styles.menu} onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside menu */}
        <button className={styles.closeButton} onClick={closeMenu}>X</button> {/* Simple close button */}
        <ul>
          <li>
            <Link href="/" passHref> {/* Link to project selection/dashboard */}
              <a onClick={closeMenu}>My Projects</a>
            </Link>
          </li>
          {isProjectFullySetUp && (
            <li>
              {/* Update href to the actual content management dashboard path */}
              <Link href={`/content-dashboard?projectId=${currentProject.id}`} passHref>
                 <a onClick={closeMenu}>Content Management Dashboard</a>
              </Link>
            </li>
          )}
          <li>
            {/* Update href to the actual help/support page */}
            <Link href="/help" passHref>
              <a onClick={closeMenu}>Help & Support</a>
            </Link>
          </li>
          <li>
            {/* Update href to the actual settings page */}
            <Link href="/settings" passHref>
              <a onClick={closeMenu}>Settings</a>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default HamburgerMenu; 