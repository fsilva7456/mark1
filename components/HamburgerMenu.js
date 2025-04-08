import React, { useContext } from 'react';
import Link from 'next/link';
// import { ProjectContext } from '../contexts/ProjectContext'; // Remove direct context import
import { useProject } from '../contexts/ProjectContext'; // Import custom hook
import styles from '../styles/HamburgerMenu.module.css'; // Create this next

const HamburgerMenu = ({ isOpen, closeMenu }) => {
  // const { currentProject, projects } = useContext(ProjectContext); // Use custom hook instead
  const { currentProject } = useProject(); // Correctly use the hook

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
             {/* Link to project selection/dashboard - Assume "/" handles this routing */}
            <Link href="/" passHref> 
              <a onClick={closeMenu}>My Projects</a>
            </Link>
          </li>
          {isProjectFullySetUp && (
            <li>
              {/* Update href to the actual content management dashboard path */}
              {/* Assuming a route like /projects/[projectId]/dashboard */}
              <Link href={`/projects/${currentProject.id}/dashboard`} passHref> 
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