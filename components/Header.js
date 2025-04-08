import React, { useState, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Assuming you might use an Image component for the logo
// import { AuthContext } from '../contexts/AuthContext'; // Remove direct context import
// import { ProjectContext } from '../contexts/ProjectContext'; // Remove direct context import
import { useAuth } from '../contexts/AuthContext'; // Import custom hook
import { useProject } from '../contexts/ProjectContext'; // Import custom hook
import styles from '../styles/Header.module.css';
// import { MenuIcon, UserCircleIcon, BellIcon, XIcon } from '@heroicons/react/outline'; // V1 import path
import { MenuIcon, UserCircleIcon, BellIcon, XIcon } from '@heroicons/react/24/outline'; // Correct V2 import path

const Header = ({ isMenuOpen, toggleMenu }) => {
  // const { user, logout } = useContext(AuthContext); // Use custom hook instead
  // const { currentProject } = useContext(ProjectContext); // Use custom hook instead
  const { user, signOut } = useAuth(); // Correctly use the hook
  const { currentProject } = useProject(); // Correctly use the hook
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Use signOut from useAuth context
  const handleLogout = async () => {
    await signOut(); 
    // Navigation might be handled within signOut or you might need to add it here if not
  };


  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <Link href={currentProject ? "/marketing-plan" : "/"} passHref> {/* Link to marketing plan if project exists, else home */}
          <a className={styles.logo}>
            {/* Replace with your actual logo/name */}
            {/* <Image src="/logo.png" alt="Mark1 Logo" width={30} height={30} /> */}
            <span>Mark1</span>
          </a>
        </Link>
        {currentProject && (
          <span className={styles.projectName}>Project: {currentProject.name}</span>
        )}
      </div>
      <div className={styles.rightSection}>
        <div className={styles.iconWrapper}>
          <button className={styles.iconButton}>
             <BellIcon className={styles.icon} />
             {/* Add notification count logic here if needed */}
          </button>
        </div>
        <div className={`${styles.iconWrapper} ${styles.userProfile}`} >
          {/* Wrap UserCircleIcon in a button for accessibility if it triggers dropdown */} 
          <button onClick={() => setShowUserDropdown(!showUserDropdown)} className={styles.iconButton}>
             <UserCircleIcon className={styles.icon} />
          </button>
          {showUserDropdown && (
            <div className={styles.userDropdown} onMouseLeave={() => setShowUserDropdown(false)}> {/* Close dropdown on mouse leave */}
              {/* Add Account Settings link later */}
              {/* <Link href="/account-settings"><a>Account Settings</a></Link> */}
              <button onClick={handleLogout}>Logout</button> {/* Use handleLogout */} 
            </div>
          )}
        </div>
        <div className={styles.iconWrapper} >
            {/* Wrap icons in buttons for accessibility */} 
           <button onClick={toggleMenu} className={styles.iconButton}>
            {isMenuOpen ? (
                <XIcon className={styles.icon} />
            ) : (
                <MenuIcon className={styles.icon} />
            )}
           </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 