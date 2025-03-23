import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Navbar.module.css';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import dashboardStyles from '../styles/Dashboard.module.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { 
    projects, 
    currentProject, 
    setShowProjectSelector,
    switchProject 
  } = useProject();
  
  const isAuthedPath = user && (
    router.pathname === '/marketing-plan' || 
    router.pathname.startsWith('/strategy/') || 
    router.pathname.startsWith('/content/') ||
    router.pathname.startsWith('/calendar/')
  );

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const toggleProjectMenu = () => {
    setProjectMenuOpen(!projectMenuOpen);
  };
  
  // Close project menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectMenuOpen && !event.target.closest(`.${styles.projectSelector}`)) {
        setProjectMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [projectMenuOpen]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <img src="/mark1-logo.svg" alt="Mark1" className={styles.logoImage} />
        </Link>

        {isAuthedPath && (
          <>
            {currentProject && (
              <div className={styles.projectSelector}>
                <button 
                  className={styles.projectButton} 
                  onClick={toggleProjectMenu}
                >
                  <span className={styles.projectName}>
                    {currentProject.name}
                  </span>
                  <span className={styles.projectCaret}>▼</span>
                </button>
                
                {projectMenuOpen && (
                  <div className={styles.projectMenu}>
                    <div className={styles.projectMenuHeader}>
                      <span>Your Projects</span>
                      <button 
                        className={styles.newProjectButton}
                        onClick={() => {
                          setProjectMenuOpen(false);
                          setShowProjectSelector(true);
                        }}
                      >
                        + New
                      </button>
                    </div>
                    
                    <div className={styles.projectList}>
                      {projects.map(project => (
                        <button
                          key={project.id}
                          className={`${styles.projectItem} ${
                            project.id === currentProject.id ? styles.activeProject : ''
                          }`}
                          onClick={() => {
                            switchProject(project.id);
                            setProjectMenuOpen(false);
                          }}
                        >
                          {project.name}
                          {project.is_default && (
                            <span className={styles.defaultLabel}>Default</span>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    <div className={styles.projectMenuFooter}>
                      <button 
                        className={styles.manageProjectsButton}
                        onClick={() => {
                          setProjectMenuOpen(false);
                          setShowProjectSelector(true);
                        }}
                      >
                        Manage Projects
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.navLinks}>
              <Link 
                href="/marketing-plan" 
                className={router.pathname === '/marketing-plan' ? styles.activeLink : styles.navLink}
              >
                Marketing Plan
              </Link>
            </div>
          </>
        )}

        <div className={styles.navControls}>
          {/* Only show these auth buttons when not logged in */}
          {!user && router.pathname !== '/' && router.pathname !== '/signup' && (
            <div className={styles.authButtons}>
              <Link href="/" className={styles.loginButton}>
                Log in
              </Link>
              <Link href="/signup" className={styles.signupButton}>
                Sign up
              </Link>
            </div>
          )}
          
          {/* Show logout when user is logged in */}
          {user && (
            <button 
              onClick={signOut}
              className={dashboardStyles.logoutButton}
            >
              Logout
            </button>
          )}
        </div>

        <div className={`${styles.menu} ${menuOpen ? styles.active : ''}`}>
          {user && (
            <Link href="/marketing-plan" className={router.pathname === '/marketing-plan' ? styles.active : ''}>
              Marketing Plan
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 